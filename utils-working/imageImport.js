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

    static async processImageAtSize(imageData, targetWidth, targetHeight, threshold = 128, alphaHandling = 'blend') {
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
                    
                    let pixelValue;
                    
                    if (alphaHandling === 'transparent-white') {
                        // Transparent pixels become white (0)
                        if (alpha < 128) {
                            pixelValue = 0; // white
                        } else {
                            const gray = r * 0.299 + g * 0.587 + b * 0.114;
                            pixelValue = gray < threshold ? 1 : 0;
                        }
                    } else if (alphaHandling === 'transparent-black') {
                        // Transparent pixels become black (1)
                        if (alpha < 128) {
                            pixelValue = 1; // black
                        } else {
                            const gray = r * 0.299 + g * 0.587 + b * 0.114;
                            pixelValue = gray < threshold ? 1 : 0;
                        }
                    } else {
                        // Default: blend with white background
                        const gray = (r * 0.299 + g * 0.587 + b * 0.114) * (alpha / 255) + 255 * (1 - alpha / 255);
                        pixelValue = gray < threshold ? 1 : 0;
                    }
                    
                    pixels[y][x] = pixelValue;
                }
            }
            
            resolve({
                width: targetWidth,
                height: targetHeight,
                pixels: pixels
            });
        });
    }

    static async processImage(file, targetWidth, targetHeight, threshold = 128, alphaHandling = 'blend') {
        const imageData = await this.loadImage(file);
        return this.processImageAtSize(imageData, targetWidth, targetHeight, threshold, alphaHandling);
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