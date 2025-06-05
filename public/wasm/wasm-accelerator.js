/**
 * WASM Accelerator - High-performance image processing with fallback
 * Provides seamless integration between WASM and JavaScript implementations
 */
class WasmAccelerator {
    constructor() {
        this.ready = false;
        this.module = null;
        this.initPromise = this.initialize();
        
        // Performance tracking
        this.stats = {
            wasmCalls: 0,
            jsFallbacks: 0,
            averageSpeedup: 1.0
        };
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing WASM acceleration...');
            
            // Dynamic import for better loading
            const wasmModule = await import('./bitsdraw_wasm.js');
            await wasmModule.default('./bitsdraw_wasm_bg.wasm');
            
            this.module = wasmModule;
            this.ready = await this.selfTest();
            
            if (this.ready) {
                console.log('✅ WASM acceleration ready');
                this.logCapabilities();
            } else {
                console.warn('⚠️ WASM self-test failed, using JS fallback');
            }
            
            return this.ready;
        } catch (e) {
            console.warn('⚠️ WASM not available, using JS fallback:', e.message);
            return false;
        }
    }
    
    async selfTest() {
        try {
            // Test with small image
            const test = new Uint8Array([128, 64, 192, 32, 255, 0, 128, 96]);
            const result = this.module.process_safe(
                "floyd_steinberg", test, 4, 2, [128]
            );
            
            const success = result.success && result.data.length === 8;
            if (!success) {
                console.error('WASM self-test failed:', result.error);
            }
            
            return success;
        } catch (e) {
            console.error('WASM self-test exception:', e);
            return false;
        }
    }
    
    logCapabilities() {
        const capabilities = [
            'Floyd-Steinberg Dithering',
            'Bayer Matrix Dithering (2×2, 4×4, 8×8)',
            'Flood Fill',
            'Box Blur',
        ];
        
        console.log('🛠️ WASM Capabilities:', capabilities.join(', '));
    }
    
    async process(operation, pixels, width, height, params = []) {
        await this.initPromise;
        
        if (!this.ready) {
            this.stats.jsFallbacks++;
            return this.jsFallback(operation, pixels, width, height, params);
        }
        
        try {
            const startTime = performance.now();
            
            // Convert pixels to format expected by WASM
            const inputArray = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels);
            const paramArray = params instanceof Float32Array ? params : Float32Array.from(params);
            
            const result = this.module.process_safe(
                operation, inputArray, width, height, paramArray
            );
            
            if (!result.success) {
                console.warn(`WASM ${operation} failed:`, result.error);
                this.stats.jsFallbacks++;
                return this.jsFallback(operation, pixels, width, height, params);
            }
            
            const wasmTime = performance.now() - startTime;
            this.updatePerformanceStats(operation, wasmTime);
            this.stats.wasmCalls++;
            
            return new Uint8Array(result.data);
        } catch (e) {
            console.error('WASM execution error:', e);
            this.stats.jsFallbacks++;
            return this.jsFallback(operation, pixels, width, height, params);
        }
    }
    
    jsFallback(operation, pixels, width, height, params) {
        console.log(`📉 Using JS fallback for ${operation}`);
        
        // Import existing JS implementations
        switch (operation) {
            case "floyd_steinberg":
                if (window.DitheringEffects && window.DitheringEffects.floydSteinberg) {
                    return window.DitheringEffects.floydSteinberg(pixels, width, height, params[0] || 128);
                }
                break;
                
            case "bayer_dither":
                if (window.DitheringEffects && window.DitheringEffects.bayerDither) {
                    const matrixSize = params[0] || 4;
                    const threshold = params[1] || 128;
                    return window.DitheringEffects.bayerDither(pixels, width, height, matrixSize, threshold);
                }
                break;
                
            case "flood_fill":
                if (window.FloodFill && window.FloodFill.fill) {
                    return window.FloodFill.fill(pixels, width, height, params[0], params[1], params[2]);
                }
                break;
                
            case "box_blur":
                return this.jsBoxBlur(pixels, width, height, params[0] || 1);
                
            default:
                console.warn(`No JS fallback available for ${operation}`);
                return pixels;
        }
        
        // If specific implementation not found, return original
        return pixels;
    }
    
    // Simple JS implementation for operations without existing fallbacks
    jsBoxBlur(pixels, width, height, radius) {
        const result = new Uint8Array(pixels.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                
                const yStart = Math.max(0, y - radius);
                const yEnd = Math.min(height, y + radius + 1);
                const xStart = Math.max(0, x - radius);
                const xEnd = Math.min(width, x + radius + 1);
                
                for (let blurY = yStart; blurY < yEnd; blurY++) {
                    for (let blurX = xStart; blurX < xEnd; blurX++) {
                        sum += pixels[blurY * width + blurX];
                        count++;
                    }
                }
                
                result[y * width + x] = Math.round(sum / count);
            }
        }
        
        return result;
    }
    
    updatePerformanceStats(operation, wasmTime) {
        // Store timing data for performance monitoring
        if (!this.timingData) {
            this.timingData = {};
        }
        
        if (!this.timingData[operation]) {
            this.timingData[operation] = [];
        }
        
        this.timingData[operation].push(wasmTime);
        
        // Keep only last 10 measurements
        if (this.timingData[operation].length > 10) {
            this.timingData[operation].shift();
        }
    }
    
    getPerformanceStats() {
        return {
            ready: this.ready,
            wasmCalls: this.stats.wasmCalls,
            jsFallbacks: this.stats.jsFallbacks,
            successRate: this.stats.wasmCalls / (this.stats.wasmCalls + this.stats.jsFallbacks),
            timingData: this.timingData || {}
        };
    }
    
    // Utility methods for common operations
    async ditherFloydSteinberg(pixels, width, height, threshold = 128) {
        return this.process('floyd_steinberg', pixels, width, height, [threshold]);
    }
    
    async ditherBayer(pixels, width, height, matrixSize = 4, threshold = 128) {
        return this.process('bayer_dither', pixels, width, height, [matrixSize, threshold]);
    }
    
    async floodFill(pixels, width, height, x, y, fillValue) {
        return this.process('flood_fill', pixels, width, height, [x, y, fillValue]);
    }
    
    async blur(pixels, width, height, radius = 1) {
        return this.process('box_blur', pixels, width, height, [radius]);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WasmAccelerator;
} else {
    window.WasmAccelerator = WasmAccelerator;
}