/**
 * Dialog Manager - Handles all modal dialogs and their interactions
 */
class DialogManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.setupAllDialogs();
    }

    setupAllDialogs() {
        this.setupNewCanvasDialog();
        this.setupCppExportDialog();
        this.setupCppImportDialog();
    }

    // ==== NEW CANVAS DIALOG ====
    setupNewCanvasDialog() {
        const dialog = document.getElementById('new-canvas-dialog');
        const closeBtn = document.getElementById('new-canvas-close-btn');
        const cancelBtn = document.getElementById('new-canvas-cancel-btn');
        const createBtn = document.getElementById('new-canvas-create-btn');
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        const presetSelect = document.getElementById('preset-select');
        const swapBtn = document.getElementById('swap-dimensions-btn');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        presetSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                const [width, height] = value.split(',').map(n => parseInt(n));
                widthInput.value = width;
                heightInput.value = height;
            }
        });

        const updatePresetSelection = () => {
            const width = widthInput.value;
            const height = heightInput.value;
            const presetValue = `${width},${height}`;
            
            let foundPreset = false;
            for (let option of presetSelect.options) {
                if (option.value === presetValue) {
                    presetSelect.value = presetValue;
                    foundPreset = true;
                    break;
                }
            }
            
            if (!foundPreset) {
                presetSelect.value = '';
            }
        };

        widthInput.addEventListener('input', updatePresetSelection);
        heightInput.addEventListener('input', updatePresetSelection);

        swapBtn.addEventListener('click', () => {
            const width = widthInput.value;
            const height = heightInput.value;
            widthInput.value = height;
            heightInput.value = width;
            updatePresetSelection();
        });

        createBtn.addEventListener('click', () => {
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            
            if (width > 0 && height > 0 && width <= 2048 && height <= 2048) {
                this.app.createNewCanvas(width, height);
                closeDialog();
            } else {
                this.app.showNotification('Invalid canvas size (1-2048 pixels)', 'error');
            }
        });

        [widthInput, heightInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    createBtn.click();
                }
            });
        });
    }

    showNewCanvasDialog() {
        const dialog = document.getElementById('new-canvas-dialog');
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        const presetSelect = document.getElementById('preset-select');
        
        widthInput.value = this.app.editor.width;
        heightInput.value = this.app.editor.height;
        
        const presetValue = `${this.app.editor.width},${this.app.editor.height}`;
        let foundPreset = false;
        for (let option of presetSelect.options) {
            if (option.value === presetValue) {
                presetSelect.value = presetValue;
                foundPreset = true;
                break;
            }
        }
        
        if (!foundPreset) {
            presetSelect.value = '';
        }
        
        dialog.style.display = 'flex';
        widthInput.focus();
    }

    // ==== CPP EXPORT DIALOG ====
    setupCppExportDialog() {
        const dialog = document.getElementById('cpp-export-dialog');
        const closeBtn = document.getElementById('cpp-export-close-btn');
        const cancelBtn = document.getElementById('cpp-export-cancel-btn');
        const copyBtn = document.getElementById('cpp-export-copy-btn');
        const arrayNameInput = document.getElementById('array-name-input');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        arrayNameInput.addEventListener('input', () => {
            this.generateCppCode();
        });

        copyBtn.addEventListener('click', async () => {
            const codeTextarea = document.getElementById('cpp-export-code');
            try {
                await navigator.clipboard.writeText(codeTextarea.value);
                this.app.showNotification('Code copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                this.app.showNotification('Failed to copy to clipboard. Please copy manually.', 'error');
            }
        });
    }

    showCppExportDialog() {
        const dialog = document.getElementById('cpp-export-dialog');
        dialog.style.display = 'flex';
        
        this.generateCppCode();
        
        document.getElementById('array-name-input').focus();
    }

    generateCppCode() {
        const arrayName = document.getElementById('array-name-input').value || 'my_bitmap';
        const codeTextarea = document.getElementById('cpp-export-code');
        
        const bitmapData = this.app.editor.getBitmapData();
        const code = U8G2Exporter.generateHFile(bitmapData, arrayName);
        
        codeTextarea.value = code;
    }

    // ==== CPP IMPORT DIALOG ====
    setupCppImportDialog() {
        const dialog = document.getElementById('cpp-import-dialog');
        const closeBtn = document.getElementById('cpp-import-close-btn');
        const cancelBtn = document.getElementById('cpp-import-cancel-btn');
        const importBtn = document.getElementById('cpp-import-load-btn');
        const fileInput = document.getElementById('cpp-import-file');
        const codeTextarea = document.getElementById('cpp-import-code');

        const closeDialog = () => {
            dialog.style.display = 'none';
            fileInput.value = '';
            codeTextarea.value = '';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    codeTextarea.value = e.target.result;
                };
                reader.readAsText(file);
            }
        });

        importBtn.addEventListener('click', () => {
            const code = codeTextarea.value.trim();
            if (!code) {
                this.app.showNotification('Please select a file or paste code to import', 'error');
                return;
            }

            try {
                const bitmapData = U8G2Exporter.parseHFile(code);
                this.app.editor.loadBitmapData(bitmapData);
                this.app.updateOutput();
                this.app.showNotification('CPP header imported successfully!', 'success');
                closeDialog();
            } catch (error) {
                console.error('Import error:', error);
                this.app.showNotification('Failed to import code: ' + error.message, 'error');
            }
        });
    }

    showCppImportDialog() {
        const dialog = document.getElementById('cpp-import-dialog');
        dialog.style.display = 'flex';
        
        document.getElementById('cpp-import-file').value = '';
        document.getElementById('cpp-import-code').value = '';
    }
}