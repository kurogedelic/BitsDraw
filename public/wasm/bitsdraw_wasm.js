/**
 * WASM Fallback Module - JavaScript Implementation
 * This module provides the same interface as the WASM module but uses JavaScript
 * for environments where WASM is not available or hasn't been built yet.
 */

let wasm;

// Fallback ProcessResult class
class ProcessResult {
    constructor(success, error, data) {
        this.success = success;
        this.error = error;
        this.data = data;
    }
}

// Main processing function - JavaScript fallback
function process_safe(operation, pixels, width, height, params) {
    try {
        switch (operation) {
            case 'floyd_steinberg':
                return floydSteinbergJS(pixels, width, height, params);
            case 'bayer_dither':
                return bayerDitherJS(pixels, width, height, params);
            case 'flood_fill':
                return floodFillJS(pixels, width, height, params);
            case 'box_blur':
                return boxBlurJS(pixels, width, height, params);
            default:
                return new ProcessResult(false, `Unknown operation: ${operation}`, new Uint8Array(0));
        }
    } catch (error) {
        return new ProcessResult(false, error.message, new Uint8Array(0));
    }
}

// Floyd-Steinberg dithering implementation
function floydSteinbergJS(pixels, width, height, params) {
    if (!params || params.length === 0) {
        return new ProcessResult(false, 'Floyd-Steinberg requires threshold parameter', new Uint8Array(0));
    }
    
    const threshold = params[0];
    const result = new Uint8Array(pixels);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldPixel = result[idx];
            const newPixel = oldPixel > threshold ? 255 : 0;
            result[idx] = newPixel;
            
            const error = oldPixel - newPixel;
            
            // Distribute error to neighboring pixels
            if (x + 1 < width) {
                result[y * width + (x + 1)] = clampPixel(result[y * width + (x + 1)] + error * 7 / 16);
            }
            
            if (y + 1 < height) {
                if (x > 0) {
                    result[(y + 1) * width + (x - 1)] = clampPixel(result[(y + 1) * width + (x - 1)] + error * 3 / 16);
                }
                
                result[(y + 1) * width + x] = clampPixel(result[(y + 1) * width + x] + error * 5 / 16);
                
                if (x + 1 < width) {
                    result[(y + 1) * width + (x + 1)] = clampPixel(result[(y + 1) * width + (x + 1)] + error * 1 / 16);
                }
            }
        }
    }
    
    return new ProcessResult(true, '', result);
}

// Bayer dithering implementation
function bayerDitherJS(pixels, width, height, params) {
    if (!params || params.length === 0) {
        return new ProcessResult(false, 'Bayer dither requires matrix size parameter', new Uint8Array(0));
    }
    
    const matrixSize = Math.floor(params[0]);
    const threshold = params.length > 1 ? params[1] : 128;
    
    const bayerMatrices = {
        2: [0, 128, 192, 64],
        4: [0, 128, 32, 160, 192, 64, 224, 96, 48, 176, 16, 144, 240, 112, 208, 80],
        8: [0, 128, 32, 160, 8, 136, 40, 168, 192, 64, 224, 96, 200, 72, 232, 104, 
            48, 176, 16, 144, 56, 184, 24, 152, 240, 112, 208, 80, 248, 120, 216, 88,
            12, 140, 44, 172, 4, 132, 36, 164, 204, 76, 236, 108, 196, 68, 228, 100,
            60, 188, 28, 156, 52, 180, 20, 148, 252, 124, 220, 92, 244, 116, 212, 84]
    };
    
    const matrix = bayerMatrices[matrixSize];
    if (!matrix) {
        return new ProcessResult(false, `Unsupported Bayer matrix size: ${matrixSize}`, new Uint8Array(0));
    }
    
    const result = new Uint8Array(pixels.length);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixel = pixels[idx];
            const ditherValue = matrix[(y % matrixSize) * matrixSize + (x % matrixSize)];
            const adjustedThreshold = threshold + (ditherValue - 128) / 4;
            
            result[idx] = pixel > adjustedThreshold ? 255 : 0;
        }
    }
    
    return new ProcessResult(true, '', result);
}

// Flood fill implementation
function floodFillJS(pixels, width, height, params) {
    if (!params || params.length < 3) {
        return new ProcessResult(false, 'Flood fill requires x, y, fill_value parameters', new Uint8Array(0));
    }
    
    const startX = Math.floor(params[0]);
    const startY = Math.floor(params[1]);
    const fillValue = Math.floor(params[2]);
    
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
        return new ProcessResult(false, 'Fill coordinates out of bounds', new Uint8Array(0));
    }
    
    const result = new Uint8Array(pixels);
    const originalValue = result[startY * width + startX];
    
    if (originalValue === fillValue) {
        return new ProcessResult(true, '', result);
    }
    
    // Simple flood fill using a stack
    const stack = [{x: startX, y: startY}];
    
    while (stack.length > 0) {
        const {x, y} = stack.pop();
        
        if (x < 0 || x >= width || y < 0 || y >= height) {
            continue;
        }
        
        const idx = y * width + x;
        if (result[idx] !== originalValue) {
            continue;
        }
        
        result[idx] = fillValue;
        
        // Add neighboring pixels
        stack.push({x: x - 1, y: y});
        stack.push({x: x + 1, y: y});
        stack.push({x: x, y: y - 1});
        stack.push({x: x, y: y + 1});
    }
    
    return new ProcessResult(true, '', result);
}

// Box blur implementation
function boxBlurJS(pixels, width, height, params) {
    if (!params || params.length === 0) {
        return new ProcessResult(false, 'Box blur requires radius parameter', new Uint8Array(0));
    }
    
    const radius = Math.floor(params[0]);
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
    
    return new ProcessResult(true, '', result);
}

// Utility function to clamp pixel values
function clampPixel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

// Default export function for module compatibility
async function init() {
    console.log('🔄 Using JavaScript fallback for WASM operations');
    return Promise.resolve();
}

// Export for ES6 modules
export default init;
export { process_safe, ProcessResult };