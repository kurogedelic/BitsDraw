/**
 * CanvasUnit - Core data structure for the unified graphics system
 * 
 * Represents a single bitmap with 2D coordinates [frame, layer]
 * Used for graphics, fonts, and animations
 */
class CanvasUnit {
    constructor(frame = 0, layer = 0, width = 128, height = 64) {
        this.id = { frame, layer };
        this.width = width;
        this.height = height;
        this.pixels = new Uint8Array(width * height);
        
        this.meta = {
            name: `Unit_${frame}_${layer}`,
            locked: false,
            visible: true,
            tags: [],
            created: Date.now(),
            modified: Date.now()
        };
    }

    /**
     * Get unique key for this unit
     * @returns {string} Key in format "f-l"
     */
    getKey() {
        return `${this.id.frame}-${this.id.layer}`;
    }

    /**
     * Set pixel value at coordinates
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @param {number} value Pixel value (0 or 1)
     */
    setPixel(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const index = y * this.width + x;
        this.pixels[index] = value ? 1 : 0;
        this.meta.modified = Date.now();
    }

    /**
     * Get pixel value at coordinates
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @returns {number} Pixel value (0 or 1)
     */
    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        
        const index = y * this.width + x;
        return this.pixels[index];
    }

    /**
     * Clear all pixels
     */
    clear() {
        this.pixels.fill(0);
        this.meta.modified = Date.now();
    }

    /**
     * Fill all pixels with value
     * @param {number} value Fill value (0 or 1)
     */
    fill(value) {
        this.pixels.fill(value ? 1 : 0);
        this.meta.modified = Date.now();
    }

    /**
     * Copy pixel data from another CanvasUnit
     * @param {CanvasUnit} sourceUnit Source unit to copy from
     */
    copyFrom(sourceUnit) {
        if (sourceUnit.width !== this.width || sourceUnit.height !== this.height) {
            throw new Error('CanvasUnit dimensions must match for copying');
        }
        
        this.pixels.set(sourceUnit.pixels);
        this.meta.modified = Date.now();
    }

    /**
     * Clone this CanvasUnit
     * @returns {CanvasUnit} New CanvasUnit with copied data
     */
    clone() {
        const clone = new CanvasUnit(
            this.id.frame, 
            this.id.layer, 
            this.width, 
            this.height
        );
        
        clone.pixels.set(this.pixels);
        clone.meta = { ...this.meta };
        clone.meta.created = Date.now();
        clone.meta.modified = Date.now();
        
        return clone;
    }

    /**
     * Update metadata
     * @param {object} newMeta Metadata to merge
     */
    updateMeta(newMeta) {
        this.meta = { ...this.meta, ...newMeta };
        this.meta.modified = Date.now();
    }

    /**
     * Check if this unit matches a pattern
     * @param {object} pattern Pattern with frame, layer (supports '*' wildcard)
     * @returns {boolean} True if matches pattern
     */
    matchesPattern(pattern) {
        const { frame, layer } = pattern;
        
        if (frame !== '*' && frame !== this.id.frame) return false;
        if (layer !== '*' && layer !== this.id.layer) return false;
        
        return true;
    }

    /**
     * Export to JSON
     * @returns {object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            width: this.width,
            height: this.height,
            pixels: Array.from(this.pixels),
            meta: this.meta
        };
    }

    /**
     * Import from JSON
     * @param {object} json JSON data
     * @returns {CanvasUnit} New CanvasUnit from JSON
     */
    static fromJSON(json) {
        const unit = new CanvasUnit(
            json.id.frame,
            json.id.layer,
            json.width,
            json.height
        );
        
        unit.pixels = new Uint8Array(json.pixels);
        unit.meta = json.meta;
        
        return unit;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasUnit;
}