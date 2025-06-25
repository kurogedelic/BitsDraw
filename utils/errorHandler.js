/**
 * Enhanced Error Handler - Provides user-friendly error management
 * Features:
 * - Comprehensive error dialog system
 * - Error categorization and context
 * - Recovery suggestions and actions
 * - Error reporting capabilities
 * - Improved validation feedback
 */

class ErrorHandler {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.errorHistory = [];
        this.maxErrorHistory = 50;
        this.setupErrorDialog();
        this.setupErrorReporting();
    }

    /**
     * Main error handling method
     */
    handleError(error, context = {}) {
        const errorInfo = this.categorizeError(error, context);
        this.logError(errorInfo);

        // Choose appropriate display method based on error severity
        if (errorInfo.severity === 'critical' || errorInfo.requiresDialog) {
            this.showErrorDialog(errorInfo);
        } else {
            this.showErrorNotification(errorInfo);
        }

        return errorInfo;
    }

    /**
     * Categorize and enrich error information
     */
    categorizeError(error, context) {
        const errorInfo = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            originalError: error,
            message: error.message || error.toString(),
            context: context,
            severity: 'medium',
            category: 'unknown',
            userMessage: '',
            technicalDetails: '',
            suggestions: [],
            actions: [],
            requiresDialog: false,
            reportable: true
        };

        // Categorize by error type and context
        if (context.operation) {
            switch (context.operation) {
                case 'file-import':
                    return this.categorizeFileImportError(errorInfo);
                case 'file-export':
                    return this.categorizeFileExportError(errorInfo);
                case 'canvas-operation':
                    return this.categorizeCanvasError(errorInfo);
                case 'tool-operation':
                    return this.categorizeToolError(errorInfo);
                case 'system-operation':
                    return this.categorizeSystemError(errorInfo);
                default:
                    return this.categorizeGenericError(errorInfo);
            }
        }

        return this.categorizeGenericError(errorInfo);
    }

    categorizeFileImportError(errorInfo) {
        const { message } = errorInfo.originalError;
        
        errorInfo.category = 'file-import';
        errorInfo.requiresDialog = true;

        if (message.includes('not supported') || message.includes('invalid format')) {
            errorInfo.userMessage = 'File format not supported';
            errorInfo.technicalDetails = `The file you're trying to import is not in a supported format. BitsDraw supports PNG, JPG, JPEG, GIF, BMP, WEBP, and ICO files.`;
            errorInfo.suggestions = [
                'Convert your file to PNG or JPG format',
                'Check if the file is corrupted',
                'Try a different image editing tool to resave the file'
            ];
            errorInfo.actions = [
                { label: 'Try Different File', action: 'retry-import' },
                { label: 'View Supported Formats', action: 'show-format-help' }
            ];
        } else if (message.includes('too large') || message.includes('size')) {
            errorInfo.userMessage = 'Image file is too large';
            errorInfo.technicalDetails = `The image file exceeds size limits. Large images may cause performance issues or browser memory problems.`;
            errorInfo.suggestions = [
                'Resize the image to smaller dimensions',
                'Compress the image file',
                'Use a web-based image resizer before importing'
            ];
            errorInfo.actions = [
                { label: 'Resize and Retry', action: 'resize-help' },
                { label: 'Try Different File', action: 'retry-import' }
            ];
        } else if (message.includes('permission') || message.includes('access')) {
            errorInfo.severity = 'high';
            errorInfo.userMessage = 'File access denied';
            errorInfo.technicalDetails = `BitsDraw doesn't have permission to access the selected file. This may be due to browser security restrictions or file permissions.`;
            errorInfo.suggestions = [
                'Try copying the file to your Desktop first',
                'Check if the file is open in another application',
                'Refresh the page and try again'
            ];
            errorInfo.actions = [
                { label: 'Refresh Page', action: 'refresh-page' },
                { label: 'Try Different File', action: 'retry-import' }
            ];
        } else {
            errorInfo.userMessage = 'Failed to import image';
            errorInfo.technicalDetails = `An unexpected error occurred while importing the image file.`;
            errorInfo.suggestions = [
                'Check if the file is corrupted',
                'Try refreshing the page',
                'Report this issue if it persists'
            ];
            errorInfo.actions = [
                { label: 'Try Again', action: 'retry-import' },
                { label: 'Report Issue', action: 'report-error' }
            ];
        }

        return errorInfo;
    }

    categorizeFileExportError(errorInfo) {
        const { message } = errorInfo.originalError;
        
        errorInfo.category = 'file-export';
        errorInfo.requiresDialog = true;

        if (message.includes('clipboard') || message.includes('copy')) {
            errorInfo.userMessage = 'Clipboard access failed';
            errorInfo.technicalDetails = `BitsDraw couldn't copy the data to your clipboard. This may be due to browser security restrictions.`;
            errorInfo.suggestions = [
                'Manually select and copy the text from the export dialog',
                'Try using Ctrl+C (Cmd+C on Mac) manually',
                'Check browser permissions for clipboard access'
            ];
            errorInfo.actions = [
                { label: 'Show Export Dialog', action: 'show-export-dialog' },
                { label: 'Try Again', action: 'retry-export' }
            ];
        } else if (message.includes('download') || message.includes('save')) {
            errorInfo.userMessage = 'Download failed';
            errorInfo.technicalDetails = `The file couldn't be downloaded. This may be due to browser restrictions or insufficient storage space.`;
            errorInfo.suggestions = [
                'Check if you have enough disk space',
                'Try downloading to a different location',
                'Check browser download settings'
            ];
            errorInfo.actions = [
                { label: 'Try Again', action: 'retry-export' },
                { label: 'Copy to Clipboard', action: 'copy-to-clipboard' }
            ];
        }

        return errorInfo;
    }

    categorizeCanvasError(errorInfo) {
        const { message } = errorInfo.originalError;
        
        errorInfo.category = 'canvas-operation';

        if (message.includes('memory') || message.includes('allocation')) {
            errorInfo.severity = 'high';
            errorInfo.requiresDialog = true;
            errorInfo.userMessage = 'Insufficient memory';
            errorInfo.technicalDetails = `The canvas operation requires more memory than available. Large canvas sizes or complex operations may exceed browser limits.`;
            errorInfo.suggestions = [
                'Reduce canvas size',
                'Close other browser tabs to free memory',
                'Restart the browser and try again'
            ];
            errorInfo.actions = [
                { label: 'Reduce Canvas Size', action: 'resize-canvas' },
                { label: 'Clear Undo History', action: 'clear-history' }
            ];
        } else if (message.includes('resize') || message.includes('dimensions')) {
            errorInfo.userMessage = 'Invalid canvas dimensions';
            errorInfo.technicalDetails = `The specified canvas dimensions are invalid or exceed supported limits.`;
            errorInfo.suggestions = [
                'Use dimensions between 1x1 and 4096x4096 pixels',
                'Check that width and height are positive numbers',
                'Try smaller dimensions for better performance'
            ];
            errorInfo.actions = [
                { label: 'Try Smaller Size', action: 'suggest-size' },
                { label: 'Use Default Size', action: 'default-size' }
            ];
        }

        return errorInfo;
    }

    categorizeToolError(errorInfo) {
        errorInfo.category = 'tool-operation';
        errorInfo.userMessage = 'Tool operation failed';
        errorInfo.technicalDetails = `An error occurred while using the current tool.`;
        errorInfo.suggestions = [
            'Try switching to a different tool and back',
            'Check if you have an active selection or layer',
            'Refresh the page if the issue persists'
        ];
        errorInfo.actions = [
            { label: 'Reset Tool', action: 'reset-tool' },
            { label: 'Try Again', action: 'retry-operation' }
        ];

        return errorInfo;
    }

    categorizeSystemError(errorInfo) {
        const { message } = errorInfo.originalError;
        
        errorInfo.category = 'system-operation';
        errorInfo.severity = 'high';
        errorInfo.requiresDialog = true;

        if (message.includes('quota') || message.includes('storage')) {
            errorInfo.userMessage = 'Storage limit exceeded';
            errorInfo.technicalDetails = `BitsDraw has reached the browser's storage limit and cannot save data.`;
            errorInfo.suggestions = [
                'Clear browser storage for this site',
                'Delete old projects or patterns',
                'Use export features to backup important work'
            ];
            errorInfo.actions = [
                { label: 'Clear Storage', action: 'clear-storage' },
                { label: 'Export Projects', action: 'export-all' }
            ];
        }

        return errorInfo;
    }

    categorizeGenericError(errorInfo) {
        errorInfo.category = 'general';
        errorInfo.userMessage = 'An unexpected error occurred';
        errorInfo.technicalDetails = `BitsDraw encountered an unexpected problem. This may be due to a temporary issue or browser compatibility.`;
        errorInfo.suggestions = [
            'Try refreshing the page',
            'Check browser console for more details',
            'Report this issue if it continues to occur'
        ];
        errorInfo.actions = [
            { label: 'Refresh Page', action: 'refresh-page' },
            { label: 'Report Issue', action: 'report-error' }
        ];

        return errorInfo;
    }

    /**
     * Show enhanced error notification
     */
    showErrorNotification(errorInfo) {
        const message = errorInfo.userMessage || errorInfo.message;
        this.app.showNotification(message, 'error');
    }

    /**
     * Show detailed error dialog
     */
    showErrorDialog(errorInfo) {
        this.populateErrorDialog(errorInfo);
        const dialog = document.getElementById('error-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }

    populateErrorDialog(errorInfo) {
        // Update dialog content
        document.getElementById('error-title').textContent = errorInfo.userMessage;
        document.getElementById('error-message').textContent = errorInfo.technicalDetails;
        
        // Update suggestions list
        const suggestionsList = document.getElementById('error-suggestions');
        suggestionsList.innerHTML = '';
        errorInfo.suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.textContent = suggestion;
            suggestionsList.appendChild(li);
        });

        // Update action buttons
        const actionsContainer = document.getElementById('error-actions');
        actionsContainer.innerHTML = '';
        errorInfo.actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.label;
            button.className = 'error-action-btn';
            button.onclick = () => this.executeErrorAction(action.action, errorInfo);
            actionsContainer.appendChild(button);
        });

        // Update technical details (collapsible)
        document.getElementById('error-technical-details').textContent = 
            `Error ID: ${errorInfo.id}\nTime: ${new Date(errorInfo.timestamp).toLocaleString()}\nCategory: ${errorInfo.category}\nOriginal Error: ${errorInfo.message}`;
    }

    executeErrorAction(actionType, errorInfo) {
        switch (actionType) {
            case 'retry-import':
                document.getElementById('file-input').click();
                break;
            case 'retry-export':
                // Retry last export operation
                break;
            case 'show-format-help':
                this.showFormatHelp();
                break;
            case 'resize-help':
                this.showResizeHelp();
                break;
            case 'refresh-page':
                if (confirm('This will refresh the page and you may lose unsaved work. Continue?')) {
                    location.reload();
                }
                break;
            case 'report-error':
                this.showErrorReporting(errorInfo);
                break;
            case 'resize-canvas':
                this.app.dialogs.showCanvasResizeDialog();
                break;
            case 'clear-history':
                this.app.editor.clearUndoHistory();
                this.app.showNotification('Undo history cleared', 'success');
                break;
            case 'reset-tool':
                this.app.selectTool('brush');
                break;
            case 'clear-storage':
                this.showStorageClearDialog();
                break;
        }
        
        // Close error dialog
        this.hideErrorDialog();
    }

    showFormatHelp() {
        const helpText = `
BitsDraw supports the following image formats for import:
• PNG (recommended for crisp graphics)
• JPG/JPEG (photos and gradients)
• GIF (simple graphics and animations)
• BMP (Windows bitmap)
• WEBP (modern web format)
• ICO (icon files)

For best results, use PNG format with clear, high-contrast images.
        `;
        this.app.showNotification(helpText, 'info');
    }

    showResizeHelp() {
        const helpText = `
To resize large images:
1. Use online tools like TinyPNG or Squoosh
2. Recommended max size: 2048x2048 pixels
3. For pixel art: use nearest-neighbor scaling
4. For photos: use high-quality resizing algorithms
        `;
        this.app.showNotification(helpText, 'info');
    }

    showStorageClearDialog() {
        if (confirm('Clear all saved data? This will remove saved projects, patterns, and preferences. This action cannot be undone.')) {
            try {
                localStorage.clear();
                this.app.showNotification('Storage cleared successfully', 'success');
            } catch (error) {
                this.app.showNotification('Failed to clear storage', 'error');
            }
        }
    }

    hideErrorDialog() {
        const dialog = document.getElementById('error-dialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    /**
     * Setup error dialog HTML
     */
    setupErrorDialog() {
        if (document.getElementById('error-dialog')) return;

        const dialogHTML = `
            <div class="dialog-overlay" id="error-dialog" style="display: none">
                <div class="dialog error-dialog">
                    <div class="dialog-header">
                        <h3 id="error-title">Error</h3>
                        <button class="dialog-close" id="error-close-btn">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>
                    <div class="dialog-content">
                        <div class="error-content">
                            <div class="error-icon">
                                <i class="ph ph-warning-circle"></i>
                            </div>
                            <div class="error-details">
                                <p id="error-message" class="error-message"></p>
                                
                                <div class="error-suggestions">
                                    <h4>Suggestions:</h4>
                                    <ul id="error-suggestions"></ul>
                                </div>
                                
                                <div class="error-actions" id="error-actions">
                                    <!-- Action buttons will be populated here -->
                                </div>
                                
                                <details class="technical-details">
                                    <summary>Technical Details</summary>
                                    <pre id="error-technical-details"></pre>
                                </details>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="btn btn-secondary" id="error-dismiss-btn">Dismiss</button>
                        <button class="btn btn-primary" id="error-report-btn">Report Issue</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        // Setup event listeners
        document.getElementById('error-close-btn').addEventListener('click', () => this.hideErrorDialog());
        document.getElementById('error-dismiss-btn').addEventListener('click', () => this.hideErrorDialog());
        document.getElementById('error-report-btn').addEventListener('click', () => this.showErrorReporting());

        // Close on backdrop click
        document.getElementById('error-dialog').addEventListener('click', (e) => {
            if (e.target.id === 'error-dialog') {
                this.hideErrorDialog();
            }
        });
    }

    /**
     * Setup error reporting system
     */
    setupErrorReporting() {
        // This would typically integrate with a service like Sentry, LogRocket, etc.
        // For now, we'll provide a simple reporting mechanism
    }

    showErrorReporting(errorInfo = null) {
        const reportData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorHistory: this.errorHistory.slice(-5), // Last 5 errors
            currentError: errorInfo
        };

        const reportText = JSON.stringify(reportData, null, 2);
        
        // For now, copy to clipboard and show GitHub issues link
        navigator.clipboard.writeText(reportText).then(() => {
            this.app.showNotification('Error details copied to clipboard', 'success');
            setTimeout(() => {
                window.open('https://github.com/anthropics/claude-code/issues', '_blank');
            }, 1000);
        }).catch(() => {
            // Fallback: show in a dialog
            alert('Please copy this error report and paste it in a GitHub issue:\n\n' + reportText);
        });
    }

    /**
     * Log error to history
     */
    logError(errorInfo) {
        this.errorHistory.push(errorInfo);
        
        // Keep history size manageable
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }

        // Log to console in development
        if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
            console.group(`🔴 BitsDraw Error [${errorInfo.category}]`);
            console.error('Original Error:', errorInfo.originalError);
            console.log('Error Info:', errorInfo);
            console.groupEnd();
        }
    }

    generateErrorId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Validation helper methods
     */
    validateCanvasSize(width, height) {
        const errors = [];
        
        if (!width || !height) {
            errors.push('Width and height are required');
        }
        
        if (width < 1 || height < 1) {
            errors.push('Width and height must be at least 1 pixel');
        }
        
        if (width > 4096 || height > 4096) {
            errors.push('Width and height cannot exceed 4096 pixels');
        }
        
        const totalPixels = width * height;
        if (totalPixels > 16777216) { // 4096x4096
            errors.push('Total canvas area is too large (may cause performance issues)');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: totalPixels > 1048576 ? ['Large canvas size may impact performance'] : []
        };
    }

    validateImageFile(file) {
        const errors = [];
        const warnings = [];
        
        const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp', 'image/x-icon'];
        
        if (!supportedTypes.includes(file.type)) {
            errors.push(`File type "${file.type}" is not supported`);
        }
        
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            errors.push('File size is too large (maximum 50MB)');
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            warnings.push('Large file size may take longer to process');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    /**
     * Enhanced error methods for common operations
     */
    handleFileImportError(error, file = null) {
        return this.handleError(error, {
            operation: 'file-import',
            file: file,
            timestamp: Date.now()
        });
    }

    handleFileExportError(error, format = null) {
        return this.handleError(error, {
            operation: 'file-export',
            format: format,
            timestamp: Date.now()
        });
    }

    handleCanvasError(error, operation = null) {
        return this.handleError(error, {
            operation: 'canvas-operation',
            canvasOperation: operation,
            canvasSize: `${this.app.editor.width}x${this.app.editor.height}`,
            timestamp: Date.now()
        });
    }

    handleToolError(error, tool = null) {
        return this.handleError(error, {
            operation: 'tool-operation',
            tool: tool || this.app.currentTool,
            timestamp: Date.now()
        });
    }

    handleSystemError(error, system = null) {
        return this.handleError(error, {
            operation: 'system-operation',
            system: system,
            timestamp: Date.now()
        });
    }
}