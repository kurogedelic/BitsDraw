class ImageImporter {
    static async processImage(file, targetWidth, targetHeight, threshold = 128) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                // Draw image scaled to target size
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                const data = imageData.data;
                
                // Convert to bitmap
                const pixels = [];
                for (let y = 0; y < targetHeight; y++) {
                    pixels[y] = [];
                    for (let x = 0; x < targetWidth; x++) {
                        const index = (y * targetWidth + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        const alpha = data[index + 3];
                        
                        // Convert to grayscale
                        const gray = (r * 0.299 + g * 0.587 + b * 0.114) * (alpha / 255);
                        
                        // Apply threshold: below threshold = black (1), above = white (0)
                        pixels[y][x] = gray < threshold ? 1 : 0;
                    }
                }
                
                resolve({
                    width: targetWidth,
                    height: targetHeight,
                    pixels: pixels
                });
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            // Create object URL for the file
            const objectURL = URL.createObjectURL(file);
            img.src = objectURL;
        });
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