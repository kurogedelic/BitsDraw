/**
 * BitsDraw GIF Encoder with Multiple Fallback Strategies
 * Ensures reliable GIF export with optimal quality
 */

class GifExportStrategies {
    constructor() {
        this.strategies = [
            new PencilJsGifStrategy(),
            new GifJsStrategy(), 
            new CanvasToGifStrategy()
        ];
    }

    async export(sheets, settings) {
        const { width, height, frameRate, projectName, quality = 'balanced' } = settings;
        
        for (let i = 0; i < this.strategies.length; i++) {
            const strategy = this.strategies[i];
            
            if (!strategy.isAvailable()) {
                console.log(`${strategy.name} not available, trying next strategy...`);
                continue;
            }

            try {
                console.log(`Attempting GIF export with ${strategy.name}...`);
                const result = await strategy.encode(sheets, settings);
                
                console.log(`✅ GIF export successful with ${strategy.name}`);
                return {
                    blob: result,
                    method: strategy.name,
                    quality: quality
                };
            } catch (error) {
                console.warn(`❌ ${strategy.name} failed:`, error.message);
                
                // Continue to next strategy
                if (i < this.strategies.length - 1) {
                    console.log(`Falling back to next strategy...`);
                }
            }
        }

        throw new Error('All GIF encoding strategies failed. Please try PNG Sequence export instead.');
    }
}

/**
 * Strategy 1: @pencil.js/canvas-gif-encoder (Highest Quality)
 */
class PencilJsGifStrategy {
    constructor() {
        this.name = '@pencil.js/canvas-gif-encoder';
    }

    isAvailable() {
        return typeof CanvasGifEncoder !== 'undefined';
    }

    async encode(sheets, settings) {
        const { width, height, frameRate, quality = 'balanced' } = settings;
        
        const encoder = new CanvasGifEncoder();
        
        // Quality settings
        const qualitySettings = this.getQualitySettings(quality);
        encoder.setDelay(Math.round(1000 / frameRate));
        encoder.setRepeat(0); // Loop forever
        
        if (qualitySettings.dithering) {
            encoder.setDithering(true);
        }

        // Add frames
        for (let i = 0; i < sheets.length; i++) {
            const canvas = this.sheetToCanvas(sheets[i], width, height);
            const ctx = canvas.getContext('2d');
            
            encoder.addFrame(ctx);
            console.log(`Frame ${i + 1}/${sheets.length} processed (PencilJS)`);
        }

        return encoder.end();
    }

    getQualitySettings(quality) {
        const settings = {
            fast: { dithering: false },
            balanced: { dithering: true },
            best: { dithering: true }
        };
        return settings[quality] || settings.balanced;
    }

    sheetToCanvas(sheet, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Get pixel data from BitsDraw sheet composite
        const pixelData = window.bitsDraw?.getSheetCompositePixels?.(sheet);
        
        if (!pixelData) {
            throw new Error('Unable to get sheet pixel data');
        }

        // Convert BitsDraw format to ImageData
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < pixelData.length; i++) {
            const pixelIndex = i * 4;
            const value = pixelData[i] === 0 ? 255 : 0; // 0=white, 1=black
            
            data[pixelIndex] = value;     // R
            data[pixelIndex + 1] = value; // G
            data[pixelIndex + 2] = value; // B
            data[pixelIndex + 3] = 255;   // A (opaque)
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
}

/**
 * Strategy 2: gif.js (Web Workers + Reliability)
 */
class GifJsStrategy {
    constructor() {
        this.name = 'gif.js';
    }

    isAvailable() {
        return typeof GIF !== 'undefined';
    }

    async encode(sheets, settings) {
        const { width, height, frameRate, quality = 'balanced' } = settings;
        
        const qualitySettings = this.getQualitySettings(quality);
        
        const gif = new GIF({
            workers: qualitySettings.workers,
            quality: qualitySettings.quality,
            width: width,
            height: height,
            repeat: 0 // Loop forever
        });

        // Add frames
        for (let i = 0; i < sheets.length; i++) {
            const canvas = this.sheetToCanvas(sheets[i], width, height);
            const delay = Math.round(1000 / frameRate);
            
            gif.addFrame(canvas, { delay: delay });
            console.log(`Frame ${i + 1}/${sheets.length} added (gif.js)`);
        }

        return new Promise((resolve, reject) => {
            gif.on('finished', resolve);
            gif.on('error', reject);
            gif.render();
        });
    }

    getQualitySettings(quality) {
        const settings = {
            fast: { workers: 1, quality: 20 },
            balanced: { workers: 2, quality: 10 },
            best: { workers: 4, quality: 1 }
        };
        return settings[quality] || settings.balanced;
    }

    sheetToCanvas(sheet, width, height) {
        // Same implementation as PencilJS strategy
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const pixelData = window.bitsDraw?.getSheetCompositePixels?.(sheet);
        
        if (!pixelData) {
            throw new Error('Unable to get sheet pixel data');
        }

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < pixelData.length; i++) {
            const pixelIndex = i * 4;
            const value = pixelData[i] === 0 ? 255 : 0;
            
            data[pixelIndex] = value;
            data[pixelIndex + 1] = value;
            data[pixelIndex + 2] = value;
            data[pixelIndex + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
}

/**
 * Strategy 3: Canvas-based Simple GIF (Last Resort)
 */
class CanvasToGifStrategy {
    constructor() {
        this.name = 'Canvas Simple GIF';
    }

    isAvailable() {
        return true; // Always available
    }

    async encode(sheets, settings) {
        // This would be a very basic implementation
        // For now, we'll throw an error suggesting PNG sequence
        throw new Error('Simple GIF encoder not yet implemented. Please use PNG Sequence export.');
    }
}

// Quality presets for UI
const GIF_QUALITY_PRESETS = {
    fast: {
        name: 'Fast',
        description: 'Quick export, larger file size',
        estimatedTime: 'Few seconds'
    },
    balanced: {
        name: 'Balanced', 
        description: 'Good quality and reasonable speed',
        estimatedTime: '10-30 seconds'
    },
    best: {
        name: 'Best Quality',
        description: 'Highest quality, slower export',
        estimatedTime: '30+ seconds'
    }
};

// Export for global access
window.GifExportStrategies = GifExportStrategies;
window.GIF_QUALITY_PRESETS = GIF_QUALITY_PRESETS;