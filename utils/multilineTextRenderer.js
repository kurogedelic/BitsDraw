/**
 * Multi-line Text Renderer - Advanced text rendering with line breaks and alignment
 * Part of Advanced Text Tool System Phase 4
 */
class MultilineTextRenderer {
    /**
     * Text alignment options
     */
    static ALIGNMENT = {
        LEFT: 'left',
        CENTER: 'center',
        RIGHT: 'right',
        JUSTIFY: 'justify' // Future enhancement
    };

    /**
     * Line break handling modes
     */
    static LINE_BREAK_MODE = {
        MANUAL: 'manual',     // Only break on \n
        WORD_WRAP: 'wrap',    // Break words at boundaries
        CHARACTER_WRAP: 'char' // Break at any character
    };

    /**
     * Render multi-line text with alignment and spacing controls
     * @param {string} text - Text to render (can contain \n for line breaks)
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {OptimizedBitmapEditor} bitmapEditor - Bitmap editor instance
     * @param {Object} options - Rendering options
     * @param {string} options.pattern - Pattern to use for rendering
     * @param {string} options.fontType - Font type to use
     * @param {number} options.size - Font size scale
     * @param {string} options.alignment - Text alignment (left, center, right)
     * @param {number} options.lineSpacing - Additional spacing between lines (in pixels)
     * @param {number} options.maxWidth - Maximum width for word wrapping (0 = no limit)
     * @param {string} options.lineBreakMode - How to handle line breaks
     */
    static renderMultilineText(text, x, y, bitmapEditor, options = {}) {
        const settings = {
            pattern: options.pattern || null,
            fontType: options.fontType || TextRenderer.getCurrentFont(),
            size: options.size || TextRenderer.getCurrentSize(),
            alignment: options.alignment || this.ALIGNMENT.LEFT,
            lineSpacing: options.lineSpacing || 0,
            maxWidth: options.maxWidth || 0,
            lineBreakMode: options.lineBreakMode || this.LINE_BREAK_MODE.MANUAL
        };

        // Get font metrics
        const font = TextRenderer.fonts[settings.fontType];
        if (!font) {
            console.warn('Font not found:', settings.fontType);
            return { width: 0, height: 0, lines: [] };
        }

        const fontHeight = font.height * settings.size;
        const lineHeight = fontHeight + settings.lineSpacing;

        // Process text into lines
        const lines = this.processTextIntoLines(text, settings, font);
        
        // Calculate total dimensions
        const maxLineWidth = Math.max(...lines.map(line => 
            TextRenderer.getTextWidth(line, settings.fontType, settings.size)
        ));
        const totalHeight = lines.length > 0 ? (lines.length - 1) * lineHeight + fontHeight : 0;

        // Render each line
        let currentY = y;
        const renderedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().length === 0) {
                // Empty line - just advance Y position
                currentY += lineHeight;
                renderedLines.push({
                    text: line,
                    x: x,
                    y: currentY - lineHeight,
                    width: 0,
                    height: fontHeight
                });
                continue;
            }

            // Calculate line width and position
            const lineWidth = TextRenderer.getTextWidth(line, settings.fontType, settings.size);
            let lineX = x;

            // Apply alignment
            switch (settings.alignment) {
                case this.ALIGNMENT.CENTER:
                    lineX = x + Math.floor((maxLineWidth - lineWidth) / 2);
                    break;
                case this.ALIGNMENT.RIGHT:
                    lineX = x + (maxLineWidth - lineWidth);
                    break;
                case this.ALIGNMENT.LEFT:
                default:
                    lineX = x;
                    break;
            }

            // Render the line
            TextRenderer.renderText(
                line,
                lineX,
                currentY,
                bitmapEditor,
                settings.pattern,
                settings.fontType,
                settings.size
            );

            renderedLines.push({
                text: line,
                x: lineX,
                y: currentY,
                width: lineWidth,
                height: fontHeight
            });

            currentY += lineHeight;
        }

        return {
            width: maxLineWidth,
            height: totalHeight,
            lines: renderedLines,
            lineHeight: lineHeight,
            lineCount: lines.length
        };
    }

    /**
     * Process text into lines based on line break settings
     * @param {string} text - Input text
     * @param {Object} settings - Rendering settings
     * @param {Object} font - Font definition
     * @returns {Array<string>} Array of text lines
     */
    static processTextIntoLines(text, settings, font) {
        // Handle different line break modes
        switch (settings.lineBreakMode) {
            case this.LINE_BREAK_MODE.WORD_WRAP:
                return this.processWordWrap(text, settings, font);
            case this.LINE_BREAK_MODE.CHARACTER_WRAP:
                return this.processCharacterWrap(text, settings, font);
            case this.LINE_BREAK_MODE.MANUAL:
            default:
                return this.processManualLineBreaks(text);
        }
    }

    /**
     * Process text with manual line breaks only (\n)
     * @param {string} text - Input text
     * @returns {Array<string>} Array of text lines
     */
    static processManualLineBreaks(text) {
        return text.split('\n');
    }

    /**
     * Process text with word wrapping
     * @param {string} text - Input text
     * @param {Object} settings - Rendering settings
     * @param {Object} font - Font definition
     * @returns {Array<string>} Array of text lines
     */
    static processWordWrap(text, settings, font) {
        if (settings.maxWidth <= 0) {
            return this.processManualLineBreaks(text);
        }

        const lines = [];
        const paragraphs = text.split('\n');

        for (const paragraph of paragraphs) {
            if (paragraph.trim().length === 0) {
                lines.push('');
                continue;
            }

            const words = paragraph.split(' ');
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
                const testWidth = TextRenderer.getTextWidth(testLine, settings.fontType, settings.size);

                if (testWidth <= settings.maxWidth) {
                    currentLine = testLine;
                } else {
                    // Word doesn't fit
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        // Single word is too long - break it at character level
                        const brokenWord = this.breakLongWord(word, settings, font);
                        lines.push(...brokenWord.slice(0, -1));
                        currentLine = brokenWord[brokenWord.length - 1];
                    }
                }
            }

            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /**
     * Process text with character wrapping
     * @param {string} text - Input text
     * @param {Object} settings - Rendering settings
     * @param {Object} font - Font definition
     * @returns {Array<string>} Array of text lines
     */
    static processCharacterWrap(text, settings, font) {
        if (settings.maxWidth <= 0) {
            return this.processManualLineBreaks(text);
        }

        const lines = [];
        const paragraphs = text.split('\n');

        for (const paragraph of paragraphs) {
            if (paragraph.trim().length === 0) {
                lines.push('');
                continue;
            }

            let currentLine = '';
            for (const char of paragraph) {
                const testLine = currentLine + char;
                const testWidth = TextRenderer.getTextWidth(testLine, settings.fontType, settings.size);

                if (testWidth <= settings.maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                        currentLine = char;
                    } else {
                        // Even single character doesn't fit - add it anyway
                        lines.push(char);
                        currentLine = '';
                    }
                }
            }

            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /**
     * Break a long word into multiple lines
     * @param {string} word - Word to break
     * @param {Object} settings - Rendering settings
     * @param {Object} font - Font definition
     * @returns {Array<string>} Array of word fragments
     */
    static breakLongWord(word, settings, font) {
        const lines = [];
        let currentLine = '';

        for (const char of word) {
            const testLine = currentLine + char;
            const testWidth = TextRenderer.getTextWidth(testLine, settings.fontType, settings.size);

            if (testWidth <= settings.maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    // Even single character doesn't fit
                    lines.push(char);
                    currentLine = '';
                }
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    }

    /**
     * Calculate the dimensions of multi-line text
     * @param {string} text - Text to measure
     * @param {Object} options - Rendering options
     * @returns {Object} Dimensions object with width, height, lineCount
     */
    static getMultilineTextDimensions(text, options = {}) {
        const settings = {
            fontType: options.fontType || TextRenderer.getCurrentFont(),
            size: options.size || TextRenderer.getCurrentSize(),
            lineSpacing: options.lineSpacing || 0,
            maxWidth: options.maxWidth || 0,
            lineBreakMode: options.lineBreakMode || this.LINE_BREAK_MODE.MANUAL
        };

        const font = TextRenderer.fonts[settings.fontType];
        if (!font) {
            return { width: 0, height: 0, lineCount: 0 };
        }

        const lines = this.processTextIntoLines(text, settings, font);
        const fontHeight = font.height * settings.size;
        const lineHeight = fontHeight + settings.lineSpacing;

        const maxLineWidth = Math.max(...lines.map(line => 
            TextRenderer.getTextWidth(line, settings.fontType, settings.size)
        ));
        const totalHeight = lines.length > 0 ? (lines.length - 1) * lineHeight + fontHeight : 0;

        return {
            width: maxLineWidth,
            height: totalHeight,
            lineCount: lines.length,
            lineHeight: lineHeight
        };
    }

    /**
     * Create a preview of multi-line text on a canvas
     * @param {string} text - Text to preview
     * @param {HTMLCanvasElement} canvas - Canvas element for preview
     * @param {Object} options - Rendering options
     */
    static renderMultilinePreview(text, canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        const settings = {
            fontType: options.fontType || TextRenderer.getCurrentFont(),
            size: options.size || TextRenderer.getCurrentSize(),
            alignment: options.alignment || this.ALIGNMENT.LEFT,
            lineSpacing: options.lineSpacing || 0,
            maxWidth: options.maxWidth || canvas.width - 8, // 4px padding on each side
            lineBreakMode: options.lineBreakMode || this.LINE_BREAK_MODE.MANUAL
        };

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;

        const font = TextRenderer.fonts[settings.fontType];
        if (!font) return;

        // Get dimensions and process lines
        const dimensions = this.getMultilineTextDimensions(text, settings);
        const lines = this.processTextIntoLines(text, settings, font);

        // Calculate preview scale to fit canvas
        const maxPreviewWidth = canvas.width - 8; // 4px padding
        const maxPreviewHeight = canvas.height - 8; // 4px padding
        const scaleX = dimensions.width > 0 ? Math.min(1, maxPreviewWidth / dimensions.width) : 1;
        const scaleY = dimensions.height > 0 ? Math.min(1, maxPreviewHeight / dimensions.height) : 1;
        const previewScale = Math.min(scaleX, scaleY, 1); // Don't scale up

        // Center the preview
        const previewWidth = dimensions.width * previewScale;
        const previewHeight = dimensions.height * previewScale;
        const startX = Math.floor((canvas.width - previewWidth) / 2);
        const startY = Math.floor((canvas.height - previewHeight) / 2);

        // Create temporary bitmap for preview
        const bitmapWidth = Math.ceil(dimensions.width);
        const bitmapHeight = Math.ceil(dimensions.height);
        const pixels = new Array(bitmapHeight).fill(null).map(() => new Array(bitmapWidth).fill(0));

        // Render text to bitmap
        const fontHeight = font.height * settings.size;
        const lineHeight = fontHeight + settings.lineSpacing;
        let currentY = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().length === 0) {
                currentY += lineHeight;
                continue;
            }

            const lineWidth = TextRenderer.getTextWidth(line, settings.fontType, settings.size);
            let lineX = 0;

            // Apply alignment
            switch (settings.alignment) {
                case this.ALIGNMENT.CENTER:
                    lineX = Math.floor((dimensions.width - lineWidth) / 2);
                    break;
                case this.ALIGNMENT.RIGHT:
                    lineX = dimensions.width - lineWidth;
                    break;
                case this.ALIGNMENT.LEFT:
                default:
                    lineX = 0;
                    break;
            }

            // Render each character to the bitmap
            let charX = lineX;
            for (const char of line) {
                let charBitmap = font.data[char];
                
                // If character not found, try uppercase version
                if (!charBitmap && char.toLowerCase() !== char) {
                    charBitmap = font.data[char.toUpperCase()];
                }

                if (charBitmap) {
                    // Render character to bitmap
                    for (let row = 0; row < charBitmap.length; row++) {
                        for (let col = 0; col < charBitmap[row].length; col++) {
                            if (charBitmap[row][col] === 1) {
                                for (let sy = 0; sy < settings.size; sy++) {
                                    for (let sx = 0; sx < settings.size; sx++) {
                                        const pixelX = charX + (col * settings.size) + sx;
                                        const pixelY = currentY + (row * settings.size) + sy;
                                        
                                        if (pixelX >= 0 && pixelX < bitmapWidth && 
                                            pixelY >= 0 && pixelY < bitmapHeight) {
                                            pixels[pixelY][pixelX] = 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                charX += (font.width + font.spacing) * settings.size;
            }

            currentY += lineHeight;
        }

        // Render bitmap to canvas with scaling
        const imageData = ctx.createImageData(Math.ceil(previewWidth), Math.ceil(previewHeight));
        
        for (let y = 0; y < Math.ceil(previewHeight); y++) {
            for (let x = 0; x < Math.ceil(previewWidth); x++) {
                const sourceX = Math.floor(x / previewScale);
                const sourceY = Math.floor(y / previewScale);
                const index = (y * Math.ceil(previewWidth) + x) * 4;
                
                let pixel = 0;
                if (sourceX < bitmapWidth && sourceY < bitmapHeight) {
                    pixel = pixels[sourceY][sourceX];
                }
                
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
        ctx.putImageData(imageData, startX, startY);

        // Add info text
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        const infoText = `${lines.length} lines, ${dimensions.width}×${dimensions.height}px`;
        ctx.fillText(infoText, 4, canvas.height - 4);
    }

    /**
     * Get optimal line breaking for a given width
     * @param {string} text - Text to analyze
     * @param {number} maxWidth - Maximum width constraint
     * @param {Object} options - Font and size options
     * @returns {Object} Analysis with line count and efficiency metrics
     */
    static analyzeLineBreaking(text, maxWidth, options = {}) {
        const settings = {
            fontType: options.fontType || TextRenderer.getCurrentFont(),
            size: options.size || TextRenderer.getCurrentSize(),
            lineSpacing: options.lineSpacing || 0
        };

        const font = TextRenderer.fonts[settings.fontType];
        if (!font) {
            return { lineCount: 0, efficiency: 0, overflow: false };
        }

        // Test different line break modes
        const modes = [
            this.LINE_BREAK_MODE.MANUAL,
            this.LINE_BREAK_MODE.WORD_WRAP,
            this.LINE_BREAK_MODE.CHARACTER_WRAP
        ];

        const results = {};

        for (const mode of modes) {
            const testSettings = { ...settings, maxWidth, lineBreakMode: mode };
            const lines = this.processTextIntoLines(text, testSettings, font);
            
            let maxLineWidth = 0;
            let overflow = false;
            
            for (const line of lines) {
                const lineWidth = TextRenderer.getTextWidth(line, settings.fontType, settings.size);
                maxLineWidth = Math.max(maxLineWidth, lineWidth);
                if (lineWidth > maxWidth) {
                    overflow = true;
                }
            }

            const efficiency = maxWidth > 0 ? maxLineWidth / maxWidth : 1;

            results[mode] = {
                lineCount: lines.length,
                maxLineWidth,
                efficiency,
                overflow,
                lines
            };
        }

        return results;
    }
}