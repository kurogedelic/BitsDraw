/**
 * Tool Manager - Handles tool selection and tool-specific functionality
 */
class ToolManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.setupToolEvents();
        this.setupToolOptions();
    }

    setupToolEvents() {
        const tools = ['brush', 'pencil', 'bucket', 'select-rect', 'select-circle', 
                      'line', 'text', 'rect', 'circle', 'spray'];
        
        tools.forEach(tool => {
            const btn = document.getElementById(`${tool}-tool`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.setTool(tool);
                });
            }
        });

        // Shape options
        document.getElementById('draw-border').addEventListener('change', (e) => {
            this.app.drawBorder = e.target.checked;
        });

        document.getElementById('draw-fill').addEventListener('change', (e) => {
            this.app.drawFill = e.target.checked;
        });
    }

    setupToolOptions() {
        // Brush size
        const brushSizeSlider = document.getElementById('brush-size');
        const brushSizeValue = document.getElementById('brush-size-value');
        brushSizeSlider.addEventListener('input', (e) => {
            this.app.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.app.brushSize;
            this.app.updateBrushCursorSize();
        });

        // Spray radius
        const sprayRadiusSlider = document.getElementById('spray-radius');
        const sprayRadiusValue = document.getElementById('spray-radius-value');
        sprayRadiusSlider.addEventListener('input', (e) => {
            this.app.sprayRadius = parseInt(e.target.value);
            sprayRadiusValue.textContent = this.app.sprayRadius;
        });

        // Spray density
        const sprayDensitySlider = document.getElementById('spray-density');
        const sprayDensityValue = document.getElementById('spray-density-value');
        sprayDensitySlider.addEventListener('input', (e) => {
            this.app.sprayDensity = parseInt(e.target.value) / 100;
            sprayDensityValue.textContent = e.target.value;
        });

        // Selection controls
        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.app.selection = null;
            this.app.editor.redraw();
        });

        document.getElementById('select-all-btn').addEventListener('click', () => {
            this.app.selectAll();
        });
    }

    setTool(tool) {
        this.app.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-icon').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${tool}-tool`).classList.add('active');
        
        // Update cursor
        this.app.canvas.className = '';
        if (tool === 'bucket') {
            this.app.canvas.classList.add('bucket-cursor');
        }
        
        // Update brush cursor visibility
        if (tool === 'brush') {
            this.app.updateBrushCursorSize();
        } else {
            this.app.hideBrushCursor();
        }
        
        // Clear selection when switching tools (except for selection tools)
        if (!['select-rect', 'select-circle'].includes(tool)) {
            this.app.selection = null;
            this.app.selectionAnimationRunning = false;
            this.app.editor.redraw();
        }
        
        // Hide text balloon if switching away from text tool
        if (tool !== 'text') {
            this.app.hideTextBalloon();
        }
        
        // Update tool options display
        this.updateToolOptions(tool);
    }

    updateToolOptions(tool) {
        // Hide all option sections
        document.querySelectorAll('.option-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show project options by default
        document.getElementById('project-options').style.display = 'block';

        // Show relevant options based on tool
        switch(tool) {
            case 'brush':
                document.getElementById('pencil-options').style.display = 'block';
                break;
            case 'pencil':
                // Pencil has no options - simple 1-pixel tool
                break;
            case 'rect':
            case 'circle':
                document.getElementById('shape-options').style.display = 'block';
                break;
            case 'spray':
                document.getElementById('spray-options').style.display = 'block';
                break;
            case 'select-rect':
            case 'select-circle':
                document.getElementById('selection-options').style.display = 'block';
                break;
            case 'text':
                document.getElementById('text-options').style.display = 'block';
                break;
            case 'bucket':
                document.getElementById('bucket-options').style.display = 'block';
                break;
            default:
                document.getElementById('no-options').style.display = 'block';
                break;
        }
    }
}