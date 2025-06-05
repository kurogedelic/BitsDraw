/**
 * AlphaRenderer - High-performance alpha-aware rendering system
 * Handles transparency visualization and optimized bitmap rendering
 */
class AlphaRenderer {
    constructor() {
        this.checkerboardCache = new Map();
        this.renderCache = new Map();
        this.maxCacheSize = 50;
    }
    
    /**
     * Render CanvasUnit with alpha transparency support
     */
    static renderWithAlpha(ctx, unit, zoom, colors, options = {}) {
        const { width, height, pixels, alpha } = unit;
        const showCheckerboard = options.showCheckerboard !== false;
        const optimizeForSpeed = options.optimizeForSpeed || false;
        
        // Save context state
        ctx.save();
        
        try {
            // Draw transparency checkerboard if alpha channel exists
            if (alpha && showCheckerboard) {
                this.drawCheckerboard(ctx, width * zoom, height * zoom, zoom);
            }
            
            // Optimize rendering based on zoom level and performance requirements
            if (optimizeForSpeed && zoom < 4) {
                this.renderOptimized(ctx, unit, zoom, colors);
            } else {
                this.renderPixelPerfect(ctx, unit, zoom, colors);
            }
        } finally {
            // Restore context state
            ctx.restore();
        }
    }
    
    /**
     * Pixel-perfect rendering for high zoom levels
     */
    static renderPixelPerfect(ctx, unit, zoom, colors) {
        const { width, height, pixels, alpha } = unit;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const pixel = pixels[idx];
                const alphaValue = alpha ? alpha[idx] : 255;
                
                if (alphaValue > 0) {
                    // Set alpha for transparency
                    ctx.globalAlpha = alphaValue / 255;
                    
                    // Choose color based on pixel value
                    ctx.fillStyle = pixel ? colors.foreground : colors.background;
                    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                }
            }
        }
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Optimized rendering for low zoom levels and performance
     */
    static renderOptimized(ctx, unit, zoom, colors) {
        const { width, height, pixels, alpha } = unit;
        
        // Use ImageData for bulk pixel operations
        const imageData = ctx.createImageData(width * zoom, height * zoom);
        const data = imageData.data;
        
        // Parse colors
        const bgColor = this.parseColor(colors.background);
        const fgColor = this.parseColor(colors.foreground);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIdx = y * width + x;
                const pixel = pixels[srcIdx];
                const alphaValue = alpha ? alpha[srcIdx] : 255;
                
                if (alphaValue > 0) {
                    const color = pixel ? fgColor : bgColor;
                    
                    // Fill zoom×zoom block
                    for (let dy = 0; dy < zoom; dy++) {
                        for (let dx = 0; dx < zoom; dx++) {
                            const dstX = x * zoom + dx;
                            const dstY = y * zoom + dy;
                            const dstIdx = (dstY * width * zoom + dstX) * 4;
                            
                            data[dstIdx] = color.r;         // R
                            data[dstIdx + 1] = color.g;     // G
                            data[dstIdx + 2] = color.b;     // B
                            data[dstIdx + 3] = alphaValue;  // A
                        }
                    }
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Draw transparency checkerboard pattern
     */
    static drawCheckerboard(ctx, width, height, zoom, options = {}) {
        const size = options.size || Math.max(8, zoom);
        const lightColor = options.lightColor || '#ffffff';
        const darkColor = options.darkColor || '#cccccc';
        
        // Generate cache key
        const cacheKey = `${width}x${height}_${size}_${lightColor}_${darkColor}`;
        
        // Check cache for this checkerboard pattern
        if (this.checkerboardCache && this.checkerboardCache.has(cacheKey)) {
            const cached = this.checkerboardCache.get(cacheKey);
            ctx.putImageData(cached, 0, 0);
            return;
        }
        
        // Draw checkerboard
        ctx.fillStyle = lightColor;
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = darkColor;
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const checkX = Math.floor(x / size);
                const checkY = Math.floor(y / size);
                
                if ((checkX + checkY) % 2 === 0) {
                    ctx.fillRect(x, y, Math.min(size, width - x), Math.min(size, height - y));
                }
            }
        }
        
        // Cache the result if caching is enabled
        if (this.checkerboardCache && this.checkerboardCache.size < this.maxCacheSize) {
            const imageData = ctx.getImageData(0, 0, width, height);
            this.checkerboardCache.set(cacheKey, imageData);
        }
    }
    
    /**
     * Render multiple layered units with alpha blending
     */
    static renderLayers(ctx, units, zoom, colors, options = {}) {
        const sortedUnits = units
            .filter(unit => unit.meta.visible)
            .sort((a, b) => a.id[1] - b.id[1]); // Sort by layer
        
        // Clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw checkerboard for transparency
        if (sortedUnits.some(unit => unit.alpha)) {
            const maxWidth = Math.max(...sortedUnits.map(u => u.width));
            const maxHeight = Math.max(...sortedUnits.map(u => u.height));
            this.drawCheckerboard(ctx, maxWidth * zoom, maxHeight * zoom, zoom);
        }
        
        // Render each layer
        for (const unit of sortedUnits) {
            if (!unit.meta.locked || options.showLocked) {
                ctx.save();
                
                // Apply layer opacity if specified
                if (unit.meta.opacity !== undefined) {
                    ctx.globalAlpha = unit.meta.opacity;
                }
                
                this.renderWithAlpha(ctx, unit, zoom, colors, options);
                ctx.restore();
            }
        }
    }
    
    /**
     * Export rendered result as ImageData
     */
    static exportAsImageData(units, zoom, colors, options = {}) {
        const maxWidth = Math.max(...units.map(u => u.width));
        const maxHeight = Math.max(...units.map(u => u.height));
        
        // Create temporary canvas
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth * zoom;
        canvas.height = maxHeight * zoom;
        const ctx = canvas.getContext('2d');
        
        // Render to temporary canvas
        this.renderLayers(ctx, units, zoom, colors, options);
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    /**
     * Parse color string to RGB object
     */
    static parseColor(colorStr) {
        // Handle hex colors
        if (colorStr.startsWith('#')) {
            const hex = colorStr.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return { r, g, b };
        }
        
        // Handle rgb/rgba colors
        const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3])
            };
        }
        
        // Handle named colors (basic set)
        const namedColors = {
            'black': { r: 0, g: 0, b: 0 },
            'white': { r: 255, g: 255, b: 255 },
            'red': { r: 255, g: 0, b: 0 },
            'green': { r: 0, g: 255, b: 0 },
            'blue': { r: 0, g: 0, b: 255 }
        };
        
        return namedColors[colorStr.toLowerCase()] || { r: 0, g: 0, b: 0 };
    }
    
    /**
     * Get performance metrics
     */
    static getPerformanceMetrics() {
        return {
            checkerboardCacheSize: this.checkerboardCache ? this.checkerboardCache.size : 0,
            renderCacheSize: this.renderCache ? this.renderCache.size : 0,
            maxCacheSize: this.maxCacheSize
        };
    }
    
    /**
     * Clear all caches
     */
    static clearCaches() {
        if (this.checkerboardCache) {
            this.checkerboardCache.clear();
        }
        if (this.renderCache) {
            this.renderCache.clear();
        }
    }
    
    /**
     * Generate thumbnail for a unit
     */
    static generateThumbnail(unit, maxSize = 64) {
        const scale = Math.min(maxSize / unit.width, maxSize / unit.height);
        const thumbWidth = Math.floor(unit.width * scale);
        const thumbHeight = Math.floor(unit.height * scale);
        
        const canvas = document.createElement('canvas');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext('2d');
        
        // Use simple colors for thumbnails
        const colors = {
            foreground: '#000000',
            background: '#ffffff'
        };
        
        this.renderWithAlpha(ctx, unit, scale, colors, {
            optimizeForSpeed: true,
            showCheckerboard: false
        });
        
        return canvas.toDataURL();
    }
}

// Initialize static properties
AlphaRenderer.checkerboardCache = new Map();
AlphaRenderer.renderCache = new Map();
AlphaRenderer.maxCacheSize = 50;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlphaRenderer;
} else {
    window.AlphaRenderer = AlphaRenderer;
}