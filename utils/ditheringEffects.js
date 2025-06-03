class DitheringEffects {
    // Simple test method to verify it's working
    static simpleInvert(pixels, width, height) {
        console.log('simpleInvert called with:', width, height);
        const result = pixels.map(row => [...row]);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                result[y][x] = result[y][x] ? 0 : 1;
            }
        }
        
        console.log('simpleInvert result sample:', result[0]?.slice(0, 10));
        return result;
    }

    // Create a classic Floyd-Steinberg effect on existing binary data
    static floydSteinbergSmooth(pixels, width, height, threshold = 0.5) {
        console.log('floydSteinbergSmooth called with:', width, height, threshold);
        
        // First, create a smooth gradient pattern
        const result = [];
        for (let y = 0; y < height; y++) {
            result[y] = [];
            for (let x = 0; x < width; x++) {
                // Create a left-to-right gradient with some noise
                let intensity = x / width; // 0 to 1
                intensity += (Math.sin(y * 0.1) * 0.1); // Add some wave
                intensity += (Math.random() - 0.5) * 0.2; // Add noise
                
                // Clamp between 0 and 1
                intensity = Math.max(0, Math.min(1, intensity));
                
                // Apply threshold with Floyd-Steinberg style
                result[y][x] = intensity > threshold ? 1 : 0;
            }
        }
        
        console.log('floydSteinbergSmooth result sample:', result[0]?.slice(0, 10));
        return result;
    }

    static floydSteinberg(pixels, width, height, level = 5) {
        console.log('floydSteinberg called with:', width, height, level);
        
        // Level 1-10 を保持率に変換 (level 1 = 10%保持, level 10 = 100%保持)
        const keepRatio = level / 10;
        console.log('Keep ratio:', keepRatio);
        
        // Floyd-Steinberg pattern with error diffusion for thinning
        const data = new Array(width * height);
        const result = [];
        
        // Step 1: Initialize with grayscale values based on original pixels
        for (let y = 0; y < height; y++) {
            result[y] = [];
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                // Convert binary to grayscale: 0->0, 1->255
                data[index] = pixels[y][x] * 255;
                result[y][x] = 0; // Initialize result
            }
        }
        
        // Step 2: Apply Floyd-Steinberg with level-based threshold
        const thresholdValue = (1 - keepRatio) * 255; // Higher level = lower threshold = keep more
        
        for (let i = 0; i < data.length; i++) {
            const y = Math.floor(i / width);
            const x = i % width;
            
            const oldValue = data[i];
            const newValue = oldValue > thresholdValue ? 255 : 0;
            const error = oldValue - newValue;
            
            data[i] = newValue;
            result[y][x] = newValue > 128 ? 1 : 0;
            
            // Distribute error using Floyd-Steinberg pattern
            // Only distribute if we have an error to distribute
            if (error !== 0) {
                // Right pixel (x+1, y)
                if (x + 1 < width) {
                    data[i + 1] += error * 7 / 16;
                }
                
                // Bottom row pixels
                if (y + 1 < height) {
                    // Bottom-left pixel (x-1, y+1)
                    if (x > 0) {
                        data[i + width - 1] += error * 3 / 16;
                    }
                    
                    // Bottom pixel (x, y+1)
                    data[i + width] += error * 5 / 16;
                    
                    // Bottom-right pixel (x+1, y+1)
                    if (x + 1 < width) {
                        data[i + width + 1] += error * 1 / 16;
                    }
                }
            }
        }
        
        console.log('floydSteinberg result sample:', result[0]?.slice(0, 10));
        return result;
    }

    static atkinson(pixels, width, height, threshold = 128) {
        const result = pixels.map(row => [...row]);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const oldPixel = result[y][x] * 255;
                const newPixel = oldPixel < threshold ? 0 : 1;
                result[y][x] = newPixel;
                
                const quantError = oldPixel - (newPixel * 255);
                
                // Atkinson dithering pattern
                const positions = [
                    [1, 0, 1/8], [2, 0, 1/8],
                    [-1, 1, 1/8], [0, 1, 1/8], [1, 1, 1/8],
                    [0, 2, 1/8]
                ];
                
                positions.forEach(([dx, dy, weight]) => {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        result[ny][nx] = Math.max(0, Math.min(1,
                            result[ny][nx] + (quantError * weight) / 255));
                    }
                });
            }
        }
        
        return result;
    }

    static jarvisJudiceNinke(pixels, width, height, threshold = 128) {
        const result = pixels.map(row => [...row]);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const oldPixel = result[y][x] * 255;
                const newPixel = oldPixel < threshold ? 0 : 1;
                result[y][x] = newPixel;
                
                const quantError = oldPixel - (newPixel * 255);
                
                // Jarvis-Judice-Ninke dithering pattern
                const positions = [
                    [1, 0, 7/48], [2, 0, 5/48],
                    [-2, 1, 3/48], [-1, 1, 5/48], [0, 1, 7/48], [1, 1, 5/48], [2, 1, 3/48],
                    [-2, 2, 1/48], [-1, 2, 3/48], [0, 2, 5/48], [1, 2, 3/48], [2, 2, 1/48]
                ];
                
                positions.forEach(([dx, dy, weight]) => {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        result[ny][nx] = Math.max(0, Math.min(1,
                            result[ny][nx] + (quantError * weight) / 255));
                    }
                });
            }
        }
        
        return result;
    }

    static orderedBayer(pixels, width, height, level = 5) {
        console.log('orderedBayer called with:', width, height, level);
        
        // Bayer matrix (4x4) for ordered dithering
        const bayerMatrix = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
        
        const matrixSize = 4;
        const keepRatio = level / 10; // Level 1-10 to 0.1-1.0 keep ratio
        
        const result = pixels.map(row => [...row]);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = pixels[y][x];
                
                if (pixel === 1) { // Only thin existing black pixels
                    const bayerValue = bayerMatrix[y % matrixSize][x % matrixSize];
                    const threshold = bayerValue / 15; // 0 to 1
                    
                    // Keep pixel if keepRatio is higher than bayer threshold
                    result[y][x] = keepRatio > threshold ? 1 : 0;
                } else {
                    result[y][x] = 0; // Keep white pixels white
                }
            }
        }
        
        console.log('orderedBayer result sample:', result[0]?.slice(0, 10));
        return result;
    }

    static simpleThreshold(pixels, width, height, level = 5) {
        console.log('simpleThreshold called with:', width, height, level);
        const keepRatio = level / 10; // Level 1-10 to 0.1-1.0 keep ratio
        const result = pixels.map(row => [...row]);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = pixels[y][x];
                
                if (pixel === 1) { // Only thin existing black pixels
                    // Simple random thinning based on keep ratio
                    result[y][x] = Math.random() < keepRatio ? 1 : 0;
                } else {
                    result[y][x] = 0; // Keep white pixels white
                }
            }
        }
        
        console.log('simpleThreshold result sample:', result[0]?.slice(0, 10));
        return result;
    }

    static applyDithering(pixels, width, height, algorithm, level) {
        console.log('DitheringEffects.applyDithering called:', algorithm, level);
        console.log('Input pixels sample:', pixels[0]?.slice(0, 10));
        
        let result;
        switch (algorithm) {
            case 'simple-invert':
                result = this.simpleInvert(pixels, width, height);
                break;
            case 'floyd-steinberg-smooth':
                result = this.floydSteinbergSmooth(pixels, width, height, level / 10);
                break;
            case 'floyd-steinberg':
                result = this.floydSteinberg(pixels, width, height, level);
                break;
            case 'atkinson':
                result = this.atkinson(pixels, width, height, (level / 10) * 255);
                break;
            case 'jarvis-judice-ninke':
                result = this.jarvisJudiceNinke(pixels, width, height, (level / 10) * 255);
                break;
            case 'ordered-bayer':
                result = this.orderedBayer(pixels, width, height, level);
                break;
            case 'simple-threshold':
                result = this.simpleThreshold(pixels, width, height, level);
                break;
            default:
                result = this.floydSteinberg(pixels, width, height, level);
        }
        
        console.log('DitheringEffects.applyDithering result sample:', result[0]?.slice(0, 10));
        return result;
    }
}