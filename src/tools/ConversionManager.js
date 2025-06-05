/**
 * ConversionManager - Manages cross-mode conversions and transformations
 * 
 * Provides high-level interface for converting Canvas view operations
 * Integrates with SmartCopyTool for advanced pattern operations
 */
class ConversionManager {
    constructor(unitManager, legacyAdapter) {
        this.unitManager = unitManager;
        this.legacyAdapter = legacyAdapter;
        this.smartCopy = new SmartCopyTool(unitManager);
        
        // Conversion presets
        this.presets = {
            layerComposition: {
                name: 'Layer Composition',
                description: 'Combine layers into composite canvas',
                source: 'canvas',
                dest: 'canvas'
            }
        };
    }

    /**
     * Get available conversion operations
     * @returns {object} Available conversions by source mode
     */
    getAvailableConversions() {
        return {
            canvas: [
                {
                    id: 'canvas_to_animation',
                    name: 'Canvas → Animation',
                    description: 'Create animation from current canvas',
                    icon: 'ph-play'
                },
                {
                    id: 'duplicate_layers',
                    name: 'Duplicate Layers',
                    description: 'Duplicate selected layers with pattern',
                    icon: 'ph-copy'
                }
            ]
        };
    }

    /**
     * Execute conversion operation
     * @param {string} operationId Operation identifier
     * @param {object} options Conversion options
     * @returns {object} Conversion result
     */
    executeConversion(operationId, options = {}) {
        console.log(`Executing conversion: ${operationId}`, options);
        
        switch (operationId) {
            case 'canvas_to_animation':
                return this.canvasToAnimation(options);
                
            case 'duplicate_layers':
                return this.duplicateLayers(options);
                
            default:
                throw new Error(`Unknown conversion operation: ${operationId}`);
        }
    }

    /**
     * Convert canvas to animation frames
     * @param {object} options Conversion options
     * @returns {object} Conversion result
     */
    canvasToAnimation(options = {}) {
        const { frameCount = 1, includeEmpty = false } = options;
        
        const layers = this.unitManager.getUnitsByPattern(0, '*');
        const validLayers = includeEmpty ? layers : layers.filter(unit => !this.isEmpty(unit));
        
        if (validLayers.length === 0) {
            return { success: false, message: 'No canvas layers found to convert' };
        }
        
        const createdFrames = this.smartCopy.canvasToAnimation(frameCount);
        
        return {
            success: true,
            message: `Created ${createdFrames.length} animation frames`,
            sourceCount: validLayers.length,
            destCount: createdFrames.length,
            destRange: [1, frameCount],
            units: createdFrames,
            suggestedView: 'canvas'
        };
    }





    /**
     * Duplicate layers with pattern
     * @param {object} options Duplication options
     * @returns {object} Operation result
     */
    duplicateLayers(options = {}) {
        const { layerIndices = [], offset = 1, count = 1 } = options;
        
        if (layerIndices.length === 0) {
            return { success: false, message: 'No layers specified for duplication' };
        }
        
        const sourcePattern = { frame: 0, layer: '*' };
        const offsetPattern = { frame: 0, layer: offset };
        
        // Filter to only specified layers
        const filteredUnits = layerIndices.map(index => this.unitManager.getUnit(0, index)).filter(Boolean);
        
        const createdUnits = [];
        for (let copy = 1; copy <= count; copy++) {
            filteredUnits.forEach(unit => {
                const newLayerIndex = unit.id.layer + (offset * copy);
                const newUnit = this.unitManager.createUnit(0, newLayerIndex, unit.width, unit.height);
                newUnit.copyFrom(unit);
                newUnit.updateMeta({
                    name: `${unit.meta.name}_copy_${copy}`,
                    tags: [...unit.meta.tags, 'duplicated']
                });
                createdUnits.push(newUnit);
            });
        }
        
        return {
            success: true,
            message: `Duplicated ${layerIndices.length} layers ${count} time(s)`,
            sourceCount: layerIndices.length,
            destCount: createdUnits.length,
            units: createdUnits,
            suggestedView: 'canvas'
        };
    }



    /**
     * Check if a unit is empty (all pixels are 0)
     * @param {CanvasUnit} unit Unit to check
     * @returns {boolean} True if empty
     */
    isEmpty(unit) {
        for (let i = 0; i < unit.pixels.length; i++) {
            if (unit.pixels[i] !== 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get conversion suggestions based on current content
     * @returns {Array} Array of suggested conversions
     */
    getConversionSuggestions() {
        const suggestions = [];
        
        // Check content in each mode
        const canvasUnits = this.unitManager.getUnitsByPattern(0, '*');
        const frameUnits = this.unitManager.getUnitsByPattern('*', 0);
        
        // Suggest based on available content
        if (canvasUnits.length > 1) {
            suggestions.push({
                id: 'canvas_to_animation',
                reason: `${canvasUnits.length} canvas layers could create animation frames`,
                priority: 'medium'
            });
        }
        
        if (frameUnits.length > 1) {
            suggestions.push({
                id: 'duplicate_layers',
                reason: `${frameUnits.length} animation frames could be duplicated`,
                priority: 'high'
            });
        }
        
        return suggestions;
    }

    /**
     * Validate conversion parameters
     * @param {string} operationId Operation to validate
     * @param {object} options Parameters to validate
     * @returns {object} Validation result
     */
    validateConversion(operationId, options) {
        const errors = [];
        const warnings = [];
        
        switch (operationId) {
            case 'canvas_to_animation':
                if (!options.frameCount || options.frameCount <= 0) {
                    errors.push('Frame count must be greater than 0');
                }
                if (options.frameCount && options.frameCount > 60) {
                    warnings.push('Animation with >60 frames may impact performance');
                }
                break;
                
            case 'duplicate_layers':
                if (options.count > 5) {
                    warnings.push('Creating many layer duplicates may use significant memory');
                }
                break;
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get smart copy tool instance
     * @returns {SmartCopyTool} Smart copy tool
     */
    getSmartCopyTool() {
        return this.smartCopy;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversionManager;
}