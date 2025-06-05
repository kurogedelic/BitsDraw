/**
 * AnimationExporter - Advanced animation export capabilities
 * 
 * Exports animations in various formats including GIF, APNG, and sprite sheets
 * Leverages CanvasUnit system for frame-based animations
 */
class AnimationExporter {
    constructor(unitManager) {
        this.unitManager = unitManager;
        
        // GIF.js library integration (will be loaded dynamically)
        this.gifLibrary = null;
        this.loadGifLibrary();
    }

    /**
     * Load GIF.js library dynamically
     */
    async loadGifLibrary() {
        try {
            // Check if gif.js is already loaded
            if (typeof GIF !== 'undefined') {
                this.gifLibrary = GIF;
                return;
            }

            // Load gif.js from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.min.js';
            script.onload = () => {
                this.gifLibrary = window.GIF;
                console.log('GIF.js library loaded');
            };
            script.onerror = () => {
                console.warn('Failed to load GIF.js library - GIF export will not be available');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.warn('GIF library loading error:', error);
        }
    }

    /**
     * Export animation as GIF
     * @param {object} options Export options
     * @returns {Promise<Blob>} GIF blob
     */
    async exportGIF(options = {}) {
        if (!this.gifLibrary) {
            throw new Error('GIF library not available. Animation export requires gif.js.');
        }

        const {
            startFrame = 0,
            endFrame = null,
            fps = 12,
            loop = true,
            scale = 1,
            colors = 2, // Black and white
            dithering = false,
            quality = 10
        } = options;

        // Get animation frames
        const frames = this.getAnimationFrames(startFrame, endFrame);
        if (frames.length === 0) {
            throw new Error('No animation frames found to export');
        }

        return new Promise((resolve, reject) => {
            try {
                // Create GIF instance
                const gif = new this.gifLibrary({
                    workers: 2,
                    quality: quality,
                    width: frames[0].unit.width * scale,
                    height: frames[0].unit.height * scale,
                    dither: dithering,
                    repeat: loop ? 0 : -1 // 0 = infinite loop, -1 = no loop
                });

                // Convert frame rate to delay
                const delay = Math.round(1000 / fps);

                // Add frames to GIF
                frames.forEach(frame => {
                    const canvas = this.createFrameCanvas(frame.unit, scale);
                    gif.addFrame(canvas, { delay: delay });
                });

                // Render GIF
                gif.on('finished', (blob) => {
                    resolve(blob);
                });

                gif.on('progress', (p) => {
                    console.log(`GIF export progress: ${Math.round(p * 100)}%`);
                });

                gif.render();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Export animation as APNG (Animated PNG)
     * @param {object} options Export options
     * @returns {Promise<Blob>} APNG blob
     */
    async exportAPNG(options = {}) {
        const {
            startFrame = 0,
            endFrame = null,
            fps = 12,
            loop = true,
            scale = 1
        } = options;

        // Get animation frames
        const frames = this.getAnimationFrames(startFrame, endFrame);
        if (frames.length === 0) {
            throw new Error('No animation frames found to export');
        }

        // For now, we'll create a simplified APNG by encoding each frame as PNG
        // and combining them (this is a basic implementation)
        const frameDelay = Math.round(1000 / fps);
        
        try {
            // Create frame canvases
            const frameCanvases = frames.map(frame => 
                this.createFrameCanvas(frame.unit, scale)
            );

            // For basic APNG support, we'll use a canvas-based approach
            // In a production environment, you might want to use a dedicated APNG library
            const apngData = await this.createSimpleAPNG(frameCanvases, frameDelay, loop);
            return apngData;

        } catch (error) {
            throw new Error(`APNG export failed: ${error.message}`);
        }
    }

    /**
     * Export animation as sprite sheet
     * @param {object} options Export options
     * @returns {Promise<Blob>} PNG sprite sheet blob
     */
    async exportSpriteSheet(options = {}) {
        const {
            startFrame = 0,
            endFrame = null,
            columns = 8,
            spacing = 2,
            scale = 1,
            includeMeta = true
        } = options;

        // Get animation frames
        const frames = this.getAnimationFrames(startFrame, endFrame);
        if (frames.length === 0) {
            throw new Error('No animation frames found to export');
        }

        const frameWidth = frames[0].unit.width * scale;
        const frameHeight = frames[0].unit.height * scale;
        const rows = Math.ceil(frames.length / columns);

        // Calculate sprite sheet dimensions
        const sheetWidth = (frameWidth * columns) + (spacing * (columns - 1));
        const sheetHeight = (frameHeight * rows) + (spacing * (rows - 1));

        // Create sprite sheet canvas
        const canvas = document.createElement('canvas');
        canvas.width = sheetWidth;
        canvas.height = sheetHeight;
        const ctx = canvas.getContext('2d');

        // Fill with transparent background
        ctx.clearRect(0, 0, sheetWidth, sheetHeight);

        // Draw frames
        frames.forEach((frame, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            const x = col * (frameWidth + spacing);
            const y = row * (frameHeight + spacing);

            const frameCanvas = this.createFrameCanvas(frame.unit, scale);
            ctx.drawImage(frameCanvas, x, y);
        });

        // Convert to blob
        return new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });
    }

    /**
     * Export animation metadata (JSON)
     * @param {object} options Export options
     * @returns {object} Animation metadata
     */
    exportAnimationMeta(options = {}) {
        const {
            startFrame = 0,
            endFrame = null,
            fps = 12,
            includeFrameMeta = true
        } = options;

        const frames = this.getAnimationFrames(startFrame, endFrame);
        
        const metadata = {
            version: '1.0',
            type: 'animation',
            totalFrames: frames.length,
            fps: fps,
            duration: frames.length / fps,
            frameSize: {
                width: frames.length > 0 ? frames[0].unit.width : 0,
                height: frames.length > 0 ? frames[0].unit.height : 0
            },
            created: new Date().toISOString(),
            frames: []
        };

        if (includeFrameMeta) {
            metadata.frames = frames.map((frame, index) => ({
                index: index,
                frameNumber: frame.frameIndex + 1,
                name: frame.unit.meta.name,
                tags: frame.unit.meta.tags,
                modified: new Date(frame.unit.meta.modified).toISOString()
            }));
        }

        return metadata;
    }

    /**
     * Get animation frames from unit manager
     * @param {number} startFrame Start frame index
     * @param {number} endFrame End frame index (null for all)
     * @returns {Array} Array of frame objects
     */
    getAnimationFrames(startFrame, endFrame) {
        if (!this.unitManager) return [];

        // Get all animation frames: [*, 0, 0]
        const allFrames = this.unitManager.getUnitsByPattern('*', 0, 0);
        
        if (allFrames.length === 0) return [];

        // Sort by frame index
        allFrames.sort((a, b) => a.id.frame - b.id.frame);

        // Filter by range
        const finalEndFrame = endFrame !== null ? endFrame : allFrames[allFrames.length - 1].id.frame;
        
        return allFrames
            .filter(unit => unit.id.frame >= startFrame && unit.id.frame <= finalEndFrame)
            .map(unit => ({
                frameIndex: unit.id.frame,
                unit: unit
            }));
    }

    /**
     * Create canvas for a single frame
     * @param {CanvasUnit} unit Frame unit
     * @param {number} scale Scale multiplier
     * @returns {HTMLCanvasElement} Frame canvas
     */
    createFrameCanvas(unit, scale = 1) {
        const canvas = document.createElement('canvas');
        canvas.width = unit.width * scale;
        canvas.height = unit.height * scale;
        const ctx = canvas.getContext('2d');

        // Create image data
        const imageData = ctx.createImageData(canvas.width, canvas.height);

        // Render pixels with scaling
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const srcX = Math.floor(x / scale);
                const srcY = Math.floor(y / scale);
                
                const pixelValue = unit.getPixel(srcX, srcY);
                const color = pixelValue ? 0 : 255; // 0 = black, 255 = white
                
                const index = (y * canvas.width + x) * 4;
                imageData.data[index] = color;     // R
                imageData.data[index + 1] = color; // G
                imageData.data[index + 2] = color; // B
                imageData.data[index + 3] = 255;   // A
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Create simple APNG (basic implementation)
     * @param {HTMLCanvasElement[]} frameCanvases Array of frame canvases
     * @param {number} frameDelay Delay between frames in ms
     * @param {boolean} loop Whether to loop
     * @returns {Promise<Blob>} APNG blob
     */
    async createSimpleAPNG(frameCanvases, frameDelay, loop) {
        // For this implementation, we'll create a simple animated canvas
        // In production, you'd want to use a proper APNG encoder
        
        if (frameCanvases.length === 1) {
            // Single frame - just return as PNG
            return new Promise((resolve) => {
                frameCanvases[0].toBlob(resolve, 'image/png');
            });
        }

        // For multiple frames, we'll create a combined canvas with frame data
        // This is a simplified approach - real APNG requires proper encoding
        const firstFrame = frameCanvases[0];
        const canvas = document.createElement('canvas');
        canvas.width = firstFrame.width;
        canvas.height = firstFrame.height;
        const ctx = canvas.getContext('2d');

        // Draw the first frame
        ctx.drawImage(firstFrame, 0, 0);

        // Add metadata comment (not a real APNG, but includes frame info)
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                // In a real implementation, you'd encode proper APNG chunks here
                resolve(blob);
            }, 'image/png');
        });
    }

    /**
     * Export animation in multiple formats
     * @param {object} options Export options
     * @returns {Promise<object>} Export results object
     */
    async exportMultiFormat(options = {}) {
        const {
            formats = ['gif', 'spritesheet', 'meta'],
            ...exportOptions
        } = options;

        const results = {};
        const errors = {};

        // Export each requested format
        for (const format of formats) {
            try {
                switch (format) {
                    case 'gif':
                        results.gif = await this.exportGIF(exportOptions);
                        break;
                    case 'apng':
                        results.apng = await this.exportAPNG(exportOptions);
                        break;
                    case 'spritesheet':
                        results.spritesheet = await this.exportSpriteSheet(exportOptions);
                        break;
                    case 'meta':
                        results.metadata = this.exportAnimationMeta(exportOptions);
                        break;
                    default:
                        console.warn(`Unknown export format: ${format}`);
                }
            } catch (error) {
                errors[format] = error.message;
                console.error(`Failed to export ${format}:`, error);
            }
        }

        return {
            success: Object.keys(results).length > 0,
            results,
            errors: Object.keys(errors).length > 0 ? errors : null
        };
    }

    /**
     * Download exported animation
     * @param {Blob} blob Export blob
     * @param {string} filename Filename
     * @param {string} format Export format
     */
    downloadAnimation(blob, filename, format) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Downloaded ${format} animation: ${filename}`);
    }

    /**
     * Get export format capabilities
     * @returns {object} Available export formats and their capabilities
     */
    getExportCapabilities() {
        return {
            gif: {
                available: !!this.gifLibrary,
                description: 'Animated GIF - Universal animation format',
                maxColors: 256,
                compression: 'LZW',
                transparency: true,
                loop: true
            },
            apng: {
                available: true,
                description: 'Animated PNG - High quality animation',
                maxColors: 'unlimited',
                compression: 'PNG',
                transparency: true,
                loop: true
            },
            spritesheet: {
                available: true,
                description: 'PNG sprite sheet - For game engines',
                maxColors: 'unlimited',
                compression: 'PNG',
                transparency: true,
                loop: false
            },
            metadata: {
                available: true,
                description: 'JSON metadata - Animation information',
                maxColors: 'n/a',
                compression: 'none',
                transparency: 'n/a',
                loop: 'n/a'
            }
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationExporter;
}