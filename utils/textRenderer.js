class TextRenderer {
    // Font configurations
    static currentFont = 'bitmap-5x7';
    static currentSize = 1;
    
    // Font definitions
    static fonts = {
        'bitmap-5x7': {
            name: 'Bitmap 5×7',
            width: 5,
            height: 7,
            spacing: 1,
            data: {
        'A': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,1,1,1,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'B': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [0,0,0,0,0]
        ],
        'C': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'D': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [0,0,0,0,0]
        ],
        'E': [
            [1,1,1,1,1],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,1,1,1,1],
            [0,0,0,0,0]
        ],
        'F': [
            [1,1,1,1,1],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [0,0,0,0,0]
        ],
        'G': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,0],
            [1,0,1,1,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'H': [
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,1,1,1,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'I': [
            [0,1,1,1,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'J': [
            [0,0,0,0,1],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'K': [
            [1,0,0,0,1],
            [1,0,0,1,0],
            [1,0,1,0,0],
            [1,1,0,0,0],
            [1,0,1,0,0],
            [1,0,0,1,0],
            [0,0,0,0,0]
        ],
        'L': [
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,1,1,1,1],
            [0,0,0,0,0]
        ],
        'M': [
            [1,0,0,0,1],
            [1,1,0,1,1],
            [1,0,1,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'N': [
            [1,0,0,0,1],
            [1,1,0,0,1],
            [1,0,1,0,1],
            [1,0,0,1,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'O': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'P': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [1,0,0,0,0],
            [0,0,0,0,0]
        ],
        'Q': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,1,0,1],
            [1,0,0,1,0],
            [0,1,1,0,1],
            [0,0,0,0,0]
        ],
        'R': [
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,1,1,1,0],
            [1,0,1,0,0],
            [1,0,0,1,0],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'S': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [0,1,0,0,0],
            [0,0,1,0,0],
            [1,0,0,1,0],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'T': [
            [1,1,1,1,1],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        'U': [
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        'V': [
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        'W': [
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [1,0,1,0,1],
            [1,1,0,1,1],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'X': [
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,1,0,0],
            [0,1,0,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,0,0,0,0]
        ],
        'Y': [
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        'Z': [
            [1,1,1,1,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,1,0,0,0],
            [1,0,0,0,0],
            [1,1,1,1,1],
            [0,0,0,0,0]
        ],
        ' ': [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        '0': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,1,1],
            [1,0,1,0,1],
            [1,1,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        '1': [
            [0,0,1,0,0],
            [0,1,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        '2': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,1,0,0,0],
            [1,1,1,1,1],
            [0,0,0,0,0]
        ],
        '3': [
            [1,1,1,1,0],
            [0,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [1,1,1,1,0],
            [0,0,0,0,0]
        ],
        '4': [
            [1,0,0,1,0],
            [1,0,0,1,0],
            [1,1,1,1,1],
            [0,0,0,1,0],
            [0,0,0,1,0],
            [0,0,0,1,0],
            [0,0,0,0,0]
        ],
        '5': [
            [1,1,1,1,1],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [1,1,1,1,0],
            [0,0,0,0,0]
        ],
        '6': [
            [0,1,1,1,0],
            [1,0,0,0,0],
            [1,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        '7': [
            [1,1,1,1,1],
            [0,0,0,0,1],
            [0,0,0,1,0],
            [0,0,1,0,0],
            [0,1,0,0,0],
            [0,1,0,0,0],
            [0,0,0,0,0]
        ],
        '8': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        '9': [
            [0,1,1,1,0],
            [1,0,0,0,1],
            [1,0,0,0,1],
            [0,1,1,1,1],
            [0,0,0,0,1],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ]
            }
        },
        'bitmap-3x5': {
            name: 'Bitmap 3×5',
            width: 3,
            height: 5,
            spacing: 1,
            data: {
                'A': [
                    [1,1,1],
                    [1,0,1],
                    [1,1,1],
                    [1,0,1],
                    [1,0,1]
                ],
                'B': [
                    [1,1,0],
                    [1,0,1],
                    [1,1,0],
                    [1,0,1],
                    [1,1,0]
                ],
                'C': [
                    [1,1,1],
                    [1,0,0],
                    [1,0,0],
                    [1,0,0],
                    [1,1,1]
                ],
                'D': [
                    [1,1,0],
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,0]
                ],
                'E': [
                    [1,1,1],
                    [1,0,0],
                    [1,1,0],
                    [1,0,0],
                    [1,1,1]
                ],
                'F': [
                    [1,1,1],
                    [1,0,0],
                    [1,1,0],
                    [1,0,0],
                    [1,0,0]
                ],
                'G': [
                    [1,1,1],
                    [1,0,0],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1]
                ],
                'H': [
                    [1,0,1],
                    [1,0,1],
                    [1,1,1],
                    [1,0,1],
                    [1,0,1]
                ],
                'I': [
                    [1,1,1],
                    [0,1,0],
                    [0,1,0],
                    [0,1,0],
                    [1,1,1]
                ],
                'J': [
                    [0,0,1],
                    [0,0,1],
                    [0,0,1],
                    [1,0,1],
                    [1,1,1]
                ],
                'K': [
                    [1,0,1],
                    [1,1,0],
                    [1,0,0],
                    [1,1,0],
                    [1,0,1]
                ],
                'L': [
                    [1,0,0],
                    [1,0,0],
                    [1,0,0],
                    [1,0,0],
                    [1,1,1]
                ],
                'M': [
                    [1,0,1],
                    [1,1,1],
                    [1,0,1],
                    [1,0,1],
                    [1,0,1]
                ],
                'N': [
                    [1,0,1],
                    [1,1,1],
                    [1,0,1],
                    [1,0,1],
                    [1,0,1]
                ],
                'O': [
                    [1,1,1],
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1]
                ],
                'P': [
                    [1,1,1],
                    [1,0,1],
                    [1,1,0],
                    [1,0,0],
                    [1,0,0]
                ],
                'Q': [
                    [1,1,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1],
                    [0,0,1]
                ],
                'R': [
                    [1,1,0],
                    [1,0,1],
                    [1,1,0],
                    [1,1,0],
                    [1,0,1]
                ],
                'S': [
                    [1,1,1],
                    [1,0,0],
                    [1,1,1],
                    [0,0,1],
                    [1,1,1]
                ],
                'T': [
                    [1,1,1],
                    [0,1,0],
                    [0,1,0],
                    [0,1,0],
                    [0,1,0]
                ],
                'U': [
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1]
                ],
                'V': [
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1],
                    [0,1,0]
                ],
                'W': [
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1],
                    [1,0,1]
                ],
                'X': [
                    [1,0,1],
                    [1,0,1],
                    [0,1,0],
                    [1,0,1],
                    [1,0,1]
                ],
                'Y': [
                    [1,0,1],
                    [1,0,1],
                    [0,1,0],
                    [0,1,0],
                    [0,1,0]
                ],
                'Z': [
                    [1,1,1],
                    [0,0,1],
                    [0,1,0],
                    [1,0,0],
                    [1,1,1]
                ],
                ' ': [
                    [0,0,0],
                    [0,0,0],
                    [0,0,0],
                    [0,0,0],
                    [0,0,0]
                ],
                '0': [
                    [1,1,1],
                    [1,0,1],
                    [1,0,1],
                    [1,0,1],
                    [1,1,1]
                ],
                '1': [
                    [0,1,0],
                    [1,1,0],
                    [0,1,0],
                    [0,1,0],
                    [1,1,1]
                ],
                '2': [
                    [1,1,1],
                    [0,0,1],
                    [1,1,1],
                    [1,0,0],
                    [1,1,1]
                ],
                '3': [
                    [1,1,1],
                    [0,0,1],
                    [1,1,1],
                    [0,0,1],
                    [1,1,1]
                ],
                '4': [
                    [1,0,1],
                    [1,0,1],
                    [1,1,1],
                    [0,0,1],
                    [0,0,1]
                ],
                '5': [
                    [1,1,1],
                    [1,0,0],
                    [1,1,1],
                    [0,0,1],
                    [1,1,1]
                ],
                '6': [
                    [1,1,1],
                    [1,0,0],
                    [1,1,1],
                    [1,0,1],
                    [1,1,1]
                ],
                '7': [
                    [1,1,1],
                    [0,0,1],
                    [0,1,0],
                    [1,0,0],
                    [1,0,0]
                ],
                '8': [
                    [1,1,1],
                    [1,0,1],
                    [1,1,1],
                    [1,0,1],
                    [1,1,1]
                ],
                '9': [
                    [1,1,1],
                    [1,0,1],
                    [1,1,1],
                    [0,0,1],
                    [1,1,1]
                ]
            }
        },
        'bitmap-7x9': {
            name: 'Bitmap 7×9',
            width: 7,
            height: 9,
            spacing: 1,
            data: {
                'A': [
                    [0,0,1,1,1,0,0],
                    [0,1,0,0,0,1,0],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,1],
                    [1,1,1,1,1,1,1],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,1],
                    [0,0,0,0,0,0,0]
                ],
                'B': [
                    [1,1,1,1,1,1,0],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,1],
                    [1,1,1,1,1,1,0],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,1],
                    [1,1,1,1,1,1,0],
                    [0,0,0,0,0,0,0]
                ],
                'C': [
                    [0,1,1,1,1,1,0],
                    [1,0,0,0,0,0,1],
                    [1,0,0,0,0,0,0],
                    [1,0,0,0,0,0,0],
                    [1,0,0,0,0,0,0],
                    [1,0,0,0,0,0,0],
                    [1,0,0,0,0,0,1],
                    [0,1,1,1,1,1,0],
                    [0,0,0,0,0,0,0]
                ],
                ' ': [
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0]
                ]
            }
        }
    };

    static renderText(text, x, y, bitmapEditor, pattern = null, fontType = null, size = null) {
        const font = this.fonts[fontType || this.currentFont];
        const scale = size || this.currentSize;
        
        if (!font) return;
        
        let currentX = x;
        const upperText = text.toUpperCase();
        
        for (let i = 0; i < upperText.length; i++) {
            const char = upperText[i];
            const charBitmap = font.data[char];
            
            if (charBitmap) {
                this.renderChar(charBitmap, currentX, y, bitmapEditor, pattern, scale);
                currentX += (font.width + font.spacing) * scale;
            } else {
                // Unknown character, render as space
                currentX += (font.width + font.spacing) * scale;
            }
        }
    }

    static renderChar(charBitmap, x, y, bitmapEditor, pattern = null, scale = 1) {
        for (let row = 0; row < charBitmap.length; row++) {
            for (let col = 0; col < charBitmap[row].length; col++) {
                if (charBitmap[row][col] === 1) {
                    // Render scaled pixel block
                    for (let sy = 0; sy < scale; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const pixelX = x + (col * scale) + sx;
                            const pixelY = y + (row * scale) + sy;
                            
                            if (pixelX >= 0 && pixelX < bitmapEditor.width && 
                                pixelY >= 0 && pixelY < bitmapEditor.height) {
                                // Use the new layer-based system with alpha=1 for opaque text
                                bitmapEditor.setPixelWithAlpha(pixelX, pixelY, 0, 1, pattern);
                            }
                        }
                    }
                }
            }
        }
    }

    static getTextWidth(text, fontType = null, size = null) {
        const font = this.fonts[fontType || this.currentFont];
        const scale = size || this.currentSize;
        
        if (!font) return 0;
        
        return text.length * (font.width + font.spacing) * scale - (font.spacing * scale);
    }

    static getTextHeight(fontType = null, size = null) {
        const font = this.fonts[fontType || this.currentFont];
        const scale = size || this.currentSize;
        
        if (!font) return 0;
        
        return font.height * scale;
    }

    static setCurrentFont(fontType) {
        if (this.fonts[fontType]) {
            this.currentFont = fontType;
        }
    }

    static setCurrentSize(size) {
        this.currentSize = Math.max(1, Math.min(4, size));
    }

    static getCurrentFont() {
        return this.currentFont;
    }

    static getCurrentSize() {
        return this.currentSize;
    }

    static getFontList() {
        return Object.keys(this.fonts).map(key => ({
            key: key,
            name: this.fonts[key].name,
            width: this.fonts[key].width,
            height: this.fonts[key].height
        }));
    }

    static renderTextPreview(text, canvas, fontType = null, size = null) {
        const ctx = canvas.getContext('2d');
        const font = this.fonts[fontType || this.currentFont];
        const scale = size || this.currentSize;
        
        if (!font) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set up canvas for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;
        
        // Create temporary bitmap editor for preview
        const previewWidth = Math.min(canvas.width, this.getTextWidth(text, fontType, size) + 4);
        const previewHeight = Math.min(canvas.height, this.getTextHeight(fontType, size) + 4);
        
        // Create bitmap data
        const pixels = new Array(previewHeight).fill(null).map(() => new Array(previewWidth).fill(0));
        
        // Render text to bitmap
        const upperText = text.toUpperCase();
        let currentX = 2; // 2px padding
        const startY = 2; // 2px padding
        
        for (let i = 0; i < upperText.length; i++) {
            const char = upperText[i];
            const charBitmap = font.data[char];
            
            if (charBitmap) {
                // Render character to bitmap
                for (let row = 0; row < charBitmap.length; row++) {
                    for (let col = 0; col < charBitmap[row].length; col++) {
                        if (charBitmap[row][col] === 1) {
                            for (let sy = 0; sy < scale; sy++) {
                                for (let sx = 0; sx < scale; sx++) {
                                    const pixelX = currentX + (col * scale) + sx;
                                    const pixelY = startY + (row * scale) + sy;
                                    
                                    if (pixelX < previewWidth && pixelY < previewHeight) {
                                        pixels[pixelY][pixelX] = 1;
                                    }
                                }
                            }
                        }
                    }
                }
                currentX += (font.width + font.spacing) * scale;
            } else {
                currentX += (font.width + font.spacing) * scale;
            }
        }
        
        // Render bitmap to canvas
        const imageData = ctx.createImageData(previewWidth, previewHeight);
        for (let y = 0; y < previewHeight; y++) {
            for (let x = 0; x < previewWidth; x++) {
                const index = (y * previewWidth + x) * 4;
                const pixel = pixels[y][x];
                
                if (pixel === 1) {
                    // Black pixel
                    imageData.data[index] = 0;     // R
                    imageData.data[index + 1] = 0; // G
                    imageData.data[index + 2] = 0; // B
                    imageData.data[index + 3] = 255; // A
                } else {
                    // Transparent pixel
                    imageData.data[index] = 0;     // R
                    imageData.data[index + 1] = 0; // G
                    imageData.data[index + 2] = 0; // B
                    imageData.data[index + 3] = 0; // A (transparent)
                }
            }
        }
        
        // Put image data on canvas
        ctx.putImageData(imageData, 0, 0);
    }
}