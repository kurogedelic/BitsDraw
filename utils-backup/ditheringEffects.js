/**
 * Dithering Effects Utility
 * Implements various dithering algorithms for 1-bit bitmap graphics
 */

class DitheringEffects {
    constructor() {
        // Bayer matrices for ordered dithering
        this.bayerMatrices = {
            Bayer2x2: [
                [0, 2],
                [3, 1]
            ].map(r => r.map(v => (v + 0.5) / 4)),

            Bayer4x4: [
                [0, 8, 2, 10],
                [12, 4, 14, 6],
                [3, 11, 1, 9],
                [15, 7, 13, 5]
            ].map(r => r.map(v => (v + 0.5) / 16)),

            Bayer8x8: (() => {
                const base = [
                    0, 32, 8, 40, 2, 34, 10, 42,
                    48, 16, 56, 24, 50, 18, 58, 26,
                    12, 44, 4, 36, 14, 46, 6, 38,
                    60, 28, 52, 20, 62, 30, 54, 22,
                    3, 35, 11, 43, 1, 33, 9, 41,
                    51, 19, 59, 27, 49, 17, 57, 25,
                    15, 47, 7, 39, 13, 45, 5, 37,
                    63, 31, 55, 23, 61, 29, 53, 21
                ];
                return Array.from({ length: 8 }, (_, y) =>
                    Array.from({ length: 8 }, (_, x) =>
                        (base[y * 8 + x] + 0.5) / 64
                    )
                );
            })()
        };

        // Error diffusion kernels
        this.diffusionKernels = {
            FloydSteinberg: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]],
            Burkes: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]],
            Atkinson: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]]
        };
    }

    /**
     * Apply dithering to a layer
     * @param {Object} layer - Layer object with pixels, width, height
     * @param {number} alpha - Alpha value (0.0-1.0)
     * @param {string} type - Dithering type
     * @returns {Uint8Array} - Dithered pixel data
     */
    ditherLayer(layer, alpha = 1, type = 'Bayer4x4') {
        const { pixels, width, height } = layer;
        const out = new Uint8Array(pixels.length);

        if (type.startsWith('Bayer')) {
            return this.applyOrderedDithering(pixels, width, height, alpha, type, out);
        } else {
            return this.applyErrorDiffusion(pixels, width, height, alpha, type, out);
        }
    }

    /**
     * Apply ordered (Bayer) dithering
     */
    applyOrderedDithering(pixels, width, height, alpha, type, out) {
        const matrix = this.bayerMatrices[type];
        const n = matrix.length;

        for (let y = 0, idx = 0; y < height; y++) {
            for (let x = 0; x < width; x++, idx++) {
                const value = pixels[idx] * alpha; // 0-1
                const threshold = matrix[y % n][x % n]; // 0-1
                out[idx] = value >= threshold ? 1 : 0;
            }
        }

        return out;
    }

    /**
     * Apply error diffusion dithering
     */
    applyErrorDiffusion(pixels, width, height, alpha, type, out) {
        const buffer = Float32Array.from(pixels, v => v * alpha); // 0-1 float
        const kernel = this.diffusionKernels[type];
        
        // Normalize weights
        const divisor = kernel.reduce((sum, [, , weight]) => sum + weight, 0);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const oldValue = buffer[idx];
                const newValue = oldValue >= 0.5 ? 1 : 0;
                const error = oldValue - newValue;
                
                buffer[idx] = newValue;

                // Diffuse error to neighboring pixels
                for (const [dx, dy, weight] of kernel) {
                    const xx = x + dx;
                    const yy = y + dy;
                    
                    if (xx >= 0 && xx < width && yy >= 0 && yy < height) {
                        buffer[yy * width + xx] += error * weight / divisor;
                    }
                }
            }
        }

        // Final threshold
        for (let i = 0; i < out.length; i++) {
            out[i] = buffer[i] >= 0.5 ? 1 : 0;
        }

        return out;
    }

    /**
     * Get list of available dithering methods
     */
    getAvailableMethods() {
        return [
            { value: 'Bayer2x2', name: 'Bayer 2×2' },
            { value: 'Bayer4x4', name: 'Bayer 4×4' },
            { value: 'Bayer8x8', name: 'Bayer 8×8' },
            { value: 'FloydSteinberg', name: 'Floyd-Steinberg' },
            { value: 'Burkes', name: 'Burkes' },
            { value: 'Atkinson', name: 'Atkinson' }
        ];
    }

    /**
     * Render bitmap data to a canvas for preview
     */
    renderToCanvas(canvas, pixelData, width, height, zoom = 1) {
        canvas.width = width * zoom;
        canvas.height = height * zoom;
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw pixels
        ctx.fillStyle = '#000000';
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (pixelData[idx]) {
                    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                }
            }
        }
    }

    /**
     * Calculate optimal zoom level for preview
     */
    calculatePreviewZoom(width, height, maxWidth = 300, maxHeight = 300) {
        const scaleX = maxWidth / width;
        const scaleY = maxHeight / height;
        const scale = Math.min(scaleX, scaleY, 8); // Max 8x zoom
        return Math.max(1, Math.floor(scale));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DitheringEffects;
} else {
    window.DitheringEffects = DitheringEffects;
}