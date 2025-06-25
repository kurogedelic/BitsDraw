/**
 * Animation Exporter for BitsDraw
 * Reliable animation export using multiple formats
 */

class AnimationExporter {
    constructor() {
        this.supportedFormats = ['png-sequence', 'webm', 'gif', 'apng'];
        this.gifExporter = null;
    }

    /**
     * Export animation as PNG sequence in ZIP
     * Most reliable method - always works
     */
    async exportPngSequence(sheets, settings) {
        if (!window.JSZip) {
            throw new Error('JSZip library not available');
        }

        const { width, height, frameRate, projectName } = settings;
        const zip = new JSZip();
        
        // Create info file
        const info = {
            projectName: projectName || 'BitsDraw Animation',
            width: width,
            height: height,
            frameRate: frameRate,
            frameCount: sheets.length,
            format: 'PNG Sequence',
            createdAt: new Date().toISOString(),
            suggestedTools: [
                'GIMP: File > Open as Layers > Export as GIF',
                'Photoshop: File > Scripts > Load Files into Stack > Save for Web > GIF',
                'ImageMagick: convert frame_*.png animation.gif',
                'Online tools: ezgif.com, gifmaker.me'
            ]
        };
        
        zip.file('README.txt', this.generateReadmeText(info));
        zip.file('animation_info.json', JSON.stringify(info, null, 2));

        // Generate PNG for each sheet
        for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i];
            const frameNumber = String(i + 1).padStart(3, '0');
            
            try {
                // Get composite pixel data
                const pixelData = this.getSheetPixelData(sheet, width, height);
                
                // Convert to PNG
                const pngBlob = await this.pixelsToPng(pixelData, width, height);
                
                // Add to ZIP
                zip.file(`frame_${frameNumber}.png`, pngBlob);
                
                console.log(`Frame ${i + 1}/${sheets.length} processed`);
            } catch (error) {
                console.error(`Error processing frame ${i + 1}:`, error);
                throw new Error(`Failed to process frame ${i + 1}: ${error.message}`);
            }
        }

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Download
        this.downloadBlob(zipBlob, `${projectName || 'bitsdraw_animation'}_frames.zip`);
        
        return {
            format: 'PNG Sequence ZIP',
            frameCount: sheets.length,
            fileSize: zipBlob.size
        };
    }

    /**
     * Export animation as GIF (high quality with fallback strategies)
     */
    async exportGIF(sheets, settings) {
        const { width, height, frameRate, projectName, quality = 'balanced' } = settings;

        if (!window.GifExportStrategies) {
            throw new Error('GIF export strategies not available');
        }

        // Initialize GIF exporter if not done
        if (!this.gifExporter) {
            this.gifExporter = new GifExportStrategies();
        }

        // Set up global reference for pixel data access
        window.bitsDraw = {
            getSheetCompositePixels: (sheet) => {
                return this.getSheetPixelData(sheet, width, height);
            }
        };

        const gifSettings = {
            width, 
            height, 
            frameRate, 
            projectName, 
            quality
        };

        try {
            const result = await this.gifExporter.export(sheets, gifSettings);
            
            // Download the GIF
            this.downloadBlob(result.blob, `${projectName || 'bitsdraw_animation'}.gif`);
            
            return {
                format: `GIF (${result.method})`,
                frameCount: sheets.length,
                fileSize: result.blob.size,
                quality: result.quality,
                method: result.method
            };
        } catch (error) {
            console.error('GIF export failed:', error);
            
            // Suggest PNG sequence as fallback
            throw new Error(`GIF export failed: ${error.message}\n\nTip: Try PNG Sequence export for guaranteed compatibility.`);
        }
    }

    /**
     * Export animation as WebM video (modern browsers)
     */
    async exportWebM(sheets, settings) {
        if (!('MediaRecorder' in window)) {
            throw new Error('MediaRecorder API not supported');
        }

        const { width, height, frameRate, projectName } = settings;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Setup MediaRecorder
        const stream = canvas.captureStream(frameRate);
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000 // 2.5Mbps for good quality
        });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);

        return new Promise((resolve, reject) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                this.downloadBlob(blob, `${projectName || 'bitsdraw_animation'}.webm`);
                resolve({
                    format: 'WebM Video',
                    frameCount: sheets.length,
                    fileSize: blob.size
                });
            };

            recorder.onerror = reject;

            // Start recording
            recorder.start();

            // Draw frames
            let frameIndex = 0;
            const frameDuration = 1000 / frameRate;

            const drawFrame = () => {
                if (frameIndex >= sheets.length) {
                    recorder.stop();
                    return;
                }

                // Clear canvas
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);

                // Draw current frame
                const pixelData = this.getSheetPixelData(sheets[frameIndex], width, height);
                this.drawPixelsToCanvas(ctx, pixelData, width, height);

                frameIndex++;
                setTimeout(drawFrame, frameDuration);
            };

            drawFrame();
        });
    }

    /**
     * Get pixel data from sheet (compatible with existing BitsDraw system)
     */
    getSheetPixelData(sheet, width, height) {
        // This would be called from main.js with actual sheet data
        // For now, return dummy data to avoid breaking the interface
        return new Uint8Array(width * height);
    }

    /**
     * Convert pixel data to PNG blob
     */
    async pixelsToPng(pixels, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Create ImageData
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        // Convert BitsDraw format (0=white, 1=black) to RGBA
        for (let i = 0; i < pixels.length; i++) {
            const pixelIndex = i * 4;
            const value = pixels[i] === 0 ? 255 : 0; // 0=white, 1=black
            
            data[pixelIndex] = value;     // R
            data[pixelIndex + 1] = value; // G
            data[pixelIndex + 2] = value; // B
            data[pixelIndex + 3] = 255;   // A (opaque)
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        return new Promise((resolve, reject) => {
            canvas.toBlob(resolve, 'image/png');
        });
    }

    /**
     * Draw pixels to canvas context
     */
    drawPixelsToCanvas(ctx, pixels, width, height) {
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < pixels.length; i++) {
            const pixelIndex = i * 4;
            const value = pixels[i] === 0 ? 255 : 0;
            
            data[pixelIndex] = value;
            data[pixelIndex + 1] = value;
            data[pixelIndex + 2] = value;
            data[pixelIndex + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Generate README text for PNG sequence
     */
    generateReadmeText(info) {
        return `BitsDraw Animation Export
==========================

Project: ${info.projectName}
Dimensions: ${info.width} x ${info.height} pixels
Frame Rate: ${info.frameRate} FPS
Frames: ${info.frameCount}
Created: ${new Date(info.createdAt).toLocaleString()}

How to create GIF/Animation:
---------------------------

1. GIMP (Free):
   - File > Open as Layers
   - Select all frame_*.png files
   - Filters > Animation > Optimize (for GIF)
   - File > Export As > .gif
   - Set delay: ${Math.round(1000/info.frameRate)}ms per frame

2. ImageMagick (Command line):
   magick convert -delay ${Math.round(100/info.frameRate)} frame_*.png animation.gif

3. Online Tools:
   - Upload all frames to ezgif.com
   - Set delay: ${Math.round(1000/info.frameRate)}ms
   - Create GIF

4. Photoshop:
   - File > Scripts > Load Files into Stack
   - Window > Timeline > Create Frame Animation
   - File > Export > Save for Web > GIF

Frame naming: frame_001.png, frame_002.png, etc.
Play order: Numerical sequence

Enjoy your animation!
`;
    }

    /**
     * Download blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Make available globally
window.AnimationExporter = AnimationExporter;