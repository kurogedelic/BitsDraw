/**
 * Optimized Layer Compositing System for BitsDraw
 * 
 * This module provides enhanced layer compositing with the following optimizations:
 * 1. Incremental compositing with dirty rectangle support
 * 2. Layer-specific caching system
 * 3. Intelligent cache invalidation
 * 4. Background compositing for large operations
 * 5. Memory-efficient data structures
 */

class OptimizedLayerCompositor {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // Layer management
        this.layers = [];
        this.layerCaches = new Map(); // Individual layer render caches
        this.layerDirtyRects = new Map(); // Per-layer dirty rectangles
        
        // Global composite cache
        this.globalComposite = {
            pixels: new Uint8Array(width * height),
            alpha: new Uint8Array(width * height),
            dirty: true,
            dirtyRects: []
        };
        
        // Performance tracking
        this.stats = {
            fullComposites: 0,
            incrementalComposites: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageCompositeTime: 0
        };
        
        // Configuration
        this.config = {
            enableIncrementalCompositing: true,
            enableLayerCaching: true,
            maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit
            backgroundCompositeThreshold: 512 * 512, // Use background for large canvases
            dirtyRectMergeThreshold: 0.25 // Merge if dirty area > 25% of canvas
        };
    }

    // Add layer with caching support
    addLayer(layerData) {
        const layerId = layerData.id || Date.now();
        
        this.layers.push({
            ...layerData,
            id: layerId,
            lastModified: Date.now()
        });
        
        // Initialize layer cache
        this.layerCaches.set(layerId, {
            pixels: null,
            alpha: null,
            rendered: null, // Pre-rendered canvas data
            dirty: true,
            lastUpdate: 0
        });
        
        this.layerDirtyRects.set(layerId, []);
        this.markGlobalDirty();
        
        return layerId;
    }

    // Remove layer and clean up cache
    removeLayer(layerId) {
        this.layers = this.layers.filter(layer => layer.id !== layerId);
        this.layerCaches.delete(layerId);
        this.layerDirtyRects.delete(layerId);
        this.markGlobalDirty();
    }

    // Mark specific layer as dirty
    markLayerDirty(layerId, dirtyRect = null) {
        const cache = this.layerCaches.get(layerId);
        if (cache) {
            cache.dirty = true;
            cache.lastUpdate = Date.now();
            
            if (dirtyRect) {
                const layerDirtyRects = this.layerDirtyRects.get(layerId) || [];
                layerDirtyRects.push(dirtyRect);
                this.layerDirtyRects.set(layerId, layerDirtyRects);
            }
        }
        
        this.markGlobalDirty(dirtyRect);
    }

    // Mark global composite as dirty
    markGlobalDirty(dirtyRect = null) {
        this.globalComposite.dirty = true;
        
        if (dirtyRect) {
            this.globalComposite.dirtyRects.push(dirtyRect);
        }
    }

    // Optimized layer compositing with multiple strategies
    async compositeAllLayers() {
        const startTime = performance.now();
        
        // Check if we can use cached result
        if (!this.globalComposite.dirty) {
            this.stats.cacheHits++;
            return this.globalComposite;
        }
        
        this.stats.cacheMisses++;
        
        // Determine compositing strategy
        const strategy = this.selectCompositingStrategy();
        
        let result;
        switch (strategy) {
            case 'incremental':
                result = await this.performIncrementalCompositing();
                break;
            case 'background':
                result = await this.performBackgroundCompositing();
                break;
            case 'full':
            default:
                result = await this.performFullCompositing();
                break;
        }
        
        // Update performance stats
        const duration = performance.now() - startTime;
        this.updatePerformanceStats(strategy, duration);
        
        this.globalComposite.dirty = false;
        this.globalComposite.dirtyRects = [];
        
        return result;
    }

    // Select optimal compositing strategy based on current state
    selectCompositingStrategy() {
        const canvasArea = this.width * this.height;
        const dirtyArea = this.calculateDirtyArea();
        const dirtyRatio = dirtyArea / canvasArea;
        
        // Use background compositing for very large operations
        if (canvasArea > this.config.backgroundCompositeThreshold && 
            this.layers.length > 3) {
            return 'background';
        }
        
        // Use incremental for small changes
        if (this.config.enableIncrementalCompositing && 
            dirtyRatio < this.config.dirtyRectMergeThreshold &&
            this.globalComposite.dirtyRects.length > 0) {
            return 'incremental';
        }
        
        // Default to full compositing
        return 'full';
    }

    // Calculate total dirty area across all layers
    calculateDirtyArea() {
        let totalArea = 0;
        const processedRects = new Set();
        
        for (const dirtyRect of this.globalComposite.dirtyRects) {
            const rectKey = `${dirtyRect.x},${dirtyRect.y},${dirtyRect.width},${dirtyRect.height}`;
            if (!processedRects.has(rectKey)) {
                totalArea += dirtyRect.width * dirtyRect.height;
                processedRects.add(rectKey);
            }
        }
        
        return totalArea;
    }

    // Incremental compositing - only update dirty areas
    async performIncrementalCompositing() {
        this.stats.incrementalComposites++;
        
        // Merge overlapping dirty rectangles
        const mergedRects = this.mergeDirtyRectangles(this.globalComposite.dirtyRects);
        
        for (const dirtyRect of mergedRects) {
            await this.compositeRectangle(dirtyRect);
        }
        
        return this.globalComposite;
    }

    // Composite specific rectangle area
    async compositeRectangle(rect) {
        const { x, y, width, height } = rect;
        
        // Clear the area first
        for (let py = y; py < y + height && py < this.height; py++) {
            for (let px = x; px < x + width && px < this.width; px++) {
                const index = py * this.width + px;
                this.globalComposite.pixels[index] = 0;
                this.globalComposite.alpha[index] = 0;
            }
        }
        
        // Composite visible layers for this area
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            
            await this.compositeLayerRectangle(layer, rect);
        }
    }

    // Composite specific layer within rectangle
    async compositeLayerRectangle(layer, rect) {
        const { x, y, width, height } = rect;
        
        // Get or create layer cache
        let layerCache = this.layerCaches.get(layer.id);
        if (!layerCache || layerCache.dirty) {
            await this.updateLayerCache(layer);
            layerCache = this.layerCaches.get(layer.id);
        }
        
        // Composite the rectangle area
        for (let py = y; py < y + height && py < this.height; py++) {
            for (let px = x; px < x + width && px < this.width; px++) {
                const index = py * this.width + px;
                const layerAlpha = layer.alpha[index];
                
                if (layerAlpha > 0) {
                    const currentAlpha = this.globalComposite.alpha[index];
                    if (currentAlpha === 0) {
                        this.globalComposite.pixels[index] = layer.pixels[index];
                        this.globalComposite.alpha[index] = layerAlpha;
                    } else {
                        // Upper layer takes priority
                        this.globalComposite.pixels[index] = layer.pixels[index];
                    }
                }
            }
        }
    }

    // Full compositing - rebuild entire composite
    async performFullCompositing() {
        this.stats.fullComposites++;
        
        // Clear composite
        this.globalComposite.pixels.fill(0);
        this.globalComposite.alpha.fill(0);
        
        // Composite all visible layers
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            
            await this.compositeLayer(layer);
        }
        
        return this.globalComposite;
    }

    // Composite single layer to global composite
    async compositeLayer(layer) {
        // Update layer cache if needed
        let layerCache = this.layerCaches.get(layer.id);
        if (!layerCache || layerCache.dirty) {
            await this.updateLayerCache(layer);
            layerCache = this.layerCaches.get(layer.id);
        }
        
        // Composite entire layer
        for (let i = 0; i < this.globalComposite.pixels.length; i++) {
            const layerAlpha = layer.alpha[i];
            
            if (layerAlpha > 0) {
                const currentAlpha = this.globalComposite.alpha[i];
                if (currentAlpha === 0) {
                    this.globalComposite.pixels[i] = layer.pixels[i];
                    this.globalComposite.alpha[i] = layerAlpha;
                } else {
                    // Upper layer takes priority
                    this.globalComposite.pixels[i] = layer.pixels[i];
                }
            }
        }
    }

    // Background compositing using Web Worker (placeholder)
    async performBackgroundCompositing() {
        // In a real implementation, this would use a Web Worker
        // For now, fall back to full compositing with yielding
        return new Promise(async (resolve) => {
            const batchSize = 1000; // Process in batches
            let processed = 0;
            
            this.globalComposite.pixels.fill(0);
            this.globalComposite.alpha.fill(0);
            
            for (const layer of this.layers) {
                if (!layer.visible) continue;
                
                for (let i = 0; i < layer.pixels.length; i += batchSize) {
                    const end = Math.min(i + batchSize, layer.pixels.length);
                    
                    for (let j = i; j < end; j++) {
                        const layerAlpha = layer.alpha[j];
                        
                        if (layerAlpha > 0) {
                            const currentAlpha = this.globalComposite.alpha[j];
                            if (currentAlpha === 0) {
                                this.globalComposite.pixels[j] = layer.pixels[j];
                                this.globalComposite.alpha[j] = layerAlpha;
                            } else {
                                this.globalComposite.pixels[j] = layer.pixels[j];
                            }
                        }
                    }
                    
                    processed += batchSize;
                    
                    // Yield control to prevent UI blocking
                    if (processed % (batchSize * 10) === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
            
            resolve(this.globalComposite);
        });
    }

    // Update individual layer cache
    async updateLayerCache(layer) {
        const cache = this.layerCaches.get(layer.id);
        if (!cache) return;
        
        // For now, just mark as updated
        // In a full implementation, this would pre-process layer data
        cache.dirty = false;
        cache.lastUpdate = Date.now();
    }

    // Merge overlapping dirty rectangles
    mergeDirtyRectangles(dirtyRects) {
        if (dirtyRects.length <= 1) return dirtyRects;
        
        const merged = [];
        const sorted = dirtyRects.sort((a, b) => a.x - b.x || a.y - b.y);
        
        let current = { ...sorted[0] };
        
        for (let i = 1; i < sorted.length; i++) {
            const rect = sorted[i];
            
            // Check if rectangles overlap or are adjacent
            if (this.rectanglesOverlapOrAdjacent(current, rect)) {
                // Merge rectangles
                const x1 = Math.min(current.x, rect.x);
                const y1 = Math.min(current.y, rect.y);
                const x2 = Math.max(current.x + current.width, rect.x + rect.width);
                const y2 = Math.max(current.y + current.height, rect.y + rect.height);
                
                current = {
                    x: x1,
                    y: y1,
                    width: x2 - x1,
                    height: y2 - y1
                };
            } else {
                merged.push(current);
                current = { ...rect };
            }
        }
        
        merged.push(current);
        return merged;
    }

    // Check if two rectangles overlap or are adjacent
    rectanglesOverlapOrAdjacent(rect1, rect2) {
        const r1x2 = rect1.x + rect1.width;
        const r1y2 = rect1.y + rect1.height;
        const r2x2 = rect2.x + rect2.width;
        const r2y2 = rect2.y + rect2.height;
        
        return !(rect1.x > r2x2 + 1 || r1x2 + 1 < rect2.x || 
                rect1.y > r2y2 + 1 || r1y2 + 1 < rect2.y);
    }

    // Update performance statistics
    updatePerformanceStats(strategy, duration) {
        this.stats.averageCompositeTime = 
            (this.stats.averageCompositeTime * 0.9) + (duration * 0.1);
            
        console.log(`Compositing strategy: ${strategy}, duration: ${duration.toFixed(2)}ms`);
    }

    // Get performance report
    getPerformanceReport() {
        const totalComposites = this.stats.fullComposites + this.stats.incrementalComposites;
        const cacheHitRatio = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
        
        return {
            totalComposites,
            fullComposites: this.stats.fullComposites,
            incrementalComposites: this.stats.incrementalComposites,
            cacheHitRatio: (cacheHitRatio * 100).toFixed(1) + '%',
            averageCompositeTime: this.stats.averageCompositeTime.toFixed(2) + 'ms',
            incrementalRatio: ((this.stats.incrementalComposites / totalComposites) * 100).toFixed(1) + '%'
        };
    }

    // Memory management
    cleanupCaches() {
        const now = Date.now();
        const maxAge = 60000; // 1 minute
        
        for (const [layerId, cache] of this.layerCaches) {
            if (now - cache.lastUpdate > maxAge) {
                // Clean up old caches
                cache.pixels = null;
                cache.alpha = null;
                cache.rendered = null;
            }
        }
    }

    // Resize compositor
    resize(newWidth, newHeight) {
        this.width = newWidth;
        this.height = newHeight;
        
        // Recreate global composite
        this.globalComposite = {
            pixels: new Uint8Array(newWidth * newHeight),
            alpha: new Uint8Array(newWidth * newHeight),
            dirty: true,
            dirtyRects: []
        };
        
        // Clear all caches
        for (const cache of this.layerCaches.values()) {
            cache.dirty = true;
            cache.pixels = null;
            cache.alpha = null;
            cache.rendered = null;
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.OptimizedLayerCompositor = OptimizedLayerCompositor;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedLayerCompositor;
}