class ImageImporter {
    static async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    image: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
                URL.revokeObjectURL(img.src);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            // Create object URL for the file
            const objectURL = URL.createObjectURL(file);
            img.src = objectURL;
        });
    }

    static async processImageAtSize(imageData, targetWidth, targetHeight, options = {}) {
        const {
            threshold = 128,
            alphaHandling = 'blend',
            ditherMethod = 'threshold',
            invert = false,
            alphaMode = 'ignore' // 'ignore', 'white-to-alpha', 'black-to-alpha', 'no-alpha'
        } = options;

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // Draw image scaled to target size
            ctx.drawImage(imageData.image, 0, 0, targetWidth, targetHeight);
            
            // Get image data
            const canvasImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const data = canvasImageData.data;
            
            // Convert to grayscale array for processing
            const grayscaleData = new Float32Array(targetWidth * targetHeight);
            const alphaData = new Uint8Array(targetWidth * targetHeight);
            
            for (let y = 0; y < targetHeight; y++) {
                for (let x = 0; x < targetWidth; x++) {
                    const index = (y * targetWidth + x) * 4;
                    const pixelIndex = y * targetWidth + x;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    const alpha = data[index + 3];
                    
                    // Store original alpha
                    alphaData[pixelIndex] = alpha;
                    
                    let gray;
                    if (alphaHandling === 'transparent-white') {
                        // Transparent pixels become white
                        if (alpha < 128) {
                            gray = 255; // white
                        } else {
                            gray = r * 0.299 + g * 0.587 + b * 0.114;
                        }
                    } else if (alphaHandling === 'transparent-black') {
                        // Transparent pixels become black
                        if (alpha < 128) {
                            gray = 0; // black
                        } else {
                            gray = r * 0.299 + g * 0.587 + b * 0.114;
                        }
                    } else {
                        // Default: blend with white background
                        gray = (r * 0.299 + g * 0.587 + b * 0.114) * (alpha / 255) + 255 * (1 - alpha / 255);
                    }
                    
                    // Apply inversion if requested
                    if (invert) {
                        gray = 255 - gray;
                    }
                    
                    // Store normalized grayscale (0-1)
                    grayscaleData[pixelIndex] = gray / 255;
                }
            }
            
            // Apply dithering or threshold
            let bitmapData;
            if (ditherMethod === 'threshold') {
                bitmapData = this.applyThreshold(grayscaleData, targetWidth, targetHeight, threshold / 255);
            } else {
                bitmapData = this.applyDithering(grayscaleData, targetWidth, targetHeight, ditherMethod);
            }
            
            // Convert to final pixel and alpha arrays
            const pixels = [];
            const resultAlpha = [];
            
            for (let y = 0; y < targetHeight; y++) {
                pixels[y] = [];
                resultAlpha[y] = [];
                
                for (let x = 0; x < targetWidth; x++) {
                    const pixelIndex = y * targetWidth + x;
                    const pixelValue = bitmapData[pixelIndex];
                    const originalAlpha = alphaData[pixelIndex];
                    
                    pixels[y][x] = pixelValue;
                    
                    // Handle alpha channel based on alphaMode
                    let finalAlpha = 1; // Default: opaque
                    
                    switch (alphaMode) {
                        case 'white-to-alpha':
                            // White pixels become transparent
                            finalAlpha = pixelValue === 0 ? 0 : 1;
                            break;
                        case 'black-to-alpha':
                            // Black pixels become transparent
                            finalAlpha = pixelValue === 1 ? 0 : 1;
                            break;
                        case 'no-alpha':
                            // Force all pixels to be opaque
                            finalAlpha = 1;
                            break;
                        case 'preserve':
                            // Preserve original alpha
                            finalAlpha = originalAlpha > 128 ? 1 : 0;
                            break;
                        default: // 'ignore'
                            finalAlpha = 1;
                            break;
                    }
                    
                    resultAlpha[y][x] = finalAlpha;
                }
            }
            
            resolve({
                width: targetWidth,
                height: targetHeight,
                pixels: pixels,
                alpha: resultAlpha
            });
        });
    }

    // Simple threshold conversion
    static applyThreshold(grayscaleData, width, height, threshold) {
        const result = new Uint8Array(grayscaleData.length);
        for (let i = 0; i < grayscaleData.length; i++) {
            result[i] = grayscaleData[i] < threshold ? 1 : 0;
        }
        return result;
    }

    // Apply dithering algorithms
    static applyDithering(grayscaleData, width, height, method) {
        // Create a copy of the data for dithering
        const data = new Float32Array(grayscaleData);
        const result = new Uint8Array(data.length);
        
        switch (method) {
            case 'floyd-steinberg':
                return this.floydSteinbergDither(data, width, height);
            case 'atkinson':
                return this.atkinsonDither(data, width, height);
            case 'burkes':
                return this.burkesDither(data, width, height);
            case 'bayer-2x2':
                return this.bayerDither(data, width, height, 2);
            case 'bayer-4x4':
                return this.bayerDither(data, width, height, 4);
            case 'bayer-8x8':
                return this.bayerDither(data, width, height, 8);
            default:
                return this.applyThreshold(data, width, height, 0.5);
        }
    }

    // Floyd-Steinberg dithering
    static floydSteinbergDither(data, width, height) {
        const result = new Uint8Array(data.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const oldPixel = data[index];
                const newPixel = oldPixel < 0.5 ? 0 : 1;
                const error = oldPixel - newPixel;
                
                result[index] = newPixel;
                
                // Distribute error
                if (x + 1 < width) {
                    data[index + 1] += error * 7/16;
                }
                if (y + 1 < height) {
                    if (x > 0) {
                        data[(y + 1) * width + (x - 1)] += error * 3/16;
                    }
                    data[(y + 1) * width + x] += error * 5/16;
                    if (x + 1 < width) {
                        data[(y + 1) * width + (x + 1)] += error * 1/16;
                    }
                }
            }
        }
        
        return result;
    }

    // Atkinson dithering
    static atkinsonDither(data, width, height) {
        const result = new Uint8Array(data.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const oldPixel = data[index];
                const newPixel = oldPixel < 0.5 ? 0 : 1;
                const error = oldPixel - newPixel;
                
                result[index] = newPixel;
                
                // Distribute error (Atkinson pattern)
                const errorFraction = error / 8;
                
                if (x + 1 < width) data[index + 1] += errorFraction;
                if (x + 2 < width) data[index + 2] += errorFraction;
                if (y + 1 < height) {
                    if (x > 0) data[(y + 1) * width + (x - 1)] += errorFraction;
                    data[(y + 1) * width + x] += errorFraction;
                    if (x + 1 < width) data[(y + 1) * width + (x + 1)] += errorFraction;
                }
                if (y + 2 < height) {
                    data[(y + 2) * width + x] += errorFraction;
                }
            }
        }
        
        return result;
    }

    // Burkes dithering
    static burkesDither(data, width, height) {
        const result = new Uint8Array(data.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const oldPixel = data[index];
                const newPixel = oldPixel < 0.5 ? 0 : 1;
                const error = oldPixel - newPixel;
                
                result[index] = newPixel;
                
                // Distribute error (Burkes pattern)
                if (x + 1 < width) data[index + 1] += error * 8/32;
                if (x + 2 < width) data[index + 2] += error * 4/32;
                if (y + 1 < height) {
                    if (x > 1) data[(y + 1) * width + (x - 2)] += error * 2/32;
                    if (x > 0) data[(y + 1) * width + (x - 1)] += error * 4/32;
                    data[(y + 1) * width + x] += error * 8/32;
                    if (x + 1 < width) data[(y + 1) * width + (x + 1)] += error * 4/32;
                    if (x + 2 < width) data[(y + 1) * width + (x + 2)] += error * 2/32;
                }
            }
        }
        
        return result;
    }

    // Bayer matrix dithering
    static bayerDither(data, width, height, matrixSize) {
        const result = new Uint8Array(data.length);
        
        // Bayer matrices
        const matrices = {
            2: [
                [0, 2],
                [3, 1]
            ],
            4: [
                [0, 8, 2, 10],
                [12, 4, 14, 6],
                [3, 11, 1, 9],
                [15, 7, 13, 5]
            ],
            8: [
                [0, 32, 8, 40, 2, 34, 10, 42],
                [48, 16, 56, 24, 50, 18, 58, 26],
                [12, 44, 4, 36, 14, 46, 6, 38],
                [60, 28, 52, 20, 62, 30, 54, 22],
                [3, 35, 11, 43, 1, 33, 9, 41],
                [51, 19, 59, 27, 49, 17, 57, 25],
                [15, 47, 7, 39, 13, 45, 5, 37],
                [63, 31, 55, 23, 61, 29, 53, 21]
            ]
        };
        
        const matrix = matrices[matrixSize];
        const threshold = Math.pow(matrixSize, 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const pixel = data[index];
                const bayerValue = matrix[y % matrixSize][x % matrixSize] / threshold;
                
                result[index] = pixel > bayerValue ? 1 : 0;
            }
        }
        
        return result;
    }

    static async processImage(file, targetWidth, targetHeight, options = {}) {
        // Support legacy parameter format
        if (typeof options === 'number') {
            options = {
                threshold: options,
                alphaHandling: arguments[4] || 'blend'
            };
        }
        
        const imageData = await this.loadImage(file);
        return this.processImageAtSize(imageData, targetWidth, targetHeight, options);
    }

    static isValidImageFile(file) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        return file && validTypes.includes(file.type);
    }

    static getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
                URL.revokeObjectURL(img.src);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}