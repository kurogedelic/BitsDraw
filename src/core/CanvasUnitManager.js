/**
 * CanvasUnitManager - Manages collections of CanvasUnits
 * 
 * Provides unified interface for graphics, fonts, and animations
 * Supports pattern-based operations and batch updates
 */
class CanvasUnitManager extends EventTarget {
    constructor() {
        super();
        
        this.units = new Map(); // "f-l" → CanvasUnit
        this.activeUnit = null;
        this.viewMode = 'canvas';
        this.defaultSize = { width: 128, height: 64 };
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
    }

    /**
     * Get a CanvasUnit by coordinates
     * @param {number} frame Frame index
     * @param {number} layer Layer index
     * @returns {CanvasUnit|null} The unit or null if not found
     */
    getUnit(frame, layer) {
        const key = `${frame}-${layer}`;
        return this.units.get(key) || null;
    }

    /**
     * Set a CanvasUnit at coordinates
     * @param {number} frame Frame index
     * @param {number} layer Layer index
     * @param {Uint8Array} pixels Pixel data
     * @param {object} meta Metadata
     * @returns {CanvasUnit} The created unit
     */
    setUnit(frame, layer, pixels, meta = {}) {
        const key = `${frame}-${layer}`;
        let unit = this.units.get(key);
        
        if (!unit) {
            unit = new CanvasUnit(frame, layer, this.defaultSize.width, this.defaultSize.height);
            this.units.set(key, unit);
        }
        
        if (pixels) {
            unit.pixels.set(pixels);
        }
        
        if (meta) {
            unit.updateMeta(meta);
        }
        
        this.dispatchEvent(new CustomEvent('unit:updated', { 
            detail: { unit, frame, layer } 
        }));
        
        return unit;
    }

    /**
     * Create a new CanvasUnit
     * @param {number} frame Frame index
     * @param {number} layer Layer index
     * @param {number} width Canvas width
     * @param {number} height Canvas height
     * @returns {CanvasUnit} The new unit
     */
    createUnit(frame, layer, width = null, height = null) {
        const w = width || this.defaultSize.width;
        const h = height || this.defaultSize.height;
        
        const unit = new CanvasUnit(frame, layer, w, h);
        const key = unit.getKey();
        
        this.units.set(key, unit);
        
        this.dispatchEvent(new CustomEvent('unit:created', { 
            detail: { unit, frame, layer } 
        }));
        
        return unit;
    }

    /**
     * Delete a CanvasUnit
     * @param {number} frame Frame index
     * @param {number} layer Layer index
     * @returns {boolean} True if unit was deleted
     */
    deleteUnit(frame, layer) {
        const key = `${frame}-${layer}`;
        const unit = this.units.get(key);
        
        if (!unit) return false;
        
        this.units.delete(key);
        
        this.dispatchEvent(new CustomEvent('unit:deleted', { 
            detail: { unit, frame, layer } 
        }));
        
        return true;
    }

    /**
     * Get units matching a pattern
     * @param {number|string} frame Frame pattern (number or '*')
     * @param {number|string} layer Layer pattern (number or '*')
     * @returns {CanvasUnit[]} Array of matching units
     */
    getUnitsByPattern(frame, layer) {
        const pattern = { frame, layer };
        const matches = [];
        
        for (const unit of this.units.values()) {
            if (unit.matchesPattern(pattern)) {
                matches.push(unit);
            }
        }
        
        return matches.sort((a, b) => {
            // Sort by frame, then layer
            if (a.id.frame !== b.id.frame) return a.id.frame - b.id.frame;
            return a.id.layer - b.id.layer;
        });
    }

    /**
     * Copy units from source pattern to destination pattern
     * @param {object} sourcePattern Source pattern {frame, layer}
     * @param {object} destPattern Destination pattern {frame, layer}
     * @returns {CanvasUnit[]} Array of created units
     */
    copyUnits(sourcePattern, destPattern) {
        const sourceUnits = this.getUnitsByPattern(
            sourcePattern.frame, 
            sourcePattern.layer
        );
        
        const newUnits = [];
        
        sourceUnits.forEach(unit => {
            const newFrame = destPattern.frame === '*' ? unit.id.frame : destPattern.frame;
            const newLayer = destPattern.layer === '*' ? unit.id.layer : destPattern.layer;
            
            const newUnit = this.createUnit(newFrame, newLayer, unit.width, unit.height);
            newUnit.copyFrom(unit);
            newUnit.updateMeta({ name: `${unit.meta.name}_copy` });
            
            newUnits.push(newUnit);
        });
        
        return newUnits;
    }

    /**
     * Get all units for current view mode
     * @returns {CanvasUnit[]} Units for current view
     */
    getUnitsForCurrentView() {
        switch (this.viewMode) {
            case 'canvas':
                // Graphics: [0, *] - Single frame, multiple layers
                return this.getUnitsByPattern(0, '*');
            
            default:
                return [];
        }
    }

    /**
     * Switch view mode
     * @param {string} mode New view mode ('canvas')
     */
    setViewMode(mode) {
        if (!['canvas'].includes(mode)) {
            throw new Error(`Invalid view mode: ${mode}`);
        }
        
        const oldMode = this.viewMode;
        this.viewMode = mode;
        
        this.dispatchEvent(new CustomEvent('view:changed', { 
            detail: { oldMode, newMode: mode } 
        }));
    }

    /**
     * Get statistics about current units
     * @returns {object} Statistics object
     */
    getStats() {
        const units = Array.from(this.units.values());
        
        const stats = {
            totalUnits: units.length,
            frames: new Set(),
            layers: new Set(),
            memoryUsage: 0
        };
        
        units.forEach(unit => {
            stats.frames.add(unit.id.frame);
            stats.layers.add(unit.id.layer);
            stats.memoryUsage += unit.pixels.length;
        });
        
        stats.frames = stats.frames.size;
        stats.layers = stats.layers.size;
        
        return stats;
    }

    /**
     * Save state for undo/redo
     */
    saveState() {
        const state = {
            timestamp: Date.now(),
            units: new Map()
        };
        
        // Deep copy all units
        this.units.forEach((unit, key) => {
            state.units.set(key, unit.clone());
        });
        
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

    /**
     * Undo last operation
     * @returns {boolean} True if undo was performed
     */
    undo() {
        if (this.historyIndex <= 0) return false;
        
        this.historyIndex--;
        const state = this.history[this.historyIndex];
        
        this.units.clear();
        state.units.forEach((unit, key) => {
            this.units.set(key, unit.clone());
        });
        
        this.dispatchEvent(new CustomEvent('units:restored'));
        return true;
    }

    /**
     * Redo last undone operation
     * @returns {boolean} True if redo was performed
     */
    redo() {
        if (this.historyIndex >= this.history.length - 1) return false;
        
        this.historyIndex++;
        const state = this.history[this.historyIndex];
        
        this.units.clear();
        state.units.forEach((unit, key) => {
            this.units.set(key, unit.clone());
        });
        
        this.dispatchEvent(new CustomEvent('units:restored'));
        return true;
    }

    /**
     * Clear all units
     */
    clear() {
        this.units.clear();
        this.history = [];
        this.historyIndex = -1;
        
        this.dispatchEvent(new CustomEvent('units:cleared'));
    }

    /**
     * Export to JSON
     * @returns {object} JSON representation
     */
    toJSON() {
        const unitsArray = [];
        this.units.forEach(unit => {
            unitsArray.push(unit.toJSON());
        });
        
        return {
            viewMode: this.viewMode,
            defaultSize: this.defaultSize,
            units: unitsArray,
            stats: this.getStats()
        };
    }

    /**
     * Import from JSON
     * @param {object} json JSON data
     */
    fromJSON(json) {
        this.clear();
        
        this.viewMode = json.viewMode || 'canvas';
        this.defaultSize = json.defaultSize || { width: 128, height: 64 };
        
        if (json.units) {
            json.units.forEach(unitData => {
                const unit = CanvasUnit.fromJSON(unitData);
                this.units.set(unit.getKey(), unit);
            });
        }
        
        this.dispatchEvent(new CustomEvent('project:loaded'));
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasUnitManager;
}