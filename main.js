// Debug utility - automatically detects dev vs production
// Cache buster: v1.0.3-fixed-project-name-refs
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
        this.showCheckerboard = false; // Checkerboard feature removed
        this.showGuides = true;
        this.primaryColor = '#000000'; // Black
        this.secondaryColor = '#ffffff'; // White
        this.selectionClipboard = null;
        this.isDraggingSelection = false;
        this.isDraggingSelectionGraphics = false;
        this.selectionDragStart = null;
        this.previewOverlay = null;
        this.textBalloonPos = null;
        this.brushSize = 2;
        this.eraserSize = 2;
        this.currentDrawValue = 0; // Track current draw value for stroke
        this.eraserSmooth = true;
        this.sprayRadius = 8;
        this.sprayDensity = 0.6;
        this.blurSize = 3;
        this.circleDrawBorder = true;
        this.circleDrawFill = false;
        this.blurDitherMethod = 'Bayer4x4';
        this.blurAlphaChannel = true;
        this.currentDisplayMode = 'black';
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
        
        // Load saved patterns from localStorage
        this.loadSavedPatterns();
        
        // Setup new panel system
        this.setupPanelSystem();
        
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
        
        // Ensure canvas window opens maximized by default
        const canvasWindow = document.getElementById('canvas-window');
        if (canvasWindow) {
            canvasWindow.style.width = '100%';
            canvasWindow.style.height = '100%';
            canvasWindow.style.left = '0px';
            canvasWindow.style.top = '0px';
        }
        
        // Initialize image placement dialog
        this.imagePlacementDialog = new ImagePlacementDialog(this);
        this.updateWindowMenu();
        
        // Setup tool options bar
        this.setupToolOptionsBar();
        this.updateOutput();
        this.setupBrushCursor();
        this.setupThemeManagement();
        
        // Initialize button states
        this.updateGridButton();
        // Checkerboard functionality removed
        this.updateGuidesButton();
        this.updateColorDisplay();
        
        // Test ImageImporter availability
        if (typeof ImageImporter !== 'undefined') {
            DEBUG.log('ImageImporter is available');
        } else {
            DEBUG.error('ImageImporter is NOT available');
        }
        
        // Initialize display mode
        this.setDisplayMode('black');
        
        // Initialize tool options display
        // Tool options will be updated by updateToolOptionsBar()
        
        // Initialize canvas view
    }

    initializeEventListeners() {
        this.setupCanvasEvents();
        this.setupToolbarEvents();
        this.setupKeyboardShortcuts();
        this.setupWindowEvents();
        this.setupColorPanelEvents();
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
                    // Left click = primary color (black), Right click = secondary color (white)
                    const drawValue = e.button === 0 ? 0 : 1;
                    // Use selected pattern instead of color override
                    this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, this.drawFill, false, this.currentPattern, drawValue);
                    this.editor.saveState();
                    this.updateOutput();
                } else if (this.currentTool === 'circle') {
                    this.clearShapePreview();
                    // Left click = primary color (black), Right click = secondary color (white)
                    const drawValue = e.button === 0 ? 0 : 1;
                    // Use selected pattern instead of color override
                    const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
                        this.startPos.x, this.startPos.y, coords.x, coords.y, 
                        this.shiftPressed, this.altPressed
                    );
                    if (this.circleDrawBorder && !this.circleDrawFill) {
                        // Border only
                        this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, false, true, this.currentPattern, drawValue);
                    } else if (this.circleDrawFill && !this.circleDrawBorder) {
                        // Fill only
                        this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern, drawValue);
                    } else if (this.circleDrawBorder && this.circleDrawFill) {
                        // Both border and fill
                        this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern, drawValue);
                    }
                    this.editor.saveState();
                    this.updateOutput();
                } else if (this.currentTool === 'line') {
                    this.clearLinePreview();
                    // Left click = primary color (black), Right click = secondary color (white)
                    const drawValue = e.button === 0 ? 0 : 1;
                    // Use selected pattern instead of color override
                    this.editor.drawLine(this.startPos.x, this.startPos.y, coords.x, coords.y, this.currentPattern, drawValue);
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

        // Draw mode checkboxes (optional - may not exist after moving to top bar)
        const drawBorderEl = document.getElementById('draw-border');
        if (drawBorderEl) {
            drawBorderEl.addEventListener('change', (e) => {
                this.drawBorder = e.target.checked;
            });
        }

        const drawFillEl = document.getElementById('draw-fill');
        if (drawFillEl) {
            drawFillEl.addEventListener('change', (e) => {
                this.drawFill = e.target.checked;
            });
        }

        // Circle border and fill checkboxes (optional)
        const circleDrawBorderEl = document.getElementById('circle-draw-border');
        if (circleDrawBorderEl) {
            circleDrawBorderEl.addEventListener('change', (e) => {
                this.circleDrawBorder = e.target.checked;
            });
        }

        const circleDrawFillEl = document.getElementById('circle-draw-fill');
        if (circleDrawFillEl) {
            circleDrawFillEl.addEventListener('change', (e) => {
                this.circleDrawFill = e.target.checked;
            });
        }

        // Move tool loop option (optional)
        const moveLoopEl = document.getElementById('move-loop');
        if (moveLoopEl) {
            moveLoopEl.addEventListener('change', (e) => {
                this.moveLoop = e.target.checked;
            });
        }

        // Guide tool options (optional)
        const guideSnapEl = document.getElementById('guide-snap');
        if (guideSnapEl) {
            guideSnapEl.addEventListener('change', (e) => {
                this.guideSnap = e.target.checked;
            });
        }

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
        const displayDropdownBtn = document.getElementById('display-dropdown-btn');
        const displayModeSelect = document.getElementById('display-mode-select');
        
        if (displayDropdownBtn) {
            displayDropdownBtn.addEventListener('click', (e) => {
                DEBUG.log('Display dropdown button clicked');
                e.preventDefault();
                e.stopPropagation();
                this.showDisplayModeDropdown();
            });
        } else {
            DEBUG.error('Element not found: display-dropdown-btn');
        }

        if (displayModeSelect) {
            displayModeSelect.addEventListener('change', (e) => {
                DEBUG.log('Display mode changed to:', e.target.value);
                this.setDisplayMode(e.target.value);
                this.updateDisplayModeDisplay();
            });
        } else {
            DEBUG.error('Element not found: display-mode-select');
        }


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


        document.getElementById('show-guides-btn').addEventListener('click', () => {
            this.showGuides = !this.showGuides;
            this.renderGuides();
            this.updateGuidesButton();
        });

        // Selection controls (optional)
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                this.selection = null;
                this.editor.redraw();
            });
        }
    }


    setZoom(zoom) {
        this.editor.setZoom(zoom);
        this.updateGridDisplay();
        this.updateBrushCursorSize();
        this.renderGuides();
        
        // Update zoom select and display
        document.getElementById('zoom-select').value = zoom;
        this.updateZoomDisplay();
        
        // Update viewport frame for new zoom level
        this.updateViewportFrame();
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
        
        DEBUG.log('showDisplayModeCustomDropdown called with:', buttonId, selectId);
        DEBUG.log('Button found:', !!button);
        DEBUG.log('Select found:', !!select);
        
        if (!button || !select) {
            DEBUG.error('Required elements not found for display mode dropdown');
            return;
        }
        
        // Remove existing dropdown
        const existingDropdown = document.querySelector('.custom-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            DEBUG.log('Removed existing dropdown');
        }
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';
        
        // Position dropdown
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = rect.left + 'px';
        
        // Check if button is in bottom controls bar and position dropdown upward
        const isBottomControl = button.closest('.bottom-controls-bar');
        if (isBottomControl) {
            dropdown.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
        } else {
            dropdown.style.top = (rect.bottom + 2) + 'px';
        }
        
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
        DEBUG.log('Dropdown added to body with', dropdown.children.length, 'items');
        DEBUG.log('Dropdown positioned at:', dropdown.style.left, dropdown.style.top);
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                    DEBUG.log('Dropdown closed by outside click');
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
        
        // Check if button is in bottom controls bar and position dropdown upward
        const isBottomControl = button.closest('.bottom-controls-bar');
        if (isBottomControl) {
            dropdown.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
        } else {
            dropdown.style.top = (rect.bottom + 2) + 'px';
        }
        
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
        const displayModeName = document.getElementById('display-mode-name');
        
        DEBUG.log('updateDisplayModeDisplay called');
        DEBUG.log('Elements found - select:', !!select, 'previewIcon:', !!previewIcon, 'displayModeName:', !!displayModeName);
        
        // Update display mode name
        if (displayModeName && select) {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
                displayModeName.textContent = selectedOption.textContent;
                DEBUG.log('Display mode name updated to:', selectedOption.textContent);
            }
        } else {
            DEBUG.warn('Could not update display mode name - missing elements');
        }
        
        // Update preview icon with current display mode colors (if it exists)
        if (previewIcon) {
            const displayMode = this.displayModes[this.currentDisplayMode];
            if (displayMode) {
                previewIcon.style.background = `linear-gradient(45deg, ${displayMode.background_color} 0%, ${displayMode.background_color} 40%, ${displayMode.draw_color} 60%, ${displayMode.draw_color} 100%)`;
            }
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

    setupColorPanelEvents() {
        console.log('Setting up color panel events...');
        
        // Primary color block click
        const primaryColour = document.getElementById('primary-colour');
        if (primaryColour) {
            console.log('Primary color element found');
            primaryColour.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Primary color clicked');
                this.openColorPicker('primary');
            });
        } else {
            console.error('Primary color element not found');
        }

        // Secondary color block click
        const secondaryColour = document.getElementById('secondary-colour');
        if (secondaryColour) {
            console.log('Secondary color element found');
            secondaryColour.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Secondary color clicked');
                this.openColorPicker('secondary');
            });
        } else {
            console.error('Secondary color element not found');
        }

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
            case 'draw-edge':
                this.showDrawEdgeDialog();
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
        console.log('Setting up color palette');
        
        // Clear any user-created patterns to show only MacPaint patterns
        Patterns.clearStorage();
        
        // Clear any cached loaded patterns since we just cleared storage
        this.loadedCustomPatterns = [];
        
        this.populatePatternPalette();
        
        // Skip loading patterns since we just cleared them
        // this.addLoadedPatternsToUI();
    }

    populatePatternPalette() {
        const palette = document.querySelector('.color-palette');
        palette.innerHTML = ''; // Clear existing content
        
        // Get all built-in patterns
        const patterns = Patterns.getPatterns();
        const patternNames = Object.keys(patterns);
        
        // Create pattern rows (3 patterns per row)
        const patternsPerRow = 3;
        let currentRow = null;
        
        patternNames.forEach((patternName, index) => {
            // Create new row every 3 patterns
            if (index % patternsPerRow === 0) {
                currentRow = document.createElement('div');
                currentRow.className = 'pattern-row';
                palette.appendChild(currentRow);
            }
            
            // Create pattern swatch
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.setAttribute('data-pattern', patternName);
            swatch.title = patterns[patternName].name;
            
            // Make the first pattern (solid-black) selected by default
            if (patternName === 'solid-black') {
                swatch.classList.add('selected');
            }
            
            // Generate pattern preview
            this.generatePatternPreview(swatch);
            
            // Add click handler
            swatch.addEventListener('click', () => {
                // Remove selected class from all swatches
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                // Add selected class to clicked swatch
                swatch.classList.add('selected');
                // Update current pattern
                this.currentPattern = swatch.dataset.pattern;
                console.log('Selected pattern:', this.currentPattern);
                // Update delete button state
                this.updateDeleteButtonState();
            });
            
            // Add double-click handler for pattern editor
            swatch.addEventListener('dblclick', () => {
                const patternName = swatch.dataset.pattern;
                console.log('Double-clicked pattern:', patternName);
                this.showPatternEditor(patternName);
            });
            
            currentRow.appendChild(swatch);
        });
        
        // Setup header button event handlers
        this.setupPatternHeaderButtons();
    }

    setupPatternHeaderButtons() {
        // Add pattern button
        const addBtn = document.getElementById('add-pattern-btn');
        if (addBtn) {
            addBtn.replaceWith(addBtn.cloneNode(true)); // Remove existing listeners
            document.getElementById('add-pattern-btn').addEventListener('click', () => {
                console.log('Add pattern button clicked');
                this.createNewPattern();
            });
        }

        // Delete pattern button
        const deleteBtn = document.getElementById('delete-pattern-btn');
        if (deleteBtn) {
            deleteBtn.replaceWith(deleteBtn.cloneNode(true)); // Remove existing listeners
            document.getElementById('delete-pattern-btn').addEventListener('click', () => {
                console.log('Delete pattern button clicked');
                this.deleteSelectedPattern();
            });
        }

        // Update delete button state based on current selection
        this.updateDeleteButtonState();
    }

    deleteSelectedPattern() {
        if (!this.currentPattern) {
            console.log('No pattern selected to delete');
            return;
        }

        // Cannot delete built-in MacPaint patterns
        if (Patterns.isBuiltInPattern(this.currentPattern)) {
            console.log('Cannot delete built-in pattern:', this.currentPattern);
            alert('Cannot delete built-in patterns. Only custom patterns can be deleted.');
            return;
        }

        // Confirm deletion
        const patternName = Patterns.getPatternDisplayName(this.currentPattern);
        if (!confirm(`Delete pattern "${patternName}"?`)) {
            return;
        }

        // Remove from patterns
        Patterns.removePattern(this.currentPattern);
        
        // Remove from UI
        const swatch = document.querySelector(`[data-pattern="${this.currentPattern}"]`);
        if (swatch) {
            swatch.remove();
        }

        // Select the first pattern as default
        this.currentPattern = 'solid-black';
        const firstSwatch = document.querySelector('[data-pattern="solid-black"]');
        if (firstSwatch) {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            firstSwatch.classList.add('selected');
        }

        // Update delete button state
        this.updateDeleteButtonState();

        console.log('Pattern deleted:', this.currentPattern);
    }

    updateDeleteButtonState() {
        const deleteBtn = document.getElementById('delete-pattern-btn');
        if (deleteBtn) {
            // Visual state change instead of disabling
            const canDelete = this.currentPattern && !Patterns.isBuiltInPattern(this.currentPattern);
            
            if (canDelete) {
                deleteBtn.style.opacity = '1';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.title = 'Delete Selected Pattern';
            } else {
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
                if (!this.currentPattern) {
                    deleteBtn.title = 'No pattern selected';
                } else {
                    deleteBtn.title = 'Cannot delete built-in patterns';
                }
            }
            
            console.log('Delete button state update:', {
                currentPattern: this.currentPattern,
                isBuiltIn: this.currentPattern ? Patterns.isBuiltInPattern(this.currentPattern) : 'no pattern',
                canDelete: canDelete
            });
        }
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
                // Check if it's the new {alpha, draw} format or old simple value
                let shouldDraw = false;
                if (typeof value === 'object' && value.alpha !== undefined) {
                    shouldDraw = value.alpha > 0 && value.draw > 0;
                } else {
                    shouldDraw = value > 0;
                }
                
                if (shouldDraw) {
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

        // Create layers in reverse order (top rendering layers at top of UI, background at bottom)
        for (let i = this.editor.getLayerCount() - 1; i >= 0; i--) {
            const layerInfo = this.editor.getLayerInfo(i);
            if (!layerInfo) continue;

            const layerItem = document.createElement('div');
            layerItem.className = `layer-item ${layerInfo.isActive ? 'active' : ''}`;
            layerItem.dataset.layerIndex = i;
            layerItem.draggable = true;

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

            // Drag and drop handlers
            layerItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', i);
                layerItem.classList.add('dragging');
            });

            layerItem.addEventListener('dragend', (e) => {
                layerItem.classList.remove('dragging');
                // Remove any drag-over indicators
                document.querySelectorAll('.layer-item').forEach(item => {
                    item.classList.remove('drag-over');
                });
            });

            layerItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                layerItem.classList.add('drag-over');
            });

            layerItem.addEventListener('dragleave', (e) => {
                layerItem.classList.remove('drag-over');
            });

            layerItem.addEventListener('drop', (e) => {
                e.preventDefault();
                layerItem.classList.remove('drag-over');
                
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetIndex = i;
                
                if (draggedIndex !== targetIndex) {
                    this.swapLayers(draggedIndex, targetIndex);
                }
            });

            layerList.appendChild(layerItem);
        }
    }

    swapLayers(fromIndex, toIndex) {
        console.log(`Swapping layers: ${fromIndex} -> ${toIndex}`);
        
        // Get layer info before swapping
        const fromLayer = this.editor.getLayerInfo(fromIndex);
        const toLayer = this.editor.getLayerInfo(toIndex);
        
        if (!fromLayer || !toLayer) {
            console.error('Invalid layer indices for swapping');
            return;
        }
        
        // Swap the layers in the editor
        if (this.editor.swapLayers(fromIndex, toIndex)) {
            console.log(`Successfully swapped layers "${fromLayer.name}" and "${toLayer.name}"`);
            this.updateLayersList();
            this.updateOutput();
            this.showNotification(`Swapped layers "${fromLayer.name}" and "${toLayer.name}"`, 'success');
        } else {
            console.error('Failed to swap layers');
            this.showNotification('Failed to swap layers', 'error');
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

    // Checkerboard functionality removed

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
                this.setupPreview(); // Recreate preview canvas with new dimensions
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
        // Brush size (optional)
        const brushSizeSlider = document.getElementById('brush-size');
        const brushSizeValue = document.getElementById('brush-size-value');
        if (brushSizeSlider && brushSizeValue) {
            brushSizeSlider.addEventListener('input', (e) => {
                this.brushSize = parseInt(e.target.value);
                brushSizeValue.textContent = this.brushSize;
                this.updateBrushCursorSize();
            });
        }
        
        // Smooth drawing (optional)
        const smoothDrawingCheckbox = document.getElementById('smooth-drawing');
        if (smoothDrawingCheckbox) {
            smoothDrawingCheckbox.addEventListener('change', (e) => {
                this.smoothDrawing = e.target.checked;
            });
        }

        // Eraser size (optional)
        const eraserSizeSlider = document.getElementById('eraser-size');
        const eraserSizeValue = document.getElementById('eraser-size-value');
        if (eraserSizeSlider && eraserSizeValue) {
            eraserSizeSlider.addEventListener('input', (e) => {
                this.eraserSize = parseInt(e.target.value);
                eraserSizeValue.textContent = this.eraserSize;
                this.updateBrushCursorSize();
            });
        }
        
        // Eraser smooth (optional)
        const eraserSmoothCheckbox = document.getElementById('eraser-smooth');
        if (eraserSmoothCheckbox) {
            eraserSmoothCheckbox.addEventListener('change', (e) => {
                this.eraserSmooth = e.target.checked;
            });
        }

        // Spray radius (optional)
        const sprayRadiusSlider = document.getElementById('spray-radius');
        const sprayRadiusValue = document.getElementById('spray-radius-value');
        if (sprayRadiusSlider && sprayRadiusValue) {
            sprayRadiusSlider.addEventListener('input', (e) => {
                this.sprayRadius = parseInt(e.target.value);
                sprayRadiusValue.textContent = this.sprayRadius;
                this.updateBrushCursorSize();
            });
        }

        // Spray density (optional)
        const sprayDensitySlider = document.getElementById('spray-density');
        const sprayDensityValue = document.getElementById('spray-density-value');
        if (sprayDensitySlider && sprayDensityValue) {
            sprayDensitySlider.addEventListener('input', (e) => {
                this.sprayDensity = parseInt(e.target.value) / 100;
                sprayDensityValue.textContent = e.target.value;
            });
        }

        // Blur size (optional)
        const blurSizeSlider = document.getElementById('blur-size');
        const blurSizeValue = document.getElementById('blur-size-value');
        if (blurSizeSlider && blurSizeValue) {
            blurSizeSlider.addEventListener('input', (e) => {
                this.blurSize = parseInt(e.target.value);
                blurSizeValue.textContent = this.blurSize;
                this.updateBrushCursorSize();
            });
        }

        // Blur dither method (optional)
        const blurDitherMethod = document.getElementById('blur-dither-method');
        if (blurDitherMethod) {
            blurDitherMethod.addEventListener('change', (e) => {
                this.blurDitherMethod = e.target.value;
            });
        }

        // Blur alpha channel (optional)
        const blurAlphaChannel = document.getElementById('blur-alpha-channel');
        if (blurAlphaChannel) {
            blurAlphaChannel.addEventListener('change', (e) => {
                this.blurAlphaChannel = e.target.checked;
            });
        }

        // Select All button (optional)
        const selectAllBtn = document.getElementById('select-all-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAll();
            });
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
        if (!layer) {
            this.showNotification('No active layer for dithering', 'error');
            return;
        }

        const width = this.editor.width;
        const height = this.editor.height;

        // Store original pixels for dithering
        this.ditheringData.originalPixels = new Float32Array(layer.pixels.length);
        for (let i = 0; i < layer.pixels.length; i++) {
            this.ditheringData.originalPixels[i] = layer.pixels[i];
        }

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
            // Ensure Background layer is filled with white pixels
            this.editor.fillBackgroundWithWhite();
            this.clearAllGuides();
            this.setupPreview(); // Recreate preview canvas with new dimensions
            this.updateWindowTitle(width, height);
            this.updateOutput();
            this.showNotification(`New canvas created: ${width}×${height}`, 'success');
        }
    }

    updateWindowTitle(width, height) {
        const projectNameElement = document.getElementById('project-name');
        const projectName = projectNameElement ? projectNameElement.value || 'my_bitmap' : 'my_bitmap';
        const title = `Canvas - ${projectName} (${width}x${height})`;
        const titleElement = document.querySelector('#canvas-window .window-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
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
                        // Use selected pattern with primary/secondary color determination
                        this.editor.setPixelWithAlpha(x, y, drawValue, alphaValue, this.currentPattern);
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
            const projectNameElement = document.getElementById('project-name');
            const projectName = projectNameElement ? projectNameElement.value || 'my_bitmap' : 'my_bitmap';
            
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
                    const projectNameElement = document.getElementById('project-name');
                    if (projectNameElement) {
                        projectNameElement.value = saveData.projectName;
                    }
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
        
        // Tool options display will be updated by updateToolOptionsBar() below
        
        // Update tool options bar
        this.updateToolOptionsBar();
        
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
                // Left click = primary color (black), Right click = secondary color (white)
                this.currentDrawValue = e.button === 0 ? 0 : 1; // 0=black, 1=white
                
                // Start stroke
                if (this.smoothDrawing) {
                    this.startSmoothStroke(coords.x, coords.y);
                }
                this.drawWithBrush(coords.x, coords.y, this.currentDrawValue, 1);
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Continue stroke with same draw value
                if (this.smoothDrawing) {
                    this.updateSmoothStroke(coords.x, coords.y, this.currentDrawValue, 1);
                } else {
                    this.drawWithBrush(coords.x, coords.y, this.currentDrawValue, 1);
                }
            } else if (e.type === 'mouseup' && this.isDrawing) {
                // Finish stroke
                if (this.smoothDrawing) {
                    this.finishSmoothStroke(this.currentDrawValue, 1);
                }
                this.editor.saveState();
            }
        } else if (this.currentTool === 'pencil') {
            if (e.type === 'mousedown') {
                // Left click = primary color (black), Right click = secondary color (white)
                this.currentDrawValue = e.button === 0 ? 0 : 1; // 0=black, 1=white
                // Set pixel with alpha=1 and left/right click draw value
                this.editor.setPixelWithAlpha(coords.x, coords.y, this.currentDrawValue, 1);
                this.editor.redraw();
                this.updateOutput();
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Continue setting pixels with same draw/alpha values
                this.editor.setPixelWithAlpha(coords.x, coords.y, this.currentDrawValue, 1);
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
            // Left click = primary color (black), Right click = secondary color (white)
            const drawValue = e.button === 0 ? 0 : 1;
            // Use selected pattern instead of color override
            this.editor.floodFill(coords.x, coords.y, drawValue, this.currentPattern);
            this.editor.saveState();
            this.updateOutput();
        } else if (this.currentTool === 'spray') {
            if (e.type === 'mousedown') {
                // Left click = primary color (black), Right click = secondary color (white)
                this.currentDrawValue = e.button === 0 ? 0 : 1;
                this.editor.spray(coords.x, coords.y, this.sprayRadius, this.sprayDensity, this.currentPattern, this.currentDrawValue);
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Continue spraying with same draw value
                this.editor.spray(coords.x, coords.y, this.sprayRadius, this.sprayDensity, this.currentPattern, this.currentDrawValue);
            }
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
        this.setupViewportNavigation();
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
        this.updateViewportFrame();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }

    setupViewportNavigation() {
        const viewportOverlay = document.getElementById('viewport-overlay');
        const viewportFrame = viewportOverlay.querySelector('.viewport-frame');
        const previewArea = document.querySelector('.preview-area');
        
        this.viewportDragState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            startScrollX: 0,
            startScrollY: 0
        };

        // Handle viewport frame dragging
        viewportFrame.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = previewArea.getBoundingClientRect();
            this.viewportDragState.isDragging = true;
            this.viewportDragState.startX = e.clientX - rect.left;
            this.viewportDragState.startY = e.clientY - rect.top;
            
            // Get current canvas scroll position
            const canvasArea = document.querySelector('.canvas-area');
            this.viewportDragState.startScrollX = canvasArea.scrollLeft || 0;
            this.viewportDragState.startScrollY = canvasArea.scrollTop || 0;
            
            viewportFrame.style.cursor = 'grabbing';
        });

        // Handle mouse move for dragging
        document.addEventListener('mousemove', (e) => {
            if (!this.viewportDragState.isDragging) return;
            
            e.preventDefault();
            const rect = previewArea.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const deltaX = currentX - this.viewportDragState.startX;
            const deltaY = currentY - this.viewportDragState.startY;
            
            // Calculate preview scale (same as in updateViewportFrame)
            const previewScale = Math.min(
                this.previewCanvas.width / this.editor.width,
                this.previewCanvas.height / this.editor.height
            );
            
            // Convert preview delta to bitmap coordinates, then to canvas scroll coordinates
            const bitmapDeltaX = deltaX / previewScale;
            const bitmapDeltaY = deltaY / previewScale;
            const scrollDeltaX = bitmapDeltaX * this.editor.zoom;
            const scrollDeltaY = bitmapDeltaY * this.editor.zoom;
            
            // Calculate new scroll position
            const canvasArea = document.querySelector('.canvas-area');
            const newScrollX = this.viewportDragState.startScrollX + scrollDeltaX;
            const newScrollY = this.viewportDragState.startScrollY + scrollDeltaY;
            
            // Apply scroll to canvas area
            canvasArea.scrollLeft = Math.max(0, newScrollX);
            canvasArea.scrollTop = Math.max(0, newScrollY);
            
            // Update viewport frame position
            this.updateViewportFrame();
        });

        // Handle mouse up to stop dragging
        document.addEventListener('mouseup', () => {
            if (this.viewportDragState.isDragging) {
                this.viewportDragState.isDragging = false;
                const viewportFrame = document.querySelector('.viewport-frame');
                viewportFrame.style.cursor = 'move';
            }
        });

        // Update viewport frame when canvas area is scrolled
        const canvasArea = document.querySelector('.canvas-area');
        canvasArea.addEventListener('scroll', () => {
            this.updateViewportFrame();
        });

        // Initial viewport frame setup
        this.updateViewportFrame();
    }

    updateViewportFrame() {
        const viewportFrame = document.querySelector('.viewport-frame');
        const previewArea = document.querySelector('.preview-area');
        const canvasArea = document.querySelector('.canvas-area');
        
        if (!viewportFrame || !previewArea || !canvasArea) return;
        
        // Get dimensions
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasAreaRect = canvasArea.getBoundingClientRect();
        const previewRect = previewArea.getBoundingClientRect();
        
        // Calculate what portion of the canvas is visible
        const scrollX = canvasArea.scrollLeft || 0;
        const scrollY = canvasArea.scrollTop || 0;
        
        // Calculate the visible area in canvas pixels (at current zoom)
        const visibleCanvasWidth = Math.min(canvasAreaRect.width, canvasRect.width);
        const visibleCanvasHeight = Math.min(canvasAreaRect.height, canvasRect.height);
        
        // Convert to actual bitmap coordinates
        const zoom = this.editor.zoom;
        const visibleBitmapWidth = visibleCanvasWidth / zoom;
        const visibleBitmapHeight = visibleCanvasHeight / zoom;
        const scrollBitmapX = scrollX / zoom;
        const scrollBitmapY = scrollY / zoom;
        
        // Calculate preview scale (preview canvas size vs bitmap size)
        const previewScale = Math.min(
            this.previewCanvas.width / this.editor.width,
            this.previewCanvas.height / this.editor.height
        );
        
        // Calculate frame position and size in preview coordinates
        const frameX = scrollBitmapX * previewScale;
        const frameY = scrollBitmapY * previewScale;
        const frameWidth = visibleBitmapWidth * previewScale;
        const frameHeight = visibleBitmapHeight * previewScale;
        
        // Apply the position and size to the viewport frame
        viewportFrame.style.left = `${Math.max(0, frameX)}px`;
        viewportFrame.style.top = `${Math.max(0, frameY)}px`;
        viewportFrame.style.width = `${frameWidth}px`;
        viewportFrame.style.height = `${frameHeight}px`;
        
        // Show/hide the viewport frame based on whether scrolling is needed
        const needsViewport = (canvasRect.width > canvasAreaRect.width) || 
                            (canvasRect.height > canvasAreaRect.height);
        viewportFrame.style.display = needsViewport ? 'block' : 'none';
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
        const drawBorder = this.drawBorder;
        const drawFill = this.drawFill;
        
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
        const drawBorder = this.drawBorder;
        const drawFill = this.drawFill;
        
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
        const drawBorder = this.circleDrawBorder;
        const drawFill = this.circleDrawFill;
        
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
            const projectNameElement = document.getElementById('project-name');
            const projectName = projectNameElement ? projectNameElement.value || 'my_bitmap' : 'my_bitmap';
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

    // ===== COLOR OVERRIDE PATTERN =====
    
    createColorPattern(drawValue) {
        // Create a pattern that always returns the specified color
        // This overrides any selected pattern
        return {
            name: drawValue === 0 ? 'Primary Color' : 'Secondary Color',
            getValue: (x, y) => ({
                alpha: 1,
                draw: drawValue
            })
        };
    }

    // ===== COLOR MANAGEMENT =====
    
    openColorPicker(colorType) {
        // Create a temporary input element for color picking
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.style.position = 'absolute';
        colorInput.style.left = '-9999px';
        colorInput.style.opacity = '0';
        colorInput.style.width = '1px';
        colorInput.style.height = '1px';
        colorInput.style.pointerEvents = 'none';
        
        // Set current color
        const currentColor = colorType === 'primary' ? this.primaryColor : this.secondaryColor;
        colorInput.value = currentColor;
        
        // Add to DOM temporarily
        document.body.appendChild(colorInput);
        
        // Handle color change
        const handleChange = (e) => {
            const newColor = e.target.value;
            console.log(`Color changed to: ${newColor} for ${colorType}`);
            
            if (colorType === 'primary') {
                this.primaryColor = newColor;
                this.showNotification(`Primary color changed to ${newColor}`, 'success');
            } else {
                this.secondaryColor = newColor;
                this.showNotification(`Secondary color changed to ${newColor}`, 'success');
            }
            this.updateColorDisplay();
            
            // Clean up
            setTimeout(() => {
                if (document.body.contains(colorInput)) {
                    document.body.removeChild(colorInput);
                }
            }, 100);
        };
        
        // Handle input event (for immediate feedback)
        const handleInput = (e) => {
            const newColor = e.target.value;
            if (colorType === 'primary') {
                this.primaryColor = newColor;
            } else {
                this.secondaryColor = newColor;
            }
            this.updateColorDisplay();
        };
        
        colorInput.addEventListener('change', handleChange);
        colorInput.addEventListener('input', handleInput);
        
        // Focus and click to open
        colorInput.focus();
        setTimeout(() => {
            colorInput.click();
        }, 10);
        
        // Clean up after some time if no interaction
        setTimeout(() => {
            if (document.body.contains(colorInput)) {
                document.body.removeChild(colorInput);
            }
        }, 30000);
    }
    
    
    updateColorDisplay() {
        // Update primary color display
        const primaryDisplay = document.querySelector('#primary-colour .colour-display');
        if (primaryDisplay) {
            primaryDisplay.style.backgroundColor = this.primaryColor;
        }
        
        // Update secondary color display
        const secondaryDisplay = document.querySelector('#secondary-colour .colour-display');
        if (secondaryDisplay) {
            secondaryDisplay.style.backgroundColor = this.secondaryColor;
        }
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
            // Auto-generate guide name
            const nextGuideNumber = this.guides.length + 1;
            const guideName = 'Guide ' + nextGuideNumber;
            
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
            // Auto-generate guide name
            const nextGuideNumber = this.guides.length + 1;
            const guideName = 'Guide ' + nextGuideNumber;
            
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

    // Edge Detection Implementation
    showDrawEdgeDialog() {
        console.log('showDrawEdgeDialog() called');
        const dialog = document.getElementById('draw-edge-dialog');
        console.log('Dialog element:', dialog);
        
        if (!dialog) {
            console.error('Draw edge dialog not found!');
            return;
        }
        const edgeWidthSlider = document.getElementById('edge-width');
        const edgeWidthValue = document.getElementById('edge-width-value');
        const edgeColorSelect = document.getElementById('edge-color');
        const detectAlphaEdges = document.getElementById('detect-alpha-edges');
        const detectBitmapEdges = document.getElementById('detect-bitmap-edges');
        
        // Remove any existing event listeners to prevent duplicates
        const newWidthSlider = edgeWidthSlider.cloneNode(true);
        edgeWidthSlider.parentNode.replaceChild(newWidthSlider, edgeWidthSlider);
        
        // Update width value display
        newWidthSlider.addEventListener('input', () => {
            edgeWidthValue.textContent = newWidthSlider.value;
        });
        
        // Update initial value
        edgeWidthValue.textContent = newWidthSlider.value;
        
        // Show dialog
        dialog.style.display = 'flex';
        
        // Generate initial preview
        this.updateEdgePreview();
        
        // Handle apply button
        document.getElementById('draw-edge-apply-btn').onclick = () => {
            const width = parseInt(newWidthSlider.value);
            const color = edgeColorSelect.value;
            const detectAlpha = detectAlphaEdges.checked;
            const detectBitmap = detectBitmapEdges.checked;
            
            console.log('Applying edge detection:', { width, color, detectAlpha, detectBitmap });
            this.applyEdgeDetection(width, color, detectAlpha, detectBitmap);
            dialog.style.display = 'none';
        };
        
        // Handle cancel/close buttons
        document.getElementById('draw-edge-cancel-btn').onclick = () => {
            dialog.style.display = 'none';
        };
        document.getElementById('draw-edge-close-btn').onclick = () => {
            dialog.style.display = 'none';
        };
        
        // Handle preview update button
        document.getElementById('edge-preview-update-btn').onclick = () => {
            this.updateEdgePreview();
        };
        
        // Update preview when parameters change
        detectAlphaEdges.addEventListener('change', () => {
            this.updateEdgePreview();
        });
        
        detectBitmapEdges.addEventListener('change', () => {
            this.updateEdgePreview();
        });
        
        newWidthSlider.addEventListener('input', () => {
            this.updateEdgePreview();
        });
        
        edgeColorSelect.addEventListener('change', () => {
            this.updateEdgePreview();
        });
    }
    
    updateEdgePreview() {
        const canvas = document.getElementById('edge-preview-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Get current editor dimensions
        const editorWidth = this.editor.width;
        const editorHeight = this.editor.height;
        
        // Calculate scale to fit editor canvas in preview
        const scaleX = canvasWidth / editorWidth;
        const scaleY = canvasHeight / editorHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1
        
        const previewWidth = Math.floor(editorWidth * scale);
        const previewHeight = Math.floor(editorHeight * scale);
        const offsetX = Math.floor((canvasWidth - previewWidth) / 2);
        const offsetY = Math.floor((canvasHeight - previewHeight) / 2);
        
        // Draw current canvas content as background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(offsetX, offsetY, previewWidth, previewHeight);
        
        // Draw bitmap content
        for (let y = 0; y < editorHeight; y++) {
            for (let x = 0; x < editorWidth; x++) {
                const pixel = this.editor.getPixelWithAlpha(x, y);
                if (pixel.alpha > 0.5) {
                    ctx.fillStyle = pixel.draw > 0 ? '#000000' : '#ffffff';
                    const px = offsetX + Math.floor(x * scale);
                    const py = offsetY + Math.floor(y * scale);
                    const size = Math.max(1, Math.floor(scale));
                    ctx.fillRect(px, py, size, size);
                }
            }
        }
        
        // Get preview parameters
        const detectAlpha = document.getElementById('detect-alpha-edges').checked;
        const detectBitmap = document.getElementById('detect-bitmap-edges').checked;
        const edgeWidth = parseInt(document.getElementById('edge-width').value);
        const edgeColor = document.getElementById('edge-color').value;
        
        // Detect edges
        const edges = this.detectEdges(detectAlpha, detectBitmap);
        
        // Draw edge preview
        if (edges.length > 0) {
            // Set edge color
            if (edgeColor === 'black') {
                ctx.fillStyle = '#ff0000'; // Red for preview
            } else if (edgeColor === 'white') {
                ctx.fillStyle = '#00ff00'; // Green for preview
            } else if (edgeColor === 'transparent') {
                ctx.fillStyle = '#0000ff'; // Blue for preview
            } else if (edgeColor === 'pattern') {
                ctx.fillStyle = '#ff00ff'; // Magenta for preview
            }
            
            // Draw edge pixels
            const halfWidth = Math.floor(edgeWidth / 2);
            edges.forEach(edge => {
                for (let dy = -halfWidth; dy <= halfWidth; dy++) {
                    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
                        const ex = edge.x + dx;
                        const ey = edge.y + dy;
                        
                        if (ex >= 0 && ex < editorWidth && ey >= 0 && ey < editorHeight) {
                            const px = offsetX + Math.floor(ex * scale);
                            const py = offsetY + Math.floor(ey * scale);
                            const size = Math.max(1, Math.floor(scale));
                            ctx.fillRect(px, py, size, size);
                        }
                    }
                }
            });
        }
        
        // Draw border around preview area
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX - 0.5, offsetY - 0.5, previewWidth + 1, previewHeight + 1);
        
        // Show edge count
        ctx.fillStyle = '#333333';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${edges.length} edges found`, 5, canvasHeight - 5);
    }
    
    applyEdgeDetection(width, color, detectAlpha, detectBitmap) {
        if (!detectAlpha && !detectBitmap) {
            console.log('No detection options selected');
            return;
        }
        
        console.log('Starting edge detection...');
        
        // Save current state for undo
        this.editor.saveState();
        
        const edges = this.detectEdges(detectAlpha, detectBitmap);
        console.log(`Found ${edges.length} edge pixels`);
        
        // Draw edges with specified width and color
        for (const edge of edges) {
            this.drawEdgePixel(edge.x, edge.y, width, color);
        }
        
        this.editor.redraw();
        this.updateOutput();
        console.log('Edge detection complete');
    }
    
    detectEdges(detectAlpha, detectBitmap) {
        console.log('Detecting edges, alpha:', detectAlpha, 'bitmap:', detectBitmap);
        const edges = [];
        const width = this.editor.width;
        const height = this.editor.height;
        
        console.log('Canvas size:', width, 'x', height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let isEdge = false;
                
                // Check 4-connected neighbors
                const neighbors = [
                    {x: x-1, y: y},
                    {x: x+1, y: y},
                    {x: x, y: y-1},
                    {x: x, y: y+1}
                ];
                
                for (const neighbor of neighbors) {
                    if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height) {
                        
                        if (detectAlpha) {
                            try {
                                // Check alpha channel differences
                                const currentPixel = this.editor.getPixelWithAlpha(x, y);
                                const neighborPixel = this.editor.getPixelWithAlpha(neighbor.x, neighbor.y);
                                if ((currentPixel.alpha > 0.5 && neighborPixel.alpha <= 0.5) || 
                                    (currentPixel.alpha <= 0.5 && neighborPixel.alpha > 0.5)) {
                                    isEdge = true;
                                    break;
                                }
                            } catch (error) {
                                console.warn('Error checking alpha at', x, y, ':', error);
                            }
                        }
                        
                        if (detectBitmap && !isEdge) {
                            try {
                                // Check bitmap color differences
                                const currentValue = this.editor.getPixel(x, y);
                                const neighborValue = this.editor.getPixel(neighbor.x, neighbor.y);
                                if (currentValue !== neighborValue) {
                                    isEdge = true;
                                    break;
                                }
                            } catch (error) {
                                console.warn('Error checking bitmap at', x, y, ':', error);
                            }
                        }
                    }
                }
                
                if (isEdge) {
                    edges.push({x, y});
                }
            }
        }
        
        console.log('Found edges:', edges.length);
        if (edges.length > 0) {
            console.log('First few edges:', edges.slice(0, 5));
        }
        
        return edges;
    }
    
    drawEdgePixel(x, y, width, color) {
        const halfWidth = Math.floor(width / 2);
        
        for (let dy = -halfWidth; dy <= halfWidth; dy++) {
            for (let dx = -halfWidth; dx <= halfWidth; dx++) {
                const px = x + dx;
                const py = y + dy;
                
                if (px >= 0 && px < this.editor.width && py >= 0 && py < this.editor.height) {
                    if (color === 'black') {
                        // Opaque black pixel
                        this.editor.setPixelWithAlpha(px, py, 1, 1);
                    } else if (color === 'white') {
                        // Opaque white pixel
                        this.editor.setPixelWithAlpha(px, py, 0, 1);
                    } else if (color === 'transparent') {
                        // Transparent pixel (erase)
                        this.editor.setPixelWithAlpha(px, py, 0, 0);
                    } else if (color === 'pattern') {
                        // Pattern: black/transparent only
                        const patternValue = Patterns.applyPattern(this.currentPattern, px, py);
                        this.editor.setPixelWithAlpha(px, py, patternValue.draw, patternValue.alpha);
                    }
                }
            }
        }
    }

    // ===== PATTERN EDITOR IMPLEMENTATION =====
    
    showPatternEditor(patternName) {
        this.currentEditingPattern = patternName;
        const dialog = document.getElementById('pattern-editor-dialog');
        const nameInput = document.getElementById('pattern-name-input');
        
        // Set pattern name
        const patterns = Patterns.getPatterns();
        nameInput.value = patterns[patternName]?.name || patternName;
        
        // Initialize the grid
        this.initializePatternGrid();
        
        // Load existing pattern if it exists
        this.loadPatternIntoGrid(patternName);
        
        // Update preview
        this.updatePatternPreview();
        
        // Show dialog
        dialog.style.display = 'flex';
        
        // Setup event handlers
        this.setupPatternEditorHandlers();
    }
    
    initializePatternGrid() {
        const grid = document.getElementById('pattern-grid');
        grid.innerHTML = '';
        
        this.patternGridData = new Array(64).fill(false); // 8x8 = 64 cells
        
        for (let i = 0; i < 64; i++) {
            const cell = document.createElement('div');
            cell.className = 'pattern-cell empty';
            cell.dataset.index = i;
            
            cell.addEventListener('click', () => {
                this.togglePatternCell(i);
            });
            
            grid.appendChild(cell);
        }
    }
    
    loadPatternIntoGrid(patternName) {
        const patterns = Patterns.getPatterns();
        const pattern = patterns[patternName];
        
        if (!pattern) return;
        
        // Sample the pattern at 8x8 positions to fill our grid
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const index = y * 8 + x;
                const patternValue = pattern.getValue(x, y);
                
                // Check if it's an alpha/draw object or simple value
                let isFilled = false;
                if (typeof patternValue === 'object' && patternValue.alpha !== undefined) {
                    isFilled = patternValue.alpha > 0 && patternValue.draw > 0;
                } else {
                    isFilled = patternValue > 0;
                }
                
                this.patternGridData[index] = isFilled;
                this.updatePatternCell(index);
            }
        }
    }
    
    togglePatternCell(index) {
        this.patternGridData[index] = !this.patternGridData[index];
        this.updatePatternCell(index);
        this.updatePatternPreview();
    }
    
    updatePatternCell(index) {
        const cell = document.querySelector(`[data-index="${index}"]`);
        if (cell) {
            cell.className = this.patternGridData[index] ? 'pattern-cell filled' : 'pattern-cell empty';
        }
    }
    
    updatePatternPreview() {
        const canvas = document.getElementById('pattern-preview-canvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 64, 64);
        
        // Draw pattern preview (8x8 tiled)
        ctx.fillStyle = '#000000';
        for (let ty = 0; ty < 8; ty++) {
            for (let tx = 0; tx < 8; tx++) {
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        const index = y * 8 + x;
                        if (this.patternGridData[index]) {
                            const pixelX = tx * 8 + x;
                            const pixelY = ty * 8 + y;
                            ctx.fillRect(pixelX, pixelY, 1, 1);
                        }
                    }
                }
            }
        }
    }
    
    setupPatternEditorHandlers() {
        console.log('Setting up pattern editor handlers');
        
        // Clear existing handlers to prevent duplicates
        const clearBtn = document.getElementById('pattern-clear-btn');
        const fillBtn = document.getElementById('pattern-fill-btn');
        const invertBtn = document.getElementById('pattern-invert-btn');
        const checkerBtn = document.getElementById('pattern-preset-checker-btn');
        const saveBtn = document.getElementById('pattern-editor-save-btn');
        const cancelBtn = document.getElementById('pattern-editor-cancel-btn');
        const closeBtn = document.getElementById('pattern-editor-close-btn');
        
        console.log('Pattern editor elements:', {
            clearBtn, fillBtn, invertBtn, checkerBtn, saveBtn, cancelBtn, closeBtn
        });
        
        if (clearBtn) {
            clearBtn.onclick = () => {
                console.log('Clear button clicked');
                this.patternGridData.fill(false);
                this.updateAllPatternCells();
                this.updatePatternPreview();
            };
        }
        
        if (fillBtn) {
            fillBtn.onclick = () => {
                console.log('Fill button clicked');
                this.patternGridData.fill(true);
                this.updateAllPatternCells();
                this.updatePatternPreview();
            };
        }
        
        if (invertBtn) {
            invertBtn.onclick = () => {
                console.log('Invert button clicked');
                this.patternGridData = this.patternGridData.map(cell => !cell);
                this.updateAllPatternCells();
                this.updatePatternPreview();
            };
        }
        
        if (checkerBtn) {
            checkerBtn.onclick = () => {
                console.log('Checker button clicked');
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        const index = y * 8 + x;
                        this.patternGridData[index] = (x + y) % 2 === 0;
                    }
                }
                this.updateAllPatternCells();
                this.updatePatternPreview();
            };
        }
        
        if (saveBtn) {
            saveBtn.onclick = () => {
                console.log('Save button clicked');
                this.savePatternFromEditor();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                console.log('Cancel button clicked');
                document.getElementById('pattern-editor-dialog').style.display = 'none';
            };
        }
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                console.log('Close button clicked');
                document.getElementById('pattern-editor-dialog').style.display = 'none';
            };
        }
    }
    
    updateAllPatternCells() {
        for (let i = 0; i < 64; i++) {
            this.updatePatternCell(i);
        }
    }
    
    savePatternFromEditor() {
        console.log('savePatternFromEditor called');
        const nameInput = document.getElementById('pattern-name-input');
        const patternName = this.currentEditingPattern;
        const displayName = nameInput.value || patternName;
        
        console.log('Pattern data:', {
            patternName,
            displayName,
            gridData: this.patternGridData
        });
        
        // Create new pattern function based on grid data
        // Capture the current grid data in a closure to avoid context issues
        const capturedGridData = [...this.patternGridData]; // Make a copy
        
        const newPattern = {
            name: displayName,
            getValue: (x, y) => {
                const gridX = x % 8;
                const gridY = y % 8;
                const index = gridY * 8 + gridX;
                const isFilled = capturedGridData[index];
                
                return isFilled ? 
                    { alpha: 1, draw: 1 } :  // Black
                    { alpha: 0, draw: 0 };   // Transparent
            }
        };
        
        // Update the pattern in the Patterns class
        Patterns.addPattern(patternName, newPattern);
        console.log('Pattern saved to Patterns class');
        
        // Regenerate pattern preview in UI
        this.regeneratePatternPreview(patternName);
        console.log('Pattern preview regenerated');
        
        // Close dialog
        document.getElementById('pattern-editor-dialog').style.display = 'none';
        
        console.log(`Pattern "${patternName}" saved with name "${displayName}"`);
    }
    
    regeneratePatternPreview(patternName) {
        const swatch = document.querySelector(`[data-pattern="${patternName}"]`);
        if (swatch) {
            this.generatePatternPreview(swatch);
        }
    }
    
    // Regenerate all pattern previews (useful after fixing pattern system)
    regenerateAllPatternPreviews() {
        const swatches = document.querySelectorAll('.color-swatch[data-pattern]');
        swatches.forEach(swatch => {
            this.generatePatternPreview(swatch);
        });
    }
    
    // Create a new pattern
    createNewPattern() {
        console.log('createNewPattern called');
        
        // Generate unique pattern name
        const patternNames = Patterns.getPatternNames();
        let newPatternName = 'custom-pattern';
        let counter = 1;
        while (Patterns.hasPattern(newPatternName)) {
            newPatternName = `custom-pattern-${counter}`;
            counter++;
        }
        
        console.log('Generated pattern name:', newPatternName);
        
        // Create blank pattern
        const newPattern = {
            name: `Custom Pattern ${counter}`,
            getValue: (x, y) => ({ alpha: 0, draw: 0 }) // Start with blank pattern
        };
        
        // Add to patterns using the new method
        Patterns.addPattern(newPatternName, newPattern);
        console.log('Added pattern to Patterns class');
        
        // Create new swatch element
        this.addPatternSwatch(newPatternName);
        console.log('Added swatch to UI');
        
        // Open pattern editor for the new pattern
        this.showPatternEditor(newPatternName);
        console.log('Opened pattern editor');
    }
    
    // Add a new pattern swatch to the UI
    addPatternSwatch(patternName) {
        const palette = document.querySelector('.color-palette');
        
        // Find the last row or create a new one if needed
        let lastRow = palette.querySelector('.pattern-row:last-child');
        if (!lastRow || lastRow.children.length >= 3) {
            lastRow = document.createElement('div');
            lastRow.className = 'pattern-row';
            palette.appendChild(lastRow);
        }
        
        // Create new swatch
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.dataset.pattern = patternName;
        swatch.title = Patterns.getPatterns()[patternName].name;
        
        // Add swatch to the last row
        lastRow.appendChild(swatch);
        
        // Setup event handlers for the new swatch
        this.setupSwatchHandlers(swatch);
        
        // Generate preview
        this.generatePatternPreview(swatch);
    }
    
    // Setup event handlers for a swatch
    setupSwatchHandlers(swatch) {
        swatch.addEventListener('click', () => {
            // Remove selected class from all swatches
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            // Add selected class to clicked swatch
            swatch.classList.add('selected');
            // Update current pattern
            this.currentPattern = swatch.dataset.pattern;
        });
        
        // Add double-click handler for pattern editor
        swatch.addEventListener('dblclick', () => {
            const patternName = swatch.dataset.pattern;
            this.showPatternEditor(patternName);
        });
    }
    
    // Load saved patterns from localStorage and add to UI
    loadSavedPatterns() {
        try {
            if (typeof Patterns !== 'undefined') {
                const loadedPatterns = Patterns.loadFromStorage();
                console.log('Loaded patterns from storage:', loadedPatterns);
                
                // Store loaded pattern names for later UI creation
                this.loadedCustomPatterns = loadedPatterns;
            }
        } catch (error) {
            console.warn('Failed to load patterns:', error);
            this.loadedCustomPatterns = [];
        }
    }
    
    // Add loaded patterns to UI after color palette is set up
    addLoadedPatternsToUI() {
        if (this.loadedCustomPatterns && this.loadedCustomPatterns.length > 0) {
            this.loadedCustomPatterns.forEach(patternName => {
                this.addPatternSwatch(patternName);
            });
            console.log('Added loaded patterns to UI:', this.loadedCustomPatterns);
        }
    }

    // ===== ADOBE-STYLE PANEL SYSTEM =====
    
    setupPanelSystem() {
        // Panel system is now simplified - no resize/collapse functionality
        // Panels are fixed in place for better usability
        
        // Update left panel width to fixed size
        setTimeout(() => this.updateLeftPanelWidth(), 100);
    }
    
    
    
    
    
    
    
    updateLeftPanelWidth() {
        // Calculate the actual width needed by the left panel
        const leftColumn = document.getElementById('left-column');
        if (!leftColumn) return;
        
        // Calculate optimal width for 3-column tool layout
        // Tool button: 28px each + 2px gap between = 28*3 + 2*2 = 88px  
        // Panel padding: 12px on each side = 24px
        // Panel border: 2px total
        // Total for tools: 88 + 24 + 2 = 114px
        const optimalWidth = 140; // A bit more room for comfortable layout
        
        // Set a fixed optimal width for clean layout
        const finalWidth = optimalWidth;
        
        // Set CSS custom property for dynamic width (kept for compatibility)
        document.documentElement.style.setProperty('--left-panel-width', finalWidth + 'px');
        
        // Toggle button position is now handled by CSS media queries for consistency
    }
    
    // ===== TOOL OPTIONS BAR =====
    
    setupToolOptionsBar() {
        // Move tool options to the menu bar
        this.toolOptionsBar = document.getElementById('tool-options-bar');
        
        // Setup tool option event listeners for the bar
        this.setupToolOptionEvents();
        
        // Initial tool options update
        this.updateToolOptionsBar();
    }
    
    setupToolOptionEvents() {
        // This will be called after each tool options update
        // to re-attach event listeners to dynamically created elements
    }
    
    updateToolOptionsBar() {
        if (!this.toolOptionsBar) return;
        
        // Clear existing options
        this.toolOptionsBar.innerHTML = '';
        
        // Add options based on current tool
        const tool = this.currentTool;
        
        if (tool === 'brush') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label>Size: <input type="range" id="brush-size-bar" min="1" max="10" value="${this.brushSize}"> <span id="brush-size-value-bar">${this.brushSize}</span>px</label>
                    <label><input type="checkbox" id="smooth-drawing-bar" ${this.smoothDrawing ? 'checked' : ''}> Smooth</label>
                </div>
            `;
            
            // Re-attach events for brush
            const brushSizeBar = document.getElementById('brush-size-bar');
            const smoothDrawingBar = document.getElementById('smooth-drawing-bar');
            
            if (brushSizeBar) {
                brushSizeBar.addEventListener('input', (e) => {
                    this.brushSize = parseInt(e.target.value);
                    document.getElementById('brush-size-value-bar').textContent = this.brushSize;
                    // Sync with original controls if they exist
                    const original = document.getElementById('brush-size');
                    if (original) {
                        original.value = this.brushSize;
                        const originalValue = document.getElementById('brush-size-value');
                        if (originalValue) originalValue.textContent = this.brushSize;
                    }
                });
            }
            
            if (smoothDrawingBar) {
                smoothDrawingBar.addEventListener('change', (e) => {
                    this.smoothDrawing = e.target.checked;
                    // Sync with original controls if they exist
                    const original = document.getElementById('smooth-drawing');
                    if (original) original.checked = this.smoothDrawing;
                });
            }
            
        } else if (tool === 'pencil') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label><input type="checkbox" id="pencil-smooth-bar" ${this.smoothDrawing ? 'checked' : ''}> Smooth</label>
                </div>
            `;
            
            const pencilSmoothBar = document.getElementById('pencil-smooth-bar');
            if (pencilSmoothBar) {
                pencilSmoothBar.addEventListener('change', (e) => {
                    this.smoothDrawing = e.target.checked;
                    const original = document.getElementById('pencil-smooth');
                    if (original) original.checked = this.smoothDrawing;
                });
            }
            
        } else if (tool === 'eraser') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label>Size: <input type="range" id="eraser-size-bar" min="1" max="10" value="${this.eraserSize || 2}"> <span id="eraser-size-value-bar">${this.eraserSize || 2}</span>px</label>
                    <label><input type="checkbox" id="eraser-smooth-bar" ${this.smoothDrawing ? 'checked' : ''}> Smooth</label>
                </div>
            `;
            
            const eraserSizeBar = document.getElementById('eraser-size-bar');
            const eraserSmoothBar = document.getElementById('eraser-smooth-bar');
            
            if (eraserSizeBar) {
                eraserSizeBar.addEventListener('input', (e) => {
                    this.eraserSize = parseInt(e.target.value);
                    document.getElementById('eraser-size-value-bar').textContent = this.eraserSize;
                });
            }
            
            if (eraserSmoothBar) {
                eraserSmoothBar.addEventListener('change', (e) => {
                    this.smoothDrawing = e.target.checked;
                });
            }
            
        } else if (tool === 'rect' || tool === 'circle') {
            const borderChecked = (tool === 'rect') ? this.drawBorder : this.circleDrawBorder;
            const fillChecked = (tool === 'rect') ? this.drawFill : this.circleDrawFill;
            
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label><input type="checkbox" id="shape-border-bar" ${borderChecked ? 'checked' : ''}> Border</label>
                    <label><input type="checkbox" id="shape-fill-bar" ${fillChecked ? 'checked' : ''}> Fill</label>
                </div>
            `;
            
            const shapeBorderBar = document.getElementById('shape-border-bar');
            const shapeFillBar = document.getElementById('shape-fill-bar');
            
            if (shapeBorderBar) {
                shapeBorderBar.addEventListener('change', (e) => {
                    if (tool === 'rect') {
                        this.drawBorder = e.target.checked;
                    } else {
                        this.circleDrawBorder = e.target.checked;
                    }
                });
            }
            
            if (shapeFillBar) {
                shapeFillBar.addEventListener('change', (e) => {
                    if (tool === 'rect') {
                        this.drawFill = e.target.checked;
                    } else {
                        this.circleDrawFill = e.target.checked;
                    }
                });
            }
            
        } else if (tool === 'spray') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label>Size: <input type="range" id="spray-radius-bar" min="2" max="15" value="${this.sprayRadius || 8}"> <span id="spray-radius-value-bar">${this.sprayRadius || 8}</span>px</label>
                    <label>Density: <input type="range" id="spray-density-bar" min="10" max="100" value="${this.sprayDensity || 60}"> <span id="spray-density-value-bar">${this.sprayDensity || 60}</span>%</label>
                </div>
            `;
            
            const sprayRadiusBar = document.getElementById('spray-radius-bar');
            const sprayDensityBar = document.getElementById('spray-density-bar');
            
            if (sprayRadiusBar) {
                sprayRadiusBar.addEventListener('input', (e) => {
                    this.sprayRadius = parseInt(e.target.value);
                    document.getElementById('spray-radius-value-bar').textContent = this.sprayRadius;
                });
            }
            
            if (sprayDensityBar) {
                sprayDensityBar.addEventListener('input', (e) => {
                    this.sprayDensity = parseInt(e.target.value);
                    document.getElementById('spray-density-value-bar').textContent = this.sprayDensity;
                });
            }
            
        } else if (tool === 'bucket') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label><input type="checkbox" id="fill-contiguous-bar" ${this.fillContiguous ? 'checked' : ''}> Contiguous</label>
                </div>
            `;
            
            const fillContiguousBar = document.getElementById('fill-contiguous-bar');
            if (fillContiguousBar) {
                fillContiguousBar.addEventListener('change', (e) => {
                    this.fillContiguous = e.target.checked;
                });
            }
            
        } else if (tool === 'move') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label><input type="checkbox" id="move-loop-bar" ${this.moveLoop ? 'checked' : ''}> Loop</label>
                </div>
            `;
            
            const moveLoopBar = document.getElementById('move-loop-bar');
            if (moveLoopBar) {
                moveLoopBar.addEventListener('change', (e) => {
                    this.moveLoop = e.target.checked;
                });
            }
            
        } else if (tool === 'line') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label>Width: <input type="range" id="line-width-bar" min="1" max="5" value="${this.lineWidth || 1}"> <span id="line-width-value-bar">${this.lineWidth || 1}</span>px</label>
                </div>
            `;
            
            const lineWidthBar = document.getElementById('line-width-bar');
            if (lineWidthBar) {
                lineWidthBar.addEventListener('input', (e) => {
                    this.lineWidth = parseInt(e.target.value);
                    document.getElementById('line-width-value-bar').textContent = this.lineWidth;
                });
            }
            
        } else if (tool === 'text') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label>Font Scale: <input type="range" id="text-scale-bar" min="1" max="4" value="${this.textScale || 1}"> <span id="text-scale-value-bar">${this.textScale || 1}</span>x</label>
                </div>
            `;
            
            const textScaleBar = document.getElementById('text-scale-bar');
            if (textScaleBar) {
                textScaleBar.addEventListener('input', (e) => {
                    this.textScale = parseInt(e.target.value);
                    document.getElementById('text-scale-value-bar').textContent = this.textScale;
                });
            }
            
        } else if (tool === 'select-rect' || tool === 'select-circle') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <button id="select-copy-bar" class="tool-option-btn">Copy</button>
                    <button id="select-cut-bar" class="tool-option-btn">Cut</button>
                    <button id="select-paste-bar" class="tool-option-btn">Paste</button>
                    <button id="select-clear-bar" class="tool-option-btn">Clear</button>
                </div>
            `;
            
            // Add event listeners for selection actions
            const copyBtn = document.getElementById('select-copy-bar');
            const cutBtn = document.getElementById('select-cut-bar');
            const pasteBtn = document.getElementById('select-paste-bar');
            const clearBtn = document.getElementById('select-clear-bar');
            
            if (copyBtn) copyBtn.addEventListener('click', () => this.copySelection());
            if (cutBtn) cutBtn.addEventListener('click', () => this.cutSelection());
            if (pasteBtn) pasteBtn.addEventListener('click', () => this.pasteSelection());
            if (clearBtn) clearBtn.addEventListener('click', () => {
                this.selection = null;
                this.editor.redraw();
            });
            
        } else if (tool === 'guide') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <button id="guide-add-bar" class="tool-option-btn">Add Guide</button>
                    <button id="guide-clear-bar" class="tool-option-btn">Clear All</button>
                    <label><input type="checkbox" id="guide-snap-bar" ${this.snapToGuides ? 'checked' : ''}> Snap to Guides</label>
                </div>
            `;
            
            const addGuideBtn = document.getElementById('guide-add-bar');
            const clearGuidesBtn = document.getElementById('guide-clear-bar');
            const snapToGuidesBar = document.getElementById('guide-snap-bar');
            
            if (addGuideBtn) addGuideBtn.addEventListener('click', () => this.addGuide());
            if (clearGuidesBtn) clearGuidesBtn.addEventListener('click', () => this.clearGuides());
            if (snapToGuidesBar) {
                snapToGuidesBar.addEventListener('change', (e) => {
                    this.snapToGuides = e.target.checked;
                });
            }
            
        } else if (tool === 'blur') {
            this.toolOptionsBar.innerHTML = `
                <div class="option-group">
                    <label>Intensity: <input type="range" id="blur-intensity-bar" min="1" max="5" value="${this.blurIntensity || 2}"> <span id="blur-intensity-value-bar">${this.blurIntensity || 2}</span></label>
                    <label><input type="checkbox" id="blur-alpha-channel" ${this.blurAlphaChannel ? 'checked' : ''}> Blur Alpha</label>
                </div>
            `;
            
            const blurIntensityBar = document.getElementById('blur-intensity-bar');
            if (blurIntensityBar) {
                blurIntensityBar.addEventListener('input', (e) => {
                    this.blurIntensity = parseInt(e.target.value);
                    document.getElementById('blur-intensity-value-bar').textContent = this.blurIntensity;
                });
            }
            
            const blurAlphaChannelBar = document.getElementById('blur-alpha-channel');
            if (blurAlphaChannelBar) {
                blurAlphaChannelBar.addEventListener('change', (e) => {
                    this.blurAlphaChannel = e.target.checked;
                });
            }
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