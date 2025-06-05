/**
 * SmartCopyTool - Advanced pattern-based copying and transformation tool
 * 
 * Enables powerful operations like copying entire animation sequences,
 * duplicating frames, and data transformations
 */
class SmartCopyTool {
    constructor(unitManager) {
        this.unitManager = unitManager;
        this.clipboard = new Map(); // Pattern storage
        this.lastOperation = null;
    }

    /**
     * Copy units matching a pattern
     * @param {object} pattern Pattern object {frame, layer}
     * @returns {Map} Copied units map
     */
    copyPattern(pattern) {
        if (!this.unitManager) return new Map();
        
        const matches = this.unitManager.getUnitsByPattern(
            pattern.frame, 
            pattern.layer
        );
        
        const copied = new Map();
        matches.forEach(unit => {
            const clone = unit.clone();
            copied.set(unit.getKey(), clone);
        });
        
        this.clipboard.set('lastCopy', {
            pattern,
            units: copied,
            timestamp: Date.now()
        });
        
        console.log(`Copied ${matches.length} units matching pattern`, pattern);
        return copied;
    }

    /**
     * Paste units to a new pattern destination
     * @param {object} destPattern Destination pattern {frame, layer}
     * @param {object} options Paste options
     * @returns {CanvasUnit[]} Created units
     */
    pastePattern(destPattern, options = {}) {
        const lastCopy = this.clipboard.get('lastCopy');
        if (!lastCopy) {
            console.warn('No pattern in clipboard to paste');
            return [];
        }
        
        const { pattern: sourcePattern, units } = lastCopy;
        const newUnits = [];
        
        units.forEach(unit => {
            const sourceId = unit.id;
            
            // Calculate destination coordinates
            const destFrame = this.resolvePatternValue(destPattern.frame, sourcePattern.frame, sourceId.frame);
            const destLayer = this.resolvePatternValue(destPattern.layer, sourcePattern.layer, sourceId.layer);
            
            // Create new unit at destination
            const newUnit = this.unitManager.createUnit(destFrame, destLayer, unit.width, unit.height);
            newUnit.copyFrom(unit);
            
            // Update metadata
            const suffix = options.nameSuffix || '_copy';
            newUnit.updateMeta({
                name: `${unit.meta.name}${suffix}`,
                tags: [...unit.meta.tags, 'smart_copy']
            });
            
            newUnits.push(newUnit);
        });
        
        this.lastOperation = {
            type: 'paste',
            sourcePattern,
            destPattern,
            units: newUnits,
            timestamp: Date.now()
        };
        
        console.log(`Pasted ${newUnits.length} units to pattern`, destPattern);
        return newUnits;
    }

    /**
     * Resolve pattern value (handles wildcards and offsets)
     * @param {string|number} destValue Destination pattern value
     * @param {string|number} sourceValue Source pattern value  
     * @param {number} actualValue Actual coordinate value
     * @returns {number} Resolved coordinate
     */
    resolvePatternValue(destValue, sourceValue, actualValue) {
        if (destValue === '*') {
            return actualValue; // Keep original
        }
        
        if (typeof destValue === 'number') {
            return destValue; // Fixed value
        }
        
        if (typeof destValue === 'string' && destValue.includes('+')) {
            // Offset pattern like "0+5" or "*+10"
            const [base, offset] = destValue.split('+');
            const baseValue = base === '*' ? actualValue : parseInt(base);
            return baseValue + parseInt(offset);
        }
        
        return parseInt(destValue) || 0;
    }

    /**
     * Duplicate animation frames
     * @param {number} startFrame Starting frame index
     * @param {number} endFrame Ending frame index (inclusive)
     * @param {number} offset Frame offset for copies
     * @returns {CanvasUnit[]} Created frame units
     */
    duplicateFrames(startFrame, endFrame, offset = 10) {
        const sourcePattern = { frame: '*', layer: 0 };
        const copiedUnits = [];
        
        for (let frame = startFrame; frame <= endFrame; frame++) {
            const unit = this.unitManager.getUnit(frame, 0);
            if (unit) {
                const newFrameIndex = frame + offset;
                const frameUnit = this.unitManager.createUnit(newFrameIndex, 0, unit.width, unit.height);
                frameUnit.copyFrom(unit);
                frameUnit.updateMeta({
                    name: `Frame_${frame + 1}_Copy`,
                    tags: ['converted', 'frame_duplicate']
                });
                copiedUnits.push(frameUnit);
            }
        }
        
        this.lastOperation = {
            type: 'duplicate_frames',
            sourceFrames: [startFrame, endFrame],
            destFrames: [startFrame + offset, endFrame + offset],
            units: copiedUnits
        };
        
        console.log(`Duplicated ${copiedUnits.length} animation frames`);
        return copiedUnits;
    }


    /**
     * Create animation frames from canvas layers
     * @param {number} frameCount Number of frames to create
     * @returns {CanvasUnit[]} Created frame units
     */
    canvasToAnimation(frameCount = 1) {
        // Get all canvas layers: [0, *]
        const layers = this.unitManager.getUnitsByPattern(0, '*');
        const copiedUnits = [];
        
        for (let frame = 1; frame <= frameCount; frame++) {
            layers.forEach((unit, i) => {
                const frameUnit = this.unitManager.createUnit(frame, unit.id.layer, unit.width, unit.height);
                frameUnit.copyFrom(unit);
                frameUnit.updateMeta({
                    name: `Frame_${frame}_Layer_${unit.id.layer}`,
                    tags: ['converted', 'canvas_to_animation']
                });
                copiedUnits.push(frameUnit);
            });
        }
        
        this.lastOperation = {
            type: 'canvas_to_animation',
            sourceLayers: layers.map(u => u.id.layer),
            destFrames: Array.from({length: frameCount}, (_, i) => i + 1),
            units: copiedUnits
        };
        
        console.log(`Created ${copiedUnits.length} animation frames from canvas layers`);
        return copiedUnits;
    }


    /**
     * Duplicate pattern with offset
     * @param {object} sourcePattern Source pattern to duplicate
     * @param {object} offsetPattern Offset to apply
     * @param {number} count Number of copies to create
     * @returns {CanvasUnit[]} Created units
     */
    duplicateWithOffset(sourcePattern, offsetPattern, count = 1) {
        const sourceUnits = this.unitManager.getUnitsByPattern(
            sourcePattern.frame,
            sourcePattern.layer
        );
        
        const allCreatedUnits = [];
        
        for (let copy = 1; copy <= count; copy++) {
            const copiedUnits = [];
            
            sourceUnits.forEach(unit => {
                const sourceId = unit.id;
                
                // Calculate destination with offset
                const destFrame = this.applyOffset(sourceId.frame, offsetPattern.frame, copy);
                const destLayer = this.applyOffset(sourceId.layer, offsetPattern.layer, copy);
                
                // Create new unit
                const newUnit = this.unitManager.createUnit(destFrame, destLayer, unit.width, unit.height);
                newUnit.copyFrom(unit);
                newUnit.updateMeta({
                    name: `${unit.meta.name}_copy_${copy}`,
                    tags: [...unit.meta.tags, 'duplicated']
                });
                
                copiedUnits.push(newUnit);
                allCreatedUnits.push(newUnit);
            });
        }
        
        this.lastOperation = {
            type: 'duplicate_with_offset',
            sourcePattern,
            offsetPattern,
            count,
            units: allCreatedUnits
        };
        
        console.log(`Created ${allCreatedUnits.length} units with offset duplication`);
        return allCreatedUnits;
    }

    /**
     * Apply offset to coordinate
     * @param {number} original Original coordinate
     * @param {number} offset Offset amount
     * @param {number} multiplier Copy number multiplier
     * @returns {number} New coordinate
     */
    applyOffset(original, offset, multiplier) {
        return original + (offset * multiplier);
    }

    /**
     * Get operation history
     * @returns {object|null} Last operation details
     */
    getLastOperation() {
        return this.lastOperation;
    }

    /**
     * Undo last operation
     * @returns {boolean} True if undo was performed
     */
    undoLastOperation() {
        if (!this.lastOperation || !this.lastOperation.units) {
            return false;
        }
        
        // Delete all units created by the last operation
        this.lastOperation.units.forEach(unit => {
            this.unitManager.deleteUnit(unit.id.frame, unit.id.layer);
        });
        
        console.log(`Undid operation: ${this.lastOperation.type}`);
        this.lastOperation = null;
        return true;
    }

    /**
     * Clear clipboard
     */
    clearClipboard() {
        this.clipboard.clear();
        console.log('Clipboard cleared');
    }

    /**
     * Get clipboard stats
     * @returns {object} Clipboard information
     */
    getClipboardInfo() {
        const lastCopy = this.clipboard.get('lastCopy');
        if (!lastCopy) {
            return { empty: true };
        }
        
        return {
            empty: false,
            pattern: lastCopy.pattern,
            unitCount: lastCopy.units.size,
            timestamp: lastCopy.timestamp,
            age: Date.now() - lastCopy.timestamp
        };
    }

    /**
     * Batch transform multiple patterns
     * @param {Array} transformations Array of transformation objects
     * @returns {CanvasUnit[]} All created units
     */
    batchTransform(transformations) {
        const allCreatedUnits = [];
        
        transformations.forEach((transform, index) => {
            const { source, dest, type, options = {} } = transform;
            
            let createdUnits = [];
            
            switch (type) {
                case 'copy':
                    this.copyPattern(source);
                    createdUnits = this.pastePattern(dest, options);
                    break;
                    
                    
                default:
                    console.warn(`Unknown transform type: ${type}`);
            }
            
            allCreatedUnits.push(...createdUnits);
        });
        
        this.lastOperation = {
            type: 'batch_transform',
            transformCount: transformations.length,
            units: allCreatedUnits,
            timestamp: Date.now()
        };
        
        console.log(`Batch transform completed: ${transformations.length} operations, ${allCreatedUnits.length} units created`);
        return allCreatedUnits;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartCopyTool;
}