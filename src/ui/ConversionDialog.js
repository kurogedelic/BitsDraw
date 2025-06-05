/**
 * ConversionDialog - User interface for cross-mode conversions
 * 
 * Provides intuitive dialog for selecting and configuring conversions
 * for Canvas view operations
 */
class ConversionDialog {
    constructor(conversionManager) {
        this.conversionManager = conversionManager;
        this.dialog = null;
        this.currentOperation = null;
        this.isVisible = false;
    }

    /**
     * Show conversion dialog
     * @param {string} sourceMode Current view mode
     */
    show(sourceMode = 'canvas') {
        if (this.isVisible) {
            this.hide();
        }
        
        this.createDialog(sourceMode);
        this.isVisible = true;
        
        // Add to DOM
        document.body.appendChild(this.dialog);
        
        // Focus first interactive element
        const firstButton = this.dialog.querySelector('button');
        if (firstButton) {
            firstButton.focus();
        }
    }

    /**
     * Hide conversion dialog
     */
    hide() {
        if (this.dialog && this.dialog.parentNode) {
            this.dialog.parentNode.removeChild(this.dialog);
        }
        this.dialog = null;
        this.currentOperation = null;
        this.isVisible = false;
    }

    /**
     * Create dialog DOM structure
     * @param {string} sourceMode Source mode
     */
    createDialog(sourceMode) {
        // Create dialog overlay
        this.dialog = document.createElement('div');
        this.dialog.className = 'dialog-overlay conversion-dialog';
        this.dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // Create dialog content
        const content = document.createElement('div');
        content.className = 'dialog conversion-dialog-content';
        content.style.cssText = `
            background: var(--bg-secondary);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 600px;
            max-height: 70vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        
        // Dialog header
        const header = this.createHeader();
        content.appendChild(header);
        
        // Dialog body
        const body = this.createBody(sourceMode);
        content.appendChild(body);
        
        // Dialog footer
        const footer = this.createFooter();
        content.appendChild(footer);
        
        this.dialog.appendChild(content);
        
        // Close on overlay click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.hide();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Create dialog header
     * @returns {HTMLElement} Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'dialog-header';
        header.style.cssText = `
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-primary);
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Smart Conversions';
        title.style.cssText = `
            margin: 0;
            font-size: 16px;
            color: var(--text-primary);
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'dialog-close';
        closeBtn.innerHTML = '<i class="ph ph-x"></i>';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 16px;
        `;
        closeBtn.addEventListener('click', () => this.hide());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        return header;
    }

    /**
     * Create dialog body
     * @param {string} sourceMode Source mode
     * @returns {HTMLElement} Body element
     */
    createBody(sourceMode) {
        const body = document.createElement('div');
        body.className = 'dialog-body';
        body.style.cssText = `
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        `;
        
        // Mode selector
        const modeSelector = this.createModeSelector(sourceMode);
        body.appendChild(modeSelector);
        
        // Conversion options
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'conversion-options';
        optionsContainer.style.cssText = `
            margin-top: 20px;
        `;
        body.appendChild(optionsContainer);
        
        // Load initial options
        this.loadConversionOptions(sourceMode, optionsContainer);
        
        return body;
    }

    /**
     * Create mode selector
     * @param {string} currentMode Current mode
     * @returns {HTMLElement} Mode selector
     */
    createModeSelector(currentMode) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-bottom: 16px;
        `;
        
        const label = document.createElement('label');
        label.textContent = 'Convert from:';
        label.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--text-primary);
        `;
        
        const select = document.createElement('select');
        select.id = 'mode-selector';
        select.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border-primary);
            border-radius: 4px;
            background: var(--bg-secondary);
            font-size: 14px;
        `;
        
        // Mode options
        const modes = [
            { value: 'canvas', label: 'Canvas View (Layers)', icon: 'ph-stack' }
        ];
        
        modes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode.value;
            option.textContent = mode.label;
            option.selected = mode.value === currentMode;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const optionsContainer = document.getElementById('conversion-options');
            this.loadConversionOptions(e.target.value, optionsContainer);
        });
        
        container.appendChild(label);
        container.appendChild(select);
        
        return container;
    }

    /**
     * Load conversion options for selected mode
     * @param {string} sourceMode Source mode
     * @param {HTMLElement} container Options container
     */
    loadConversionOptions(sourceMode, container) {
        container.innerHTML = '';
        
        const conversions = this.conversionManager.getAvailableConversions()[sourceMode] || [];
        
        if (conversions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="ph ph-info" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <div>No conversions available for this mode</div>
                </div>
            `;
            return;
        }
        
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 12px;
        `;
        
        conversions.forEach(conversion => {
            const card = this.createConversionCard(conversion);
            grid.appendChild(card);
        });
        
        container.appendChild(grid);
    }

    /**
     * Create conversion option card
     * @param {object} conversion Conversion definition
     * @returns {HTMLElement} Conversion card
     */
    createConversionCard(conversion) {
        const card = document.createElement('div');
        card.className = 'conversion-card';
        card.style.cssText = `
            border: 2px solid var(--border-primary);
            border-radius: 6px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: var(--bg-secondary);
        `;
        
        const icon = document.createElement('i');
        icon.className = `ph ${conversion.icon}`;
        icon.style.cssText = `
            font-size: 24px;
            color: var(--accent-color);
            margin-bottom: 8px;
            display: block;
        `;
        
        const title = document.createElement('h4');
        title.textContent = conversion.name;
        title.style.cssText = `
            margin: 0 0 4px 0;
            font-size: 14px;
            color: var(--text-primary);
        `;
        
        const description = document.createElement('p');
        description.textContent = conversion.description;
        description.style.cssText = `
            margin: 0;
            font-size: 12px;
            color: var(--text-secondary);
            line-height: 1.4;
        `;
        
        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(description);
        
        // Hover effects
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'var(--accent-color)';
            card.style.background = 'var(--bg-accent)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'var(--border-primary)';
            card.style.background = 'var(--bg-secondary)';
        });
        
        // Click handler
        card.addEventListener('click', () => {
            this.selectConversion(conversion);
        });
        
        return card;
    }

    /**
     * Select conversion and show options
     * @param {object} conversion Selected conversion
     */
    selectConversion(conversion) {
        this.currentOperation = conversion;
        
        // Clear existing options
        const container = document.getElementById('conversion-options');
        container.innerHTML = '';
        
        // Show conversion form
        const form = this.createConversionForm(conversion);
        container.appendChild(form);
        
        // Update footer to show execute button
        this.updateFooter(true);
    }

    /**
     * Create conversion configuration form
     * @param {object} conversion Conversion definition
     * @returns {HTMLElement} Form element
     */
    createConversionForm(conversion) {
        const form = document.createElement('div');
        form.className = 'conversion-form';
        form.style.cssText = `
            background: var(--bg-tertiary);
            border-radius: 6px;
            padding: 16px;
        `;
        
        // Back button
        const backBtn = document.createElement('button');
        backBtn.innerHTML = '<i class="ph ph-arrow-left"></i> Back to options';
        backBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--accent-color);
            cursor: pointer;
            margin-bottom: 16px;
            font-size: 12px;
        `;
        backBtn.addEventListener('click', () => {
            const sourceMode = document.getElementById('mode-selector').value;
            this.loadConversionOptions(sourceMode, document.getElementById('conversion-options'));
            this.updateFooter(false);
        });
        form.appendChild(backBtn);
        
        // Conversion title
        const title = document.createElement('h4');
        title.textContent = conversion.name;
        title.style.cssText = `
            margin: 0 0 12px 0;
            color: var(--text-primary);
        `;
        form.appendChild(title);
        
        // Create specific form fields based on conversion type
        const fields = this.createFormFields(conversion.id);
        form.appendChild(fields);
        
        return form;
    }

    /**
     * Create form fields for specific conversion
     * @param {string} conversionId Conversion identifier
     * @returns {HTMLElement} Form fields container
     */
    createFormFields(conversionId) {
        const container = document.createElement('div');
        
        switch (conversionId) {
            case 'canvas_to_animation':
                container.appendChild(this.createNumberField('frameCount', 'Number of frames:', 10, 1, 100));
                container.appendChild(this.createSelectField('copyMode', 'Frame content:', [
                    { value: 'duplicate', label: 'Copy current canvas' },
                    { value: 'empty', label: 'Create empty frames' }
                ], 'duplicate'));
                break;
                
            case 'duplicate_layers':
                container.appendChild(this.createNumberField('offset', 'Layer offset:', 1, 1, 10));
                container.appendChild(this.createNumberField('count', 'Number of copies:', 1, 1, 10));
                break;
                
            case 'reverse_animation':
                container.appendChild(this.createFrameRangeSelector());
                break;
                
            default:
                const info = document.createElement('p');
                info.textContent = 'This conversion will use default settings.';
                info.style.cssText = 'color: var(--text-secondary); font-size: 12px; margin: 0;';
                container.appendChild(info);
        }
        
        return container;
    }

    /**
     * Create number input field
     * @param {string} id Field ID
     * @param {string} label Field label
     * @param {number} defaultValue Default value
     * @param {number} min Minimum value
     * @param {number} max Maximum value
     * @returns {HTMLElement} Field element
     */
    createNumberField(id, label, defaultValue, min, max) {
        const field = document.createElement('div');
        field.style.cssText = 'margin-bottom: 12px;';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            color: var(--text-secondary);
        `;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.id = id;
        input.value = defaultValue;
        input.min = min;
        input.max = max;
        input.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--border-primary);
            border-radius: 3px;
            background: var(--bg-secondary);
            font-size: 12px;
        `;
        
        field.appendChild(labelEl);
        field.appendChild(input);
        
        return field;
    }

    /**
     * Create select field
     * @param {string} id Field ID
     * @param {string} label Field label
     * @param {Array} options Option objects
     * @param {string} defaultValue Default value
     * @returns {HTMLElement} Field element
     */
    createSelectField(id, label, options, defaultValue) {
        const field = document.createElement('div');
        field.style.cssText = 'margin-bottom: 12px;';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 4px;
            font-size: 12px;
            color: var(--text-secondary);
        `;
        
        const select = document.createElement('select');
        select.id = id;
        select.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            border: 1px solid var(--border-primary);
            border-radius: 3px;
            background: var(--bg-secondary);
            font-size: 12px;
        `;
        
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            optionEl.selected = option.value === defaultValue;
            select.appendChild(optionEl);
        });
        
        field.appendChild(labelEl);
        field.appendChild(select);
        
        return field;
    }


    /**
     * Create frame range selector
     * @returns {HTMLElement} Frame range selector
     */
    createFrameRangeSelector() {
        const container = document.createElement('div');
        
        const startField = this.createNumberField('startFrame', 'Start frame:', 0, 0, 1000);
        const endField = this.createNumberField('endFrame', 'End frame (leave empty for all):', '', 0, 1000);
        
        container.appendChild(startField);
        container.appendChild(endField);
        
        return container;
    }

    /**
     * Create dialog footer
     * @returns {HTMLElement} Footer element
     */
    createFooter() {
        const footer = document.createElement('div');
        footer.className = 'dialog-footer';
        footer.id = 'dialog-footer';
        footer.style.cssText = `
            padding: 16px 20px;
            border-top: 1px solid var(--border-primary);
            background: var(--bg-tertiary);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            border: 1px solid var(--border-primary);
            border-radius: 4px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 12px;
        `;
        cancelBtn.addEventListener('click', () => this.hide());
        
        footer.appendChild(cancelBtn);
        
        return footer;
    }

    /**
     * Update footer with execute button
     * @param {boolean} showExecute Whether to show execute button
     */
    updateFooter(showExecute) {
        const footer = document.getElementById('dialog-footer');
        
        // Remove existing execute button
        const existingExecute = footer.querySelector('.execute-btn');
        if (existingExecute) {
            existingExecute.remove();
        }
        
        if (showExecute) {
            const executeBtn = document.createElement('button');
            executeBtn.className = 'execute-btn';
            executeBtn.textContent = 'Execute Conversion';
            executeBtn.style.cssText = `
                padding: 8px 16px;
                border: 1px solid var(--accent-color);
                border-radius: 4px;
                background: var(--accent-color);
                color: white;
                cursor: pointer;
                font-size: 12px;
            `;
            executeBtn.addEventListener('click', () => this.executeConversion());
            
            // Insert before cancel button
            const cancelBtn = footer.querySelector('button');
            footer.insertBefore(executeBtn, cancelBtn);
        }
    }

    /**
     * Execute selected conversion
     */
    executeConversion() {
        if (!this.currentOperation) return;
        
        try {
            // Collect form data
            const options = this.collectFormData();
            
            // Validate
            const validation = this.conversionManager.validateConversion(this.currentOperation.id, options);
            if (!validation.valid) {
                alert('Validation errors:\n' + validation.errors.join('\n'));
                return;
            }
            
            // Show warnings if any
            if (validation.warnings.length > 0) {
                const proceed = confirm('Warnings:\n' + validation.warnings.join('\n') + '\n\nProceed anyway?');
                if (!proceed) return;
            }
            
            // Execute conversion
            const result = this.conversionManager.executeConversion(this.currentOperation.id, options);
            
            if (result.success) {
                // Show success message
                alert(result.message);
                
                // Switch to suggested view if provided
                if (result.suggestedView && this.conversionManager.legacyAdapter) {
                    switch (result.suggestedView) {
                        case 'canvas':
                            this.conversionManager.legacyAdapter.switchToCanvasView();
                            break;
                    }
                }
                
                this.hide();
            } else {
                alert('Conversion failed: ' + result.message);
            }
            
        } catch (error) {
            console.error('Conversion error:', error);
            alert('Conversion failed: ' + error.message);
        }
    }

    /**
     * Collect form data from current form
     * @returns {object} Form data object
     */
    collectFormData() {
        const options = {};
        
        // Collect all input values
        const inputs = this.dialog.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.id) {
                let value = input.value;
                
                // Parse special fields
                if (input.type === 'number') {
                    value = value ? parseInt(value) : null;
                }
                
                options[input.id] = value;
            }
        });
        
        return options;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversionDialog;
}