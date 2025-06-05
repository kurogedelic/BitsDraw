// Debug utility - automatically detects dev vs production
const DEBUG = {
    // Auto-detect development environment
    isDev: () => {
        return (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '' ||
            window.location.port !== '' ||
            window.location.protocol === 'file:'
        );
    },
    
    // Debug logging that only shows in development
    log: (...args) => {
        if (DEBUG.isDev()) {
            console.log(...args);
        }
    },
    
    warn: (...args) => {
        if (DEBUG.isDev()) {
            console.warn(...args);
        }
    },
    
    error: (...args) => {
        // Always show errors, even in production
        console.error(...args);
    },
    
    info: (...args) => {
        if (DEBUG.isDev()) {
            console.info(...args);
        }
    }
};

class BitsDraw {
    constructor() {
        this.canvas = document.getElementById('bitmap-canvas');
        this.editor = new OptimizedBitmapEditor(this.canvas, 128, 64);
        this.previewCanvas = document.getElementById('preview-canvas');
        
        
        // Initialize CanvasUnit system (Phase 1)
        try {
            if (typeof LegacyAdapter !== 'undefined') {
                this.legacyAdapter = new LegacyAdapter(this);
                this.unitManager = this.legacyAdapter.getUnitManager();
                DEBUG.log('CanvasUnit system initialized successfully');
            } else {
                DEBUG.warn('LegacyAdapter not available, running in legacy mode only');
                this.legacyAdapter = null;
                this.unitManager = null;
            }
        } catch (error) {
            console.error('Failed to initialize CanvasUnit system:', error);
            this.legacyAdapter = null;
            this.unitManager = null;
        }
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.startPos = null;
        this.drawBorder = true;
        this.drawFill = false;
        this.currentPattern = 'solid-black';
        this.selection = null;
        this.showGrid = false;
        this.showCheckerboard = true; // Default to showing checkerboard
        this.showGuides = true;
        this.selectionClipboard = null;
        this.isDraggingSelection = false;
        this.isDraggingSelectionGraphics = false;
        this.selectionDragStart = null;
        this.previewOverlay = null;
        this.textBalloonPos = null;
        this.brushSize = 2;
        this.eraserSize = 2;
        this.eraserSmooth = true;
        this.sprayRadius = 8;
        this.sprayDensity = 0.6;
        this.blurSize = 3;
        this.circleDrawBorder = true;
        this.circleDrawFill = false;
        this.blurDitherMethod = 'Bayer4x4';
        this.blurAlphaChannel = true;
        this.currentDisplayMode = 'white';
        this.moveLoop = true;
        
        // Guides system
        this.guides = [];
        this.activeGuideId = null;
        this.guideColors = ['#ff0000', '#0088ff', '#00ff00', '#ff8800', '#ff00ff', '#00ffff', '#ffff00', '#8800ff'];
        this.guideColorIndex = 0;
        this.guideSnap = true;
        this.isDraggingGuide = false;
        this.isResizingGuide = false;
        this.draggedGuideId = null;
        this.guideDragStart = null;
        this.guideResizeDirection = null;
        
        // Smooth drawing state
        this.smoothDrawing = true;
        this.strokePoints = [];
        this.lastDrawPoint = null;
        this.strokeStartTime = 0;
        
        // Dithering effects
        this.ditheringEffects = new DitheringEffects();
        this.ditheringData = {
            originalPixels: null,
            previewPixels: null,
            alpha: 1.0,
            method: 'Bayer4x4'
        };
        
        // Canvas panning state
        this.isPanning = false;
        this.panStart = null;
        this.canvasOffset = { x: 0, y: 0 };
        
        // Modifier key tracking
        this.shiftPressed = false;
        this.altPressed = false;
        
        // Display mode color sets
        this.displayModes = {
            'black': {
                name: 'Black',
                draw_color: '#FFFFFF',
                background_color: '#000000'
            },
            'white': {
                name: 'White',
                draw_color: '#000000',
                background_color: '#FFFFFF'
            },
            'lcd-classic': {
                name: 'LCD Classic',
                draw_color: '#383C2E',
                background_color: '#E9FCD7'
            },
            'lcd-inverted': {
                name: 'LCD Inverted',
                draw_color: '#E9FCD7',
                background_color: '#383C2E'
            },
            'night-blue': {
                name: 'Night Blue',
                draw_color: '#BFD8FF',
                background_color: '#0A0F2C'
            },
            'night-green': {
                name: 'Night Green',
                draw_color: '#B5E853',
                background_color: '#001B00'
            },
            'amber': {
                name: 'Amber',
                draw_color: '#FFB300',
                background_color: '#000000'
            },
            'terminal': {
                name: 'Terminal',
                draw_color: '#00FF00',
                background_color: '#000000'
            },
            'blue': {
                name: 'Blue',
                draw_color: '#44A8F0',
                background_color: '#000000'
            },
            'paper-white': {
                name: 'Paper White',
                draw_color: '#111111',
                background_color: '#F8F8F8'
            },
            'e-ink-gray': {
                name: 'E-Ink Gray',
                draw_color: '#333333',
                background_color: '#DDDDDD'
            },
            'playdate': {
                name: 'Playdate',
                draw_color: '#2e2d23',
                background_color: '#a3a298'
            }
        };
        
        this.initializeEventListeners();
        this.setupColorPalette();
        this.detectAndApplyPlatform();
        this.setupMenuBar();
        this.setupWindowManagement();
        this.setupPreview();
        this.setupLayers();
        this.setupTextBalloon();
        this.setupToolOptions();
        this.setupNewCanvasDialog();
        this.setupCppExportDialog();
        this.setupCppImportDialog();
        this.setupImageImportDialog();
        this.setupDitheringDialog();
        this.setupFileImport();
        this.setupDragAndDrop();
        this.setupGuidesPanel();
        this.loadWindowStates();
        
        // Initialize image placement dialog
        this.imagePlacementDialog = new ImagePlacementDialog(this);
        this.updateWindowMenu();
        this.updateOutput();
        this.setupBrushCursor();
        this.setupThemeManagement();
        
        // Initialize button states
        this.updateGridButton();
        this.updateCheckerboardDisplay();
        this.updateCheckerboardButton();
        this.updateGuidesButton();
        
        // Test ImageImporter availability
        if (typeof ImageImporter !== 'undefined') {
            DEBUG.log('ImageImporter is available');
        } else {
            DEBUG.error('ImageImporter is NOT available');
        }
        
        // Initialize display mode
        this.setDisplayMode('white');
        
        // Initialize tool options display
        this.updateToolOptions('brush');
        
        // Initialize canvas view
    }

    initializeEventListeners() {
        this.setupCanvasEvents();
        this.setupToolbarEvents();
        this.setupKeyboardShortcuts();
        this.setupWindowEvents();
    }

    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            // Handle middle mouse button for panning
            if (e.button === 1) { // Middle mouse button
                e.preventDefault();
                this.startPanning(e);
                return;
            }
            
            const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
            this.startPos = coords;
            
            // Check if clicking on existing selection for dragging
            if (this.selection && this.editor.isInSelection(coords.x, coords.y, this.selection)) {
                if (e.shiftKey) {
                    // Shift+drag = move selection graphics
                    this.isDraggingSelectionGraphics = true;
                } else {
                    // Normal drag = move selection bounds
                    this.isDraggingSelection = true;
                }
                this.selectionDragStart = coords;
                return;
            }
            
            if (this.currentTool === 'bucket') {
                this.handleCanvasClick(e);
            } else if (this.currentTool === 'hand') {
                this.startLayerDrag(e);
            } else if (this.currentTool === 'move') {
                this.startLayerMove(e);
            } else if (this.currentTool === 'guide') {
                this.startGuideCreation(e);
            } else if (['rect', 'circle', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                this.isDrawing = true;
            } else {
                this.isDrawing = true;
                if (this.currentTool === 'brush' || this.currentTool === 'eraser' || this.currentTool === 'blur' || this.currentTool === 'spray') {
                    this.hideBrushCursor();
                }
                this.handleCanvasClick(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.updatePanning(e);
            } else if (this.isDraggingLayer) {
                this.updateLayerDrag(e);
            } else if (this.isMovingLayer) {
                this.updateLayerMove(e);
            } else if (this.isCreatingGuide) {
                this.updateGuideCreation(e);
            } else if (this.isDraggingGuide) {
                this.updateGuideDrag(e);
            } else if (this.isDraggingSelection) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                this.updateSelectionPosition(coords);
            } else if (this.isDraggingSelectionGraphics) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                this.moveSelectionGraphics(coords);
            } else if (this.isDrawing) {
                if (this.currentTool === 'line' && this.startPos) {
                    const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                    this.drawLinePreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                } else if (this.currentTool === 'rect' && this.startPos) {
                    const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                    this.drawRectPreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                } else if (this.currentTool === 'circle' && this.startPos) {
                    const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                    this.drawCirclePreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                } else if (!['rect', 'circle', 'select-rect', 'select-circle', 'line'].includes(this.currentTool)) {
                    this.handleCanvasClick(e);
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.stopPanning();
            } else if (this.isDraggingLayer) {
                this.stopLayerDrag();
            } else if (this.isMovingLayer) {
                this.stopLayerMove();
            } else if (this.isCreatingGuide) {
                this.finishGuideCreation(e);
            } else if (this.isDraggingGuide) {
                this.stopGuideDrag(e);
            } else if (this.isDraggingSelection) {
                this.isDraggingSelection = false;
                this.selectionDragStart = null;
                this.editor.saveState();
            } else if (this.isDraggingSelectionGraphics) {
                this.isDraggingSelectionGraphics = false;
                this.selectionDragStart = null;
                this.editor.saveState();
            } else if (this.isDrawing && ['rect', 'circle', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                
                if (this.currentTool === 'rect') {
                    this.clearShapePreview();
                    this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, this.drawFill, false, this.currentPattern);
                    this.editor.saveState();
                    this.updateOutput();
                } else if (this.currentTool === 'circle') {
                    this.clearShapePreview();
                    const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
                        this.startPos.x, this.startPos.y, coords.x, coords.y, 
                        this.shiftPressed, this.altPressed
                    );
                    if (this.circleDrawBorder && !this.circleDrawFill) {
                        // Border only
                        this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, false, true, this.currentPattern);
                    } else if (this.circleDrawFill && !this.circleDrawBorder) {
                        // Fill only
                        this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern);
                    } else if (this.circleDrawBorder && this.circleDrawFill) {
                        // Both border and fill
                        this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern);
                    }
                    this.editor.saveState();
                    this.updateOutput();
                } else if (this.currentTool === 'line') {
                    this.clearLinePreview();
                    this.editor.drawLine(this.startPos.x, this.startPos.y, coords.x, coords.y, this.currentPattern);
                    this.editor.saveState();
                } else if (this.currentTool === 'select-rect') {
                    this.selection = this.editor.createSelection(this.startPos.x, this.startPos.y, coords.x, coords.y, 'rect');
                    this.drawSelectionOverlay();
                } else if (this.currentTool === 'select-circle') {
                    const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
                        this.startPos.x, this.startPos.y, coords.x, coords.y, 
                        this.shiftPressed, this.altPressed
                    );
                    // For now, use the smaller radius to maintain compatibility with circular selections
                    const radius = Math.min(radiusX, radiusY);
                    this.selection = this.editor.createCircleSelection(centerX, centerY, radius);
                    this.drawSelectionOverlay();
                }
            }
            
            this.isDrawing = false;
            if (this.currentTool === 'brush' || this.currentTool === 'eraser' || this.currentTool === 'blur' || this.currentTool === 'spray') {
                this.showBrushCursor();
            }
            this.updateOutput();
        });

        this.canvas.addEventListener('mouseleave', () => {
            // Don't stop drawing when leaving canvas - allow stroke continuation
            // Only hide brush cursor
            if (this.currentTool === 'pencil') {
                this.hideBrushCursor();
            }
        });

        // Add mousemove handler for cursor changes over guides
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'guide' && !this.isDraggingGuide && !this.isCreatingGuide) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                const guideAtPoint = this.getGuideAtPoint(coords.x, coords.y);
                
                if (guideAtPoint) {
                    this.canvas.style.cursor = 'move';
                } else {
                    this.canvas.style.cursor = 'crosshair';
                }
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Prevent middle mouse button default behavior (like auto-scroll)
        this.canvas.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e);
        });

        // Global mouse events for continuous stroke outside canvas and panning
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.updatePanning(e);
            } else if (this.isDrawing && ['brush', 'spray'].includes(this.currentTool)) {
                // Check if coordinates are within canvas bounds
                const rect = this.canvas.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right && 
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    // Mouse is back inside canvas, continue drawing
                    this.handleCanvasClick(e);
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.stopPanning();
            }
            this.isDrawing = false;
        });
    }

    setupToolbarEvents() {
        // Tool palette events
        const tools = ['brush', 'pencil', 'eraser', 'bucket', 'select-rect', 'select-circle', 
                      'move', 'line', 'text', 'rect', 'circle', 'spray', 'blur', 'guide', 'hand'];
        
        tools.forEach(tool => {
            const btn = document.getElementById(`${tool}-tool`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.setTool(tool);
                });
            }
        });

        // Draw mode checkboxes
        document.getElementById('draw-border').addEventListener('change', (e) => {
            this.drawBorder = e.target.checked;
        });

        document.getElementById('draw-fill').addEventListener('change', (e) => {
            this.drawFill = e.target.checked;
        });


        // Circle border and fill checkboxes
        document.getElementById('circle-draw-border').addEventListener('change', (e) => {
            this.circleDrawBorder = e.target.checked;
        });

        document.getElementById('circle-draw-fill').addEventListener('change', (e) => {
            this.circleDrawFill = e.target.checked;
        });

        // Move tool loop option
        document.getElementById('move-loop').addEventListener('change', (e) => {
            this.moveLoop = e.target.checked;
        });

        // Guide tool options
        document.getElementById('guide-snap').addEventListener('change', (e) => {
            this.guideSnap = e.target.checked;
        });

        // Zoom dropdown button
        document.getElementById('zoom-dropdown-btn').addEventListener('click', () => {
            this.showZoomDropdown();
        });

        document.getElementById('zoom-select').addEventListener('change', (e) => {
            const zoom = parseInt(e.target.value);
            this.setZoom(zoom);
            this.updateZoomDisplay();
        });

        // Display mode dropdown button  
        document.getElementById('display-dropdown-btn').addEventListener('click', () => {
            this.showDisplayModeDropdown();
        });

        document.getElementById('display-mode-select').addEventListener('change', (e) => {
            this.setDisplayMode(e.target.value);
            this.updateDisplayModeDisplay();
        });


        // Canvas controls
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoomIn();
        });


        document.getElementById('show-grid-btn').addEventListener('click', () => {
            this.showGrid = !this.showGrid;
            this.updateGridDisplay();
            this.updateGridButton();
        });

        document.getElementById('show-checkerboard-btn').addEventListener('click', () => {
            this.showCheckerboard = !this.showCheckerboard;
            this.updateCheckerboardDisplay();
            this.updateCheckerboardButton();
        });

        document.getElementById('show-guides-btn').addEventListener('click', () => {
            this.showGuides = !this.showGuides;
            this.renderGuides();
            this.updateGuidesButton();
        });

        // Selection controls
        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.selection = null;
            this.editor.redraw();
        });
    }


    setZoom(zoom) {
        this.editor.setZoom(zoom);
        this.updateGridDisplay();
        this.updateBrushCursorSize();
        this.renderGuides();
        
        // Update zoom select and display
        document.getElementById('zoom-select').value = zoom;
        this.updateZoomDisplay();
    }

    showZoomDropdown() {
        // Create custom dropdown
        this.showCustomDropdown('zoom-dropdown-btn', 'zoom-select');
    }

    showDisplayModeDropdown() {
        // Create custom dropdown with color previews
        this.showDisplayModeCustomDropdown('display-dropdown-btn', 'display-mode-select');
    }

    showDisplayModeCustomDropdown(buttonId, selectId) {
        const button = document.getElementById(buttonId);
        const select = document.getElementById(selectId);
        
        // Remove existing dropdown
        const existingDropdown = document.querySelector('.custom-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';
        
        // Position dropdown
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 2) + 'px';
        dropdown.style.minWidth = rect.width + 'px';
        
        // Add options with color previews
        Array.from(select.options).forEach(option => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            if (option.selected) item.classList.add('selected');
            
            // Create color preview container
            const colorPreview = document.createElement('div');
            colorPreview.style.cssText = `
                display: inline-flex;
                align-items: center;
                gap: 8px;
                width: 100%;
            `;
            
            // Create color boxes
            const colorBoxes = document.createElement('div');
            colorBoxes.style.cssText = `
                display: flex;
                align-items: center;
                width: 20px;
                height: 12px;
                border: 1px solid #ccc;
                border-radius: 2px;
                overflow: hidden;
                flex-shrink: 0;
            `;
            
            // Get display mode colors
            const displayMode = this.displayModes[option.value];
            if (displayMode) {
                // Background color (outer box)
                const bgBox = document.createElement('div');
                bgBox.style.cssText = `
                    width: 50%;
                    height: 100%;
                    background-color: ${displayMode.background_color};
                `;
                
                // Foreground color (inner box)
                const fgBox = document.createElement('div');
                fgBox.style.cssText = `
                    width: 50%;
                    height: 100%;
                    background-color: ${displayMode.draw_color};
                `;
                
                colorBoxes.appendChild(bgBox);
                colorBoxes.appendChild(fgBox);
            }
            
            // Create text label
            const textLabel = document.createElement('span');
            textLabel.textContent = option.textContent;
            textLabel.style.cssText = `
                flex: 1;
                margin-left: 8px;
            `;
            
            colorPreview.appendChild(colorBoxes);
            colorPreview.appendChild(textLabel);
            item.appendChild(colorPreview);
            
            item.addEventListener('click', () => {
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                dropdown.remove();
            });
            dropdown.appendChild(item);
        });
        
        document.body.appendChild(dropdown);
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    showCustomDropdown(buttonId, selectId) {
        const button = document.getElementById(buttonId);
        const select = document.getElementById(selectId);
        
        // Remove existing dropdown
        const existingDropdown = document.querySelector('.custom-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';
        
        // Position dropdown
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 2) + 'px';
        dropdown.style.minWidth = rect.width + 'px';
        
        // Add options
        Array.from(select.options).forEach(option => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            if (option.selected) item.classList.add('selected');
            item.textContent = option.textContent;
            item.addEventListener('click', () => {
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                dropdown.remove();
            });
            dropdown.appendChild(item);
        });
        
        document.body.appendChild(dropdown);
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    updateZoomDisplay() {
        const select = document.getElementById('zoom-select');
        const display = document.getElementById('zoom-current-value');
        display.textContent = select.options[select.selectedIndex].textContent;
    }

    updateDisplayModeDisplay() {
        const select = document.getElementById('display-mode-select');
        const previewIcon = document.getElementById('display-preview-icon');
        
        // Update preview icon with current display mode colors
        const displayMode = this.displayModes[this.currentDisplayMode];
        if (displayMode) {
            previewIcon.style.background = `linear-gradient(45deg, ${displayMode.background_color} 0%, ${displayMode.background_color} 40%, ${displayMode.draw_color} 60%, ${displayMode.draw_color} 100%)`;
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Track modifier keys globally
            this.shiftPressed = e.shiftKey;
            this.altPressed = e.altKey;
            
            // Skip if user is typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const isCtrl = e.ctrlKey;
            
            // File operations
            if (isCtrl && e.key === 'n') {
                e.preventDefault();
                this.showNewCanvasDialog();
            } else if (isCtrl && e.key === 's') {
                e.preventDefault();
                this.saveBitmapToStorage();
            } else if (isCtrl && e.key === 'o') {
                e.preventDefault();
                this.loadBitmapFromStorage();
            } else if (isCtrl && e.key === 'e') {
                e.preventDefault();
                this.exportCode();
            }
            // Edit operations
            else if (isCtrl && e.key === 'z') {
                e.preventDefault();
                if (this.editor.undo()) {
                    this.updateOutput();
                }
            } else if (isCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                if (this.editor.redo()) {
                    this.updateOutput();
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                // Only delete selection, not guides (guides deleted from panel)
                this.deleteSelection();
            } else if (isCtrl && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            } else if (isCtrl && e.key === 'c') {
                e.preventDefault();
                this.copySelection();
            } else if (isCtrl && e.key === 'v') {
                e.preventDefault();
                this.pasteSelection();
            } else if (isCtrl && e.key === 'x') {
                e.preventDefault();
                this.cutSelection();
            }
            // Tool shortcuts
            else if (e.key.toLowerCase() === 'b' && !isCtrl) {
                this.setTool('brush');
            } else if (e.key.toLowerCase() === 'p' && !isCtrl) {
                this.setTool('pencil');
            } else if (e.key.toLowerCase() === 'e' && !isCtrl) {
                this.setTool('eraser');
            } else if (e.key.toLowerCase() === 'f' && !isCtrl) {
                this.setTool('bucket');
            } else if (e.key.toLowerCase() === 'l' && !isCtrl) {
                this.setTool('line');
            } else if (e.key.toLowerCase() === 't' && !isCtrl) {
                this.setTool('text');
            } else if (e.key.toLowerCase() === 'r' && !isCtrl) {
                this.setTool('rect');
            } else if (e.key.toLowerCase() === 'c' && !isCtrl) {
                this.setTool('circle');
            } else if (e.key.toLowerCase() === 's' && !isCtrl) {
                this.setTool('spray');
            } else if (e.key.toLowerCase() === 'm' && !isCtrl) {
                this.setTool('select-rect');
            } else if (e.key.toLowerCase() === 'v' && !isCtrl) {
                this.setTool('move');
            } else if (e.key.toLowerCase() === 'h' && !isCtrl) {
                this.setTool('hand');
            } else if (e.key.toLowerCase() === 'u' && !isCtrl) {
                this.setTool('guide');
            }
            // View mode shortcuts
            else if (isCtrl && e.key === '1') {
                e.preventDefault();
                this.switchToCanvasView();
            }
            // View shortcuts
            else if (isCtrl && e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (isCtrl && e.key === '-') {
                e.preventDefault();
                this.zoomOut();
            } else if (isCtrl && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                const gridCheckbox = document.getElementById('show-grid');
                gridCheckbox.checked = !gridCheckbox.checked;
                this.showGrid = gridCheckbox.checked;
                this.updateGridDisplay();
            } else if (isCtrl && e.key === '0') {
                e.preventDefault();
                this.resetCanvasPan();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // Track modifier keys globally
            this.shiftPressed = e.shiftKey;
            this.altPressed = e.altKey;
        });
    }

    setupWindowEvents() {
        // Handle window resize to reposition guides
        window.addEventListener('resize', () => {
            setTimeout(() => this.renderGuides(), 0);
        });
        
        // Handle scroll to reposition guides  
        window.addEventListener('scroll', () => {
            this.renderGuides();
        });
        
        // Handle canvas window movement
        const canvasWindow = document.getElementById('canvas-window');
        if (canvasWindow) {
            const observer = new MutationObserver(() => {
                this.renderGuides();
            });
            observer.observe(canvasWindow, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        }
        
        // Handle global mouse events for guide dragging
        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingGuide || this.isResizingGuide) {
                this.updateGuideDrag(e);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.isDraggingGuide || this.isResizingGuide) {
                this.stopGuideDrag(e);
            }
        });
    }

    setupMenuBar() {
        const menuItems = document.querySelectorAll('.menu-item');
        const menuDropdowns = document.querySelectorAll('.menu-dropdown');
        let activeMenu = null;

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const menuName = item.dataset.menu;
                const dropdown = document.getElementById(`menu-${menuName}`);
                
                if (activeMenu === dropdown && dropdown.classList.contains('show')) {
                    this.hideAllMenus();
                    activeMenu = null;
                } else {
                    this.hideAllMenus();
                    this.showMenu(dropdown, item);
                    activeMenu = dropdown;
                }
            });
        });

        // Menu dropdown actions
        document.querySelectorAll('.menu-dropdown-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                console.log('Main.js menu action clicked:', action);
                
                // Special handling for import-image to maintain user gesture
                if (action === 'import-image') {
                    console.log('Creating temporary file input for import (main menu)');
                    
                    // Create a temporary, invisible but clickable file input
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/*';
                    tempInput.style.cssText = 'position: fixed; top: -100px; left: -100px; opacity: 0; width: 1px; height: 1px; z-index: 10000; pointer-events: auto;';
                    
                    // Add it to the body
                    document.body.appendChild(tempInput);
                    
                    // Set up the change handler
                    tempInput.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            DEBUG.log('File selected via temp input (main):', file.name);
                            try {
                                await this.handleImageFile(file);
                            } catch (error) {
                                console.error('Error handling image file:', error);
                                this.showNotification('Failed to import image: ' + error.message, 'error');
                            }
                        }
                        // Remove the temporary input
                        document.body.removeChild(tempInput);
                    };
                    
                    // Click it immediately
                    tempInput.click();
                    
                    this.hideAllMenus();
                    activeMenu = null;
                    return;
                }
                
                this.handleMenuAction(action);
                this.hideAllMenus();
                activeMenu = null;
            });
        });

        // Submenu handling with improved hover logic
        this.submenuTimeouts = new Map();
        
        document.querySelectorAll('.menu-dropdown-item.has-submenu').forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const submenu = document.getElementById(`submenu-${item.dataset.action}`);
                if (submenu) {
                    // Clear any pending hide timeouts
                    if (this.submenuTimeouts.has(submenu)) {
                        clearTimeout(this.submenuTimeouts.get(submenu));
                        this.submenuTimeouts.delete(submenu);
                    }
                    
                    // Hide other submenus
                    document.querySelectorAll('.menu-submenu').forEach(sm => {
                        if (sm !== submenu) {
                            sm.classList.remove('show');
                        }
                    });
                    
                    // Position and show this submenu
                    const rect = item.getBoundingClientRect();
                    const parentDropdown = item.closest('.menu-dropdown');
                    const parentRect = parentDropdown.getBoundingClientRect();
                    
                    // Position submenu right next to the dropdown
                    submenu.style.left = (parentRect.right - 2) + 'px';
                    submenu.style.top = rect.top + 'px';
                    submenu.classList.add('show');
                }
            });
        });

        // Handle submenu hover to keep it open
        document.querySelectorAll('.menu-submenu').forEach(submenu => {
            submenu.addEventListener('mouseenter', () => {
                // Clear any pending hide timeout for this submenu
                if (this.submenuTimeouts.has(submenu)) {
                    clearTimeout(this.submenuTimeouts.get(submenu));
                    this.submenuTimeouts.delete(submenu);
                }
            });
            
            submenu.addEventListener('mouseleave', () => {
                // Set timeout to hide submenu
                const timeout = setTimeout(() => {
                    submenu.classList.remove('show');
                    this.submenuTimeouts.delete(submenu);
                }, 150);
                this.submenuTimeouts.set(submenu, timeout);
            });
            
            // Handle submenu item clicks
            submenu.querySelectorAll('.menu-dropdown-item').forEach(subItem => {
                subItem.addEventListener('click', (e) => {
                    const action = subItem.dataset.action;
                    
                    // Special handling for import-image to maintain user gesture
                    if (action === 'import-image') {
                        console.log('Creating temporary file input for import');
                        
                        // Create a temporary, invisible but clickable file input
                        const tempInput = document.createElement('input');
                        tempInput.type = 'file';
                        tempInput.accept = 'image/*';
                        tempInput.style.cssText = 'position: fixed; top: -100px; left: -100px; opacity: 0; width: 1px; height: 1px; z-index: 10000; pointer-events: auto;';
                        
                        // Add it to the body
                        document.body.appendChild(tempInput);
                        
                        // Set up the change handler
                        tempInput.onchange = async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                DEBUG.log('File selected via temp input:', file.name);
                                try {
                                    await this.handleImageFile(file);
                                } catch (error) {
                                    console.error('Error handling image file:', error);
                                    this.showNotification('Failed to import image: ' + error.message, 'error');
                                }
                            }
                            // Remove the temporary input
                            document.body.removeChild(tempInput);
                        };
                        
                        // Cancel handler
                        tempInput.oncancel = () => {
                            console.log('File selection cancelled');
                            document.body.removeChild(tempInput);
                        };
                        
                        // Click it immediately
                        tempInput.click();
                        
                        this.hideAllMenus();
                        return;
                    }
                    
                    this.handleMenuAction(action);
                    this.hideAllMenus();
                });
            });
        });

        // Hide submenus when leaving the main dropdown
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            dropdown.addEventListener('mouseleave', (e) => {
                // Only hide if not moving to a submenu
                const relatedTarget = e.relatedTarget;
                const isMovingToSubmenu = relatedTarget && relatedTarget.closest('.menu-submenu');
                
                if (!isMovingToSubmenu) {
                    // Delay hiding to allow for mouse movement to submenu
                    setTimeout(() => {
                        // Check if mouse is still not over any submenu
                        const hoveredSubmenu = document.querySelector('.menu-submenu:hover');
                        if (!hoveredSubmenu) {
                            document.querySelectorAll('.menu-submenu').forEach(submenu => {
                                submenu.classList.remove('show');
                            });
                        }
                    }, 100);
                }
            });
        });

        // Hide menus when clicking outside
        document.addEventListener('click', () => {
            this.hideAllMenus();
            activeMenu = null;
        });
    }

    showMenu(dropdown, menuItem) {
        if (!dropdown) return;
        
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        menuItem.classList.add('active');
        
        const rect = menuItem.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = rect.bottom + 'px';
        dropdown.classList.add('show');
    }

    hideAllMenus() {
        // Clear all submenu timeouts
        if (this.submenuTimeouts) {
            this.submenuTimeouts.forEach(timeout => clearTimeout(timeout));
            this.submenuTimeouts.clear();
        }
        
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        document.querySelectorAll('.menu-submenu').forEach(submenu => {
            submenu.classList.remove('show');
        });
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    handleMenuAction(action) {
        const zoomSelect = document.getElementById('zoom-select');
        const zoomLevels = [1, 2, 4, 8, 16, 32];
        
        switch (action) {
            case 'new':
                this.showNewCanvasDialog();
                break;
            case 'save':
                this.saveBitmapToStorage();
                break;
            case 'open':
                this.loadBitmapFromStorage();
                break;
            case 'export-cpp':
                this.showCppExportDialog();
                break;
            case 'export-png':
                this.exportPNG();
                break;
            case 'import-image':
                console.log('Import image menu action triggered');
                this.showImageImportDialog();
                break;
            case 'import-cpp':
                this.showCppImportDialog();
                break;
            case 'undo':
                if (this.editor.undo()) {
                    this.updateOutput();
                }
                break;
            case 'redo':
                if (this.editor.redo()) {
                    this.updateOutput();
                }
                break;
            case 'clear-selection':
                this.selection = null;
                this.editor.redraw();
                break;
            case 'zoom-in':
                this.zoomIn();
                break;
            case 'zoom-out':
                this.zoomOut();
                break;
            case 'invert':
                this.cycleDisplayMode();
                break;
            case 'show-tools':
                this.toggleWindow('tools-window');
                break;
            case 'show-colors':
                this.toggleWindow('colors-window');
                break;
            case 'show-options':
                this.toggleWindow('options-window');
                break;
            case 'show-code':
                this.toggleWindow('code-window');
                break;
            case 'show-layers':
                this.toggleWindow('layers-window');
                break;
            case 'show-preview':
                this.toggleWindow('preview-window');
                break;
            case 'about':
                this.showWindow('about-window');
                break;
            case 'shortcuts':
                this.showWindow('shortcuts-window');
                break;
            case 'cut':
                this.cutSelection();
                break;
            case 'copy':
                this.copySelection();
                break;
            case 'paste':
                this.pasteSelection();
                break;
            case 'select-all':
                this.selectAll();
                break;
            case 'show-grid':
                const gridCheckbox = document.getElementById('show-grid');
                gridCheckbox.checked = !gridCheckbox.checked;
                this.showGrid = gridCheckbox.checked;
                this.updateGridDisplay();
                break;
            case 'invert-bitmap':
                this.applyInvertEffect();
                break;
            case 'dithering':
                this.showDitheringDialog();
                break;
            case 'rescale':
                this.rescaleCanvas();
                break;
            
            // Layer transformation actions
            case 'rotate-90':
                if (this.editor.rotateLayer90()) {
                    this.updateLayersList();
                    this.updateOutput();
                    this.updateWindowTitle(this.editor.width, this.editor.height);
                }
                break;
            case 'rotate-180':
                if (this.editor.rotateLayer180()) {
                    this.updateLayersList();
                    this.updateOutput();
                    this.updateWindowTitle(this.editor.width, this.editor.height);
                }
                break;
            case 'rotate-270':
                if (this.editor.rotateLayer270()) {
                    this.updateLayersList();
                    this.updateOutput();
                    this.updateWindowTitle(this.editor.width, this.editor.height);
                }
                break;
            case 'flip-horizontal':
                if (this.editor.flipLayerHorizontal()) {
                    this.updateLayersList();
                    this.updateOutput();
                    this.updateWindowTitle(this.editor.width, this.editor.height);
                }
                break;
            case 'flip-vertical':
                if (this.editor.flipLayerVertical()) {
                    this.updateLayersList();
                    this.updateOutput();
                    this.updateWindowTitle(this.editor.width, this.editor.height);
                }
                break;
                
            case 'theme-auto':
                this.setTheme('auto');
                break;
            case 'theme-light':
                this.setTheme('light');
                break;
            case 'theme-dark':
                this.setTheme('dark');
                break;
        }
    }

    toggleWindow(windowId) {
        const window = document.getElementById(windowId);
        if (window) {
            if (window.classList.contains('hidden')) {
                window.classList.remove('hidden');
                window.classList.remove('minimized');
            } else {
                window.classList.add('hidden');
            }
            this.saveWindowStates();
            this.updateWindowMenu();
        }
    }

    showWindow(windowId) {
        const window = document.getElementById(windowId);
        if (window) {
            window.classList.remove('hidden');
            window.classList.remove('minimized');
            window.style.zIndex = this.getTopZIndex() + 1;
            this.saveWindowStates();
            this.updateWindowMenu();
        }
    }

    updateWindowMenu() {
        const windowMenu = document.getElementById('menu-window');
        if (!windowMenu) return;

        // Clear existing window items
        const existingItems = windowMenu.querySelectorAll('.window-menu-item');
        existingItems.forEach(item => item.remove());

        // Add separator
        const separator = document.createElement('div');
        separator.className = 'menu-divider';
        windowMenu.appendChild(separator);

        // Add all windows
        const windows = [
            { id: 'canvas-window', name: 'Canvas' },
            { id: 'tools-window', name: 'Tools' },
            { id: 'colors-window', name: 'Patterns' },
            { id: 'options-window', name: 'Options' },
            { id: 'layers-window', name: 'Layers' },
            { id: 'preview-window', name: 'Preview' },
            { id: 'code-window', name: 'Generated Code' },
            { id: 'about-window', name: 'About BitsDraw' },
            { id: 'shortcuts-window', name: 'Keyboard Shortcuts' }
        ];

        windows.forEach(windowInfo => {
            const window = document.getElementById(windowInfo.id);
            if (window) {
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-dropdown-item window-menu-item';
                
                const isVisible = !window.classList.contains('hidden');
                const isMinimized = window.classList.contains('minimized');
                
                let prefix = '   ';
                if (isVisible && !isMinimized) {
                    prefix = '✓ ';
                } else if (isVisible && isMinimized) {
                    prefix = '− ';
                }
                
                menuItem.textContent = prefix + windowInfo.name;
                menuItem.addEventListener('click', () => {
                    this.toggleWindow(windowInfo.id);
                });
                
                windowMenu.appendChild(menuItem);
            }
        });
    }

    setupWindowManagement() {
        const windows = document.querySelectorAll('.window');
        
        windows.forEach(window => {
            this.makeWindowDraggable(window);
            this.setupWindowControls(window);
            this.setupWindowResize(window);
        });
    }

    makeWindowDraggable(window) {
        const titleBar = window.querySelector('.window-title-bar');
        let isDragging = false;
        let offsetX, offsetY;

        titleBar.addEventListener('mousedown', (e) => {
            // Don't interfere with window control buttons
            if (e.target.classList.contains('window-control')) {
                return;
            }
            
            isDragging = true;
            
            // Calculate offset from mouse to window top-left corner
            const rect = window.getBoundingClientRect();
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            window.style.zIndex = this.getTopZIndex() + 1;
            
            e.preventDefault();
        });

        // Double-click to restore minimized window
        titleBar.addEventListener('dblclick', (e) => {
            // Don't interfere with window control buttons
            if (e.target.classList.contains('window-control')) {
                return;
            }
            
            if (window.classList.contains('minimized')) {
                window.classList.remove('minimized');
                this.saveWindowStates();
                this.updateWindowMenu();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // Calculate new position based on mouse position minus offset
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            
            window.style.left = newLeft + 'px';
            window.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                this.saveWindowStates();
            }
            isDragging = false;
        });
    }

    setupWindowControls(window) {
        const closeBtn = window.querySelector('.window-control.close');
        const minimizeBtn = window.querySelector('.window-control.minimize');
        const zoomBtn = window.querySelector('.window-control.zoom');

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent title bar click event
                window.classList.add('hidden');
                this.saveWindowStates();
                this.updateWindowMenu();
            });
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent title bar click event
                window.classList.toggle('minimized');
                this.saveWindowStates();
                this.updateWindowMenu();
            });
        }

        if (zoomBtn) {
            zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent title bar click event
                // Toggle window size (basic implementation)
                if (window.style.width === '100%') {
                    window.style.width = '';
                    window.style.height = '';
                } else {
                    window.style.width = '100%';
                    window.style.height = '100%';
                    window.style.left = '0px';
                    window.style.top = '0px';
                }
            });
        }
    }

    getTopZIndex() {
        let maxZ = 0;
        document.querySelectorAll('.window').forEach(window => {
            const z = parseInt(window.style.zIndex) || 0;
            if (z > maxZ) maxZ = z;
        });
        return maxZ;
    }

    setupWindowResize(window) {
        const resizeHandle = window.querySelector('.window-resize-handle');
        if (!resizeHandle) return;

        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(window.offsetWidth);
            startHeight = parseInt(window.offsetHeight);
            
            window.style.zIndex = this.getTopZIndex() + 1;
            e.preventDefault();
            e.stopPropagation(); // Prevent window dragging
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = Math.max(200, startWidth + deltaX);
            const newHeight = Math.max(100, startHeight + deltaY);
            
            window.style.width = newWidth + 'px';
            window.style.height = newHeight + 'px';
            
            // Special handling for canvas window
            if (window.id === 'canvas-window') {
                this.updateCanvasSize();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                this.saveWindowStates();
            }
            isResizing = false;
        });
    }

    updateCanvasSize() {
        // Canvas automatically adjusts to its container
        // No special handling needed for the optimized editor
    }

    setupBrushCursor() {
        this.brushCursorOverlay = document.getElementById('brush-cursor-overlay');
        
        if (!this.brushCursorOverlay) {
            console.log('Brush cursor overlay not found, skipping brush cursor setup');
            return;
        }
        
        // Track mouse movement over canvas
        this.canvas.addEventListener('mouseenter', () => {
            if (this.currentTool === 'brush' || this.currentTool === 'pencil' || this.currentTool === 'eraser' || this.currentTool === 'blur' || this.currentTool === 'spray') {
                this.showBrushCursor();
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            // Only hide brush cursor, don't stop drawing
            this.hideBrushCursor();
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'brush' || this.currentTool === 'pencil' || this.currentTool === 'eraser' || this.currentTool === 'blur' || this.currentTool === 'spray') {
                this.updateBrushCursor(e.clientX, e.clientY);
            }
        });
    }

    showBrushCursor() {
        if (!this.brushCursorOverlay) return;
        this.brushCursorOverlay.style.display = 'block';
        this.updateBrushCursorSize();
    }

    hideBrushCursor() {
        if (!this.brushCursorOverlay) return;
        this.brushCursorOverlay.style.display = 'none';
    }

    updateBrushCursor(clientX, clientY) {
        if (!this.brushCursorOverlay) return;
        this.brushCursorOverlay.style.left = clientX + 'px';
        this.brushCursorOverlay.style.top = clientY + 'px';
    }

    updateBrushCursorSize() {
        if (!this.brushCursorOverlay) return;
        const toolSize = this.currentTool === 'eraser' ? this.eraserSize : 
                        this.currentTool === 'blur' ? this.blurSize :
                        this.currentTool === 'spray' ? this.sprayRadius : this.brushSize;
        const size = toolSize * this.editor.zoom;
        this.brushCursorOverlay.style.width = size + 'px';
        this.brushCursorOverlay.style.height = size + 'px';
        
        // Update appearance based on tool
        this.brushCursorOverlay.className = 'brush-cursor-overlay';
        if (this.currentTool === 'pencil' && this.brushSize === 1) {
            this.brushCursorOverlay.classList.add('square');
        } else if (this.currentTool === 'eraser') {
            this.brushCursorOverlay.classList.add('eraser');
        }
    }

    setupColorPalette() {
        const swatches = document.querySelectorAll('.color-swatch');
        
        swatches.forEach(swatch => {
            // Generate pattern preview
            this.generatePatternPreview(swatch);
            
            swatch.addEventListener('click', () => {
                // Remove selected class from all swatches
                swatches.forEach(s => s.classList.remove('selected'));
                // Add selected class to clicked swatch
                swatch.classList.add('selected');
                // Update current pattern
                this.currentPattern = swatch.dataset.pattern;
            });
        });
    }

    generatePatternPreview(swatch) {
        const pattern = swatch.dataset.pattern;
        const size = 32; // 32x32 preview
        
        // Create a canvas for the pattern preview
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        // Draw pattern
        ctx.fillStyle = '#000000';
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const value = Patterns.applyPattern(pattern, x, y);
                if (value) {
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        
        // Convert to data URL and set as background
        const dataUrl = canvas.toDataURL();
        swatch.style.backgroundImage = `url(${dataUrl})`;
        swatch.style.backgroundSize = 'cover';
        swatch.style.backgroundRepeat = 'no-repeat';
        
        // Remove any existing CSS background patterns
        swatch.style.background = `url(${dataUrl})`;
    }

    setupLayers() {
        // Add layer button
        document.getElementById('add-layer-btn').addEventListener('click', () => {
            const layerName = `Layer ${this.editor.getLayerCount() + 1}`;
            this.editor.addLayer(layerName);
            this.updateLayersList();
            this.updateOutput();
        });

        // Delete layer button
        document.getElementById('delete-layer-btn').addEventListener('click', () => {
            if (this.editor.getLayerCount() > 1) {
                if (confirm('Delete the active layer?')) {
                    this.editor.deleteLayer(this.editor.activeLayerIndex);
                    this.updateLayersList();
                    this.updateOutput();
                }
            } else {
                this.showNotification('Cannot delete the last layer', 'error');
            }
        });

        // Duplicate layer button
        document.getElementById('duplicate-layer-btn').addEventListener('click', () => {
            const activeLayer = this.editor.getActiveLayer();
            if (activeLayer) {
                const newLayer = this.editor.addLayer(`${activeLayer.name} Copy`);
                // Copy pixels from active layer
                for (let y = 0; y < this.editor.height; y++) {
                    for (let x = 0; x < this.editor.width; x++) {
                        newLayer.pixels[y][x] = activeLayer.pixels[y][x];
                    }
                }
                this.editor.compositeAllLayers();
                this.updateLayersList();
                this.updateOutput();
            }
        });

        this.updateLayersList();
    }

    updateLayersList() {
        const layerList = document.getElementById('layer-list');
        layerList.innerHTML = '';

        // Create layers in reverse order (top to bottom display)
        for (let i = this.editor.getLayerCount() - 1; i >= 0; i--) {
            const layerInfo = this.editor.getLayerInfo(i);
            if (!layerInfo) continue;

            const layerItem = document.createElement('div');
            layerItem.className = `layer-item ${layerInfo.isActive ? 'active' : ''}`;
            layerItem.dataset.layerIndex = i;

            layerItem.innerHTML = `
                <div class="layer-visibility" data-action="toggle-visibility">
                    <i class="ph ${layerInfo.visible ? 'ph-eye' : 'ph-eye-slash'}"></i>
                </div>
                <div class="layer-name">${layerInfo.name}</div>
            `;

            // Layer click to select
            layerItem.addEventListener('click', (e) => {
                if (!e.target.dataset.action) {
                    this.editor.setActiveLayer(i);
                    this.updateLayersList();
                }
            });

            // Visibility toggle
            layerItem.querySelector('.layer-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                this.editor.toggleLayerVisibility(i);
                this.updateLayersList();
                this.updateOutput();
            });

            layerList.appendChild(layerItem);
        }
    }

    setDisplayMode(mode) {
        if (!this.displayModes[mode]) return;
        
        this.currentDisplayMode = mode;
        const colors = this.displayModes[mode];
        
        // Update editor colors
        this.editor.setDisplayColors(colors.draw_color, colors.background_color);
        
        // Update display mode select and display
        document.getElementById('display-mode-select').value = mode;
        this.updateDisplayModeDisplay();
        
        this.updateOutput();
    }

    cycleDisplayMode() {
        const modes = Object.keys(this.displayModes);
        const currentIndex = modes.indexOf(this.currentDisplayMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.setDisplayMode(modes[nextIndex]);
    }

    updateGridButton() {
        const btn = document.getElementById('show-grid-btn');
        if (this.showGrid) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    updateCheckerboardDisplay() {
        this.editor.setShowCheckerboard(this.showCheckerboard);
    }

    updateCheckerboardButton() {
        const btn = document.getElementById('show-checkerboard-btn');
        if (this.showCheckerboard) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    updateGuidesButton() {
        const btn = document.getElementById('show-guides-btn');
        if (this.showGuides) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    rescaleCanvas() {
        const width = prompt('New width:', this.editor.width);
        const height = prompt('New height:', this.editor.height);
        
        if (width !== null && height !== null) {
            const newWidth = parseInt(width);
            const newHeight = parseInt(height);
            
            if (newWidth > 0 && newHeight > 0 && newWidth <= 256 && newHeight <= 256) {
                this.editor.resize(newWidth, newHeight);
                this.updateOutput();
                this.showNotification('Canvas rescaled successfully!', 'success');
            } else {
                this.showNotification('Invalid dimensions (1-256 pixels)', 'error');
            }
        }
    }

    setupTextBalloon() {
        document.getElementById('add-text-balloon-btn').addEventListener('click', () => {
            this.addTextFromBalloon();
        });

        document.getElementById('cancel-text-balloon-btn').addEventListener('click', () => {
            this.hideTextBalloon();
        });

        document.getElementById('text-input-balloon').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTextFromBalloon();
            } else if (e.key === 'Escape') {
                this.hideTextBalloon();
            }
        });
    }

    setupToolOptions() {
        // Brush size
        const brushSizeSlider = document.getElementById('brush-size');
        const brushSizeValue = document.getElementById('brush-size-value');
        brushSizeSlider.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.brushSize;
            this.updateBrushCursorSize();
        });
        
        // Smooth drawing
        const smoothDrawingCheckbox = document.getElementById('smooth-drawing');
        smoothDrawingCheckbox.addEventListener('change', (e) => {
            this.smoothDrawing = e.target.checked;
        });

        // Eraser size
        const eraserSizeSlider = document.getElementById('eraser-size');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        eraserSizeSlider.addEventListener('input', (e) => {
            this.eraserSize = parseInt(e.target.value);
            eraserSizeValue.textContent = this.eraserSize;
            this.updateBrushCursorSize();
        });
        
        // Eraser smooth
        const eraserSmoothCheckbox = document.getElementById('eraser-smooth');
        eraserSmoothCheckbox.addEventListener('change', (e) => {
            this.eraserSmooth = e.target.checked;
        });

        // Spray radius
        const sprayRadiusSlider = document.getElementById('spray-radius');
        const sprayRadiusValue = document.getElementById('spray-radius-value');
        sprayRadiusSlider.addEventListener('input', (e) => {
            this.sprayRadius = parseInt(e.target.value);
            sprayRadiusValue.textContent = this.sprayRadius;
            this.updateBrushCursorSize();
        });

        // Spray density
        const sprayDensitySlider = document.getElementById('spray-density');
        const sprayDensityValue = document.getElementById('spray-density-value');
        sprayDensitySlider.addEventListener('input', (e) => {
            this.sprayDensity = parseInt(e.target.value) / 100;
            sprayDensityValue.textContent = e.target.value;
        });

        // Blur size
        const blurSizeSlider = document.getElementById('blur-size');
        const blurSizeValue = document.getElementById('blur-size-value');
        blurSizeSlider.addEventListener('input', (e) => {
            this.blurSize = parseInt(e.target.value);
            blurSizeValue.textContent = this.blurSize;
            this.updateBrushCursorSize();
        });

        // Blur dither method
        document.getElementById('blur-dither-method').addEventListener('change', (e) => {
            this.blurDitherMethod = e.target.value;
        });

        // Blur alpha channel
        document.getElementById('blur-alpha-channel').addEventListener('change', (e) => {
            this.blurAlphaChannel = e.target.checked;
        });

        // Select All button
        document.getElementById('select-all-btn').addEventListener('click', () => {
            this.selectAll();
        });
    }

    updateToolOptions(tool) {
        // Hide all option sections
        document.querySelectorAll('.option-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show relevant options based on tool
        switch(tool) {
            case 'brush':
                document.getElementById('brush-options').style.display = 'block';
                break;
            case 'eraser':
                document.getElementById('eraser-options').style.display = 'block';
                break;
            case 'rect':
                document.getElementById('shape-options').style.display = 'block';
                break;
            case 'circle':
                document.getElementById('circle-options').style.display = 'block';
                break;
            case 'spray':
                document.getElementById('spray-options').style.display = 'block';
                break;
            case 'blur':
                document.getElementById('blur-options').style.display = 'block';
                break;
            case 'select-rect':
                document.getElementById('selection-options').style.display = 'block';
                break;
            case 'select-circle':
                document.getElementById('circle-select-options').style.display = 'block';
                break;
            case 'text':
                document.getElementById('text-options').style.display = 'block';
                break;
            case 'bucket':
                document.getElementById('bucket-options').style.display = 'block';
                break;
            case 'move':
                document.getElementById('move-options').style.display = 'block';
                break;
            case 'guide':
                document.getElementById('guide-options').style.display = 'block';
                break;
            default:
                document.getElementById('no-options').style.display = 'block';
                break;
        }
    }

    setupNewCanvasDialog() {
        const dialog = document.getElementById('new-canvas-dialog');
        const closeBtn = document.getElementById('new-canvas-close-btn');
        const cancelBtn = document.getElementById('new-canvas-cancel-btn');
        const createBtn = document.getElementById('new-canvas-create-btn');
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        const presetSelect = document.getElementById('preset-select');
        const swapBtn = document.getElementById('swap-dimensions-btn');

        // Close dialog handlers
        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // Preset select handler
        presetSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                const [width, height] = value.split(',').map(n => parseInt(n));
                widthInput.value = width;
                heightInput.value = height;
            }
        });

        // Custom input handlers
        const updatePresetSelection = () => {
            const width = widthInput.value;
            const height = heightInput.value;
            const presetValue = `${width},${height}`;
            
            // Check if current values match any preset
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

        // Swap dimensions button
        swapBtn.addEventListener('click', () => {
            const width = widthInput.value;
            const height = heightInput.value;
            widthInput.value = height;
            heightInput.value = width;
            updatePresetSelection();
        });

        // Create canvas handler
        createBtn.addEventListener('click', () => {
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            
            if (width > 0 && height > 0 && width <= 2048 && height <= 2048) {
                this.createNewCanvas(width, height);
                closeDialog();
            } else {
                this.showNotification('Invalid canvas size (1-2048 pixels)', 'error');
            }
        });

        // Handle Enter key in inputs
        [widthInput, heightInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    createBtn.click();
                }
            });
        });
    }

    setupCppExportDialog() {
        const dialog = document.getElementById('cpp-export-dialog');
        const closeBtn = document.getElementById('cpp-export-close-btn');
        const cancelBtn = document.getElementById('cpp-export-cancel-btn');
        const copyBtn = document.getElementById('cpp-export-copy-btn');
        const arrayNameInput = document.getElementById('array-name-input');
        const formatSelect = document.getElementById('export-format-select');
        const codeTextarea = document.getElementById('cpp-export-code');

        // Close dialog handlers
        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // Array name change handler
        arrayNameInput.addEventListener('input', () => {
            this.generateCppCode();
        });

        // Format change handler
        formatSelect.addEventListener('change', () => {
            this.generateCppCode();
        });

        // Copy code handler
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(codeTextarea.value);
                this.showNotification('Code copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                this.showNotification('Failed to copy to clipboard. Please copy manually.', 'error');
            }
        });
    }

    setupCppImportDialog() {
        const dialog = document.getElementById('cpp-import-dialog');
        const closeBtn = document.getElementById('cpp-import-close-btn');
        const cancelBtn = document.getElementById('cpp-import-cancel-btn');
        const importBtn = document.getElementById('cpp-import-load-btn');
        const fileInput = document.getElementById('cpp-import-file');
        const codeTextarea = document.getElementById('cpp-import-code');

        // Close dialog handlers
        const closeDialog = () => {
            dialog.style.display = 'none';
            fileInput.value = '';
            codeTextarea.value = '';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // File input handler
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

        // Import code handler
        importBtn.addEventListener('click', () => {
            const code = codeTextarea.value.trim();
            if (!code) {
                this.showNotification('Please select a file or paste code to import', 'error');
                return;
            }

            try {
                const bitmapData = U8G2Exporter.parseHFile(code);
                this.editor.loadBitmapData(bitmapData);
                this.updateOutput();
                this.showNotification('CPP header imported successfully!', 'success');
                closeDialog();
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Failed to import code: ' + error.message, 'error');
            }
        });
    }

    setupImageImportDialog() {
        const dialog = document.getElementById('image-import-dialog');
        const closeBtn = document.getElementById('image-import-close-btn');
        const cancelBtn = document.getElementById('image-import-cancel-btn');
        const fileInput = document.getElementById('image-import-file');

        // Only setup if dialog exists
        if (!dialog || !closeBtn || !cancelBtn || !fileInput) {
            console.log('Image import dialog elements not found, skipping setup');
            return;
        }

        // Close dialog handlers
        const closeDialog = () => {
            dialog.style.display = 'none';
            fileInput.value = '';
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // File input handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('Image file selected from dialog:', file.name, file.type);
                this.handleImageFile(file);
                closeDialog();
            }
        });
    }

    showImageImportDialog() {
        console.log('showImageImportDialog called');
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            console.log('File input found, clicking...');
            // Reset value to allow selecting same file again
            fileInput.value = '';
            fileInput.click();
        } else {
            console.error('File input element not found');
        }
    }

    // ===== DITHERING DIALOG =====

    setupDitheringDialog() {
        const dialog = document.getElementById('dithering-dialog');
        const closeBtn = document.getElementById('dithering-close-btn');
        const cancelBtn = document.getElementById('dithering-cancel-btn');
        const applyBtn = document.getElementById('dithering-apply-btn');
        const methodSelect = document.getElementById('dithering-method');
        const alphaSlider = document.getElementById('dithering-alpha');
        const alphaValue = document.getElementById('dithering-alpha-value');
        const alphaChannelCheckbox = document.getElementById('dithering-alpha-channel');
        
        console.log('Dialog elements:', {
            dialog: !!dialog,
            closeBtn: !!closeBtn, 
            cancelBtn: !!cancelBtn,
            applyBtn: !!applyBtn,
            methodSelect: !!methodSelect,
            alphaSlider: !!alphaSlider,
            alphaValue: !!alphaValue
        });

        const closeDialog = () => {
            dialog.style.display = 'none';
            this.ditheringData = {
                originalPixels: null,
                previewPixels: null,
                alpha: 1.0,
                method: 'Bayer4x4',
                ditherAlphaChannel: false
            };
        };

        // Close button
        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        // Click outside to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });

        // Method change
        methodSelect.addEventListener('change', (e) => {
            this.ditheringData.method = e.target.value;
            this.updateDitheringPreview();
        });

        // Alpha slider
        alphaSlider.addEventListener('input', (e) => {
            const alpha = parseInt(e.target.value) / 100;
            this.ditheringData.alpha = alpha;
            alphaValue.textContent = alpha.toFixed(2);
            this.updateDitheringPreview();
        });

        // Alpha channel checkbox
        alphaChannelCheckbox.addEventListener('change', (e) => {
            this.ditheringData.ditherAlphaChannel = e.target.checked;
            this.updateDitheringPreview();
        });

        // Apply button
        applyBtn.addEventListener('click', () => {
            this.applyDithering();
            closeDialog();
        });
    }

    showDitheringDialog() {
        DEBUG.log('🎨 Opening dithering dialog...');
        let activeLayer = this.editor.getActiveLayer();
        
        // Fallback: if no active layer, try to get the main bitmap data
        if (!activeLayer) {
            console.log('⚠️ No active layer found, using main bitmap data');
            const bitmapData = this.editor.getBitmapData();
            if (bitmapData && bitmapData.pixels) {
                activeLayer = { pixels: bitmapData.pixels };
            } else {
                this.showNotification('No bitmap data available for dithering', 'error');
                return;
            }
        }

        // Copy current layer data (both pixels and alpha)
        this.ditheringData.originalPixels = new Uint8Array(activeLayer.pixels);
        this.ditheringData.originalAlpha = new Uint8Array(activeLayer.alpha || this.editor.createEmptyAlpha());
        
        // Reset parameters
        this.ditheringData.alpha = 1.0;
        this.ditheringData.method = 'Bayer4x4';
        this.ditheringData.ditherAlphaChannel = false;

        // Update UI
        document.getElementById('dithering-method').value = this.ditheringData.method;
        document.getElementById('dithering-alpha').value = 100;
        document.getElementById('dithering-alpha-value').textContent = '1.00';
        document.getElementById('dithering-alpha-channel').checked = this.ditheringData.ditherAlphaChannel;

        // Setup preview canvases
        this.setupDitheringPreview();

        // Show dialog
        const dialog = document.getElementById('dithering-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
        } else {
            console.error('Dithering dialog element not found');
            return;
        }

        // Initial preview update
        this.updateDitheringPreview();
    }

    setupDitheringPreview() {
        const originalCanvas = document.getElementById('dithering-original-canvas');
        const previewCanvas = document.getElementById('dithering-preview-canvas');

        const layer = this.editor.getActiveLayer();
        const width = this.editor.width;
        const height = this.editor.height;

        // Use 8x zoom for better visibility
        const zoom = 8;

        // Render original
        this.ditheringEffects.renderToCanvas(
            originalCanvas,
            this.ditheringData.originalPixels,
            width,
            height,
            zoom
        );

        // Setup preview canvas size
        previewCanvas.width = width * zoom;
        previewCanvas.height = height * zoom;
    }

    updateDitheringPreview() {
        if (!this.ditheringData.originalPixels) return;

        const previewCanvas = document.getElementById('dithering-preview-canvas');
        
        // Dither pixel data
        const pixelLayer = {
            pixels: this.ditheringData.originalPixels,
            width: this.editor.width,
            height: this.editor.height
        };

        // Apply JavaScript dithering to pixels
        const ditheredPixels = this.ditheringEffects.ditherLayer(
            pixelLayer,
            this.ditheringData.alpha,
            this.ditheringData.method
        );

        // Dither alpha channel if enabled
        let ditheredAlpha = this.ditheringData.originalAlpha;
        if (this.ditheringData.ditherAlphaChannel && this.ditheringData.originalAlpha) {
            // Convert 1-bit alpha to normalized for dithering
            const normalizedAlpha = new Float32Array(this.ditheringData.originalAlpha.length);
            for (let i = 0; i < this.ditheringData.originalAlpha.length; i++) {
                normalizedAlpha[i] = this.ditheringData.originalAlpha[i];
            }
            
            const alphaLayer = {
                pixels: normalizedAlpha,
                width: this.editor.width,
                height: this.editor.height
            };

            ditheredAlpha = this.ditheringEffects.ditherLayer(
                alphaLayer,
                this.ditheringData.alpha,
                this.ditheringData.method
            );
        }

        // Use 8x zoom for better visibility
        const zoom = 8;

        // Render preview with alpha support
        this.renderDitheringPreviewWithAlpha(
            previewCanvas,
            ditheredPixels,
            ditheredAlpha,
            this.editor.width,
            this.editor.height,
            zoom
        );

        // Store preview data for potential application
        this.ditheringData.previewPixels = ditheredPixels;
        this.ditheringData.previewAlpha = ditheredAlpha;
    }

    renderDitheringPreviewWithAlpha(canvas, pixelData, alphaData, width, height, zoom) {
        const ctx = canvas.getContext('2d');
        canvas.width = width * zoom;
        canvas.height = height * zoom;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const pixelValue = pixelData[idx];
                const alphaValue = alphaData[idx];
                
                const canvasX = x * zoom;
                const canvasY = y * zoom;
                
                if (alphaValue === 0) {
                    // Transparent - render checkerboard or solid based on current setting
                    if (this.editor.showCheckerboard) {
                        this.editor.renderCheckerboard(canvasX, canvasY, zoom, zoom);
                    } else {
                        ctx.fillStyle = this.editor.backgroundColor;
                        ctx.fillRect(canvasX, canvasY, zoom, zoom);
                    }
                } else {
                    // Opaque - render pixel
                    ctx.fillStyle = pixelValue ? '#000000' : '#ffffff';
                    ctx.fillRect(canvasX, canvasY, zoom, zoom);
                }
            }
        }
    }

    applyDithering() {
        if (!this.ditheringData.previewPixels) {
            this.showNotification('No dithering preview to apply', 'error');
            return;
        }

        const activeLayer = this.editor.getActiveLayer();
        if (!activeLayer) {
            this.showNotification('No active layer to apply dithering', 'error');
            return;
        }

        // Apply the dithered pixels to the active layer
        activeLayer.pixels.set(this.ditheringData.previewPixels);
        
        // Apply dithered alpha if available
        if (this.ditheringData.previewAlpha) {
            activeLayer.alpha.set(this.ditheringData.previewAlpha);
        }

        // Mark layer as dirty and update
        this.editor.markCompositeDirty();
        this.editor.addDirtyRect(0, 0, this.editor.width, this.editor.height);
        this.editor.scheduleRender();

        // Save state for undo
        this.editor.saveState();

        // Update output and preview
        this.updateOutput();
        this.editor.redraw();

        this.showNotification(`Dithering applied (${this.ditheringData.method}, α=${this.ditheringData.alpha.toFixed(2)})`, 'success');
    }

    detectAndApplyPlatform() {
        // Detect Windows via user agent
        const isWindows = navigator.userAgent.indexOf('Windows') !== -1;
        
        if (isWindows) {
            // Add Windows class to body for styling
            document.body.classList.add('platform-windows');
        } else {
            // Add macOS class (default)
            document.body.classList.add('platform-macos');
        }
    }

    showNewCanvasDialog() {
        const dialog = document.getElementById('new-canvas-dialog');
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');
        const presetSelect = document.getElementById('preset-select');
        
        // Set current canvas size as default
        widthInput.value = this.editor.width;
        heightInput.value = this.editor.height;
        
        // Update preset selection based on current size
        const presetValue = `${this.editor.width},${this.editor.height}`;
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

    createNewCanvas(width, height) {
        // Save current state if needed
        if (confirm('Create new canvas? Current work will be lost.')) {
            this.editor.resize(width, height);
            this.editor.clear();
            this.clearAllGuides();
            this.updateWindowTitle(width, height);
            this.updateOutput();
            this.showNotification(`New canvas created: ${width}×${height}`, 'success');
        }
    }

    updateWindowTitle(width, height) {
        const projectName = document.getElementById('project-name').value || 'my_bitmap';
        const title = `Canvas - ${projectName} (${width}x${height})`;
        document.querySelector('#canvas-window .window-title').textContent = title;
    }

    showTextBalloonAt(clientX, clientY, pixelX, pixelY) {
        const balloon = document.getElementById('text-balloon');
        const input = document.getElementById('text-input-balloon');
        
        this.textBalloonPos = { x: pixelX, y: pixelY };
        
        balloon.style.left = (clientX + 10) + 'px';
        balloon.style.top = (clientY - 30) + 'px';
        balloon.style.display = 'block';
        
        input.value = '';
        input.focus();
    }

    hideTextBalloon() {
        document.getElementById('text-balloon').style.display = 'none';
        this.textBalloonPos = null;
    }

    addTextFromBalloon() {
        const text = document.getElementById('text-input-balloon').value.trim();
        
        if (!text) {
            this.hideTextBalloon();
            return;
        }
        
        if (this.textBalloonPos) {
            TextRenderer.renderText(text, this.textBalloonPos.x, this.textBalloonPos.y, this.editor, this.currentPattern);
            this.editor.redraw();
            this.editor.saveState();
            this.updateOutput();
            this.showNotification('Text added!', 'success');
        }
        
        this.hideTextBalloon();
    }

    showCppExportDialog() {
        const dialog = document.getElementById('cpp-export-dialog');
        dialog.style.display = 'flex';
        
        // Generate initial code
        this.generateCppCode();
        
        // Focus on array name input
        document.getElementById('array-name-input').focus();
    }

    showCppImportDialog() {
        const dialog = document.getElementById('cpp-import-dialog');
        dialog.style.display = 'flex';
        
        // Clear previous content
        document.getElementById('cpp-import-file').value = '';
        document.getElementById('cpp-import-code').value = '';
    }

    generateCppCode() {
        const arrayName = document.getElementById('array-name-input').value || 'my_bitmap';
        const formatSelect = document.getElementById('export-format-select');
        const format = formatSelect ? formatSelect.value || 'u8g2' : 'u8g2';
        const codeTextarea = document.getElementById('cpp-export-code');
        
        const bitmapData = this.editor.getBitmapData();
        const code = BitmapExporter.generateHFile(bitmapData, arrayName, format);
        
        codeTextarea.value = code;
    }

    setupFileImport() {
        const fileInput = document.getElementById('file-input');
        
        if (!fileInput) {
            console.error('File input element not found');
            return;
        }
        
        console.log('Setting up file import listener, element:', fileInput);
        console.log('File input accept attribute:', fileInput.accept);
        
        fileInput.addEventListener('change', async (e) => {
            console.log('File input change event triggered, files:', e.target.files);
            const file = e.target.files[0];
            if (file) {
                console.log('Selected file:', file.name, file.type, file.size);
                try {
                    await this.handleImageFile(file);
                } catch (error) {
                    console.error('Error handling image file:', error);
                    this.showNotification('Failed to import image: ' + error.message, 'error');
                }
                fileInput.value = ''; // Clear the input
            } else {
                console.log('No file selected');
            }
        });
        
        // Add click listener for debugging
        fileInput.addEventListener('click', () => {
            console.log('File input clicked');
        });
        
        // Test if file input is functional
        console.log('File input setup complete. Element style:', fileInput.style.cssText);
    }

    triggerFileImport() {
        console.log('triggerFileImport called');
        const fileInput = document.getElementById('file-input');
        if (!fileInput) {
            console.error('File input not found in triggerFileImport');
            return;
        }
        
        console.log('File input found, attempting to trigger click');
        console.log('File input visible:', fileInput.offsetParent !== null);
        console.log('File input display:', window.getComputedStyle(fileInput).display);
        
        // Reset value to allow selecting the same file again
        fileInput.value = '';
        
        // Try multiple methods to trigger file dialog
        try {
            // Method 1: Direct click
            fileInput.click();
            console.log('Direct click attempted');
        } catch (error) {
            console.error('Direct click failed:', error);
            
            // Method 2: Create and dispatch click event
            try {
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                fileInput.dispatchEvent(event);
                console.log('Dispatched click event');
            } catch (dispatchError) {
                console.error('Event dispatch failed:', dispatchError);
            }
        }
    }






    applyInvertEffect() {
        if (this.selection) {
            // Invert selection only
            for (let y = 0; y < this.editor.height; y++) {
                for (let x = 0; x < this.editor.width; x++) {
                    if (this.editor.isInSelection(x, y, this.selection)) {
                        const currentValue = this.editor.getPixel(x, y);
                        this.editor.setPixel(x, y, 1 - currentValue);
                    }
                }
            }
            this.editor.redraw();
        } else {
            // Invert entire bitmap
            this.editor.invertBitmap();
        }
        
        this.editor.saveState();
        this.updateOutput();
        this.showNotification('Invert applied successfully!', 'success');
    }




    drawWithBrush(centerX, centerY, drawValue, alphaValue, brushSize = null) {
        const size = brushSize || this.brushSize;
        const radius = Math.floor(size / 2);
        let pixelsChanged = false;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && x < this.editor.width && y >= 0 && y < this.editor.height) {
                    let shouldDraw = false;
                    
                    // For size 1, just draw center pixel
                    if (size === 1) {
                        if (x === centerX && y === centerY) {
                            shouldDraw = true;
                        }
                    } else {
                        // For larger sizes, draw circle/square brush
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance <= radius) {
                            shouldDraw = true;
                        }
                    }
                    
                    if (shouldDraw) {
                        if (alphaValue === 1 && drawValue === 1 && this.currentPattern && this.currentPattern !== 'solid-black') {
                            // Apply pattern only when drawing (not erasing)
                            this.editor.setPixelWithAlpha(x, y, drawValue, alphaValue, this.currentPattern);
                        } else {
                            // Direct draw/alpha setting
                            this.editor.setPixelWithAlpha(x, y, drawValue, alphaValue);
                        }
                        pixelsChanged = true;
                    }
                }
            }
        }
        
        // The OptimizedBitmapEditor handles rendering automatically
    }

    // Smooth drawing implementation using Catmull-Rom spline interpolation
    startSmoothStroke(x, y) {
        this.strokePoints = [];
        this.strokeStartTime = Date.now();
        this.lastDrawPoint = { x, y };
        this.addStrokePoint(x, y);
    }

    addStrokePoint(x, y) {
        const timestamp = Date.now();
        this.strokePoints.push({ 
            x, 
            y, 
            timestamp,
            pressure: 1.0 // Could be extended for pressure-sensitive input
        });
        
        // Limit the number of points to prevent memory issues
        if (this.strokePoints.length > 100) {
            this.strokePoints.shift();
        }
    }

    updateSmoothStroke(x, y, drawValue, alphaValue) {
        if (!this.smoothDrawing) {
            // Fallback to direct drawing
            this.drawWithBrush(x, y, drawValue, alphaValue);
            return;
        }

        this.addStrokePoint(x, y);
        
        // Need at least 4 points for Catmull-Rom spline
        if (this.strokePoints.length >= 4) {
            this.drawSmoothSegment(drawValue, alphaValue);
        } else if (this.strokePoints.length >= 2) {
            // For first few points, draw directly
            const current = this.strokePoints[this.strokePoints.length - 1];
            this.drawWithBrush(current.x, current.y, drawValue, alphaValue);
        }
    }

    drawSmoothSegment(drawValue, alphaValue) {
        const points = this.strokePoints;
        const len = points.length;
        
        // Use the last 4 points for Catmull-Rom interpolation
        const p0 = points[len - 4];
        const p1 = points[len - 3];
        const p2 = points[len - 2];
        const p3 = points[len - 1];
        
        // Calculate adaptive step size based on distance and brush size
        const distance = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );
        
        // Adaptive smoothing: more steps for larger brushes and longer distances
        const brushFactor = Math.max(1, this.brushSize / 3);
        const steps = Math.max(1, Math.min(30, Math.ceil(distance / brushFactor)));
        
        // Skip very short segments to improve performance
        if (distance < 0.5) {
            return;
        }
        
        // Draw smooth curve between p1 and p2 using p0 and p3 as control points
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = this.catmullRomInterpolate(p0, p1, p2, p3, t);
            
            // Adaptive drawing threshold based on brush size
            const threshold = Math.max(0.3, this.brushSize * 0.1);
            
            // Only draw if the point is significantly different from the last drawn point
            if (!this.lastDrawPoint || 
                Math.abs(point.x - this.lastDrawPoint.x) >= threshold || 
                Math.abs(point.y - this.lastDrawPoint.y) >= threshold) {
                
                this.drawWithBrush(Math.round(point.x), Math.round(point.y), drawValue, alphaValue);
                this.lastDrawPoint = { x: point.x, y: point.y };
            }
        }
    }

    catmullRomInterpolate(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        // Catmull-Rom spline formula
        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        
        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
        
        return { x, y };
    }

    finishSmoothStroke(drawValue, alphaValue, brushSize = null) {
        // Draw remaining points if any
        if (this.strokePoints.length >= 2) {
            const lastPoint = this.strokePoints[this.strokePoints.length - 1];
            this.drawWithBrush(lastPoint.x, lastPoint.y, drawValue, alphaValue, brushSize);
        }
        
        // Clear stroke data
        this.strokePoints = [];
        this.lastDrawPoint = null;
    }

    saveWindowStates() {
        const windowStates = {};
        const windows = document.querySelectorAll('.window');
        
        windows.forEach(window => {
            windowStates[window.id] = {
                hidden: window.classList.contains('hidden'),
                minimized: window.classList.contains('minimized'),
                left: window.style.left,
                top: window.style.top,
                width: window.style.width,
                height: window.style.height
            };
        });
        
        localStorage.setItem('bitsdraw-window-states', JSON.stringify(windowStates));
    }

    loadWindowStates() {
        try {
            const saved = localStorage.getItem('bitsdraw-window-states');
            if (!saved) return;
            
            const windowStates = JSON.parse(saved);
            const windows = document.querySelectorAll('.window');
            
            windows.forEach(window => {
                const state = windowStates[window.id];
                if (state) {
                    if (state.hidden) {
                        window.classList.add('hidden');
                    }
                    if (state.minimized) {
                        window.classList.add('minimized');
                    }
                    if (state.left) window.style.left = state.left;
                    if (state.top) window.style.top = state.top;
                    if (state.width) window.style.width = state.width;
                    if (state.height) window.style.height = state.height;
                }
            });
        } catch (error) {
            console.warn('Failed to load window states:', error);
        }
    }

    saveBitmapToStorage() {
        try {
            const bitmapData = this.editor.getBitmapData();
            const projectName = document.getElementById('project-name').value || 'my_bitmap';
            
            const saveData = {
                bitmap: bitmapData,
                projectName: projectName,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('bitsdraw-saved-bitmap', JSON.stringify(saveData));
            this.showNotification('Bitmap saved to browser storage!', 'success');
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Failed to save bitmap', 'error');
        }
    }

    loadBitmapFromStorage() {
        try {
            const saved = localStorage.getItem('bitsdraw-saved-bitmap');
            if (!saved) {
                this.showNotification('No saved bitmap found', 'error');
                return;
            }
            
            const saveData = JSON.parse(saved);
            
            if (saveData.bitmap) {
                this.editor.loadBitmapData(saveData.bitmap);
                
                if (saveData.projectName) {
                    document.getElementById('project-name').value = saveData.projectName;
                }
                
                this.updateOutput();
                this.showNotification('Bitmap loaded successfully!', 'success');
            } else {
                this.showNotification('Invalid saved data', 'error');
            }
        } catch (error) {
            console.error('Load error:', error);
            this.showNotification('Failed to load bitmap', 'error');
        }
    }

    setupDragAndDrop() {
        const canvas = this.canvas;
        
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        canvas.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });
        
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            console.log('File dropped on canvas');
            
            const files = Array.from(e.dataTransfer.files);
            const imageFile = files.find(file => file.type.startsWith('image/'));
            
            if (imageFile) {
                console.log('Image file dropped:', imageFile.name, imageFile.type);
                this.handleImageFile(imageFile);
            } else {
                console.log('No image file found in drop');
                this.showNotification('Please drop an image file', 'error');
            }
        });
    }

    async handleImageFile(file) {
        console.log('handleImageFile called with:', file);
        
        if (typeof ImageImporter === 'undefined') {
            console.error('ImageImporter is not defined');
            this.showNotification('ImageImporter not available', 'error');
            return;
        }
        
        if (!ImageImporter.isValidImageFile(file)) {
            console.log('Invalid file type:', file.type);
            this.showNotification('Please select a valid image file (PNG, JPG, GIF)', 'error');
            return;
        }

        try {
            console.log('Loading image for placement...');
            this.showNotification('Loading image...', 'info');
            
            // Load the image and preserve original dimensions
            const imageData = await ImageImporter.loadImage(file);
            console.log('Image loaded:', imageData.width, 'x', imageData.height);
            
            // Check if imagePlacementDialog exists
            if (!this.imagePlacementDialog) {
                console.error('imagePlacementDialog not initialized');
                this.showNotification('Image placement dialog not available', 'error');
                return;
            }
            
            console.log('Showing image placement dialog...');
            // Show the image placement dialog
            await this.imagePlacementDialog.show(imageData);
            console.log('Image placement dialog shown');
            
        } catch (error) {
            console.error('Image load error:', error);
            console.error('Error stack:', error.stack);
            this.showNotification('Failed to load image: ' + error.message, 'error');
        }
    }

    setPattern(patternName) {
        this.currentPattern = patternName;
        
        // Update UI to reflect the new pattern
        const swatches = document.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.classList.remove('selected');
            if (swatch.dataset.pattern === patternName) {
                swatch.classList.add('selected');
            }
        });
    }

    drawSelectionOverlay() {
        if (!this.selection) return;
        
        // Redraw and show selection overlay
        this.editor.redraw();
        this.editor.drawSelectionOverlay(this.editor.ctx, this.selection, this.editor.zoom);
        
        // Start continuous animation if not already running
        if (!this.selectionAnimationRunning) {
            this.startSelectionAnimation();
        }
    }

    startSelectionAnimation() {
        this.selectionAnimationRunning = true;
        
        const animate = () => {
            if (this.selection && this.selection.active) {
                // Redraw canvas and overlay for animation
                this.editor.redraw();
                this.editor.drawSelectionOverlay(this.editor.ctx, this.selection, this.editor.zoom);
                requestAnimationFrame(animate);
            } else {
                this.selectionAnimationRunning = false;
            }
        };
        
        requestAnimationFrame(animate);
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-icon').forEach(btn => {
            btn.classList.remove('active');
        });
        const toolButton = document.getElementById(`${tool}-tool`);
        if (toolButton) {
            toolButton.classList.add('active');
        }
        
        // Update cursor based on tool
        this.canvas.className = '';
        if (tool === 'bucket') {
            this.canvas.classList.add('bucket-cursor');
        } else if (tool === 'hand') {
            this.canvas.style.cursor = 'grab';
        } else if (tool === 'move') {
            this.canvas.style.cursor = 'move';
        } else if (tool === 'guide') {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
        
        // Update brush cursor visibility
        if (tool === 'brush' || tool === 'pencil' || tool === 'spray') {
            this.updateBrushCursorSize();
        } else {
            this.hideBrushCursor();
        }
        
        // Clear selection when switching tools (except for selection tools)
        if (!['select-rect', 'select-circle'].includes(tool)) {
            this.selection = null;
            this.selectionAnimationRunning = false;
            this.editor.redraw();
        }
        
        // Hide text balloon if switching away from text tool
        if (tool !== 'text') {
            this.hideTextBalloon();
        }
        
        // Update tool options display
        this.updateToolOptions(tool);
        
        // Re-render guides to show/hide handles based on active tool
        this.renderGuides();
    }

    async handleCanvasClick(e) {
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Only process if coordinates are within canvas bounds
        if (coords.x < 0 || coords.x >= this.editor.width || 
            coords.y < 0 || coords.y >= this.editor.height) {
            return;
        }
        
        if (this.currentTool === 'brush') {
            if (e.type === 'mousedown') {
                // Left click = alpha=1,draw=1, Right click = alpha=1,draw=0
                const drawValue = e.button === 0 ? 1 : 0;
                
                // Start stroke
                if (this.smoothDrawing) {
                    this.startSmoothStroke(coords.x, coords.y);
                }
                this.drawWithBrush(coords.x, coords.y, drawValue, 1);
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Continue stroke
                const drawValue = e.button === 0 ? 1 : 0;
                if (this.smoothDrawing) {
                    this.updateSmoothStroke(coords.x, coords.y, drawValue, 1);
                } else {
                    this.drawWithBrush(coords.x, coords.y, drawValue, 1);
                }
            } else if (e.type === 'mouseup' && this.isDrawing) {
                // Finish stroke
                const drawValue = e.button === 0 ? 1 : 0;
                if (this.smoothDrawing) {
                    this.finishSmoothStroke(drawValue, 1);
                }
                this.editor.saveState();
            }
        } else if (this.currentTool === 'pencil') {
            // Left click = alpha=1,draw=1, Right click = alpha=1,draw=0
            const drawValue = e.button === 0 ? 1 : 0;
            
            if (e.type === 'mousedown') {
                // Set pixel with alpha=1 and left/right click draw value
                this.editor.setPixelWithAlpha(coords.x, coords.y, drawValue, 1);
                this.editor.redraw();
                this.updateOutput();
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Continue setting pixels with same draw/alpha values
                this.editor.setPixelWithAlpha(coords.x, coords.y, drawValue, 1);
                this.editor.redraw();
                this.updateOutput();
            } else if (e.type === 'mouseup' && this.isDrawing) {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'eraser') {
            // Eraser tool: always sets alpha=0, draw=0
            if (e.type === 'mousedown') {
                if (this.eraserSmooth) {
                    this.startSmoothStroke(coords.x, coords.y);
                }
                this.drawWithBrush(coords.x, coords.y, 0, 0, this.eraserSize);
            } else if (e.type === 'mousemove' && this.isDrawing) {
                if (this.eraserSmooth) {
                    this.updateSmoothStroke(coords.x, coords.y, 0, 0);
                } else {
                    this.drawWithBrush(coords.x, coords.y, 0, 0, this.eraserSize);
                }
            } else if (e.type === 'mouseup' && this.isDrawing) {
                if (this.eraserSmooth) {
                    this.finishSmoothStroke(0, 0, this.eraserSize);
                }
                this.editor.saveState();
            }
        } else if (this.currentTool === 'bucket') {
            if (e.button === 0) { // Left click = fill with current pattern
                this.editor.floodFill(coords.x, coords.y, 1, this.currentPattern);
            } else { // Right click = clear (white fill)
                this.editor.floodFill(coords.x, coords.y, 0);
            }
            this.editor.saveState();
            this.updateOutput();
        } else if (this.currentTool === 'spray') {
            this.editor.spray(coords.x, coords.y, this.sprayRadius, this.sprayDensity, this.currentPattern);
            this.editor.redraw();
            this.updateOutput();
            if (e.type === 'mouseup') {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'blur') {
            this.applyBlurEffect(coords.x, coords.y);
            if (e.type === 'mouseup') {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'text') {
            this.showTextBalloonAt(e.clientX, e.clientY, coords.x, coords.y);
        }
    }

    handleZoom(e) {
        const currentZoom = this.editor.zoom;
        const zoomLevels = [1, 2, 4, 8, 16, 32];
        const currentIndex = zoomLevels.indexOf(currentZoom);
        let newIndex = currentIndex;
        
        if (e.deltaY < 0) {
            newIndex = Math.min(currentIndex + 1, zoomLevels.length - 1);
        } else {
            newIndex = Math.max(currentIndex - 1, 0);
        }
        
        const newZoom = zoomLevels[newIndex];
        if (newZoom !== currentZoom) {
            this.setZoom(newZoom);
        }
    }

    // ===== CANVAS PANNING METHODS =====
    
    startPanning(e) {
        this.isPanning = true;
        this.panStart = {
            x: e.clientX,
            y: e.clientY,
            canvasOffsetX: this.canvasOffset.x,
            canvasOffsetY: this.canvasOffset.y
        };
        
        // Change cursor to indicate panning mode
        this.canvas.style.cursor = 'move';
        
        // Prevent middle mouse button default behavior (like opening links in new tab)
        e.preventDefault();
    }
    
    updatePanning(e) {
        if (!this.isPanning || !this.panStart) return;
        
        const deltaX = e.clientX - this.panStart.x;
        const deltaY = e.clientY - this.panStart.y;
        
        this.canvasOffset.x = this.panStart.canvasOffsetX + deltaX;
        this.canvasOffset.y = this.panStart.canvasOffsetY + deltaY;
        
        this.applyCanvasOffset();
        this.renderGuides();
    }
    
    stopPanning() {
        this.isPanning = false;
        this.panStart = null;
        
        // Reset cursor
        this.canvas.style.cursor = this.currentTool === 'bucket' ? '' : 'crosshair';
    }
    
    applyCanvasOffset() {
        // Get the canvas area container
        const canvasArea = this.canvas.parentElement;
        
        // Apply transform to center the canvas with offset
        this.canvas.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px)`;
        
        // Update guide positions
        this.renderGuides();
    }
    
    resetCanvasPan() {
        this.canvasOffset.x = 0;
        this.canvasOffset.y = 0;
        this.applyCanvasOffset();
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas?')) {
            this.editor.clear();
            this.updateOutput();
        }
    }

    setupPreview() {
        this.previewCanvas.width = this.editor.width;
        this.previewCanvas.height = this.editor.height;
        this.updatePreview();
    }

    updatePreview() {
        const previewCtx = this.previewCanvas.getContext('2d');
        previewCtx.imageSmoothingEnabled = false;
        
        // Clear canvas to transparent
        previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // Copy pixels from main canvas with proper alpha handling
        const imageData = previewCtx.createImageData(this.editor.width, this.editor.height);
        const data = imageData.data;
        
        const colors = this.displayModes[this.currentDisplayMode];
        const drawColor = this.hexToRgb(colors.draw_color);
        const backgroundColor = this.hexToRgb(colors.background_color);
        
        const bitmapData = this.editor.getBitmapData();
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                const pixelValue = bitmapData.pixels[y][x];
                const alphaValue = bitmapData.alpha[y][x];
                const index = (y * this.editor.width + x) * 4;
                
                if (alphaValue === 0) {
                    // Transparent pixel - set alpha to 0 for true transparency
                    data[index] = 0;       // R
                    data[index + 1] = 0;   // G
                    data[index + 2] = 0;   // B
                    data[index + 3] = 0;   // A (transparent)
                } else {
                    // Opaque pixel - apply display mode colors
                    const displayValue = this.editor.inverted ? (1 - pixelValue) : pixelValue;
                    const color = displayValue ? drawColor : backgroundColor;
                    
                    data[index] = color.r;     // R
                    data[index + 1] = color.g; // G
                    data[index + 2] = color.b; // B
                    data[index + 3] = 255;     // A (opaque)
                }
            }
        }
        
        previewCtx.putImageData(imageData, 0, 0);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }

    updateGridDisplay() {
        this.editor.setShowGrid(this.showGrid);
    }

    updateSelectionPosition(coords) {
        if (!this.selection || !this.selectionDragStart) return;
        
        const deltaX = coords.x - this.selectionDragStart.x;
        const deltaY = coords.y - this.selectionDragStart.y;
        
        // Bounds checking to prevent selection from going off-canvas
        let newX1, newY1, newX2, newY2;
        
        if (this.selection.type === 'rect') {
            newX1 = Math.max(0, Math.min(this.editor.width - 1, this.selection.x1 + deltaX));
            newX2 = Math.max(0, Math.min(this.editor.width - 1, this.selection.x2 + deltaX));
            newY1 = Math.max(0, Math.min(this.editor.height - 1, this.selection.y1 + deltaY));
            newY2 = Math.max(0, Math.min(this.editor.height - 1, this.selection.y2 + deltaY));
            
            // Only update if the entire selection fits within bounds
            if (newX2 - newX1 === this.selection.x2 - this.selection.x1 && 
                newY2 - newY1 === this.selection.y2 - this.selection.y1) {
                this.selection.x1 = newX1;
                this.selection.x2 = newX2;
                this.selection.y1 = newY1;
                this.selection.y2 = newY2;
                this.selectionDragStart = coords;
            }
        } else if (this.selection.type === 'circle') {
            const newCenterX = Math.max(this.selection.radius, Math.min(this.editor.width - 1 - this.selection.radius, this.selection.centerX + deltaX));
            const newCenterY = Math.max(this.selection.radius, Math.min(this.editor.height - 1 - this.selection.radius, this.selection.centerY + deltaY));
            
            this.selection.centerX = newCenterX;
            this.selection.centerY = newCenterY;
            this.selectionDragStart = coords;
        }
        
        // Only redraw if position actually changed
        this.drawSelectionOverlay();
    }

    moveSelectionGraphics(coords) {
        if (!this.selection || !this.selectionDragStart) return;
        
        const deltaX = coords.x - this.selectionDragStart.x;
        const deltaY = coords.y - this.selectionDragStart.y;
        
        if (deltaX === 0 && deltaY === 0) return; // No movement
        
        // Copy current selection data
        const selectionData = this.copySelectionData();
        if (!selectionData || selectionData.length === 0) return;
        
        // Clear the current selection area
        this.deleteSelection();
        
        // Paste the data at the new position
        this.pasteSelectionData(selectionData, deltaX, deltaY);
        
        // Update selection bounds
        this.updateSelectionPosition(coords);
        
        this.editor.redraw();
        this.updateOutput();
    }

    copySelectionData() {
        if (!this.selection) return null;
        
        const data = [];
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                if (this.editor.isInSelection(x, y, this.selection)) {
                    data.push({
                        x: x,
                        y: y,
                        value: this.editor.getPixel(x, y)
                    });
                }
            }
        }
        return data;
    }

    pasteSelectionData(data, deltaX, deltaY) {
        data.forEach(pixel => {
            const newX = pixel.x + deltaX;
            const newY = pixel.y + deltaY;
            
            // Only paste if within canvas bounds
            if (newX >= 0 && newX < this.editor.width && 
                newY >= 0 && newY < this.editor.height) {
                this.editor.setPixel(newX, newY, pixel.value);
            }
        });
    }

    deleteSelection() {
        if (!this.selection) return;
        
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                if (this.editor.isInSelection(x, y, this.selection)) {
                    // Set alpha=0, draw=0 for transparency
                    this.editor.setPixelWithAlpha(x, y, 0, 0);
                }
            }
        }
        
        this.editor.redraw();
        this.editor.saveState();
        this.updateOutput();
    }

    selectAll() {
        this.selection = {
            x1: 0,
            y1: 0,
            x2: this.editor.width - 1,
            y2: this.editor.height - 1,
            type: 'rect',
            active: true
        };
        this.drawSelectionOverlay();
    }

    copySelection() {
        if (!this.selection) return;
        
        this.selectionClipboard = {
            selection: {...this.selection},
            pixels: []
        };
        
        for (let y = 0; y < this.editor.height; y++) {
            this.selectionClipboard.pixels[y] = [];
            for (let x = 0; x < this.editor.width; x++) {
                if (this.editor.isInSelection(x, y, this.selection)) {
                    this.selectionClipboard.pixels[y][x] = this.editor.getPixel(x, y);
                } else {
                    this.selectionClipboard.pixels[y][x] = null;
                }
            }
        }
    }

    cutSelection() {
        this.copySelection();
        this.deleteSelection();
    }

    pasteSelection() {
        if (!this.selectionClipboard) return;
        
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                if (this.selectionClipboard.pixels[y] && this.selectionClipboard.pixels[y][x] !== null) {
                    this.editor.setPixel(x, y, this.selectionClipboard.pixels[y][x]);
                }
            }
        }
        
        this.editor.redraw();
        this.editor.saveState();
        this.updateOutput();
    }

    zoomIn() {
        const zoomLevels = [1, 2, 4, 8, 16, 32];
        const currentZoom = this.editor.zoom;
        const nextIndex = Math.min(zoomLevels.indexOf(currentZoom) + 1, zoomLevels.length - 1);
        this.setZoom(zoomLevels[nextIndex]);
    }

    zoomOut() {
        const zoomLevels = [1, 2, 4, 8, 16, 32];
        const currentZoom = this.editor.zoom;
        const prevIndex = Math.max(zoomLevels.indexOf(currentZoom) - 1, 0);
        this.setZoom(zoomLevels[prevIndex]);
    }

    drawLinePreview(x1, y1, x2, y2) {
        // Clear previous preview
        this.editor.redraw();
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Draw pixel-perfect line preview using Bresenham algorithm
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        
        // Use Bresenham's line algorithm to get exact pixels
        const linePixels = this.getLinePixels(x1, y1, x2, y2);
        
        // Draw preview pixels as red semi-transparent overlay
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        
        for (const pixel of linePixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                ctx.fillRect(pixel.x * zoom, pixel.y * zoom, zoom, zoom);
            }
        }
        
        ctx.restore();
    }

    clearLinePreview() {
        this.editor.redraw();
        if (this.selection) {
            this.drawSelectionOverlay();
        }
    }

    drawRectPreview(x1, y1, x2, y2) {
        // Clear previous preview
        this.editor.redraw();
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Draw pixel-perfect rectangle preview
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        
        // Get rectangle boundary pixels
        const rectPixels = this.getRectPixels(x1, y1, x2, y2);
        
        // Draw preview pixels as red semi-transparent overlay
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        
        for (const pixel of rectPixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                ctx.fillRect(pixel.x * zoom, pixel.y * zoom, zoom, zoom);
            }
        }
        
        ctx.restore();
    }

    calculateEllipseParams(startX, startY, endX, endY, isShiftHeld, isAltHeld) {
        if (isAltHeld) {
            // Alt held: Draw from center
            const centerX = startX;
            const centerY = startY;
            const radiusX = Math.abs(endX - startX);
            const radiusY = Math.abs(endY - startY);
            
            if (isShiftHeld) {
                // Shift + Alt: Perfect circle from center
                const radius = Math.max(radiusX, radiusY);
                return { centerX, centerY, radiusX: radius, radiusY: radius };
            } else {
                // Alt only: Oval from center
                return { centerX, centerY, radiusX, radiusY };
            }
        } else {
            // Normal mode: Draw from corner (like rectangle)
            const centerX = Math.round((startX + endX) / 2);
            const centerY = Math.round((startY + endY) / 2);
            const radiusX = Math.abs(endX - startX) / 2;
            const radiusY = Math.abs(endY - startY) / 2;
            
            if (isShiftHeld) {
                // Shift only: Perfect circle from corner
                const radius = Math.min(radiusX, radiusY);
                return { centerX, centerY, radiusX: radius, radiusY: radius };
            } else {
                // No modifiers: Oval from corner
                return { centerX, centerY, radiusX, radiusY };
            }
        }
    }

    drawCirclePreview(startX, startY, endX, endY) {
        // Clear previous preview
        this.editor.redraw();
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Draw pixel-perfect ellipse/circle preview
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        
        // Calculate ellipse parameters with modifier key support
        const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
            startX, startY, endX, endY, this.shiftPressed, this.altPressed
        );
        
        // Get ellipse boundary pixels
        const ellipsePixels = this.getEllipsePixels(centerX, centerY, radiusX, radiusY);
        
        // Draw preview pixels as red semi-transparent overlay
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        
        for (const pixel of ellipsePixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                ctx.fillRect(pixel.x * zoom, pixel.y * zoom, zoom, zoom);
            }
        }
        
        ctx.restore();
    }

    clearShapePreview() {
        this.editor.redraw();
        if (this.selection) {
            this.drawSelectionOverlay();
        }
    }

    // ===== PIXEL-PERFECT PREVIEW HELPERS =====
    
    getLinePixels(x1, y1, x2, y2) {
        const pixels = [];
        
        // Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (true) {
            pixels.push({ x, y });
            
            if (x === x2 && y === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return pixels;
    }
    
    getRectPixels(x1, y1, x2, y2) {
        const pixels = [];
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        const endX = Math.max(x1, x2);
        const endY = Math.max(y1, y2);
        
        // Check shape options to determine if we draw border, fill, or both
        const drawBorder = document.getElementById('draw-border').checked;
        const drawFill = document.getElementById('draw-fill').checked;
        
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const isBorder = (x === startX || x === endX || y === startY || y === endY);
                
                if ((drawFill) || (!drawFill && isBorder && drawBorder)) {
                    pixels.push({ x, y });
                } else if (drawBorder && isBorder) {
                    pixels.push({ x, y });
                }
            }
        }
        
        return pixels;
    }
    
    getCirclePixels(centerX, centerY, radius) {
        const pixels = [];
        const radiusSquared = radius * radius;
        const minX = Math.max(0, centerX - radius);
        const maxX = Math.min(this.editor.width - 1, centerX + radius);
        const minY = Math.max(0, centerY - radius);
        const maxY = Math.min(this.editor.height - 1, centerY + radius);
        
        // Check shape options to determine if we draw border, fill, or both
        const drawBorder = document.getElementById('draw-border').checked;
        const drawFill = document.getElementById('draw-fill').checked;
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distanceSquared = dx * dx + dy * dy;
                
                let shouldDraw = false;
                if (drawFill) {
                    shouldDraw = distanceSquared <= radiusSquared;
                } else if (drawBorder) {
                    const outerRadius = radius + 0.5;
                    const innerRadius = radius - 0.5;
                    shouldDraw = distanceSquared <= outerRadius * outerRadius && 
                               distanceSquared >= innerRadius * innerRadius;
                }
                
                if (shouldDraw) {
                    pixels.push({ x, y });
                }
            }
        }
        
        return pixels;
    }
    
    getEllipsePixels(centerX, centerY, radiusX, radiusY) {
        const pixels = [];
        const radiusXSquared = radiusX * radiusX;
        const radiusYSquared = radiusY * radiusY;
        const minX = Math.max(0, Math.floor(centerX - radiusX));
        const maxX = Math.min(this.editor.width - 1, Math.ceil(centerX + radiusX));
        const minY = Math.max(0, Math.floor(centerY - radiusY));
        const maxY = Math.min(this.editor.height - 1, Math.ceil(centerY + radiusY));
        
        // Check circle-specific shape options to determine if we draw border, fill, or both
        const drawBorder = document.getElementById('circle-draw-border').checked;
        const drawFill = document.getElementById('circle-draw-fill').checked;
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                
                // Ellipse equation: (x²/a²) + (y²/b²) = 1
                const ellipseValue = (dx * dx) / radiusXSquared + (dy * dy) / radiusYSquared;
                
                let shouldDraw = false;
                if (drawFill) {
                    shouldDraw = ellipseValue <= 1.0;
                } else if (drawBorder) {
                    // For border, check if pixel is on the edge of the ellipse
                    const outerRadiusX = radiusX + 0.5;
                    const outerRadiusY = radiusY + 0.5;
                    const innerRadiusX = Math.max(0, radiusX - 0.5);
                    const innerRadiusY = Math.max(0, radiusY - 0.5);
                    
                    const outerEllipse = (dx * dx) / (outerRadiusX * outerRadiusX) + (dy * dy) / (outerRadiusY * outerRadiusY);
                    const innerEllipse = (dx * dx) / (innerRadiusX * innerRadiusX) + (dy * dy) / (innerRadiusY * innerRadiusY);
                    
                    shouldDraw = outerEllipse <= 1.0 && innerEllipse >= 1.0;
                }
                
                if (shouldDraw) {
                    pixels.push({ x, y });
                }
            }
        }
        
        return pixels;
    }

    updateOutput() {
        // Update preview only (code generation is now handled by dialogs)
        this.updatePreview();
    }


    exportPNG() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const bitmapData = this.editor.getBitmapData();
        
        canvas.width = this.editor.width;
        canvas.height = this.editor.height;
        
        // Create ImageData for pixel-perfect alpha support
        const imageData = ctx.createImageData(this.editor.width, this.editor.height);
        const data = imageData.data;
        
        // Get current display mode colors
        const colors = this.displayModes[this.currentDisplayMode];
        const drawColor = this.hexToRgb(colors.draw_color);
        const backgroundColor = this.hexToRgb(colors.background_color);
        
        // Set pixels with proper alpha channel support
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                const pixelValue = bitmapData.pixels[y][x];
                const alphaValue = bitmapData.alpha[y][x];
                const index = (y * this.editor.width + x) * 4;
                
                if (alphaValue === 0) {
                    // Transparent pixel - set alpha to 0 for PNG transparency
                    data[index] = 0;       // R
                    data[index + 1] = 0;   // G
                    data[index + 2] = 0;   // B
                    data[index + 3] = 0;   // A (transparent)
                } else {
                    // Opaque pixel - apply display mode colors
                    const displayValue = this.editor.inverted ? (1 - pixelValue) : pixelValue;
                    const color = displayValue ? drawColor : backgroundColor;
                    
                    data[index] = color.r;     // R
                    data[index + 1] = color.g; // G
                    data[index + 2] = color.b; // B
                    data[index + 3] = 255;     // A (opaque)
                }
            }
        }
        
        // Put the image data on the canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Download the PNG
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const projectName = document.getElementById('project-name').value || 'my_bitmap';
            a.href = url;
            a.download = `${projectName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('PNG exported successfully!', 'success');
        }, 'image/png');
    }

    /**
     * Export animation as GIF (Phase 5)
     */
    exportAnimationGIF() {
        if (this.legacyAdapter) {
            this.legacyAdapter.exportAnimationGIF();
        } else {
            alert('Animation export requires the advanced CanvasUnit system.');
        }
    }

    /**
     * Export animation as APNG (Phase 5)
     */
    exportAnimationAPNG() {
        if (this.legacyAdapter) {
            this.legacyAdapter.exportAnimationAPNG();
        } else {
            alert('Animation export requires the advanced CanvasUnit system.');
        }
    }

    /**
     * Export animation as sprite sheet (Phase 5)
     */
    exportSpriteSheet() {
        if (this.legacyAdapter) {
            this.legacyAdapter.exportSpriteSheet();
        } else {
            alert('Animation export requires the advanced CanvasUnit system.');
        }
    }

    /**
     * Show new project dialog (Phase 6)
     */
    showNewProjectDialog() {
        if (this.legacyAdapter) {
            this.legacyAdapter.showNewProjectDialog();
        } else {
            // Fallback to old dialog
            this.dialogs.showNewCanvasDialog();
        }
    }

    /**
     * Show open project dialog (Phase 6)
     */
    showOpenProjectDialog() {
        if (this.legacyAdapter) {
            this.legacyAdapter.showOpenProjectDialog();
        } else {
            alert('Project management requires the advanced CanvasUnit system.');
        }
    }

    /**
     * Show recent projects dialog (Phase 6)
     */
    showRecentProjectsDialog() {
        if (this.legacyAdapter) {
            this.legacyAdapter.showRecentProjectsDialog();
        } else {
            alert('Project management requires the advanced CanvasUnit system.');
        }
    }

    /**
     * Save current project (Phase 6)
     */
    saveProject() {
        if (this.legacyAdapter) {
            this.legacyAdapter.saveProject();
        } else {
            // Fallback to old save
            this.saveBitmapToStorage();
        }
    }

    /**
     * Save project as new file (Phase 6)
     */
    saveProjectAs() {
        if (this.legacyAdapter) {
            this.legacyAdapter.saveProjectAs();
        } else {
            alert('Project management requires the advanced CanvasUnit system.');
        }
    }

    /**
     * Export project as .bdp file (Phase 6)
     */
    exportProject() {
        if (this.legacyAdapter) {
            this.legacyAdapter.exportProject();
        } else {
            alert('Project management requires the advanced CanvasUnit system.');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#27ae60';
                break;
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                break;
            default:
                notification.style.backgroundColor = '#3498db';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // ===== THEME MANAGEMENT =====
    
    setupThemeManagement() {
        // Load saved theme or default to auto
        this.currentTheme = localStorage.getItem('bitsdraw-theme') || 'auto';
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Use addEventListener instead of deprecated addListener
            const handleThemeChange = () => {
                console.log('System theme changed, current theme:', this.currentTheme);
                if (this.currentTheme === 'auto') {
                    console.log('Applying auto theme...');
                    this.applyTheme('auto');
                }
            };
            
            // Try both methods for compatibility
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handleThemeChange);
            } else if (mediaQuery.addListener) {
                mediaQuery.addListener(handleThemeChange);
            }
            
            console.log('Auto theme setup complete. System prefers dark:', mediaQuery.matches);
        }
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('bitsdraw-theme', theme);
        this.applyTheme(theme);
        this.showNotification(`Theme changed to ${theme}`, 'info');
    }
    
    applyTheme(theme) {
        const html = document.documentElement;
        console.log('Applying theme:', theme);
        
        // Remove existing theme attributes
        html.removeAttribute('data-theme');
        
        if (theme === 'dark') {
            console.log('Setting dark theme');
            html.setAttribute('data-theme', 'dark');
        } else if (theme === 'auto') {
            // Check system preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            console.log('Auto theme - system prefers dark:', prefersDark);
            if (prefersDark) {
                console.log('Setting dark theme for auto mode');
                html.setAttribute('data-theme', 'dark');
            } else {
                console.log('Setting light theme for auto mode');
            }
        } else {
            console.log('Setting light theme');
        }
        
        console.log('Final data-theme attribute:', html.getAttribute('data-theme'));
        
        this.updateThemeMenuIndicators();
    }
    
    updateThemeMenuIndicators() {
        // Update menu indicators to show current theme
        document.querySelectorAll('[data-action^="theme-"]').forEach(item => {
            const themeType = item.dataset.action.replace('theme-', '');
            if (themeType === this.currentTheme) {
                item.style.fontWeight = 'bold';
                item.textContent = '• ' + item.textContent.replace('• ', '');
            } else {
                item.style.fontWeight = 'normal';
                item.textContent = item.textContent.replace('• ', '');
            }
        });
    }

    // Hand tool layer dragging methods
    startLayerDrag(e) {
        if (this.currentTool !== 'hand') return;
        
        this.isDraggingLayer = true;
        this.layerDragStart = {
            x: e.clientX,
            y: e.clientY,
            canvasOffsetX: this.canvasOffset ? this.canvasOffset.x : 0,
            canvasOffsetY: this.canvasOffset ? this.canvasOffset.y : 0
        };
        
        // Change cursor to grabbing
        this.canvas.style.cursor = 'grabbing';
        
        // Change the hand icon to grabbing
        const handTool = document.getElementById('hand-tool');
        if (handTool) {
            const icon = handTool.querySelector('i');
            if (icon) {
                icon.className = 'ph ph-hand-grabbing';
            }
        }
        
        e.preventDefault();
    }

    updateLayerDrag(e) {
        if (!this.isDraggingLayer || !this.layerDragStart) return;
        
        const deltaX = e.clientX - this.layerDragStart.x;
        const deltaY = e.clientY - this.layerDragStart.y;
        
        // Initialize canvas offset if it doesn't exist
        if (!this.canvasOffset) {
            this.canvasOffset = { x: 0, y: 0 };
        }
        
        // Update canvas offset
        this.canvasOffset.x = this.layerDragStart.canvasOffsetX + deltaX;
        this.canvasOffset.y = this.layerDragStart.canvasOffsetY + deltaY;
        
        // Apply the transformation to the canvas
        this.canvas.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px)`;
        
        // Update guide positions
        this.renderGuides();
        
        e.preventDefault();
    }

    stopLayerDrag() {
        if (!this.isDraggingLayer) return;
        
        this.isDraggingLayer = false;
        this.layerDragStart = null;
        
        // Change cursor back to grab
        this.canvas.style.cursor = 'grab';
        
        // Change the hand icon back to regular hand
        const handTool = document.getElementById('hand-tool');
        if (handTool) {
            const icon = handTool.querySelector('i');
            if (icon) {
                icon.className = 'ph ph-hand';
            }
        }
    }

    // Move tool layer content methods
    startLayerMove(e) {
        if (this.currentTool !== 'move') return;
        
        const activeLayer = this.editor.getActiveLayer();
        if (!activeLayer) return;
        
        this.isMovingLayer = true;
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Save original pixels and alpha from active layer
        const originalPixels = [];
        const originalAlpha = [];
        for (let y = 0; y < this.editor.height; y++) {
            originalPixels[y] = [];
            originalAlpha[y] = [];
            for (let x = 0; x < this.editor.width; x++) {
                const index = this.editor.getPixelIndex(x, y);
                originalPixels[y][x] = activeLayer.pixels[index];
                originalAlpha[y][x] = activeLayer.alpha[index];
            }
        }
        
        this.layerMoveStart = {
            x: coords.x,
            y: coords.y,
            originalPixels: originalPixels,
            originalAlpha: originalAlpha
        };
        
        e.preventDefault();
    }

    updateLayerMove(e) {
        if (!this.isMovingLayer || !this.layerMoveStart) return;
        
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        const deltaX = coords.x - this.layerMoveStart.x;
        const deltaY = coords.y - this.layerMoveStart.y;
        
        // Only update if there's actually movement
        if (deltaX === 0 && deltaY === 0) return;
        
        this.moveLayerContent(deltaX, deltaY);
        
        e.preventDefault();
    }

    stopLayerMove() {
        if (!this.isMovingLayer) return;
        
        this.isMovingLayer = false;
        this.layerMoveStart = null;
        
        // Save state for undo
        this.editor.saveState();
        this.updateOutput();
    }

    moveLayerContent(deltaX, deltaY) {
        if (!this.layerMoveStart) return;
        
        const activeLayer = this.editor.getActiveLayer();
        if (!activeLayer) return;
        
        const { width, height } = { width: this.editor.width, height: this.editor.height };
        const originalPixels = this.layerMoveStart.originalPixels;
        const originalAlpha = this.layerMoveStart.originalAlpha;
        
        // Clear current layer first (both pixels and alpha)
        activeLayer.pixels.fill(0);
        activeLayer.alpha.fill(0);
        
        // Create new pixel and alpha layout by moving original data
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sourceX = x - deltaX;
                let sourceY = y - deltaY;
                
                if (this.moveLoop) {
                    // Loop/wrap mode - pixels wrap around edges
                    sourceX = ((sourceX % width) + width) % width;
                    sourceY = ((sourceY % height) + height) % height;
                } else {
                    // Clip mode - pixels outside bounds are lost
                    if (sourceX < 0 || sourceX >= width || sourceY < 0 || sourceY >= height) {
                        continue; // Leave as 0 (transparent background)
                    }
                }
                
                // Get original pixel and alpha values and set at new position
                if (sourceY < originalPixels.length && sourceX < originalPixels[sourceY].length) {
                    const pixelValue = originalPixels[sourceY][sourceX];
                    const alphaValue = originalAlpha[sourceY][sourceX];
                    const index = this.editor.getPixelIndex(x, y);
                    activeLayer.pixels[index] = pixelValue;
                    activeLayer.alpha[index] = alphaValue;
                }
            }
        }
        
        // Mark layer as dirty and redraw
        this.editor.markCompositeDirty();
        this.editor.addDirtyRect(0, 0, width, height);
        this.editor.redraw();
    }

    // Guide tool methods
    startGuideCreation(e) {
        if (this.currentTool !== 'guide') return;
        
        // Only allow new guide creation if not dragging
        if (this.isDraggingGuide) {
            return;
        }
        
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Check if clicking on a guide handle - if so, don't create new guide
        const clickedGuide = this.getGuideAtPoint(coords.x, coords.y);
        if (clickedGuide) {
            // Start dragging existing guide immediately
            this.preparePotentialGuideDrag(e, clickedGuide);
            this.isDraggingGuide = true;
            return;
        }
        
        // Start creating new guide only in empty space
        this.isCreatingGuide = true;
        
        // Snap to grid if enabled
        if (this.guideSnap && this.showGrid) {
            coords.x = Math.round(coords.x);
            coords.y = Math.round(coords.y);
        }
        
        this.guideCreationStart = {
            x: coords.x,
            y: coords.y
        };
        
        // Start creating preview guide
        this.currentGuidePreview = {
            x: coords.x,
            y: coords.y,
            w: 0,
            h: 0
        };
        
        this.renderGuides();
        e.preventDefault();
    }

    updateGuideCreation(e) {
        if (!this.isCreatingGuide || !this.guideCreationStart) return;
        
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Snap to grid if enabled
        if (this.guideSnap && this.showGrid) {
            coords.x = Math.round(coords.x);
            coords.y = Math.round(coords.y);
        }
        
        // Calculate guide dimensions
        const startX = Math.min(this.guideCreationStart.x, coords.x);
        const startY = Math.min(this.guideCreationStart.y, coords.y);
        const endX = Math.max(this.guideCreationStart.x, coords.x);
        const endY = Math.max(this.guideCreationStart.y, coords.y);
        
        this.currentGuidePreview = {
            x: startX,
            y: startY,
            w: endX - startX,
            h: endY - startY
        };
        
        this.renderGuides();
        e.preventDefault();
    }

    finishGuideCreation(e) {
        if (!this.isCreatingGuide || !this.guideCreationStart || !this.currentGuidePreview) return;
        
        // Only create guide if it has meaningful size
        if (this.currentGuidePreview.w > 0 && this.currentGuidePreview.h > 0) {
            const guideName = document.getElementById('guide-name').value || 'Guide';
            
            const guide = {
                id: 'guide_' + Date.now(),
                name: guideName,
                x: this.currentGuidePreview.x,
                y: this.currentGuidePreview.y,
                w: this.currentGuidePreview.w,
                h: this.currentGuidePreview.h,
                color: this.guideColors[this.guideColorIndex % this.guideColors.length]
            };
            
            this.guides.push(guide);
            this.guideColorIndex++;
            this.activeGuideId = guide.id;
            
            // Update guide name for next guide
            const nextGuideNumber = this.guides.length + 1;
            document.getElementById('guide-name').value = 'Guide ' + nextGuideNumber;
            
            this.updateGuidesPanel();
        }
        
        this.isCreatingGuide = false;
        this.guideCreationStart = null;
        this.currentGuidePreview = null;
        this.renderGuides();
        
        e.preventDefault();
    }

    renderGuides() {
        // Remove existing guide overlays
        const existingOverlays = document.querySelectorAll('.guide-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
        
        // Don't render guides if showGuides is false
        if (!this.showGuides) {
            return;
        }
        
        // Get canvas area container for clipping
        const canvasArea = this.canvas.parentElement;
        const canvasAreaRect = canvasArea.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        const zoom = this.editor.zoom;
        
        // Only show handles when guide tool is active
        const showHandles = this.currentTool === 'guide';
        
        // Render existing guides
        this.guides.forEach(guide => {
            const isActive = guide.id === this.activeGuideId;
            this.renderGuideOverlay(guide, canvasRect, canvasAreaRect, zoom, isActive, false, showHandles);
        });
        
        // Render preview guide during creation
        if (this.currentGuidePreview && this.isCreatingGuide) {
            const previewGuide = {
                ...this.currentGuidePreview,
                color: this.guideColors[this.guideColorIndex % this.guideColors.length]
            };
            this.renderGuideOverlay(previewGuide, canvasRect, canvasAreaRect, zoom, true, true, showHandles);
        }
    }

    renderGuideOverlay(guide, canvasRect, canvasAreaRect, zoom, isActive = false, isPreview = false, showHandles = true) {
        const overlay = document.createElement('div');
        overlay.className = 'guide-overlay';
        overlay.style.position = 'absolute';
        
        // Calculate guide position relative to canvas (no extra offset needed)
        const guideLeft = canvasRect.left + guide.x * zoom;
        const guideTop = canvasRect.top + guide.y * zoom;
        const guideWidth = guide.w * zoom;
        const guideHeight = guide.h * zoom;
        
        // Check if guide is visible within canvas area bounds
        const areaLeft = canvasAreaRect.left;
        const areaTop = canvasAreaRect.top;
        const areaRight = canvasAreaRect.right;
        const areaBottom = canvasAreaRect.bottom;
        
        // Skip rendering if guide is completely outside canvas area
        if (guideLeft >= areaRight || guideTop >= areaBottom || 
            guideLeft + guideWidth <= areaLeft || guideTop + guideHeight <= areaTop) {
            return;
        }
        
        // Clip guide to canvas area bounds
        const clippedLeft = Math.max(guideLeft, areaLeft);
        const clippedTop = Math.max(guideTop, areaTop);
        const clippedRight = Math.min(guideLeft + guideWidth, areaRight);
        const clippedBottom = Math.min(guideTop + guideHeight, areaBottom);
        
        overlay.style.left = clippedLeft + 'px';
        overlay.style.top = clippedTop + 'px';
        overlay.style.width = (clippedRight - clippedLeft) + 'px';
        overlay.style.height = (clippedBottom - clippedTop) + 'px';
        overlay.style.borderColor = guide.color;
        overlay.style.opacity = isActive ? '0.6' : '0.3';
        overlay.style.zIndex = isActive ? '102' : '100';
        
        // Add thicker border for active guide
        if (isActive) {
            overlay.style.borderWidth = '3px';
        }
        
        if (isPreview) {
            overlay.style.borderStyle = 'dashed';
            overlay.style.opacity = '0.8';
        }
        
        if (!isPreview) {
            overlay.dataset.guideId = guide.id;
            overlay.style.pointerEvents = 'none'; // Let canvas handle mouse events
            
            // Add drag handles to the guide only if showHandles is true
            if (showHandles) {
                this.addGuideHandles(overlay, guide, isActive);
            }
        }
        
        document.body.appendChild(overlay);
    }

    addGuideHandles(overlay, guide, isActive) {
        // Add center handle for moving the guide
        this.addMoveHandle(overlay, guide, isActive);
        
        // Add corner handles for resizing
        this.addResizeHandles(overlay, guide);
    }

    addMoveHandle(overlay, guide, isActive) {
        const handle = document.createElement('div');
        handle.className = 'guide-handle guide-move-handle';
        handle.style.position = 'absolute';
        handle.style.width = isActive ? '16px' : '12px';
        handle.style.height = isActive ? '16px' : '12px';
        handle.style.background = guide.color;
        handle.style.border = isActive ? '3px solid white' : '2px solid white';
        handle.style.borderRadius = '50%';
        handle.style.cursor = 'move';
        handle.style.left = '50%';
        handle.style.top = '50%';
        handle.style.transform = 'translate(-50%, -50%)';
        handle.style.pointerEvents = 'all';
        handle.style.zIndex = '103';
        handle.style.boxShadow = isActive ? '0 2px 6px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.3)';
        
        // Add mouse events to handle
        handle.addEventListener('mousedown', (e) => {
            if (this.currentTool === 'guide') {
                e.stopPropagation();
                e.preventDefault();
                
                // Start dragging existing guide
                this.preparePotentialGuideDrag(e, guide, 'move');
                this.isDraggingGuide = true;
            }
        });
        
        handle.addEventListener('mouseenter', () => {
            if (this.currentTool === 'guide') {
                handle.style.transform = 'translate(-50%, -50%) scale(1.2)';
            }
        });
        
        handle.addEventListener('mouseleave', () => {
            handle.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        overlay.appendChild(handle);
    }

    addResizeHandles(overlay, guide) {
        const handlePositions = [
            { pos: 'nw', left: '0%', top: '0%', cursor: 'nw-resize' },
            { pos: 'ne', left: '100%', top: '0%', cursor: 'ne-resize' },
            { pos: 'sw', left: '0%', top: '100%', cursor: 'sw-resize' },
            { pos: 'se', left: '100%', top: '100%', cursor: 'se-resize' }
        ];
        
        handlePositions.forEach(position => {
            const handle = document.createElement('div');
            handle.className = `guide-handle guide-resize-handle guide-resize-${position.pos}`;
            handle.style.position = 'absolute';
            handle.style.width = '10px';
            handle.style.height = '10px';
            handle.style.background = guide.color;
            handle.style.border = '2px solid white';
            handle.style.borderRadius = '2px'; // Square handles
            handle.style.cursor = position.cursor;
            handle.style.left = position.left;
            handle.style.top = position.top;
            handle.style.transform = 'translate(-50%, -50%)';
            handle.style.pointerEvents = 'all';
            handle.style.zIndex = '104';
            handle.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
            
            
            // Add mouse events to resize handle
            handle.addEventListener('mousedown', (e) => {
                if (this.currentTool === 'guide') {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    
                    // Start resizing guide
                    this.preparePotentialGuideDrag(e, guide, 'resize', position.pos);
                    this.isResizingGuide = true;
                }
            });
            
            handle.addEventListener('mouseenter', () => {
                if (this.currentTool === 'guide') {
                    handle.style.transform = 'translate(-50%, -50%) scale(1.3)';
                }
            });
            
            handle.addEventListener('mouseleave', () => {
                handle.style.transform = 'translate(-50%, -50%) scale(1)';
            });
            
            overlay.appendChild(handle);
        });
    }

    updateGuidesPanel() {
        const guidesList = document.getElementById('guides-list');
        guidesList.innerHTML = '';
        
        this.guides.forEach(guide => {
            const guideItem = document.createElement('div');
            guideItem.className = 'guide-item';
            if (guide.id === this.activeGuideId) {
                guideItem.classList.add('active');
            }
            
            guideItem.innerHTML = `
                <div class="guide-color" style="background-color: ${guide.color}"></div>
                <div class="guide-info">
                    <div class="guide-name">${guide.name}</div>
                    <div class="guide-coords">${guide.x},${guide.y} ${guide.w}×${guide.h}</div>
                </div>
                <div class="guide-actions">
                    <button class="guide-action" title="Select" onclick="bitsDraw.selectGuide('${guide.id}')">
                        <i class="ph ph-cursor"></i>
                    </button>
                    <button class="guide-action" title="Delete" onclick="bitsDraw.deleteGuide('${guide.id}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;
            
            guideItem.addEventListener('click', (e) => {
                // Only select if not clicking on action buttons
                if (!e.target.closest('.guide-action')) {
                    this.selectGuide(guide.id);
                }
            });
            
            guidesList.appendChild(guideItem);
        });
    }

    selectGuide(guideId) {
        this.activeGuideId = guideId;
        this.updateGuidesPanel();
        this.renderGuides();
    }

    deleteGuide(guideId) {
        this.guides = this.guides.filter(guide => guide.id !== guideId);
        if (this.activeGuideId === guideId) {
            this.activeGuideId = null;
        }
        this.updateGuidesPanel();
        this.renderGuides();
    }

    clearAllGuides() {
        this.guides = [];
        this.activeGuideId = null;
        this.guideColorIndex = 0;
        this.updateGuidesPanel();
        this.renderGuides();
    }

    exportGuides(format = 'txt') {
        if (this.guides.length === 0) {
            this.showNotification('No guides to export', 'error');
            return;
        }
        
        let content = '';
        
        if (format === 'txt') {
            this.guides.forEach(guide => {
                content += `${guide.name} ${guide.x} ${guide.y} ${guide.w} ${guide.h}\n`;
            });
        } else if (format === 'json') {
            const guidesData = this.guides.map(guide => ({
                name: guide.name,
                x: guide.x,
                y: guide.y,
                w: guide.w,
                h: guide.h
            }));
            content = JSON.stringify(guidesData, null, 2);
        }
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guides.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Guides exported as ${format.toUpperCase()}`, 'success');
    }

    setupGuidesPanel() {
        // Add guide button
        const addBtn = document.getElementById('add-guide-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
            const guideName = document.getElementById('guide-name').value || 'Guide';
            
            // Create a default guide in the center
            const guide = {
                id: 'guide_' + Date.now(),
                name: guideName,
                x: Math.floor(this.editor.width / 4),
                y: Math.floor(this.editor.height / 4),
                w: Math.floor(this.editor.width / 2),
                h: Math.floor(this.editor.height / 2),
                color: this.guideColors[this.guideColorIndex % this.guideColors.length]
            };
            
            this.guides.push(guide);
            this.guideColorIndex++;
            this.activeGuideId = guide.id;
            
            // Update guide name for next guide
            const nextGuideNumber = this.guides.length + 1;
            document.getElementById('guide-name').value = 'Guide ' + nextGuideNumber;
            
            this.updateGuidesPanel();
            this.renderGuides();
            });
        } else {
            console.error('Add guide button not found');
        }
        
        // Export guides button with dropdown
        const exportBtn = document.getElementById('export-guides-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                if (this.guides.length === 0) {
                    this.showNotification('No guides to export', 'error');
                    return;
                }
                
                this.showExportGuidesDropdown(e.target);
            });
        } else {
            console.error('Export guides button not found');
        }
        
        // Clear all guides button
        const clearBtn = document.getElementById('clear-guides-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.guides.length === 0) {
                    this.showNotification('No guides to clear', 'error');
                    return;
                }
                
                if (confirm('Clear all guides? This cannot be undone.')) {
                    this.clearAllGuides();
                    this.showNotification('All guides cleared', 'success');
                }
            });
        } else {
            console.error('Clear guides button not found');
        }
    }

    // Guide interaction methods
    getGuideAtPoint(x, y) {
        // Find guide that contains the point (coordinates are already in canvas space)
        return this.guides.find(guide => {
            return x >= guide.x && x <= guide.x + guide.w &&
                   y >= guide.y && y <= guide.y + guide.h;
        });
    }

    preparePotentialGuideDrag(e, guide, operation = 'move', direction = null) {
        // Use screen coordinates for drag calculation
        this.guideDragStart = {
            screenX: e.clientX,
            screenY: e.clientY,
            guideOriginal: { ...guide },
            operation: operation
        };
        this.draggedGuideId = guide.id;
        this.guideResizeDirection = direction;
        this.isDraggingGuide = false; // Will become true on mouse move
        this.isResizingGuide = false;
    }

    updateGuideDrag(e) {
        if (!this.guideDragStart || !this.draggedGuideId) {
            return;
        }
        
        const operation = this.guideDragStart.operation;
        
        if (!this.isDraggingGuide && !this.isResizingGuide) {
            // Start operation
            if (operation === 'resize') {
                this.isResizingGuide = true;
            } else {
                this.isDraggingGuide = true;
            }
        }
        
        // Calculate delta in screen coordinates, then convert to canvas coordinates
        const deltaScreenX = e.clientX - this.guideDragStart.screenX;
        const deltaScreenY = e.clientY - this.guideDragStart.screenY;
        
        // Convert screen delta to canvas delta (account for zoom)
        const deltaX = Math.round(deltaScreenX / this.editor.zoom);
        const deltaY = Math.round(deltaScreenY / this.editor.zoom);
        
        const guide = this.guides.find(g => g.id === this.draggedGuideId);
        if (guide) {
            if (operation === 'resize') {
                this.updateGuideResize(guide, deltaX, deltaY);
            } else {
                this.updateGuideMove(guide, deltaX, deltaY);
            }
            
            this.updateGuidesPanel();
            this.renderGuides();
        }
        
        e.preventDefault();
    }

    updateGuideMove(guide, deltaX, deltaY) {
        let newX = this.guideDragStart.guideOriginal.x + deltaX;
        let newY = this.guideDragStart.guideOriginal.y + deltaY;
        
        // Snap to grid if enabled
        if (this.guideSnap && this.showGrid) {
            newX = Math.round(newX);
            newY = Math.round(newY);
        }
        
        // Keep guide within canvas bounds
        newX = Math.max(0, Math.min(newX, this.editor.width - guide.w));
        newY = Math.max(0, Math.min(newY, this.editor.height - guide.h));
        guide.x = newX;
        guide.y = newY;
    }

    updateGuideResize(guide, deltaX, deltaY) {
        const original = this.guideDragStart.guideOriginal;
        const direction = this.guideResizeDirection;
        
        
        let newX = original.x;
        let newY = original.y;
        let newW = original.w;
        let newH = original.h;
        
        // Update dimensions based on resize direction
        switch (direction) {
            case 'nw': // Top-left
                newX = original.x + deltaX;
                newY = original.y + deltaY;
                newW = original.w - deltaX;
                newH = original.h - deltaY;
                break;
            case 'ne': // Top-right
                newY = original.y + deltaY;
                newW = original.w + deltaX;
                newH = original.h - deltaY;
                break;
            case 'sw': // Bottom-left
                newX = original.x + deltaX;
                newW = original.w - deltaX;
                newH = original.h + deltaY;
                break;
            case 'se': // Bottom-right
                newW = original.w + deltaX;
                newH = original.h + deltaY;
                break;
        }
        
        // Minimum size constraints
        const minSize = 10;
        if (newW < minSize) {
            if (direction.includes('w')) {
                newX = original.x + original.w - minSize;
            }
            newW = minSize;
        }
        if (newH < minSize) {
            if (direction.includes('n')) {
                newY = original.y + original.h - minSize;
            }
            newH = minSize;
        }
        
        // Keep within canvas bounds
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        newW = Math.min(newW, this.editor.width - newX);
        newH = Math.min(newH, this.editor.height - newY);
        
        // Snap to grid if enabled
        if (this.guideSnap && this.showGrid) {
            newX = Math.round(newX);
            newY = Math.round(newY);
            newW = Math.round(newW);
            newH = Math.round(newH);
        }
        guide.x = newX;
        guide.y = newY;
        guide.w = newW;
        guide.h = newH;
    }

    stopGuideDrag(e) {
        this.isDraggingGuide = false;
        this.isResizingGuide = false;
        this.draggedGuideId = null;
        this.guideDragStart = null;
        this.guideResizeDirection = null;
    }

    showExportGuidesDropdown(button) {
        // Remove existing dropdown
        const existingDropdown = document.querySelector('.export-guides-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'export-guides-dropdown custom-dropdown';
        dropdown.style.position = 'fixed';
        dropdown.style.zIndex = '1000';
        
        // Position dropdown
        const rect = button.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 2) + 'px';
        dropdown.style.minWidth = rect.width + 'px';
        
        // Create dropdown items
        const txtItem = document.createElement('div');
        txtItem.className = 'dropdown-item';
        txtItem.innerHTML = '<i class="ph ph-download"></i> Download as .txt';
        txtItem.addEventListener('click', () => {
            this.exportGuides('txt');
            dropdown.remove();
        });
        
        const jsonItem = document.createElement('div');
        jsonItem.className = 'dropdown-item';
        jsonItem.innerHTML = '<i class="ph ph-download"></i> Download as .json';
        jsonItem.addEventListener('click', () => {
            this.exportGuides('json');
            dropdown.remove();
        });
        
        dropdown.appendChild(txtItem);
        dropdown.appendChild(jsonItem);
        
        document.body.appendChild(dropdown);
        
        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 0);
    }

    // CanvasUnit System - View Mode Switching (Phase 1)
    switchToCanvasView() {
        // Make sure canvas window is visible
        const canvasWindow = document.getElementById('canvas-window');
        if (canvasWindow) canvasWindow.style.display = 'block';
        
        console.log('Switched to Canvas View');
        
        if (this.legacyAdapter) {
            this.legacyAdapter.switchToCanvasView();
        }
    }


    // CanvasUnit System - Utility Methods
    getCanvasUnitManager() {
        return this.unitManager;
    }

    getConversionTools() {
        return this.legacyAdapter ? this.legacyAdapter.getConversionTools() : null;
    }

    // Phase 4: Smart Conversion Methods
    showSmartConversions() {
        if (this.legacyAdapter) {
            this.legacyAdapter.showConversionDialog();
        } else {
            console.log('Smart conversions require CanvasUnit system');
        }
    }

    quickConversion(type) {
        if (this.legacyAdapter && this.legacyAdapter.quickConversions) {
            if (typeof this.legacyAdapter.quickConversions[type] === 'function') {
                this.legacyAdapter.quickConversions[type]();
            } else {
                console.warn(`Unknown quick conversion type: ${type}`);
            }
        } else {
            console.log('Quick conversions require CanvasUnit system');
        }
    }

    // ===== BLUR TOOL IMPLEMENTATION =====
    
    applyBlurEffect(centerX, centerY) {
        const radius = this.blurSize;
        
        // Get area to blur (square region around cursor)
        const x1 = Math.max(0, centerX - radius);
        const y1 = Math.max(0, centerY - radius);
        const x2 = Math.min(this.editor.width - 1, centerX + radius);
        const y2 = Math.min(this.editor.height - 1, centerY + radius);
        
        const width = x2 - x1 + 1;
        const height = y2 - y1 + 1;
        
        if (width <= 0 || height <= 0) return;
        
        // Extract region data (1-bit to grayscale)
        const grayscaleData = new Uint8Array(width * height);
        const alphaData = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcX = x1 + x;
                const srcY = y1 + y;
                const srcIndex = y * width + x;
                
                const pixelData = this.editor.getPixelWithAlpha(srcX, srcY);
                grayscaleData[srcIndex] = pixelData.draw * 255; // Convert 1-bit to 8-bit
                alphaData[srcIndex] = pixelData.alpha;
            }
        }
        
        // Analyze color palette in the blur region
        const colorPalette = this.analyzeBlurRegionPalette(grayscaleData, alphaData, width, height);
        
        // Apply context-aware blur and dithering
        const { ditheredDrawData, ditheredAlphaData } = this.applyContextAwareBlur(
            grayscaleData, alphaData, width, height, colorPalette
        );
        
        // Write result back to canvas
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcX = x1 + x;
                const srcY = y1 + y;
                const srcIndex = y * width + x;
                
                // Apply both dithered draw and alpha values
                const newDrawValue = ditheredDrawData[srcIndex];
                const newAlphaValue = ditheredAlphaData[srcIndex];
                this.editor.setPixelWithAlpha(srcX, srcY, newDrawValue, newAlphaValue);
            }
        }
        
        this.editor.scheduleRender();
    }
    
    analyzeBlurRegionPalette(grayscaleData, alphaData, width, height) {
        let hasBlack = false;
        let hasWhite = false;
        let hasTransparent = false;
        
        // Analyze what colors exist in the opaque pixels
        for (let i = 0; i < grayscaleData.length; i++) {
            if (alphaData[i] === 1) { // Only analyze opaque pixels
                const pixelValue = grayscaleData[i];
                if (pixelValue === 0) hasWhite = true;        // 0 = white pixel
                else if (pixelValue === 255) hasBlack = true;  // 255 = black pixel
            } else {
                hasTransparent = true; // Track existing transparency
            }
        }
        
        // Determine target palette based on existing colors
        let targetPalette;
        if (hasBlack && !hasWhite) {
            // Pure black region → target: black + transparency
            targetPalette = 'black-alpha';
        } else if (hasWhite && !hasBlack) {
            // Pure white region → target: white + transparency  
            targetPalette = 'white-alpha';
        } else if (hasBlack && hasWhite) {
            // Mixed region → target: white + black + transparency
            targetPalette = 'white-black-alpha';
        } else {
            // Fallback: if region is empty or all transparent
            targetPalette = 'white-black-alpha';
        }
        
        DEBUG.log(`🎨 Blur region analysis: hasBlack=${hasBlack}, hasWhite=${hasWhite}, hasTransparent=${hasTransparent} → palette: ${targetPalette}`);
        
        return {
            hasBlack,
            hasWhite, 
            hasTransparent,
            targetPalette
        };
    }
    
    applyContextAwareBlur(grayscaleData, alphaData, width, height, colorPalette) {
        let ditheredDrawData, ditheredAlphaData;
        
        if (colorPalette.targetPalette === 'black-alpha') {
            // Black-only region: blur ONLY the alpha, keep pixels pure black
            const result = this.blurBlackWithAlphaOnly(grayscaleData, alphaData, width, height);
            ditheredDrawData = result.pixels;
            ditheredAlphaData = result.alpha;
            
        } else if (colorPalette.targetPalette === 'white-alpha') {
            // White-only region: blur ONLY the alpha, keep pixels pure white
            const result = this.blurWhiteWithAlphaOnly(grayscaleData, alphaData, width, height);
            ditheredDrawData = result.pixels;
            ditheredAlphaData = result.alpha;
            
        } else {
            // Mixed region: use traditional blur + dithering
            const blurredDrawData = this.gaussianBlur(grayscaleData, width, height, alphaData);
            ditheredDrawData = this.applyDithering(blurredDrawData, width, height, this.blurDitherMethod);
            
            if (this.blurAlphaChannel) {
                const blurredAlphaData = this.gaussianBlurAlpha(alphaData, width, height);
                ditheredAlphaData = this.applyAlphaDithering(blurredAlphaData, width, height, this.blurDitherMethod);
            } else {
                ditheredAlphaData = alphaData;
            }
        }
        
        return { ditheredDrawData, ditheredAlphaData };
    }
    
    blurBlackWithAlphaOnly(grayscaleData, alphaData, width, height) {
        // For black-only regions: blur ONLY the alpha channel, keep pure black pixels
        
        // Step 1: Blur the alpha channel to create soft falloff
        const blurredAlpha = this.gaussianBlurAlpha(alphaData, width, height);
        
        // Step 2: Dither the blurred alpha to get 1-bit alpha values
        const normalizedAlpha = new Float32Array(blurredAlpha.length);
        for (let i = 0; i < blurredAlpha.length; i++) {
            normalizedAlpha[i] = blurredAlpha[i] / 255; // Convert to 0-1 range
        }
        
        const alphaLayer = {
            pixels: normalizedAlpha,
            width: width,
            height: height
        };
        
        const dithering = new DitheringEffects();
        const ditheredAlpha = dithering.ditherLayer(alphaLayer, 1.0, this.blurDitherMethod);
        
        // Step 3: Create result - pure black pixels where opaque, transparent elsewhere
        const pixelResult = new Uint8Array(grayscaleData.length);
        const alphaResult = new Uint8Array(grayscaleData.length);
        
        for (let i = 0; i < grayscaleData.length; i++) {
            alphaResult[i] = ditheredAlpha[i];
            
            // Keep pure black pixels where opaque, pixel value irrelevant where transparent
            if (alphaResult[i] === 1) {
                pixelResult[i] = 1; // Pure black pixel
            } else {
                pixelResult[i] = 0; // Transparent (pixel value doesn't matter)
            }
        }
        
        DEBUG.log(`🎯 Black-alpha blur: no gray values, only black pixels with soft alpha edges`);
        return { pixels: pixelResult, alpha: alphaResult };
    }
    
    blurWhiteWithAlphaOnly(grayscaleData, alphaData, width, height) {
        // For white-only regions: blur ONLY the alpha channel, keep pure white pixels
        
        // Step 1: Blur the alpha channel to create soft falloff
        const blurredAlpha = this.gaussianBlurAlpha(alphaData, width, height);
        
        // Step 2: Dither the blurred alpha to get 1-bit alpha values
        const normalizedAlpha = new Float32Array(blurredAlpha.length);
        for (let i = 0; i < blurredAlpha.length; i++) {
            normalizedAlpha[i] = blurredAlpha[i] / 255; // Convert to 0-1 range
        }
        
        const alphaLayer = {
            pixels: normalizedAlpha,
            width: width,
            height: height
        };
        
        const dithering = new DitheringEffects();
        const ditheredAlpha = dithering.ditherLayer(alphaLayer, 1.0, this.blurDitherMethod);
        
        // Step 3: Create result - pure white pixels where opaque, transparent elsewhere
        const pixelResult = new Uint8Array(grayscaleData.length);
        const alphaResult = new Uint8Array(grayscaleData.length);
        
        for (let i = 0; i < grayscaleData.length; i++) {
            alphaResult[i] = ditheredAlpha[i];
            
            // Keep pure white pixels where opaque, pixel value irrelevant where transparent
            if (alphaResult[i] === 1) {
                pixelResult[i] = 0; // Pure white pixel
            } else {
                pixelResult[i] = 0; // Transparent (pixel value doesn't matter)
            }
        }
        
        DEBUG.log(`🎯 White-alpha blur: no gray values, only white pixels with soft alpha edges`);
        return { pixels: pixelResult, alpha: alphaResult };
    }
    
    gaussianBlur(data, width, height, alphaData) {
        // Simple box blur approximation of Gaussian (faster)
        const radius = Math.max(1, Math.floor(this.blurSize / 2));
        const result = new Uint8Array(data.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const centerIndex = y * width + x;
                
                // Skip transparent pixels
                if (alphaData[centerIndex] === 0) {
                    result[centerIndex] = data[centerIndex];
                    continue;
                }
                
                let sum = 0;
                let count = 0;
                
                // Box blur kernel
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const ny = y + ky;
                        const nx = x + kx;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const sampleIndex = ny * width + nx;
                            
                            // Only include opaque pixels in blur calculation
                            if (alphaData[sampleIndex] === 1) {
                                sum += data[sampleIndex];
                                count++;
                            }
                        }
                    }
                }
                
                result[centerIndex] = count > 0 ? Math.round(sum / count) : data[centerIndex];
            }
        }
        
        return result;
    }
    
    gaussianBlurAlpha(alphaData, width, height) {
        // Convert 1-bit alpha to 8-bit for blurring
        const grayscaleAlpha = new Uint8Array(alphaData.length);
        for (let i = 0; i < alphaData.length; i++) {
            grayscaleAlpha[i] = alphaData[i] * 255;
        }
        
        // Apply blur without alpha masking (since we're blurring alpha itself)
        const radius = Math.max(1, Math.floor(this.blurSize / 2));
        const result = new Uint8Array(grayscaleAlpha.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const centerIndex = y * width + x;
                
                let sum = 0;
                let count = 0;
                
                // Box blur kernel
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const ny = y + ky;
                        const nx = x + kx;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const sampleIndex = ny * width + nx;
                            sum += grayscaleAlpha[sampleIndex];
                            count++;
                        }
                    }
                }
                
                result[centerIndex] = count > 0 ? Math.round(sum / count) : grayscaleAlpha[centerIndex];
            }
        }
        
        return result;
    }
    
    applyDithering(grayscaleData, width, height, method) {
        // Check if DitheringEffects is available
        if (typeof DitheringEffects === 'undefined') {
            DEBUG.warn('DitheringEffects not available, using simple threshold');
            return grayscaleData.map(pixel => pixel > 128 ? 1 : 0);
        }
        
        // Convert grayscale (0-255) to normalized (0-1) format expected by DitheringEffects
        const normalizedPixels = new Float32Array(grayscaleData.length);
        for (let i = 0; i < grayscaleData.length; i++) {
            normalizedPixels[i] = grayscaleData[i] / 255;
        }
        
        // Create layer object for DitheringEffects.ditherLayer()
        const layer = {
            pixels: normalizedPixels,
            width: width,
            height: height
        };
        
        // Create DitheringEffects instance and apply dithering
        const dithering = new DitheringEffects();
        const ditheredPixels = dithering.ditherLayer(layer, 1.0, method);
        
        return ditheredPixels;
    }
    
    applyAlphaDithering(grayscaleAlphaData, width, height, method) {
        // Check if DitheringEffects is available
        if (typeof DitheringEffects === 'undefined') {
            DEBUG.warn('DitheringEffects not available, using simple threshold for alpha');
            return grayscaleAlphaData.map(pixel => pixel > 128 ? 1 : 0);
        }
        
        // Convert grayscale alpha (0-255) to normalized (0-1) format
        const normalizedAlpha = new Float32Array(grayscaleAlphaData.length);
        for (let i = 0; i < grayscaleAlphaData.length; i++) {
            normalizedAlpha[i] = grayscaleAlphaData[i] / 255;
        }
        
        // Create layer object for DitheringEffects.ditherLayer()
        const alphaLayer = {
            pixels: normalizedAlpha,
            width: width,
            height: height
        };
        
        // Create DitheringEffects instance and apply dithering to alpha
        const dithering = new DitheringEffects();
        const ditheredAlpha = dithering.ditherLayer(alphaLayer, 1.0, method);
        
        return ditheredAlpha;
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const app = new BitsDraw();
    
    // Expose app globally for refactor bridge
    window.bitsDraw = app;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});