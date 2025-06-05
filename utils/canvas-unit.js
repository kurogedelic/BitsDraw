/**
 * CanvasUnit - Enhanced bitmap data structure with alpha layer support
 * Supports transparency, clipping bounds, and Playdate PDI export
 */
class CanvasUnit {
    constructor(frame, layer, width, height) {
        this.id = [frame, layer];
        this.width = width;
        this.height = height;
        
        // Core data
        this.pixels = new Uint8Array(width * height);  // B/W data (0=white, 1=black)
        this.alpha = null;                              // Optional alpha channel
        
        // Metadata and flags
        this.flags = 0;  // bit 0: has alpha, bit 1: compressed, bit 2: dirty
        this.meta = {
            name: '',
            locked: false,
            visible: true,
            hasAlpha: false,
            clipBounds: null,
            created: Date.now(),
            modified: Date.now(),
            tags: []
        };
        
        // Performance tracking
        this.stats = {
            pixelCount: width * height,
            alphaPixelCount: 0,
            boundingBox: null
        };
    }
    
    /**
     * Enable alpha channel support
     */
    enableAlpha() {
        if (!this.alpha) {
            this.alpha = new Uint8Array(this.width * this.height);
            this.alpha.fill(255);  // Default fully opaque
            this.flags |= 0x1;
            this.meta.hasAlpha = true;
            this.markDirty();
            this.updateClipBounds();
        }
    }
    
    /**
     * Disable alpha channel support
     */
    disableAlpha() {
        this.alpha = null;
        this.flags &= ~0x1;
        this.meta.hasAlpha = false;
        this.meta.clipBounds = null;
        this.stats.alphaPixelCount = 0;
        this.markDirty();
    }
    
    /**
     * Set pixel with optional alpha
     */
    setPixel(x, y, value, alphaValue = 255) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        
        const idx = y * this.width + x;
        this.pixels[idx] = value ? 1 : 0;
        
        if (this.alpha && alphaValue !== undefined) {
            this.alpha[idx] = Math.max(0, Math.min(255, alphaValue));
        }
        
        this.markDirty();
        return true;
    }
    
    /**
     * Get pixel value
     */
    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0;
        }
        
        return this.pixels[y * this.width + x];
    }
    
    /**
     * Get alpha value
     */
    getAlpha(x, y) {
        if (!this.alpha || x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 255;
        }
        
        return this.alpha[y * this.width + x];
    }
    
    /**
     * Update clipping bounds based on alpha channel
     */
    updateClipBounds() {
        if (!this.alpha) {
            this.meta.clipBounds = null;
            this.stats.boundingBox = null;
            return;
        }
        
        let minX = this.width, minY = this.height;
        let maxX = -1, maxY = -1;
        let alphaPixelCount = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                if (this.alpha[idx] > 0) {
                    alphaPixelCount++;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        this.stats.alphaPixelCount = alphaPixelCount;
        
        if (maxX >= 0) {
            this.meta.clipBounds = {
                x: minX, y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            };
            this.stats.boundingBox = this.meta.clipBounds;
        } else {
            this.meta.clipBounds = null;
            this.stats.boundingBox = null;
        }
    }
    
    /**
     * Mark as dirty for rendering updates
     */
    markDirty() {
        this.flags |= 0x4;
        this.meta.modified = Date.now();
    }
    
    /**
     * Clear dirty flag
     */
    clearDirty() {
        this.flags &= ~0x4;
    }
    
    /**
     * Check if unit is dirty
     */
    isDirty() {
        return (this.flags & 0x4) !== 0;
    }
    
    /**
     * Fill entire canvas with value
     */
    fill(value, alphaValue = 255) {
        this.pixels.fill(value ? 1 : 0);
        
        if (this.alpha) {
            this.alpha.fill(Math.max(0, Math.min(255, alphaValue)));
        }
        
        this.markDirty();
        this.updateClipBounds();
    }
    
    /**
     * Clear entire canvas
     */
    clear() {
        this.fill(0, 0);
    }
    
    /**
     * Copy data from another CanvasUnit
     */
    copyFrom(other) {
        if (other.width !== this.width || other.height !== this.height) {
            throw new Error('Cannot copy from CanvasUnit with different dimensions');
        }
        
        this.pixels.set(other.pixels);
        
        if (other.alpha && this.alpha) {
            this.alpha.set(other.alpha);
        } else if (other.alpha) {
            this.enableAlpha();
            this.alpha.set(other.alpha);
        }
        
        this.markDirty();
        this.updateClipBounds();
    }
    
    /**
     * Export as Playdate PDI format with alpha support
     */
    exportAsPDI() {
        const bounds = this.meta.clipBounds || {
            x: 0, y: 0, width: this.width, height: this.height
        };
        
        const stride = Math.ceil(bounds.width / 8);
        const pixelData = new Uint8Array(stride * bounds.height);
        const alphaData = this.alpha ? new Uint8Array(stride * bounds.height) : null;
        
        // Pack bits efficiently
        for (let y = 0; y < bounds.height; y++) {
            for (let x = 0; x < bounds.width; x++) {
                const srcIdx = (y + bounds.y) * this.width + (x + bounds.x);
                const dstByte = Math.floor(x / 8);
                const dstBit = 7 - (x % 8);
                const dstIdx = y * stride + dstByte;
                
                // Set pixel bit
                if (this.pixels[srcIdx]) {
                    pixelData[dstIdx] |= (1 << dstBit);
                }
                
                // Set alpha bit (if alpha channel exists)
                if (alphaData && this.alpha && this.alpha[srcIdx] > 127) {
                    alphaData[dstIdx] |= (1 << dstBit);
                }
            }
        }
        
        return {
            flags: this.flags,
            bounds: bounds,
            stride: stride,
            pixelData: pixelData,
            alphaData: alphaData,
            meta: this.meta
        };
    }
    
    /**
     * Export as standard bitmap data
     */
    exportAsBitmap() {
        return {
            width: this.width,
            height: this.height,
            pixels: new Uint8Array(this.pixels),
            alpha: this.alpha ? new Uint8Array(this.alpha) : null,
            hasAlpha: this.meta.hasAlpha
        };
    }
    
    /**
     * Get memory usage statistics
     */
    getMemoryUsage() {
        const pixelMemory = this.pixels.byteLength;
        const alphaMemory = this.alpha ? this.alpha.byteLength : 0;
        const metaMemory = JSON.stringify(this.meta).length * 2; // Rough estimate
        
        return {
            total: pixelMemory + alphaMemory + metaMemory,
            pixels: pixelMemory,
            alpha: alphaMemory,
            meta: metaMemory
        };
    }
    
    /**
     * Create optimized copy for rendering
     */
    createRenderCopy() {
        const copy = new CanvasUnit(this.id[0], this.id[1], this.width, this.height);
        copy.copyFrom(this);
        copy.clearDirty();
        return copy;
    }
    
    /**
     * Validate data integrity
     */
    validate() {
        const errors = [];
        
        if (this.width <= 0 || this.height <= 0) {
            errors.push('Invalid dimensions');
        }
        
        if (this.pixels.length !== this.width * this.height) {
            errors.push('Pixel array size mismatch');
        }
        
        if (this.alpha && this.alpha.length !== this.width * this.height) {
            errors.push('Alpha array size mismatch');
        }
        
        // Check for invalid pixel values
        for (let i = 0; i < this.pixels.length; i++) {
            if (this.pixels[i] !== 0 && this.pixels[i] !== 1) {
                errors.push(`Invalid pixel value at index ${i}: ${this.pixels[i]}`);
                break;
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Update metadata
     */
    updateMeta(updates) {
        Object.assign(this.meta, updates);
        this.markDirty();
    }
    
    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            id: this.id,
            dimensions: `${this.width}×${this.height}`,
            flags: this.flags.toString(2).padStart(8, '0'),
            hasAlpha: this.meta.hasAlpha,
            clipBounds: this.meta.clipBounds,
            stats: this.stats,
            memory: this.getMemoryUsage(),
            validation: this.validate()
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasUnit;
} else {
    window.CanvasUnit = CanvasUnit;
}