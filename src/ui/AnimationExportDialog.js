/**
 * AnimationExportDialog - UI for animation export configuration
 * 
 * Provides user-friendly interface for exporting animations in various formats
 */
class AnimationExportDialog {
    constructor(animationExporter) {
        this.exporter = animationExporter;
        this.createDialog();
        this.setupEventListeners();
    }

    /**
     * Create the export dialog HTML structure
     */
    createDialog() {
        // Remove existing dialog if present
        const existing = document.getElementById('animation-export-dialog');
        if (existing) {
            existing.remove();
        }

        const dialogHTML = `
            <div class="dialog-overlay" id="animation-export-dialog" style="display: none;">
                <div class="dialog">
                    <div class="dialog-header">
                        <h3>Export Animation</h3>
                        <button class="dialog-close" id="animation-export-close-btn">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>
                    <div class="dialog-content">
                        <div class="export-format-section">
                            <h4>Export Format</h4>
                            <div class="format-options">
                                <label class="format-option">
                                    <input type="radio" name="export-format" value="gif" checked>
                                    <div class="format-info">
                                        <strong>GIF Animation</strong>
                                        <span>Universal format, good compression</span>
                                    </div>
                                </label>
                                <label class="format-option">
                                    <input type="radio" name="export-format" value="apng">
                                    <div class="format-info">
                                        <strong>APNG Animation</strong>
                                        <span>High quality, modern browsers</span>
                                    </div>
                                </label>
                                <label class="format-option">
                                    <input type="radio" name="export-format" value="spritesheet">
                                    <div class="format-info">
                                        <strong>Sprite Sheet</strong>
                                        <span>For game engines and development</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="export-settings-section">
                            <h4>Settings</h4>
                            <div class="settings-grid">
                                <div class="setting-group">
                                    <label>Frame Range:</label>
                                    <div class="frame-range-inputs">
                                        <input type="number" id="start-frame" min="0" value="0" placeholder="Start">
                                        <span>to</span>
                                        <input type="number" id="end-frame" min="0" placeholder="End (auto)">
                                    </div>
                                </div>

                                <div class="setting-group animation-only">
                                    <label>Frame Rate:</label>
                                    <div class="fps-control">
                                        <input type="range" id="fps-slider" min="1" max="60" value="12">
                                        <span id="fps-value">12</span> FPS
                                    </div>
                                </div>

                                <div class="setting-group animation-only">
                                    <label>Animation:</label>
                                    <div class="animation-options">
                                        <label>
                                            <input type="checkbox" id="loop-animation" checked>
                                            Loop animation
                                        </label>
                                    </div>
                                </div>

                                <div class="setting-group">
                                    <label>Scale:</label>
                                    <select id="export-scale">
                                        <option value="1">1x (Original)</option>
                                        <option value="2" selected>2x</option>
                                        <option value="4">4x</option>
                                        <option value="8">8x</option>
                                    </select>
                                </div>

                                <div class="setting-group spritesheet-only" style="display: none;">
                                    <label>Columns:</label>
                                    <input type="number" id="sprite-columns" min="1" max="16" value="8">
                                </div>

                                <div class="setting-group spritesheet-only" style="display: none;">
                                    <label>Spacing:</label>
                                    <input type="number" id="sprite-spacing" min="0" max="10" value="2"> px
                                </div>
                            </div>
                        </div>

                        <div class="export-preview-section">
                            <h4>Preview</h4>
                            <div class="preview-info" id="export-preview-info">
                                <span id="frame-count-info">No frames found</span>
                                <span id="export-size-info"></span>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="dialog-btn dialog-btn-cancel" id="animation-export-cancel-btn">Cancel</button>
                        <button class="dialog-btn dialog-btn-primary" id="animation-export-btn">Export</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
    }

    /**
     * Set up event listeners for dialog controls
     */
    setupEventListeners() {
        const dialog = document.getElementById('animation-export-dialog');
        const closeBtn = document.getElementById('animation-export-close-btn');
        const cancelBtn = document.getElementById('animation-export-cancel-btn');
        const exportBtn = document.getElementById('animation-export-btn');
        const formatRadios = document.querySelectorAll('input[name="export-format"]');
        const fpsSlider = document.getElementById('fps-slider');
        const fpsValue = document.getElementById('fps-value');

        // Close dialog events
        closeBtn.addEventListener('click', () => this.hide());
        cancelBtn.addEventListener('click', () => this.hide());

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) this.hide();
        });

        // Format selection changes
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => this.updateFormatVisibility());
        });

        // FPS slider
        fpsSlider.addEventListener('input', (e) => {
            fpsValue.textContent = e.target.value;
            this.updatePreview();
        });

        // Export button
        exportBtn.addEventListener('click', () => this.performExport());

        // Update preview when settings change
        document.getElementById('start-frame').addEventListener('input', () => this.updatePreview());
        document.getElementById('end-frame').addEventListener('input', () => this.updatePreview());
        document.getElementById('export-scale').addEventListener('change', () => this.updatePreview());
        document.getElementById('sprite-columns').addEventListener('input', () => this.updatePreview());
    }

    /**
     * Show the export dialog
     * @param {string} format Default format to select
     */
    show(format = 'gif') {
        const dialog = document.getElementById('animation-export-dialog');
        
        // Set default format
        const formatRadio = document.querySelector(`input[name="export-format"][value="${format}"]`);
        if (formatRadio) {
            formatRadio.checked = true;
        }

        this.updateFormatVisibility();
        this.updatePreview();
        dialog.style.display = 'flex';
    }

    /**
     * Hide the export dialog
     */
    hide() {
        const dialog = document.getElementById('animation-export-dialog');
        dialog.style.display = 'none';
    }

    /**
     * Update visibility of format-specific options
     */
    updateFormatVisibility() {
        const selectedFormat = document.querySelector('input[name="export-format"]:checked').value;
        const animationOnlyElements = document.querySelectorAll('.animation-only');
        const spritesheetOnlyElements = document.querySelectorAll('.spritesheet-only');

        // Show/hide animation-specific options
        animationOnlyElements.forEach(element => {
            element.style.display = (selectedFormat === 'gif' || selectedFormat === 'apng') ? 'block' : 'none';
        });

        // Show/hide spritesheet-specific options
        spritesheetOnlyElements.forEach(element => {
            element.style.display = selectedFormat === 'spritesheet' ? 'block' : 'none';
        });

        this.updatePreview();
    }

    /**
     * Update the preview information
     */
    updatePreview() {
        if (!this.exporter) return;

        const startFrame = parseInt(document.getElementById('start-frame').value) || 0;
        const endFrameInput = document.getElementById('end-frame').value;
        const endFrame = endFrameInput ? parseInt(endFrameInput) : null;
        const scale = parseInt(document.getElementById('export-scale').value) || 1;
        const fps = parseInt(document.getElementById('fps-slider').value) || 12;
        const selectedFormat = document.querySelector('input[name="export-format"]:checked').value;

        // Get available frames
        const frames = this.exporter.getAnimationFrames(startFrame, endFrame);
        const frameCountInfo = document.getElementById('frame-count-info');
        const exportSizeInfo = document.getElementById('export-size-info');

        if (frames.length === 0) {
            frameCountInfo.textContent = 'No animation frames found';
            exportSizeInfo.textContent = '';
            document.getElementById('animation-export-btn').disabled = true;
            return;
        }

        document.getElementById('animation-export-btn').disabled = false;

        // Update frame count
        frameCountInfo.textContent = `${frames.length} frames found`;

        // Calculate export size
        if (frames.length > 0) {
            const frameWidth = frames[0].unit.width * scale;
            const frameHeight = frames[0].unit.height * scale;

            if (selectedFormat === 'spritesheet') {
                const columns = parseInt(document.getElementById('sprite-columns').value) || 8;
                const spacing = parseInt(document.getElementById('sprite-spacing').value) || 2;
                const rows = Math.ceil(frames.length / columns);
                const sheetWidth = (frameWidth * columns) + (spacing * (columns - 1));
                const sheetHeight = (frameHeight * rows) + (spacing * (rows - 1));
                exportSizeInfo.textContent = `Sprite sheet: ${sheetWidth}×${sheetHeight}`;
            } else {
                const duration = frames.length / fps;
                exportSizeInfo.textContent = `Animation: ${frameWidth}×${frameHeight}, ${duration.toFixed(1)}s @ ${fps}fps`;
            }
        }
    }

    /**
     * Perform the export with current settings
     */
    async performExport() {
        if (!this.exporter) {
            alert('Animation exporter not available');
            return;
        }

        const selectedFormat = document.querySelector('input[name="export-format"]:checked').value;
        const startFrame = parseInt(document.getElementById('start-frame').value) || 0;
        const endFrameInput = document.getElementById('end-frame').value;
        const endFrame = endFrameInput ? parseInt(endFrameInput) : null;
        const scale = parseInt(document.getElementById('export-scale').value) || 1;
        const fps = parseInt(document.getElementById('fps-slider').value) || 12;
        const loop = document.getElementById('loop-animation').checked;

        const options = {
            startFrame,
            endFrame,
            scale,
            fps,
            loop
        };

        // Add format-specific options
        if (selectedFormat === 'spritesheet') {
            options.columns = parseInt(document.getElementById('sprite-columns').value) || 8;
            options.spacing = parseInt(document.getElementById('sprite-spacing').value) || 2;
        }

        try {
            // Update button state
            const exportBtn = document.getElementById('animation-export-btn');
            const originalText = exportBtn.textContent;
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';

            let blob;
            let filename;
            const projectName = document.getElementById('project-name')?.value || 'animation';

            switch (selectedFormat) {
                case 'gif':
                    blob = await this.exporter.exportGIF(options);
                    filename = `${projectName}.gif`;
                    break;
                case 'apng':
                    blob = await this.exporter.exportAPNG(options);
                    filename = `${projectName}.png`;
                    break;
                case 'spritesheet':
                    blob = await this.exporter.exportSpriteSheet(options);
                    filename = `${projectName}_sheet.png`;
                    break;
                default:
                    throw new Error('Unknown export format');
            }

            // Download the file
            this.exporter.downloadAnimation(blob, filename, selectedFormat.toUpperCase());

            // Hide dialog
            this.hide();

        } catch (error) {
            alert(`Export failed: ${error.message}`);
            console.error('Export error:', error);
        } finally {
            // Restore button state
            const exportBtn = document.getElementById('animation-export-btn');
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationExportDialog;
}