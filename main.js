// Debug utility - automatically detects dev vs production
// Cache buster: v1.1.0-gif-export-fix
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
        this.editor = new OptimizedBitmapEditor(this.canvas, 480, 320);
        this.previewCanvas = document.getElementById('preview-canvas');
        
        // Memory management - Track all event listeners for cleanup
        this.globalEventListeners = new Map();
        this.timers = new Set();
        
        // Progress Manager removed - no longer needed
        
        // Initialize Advanced Text Tool System
        this.textObjectManager = new TextObjectManager(this);
        
        // Initialize Custom Font Manager (Phase 3)
        this.customFontManager = TextRenderer.initializeCustomFontManager(this);
        
        // Setup real-time thumbnail updates
        this.setupRealtimeThumbnails();
        
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
        this.textClickPos = null;
        this.brushSize = 2;
        this.pencilSize = 1;
        this.brushShape = 'circle'; // 'circle' or 'square'
        this.eraserSize = 2;
        this.currentDrawValue = 0; // Track current draw value for stroke
        this.eraserSmooth = true;
        this.sprayRadius = 10;
        this.sprayDensity = 10;
        this.blurSize = 3;
        this.lineWidth = 1;
        this.circleDrawBorder = true;
        this.circleDrawFill = false;
        
        // Unified Shapes Tool state management
        this.currentShapeMode = 'rectangle'; // 'rectangle' or 'circle'
        this.unifiedShapeBorder = true;      // Unified border setting
        this.unifiedShapeFill = false;       // Unified fill setting
        this.shapeSpecificSettings = {
            rectangle: {
                // Rectangle-specific settings
                proportionalResize: false
            },
            circle: {
                // Circle-specific settings  
                perfectCircle: false,
                centerMode: false
            }
        };
        
        this.blurDitherMethod = 'Bayer4x4';
        this.blurAlphaChannel = true;
        this.currentDisplayMode = 'black';
        this.moveLoop = true;
        
        // Project background settings
        this.projectBackgroundType = 'white'; // 'transparent', 'white', or 'black'
        
        // Debounced onion skinning update for performance
        this.onionSkinningUpdateTimeout = null;
        
        // Preview settings
        this.forcePixelPerfectPreview = false; // Can be toggled via UI
        
        // Guides system
        this.guides = [];
        this.activeGuideId = null;
        this.guideColors = ['#ff0000', '#0088ff', '#00ff00', '#ff8800', '#ff00ff', '#00ffff', '#ffff00', '#8800ff', '#ffa500', '#800080'];
        this.guideColorIndex = 0;
        this.guideSnap = true;
        this.guideSortEnabled = false;
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
        this.spacePressed = false;
        this.previousTool = null;
        
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
            // Playdate display mode removed
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
        this.setupAboutDialog();
        
        // Initialize button states
        this.updateGridButton();
        // Checkerboard functionality removed
        this.updateGuidesButton();
        this.updatePixelPerfectButton();
        this.updateColorDisplay();
        
        // Test ImageImporter availability
        if (typeof ImageImporter !== 'undefined') {
            DEBUG.log('ImageImporter is available');
        } else {
            DEBUG.error('ImageImporter is NOT available');
        }
        
        // Initialize display mode
        this.setDisplayMode('black');
        
        // Initialize tool selection and UI state
        this.setTool('brush');
        
        // Initialize tool options display
        // Tool options will be updated by updateToolOptionsBar()
        
        // Initialize canvas view
        this.setupCanvasControls();
        this.setupSheetsPanel();
        
        // Initialize animation system (after sheets are set up)
        this.setupAnimationSystem();
        
        // Initialize project management system
        this.setupProjectManagement();
        
        // Initialize auto-save system
        this.setupAutoSave();
        
        // Initialize managers for cleanup tracking
        this.initializeManagers();
        
        // Update initial menu states
        if (this.menuManager) {
            this.menuManager.updateExportGifMenuState();
        }
    }

    initializeEventListeners() {
        this.setupCanvasEvents();
        this.setupToolbarEvents();
        this.setupKeyboardShortcuts();
        this.setupWindowEvents();
        this.setupColorPanelEvents();
        this.setupPanelCollapse();
    }

    setupCanvasControls() {
        const controlsBar = document.getElementById('canvas-controls-bar');
        if (!controlsBar) return;

        // Controls are always visible by default - no hiding/timeout functionality

        // Remove any dynamic positioning styles (controls are fixed position)
        controlsBar.style.left = '';
        controlsBar.style.bottom = '';
        controlsBar.style.transform = '';
    }

    setupSheetsPanel() {
        // Initialize sheets system with current editor state
        this.sheets = [
            {
                id: 1,
                name: 'Sheet 1',
                width: this.editor.width,  // Use actual editor dimensions
                height: this.editor.height,
                layers: this.editor.layers.map(layer => ({
                    ...layer,
                    pixels: new Uint8Array(layer.pixels),
                    alpha: new Uint8Array(layer.alpha)
                }))
            }
        ];
        this.currentSheetId = 1;
        
        // Setup event listeners
        this.setupSheetsEventListeners();
        
        // Render sheets list immediately
        this.renderSheetsList();
        
        // Detect project background type from the first sheet
        this.detectProjectBackgroundType();
        
        // Initial save of current editor state to sheet
        this.saveCurrentSheetState();
        
        // Update thumbnail for current sheet
        this.updateSheetThumbnail(1);
    }

    // Detect project background type from current editor state
    detectProjectBackgroundType() {
        if (!this.editor || !this.editor.layers || this.editor.layers.length === 0) {
            console.log('No editor layers to detect background type, using default white');
            this.projectBackgroundType = 'white';
            return;
        }
        
        const backgroundLayer = this.editor.layers[0]; // Assume first layer is background
        if (!backgroundLayer || !backgroundLayer.pixels || !backgroundLayer.alpha) {
            console.log('Invalid background layer, using default white');
            this.projectBackgroundType = 'white';
            return;
        }
        
        const totalPixels = backgroundLayer.pixels.length;
        const blackPixels = backgroundLayer.pixels.reduce((count, pixel) => count + (pixel === 1 ? 1 : 0), 0);
        const alphaPixels = backgroundLayer.alpha.reduce((count, alpha) => count + (alpha > 0 ? 1 : 0), 0);
        
        // Detect background type
        if (alphaPixels === 0) {
            // All alpha is 0 = transparent background
            this.projectBackgroundType = 'transparent';
            console.log('Detected transparent background');
        } else if (blackPixels === totalPixels && alphaPixels === totalPixels) {
            // All pixels are black with full alpha = black background
            this.projectBackgroundType = 'black';
            console.log('Detected black background');
        } else {
            // Default to white background
            this.projectBackgroundType = 'white';
            console.log('Detected white background');
        }
        
        console.log(`Project background type set to: ${this.projectBackgroundType}`);
    }

    // Real-time thumbnail update for current sheet
    updateCurrentSheetThumbnailRealtime() {
        if (!this.currentSheetId) return;
        
        // Save current sheet state first
        this.saveCurrentSheetState();
        
        // Update thumbnail
        this.updateSheetThumbnail(this.currentSheetId);
    }

    setupRealtimeThumbnails() {
        // Setup real-time thumbnail updates when canvas changes
        this.editor.setRenderCompleteCallback(() => {
            // Throttle thumbnail updates to avoid performance issues
            if (!this.thumbnailUpdateThrottle) {
                this.thumbnailUpdateThrottle = true;
                setTimeout(() => {
                    this.updateCurrentSheetThumbnailRealtime();
                    this.thumbnailUpdateThrottle = false;
                }, 100); // Update thumbnail every 100ms max
            }
        });
    }

    setupAnimationSystem() {
        // Initialize animation state
        this.animationState = {
            isPlaying: false,
            isPaused: false,
            currentFrame: 1,
            totalFrames: 1,
            speed: 12, // FPS
            loop: true,
            animationTimer: null,
            onionSkinning: false
        };

        // Get animation control elements
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        const firstFrameBtn = document.getElementById('first-frame-btn');
        const prevFrameBtn = document.getElementById('prev-frame-btn');
        const nextFrameBtn = document.getElementById('next-frame-btn');
        const lastFrameBtn = document.getElementById('last-frame-btn');
        const speedInput = document.getElementById('animation-speed');
        const speedDecreaseBtn = document.getElementById('speed-decrease');
        const speedIncreaseBtn = document.getElementById('speed-increase');
        const loopButton = document.getElementById('loop-animation');
        const onionSkinningBtn = document.getElementById('onion-skinning-btn');
        const frameCounter = document.getElementById('frame-counter');
        const timelineTrack = document.getElementById('timeline-track');

        // Playback controls
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playAnimation());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseAnimation());
        }
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopAnimation());
        }

        // Frame navigation
        if (firstFrameBtn) {
            firstFrameBtn.addEventListener('click', () => this.goToFirstFrame());
        }
        if (prevFrameBtn) {
            prevFrameBtn.addEventListener('click', () => this.goToPreviousFrame());
        }
        if (nextFrameBtn) {
            nextFrameBtn.addEventListener('click', () => this.goToNextFrame());
        }
        if (lastFrameBtn) {
            lastFrameBtn.addEventListener('click', () => this.goToLastFrame());
        }

        // Animation speed controls
        const updateSpeed = (newSpeed) => {
            this.animationState.speed = Math.max(1, Math.min(30, newSpeed));
            if (speedInput) {
                speedInput.value = this.animationState.speed;
            }
            // Restart animation with new speed if playing
            if (this.animationState.isPlaying) {
                this.stopAnimation();
                this.playAnimation();
            }
        };

        if (speedInput) {
            speedInput.addEventListener('input', (e) => {
                updateSpeed(parseInt(e.target.value) || 12);
            });
        }

        if (speedDecreaseBtn) {
            speedDecreaseBtn.addEventListener('click', () => {
                updateSpeed(this.animationState.speed - 1);
            });
        }

        if (speedIncreaseBtn) {
            speedIncreaseBtn.addEventListener('click', () => {
                updateSpeed(this.animationState.speed + 1);
            });
        }

        if (loopButton) {
            loopButton.addEventListener('click', (e) => {
                // Toggle the active state
                const isActive = loopButton.classList.contains('active');
                if (isActive) {
                    loopButton.classList.remove('active');
                    this.animationState.loop = false;
                } else {
                    loopButton.classList.add('active');
                    this.animationState.loop = true;
                }
            });
        }

        if (onionSkinningBtn) {
            onionSkinningBtn.addEventListener('click', (e) => {
                // Toggle onion skinning
                const isActive = onionSkinningBtn.classList.contains('active');
                if (isActive) {
                    onionSkinningBtn.classList.remove('active');
                    this.animationState.onionSkinning = false;
                } else {
                    onionSkinningBtn.classList.add('active');
                    this.animationState.onionSkinning = true;
                }
                this.updateOnionSkinning();
            });
        }

        // Initialize UI
        this.updateAnimationUI();
        this.updateTimeline();
    }

    setupSheetsEventListeners() {
        // Add new sheet button
        document.getElementById('add-sheet-btn').addEventListener('click', () => {
            this.addNewSheet();
        });

        // Duplicate sheet button
        document.getElementById('duplicate-sheet-btn').addEventListener('click', () => {
            this.duplicateCurrentSheet();
        });

        // Delete sheet button
        document.getElementById('delete-sheet-btn').addEventListener('click', () => {
            this.deleteCurrentSheet();
        });

        // Sheet item clicks
        document.getElementById('sheets-list').addEventListener('click', (e) => {
            const sheetItem = e.target.closest('.sheet-item');
            if (sheetItem) {
                const sheetId = parseInt(sheetItem.dataset.sheetId);
                this.switchToSheet(sheetId);
            }
        });

        // Sheet name editing
        document.getElementById('sheets-list').addEventListener('blur', (e) => {
            if (e.target.classList.contains('sheet-name')) {
                const sheetItem = e.target.closest('.sheet-item');
                const sheetId = parseInt(sheetItem.dataset.sheetId);
                this.renameSheet(sheetId, e.target.textContent.trim());
            }
        }, true);

        // Handle Enter key on sheet name editing
        document.getElementById('sheets-list').addEventListener('keydown', (e) => {
            if (e.target.classList.contains('sheet-name') && e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });
    }

    addNewSheet() {
        const newId = Math.max(...this.sheets.map(s => s.id)) + 1;
        
        // Create background layer based on project background type
        let backgroundPixels, backgroundAlpha;
        
        if (this.projectBackgroundType === 'transparent') {
            // Transparent background
            backgroundPixels = new Uint8Array(this.editor.width * this.editor.height); // All 0 (white)
            backgroundAlpha = new Uint8Array(this.editor.width * this.editor.height); // All 0 (transparent)
        } else if (this.projectBackgroundType === 'black') {
            // Black background
            backgroundPixels = new Uint8Array(this.editor.width * this.editor.height).fill(1); // All 1 (black)
            backgroundAlpha = new Uint8Array(this.editor.width * this.editor.height).fill(1); // All 1 (opaque)
        } else {
            // White background (default)
            backgroundPixels = new Uint8Array(this.editor.width * this.editor.height); // All 0 (white)
            backgroundAlpha = new Uint8Array(this.editor.width * this.editor.height).fill(1); // All 1 (opaque)
        }
        
        const newSheet = {
            id: newId,
            name: `Sheet ${newId}`,
            width: this.editor.width,
            height: this.editor.height,
            layers: [
                {
                    id: 1,
                    name: 'Background',
                    visible: true,
                    blendMode: 'normal',
                    pixels: backgroundPixels,
                    alpha: backgroundAlpha
                },
                {
                    id: 2,
                    name: 'Layer 1',
                    visible: true,
                    blendMode: 'normal',
                    pixels: new Uint8Array(this.editor.width * this.editor.height),
                    alpha: new Uint8Array(this.editor.width * this.editor.height)
                }
            ]
        };
        
        this.sheets.push(newSheet);
        this.renderSheetsList();
        this.switchToSheet(newId);
        
        // Update animation system
        if (this.animationState) {
            this.updateAnimationUI();
        }
        
        // Update Export GIF menu state
        if (this.menuManager) {
            this.menuManager.updateExportGifMenuState();
        }
    }

    duplicateCurrentSheet() {
        const currentSheet = this.sheets.find(s => s.id === this.currentSheetId);
        if (!currentSheet) return;
        
        const newId = Math.max(...this.sheets.map(s => s.id)) + 1;
        const duplicatedSheet = {
            id: newId,
            name: `${currentSheet.name} Copy`,
            width: currentSheet.width,
            height: currentSheet.height,
            layers: currentSheet.layers.map(layer => ({
                ...layer,
                id: layer.id,
                pixels: new Uint8Array(layer.pixels),
                alpha: new Uint8Array(layer.alpha)
            }))
        };
        
        this.sheets.push(duplicatedSheet);
        this.renderSheetsList();
        this.switchToSheet(newId);
        
        // Update animation system
        if (this.animationState) {
            this.updateAnimationUI();
        }
        
        // Update Export GIF menu state
        if (this.menuManager) {
            this.menuManager.updateExportGifMenuState();
        }
    }

    deleteCurrentSheet() {
        if (this.sheets.length <= 1) {
            alert('Cannot delete the last sheet.');
            return;
        }
        
        const currentIndex = this.sheets.findIndex(s => s.id === this.currentSheetId);
        if (currentIndex === -1) return;
        
        if (confirm(`Delete "${this.sheets[currentIndex].name}"?`)) {
            this.sheets.splice(currentIndex, 1);
            
            // Switch to adjacent sheet
            const newIndex = Math.min(currentIndex, this.sheets.length - 1);
            this.currentSheetId = this.sheets[newIndex].id;
            
            this.renderSheetsList();
            this.loadSheet(this.currentSheetId);
            
            // Update animation system
            if (this.animationState) {
                // Stop animation if playing
                if (this.animationState.isPlaying) {
                    this.stopAnimation();
                }
                
                // Adjust current frame if needed
                if (this.animationState.currentFrame > this.sheets.length) {
                    this.animationState.currentFrame = this.sheets.length;
                }
                
                this.updateAnimationUI();
            }
            
            // Update Export GIF menu state
            if (this.menuManager) {
                this.menuManager.updateExportGifMenuState();
            }
        }
    }

    switchToSheet(sheetId) {
        if (this.currentSheetId === sheetId) return;
        
        // Save current sheet state
        this.saveCurrentSheetState();
        
        // Switch to new sheet
        this.currentSheetId = sheetId;
        this.loadSheet(sheetId);
        
        // Update UI
        this.renderSheetsList();
        
        // Update animation current frame when manually switching sheets
        if (this.animationState) {
            const sheetIndex = this.sheets.findIndex(s => s.id === sheetId);
            if (sheetIndex !== -1) {
                this.animationState.currentFrame = sheetIndex + 1;
                this.updateAnimationUI();
                // Update onion skinning when switching frames
                this.updateOnionSkinning();
            }
        }
    }

    saveCurrentSheetState() {
        const currentSheet = this.sheets.find(s => s.id === this.currentSheetId);
        if (!currentSheet) return;
        
        // Save current editor dimensions
        currentSheet.width = this.editor.width;
        currentSheet.height = this.editor.height;
        
        // Save all layers with deep copy
        currentSheet.layers = this.editor.layers.map(layer => ({
            ...layer,
            pixels: new Uint8Array(layer.pixels),
            alpha: new Uint8Array(layer.alpha)
        }));
        
        // Update thumbnail after saving state
        this.updateSheetThumbnail(this.currentSheetId);
    }

    loadSheet(sheetId) {
        const sheet = this.sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        
        // Resize editor if needed
        if (sheet.width !== this.editor.width || sheet.height !== this.editor.height) {
            this.editor.resize(sheet.width, sheet.height);
        }
        
        // Load layers
        this.editor.layers = sheet.layers.map(layer => ({
            ...layer,
            pixels: new Uint8Array(layer.pixels),
            alpha: new Uint8Array(layer.alpha)
        }));
        
        this.editor.markCompositeDirty();
        this.editor.scheduleRender();
        this.updateOutput();
        this.updateLayersList();
        
        // Update thumbnail
        this.updateSheetThumbnail(sheetId);
    }

    renameSheet(sheetId, newName) {
        const sheet = this.sheets.find(s => s.id === sheetId);
        if (!sheet || !newName) return;
        
        sheet.name = newName;
        this.renderSheetsList();
    }

    renderSheetsList() {
        const sheetsList = document.getElementById('sheets-list');
        if (!sheetsList) return;
        
        sheetsList.innerHTML = '';
        
        this.sheets.forEach(sheet => {
            const sheetItem = document.createElement('div');
            sheetItem.className = `sheet-item ${sheet.id === this.currentSheetId ? 'active' : ''}`;
            sheetItem.dataset.sheetId = sheet.id;
            
            sheetItem.innerHTML = `
                <div class="sheet-preview">
                    <canvas class="sheet-thumbnail" width="32" height="16" data-sheet-id="${sheet.id}"></canvas>
                </div>
                <div class="sheet-info">
                    <div class="sheet-name" contenteditable="true">${sheet.name}</div>
                    <div class="sheet-size">${sheet.width}x${sheet.height}</div>
                </div>
            `;
            
            sheetsList.appendChild(sheetItem);
            this.updateSheetThumbnail(sheet.id);
        });
    }

    updateSheetThumbnail(sheetId) {
        const sheet = this.sheets.find(s => s.id === sheetId);
        const thumbnail = document.querySelector(`canvas[data-sheet-id="${sheetId}"]`);
        if (!sheet || !thumbnail) return;
        
        const ctx = thumbnail.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        // Clear thumbnail
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 32, 16);
        
        // Render a simplified version of the sheet
        const scaleX = 32 / sheet.width;
        const scaleY = 16 / sheet.height;
        
        // Composite all visible layers
        const composite = new Uint8Array(sheet.width * sheet.height);
        sheet.layers.forEach(layer => {
            if (!layer.visible) return;
            for (let i = 0; i < composite.length; i++) {
                if (layer.alpha[i] > 0) {
                    composite[i] = layer.pixels[i];
                }
            }
        });
        
        // Render to thumbnail
        for (let y = 0; y < sheet.height; y++) {
            for (let x = 0; x < sheet.width; x++) {
                const index = y * sheet.width + x;
                const pixelValue = composite[index];
                
                if (pixelValue === 0) { // Black pixel
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(
                        Math.floor(x * scaleX),
                        Math.floor(y * scaleY),
                        Math.ceil(scaleX),
                        Math.ceil(scaleY)
                    );
                }
            }
        }
    }

    setupCanvasEvents() {
        // Global mouse event tracking for continuous drawing outside canvas
        this.globalMouseTracking = false;
        
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
                this.globalMouseTracking = true; // Enable global tracking for panning
                this.startCanvasPan(e);
            } else if (this.currentTool === 'move') {
                this.globalMouseTracking = true; // Enable global tracking for layer move
                this.startLayerMove(e);
            } else if (this.currentTool === 'guide') {
                this.globalMouseTracking = true; // Enable global tracking for guide creation
                this.startGuideCreation(e);
            } else if (['shapes', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                this.isDrawing = true;
                this.globalMouseTracking = true; // Enable global tracking for shapes
            } else {
                this.isDrawing = true;
                this.globalMouseTracking = true; // Enable global tracking
                if (this.currentTool === 'brush' || this.currentTool === 'eraser' || this.currentTool === 'blur' || this.currentTool === 'spray') {
                    this.hideBrushCursor();
                }
                this.handleCanvasClick(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            // Update cursor coordinates in menu bar
            this.updateCursorCoordinates(e.clientX, e.clientY);
            
            if (this.isPanning) {
                this.updatePanning(e);
            } else if (this.isPanningCanvas) {
                this.updateCanvasPan(e);
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
                    // Throttle preview updates for performance
                    if (!this.previewThrottleTime || Date.now() - this.previewThrottleTime >= 16) {
                        this.previewThrottleTime = Date.now();
                        this.drawLinePreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                    }
                } else if (this.currentTool === 'shapes' && this.startPos) {
                    const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                    // Throttle preview updates for performance
                    if (!this.previewThrottleTime || Date.now() - this.previewThrottleTime >= 16) {
                        this.previewThrottleTime = Date.now();
                        if (this.currentShapeMode === 'rectangle') {
                            this.drawRectPreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                        } else if (this.currentShapeMode === 'circle') {
                            this.drawCirclePreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                        }
                    }
                } else if (!['shapes', 'select-rect', 'select-circle', 'line'].includes(this.currentTool)) {
                    this.handleCanvasClick(e);
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.stopPanning();
            } else if (this.isPanningCanvas) {
                this.stopCanvasPan();
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
            } else if (this.isDrawing && ['shapes', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                
                if (this.currentTool === 'shapes') {
                    this.clearShapePreview();
                    // Left click = primary color (black), Right click = secondary color (white)
                    const drawValue = e.button === 0 ? 0 : 1;
                    
                    if (this.currentShapeMode === 'rectangle') {
                        // Rectangle mode - use unified border/fill settings
                        if (this.unifiedShapeBorder && !this.unifiedShapeFill) {
                            // Border only
                            this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, false, true, this.currentPattern, drawValue);
                        } else if (this.unifiedShapeFill && !this.unifiedShapeBorder) {
                            // Fill only
                            this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, true, false, this.currentPattern, drawValue);
                        } else if (this.unifiedShapeBorder && this.unifiedShapeFill) {
                            // Both border and fill
                            this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, true, true, this.currentPattern, drawValue);
                        }
                    } else if (this.currentShapeMode === 'circle') {
                        // Circle mode - use unified border/fill settings and modifier keys
                        const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
                            this.startPos.x, this.startPos.y, coords.x, coords.y, 
                            this.shiftPressed, this.altPressed
                        );
                        if (this.unifiedShapeBorder && !this.unifiedShapeFill) {
                            // Border only
                            this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, false, true, this.currentPattern, drawValue);
                        } else if (this.unifiedShapeFill && !this.unifiedShapeBorder) {
                            // Fill only
                            this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern, drawValue);
                        } else if (this.unifiedShapeBorder && this.unifiedShapeFill) {
                            // Both border and fill
                            this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern, drawValue);
                        }
                    }
                    this.editor.saveState();
                    // Defer updateOutput to avoid blocking
                    requestAnimationFrame(() => this.updateOutput());
                } else if (this.currentTool === 'line') {
                    this.clearLinePreview();
                    // Left click = primary color (black), Right click = secondary color (white)
                    const drawValue = e.button === 0 ? 0 : 1;
                    // Use selected pattern instead of color override
                    this.editor.drawLine(this.startPos.x, this.startPos.y, coords.x, coords.y, this.currentPattern, drawValue, this.lineWidth);
                    this.editor.saveState();
                    // Defer updateOutput to avoid blocking
                    requestAnimationFrame(() => this.updateOutput());
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
            } else if (this.isDrawing && !['rect', 'circle', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                // Handle mouseup for drawing tools (brush, pencil, eraser, spray, blur)
                this.handleCanvasClick(e);
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
            
            // Reset coordinate display when mouse leaves canvas
            const coordsDisplay = document.getElementById('cursor-coordinates');
            if (coordsDisplay) {
                coordsDisplay.textContent = 'X:- Y:-';
            }
        });

        // Global mouse events for continuous drawing outside canvas
        document.addEventListener('mousemove', (e) => {
            if (!this.globalMouseTracking) return;
            
            // Continue drawing operations even outside canvas
            if (this.isDrawing && ['pencil', 'brush', 'eraser', 'spray', 'blur'].includes(this.currentTool)) {
                // Check if coordinates are within reasonable bounds relative to canvas
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                
                // Allow drawing slightly outside canvas bounds for smooth stroke continuation
                const buffer = 50; // pixels outside canvas to allow
                if (coords.x >= -buffer && coords.x < this.editor.width + buffer && 
                    coords.y >= -buffer && coords.y < this.editor.height + buffer) {
                    this.handleCanvasClick(e);
                }
            } else if (this.isMovingLayer) {
                this.updateLayerMove(e);
            } else if (this.isPanningCanvas) {
                this.updateCanvasPan(e);
            } else if (this.isDraggingGuide) {
                this.updateGuideDrag(e);
            } else if (this.isDraggingSelection) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                this.updateSelectionPosition(coords);
            } else if (this.isDraggingSelectionGraphics) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                this.moveSelectionGraphics(coords);
            } else if (this.isDrawing && this.currentTool === 'line' && this.startPos) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                if (!this.previewThrottleTime || Date.now() - this.previewThrottleTime >= 16) {
                    this.previewThrottleTime = Date.now();
                    this.drawLinePreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                }
            } else if (this.isDrawing && this.currentTool === 'shapes' && this.startPos) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                if (!this.previewThrottleTime || Date.now() - this.previewThrottleTime >= 16) {
                    this.previewThrottleTime = Date.now();
                    if (this.currentShapeMode === 'rectangle') {
                        this.drawRectPreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                    } else if (this.currentShapeMode === 'circle') {
                        this.drawCirclePreview(this.startPos.x, this.startPos.y, coords.x, coords.y);
                    }
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.globalMouseTracking) return;
            
            this.globalMouseTracking = false; // Disable global tracking
            
            // Handle mouse up for ongoing operations
            if (this.isDrawing) {
                this.isDrawing = false;
                
                // Handle shape/line completion
                if (['shapes', 'line', 'select-rect', 'select-circle'].includes(this.currentTool) && this.startPos) {
                    const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                    
                    if (this.currentTool === 'shapes') {
                        this.clearShapePreview();
                        const drawValue = e.button === 0 ? 0 : 1;
                        
                        if (this.currentShapeMode === 'rectangle') {
                            if (this.unifiedShapeBorder && !this.unifiedShapeFill) {
                                this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, false, true, this.currentPattern, drawValue);
                            } else if (this.unifiedShapeFill && !this.unifiedShapeBorder) {
                                this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, true, false, this.currentPattern, drawValue);
                            } else if (this.unifiedShapeBorder && this.unifiedShapeFill) {
                                this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, true, true, this.currentPattern, drawValue);
                            }
                        } else if (this.currentShapeMode === 'circle') {
                            const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
                                this.startPos.x, this.startPos.y, coords.x, coords.y, 
                                this.shiftPressed, this.altPressed
                            );
                            if (this.unifiedShapeBorder && !this.unifiedShapeFill) {
                                this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, false, true, this.currentPattern, drawValue);
                            } else if (this.unifiedShapeFill && !this.unifiedShapeBorder) {
                                this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern, drawValue);
                            } else if (this.unifiedShapeBorder && this.unifiedShapeFill) {
                                this.editor.drawEllipse(centerX, centerY, radiusX, radiusY, true, false, this.currentPattern, drawValue);
                            }
                        }
                        this.editor.saveState();
                        requestAnimationFrame(() => this.updateOutput());
                    } else if (this.currentTool === 'line') {
                        this.clearLinePreview();
                        const drawValue = e.button === 0 ? 0 : 1;
                        this.editor.drawLine(this.startPos.x, this.startPos.y, coords.x, coords.y, this.currentPattern, drawValue);
                        this.editor.saveState();
                        requestAnimationFrame(() => this.updateOutput());
                    }
                }
                
                // Show brush cursor again if needed
                if (this.currentTool === 'brush' || this.currentTool === 'eraser' || this.currentTool === 'blur' || this.currentTool === 'spray') {
                    this.showBrushCursor();
                }
            }
            
            // Handle other global operations
            if (this.isMovingLayer) {
                this.stopLayerMove();
            } else if (this.isPanningCanvas) {
                this.stopCanvasPan();
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
        // Store handler references for cleanup
        this.globalMouseMoveHandler = (e) => {
            if (this.isPanning) {
                this.updatePanning(e);
            } else if (this.isDrawing) {
                // Get canvas coordinates, even if outside bounds
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                
                // Handle different tools when drawing outside canvas
                if (['brush', 'pencil', 'spray', 'eraser', 'blur'].includes(this.currentTool)) {
                    // For continuous drawing tools, continue drawing by clamping coordinates to canvas bounds
                    // This allows drawing to continue at canvas edge when cursor goes outside
                    const clampedCoords = {
                        x: Math.max(0, Math.min(this.editor.width - 1, coords.x)),
                        y: Math.max(0, Math.min(this.editor.height - 1, coords.y))
                    };
                    
                    // Create a synthetic event with clamped coordinates for handleCanvasClick
                    const rect = this.canvas.getBoundingClientRect();
                    const syntheticEvent = {
                        clientX: rect.left + (clampedCoords.x * this.editor.zoom) + (this.editor.zoom / 2),
                        clientY: rect.top + (clampedCoords.y * this.editor.zoom) + (this.editor.zoom / 2),
                        button: e.button,
                        type: 'mousemove'
                    };
                    
                    this.handleCanvasClick(syntheticEvent);
                } else if (['rect', 'circle', 'line'].includes(this.currentTool) && this.startPos) {
                    // For shape tools, continue updating preview even outside canvas
                    // Clamp coordinates to canvas bounds for preview
                    const clampedCoords = {
                        x: Math.max(0, Math.min(this.editor.width - 1, coords.x)),
                        y: Math.max(0, Math.min(this.editor.height - 1, coords.y))
                    };
                    
                    // Update shape preview with clamped coordinates
                    if (this.currentTool === 'shapes') {
                        if (this.currentShapeMode === 'rectangle') {
                            this.drawRectPreview(this.startPos.x, this.startPos.y, clampedCoords.x, clampedCoords.y);
                        } else if (this.currentShapeMode === 'circle') {
                            this.drawCirclePreview(this.startPos.x, this.startPos.y, clampedCoords.x, clampedCoords.y);
                        }
                    } else if (this.currentTool === 'line') {
                        this.drawLinePreview(this.startPos.x, this.startPos.y, clampedCoords.x, clampedCoords.y);
                    }
                }
            }
        };
        
        this.globalMouseUpHandler = () => {
            if (this.isPanning) {
                this.stopPanning();
            }
            this.isDrawing = false;
        };
        
        // Add global event listeners and track them for cleanup
        this.addGlobalEventListener(document, 'mousemove', this.globalMouseMoveHandler);
        this.addGlobalEventListener(document, 'mouseup', this.globalMouseUpHandler);
    }

    setupToolbarEvents() {
        // Tool palette events
        const tools = ['brush', 'pencil', 'eraser', 'bucket', 'select-rect', 'select-circle', 
                      'move', 'line', 'text', 'shapes', 'spray', 'blur', 'guide', 'hand'];
        
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

        document.getElementById('pixel-perfect-preview-btn').addEventListener('click', () => {
            this.forcePixelPerfectPreview = !this.forcePixelPerfectPreview;
            this.updatePixelPerfectButton();
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
        
        // Update onion skinning overlay for new zoom
        this.updateOnionSkinning();
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
        
        // Position dropdown below the button (normal dropdown behavior)
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
            
            // Create color dots container
            const colorDots = document.createElement('div');
            colorDots.style.cssText = `
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            `;
            
            // Get display mode colors
            const displayMode = this.displayModes[option.value];
            if (displayMode) {
                // Background color dot
                const bgDot = document.createElement('div');
                bgDot.style.cssText = `
                    width: 10px;
                    height: 10px;
                    background-color: ${displayMode.background_color};
                    border-radius: 50%;
                    border: 1px solid rgba(0,0,0,0.2);
                    flex-shrink: 0;
                `;
                
                // Foreground color dot
                const fgDot = document.createElement('div');
                fgDot.style.cssText = `
                    width: 10px;
                    height: 10px;
                    background-color: ${displayMode.draw_color};
                    border-radius: 50%;
                    border: 1px solid rgba(0,0,0,0.2);
                    flex-shrink: 0;
                `;
                
                colorDots.appendChild(bgDot);
                colorDots.appendChild(fgDot);
            }
            
            // Create text label
            const textLabel = document.createElement('span');
            textLabel.textContent = option.textContent;
            textLabel.style.cssText = `
                flex: 1;
                margin-left: 8px;
            `;
            
            colorPreview.appendChild(colorDots);
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
        
        // Position dropdown below the button (normal dropdown behavior)
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
        const displayModeName = document.getElementById('display-mode-name');
        const displayDropdownBtn = document.getElementById('display-dropdown-btn');
        
        DEBUG.log('updateDisplayModeDisplay called');
        DEBUG.log('Elements found - select:', !!select, 'previewIcon:', !!previewIcon, 'displayModeName:', !!displayModeName);
        
        // Update display mode name and add color dots
        if (displayModeName && select && displayDropdownBtn) {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
                // Clear existing content
                displayModeName.innerHTML = '';
                
                // Create container for dots and text
                const container = document.createElement('div');
                container.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 6px;
                `;
                
                // Create color dots
                const displayMode = this.displayModes[this.currentDisplayMode];
                if (displayMode) {
                    // Background color dot
                    const bgDot = document.createElement('div');
                    bgDot.style.cssText = `
                        width: 8px;
                        height: 8px;
                        background-color: ${displayMode.background_color};
                        border-radius: 50%;
                        border: 1px solid rgba(0,0,0,0.2);
                        flex-shrink: 0;
                    `;
                    
                    // Foreground color dot
                    const fgDot = document.createElement('div');
                    fgDot.style.cssText = `
                        width: 8px;
                        height: 8px;
                        background-color: ${displayMode.draw_color};
                        border-radius: 50%;
                        border: 1px solid rgba(0,0,0,0.2);
                        flex-shrink: 0;
                    `;
                    
                    container.appendChild(bgDot);
                    container.appendChild(fgDot);
                }
                
                // Add text
                const textSpan = document.createElement('span');
                textSpan.textContent = selectedOption.textContent;
                container.appendChild(textSpan);
                
                displayModeName.appendChild(container);
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

    updateCursorCoordinates(clientX, clientY) {
        const coords = this.editor.getCanvasCoordinates(clientX, clientY);
        const coordsDisplay = document.getElementById('cursor-coordinates');
        
        if (coordsDisplay && coords) {
            // Ensure coordinates are within canvas bounds and are integers
            const x = Math.max(0, Math.min(Math.floor(coords.x), this.editor.width - 1));
            const y = Math.max(0, Math.min(Math.floor(coords.y), this.editor.height - 1));
            coordsDisplay.textContent = `X:${x} Y:${y}`;
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Track modifier keys globally
            this.shiftPressed = e.shiftKey;
            this.altPressed = e.altKey;
            
            // Track space key for temporary hand tool
            if (e.code === 'Space' && !this.spacePressed) {
                this.spacePressed = true;
                this.previousTool = this.currentTool;
                if (this.currentTool !== 'text' && 
                    e.target.tagName !== 'INPUT' && 
                    e.target.tagName !== 'TEXTAREA') {
                    this.setTool('hand');
                    e.preventDefault();
                }
            }
            
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
            } else if (isCtrl && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.dialogs.showCanvasResizeDialog();
            }
            // Edit operations
            else if (isCtrl && e.key === 'z') {
                e.preventDefault();
                if (this.editor.undo()) {
                    this.updateOutput();
                    this.updateLayerList();
                }
            } else if (isCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                if (this.editor.redo()) {
                    this.updateOutput();
                    this.updateLayerList();
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
            } else if (isCtrl && e.key === 'd') {
                e.preventDefault();
                this.clearSelection();
            }
            // Brush size shortcuts
            else if (e.key === '[' && !isCtrl) {
                e.preventDefault();
                this.decreaseBrushSize();
            } else if (e.key === ']' && !isCtrl) {
                e.preventDefault();
                this.increaseBrushSize();
            }
            // Color shortcuts
            else if (e.key.toLowerCase() === 'x' && !isCtrl) {
                e.preventDefault();
                this.swapPrimarySecondaryColors();
            } else if (e.key.toLowerCase() === 'd' && !isCtrl) {
                e.preventDefault();
                this.resetToDefaultColors();
            } else if (e.key.toLowerCase() === 'i' && !isCtrl) {
                e.preventDefault();
                this.invertDisplayMode();
            }
            // Selection tool shortcuts
            else if (e.key.toLowerCase() === 'm' && e.shiftKey && !isCtrl) {
                e.preventDefault();
                this.setTool('select-circle');
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
            } else if (e.key.toLowerCase() === 'm' && !e.shiftKey && !isCtrl) {
                this.setTool('select-rect');
            } else if (e.key.toLowerCase() === 'v' && !isCtrl) {
                this.setTool('move');
            } else if (e.key.toLowerCase() === 'h' && !isCtrl) {
                this.setTool('hand');
            } else if (e.key.toLowerCase() === 'u' && !isCtrl) {
                this.setTool('blur');
            } else if (e.key.toLowerCase() === 'g' && !isCtrl) {
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
            // Layer shortcuts
            else if (isCtrl && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.addNewLayer();
            } else if (isCtrl && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.duplicateActiveLayer();
            } else if (isCtrl && e.key === ']') {
                e.preventDefault();
                this.moveToNextLayer();
            } else if (isCtrl && e.key === '[') {
                e.preventDefault();
                this.moveToPreviousLayer();
            } else if (isCtrl && e.shiftKey && e.key === ']') {
                e.preventDefault();
                this.moveLayerUp();
            } else if (isCtrl && e.shiftKey && e.key === '[') {
                e.preventDefault();
                this.moveLayerDown();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // Track modifier keys globally
            this.shiftPressed = e.shiftKey;
            this.altPressed = e.altKey;
            
            // Handle space key release for temporary hand tool
            if (e.code === 'Space' && this.spacePressed) {
                this.spacePressed = false;
                if (this.previousTool && this.currentTool === 'hand') {
                    this.setTool(this.previousTool);
                    this.previousTool = null;
                }
            }
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
        const primaryColour = document.getElementById('primary-color');
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

        // Secondary color block click (fixed to white in monochrome mode)
        const secondaryColour = document.getElementById('secondary-color');
        if (secondaryColour) {
            console.log('Secondary color element found');
            secondaryColour.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Secondary color clicked - fixed to white in monochrome mode');
                // In monochrome mode, secondary is always white, no color picker needed
                this.secondaryColor = '#ffffff';
                this.updateColorDisplay('secondary');
            });
        }
    }

    setupPanelCollapse() {
        // Add click handlers to all collapsible panel headers (except sheets panel)
        const collapsibleHeaders = document.querySelectorAll('.panel-header.collapsible');
        
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const panel = header.closest('.panel');
                const caret = header.querySelector('.panel-caret');
                
                // Skip sheets panel collapsing
                if (panel.id === 'sheets-panel') return;
                
                // Toggle collapsed state
                panel.classList.toggle('collapsed');
                
                // Optional: Save collapsed state to localStorage
                const panelId = panel.id;
                const isCollapsed = panel.classList.contains('collapsed');
                localStorage.setItem(`panel-${panelId}-collapsed`, isCollapsed);
            });
        });
        
        // Restore collapsed states from localStorage
        const panels = document.querySelectorAll('.panel[id]:not(#sheets-panel)');
        panels.forEach(panel => {
            const panelId = panel.id;
            const savedState = localStorage.getItem(`panel-${panelId}-collapsed`);
            if (savedState === 'true') {
                panel.classList.add('collapsed');
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
                                this.errorHandler.handleFileImportError(error, file);
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
                                    this.errorHandler.handleFileImportError(error, file);
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
            case 'show-sheets':
                this.toggleWindow('sheets-panel');
                break;
            case 'about':
                this.dialogManager.showDialog('about-dialog');
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

            // New Layer menu actions for active layer only
            case 'layer-flip-horizontal':
                this.editor.flipActiveLayerHorizontal();
                this.updateOutput();
                break;
            case 'layer-flip-vertical':
                this.editor.flipActiveLayerVertical();
                this.updateOutput();
                break;
            case 'layer-rotate-90':
                this.editor.rotateActiveLayer90();
                this.updateOutput();
                break;
            case 'layer-rotate-180':
                this.editor.rotateActiveLayer180();
                this.updateOutput();
                break;
            case 'layer-rotate-270':
                this.editor.rotateActiveLayer270();
                this.updateOutput();
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
        
        // Get pixel coordinates (snapped to grid) - this is exactly where drawing will occur
        const pixelCoords = this.editor.getCanvasCoordinates(clientX, clientY);
        
        // Convert back to screen coordinates using the same method as getCanvasCoordinates
        const canvasRect = this.canvas.getBoundingClientRect();
        const zoom = this.editor.zoom;
        
        let screenX, screenY;
        
        if (this.currentTool === 'pencil') {
            // Pencil tool - position cursor exactly on the pixel that will be drawn
            // Note: getCanvasCoordinates already accounts for pan transforms, so no need to add canvasOffset
            screenX = canvasRect.left + (pixelCoords.x * zoom);
            screenY = canvasRect.top + (pixelCoords.y * zoom);
        } else {
            // Other tools - position cursor at brush area
            const toolSize = this.currentTool === 'eraser' ? this.eraserSize : 
                            this.currentTool === 'blur' ? this.blurSize :
                            this.currentTool === 'spray' ? this.sprayRadius : this.brushSize;
            
            // Position cursor at top-left corner of the center pixel where drawing occurs
            // The drawWithBrush method draws around pixelCoords as center point
            const radius = Math.floor(toolSize / 2);
            
            // Calculate where the top-left corner of the brush area should be positioned
            const brushTopLeftX = pixelCoords.x - radius;
            const brushTopLeftY = pixelCoords.y - radius;
            
            // Convert to screen coordinates without adding canvasOffset (already handled by getCanvasCoordinates)
            screenX = canvasRect.left + (brushTopLeftX * zoom);
            screenY = canvasRect.top + (brushTopLeftY * zoom);
        }
        
        this.brushCursorOverlay.style.left = screenX + 'px';
        this.brushCursorOverlay.style.top = screenY + 'px';
    }

    updateBrushCursorSize() {
        if (!this.brushCursorOverlay) return;
        const toolSize = this.currentTool === 'eraser' ? this.eraserSize : 
                        this.currentTool === 'pencil' ? 1 :
                        this.currentTool === 'blur' ? this.blurSize :
                        this.currentTool === 'spray' ? this.sprayRadius : this.brushSize;
        
        const zoom = this.editor.zoom;
        
        // Store current display state before updating classes
        const currentDisplay = this.brushCursorOverlay.style.display;
        
        // Update appearance based on tool
        this.brushCursorOverlay.className = 'brush-cursor-overlay';
        
        // Restore display state
        this.brushCursorOverlay.style.display = currentDisplay;
        
        if (this.currentTool === 'brush' || this.currentTool === 'pencil') {
            // Create pixelated cursor showing individual pixels
            this.createPixelatedCursor(toolSize, zoom);
            this.brushCursorOverlay.classList.add('pixelated');
        } else {
            // Use simple outline for other tools
            const size = toolSize * zoom;
            this.brushCursorOverlay.style.width = size + 'px';
            this.brushCursorOverlay.style.height = size + 'px';
            this.brushCursorOverlay.innerHTML = '';
            
            if (this.currentTool === 'eraser') {
                this.brushCursorOverlay.classList.add('eraser');
            }
        }
    }
    
    createPixelatedCursor(brushSize, zoom) {
        // Match exactly how drawWithBrush calculates pixels
        const radius = Math.floor(brushSize / 2);
        const totalSize = brushSize * zoom;
        
        this.brushCursorOverlay.style.width = totalSize + 'px';
        this.brushCursorOverlay.style.height = totalSize + 'px';
        
        // Clear previous content
        this.brushCursorOverlay.innerHTML = '';
        
        // Create pixels using the same logic as drawWithBrush
        // centerX, centerY is at 0,0 in our cursor coordinate system
        const centerX = 0;
        const centerY = 0;
        
        let pixelCount = 0;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                let shouldDraw = false;
                
                // Match the exact drawing logic from drawWithBrush
                if (brushSize === 1) {
                    if (x === centerX && y === centerY) {
                        shouldDraw = true;
                    }
                } else {
                    // Match brush shape logic from drawWithBrush
                    if (this.brushShape === 'square') {
                        // Square brush - all pixels within radius bounds
                        shouldDraw = true;
                    } else {
                        // Circle brush (default)
                        const dx = x - centerX;
                        const dy = y - centerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance <= radius) {
                            shouldDraw = true;
                        }
                    }
                }
                
                if (shouldDraw) {
                    const pixel = document.createElement('div');
                    pixel.className = 'brush-cursor-pixel';
                    
                    // Position relative to the cursor center
                    pixel.style.left = ((x + radius) * zoom) + 'px';
                    pixel.style.top = ((y + radius) * zoom) + 'px';
                    pixel.style.width = zoom + 'px';
                    pixel.style.height = zoom + 'px';
                    this.brushCursorOverlay.appendChild(pixel);
                    pixelCount++;
                    
                }
            }
        }
        
        // No transform needed - positioning handles centering
        this.brushCursorOverlay.style.transform = 'none';
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
        // Initialize layer selection tracking
        this.selectedLayers = new Set();
        
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

        // Select all layers button
        document.getElementById('select-all-layers-btn').addEventListener('click', () => {
            this.selectAllLayers();
        });

        // Batch delete button
        document.getElementById('batch-delete-btn').addEventListener('click', () => {
            this.batchDeleteLayers();
        });

        // Combine layers button
        document.getElementById('combine-layers-btn').addEventListener('click', () => {
            this.combineLayers();
        });

        // Clear selection button
        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.clearLayerSelection();
        });

        this.updateLayersList();
    }

    updateLayersList() {
        const layerList = document.getElementById('layer-list');
        layerList.innerHTML = '';

        // Update batch controls visibility
        this.updateBatchControlsVisibility();

        // Create layers in reverse order (top rendering layers at top of UI, background at bottom)
        for (let i = this.editor.getLayerCount() - 1; i >= 0; i--) {
            const layerInfo = this.editor.getLayerInfo(i);
            if (!layerInfo) continue;

            const layerItem = document.createElement('div');
            const isSelected = this.selectedLayers.has(i);
            layerItem.className = `layer-item ${layerInfo.isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`;
            layerItem.dataset.layerIndex = i;
            layerItem.draggable = true;

            layerItem.innerHTML = `
                <input type="checkbox" class="layer-checkbox" ${isSelected ? 'checked' : ''} data-action="toggle-selection">
                <div class="layer-visibility" data-action="toggle-visibility">
                    <i class="ph ${layerInfo.visible ? 'ph-eye' : 'ph-eye-slash'}"></i>
                </div>
                <div class="layer-name">${layerInfo.name}</div>
            `;

            // Layer click to select
            layerItem.addEventListener('click', (e) => {
                if (!e.target.dataset.action) {
                    // Handle multi-selection with Ctrl/Cmd key
                    if (e.ctrlKey || e.metaKey) {
                        this.toggleLayerSelection(i);
                    } else if (e.shiftKey && this.lastSelectedLayer !== null) {
                        this.selectLayerRange(this.lastSelectedLayer, i);
                    } else {
                        // Single selection
                        this.clearLayerSelection();
                        this.editor.setActiveLayer(i);
                        this.lastSelectedLayer = i;
                        this.updateLayersList();
                    }
                }
            });

            // Checkbox toggle
            layerItem.querySelector('.layer-checkbox').addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleLayerSelection(i);
            });

            // Visibility toggle
            layerItem.querySelector('.layer-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedLayers.size > 1 && this.selectedLayers.has(i)) {
                    // Toggle visibility for all selected layers
                    this.editor.toggleLayersVisibility([...this.selectedLayers]);
                } else {
                    // Toggle visibility for this layer only
                    this.editor.toggleLayerVisibility(i);
                }
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

    // ===== LAYER MULTI-SELECTION METHODS =====

    toggleLayerSelection(layerIndex) {
        if (this.selectedLayers.has(layerIndex)) {
            this.selectedLayers.delete(layerIndex);
        } else {
            this.selectedLayers.add(layerIndex);
        }
        this.lastSelectedLayer = layerIndex;
        this.updateLayersList();
    }

    selectLayerRange(fromIndex, toIndex) {
        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        
        this.clearLayerSelection();
        for (let i = start; i <= end; i++) {
            if (i >= 0 && i < this.editor.getLayerCount()) {
                this.selectedLayers.add(i);
            }
        }
        this.lastSelectedLayer = toIndex;
        this.updateLayersList();
    }

    selectAllLayers() {
        this.selectedLayers.clear();
        for (let i = 0; i < this.editor.getLayerCount(); i++) {
            this.selectedLayers.add(i);
        }
        this.updateLayersList();
    }

    clearLayerSelection() {
        this.selectedLayers.clear();
        this.updateLayersList();
    }

    updateBatchControlsVisibility() {
        const batchControls = document.getElementById('layer-batch-controls');
        if (this.selectedLayers.size > 0) {
            batchControls.style.display = 'flex';
        } else {
            batchControls.style.display = 'none';
        }
    }

    // ===== LAYER BATCH OPERATIONS =====

    batchDeleteLayers() {
        if (this.selectedLayers.size === 0) {
            this.showNotification('No layers selected', 'error');
            return;
        }

        if (this.selectedLayers.size >= this.editor.getLayerCount()) {
            this.showNotification('Cannot delete all layers', 'error');
            return;
        }

        const layerNames = [...this.selectedLayers].map(i => this.editor.getLayerInfo(i)?.name).filter(Boolean);
        const confirmMessage = `Delete ${this.selectedLayers.size} selected layer(s)?\n${layerNames.join(', ')}`;
        
        if (confirm(confirmMessage)) {
            if (this.editor.deleteLayers([...this.selectedLayers])) {
                this.clearLayerSelection();
                this.updateLayersList();
                this.updateOutput();
                this.showNotification(`Deleted ${layerNames.length} layer(s)`, 'success');
            } else {
                this.showNotification('Failed to delete layers', 'error');
            }
        }
    }

    combineLayers() {
        if (this.selectedLayers.size < 2) {
            this.showNotification('Select at least 2 layers to combine', 'error');
            return;
        }

        const layerNames = [...this.selectedLayers].map(i => this.editor.getLayerInfo(i)?.name).filter(Boolean);
        const confirmMessage = `Combine ${this.selectedLayers.size} selected layer(s)?\n${layerNames.join(', ')}`;
        
        if (confirm(confirmMessage)) {
            const combinedName = `Combined (${layerNames.join(', ')})`;
            if (this.editor.combineLayers([...this.selectedLayers], combinedName)) {
                this.clearLayerSelection();
                this.updateLayersList();
                this.updateOutput();
                this.showNotification(`Combined ${layerNames.length} layer(s)`, 'success');
            } else {
                this.showNotification('Failed to combine layers', 'error');
            }
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

    updatePixelPerfectButton() {
        const btn = document.getElementById('pixel-perfect-preview-btn');
        if (this.forcePixelPerfectPreview) {
            btn.classList.add('active');
            btn.title = 'Disable Pixel-Perfect Preview';
        } else {
            btn.classList.remove('active');
            btn.title = 'Enable Pixel-Perfect Preview';
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




    createInPlaceTextInput(canvasX, canvasY, screenX, screenY) {
        // Remove any existing text input
        this.removeInPlaceTextInput();
        
        // Create text input element
        const textInput = document.createElement('input');
        textInput.id = 'in-place-text-input';
        textInput.type = 'text';
        textInput.style.position = 'absolute';
        textInput.style.left = screenX + 'px';
        textInput.style.top = screenY + 'px';
        textInput.style.zIndex = '10000';
        textInput.style.padding = '4px 8px';
        textInput.style.border = '2px solid var(--accent-primary)';
        textInput.style.borderRadius = '4px';
        textInput.style.background = 'var(--bg-primary)';
        textInput.style.color = 'var(--text-primary)';
        textInput.style.fontSize = '14px';
        textInput.style.fontFamily = 'monospace';
        textInput.style.outline = 'none';
        textInput.placeholder = 'Type text...';
        
        // Store position for rendering
        this.textClickPos = { x: canvasX, y: canvasY };
        
        // Add preview canvas
        const previewCanvas = document.createElement('canvas');
        previewCanvas.id = 'in-place-text-preview';
        previewCanvas.style.position = 'absolute';
        previewCanvas.style.left = screenX + 'px';
        previewCanvas.style.top = (screenY + 35) + 'px';
        previewCanvas.style.zIndex = '9999';
        previewCanvas.style.border = '1px solid var(--border-primary)';
        previewCanvas.style.background = 'var(--bg-primary)';
        previewCanvas.style.borderRadius = '4px';
        previewCanvas.style.imageRendering = 'pixelated';
        previewCanvas.width = 200;
        previewCanvas.height = 50;
        
        // Add to document
        document.body.appendChild(textInput);
        document.body.appendChild(previewCanvas);
        
        // Event listeners
        textInput.addEventListener('input', () => {
            this.updateInPlaceTextPreview(textInput.value, previewCanvas);
        });
        
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const inputValue = e.target.value || '';
                this.applyInPlaceText(inputValue);
                e.preventDefault();
            } else if (e.key === 'Escape') {
                this.removeInPlaceTextInput();
                e.preventDefault();
            }
        });
        
        // Remove on click outside (delay to avoid immediate removal)
        this.textClickOutsideHandler = (e) => {
            if (!textInput.contains(e.target) && !previewCanvas.contains(e.target)) {
                this.removeInPlaceTextInput();
            }
        };
        // Use longer delay to ensure current click event is fully processed
        setTimeout(() => {
            if (this.textClickOutsideHandler) { // Only add if not already removed
                document.addEventListener('click', this.textClickOutsideHandler);
            }
        }, 200);
        
        // Focus and show initial preview
        textInput.focus();
        this.updateInPlaceTextPreview('', previewCanvas);
    }

    updateInPlaceTextPreview(text, previewCanvas) {
        if (TextRenderer && previewCanvas) {
            try {
                const textStr = String(text || '');
                const displayText = textStr.toUpperCase() || 'TYPE HERE';
                TextRenderer.renderTextPreview(displayText, previewCanvas);
            } catch (error) {
                console.error('In-place text preview error:', error);
            }
        }
    }

    applyInPlaceText(text) {
        // Ensure text is a string
        const textStr = String(text || '').trim();
        
        if (textStr && this.textClickPos && TextRenderer) {
            try {
                // Create text object instead of direct rendering
                const textObject = this.textObjectManager.createTextObject(
                    textStr,  // Keep original case, no need to uppercase
                    this.textClickPos.x,
                    this.textClickPos.y,
                    {
                        font: TextRenderer.getCurrentFont(),
                        size: TextRenderer.getCurrentSize(),
                        pattern: this.currentPattern,
                        layer: this.editor.getActiveLayerIndex()
                    }
                );
                
                this.editor.saveState();
                this.updateOutput();
                this.showNotification(`Text object "${textStr}" created`, 'success');
            } catch (error) {
                this.errorHandler.handleToolError(error, 'text');
            }
        }
        this.removeInPlaceTextInput();
    }

    /**
     * Apply multi-line text with advanced formatting options
     */
    applyInPlaceTextAdvanced(text, multilineOptions = {}) {
        // Ensure text is a string
        const textStr = String(text || '').trim();
        
        if (textStr && this.textClickPos && TextRenderer) {
            try {
                // Use advanced text rendering if MultilineTextRenderer is available
                if (typeof MultilineTextRenderer !== 'undefined') {
                    const renderResult = TextRenderer.renderTextAdvanced(
                        textStr,
                        this.textClickPos.x,
                        this.textClickPos.y,
                        this.editor,
                        this.currentPattern,
                        TextRenderer.getCurrentFont(),
                        TextRenderer.getCurrentSize(),
                        multilineOptions
                    );
                    
                    this.editor.saveState();
                    this.updateOutput();
                    
                    const lineInfo = renderResult.lineCount > 1 ? ` (${renderResult.lineCount} lines)` : '';
                    this.showNotification(`Multi-line text created${lineInfo}`, 'success');
                } else {
                    // Fall back to simple text rendering
                    this.applyInPlaceText(textStr);
                }
            } catch (error) {
                this.errorHandler.handleToolError(error, 'text-advanced');
            }
        }
    }

    /**
     * Show text creation dialog with font and size selection
     */
    showTextCreationDialog() {
        // Create dialog if it doesn't exist
        if (!document.getElementById('text-creation-dialog')) {
            this.createTextCreationDialog();
        }
        
        const dialog = document.getElementById('text-creation-dialog');
        const textInput = document.getElementById('text-creation-input');
        const fontSelect = document.getElementById('text-creation-font');
        const sizeSelect = document.getElementById('text-creation-size');
        const alignmentSelect = document.getElementById('text-creation-alignment');
        const lineSpacingInput = document.getElementById('text-creation-line-spacing');
        const maxWidthInput = document.getElementById('text-creation-max-width');
        const wrapModeSelect = document.getElementById('text-creation-wrap-mode');
        
        // Set current values
        textInput.value = '';
        fontSelect.value = TextRenderer.getCurrentFont();
        sizeSelect.value = TextRenderer.getCurrentSize();
        
        // Set default multi-line values
        if (alignmentSelect) alignmentSelect.value = 'left';
        if (lineSpacingInput) lineSpacingInput.value = '0';
        if (maxWidthInput) maxWidthInput.value = '0';
        if (wrapModeSelect) wrapModeSelect.value = 'manual';
        
        // Position dialog near click position but ensure it stays in viewport
        this.positionDialogNearClick(dialog);
        
        // Show dialog
        dialog.style.display = 'flex';
        
        // Focus text input after a short delay to ensure dialog is visible
        setTimeout(() => {
            textInput.focus();
            textInput.select();
        }, 100);
        
        // Update preview
        this.updateTextCreationPreview();
    }

    /**
     * Position dialog near the click position while keeping it in viewport
     */
    positionDialogNearClick(dialog) {
        if (!this.textClickPos) return;
        
        // Get canvas position and zoom info
        const canvasRect = this.canvas.getBoundingClientRect();
        const zoom = this.editor.zoom;
        
        // Calculate screen position of click
        const screenX = canvasRect.left + (this.textClickPos.x * zoom);
        const screenY = canvasRect.top + (this.textClickPos.y * zoom);
        
        // Get dialog content size (estimate)
        const dialogWidth = 380;
        const dialogHeight = 350;
        
        // Calculate preferred position (offset from click)
        let preferredX = screenX + 20;
        let preferredY = screenY - 50;
        
        // Ensure dialog stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 20;
        
        // Adjust X position
        if (preferredX + dialogWidth + margin > viewportWidth) {
            preferredX = screenX - dialogWidth - 20;
        }
        if (preferredX < margin) {
            preferredX = margin;
        }
        
        // Adjust Y position
        if (preferredY + dialogHeight + margin > viewportHeight) {
            preferredY = screenY - dialogHeight + 50;
        }
        if (preferredY < margin) {
            preferredY = margin;
        }
        
        // Apply custom positioning
        dialog.style.alignItems = 'flex-start';
        dialog.style.justifyContent = 'flex-start';
        dialog.style.paddingTop = `${preferredY}px`;
        dialog.style.paddingLeft = `${preferredX}px`;
    }
    
    /**
     * Create text creation dialog
     */
    createTextCreationDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'text-creation-dialog';
        dialog.className = 'modal-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Text</h3>
                    <button class="modal-close" id="text-creation-close">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="input-section">
                        <label for="text-creation-input">Text:</label>
                        <textarea id="text-creation-input" placeholder="Enter text..." maxlength="500" rows="3"></textarea>
                        <div class="input-help">
                            <i class="ph ph-info"></i>
                            <span>Use Shift+Enter for line breaks</span>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-section">
                            <label for="text-creation-font">Font:</label>
                            <select id="text-creation-font">
                                <option value="bitmap-5x7">Bitmap 5×7</option>
                                <option value="bitmap-3x5">Bitmap 3×5</option>
                                <option value="bitmap-7x9">Bitmap 7×9</option>
                            </select>
                        </div>
                        <div class="input-section">
                            <label for="text-creation-size">Size:</label>
                            <select id="text-creation-size">
                                <option value="1">1×</option>
                                <option value="2">2×</option>
                                <option value="3">3×</option>
                                <option value="4">4×</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-section">
                            <label for="text-creation-alignment">Alignment:</label>
                            <select id="text-creation-alignment">
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                        <div class="input-section">
                            <label for="text-creation-line-spacing">Line Spacing:</label>
                            <div class="number-input">
                                <button type="button" id="line-spacing-dec">−</button>
                                <input type="number" id="text-creation-line-spacing" min="0" max="20" value="0">
                                <button type="button" id="line-spacing-inc">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="input-section">
                        <label for="text-creation-max-width">Max Width (0 = no limit):</label>
                        <div class="number-input">
                            <button type="button" id="max-width-dec">−</button>
                            <input type="number" id="text-creation-max-width" min="0" max="500" value="0">
                            <button type="button" id="max-width-inc">+</button>
                        </div>
                    </div>
                    <div class="input-section">
                        <label for="text-creation-wrap-mode">Text Wrapping:</label>
                        <select id="text-creation-wrap-mode">
                            <option value="manual">Manual (line breaks only)</option>
                            <option value="wrap">Word wrap</option>
                            <option value="char">Character wrap</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="text-creation-cancel" class="btn-secondary">Cancel</button>
                    <button id="text-creation-create" class="btn-primary">Create Text</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Setup event handlers
        document.getElementById('text-creation-close').addEventListener('click', () => {
            this.closeTextCreationDialog();
        });
        
        document.getElementById('text-creation-cancel').addEventListener('click', () => {
            this.closeTextCreationDialog();
        });
        
        document.getElementById('text-creation-create').addEventListener('click', () => {
            const text = document.getElementById('text-creation-input').value;
            if (text.trim()) {
                // Get all text settings
                const fontType = document.getElementById('text-creation-font').value;
                const size = parseInt(document.getElementById('text-creation-size').value);
                const alignment = document.getElementById('text-creation-alignment').value;
                const lineSpacing = parseInt(document.getElementById('text-creation-line-spacing').value);
                const maxWidth = parseInt(document.getElementById('text-creation-max-width').value);
                const wrapMode = document.getElementById('text-creation-wrap-mode').value;
                
                // Update renderer settings
                TextRenderer.setCurrentFont(fontType);
                TextRenderer.setCurrentSize(size);
                
                // Create multi-line text options
                const multilineOptions = {
                    alignment: alignment,
                    lineSpacing: lineSpacing,
                    maxWidth: maxWidth,
                    lineBreakMode: wrapMode
                };
                
                // Check if we're in edit mode (via TextObjectManager)
                if (this.textObjectManager && this.textObjectManager.isEditMode) {
                    // Save existing text object changes with multi-line support
                    this.textObjectManager.saveTextObjectChanges(text, multilineOptions);
                } else {
                    // Create new text with multi-line support
                    this.applyInPlaceTextAdvanced(text, multilineOptions);
                }
                
                // Update tool options bar to show new settings
                this.updateToolOptionsBar();
            }
            this.closeTextCreationDialog();
        });
        
        // Real-time preview updates
        const updatePreview = () => this.updateTextCreationPreview();
        
        document.getElementById('text-creation-input').addEventListener('input', updatePreview);
        document.getElementById('text-creation-font').addEventListener('change', updatePreview);
        document.getElementById('text-creation-size').addEventListener('change', updatePreview);
        document.getElementById('text-creation-alignment').addEventListener('change', updatePreview);
        document.getElementById('text-creation-line-spacing').addEventListener('input', updatePreview);
        document.getElementById('text-creation-max-width').addEventListener('input', updatePreview);
        document.getElementById('text-creation-wrap-mode').addEventListener('change', updatePreview);
        
        // Number input controls
        const lineSpacingInput = document.getElementById('text-creation-line-spacing');
        const lineSpacingInc = document.getElementById('line-spacing-inc');
        const lineSpacingDec = document.getElementById('line-spacing-dec');
        const maxWidthInput = document.getElementById('text-creation-max-width');
        const maxWidthInc = document.getElementById('max-width-inc');
        const maxWidthDec = document.getElementById('max-width-dec');
        
        if (lineSpacingInc) {
            lineSpacingInc.addEventListener('click', () => {
                const currentValue = parseInt(lineSpacingInput.value);
                if (currentValue < 20) {
                    lineSpacingInput.value = currentValue + 1;
                    updatePreview();
                }
            });
        }
        
        if (lineSpacingDec) {
            lineSpacingDec.addEventListener('click', () => {
                const currentValue = parseInt(lineSpacingInput.value);
                if (currentValue > 0) {
                    lineSpacingInput.value = currentValue - 1;
                    updatePreview();
                }
            });
        }
        
        if (maxWidthInc) {
            maxWidthInc.addEventListener('click', () => {
                const currentValue = parseInt(maxWidthInput.value);
                if (currentValue < 500) {
                    maxWidthInput.value = currentValue + 10;
                    updatePreview();
                }
            });
        }
        
        if (maxWidthDec) {
            maxWidthDec.addEventListener('click', () => {
                const currentValue = parseInt(maxWidthInput.value);
                if (currentValue > 0) {
                    maxWidthInput.value = Math.max(0, currentValue - 10);
                    updatePreview();
                }
            });
        }
        
        // Handle Ctrl+Enter to create, regular Enter to add line breaks
        document.getElementById('text-creation-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                document.getElementById('text-creation-create').click();
            }
        });
        
        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.closeTextCreationDialog();
            }
        });
    }
    
    /**
     * Update text creation preview
     */
    updateTextCreationPreview() {
        if (!this.textClickPos) return;
        
        const text = document.getElementById('text-creation-input').value;
        if (!text) {
            // Clear live preview if no text
            this.clearLivePreview();
            return;
        }
        
        const font = document.getElementById('text-creation-font').value;
        const size = parseInt(document.getElementById('text-creation-size').value);
        const alignment = document.getElementById('text-creation-alignment').value;
        const lineSpacing = parseInt(document.getElementById('text-creation-line-spacing').value);
        const maxWidth = parseInt(document.getElementById('text-creation-max-width').value);
        const wrapMode = document.getElementById('text-creation-wrap-mode').value;
        
        // Create multiline options
        const multilineOptions = {
            alignment: alignment,
            lineSpacing: lineSpacing,
            maxWidth: maxWidth,
            lineBreakMode: wrapMode
        };
        
        // Render live preview on canvas
        this.renderLiveTextPreview(text, font, size, multilineOptions);
    }

    /**
     * Render live text preview directly on the canvas
     */
    renderLiveTextPreview(text, font, size, multilineOptions) {
        // Clear previous preview
        this.clearLivePreview();
        
        // Save current canvas state for restoration
        if (!this.previewCanvasData) {
            this.previewCanvasData = this.editor.getCanvasImageData();
        }
        
        // Create a temporary overlay effect using a different rendering approach
        const canvas = this.canvas;
        const ctx = canvas.getContext('2d');
        
        // Get the zoom and position info
        const zoom = this.editor.zoom;
        const x = this.textClickPos.x * zoom;
        const y = this.textClickPos.y * zoom;
        
        // Render preview text with semi-transparent overlay
        this.renderPreviewTextOverlay(ctx, text, x, y, font, size, multilineOptions, zoom);
    }

    /**
     * Render preview text as overlay on canvas
     */
    renderPreviewTextOverlay(ctx, text, x, y, font, size, multilineOptions, zoom) {
        ctx.save();
        
        // Create semi-transparent preview effect
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#007acc'; // Blue preview color
        
        // Use MultilineTextRenderer if available, otherwise fallback
        if (typeof MultilineTextRenderer !== 'undefined' && (text.includes('\n') || multilineOptions.maxWidth > 0)) {
            this.renderMultilinePreviewOverlay(ctx, text, x, y, font, size, multilineOptions, zoom);
        } else {
            this.renderSingleLinePreviewOverlay(ctx, text, x, y, font, size, zoom);
        }
        
        ctx.restore();
    }

    /**
     * Render single line preview overlay
     */
    renderSingleLinePreviewOverlay(ctx, text, x, y, font, size, zoom) {
        const fontData = TextRenderer.fonts[font];
        if (!fontData) return;
        
        const charWidth = fontData.width * size * zoom;
        const charHeight = fontData.height * size * zoom;
        const spacing = fontData.spacing * size * zoom;
        
        let currentX = x;
        
        for (const char of text) {
            const charBitmap = fontData.data[char] || fontData.data[char.toUpperCase()];
            if (charBitmap) {
                // Render character as filled rectangle (simplified preview)
                for (let row = 0; row < charBitmap.length; row++) {
                    for (let col = 0; col < charBitmap[row].length; col++) {
                        if (charBitmap[row][col] === 1) {
                            ctx.fillRect(
                                currentX + col * size * zoom,
                                y + row * size * zoom,
                                size * zoom,
                                size * zoom
                            );
                        }
                    }
                }
                currentX += charWidth + spacing;
            } else {
                currentX += charWidth + spacing;
            }
        }
    }

    /**
     * Render multi-line preview overlay (simplified)
     */
    renderMultilinePreviewOverlay(ctx, text, x, y, font, size, multilineOptions, zoom) {
        const fontData = TextRenderer.fonts[font];
        if (!fontData) return;
        
        const charWidth = fontData.width * size * zoom;
        const charHeight = fontData.height * size * zoom;
        const spacing = fontData.spacing * size * zoom;
        const lineHeight = (charHeight + multilineOptions.lineSpacing * zoom);
        
        // Process text into lines (simplified)
        const lines = text.split('\n');
        
        let currentY = y;
        for (const line of lines) {
            if (line.trim()) {
                this.renderSingleLinePreviewOverlay(ctx, line, x, currentY, font, size, zoom);
            }
            currentY += lineHeight;
        }
    }

    /**
     * Clear live preview and restore canvas
     */
    clearLivePreview() {
        if (this.previewCanvasData) {
            this.editor.restoreCanvasImageData(this.previewCanvasData);
            this.previewCanvasData = null;
        }
        this.editor.redraw();
    }
    
    /**
     * Close text creation dialog
     */
    closeTextCreationDialog() {
        const dialog = document.getElementById('text-creation-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            
            // Reset dialog positioning
            dialog.style.alignItems = 'center';
            dialog.style.justifyContent = 'center';
            dialog.style.paddingTop = '';
            dialog.style.paddingLeft = '';
            
            // Reset dialog for creation mode
            const titleElement = dialog.querySelector('.modal-header h3');
            const createBtn = document.getElementById('text-creation-create');
            titleElement.textContent = 'Create Text';
            createBtn.textContent = 'Create Text';
        }
        
        // Clear any live preview
        this.clearLivePreview();
        
        // Reset both creation and edit modes
        this.textClickPos = null;
        if (this.textObjectManager) {
            this.textObjectManager.editingObject = null;
            this.textObjectManager.isEditMode = false;
        }
    }

    removeInPlaceTextInput() {
        const textInput = document.getElementById('in-place-text-input');
        const previewCanvas = document.getElementById('in-place-text-preview');
        
        if (textInput) {
            textInput.remove();
        }
        if (previewCanvas) {
            previewCanvas.remove();
        }
        
        // Remove click outside handler if it exists
        if (this.textClickOutsideHandler) {
            document.removeEventListener('click', this.textClickOutsideHandler);
            this.textClickOutsideHandler = null;
        }
        
        this.textClickPos = null;
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
            
            const validation = this.errorHandler.validateCanvasSize(width, height);
            if (validation.valid) {
                this.createNewCanvas(width, height);
                closeDialog();
            } else {
                // Show detailed validation errors
                this.errorHandler.handleCanvasError(new Error(validation.errors.join(', ')), 'create-new');
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
                const bitmapData = BitmapExporter.parseHFile(code);
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
            alphaValue.textContent = e.target.value + '%';
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

        // Copy current layer data (both pixels and alpha) as Float32Array for dithering
        this.ditheringData.originalPixels = new Float32Array(activeLayer.pixels);
        this.ditheringData.originalAlpha = new Float32Array(activeLayer.alpha || this.editor.createEmptyAlpha());
        
        // Reset parameters
        this.ditheringData.alpha = 1.0;
        this.ditheringData.method = 'Bayer4x4';
        this.ditheringData.ditherAlphaChannel = false;

        // Update UI
        document.getElementById('dithering-method').value = this.ditheringData.method;
        document.getElementById('dithering-alpha').value = 100;
        document.getElementById('dithering-alpha-value').textContent = '100%';
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
        const previewCanvas = document.getElementById('dithering-preview-canvas');

        const layer = this.editor.getActiveLayer();
        if (!layer) {
            this.showNotification('No active layer for dithering', 'error');
            return;
        }

        const width = this.editor.width;
        const height = this.editor.height;

        // Use 3x zoom for compact preview
        const zoom = 3;

        // Setup preview canvas size
        previewCanvas.width = width * zoom;
        previewCanvas.height = height * zoom;
    }

    async updateDitheringPreview() {
        if (!this.ditheringData.originalPixels) return;

        const previewCanvas = document.getElementById('dithering-preview-canvas');
        
        // Show loading for larger canvases
        const totalPixels = this.editor.width * this.editor.height;
        // Large image processing notification removed

        try {
            // Dither pixel data
            const pixelLayer = {
                pixels: this.ditheringData.originalPixels,
                width: this.editor.width,
                height: this.editor.height
            };

            // Apply JavaScript dithering to pixels
            const ditheredPixels = await new Promise((resolve) => {
                setTimeout(() => {
                    const result = this.ditheringEffects.ditherLayer(
                        pixelLayer,
                        this.ditheringData.alpha,
                        this.ditheringData.method
                    );
                    resolve(result);
                }, 1);
            });

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

                ditheredAlpha = await new Promise((resolve) => {
                    setTimeout(() => {
                        const result = this.ditheringEffects.ditherLayer(
                            alphaLayer,
                            this.ditheringData.alpha,
                            this.ditheringData.method
                        );
                        resolve(result);
                    }, 1);
                });
            }

            // Use 3x zoom for compact preview
            const zoom = 3;

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
            
        } finally {
            // Loading indicator removed
        }
    }

    renderDitheringPreviewWithAlpha(canvas, pixelData, alphaData, width, height, zoom) {
        const ctx = canvas.getContext('2d');
        canvas.width = width * zoom;
        canvas.height = height * zoom;
        
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const pixelValue = pixelData[idx];
                const alphaValue = alphaData[idx];
                
                const canvasX = x * zoom;
                const canvasY = y * zoom;
                
                if (alphaValue === 0) {
                    // Transparent - render checkerboard pattern
                    this.renderTransparencyPattern(ctx, canvasX, canvasY, zoom);
                } else {
                    // Opaque - render pixel (BitsDraw format: 0=black, 1=white)
                    if (pixelValue === 0) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(canvasX, canvasY, zoom, zoom);
                    }
                    // If pixelValue === 1, leave white background (no need to draw)
                }
            }
        }
    }

    renderTransparencyPattern(ctx, x, y, size) {
        // Render a simple checkerboard pattern for transparency
        const checkSize = Math.max(1, Math.floor(size / 4));
        const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
        
        ctx.fillStyle = isEven ? '#f0f0f0' : '#e0e0e0';
        ctx.fillRect(x, y, size, size);
    }

    async applyDithering() {
        if (!this.ditheringData.previewPixels) {
            this.showNotification('No dithering preview to apply', 'error');
            return;
        }

        const activeLayer = this.editor.getActiveLayer();
        if (!activeLayer) {
            this.showNotification('No active layer to apply dithering', 'error');
            return;
        }

        // Apply dithering without progress display
        const totalPixels = this.ditheringData.previewPixels.length;

        try {
            // Apply the dithered pixels to the active layer in batches
            const batchSize = 1000;
            for (let i = 0; i < totalPixels; i += batchSize) {
                const end = Math.min(i + batchSize, totalPixels);
                
                // Copy batch of pixels
                for (let j = i; j < end; j++) {
                    activeLayer.pixels[j] = this.ditheringData.previewPixels[j];
                }
                
                // Allow UI updates for large operations
                if (totalPixels > 10000) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
            
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
            
        } catch (error) {
            this.showNotification(`Error applying dithering: ${error.message}`, 'error');
        }
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

    createNewCanvas(width, height, backgroundColor = 'white') {
        // Save current state if needed
        if (confirm('Create new canvas? Current work will be lost.')) {
            // Save project background setting
            this.projectBackgroundType = backgroundColor;
            
            // Use createNew for complete initialization instead of resize
            this.editor.createNew(width, height, backgroundColor);
            
            // Clear guides and reset UI state
            this.clearAllGuides();
            this.selection = null; // Clear any active selection
            
            // Update UI components
            this.setupPreview(); // Recreate preview canvas with new dimensions
            this.updateWindowTitle(width, height);
            this.updateLayersList(); // Refresh layers panel
            this.updateOutput();
            
            const bgText = backgroundColor === 'transparent' ? 'transparent' : 
                          backgroundColor === 'black' ? 'black' : 'white';
            this.showNotification(`New canvas created: ${width}×${height} (${bgText} background)`, 'success');
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
                        // For larger sizes, draw based on brush shape
                        if (this.brushShape === 'square') {
                            // Square brush - all pixels within radius bounds
                            shouldDraw = true;
                        } else {
                            // Circle brush (default)
                            const dx = x - centerX;
                            const dy = y - centerY;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance <= radius) {
                                shouldDraw = true;
                            }
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
        const newPoint = { 
            x, 
            y, 
            timestamp,
            pressure: 1.0 // Could be extended for pressure-sensitive input
        };
        
        // Calculate velocity and distance for intelligent point filtering
        if (this.strokePoints.length > 0) {
            const lastPoint = this.strokePoints[this.strokePoints.length - 1];
            const distance = Math.sqrt(
                Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
            );
            const timeDelta = timestamp - lastPoint.timestamp;
            const velocity = timeDelta > 0 ? distance / timeDelta : 0;
            
            newPoint.distance = distance;
            newPoint.velocity = velocity;
            
            // Skip points that are too close together for stronger smoothing
            // But allow slow drawing (low velocity) to add more detail
            const minDistance = velocity > 0.5 ? 1.5 : 0.5; // Adaptive threshold
            if (distance < minDistance && this.strokePoints.length > 2) {
                // Update the last point instead of adding a new one for very close points
                this.strokePoints[this.strokePoints.length - 1] = newPoint;
                return;
            }
        }
        
        this.strokePoints.push(newPoint);
        
        // Increase point limit for stronger smoothing with more history
        if (this.strokePoints.length > 150) {
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
        
        // Use more points for stronger smoothing when available
        if (len >= 6) {
            // Use 6 points for more aggressive smoothing
            this.drawAdvancedSmoothSegment(points, len, drawValue, alphaValue);
        } else if (len >= 4) {
            // Standard Catmull-Rom with enhanced parameters
            this.drawStandardSmoothSegment(points, len, drawValue, alphaValue);
        }
    }
    
    drawAdvancedSmoothSegment(points, len, drawValue, alphaValue) {
        // Use weighted average of multiple control points for stronger smoothing
        const p0 = points[len - 6];
        const p1 = points[len - 5];
        const p2 = points[len - 4];
        const p3 = points[len - 3];
        const p4 = points[len - 2];
        const p5 = points[len - 1];
        
        // Create smoothed control points using weighted averaging
        const smoothP1 = this.weightedAverage([p0, p1, p2], [0.1, 0.8, 0.1]);
        const smoothP2 = this.weightedAverage([p1, p2, p3], [0.15, 0.7, 0.15]);
        const smoothP3 = this.weightedAverage([p2, p3, p4], [0.15, 0.7, 0.15]);
        const smoothP4 = this.weightedAverage([p3, p4, p5], [0.1, 0.8, 0.1]);
        
        // Calculate distance for adaptive stepping
        const distance = Math.sqrt(
            Math.pow(smoothP3.x - smoothP2.x, 2) + Math.pow(smoothP3.y - smoothP2.y, 2)
        );
        
        // More aggressive smoothing: increase steps and reduce threshold
        const brushFactor = Math.max(1, this.brushSize / 2);
        const steps = Math.max(2, Math.min(50, Math.ceil(distance * 2 / brushFactor)));
        
        // Skip very short segments
        if (distance < 0.3) {
            return;
        }
        
        // Draw smooth curve with higher interpolation density
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = this.catmullRomInterpolate(smoothP1, smoothP2, smoothP3, smoothP4, t);
            
            // Much more aggressive threshold for smoother curves
            const threshold = Math.max(0.1, this.brushSize * 0.05);
            
            if (!this.lastDrawPoint || 
                Math.abs(point.x - this.lastDrawPoint.x) >= threshold || 
                Math.abs(point.y - this.lastDrawPoint.y) >= threshold) {
                
                this.drawWithBrush(Math.round(point.x), Math.round(point.y), drawValue, alphaValue);
                this.lastDrawPoint = { x: point.x, y: point.y };
            }
        }
    }
    
    drawStandardSmoothSegment(points, len, drawValue, alphaValue) {
        // Enhanced standard Catmull-Rom with stronger smoothing parameters
        const p0 = points[len - 4];
        const p1 = points[len - 3];
        const p2 = points[len - 2];
        const p3 = points[len - 1];
        
        // Apply smoothing to control points
        const smoothP0 = this.applyPointSmoothing(p0, points, len - 4);
        const smoothP1 = this.applyPointSmoothing(p1, points, len - 3);
        const smoothP2 = this.applyPointSmoothing(p2, points, len - 2);
        const smoothP3 = this.applyPointSmoothing(p3, points, len - 1);
        
        const distance = Math.sqrt(
            Math.pow(smoothP2.x - smoothP1.x, 2) + Math.pow(smoothP2.y - smoothP1.y, 2)
        );
        
        // Enhanced smoothing parameters
        const brushFactor = Math.max(1, this.brushSize / 2.5);
        const steps = Math.max(2, Math.min(40, Math.ceil(distance * 1.5 / brushFactor)));
        
        if (distance < 0.3) {
            return;
        }
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const point = this.catmullRomInterpolate(smoothP0, smoothP1, smoothP2, smoothP3, t);
            
            // Reduced threshold for smoother strokes
            const threshold = Math.max(0.15, this.brushSize * 0.06);
            
            if (!this.lastDrawPoint || 
                Math.abs(point.x - this.lastDrawPoint.x) >= threshold || 
                Math.abs(point.y - this.lastDrawPoint.y) >= threshold) {
                
                this.drawWithBrush(Math.round(point.x), Math.round(point.y), drawValue, alphaValue);
                this.lastDrawPoint = { x: point.x, y: point.y };
            }
        }
    }
    
    weightedAverage(points, weights) {
        let totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let x = 0, y = 0;
        
        for (let i = 0; i < points.length; i++) {
            const weight = weights[i] / totalWeight;
            x += points[i].x * weight;
            y += points[i].y * weight;
        }
        
        return { x, y };
    }
    
    applyPointSmoothing(point, allPoints, index) {
        // Apply local smoothing to individual points
        const neighbors = [];
        const weights = [];
        
        // Collect neighboring points for smoothing
        for (let offset = -2; offset <= 2; offset++) {
            const neighborIndex = index + offset;
            if (neighborIndex >= 0 && neighborIndex < allPoints.length) {
                neighbors.push(allPoints[neighborIndex]);
                // Gaussian-like weights (higher weight for closer points)
                const weight = Math.exp(-0.5 * offset * offset);
                weights.push(weight);
            }
        }
        
        if (neighbors.length < 2) {
            return point; // Not enough neighbors, return original
        }
        
        return this.weightedAverage(neighbors, weights);
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
        // Just clear stroke data without drawing an extra point on mouseup
        // The stroke should already be complete from the mousemove events
        
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
            const formatInfo = ImageImporter.getFileFormatInfo(file);
            const supportedFormats = Object.values(ImageImporter.getSupportedFormats()).map(f => f.name).join(', ');
            this.showNotification(`Unsupported format: ${formatInfo?.name || 'Unknown'}\nSupported formats: ${supportedFormats}`, 'error');
            return;
        }

        try {
            console.log('Loading image for placement...');
            const formatInfo = ImageImporter.getFileFormatInfo(file);
            this.showNotification(`Loading ${formatInfo.name} image (${formatInfo.fileSizeFormatted})...`, 'info');
            
            // Load the image and preserve original dimensions
            const imageData = await ImageImporter.loadImage(file);
            console.log('Image loaded:', imageData.width, 'x', imageData.height);
            this.showNotification(`Loaded ${formatInfo.name}: ${imageData.width}×${imageData.height} pixels`, 'success');
            
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
        
        // Update active tool indicator
        this.updateActiveToolIndicator(tool);
        
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
        if (tool === 'brush' || tool === 'pencil' || tool === 'eraser' || tool === 'blur' || tool === 'spray') {
            this.updateBrushCursorSize();
            // Show cursor if mouse is over canvas
            const canvas = document.getElementById('bitmap-canvas');
            if (canvas && canvas.matches(':hover')) {
                this.showBrushCursor();
            }
        } else {
            this.hideBrushCursor();
        }
        
        // Clear selection when switching tools (except for selection tools)
        if (!['select-rect', 'select-circle'].includes(tool)) {
            this.selection = null;
            this.selectionAnimationRunning = false;
            this.editor.redraw();
        }
        
        // Remove in-place text input if switching away from text tool
        if (tool !== 'text') {
            this.removeInPlaceTextInput();
        }
        
        // Tool options display will be updated by updateToolOptionsBar() below
        
        // Update tool options bar
        this.updateToolOptionsBar();
        
        // Re-render guides to show/hide handles based on active tool
        this.renderGuides();
    }

    updateActiveToolIndicator(tool) {
        const toolIcon = document.getElementById('active-tool-icon');
        const toolName = document.getElementById('active-tool-name');
        
        if (!toolIcon || !toolName) return;
        
        const toolData = {
            'brush': { icon: 'ph-paint-brush', name: 'Brush' },
            'pencil': { icon: 'ph-pencil', name: 'Pencil' },
            'bucket': { icon: 'ph-paint-bucket', name: 'Bucket Fill' },
            'eraser': { icon: 'ph-eraser', name: 'Eraser' },
            'select-rect': { icon: 'ph-selection', name: 'Rectangle Select' },
            'select-circle': { icon: 'ph-circle-dashed', name: 'Circle Select' },
            'move': { icon: 'ph-arrows-out-cardinal', name: 'Move' },
            'line': { icon: 'ph-line-segment', name: 'Line' },
            'text': { icon: 'ph-text-aa', name: 'Text' },
            'shapes': { icon: 'ph-shapes', name: 'Shapes' },
            'spray': { icon: 'ph-spray-bottle', name: 'Spray' },
            'blur': { icon: 'ph-drop-simple', name: 'Blur' },
            'guide': { icon: 'ph-bounding-box', name: 'Guide' },
            'hand': { icon: 'ph-hand', name: 'Hand' }
        };
        
        const currentTool = toolData[tool] || { icon: 'ph-cursor', name: 'Unknown' };
        
        toolIcon.className = `ph ${currentTool.icon}`;
        toolName.textContent = currentTool.name;
    }

    async handleCanvasClick(e) {
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        // Only process if coordinates are within canvas bounds
        // Note: Document-level mouse handler clamps coordinates, so this check should pass for synthetic events
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
                this.lastBrushPos = { x: coords.x, y: coords.y };
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Continue stroke with same draw value
                if (this.smoothDrawing) {
                    this.updateSmoothStroke(coords.x, coords.y, this.currentDrawValue, 1);
                } else {
                    // Always connect strokes to prevent gaps and ensure continuity
                    if (this.lastBrushPos) {
                        const distance = Math.sqrt(
                            Math.pow(coords.x - this.lastBrushPos.x, 2) + 
                            Math.pow(coords.y - this.lastBrushPos.y, 2)
                        );
                        
                        // Connect if there's any significant distance (>1 pixel) to ensure no gaps
                        if (distance > 1) {
                            this.connectBrushStrokes(this.lastBrushPos.x, this.lastBrushPos.y, coords.x, coords.y);
                        }
                    }
                    this.drawWithBrush(coords.x, coords.y, this.currentDrawValue, 1);
                }
                this.lastBrushPos = { x: coords.x, y: coords.y };
            } else if (e.type === 'mouseup' && this.isDrawing) {
                // Finish stroke
                if (this.smoothDrawing) {
                    this.finishSmoothStroke(this.currentDrawValue, 1);
                }
                this.lastBrushPos = null; // Clear brush position
                this.editor.saveState();
            }
        } else if (this.currentTool === 'pencil') {
            if (e.type === 'mousedown') {
                // Left click = primary color (black), Right click = secondary color (white)
                this.currentDrawValue = e.button === 0 ? 0 : 1; // 0=black, 1=white
                
                // Pencil always draws single pixels
                this.editor.setPixelWithAlpha(coords.x, coords.y, this.currentDrawValue, 1, this.currentPattern);
                this.lastDrawPos = { x: coords.x, y: coords.y };
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Draw connected line from last position to current position for pixel-perfect connection
                if (this.lastDrawPos) {
                    this.editor.drawLine(this.lastDrawPos.x, this.lastDrawPos.y, coords.x, coords.y, this.currentPattern, this.currentDrawValue, 1);
                } else {
                    this.editor.setPixelWithAlpha(coords.x, coords.y, this.currentDrawValue, 1, this.currentPattern);
                }
                this.lastDrawPos = { x: coords.x, y: coords.y };
            } else if (e.type === 'mouseup' && this.isDrawing) {
                // Finish stroke
                this.editor.saveState();
                this.lastDrawPos = null;
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
            this.editor.floodFill(coords.x, coords.y, drawValue, this.currentPattern, drawValue);
            this.editor.saveState();
            this.updateOutput();
        } else if (this.currentTool === 'spray') {
            if (e.type === 'mousedown') {
                // Left click = primary color (black), Right click = secondary color (white)
                this.currentDrawValue = e.button === 0 ? 0 : 1;
                this.sprayLastTime = Date.now();
                this.editor.spray(coords.x, coords.y, this.sprayRadius, this.sprayDensity, this.currentPattern, this.currentDrawValue);
                // Only update UI on mousedown, not on every move
                this.editor.redraw();
                this.updateOutput();
            } else if (e.type === 'mousemove' && this.isDrawing) {
                // Throttle spray calls to every 16ms (60fps) for performance
                const now = Date.now();
                if (!this.sprayLastTime || now - this.sprayLastTime >= 16) {
                    this.sprayLastTime = now;
                    this.editor.spray(coords.x, coords.y, this.sprayRadius, this.sprayDensity, this.currentPattern, this.currentDrawValue);
                }
                // Skip redraw and updateOutput on mousemove for performance
            } else if (e.type === 'mouseup' && this.isDrawing) {
                // Final update and save state on mouseup
                this.editor.redraw();
                this.updateOutput();
                this.editor.saveState();
            }
        } else if (this.currentTool === 'blur') {
            // Apply blur effect at click position
            if (e.type === 'mousedown' || (e.type === 'mousemove' && this.isDrawing)) {
                this.applyBlurEffect(coords.x, coords.y);
            }
        } else if (this.currentTool === 'text') {
            // Store click position and show text configuration dialog
            this.textClickPos = { x: coords.x, y: coords.y };
            this.showTextCreationDialog();
            e.stopPropagation(); // Prevent this click from triggering clickOutsideHandler
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
        
        // Update onion skinning overlay for new pan position (debounced)
        this.debouncedUpdateOnionSkinning();
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
        
        // Update onion skinning overlay for new offset
        this.updateOnionSkinning();
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
        // Get preview area dimensions
        const previewArea = document.querySelector('.preview-area');
        if (!previewArea) return;
        
        const previewAreaRect = previewArea.getBoundingClientRect();
        const padding = 8; // 4px padding * 2 sides
        const availableWidth = previewAreaRect.width - padding;
        const availableHeight = previewAreaRect.height - padding;
        
        // Ensure minimum size
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Calculate exact aspect ratio
        const bitmapAspectRatio = this.editor.height / this.editor.width;
        
        // Calculate both possible dimensions
        const fitByWidthHeight = availableWidth * bitmapAspectRatio;
        const fitByHeightWidth = availableHeight / bitmapAspectRatio;
        
        // Choose the dimension that fits within available space
        let previewWidth, previewHeight;
        
        if (fitByWidthHeight <= availableHeight) {
            // Fit by width - height scales proportionally
            previewWidth = availableWidth;
            previewHeight = fitByWidthHeight;
        } else {
            // Fit by height - width scales proportionally  
            previewWidth = fitByHeightWidth;
            previewHeight = availableHeight;
        }
        
        // Use precise rounding to maintain aspect ratio
        // Round to nearest integer while preserving ratio accuracy
        const scale = Math.min(previewWidth / this.editor.width, previewHeight / this.editor.height);
        this.previewCanvas.width = Math.round(this.editor.width * scale);
        this.previewCanvas.height = Math.round(this.editor.height * scale);
        
        this.updatePreview();
        this.setupViewportNavigation();
    }

    updatePreview() {
        const previewCtx = this.previewCanvas.getContext('2d');
        previewCtx.imageSmoothingEnabled = false;
        
        // Clear canvas to transparent
        previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        // Create a temporary canvas at bitmap resolution
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.editor.width;
        tempCanvas.height = this.editor.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        
        // Copy pixels from main canvas with proper alpha handling
        const imageData = tempCtx.createImageData(this.editor.width, this.editor.height);
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
        
        // Put bitmap data to temporary canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Scale and draw the temporary canvas to preview canvas
        previewCtx.drawImage(tempCanvas, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
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
            const previewRect = previewArea.getBoundingClientRect();
            const previewScale = Math.min(
                previewRect.width / this.editor.width,
                previewRect.height / this.editor.height
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
        
        // Calculate canvas position relative to canvas area (accounting for CSS centering)
        const canvasOffsetX = canvasRect.left - canvasAreaRect.left;
        const canvasOffsetY = canvasRect.top - canvasAreaRect.top;
        
        // Calculate scroll position relative to canvas origin
        const scrollX = canvasArea.scrollLeft - canvasOffsetX;
        const scrollY = canvasArea.scrollTop - canvasOffsetY;
        
        // Calculate the visible area in canvas pixels (at current zoom)
        const visibleCanvasWidth = Math.min(canvasAreaRect.width, canvasRect.width);
        const visibleCanvasHeight = Math.min(canvasAreaRect.height, canvasRect.height);
        
        // Convert to actual bitmap coordinates
        const zoom = this.editor.zoom;
        const visibleBitmapWidth = visibleCanvasWidth / zoom;
        const visibleBitmapHeight = visibleCanvasHeight / zoom;
        const scrollBitmapX = Math.max(0, scrollX / zoom);
        const scrollBitmapY = Math.max(0, scrollY / zoom);
        
        // Calculate preview scale based on actual preview area display size
        const previewAreaRect = previewArea.getBoundingClientRect();
        const previewScale = Math.min(
            previewAreaRect.width / this.editor.width,
            previewAreaRect.height / this.editor.height
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
        // Skip preview if coordinates haven't changed significantly
        if (this.lastPreviewCoords && 
            Math.abs(x2 - this.lastPreviewCoords.x2) < 2 && 
            Math.abs(y2 - this.lastPreviewCoords.y2) < 2) {
            return;
        }
        this.lastPreviewCoords = { x1, y1, x2, y2 };
        
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        const canvasSize = Math.max(this.editor.width, this.editor.height);
        
        // Always use pixel-perfect preview with red overlay feedback
        this.drawPixelPerfectLinePreview(x1, y1, x2, y2, canvasSize);
    }
    
    shouldUsePixelPerfectPreview(canvasSize) {
        // Check user preference first (can be toggled via UI)
        if (this.forcePixelPerfectPreview !== undefined) {
            return this.forcePixelPerfectPreview;
        }
        
        // Default to pixel-perfect whenever possible for better UX
        
        // Always use pixel-perfect for small to medium canvases
        if (canvasSize <= 512) return true;
        
        // Use pixel-perfect for larger canvases when zoom makes pixels visible
        if (this.editor.zoom >= 4) return true;
        
        // Use pixel-perfect for very large canvases only when highly zoomed
        if (canvasSize <= 1024 && this.editor.zoom >= 2) return true;
        
        // For massive canvases, only use pixel-perfect when pixels are very large
        if (this.editor.zoom >= 8) return true;
        
        return false;
    }
    
    drawPixelPerfectLinePreview(x1, y1, x2, y2, canvasSize) {
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        
        // For large canvases, use optimized partial redraw instead of full redraw
        if (canvasSize > 256) {
            // Calculate minimal bounding box for the line
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const maxX = Math.max(x1, x2);
            const maxY = Math.max(y1, y2);
            
            // Add padding for line thickness
            const padding = Math.max(2, Math.ceil(zoom / 4));
            
            // Only redraw the line area with padding
            this.editor.renderPartial({
                x: minX - padding,
                y: minY - padding,
                width: maxX - minX + padding * 2 + 1,
                height: maxY - minY + padding * 2 + 1
            });
        } else {
            // Full redraw for small canvases
            this.editor.redraw();
        }
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Draw pixel-perfect line preview with red overlay showing exact pixels
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

    /**
     * Draw actual pixel preview showing how pixels will look when placed
     */
    drawActualPixelPreview(x1, y1, x2OrRadiusX, y2OrRadiusY, shapeType) {
        // Create a temporary layer to preview the shape
        const tempPixels = this.createEmptyBitmap();
        const tempAlpha = this.createEmptyAlpha();
        
        // Determine draw value (black=0, white=1) based on primary/secondary color
        // For preview, we'll assume left mouse button (primary color = black = 0)
        const drawValue = 0; // black pixels for preview
        const alphaValue = 1; // fully opaque
        
        // Draw the shape to temporary arrays
        if (shapeType === 'rect') {
            this.drawRectToTempLayer(tempPixels, tempAlpha, x1, y1, x2OrRadiusX, y2OrRadiusY, drawValue, alphaValue);
        } else if (shapeType === 'circle') {
            this.drawCircleToTempLayer(tempPixels, tempAlpha, x1, y1, x2OrRadiusX, y2OrRadiusY, drawValue, alphaValue);
        } else if (shapeType === 'line') {
            this.drawLineToTempLayer(tempPixels, tempAlpha, x1, y1, x2OrRadiusX, y2OrRadiusY, drawValue, alphaValue);
        }
        
        // Render the preview pixels on top of existing canvas
        this.renderTempLayerPreview(tempPixels, tempAlpha);
    }

    createEmptyBitmap() {
        return new Uint8Array(this.editor.width * this.editor.height);
    }

    createEmptyAlpha() {
        return new Uint8Array(this.editor.width * this.editor.height);
    }

    drawRectToTempLayer(pixels, alpha, x1, y1, x2, y2, drawValue, alphaValue) {
        const rectPixels = this.getRectPixels(x1, y1, x2, y2);
        for (const pixel of rectPixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                const index = this.editor.getPixelIndex(pixel.x, pixel.y);
                pixels[index] = drawValue;
                alpha[index] = alphaValue;
            }
        }
    }

    drawCircleToTempLayer(pixels, alpha, centerX, centerY, radiusX, radiusY, drawValue, alphaValue) {
        const ellipsePixels = this.getEllipsePixels(centerX, centerY, radiusX, radiusY);
        for (const pixel of ellipsePixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                const index = this.editor.getPixelIndex(pixel.x, pixel.y);
                pixels[index] = drawValue;
                alpha[index] = alphaValue;
            }
        }
    }

    drawLineToTempLayer(pixels, alpha, x1, y1, x2, y2, drawValue, alphaValue) {
        const linePixels = this.getLinePixels(x1, y1, x2, y2);
        for (const pixel of linePixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                const index = this.editor.getPixelIndex(pixel.x, pixel.y);
                pixels[index] = drawValue;
                alpha[index] = alphaValue;
            }
        }
    }

    renderTempLayerPreview(previewPixels, previewAlpha) {
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        
        // Render preview pixels with slight transparency to show it's a preview
        ctx.save();
        ctx.globalAlpha = 0.7; // Make preview slightly transparent
        
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                const index = this.editor.getPixelIndex(x, y);
                if (previewAlpha[index] > 0) {
                    // Draw pixel in preview color
                    const pixelValue = previewPixels[index];
                    if (this.editor.inverted) {
                        ctx.fillStyle = pixelValue === 0 ? this.editor.backgroundColor : this.editor.drawColor;
                    } else {
                        ctx.fillStyle = pixelValue === 0 ? this.editor.drawColor : this.editor.backgroundColor;
                    }
                    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                }
            }
        }
        
        ctx.restore();
    }

    /**
     * Connect brush strokes to fill gaps during fast mouse movement
     */
    connectBrushStrokes(x1, y1, x2, y2) {
        // Calculate the number of intermediate points needed for smooth connection
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        // Use smaller step size to ensure no gaps, especially for larger brushes
        const stepSize = Math.max(0.5, this.brushSize * 0.3); 
        const steps = Math.ceil(distance / stepSize);
        
        // Draw intermediate brush strokes to fill the gap
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = Math.round(x1 + (x2 - x1) * t);
            const y = Math.round(y1 + (y2 - y1) * t);
            this.drawWithBrush(x, y, this.currentDrawValue, 1);
        }
    }

    // Simple dialog manager for About dialog
    get dialogManager() {
        return {
            showDialog: (dialogId) => {
                const dialog = document.getElementById(dialogId);
                if (dialog) {
                    dialog.style.display = 'flex';
                }
            }
        };
    }

    setupAboutDialog() {
        const dialog = document.getElementById('about-dialog');
        const closeBtn = document.getElementById('about-close-btn');

        if (!dialog || !closeBtn) {
            return; // Elements not found
        }

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeDialog);

        // Close on backdrop click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });
    }

    drawFastLinePreview(x1, y1, x2, y2) {
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        
        // Minimal redraw area
        const minX = Math.min(x1, x2) * zoom;
        const minY = Math.min(y1, y2) * zoom;
        const maxX = Math.max(x1, x2) * zoom + zoom;
        const maxY = Math.max(y1, y2) * zoom + zoom;
        
        this.editor.renderPartial({
            x: Math.floor(minX / zoom),
            y: Math.floor(minY / zoom),
            width: Math.ceil((maxX - minX) / zoom) + 2,
            height: Math.ceil((maxY - minY) / zoom) + 2
        });
        
        // Simple dashed line
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x1 * zoom + zoom/2, y1 * zoom + zoom/2);
        ctx.lineTo(x2 * zoom + zoom/2, y2 * zoom + zoom/2);
        ctx.stroke();
        ctx.restore();
    }
    
    drawPixelsWithImageData(pixels, zoom) {
        // This method uses ImageData for faster bulk pixel drawing
        // when zoom is low and there are many pixels
        const ctx = this.editor.ctx;
        
        // Group pixels by scanline for efficient ImageData usage
        const scanlines = new Map();
        
        for (const pixel of pixels) {
            if (pixel.x >= 0 && pixel.x < this.editor.width && 
                pixel.y >= 0 && pixel.y < this.editor.height) {
                
                const y = pixel.y * zoom;
                if (!scanlines.has(y)) {
                    scanlines.set(y, []);
                }
                scanlines.get(y).push(pixel.x * zoom);
            }
        }
        
        // Draw each scanline
        for (const [y, xPositions] of scanlines) {
            for (const x of xPositions) {
                ctx.fillRect(x, y, zoom, zoom);
            }
        }
    }

    clearLinePreview() {
        this.editor.redraw();
        if (this.selection) {
            this.drawSelectionOverlay();
        }
    }

    drawRectPreview(x1, y1, x2, y2) {
        // Skip preview if coordinates haven't changed significantly
        if (this.lastRectCoords && 
            Math.abs(x2 - this.lastRectCoords.x2) < 2 && 
            Math.abs(y2 - this.lastRectCoords.y2) < 2) {
            return;
        }
        this.lastRectCoords = { x1, y1, x2, y2 };
        
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        const canvasSize = Math.max(this.editor.width, this.editor.height);
        
        // Always show pixel-perfect red feedback
        // For large canvases, use optimized partial redraw instead of full redraw
        if (canvasSize > 256) {
            // Calculate minimal bounding box for the rectangle
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            const maxX = Math.max(x1, x2);
            const maxY = Math.max(y1, y2);
            
            // Add padding for better visual feedback
            const padding = Math.max(2, Math.ceil(zoom / 4));
            
            // Only redraw the rectangle area with padding
            this.editor.renderPartial({
                x: minX - padding,
                y: minY - padding,
                width: maxX - minX + padding * 2 + 1,
                height: maxY - minY + padding * 2 + 1
            });
        } else {
            // Full redraw for small canvases
            this.editor.redraw();
        }
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Always draw pixel-perfect rectangle preview with red overlay
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
        // Skip preview if coordinates haven't changed significantly
        if (this.lastCircleCoords && 
            Math.abs(endX - this.lastCircleCoords.endX) < 2 && 
            Math.abs(endY - this.lastCircleCoords.endY) < 2) {
            return;
        }
        this.lastCircleCoords = { startX, startY, endX, endY };
        
        const ctx = this.editor.ctx;
        const zoom = this.editor.zoom;
        const canvasSize = Math.max(this.editor.width, this.editor.height);
        
        // Calculate ellipse parameters with modifier key support
        const { centerX, centerY, radiusX, radiusY } = this.calculateEllipseParams(
            startX, startY, endX, endY, this.shiftPressed, this.altPressed
        );
        
        // Always show pixel-perfect red feedback
        // For large canvases, use optimized partial redraw instead of full redraw
        if (canvasSize > 256) {
            // Calculate minimal bounding box for the ellipse
            const minX = Math.floor(centerX - radiusX) - 1;
            const minY = Math.floor(centerY - radiusY) - 1;
            const maxX = Math.ceil(centerX + radiusX) + 1;
            const maxY = Math.ceil(centerY + radiusY) + 1;
            
            // Add padding for better visual feedback
            const padding = Math.max(2, Math.ceil(zoom / 4));
            
            // Only redraw the ellipse area with padding
            this.editor.renderPartial({
                x: minX - padding,
                y: minY - padding,
                width: maxX - minX + padding * 2 + 1,
                height: maxY - minY + padding * 2 + 1
            });
        } else {
            // Full redraw for small canvases
            this.editor.redraw();
        }
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Always draw pixel-perfect ellipse preview with red overlay
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
        
        // Update current sheet thumbnail
        if (this.currentSheetId) {
            this.updateSheetThumbnail(this.currentSheetId);
        }
    }


    exportPNG() {
        // Use the new unified export system with enhanced options
        const options = {
            scale: 4, // 4x scale for better visibility
            fillColor: this.displayModes[this.currentDisplayMode].draw_color,
            backgroundColor: this.displayModes[this.currentDisplayMode].background_color
        };
        
        return this.exportToFormat('png', options);
    }

    exportGIF() {
        // Use the same options as PNG for consistency
        const options = {
            scale: 4, // 4x scale for better visibility
            fillColor: this.displayModes[this.currentDisplayMode].draw_color,
            backgroundColor: this.displayModes[this.currentDisplayMode].background_color
        };
        
        return this.exportToFormat('gif', options);
    }

    /**
     * Export animation as GIF (Phase 5)
     */
    async exportAnimationGIF() {
        // GIF export is currently disabled
        alert('GIF export is currently disabled.');
        return;
        
        // Check if we have multiple sheets for animation
        if (!this.sheets || this.sheets.length <= 1) {
            alert('Animation export requires multiple sheets. Please create additional sheets to use this feature.');
            return;
        }

        // Use current animation settings from sheet panel
        const frameRate = this.animationState ? this.animationState.speed : 12;
        const loop = this.animationState ? this.animationState.loop : true;
        
        try {
            await this.showAnimationExportDialog(frameRate, loop);
        } catch (error) {
            console.error('Animation export error:', error);
            alert('Failed to export animation. Please try again.');
        }
    }

    /**
     * Show animation export dialog with format options
     */
    async showAnimationExportDialog(frameRate, loop) {
        // Animation system is disabled
        alert('Animation export is currently disabled.');
        return;
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'dialog-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="dialog animation-export-dialog">
                <div class="dialog-header">
                    <h3>Export Animation</h3>
                    <button class="dialog-close" id="animation-export-close">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <div class="dialog-content">
                    <div class="export-formats">
                        <button class="format-btn active" data-format="gif">
                            <i class="ph ph-gif"></i>
                            <span>GIF</span>
                        </button>
                        <button class="format-btn" data-format="png-sequence">
                            <i class="ph ph-images"></i>
                            <span>PNG</span>
                        </button>
                        <button class="format-btn" data-format="webm">
                            <i class="ph ph-video-camera"></i>
                            <span>WebM</span>
                        </button>
                    </div>
                    
                    <div class="export-settings">
                        <div class="setting-row">
                            <label>FPS: <span id="fps-display">${frameRate}</span></label>
                            <input type="range" id="fps-slider" min="1" max="30" value="${frameRate}">
                        </div>
                        <div class="setting-row">
                            <label>Name:</label>
                            <input type="text" id="project-name" value="animation" placeholder="filename">
                        </div>
                    </div>
                    
                    <div id="gif-quality-section" class="quality-section">
                        <div class="quality-buttons">
                            <button class="quality-btn" data-quality="fast">Fast</button>
                            <button class="quality-btn active" data-quality="balanced">Balanced</button>
                            <button class="quality-btn" data-quality="best">Best</button>
                        </div>
                    </div>
                    
                    <div class="export-info">
                        <span>${this.sheets.length} frames</span>
                        <span>${this.editor.width}×${this.editor.height}</span>
                        <span id="duration-display">${(this.sheets.length / frameRate).toFixed(1)}s</span>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="dialog-btn dialog-btn-cancel" id="animation-export-cancel">Cancel</button>
                    <button class="dialog-btn dialog-btn-primary" id="animation-export-ok">Export</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const fpsSlider = modal.querySelector('#fps-slider');
        const fpsDisplay = modal.querySelector('#fps-display');
        const durationDisplay = modal.querySelector('#duration-display');
        const formatBtns = modal.querySelectorAll('.format-btn');
        const qualityBtns = modal.querySelectorAll('.quality-btn');
        const gifQualitySection = modal.querySelector('#gif-quality-section');
        
        let selectedFormat = 'gif';
        let selectedQuality = 'balanced';
        
        fpsSlider.addEventListener('input', () => {
            fpsDisplay.textContent = fpsSlider.value;
            durationDisplay.textContent = `${(this.sheets.length / fpsSlider.value).toFixed(1)}s`;
        });

        // Format selection
        formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                formatBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedFormat = btn.dataset.format;
                
                // Show/hide quality section for GIF
                if (selectedFormat === 'gif') {
                    gifQualitySection.style.display = 'block';
                } else {
                    gifQualitySection.style.display = 'none';
                }
            });
        });

        // Quality selection
        qualityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                qualityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedQuality = btn.dataset.quality;
            });
        });

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                document.body.removeChild(modal);
            };

            modal.querySelector('#animation-export-close').addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            modal.querySelector('#animation-export-cancel').addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            modal.querySelector('#animation-export-ok').addEventListener('click', async () => {
                console.log('🚀 Export button clicked!');
                
                const finalFrameRate = parseInt(fpsSlider.value);
                const projectName = modal.querySelector('#project-name').value || 'animation';
                
                console.log(`📋 Export settings: format=${selectedFormat}, fps=${finalFrameRate}, name=${projectName}, quality=${selectedQuality}`);

                cleanup();

                try {
                    console.log('🎬 Starting performAnimationExport...');
                    await this.performAnimationExport(selectedFormat, finalFrameRate, projectName, selectedQuality);
                    console.log('✅ Export completed successfully');
                    resolve(true);
                } catch (error) {
                    console.error('❌ Export failed with error:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Perform the actual animation export
     */
    async performAnimationExport(format, frameRate, projectName, quality = 'balanced') {
        console.log('🔧 performAnimationExport called with:', { format, frameRate, projectName, quality });
        
        // Show loading indicator
        this.showExportLoading(`Exporting ${format.toUpperCase()}...`);
        console.log('📢 Loading indicator shown');
        
        console.log('🔍 Checking AnimationExporter availability...');
        if (!window.AnimationExporter) {
            console.error('❌ AnimationExporter not found on window object');
            this.hideExportLoading();
            throw new Error('Animation Exporter not available');
        }
        console.log('✅ AnimationExporter found');

        const exporter = new AnimationExporter();
        
        // Override getSheetPixelData method to use our data
        exporter.getSheetPixelData = (sheet, width, height) => {
            return this.getSheetCompositePixels(sheet);
        };

        const settings = {
            width: this.editor.width,
            height: this.editor.height,
            frameRate: frameRate,
            projectName: projectName,
            quality: quality
        };

        let result;
        
        try {
            if (format === 'gif') {
                result = await exporter.exportGIF(this.sheets, settings);
            } else if (format === 'png-sequence') {
                result = await exporter.exportPngSequence(this.sheets, settings);
            } else if (format === 'webm') {
                result = await exporter.exportWebM(this.sheets, settings);
            } else {
                throw new Error(`Unsupported format: ${format}`);
            }

            console.log(`Animation exported:`, result);
            
            // Show detailed success message
            let successMessage = `Animation exported successfully!\nFormat: ${result.format}\nFrames: ${result.frameCount}\nFile size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`;
            
            if (result.method) {
                successMessage += `\nMethod: ${result.method}`;
            }
            
            if (result.quality) {
                successMessage += `\nQuality: ${result.quality}`;
            }
            
            this.hideExportLoading();
            alert(successMessage);
            
        } catch (error) {
            this.hideExportLoading();
            console.error('Export failed:', error);
            
            // More detailed error message
            const errorMessage = error.message || 'Unknown export error';
            alert(`Export failed: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Show export loading indicator
     */
    showExportLoading(message) {
        // Remove any existing loading indicator
        this.hideExportLoading();
        
        // Create loading toast
        const loadingToast = document.createElement('div');
        loadingToast.id = 'export-loading-toast';
        loadingToast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 2px solid var(--border-primary);
            border-radius: 10px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 12px var(--shadow-color);
            z-index: 10000;
            font-size: 14px;
            color: var(--text-primary);
            min-width: 200px;
        `;
        
        // Add spinner
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 20px;
            height: 20px;
            border: 3px solid var(--border-primary);
            border-top: 3px solid var(--accent-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        // Add spinner animation if not already defined
        if (!document.querySelector('#spinner-animation-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        loadingToast.appendChild(spinner);
        loadingToast.appendChild(messageSpan);
        document.body.appendChild(loadingToast);
        
        // Store reference for updates
        this.exportLoadingToast = loadingToast;
        this.exportLoadingMessage = messageSpan;
    }
    
    /**
     * Update export loading message
     */
    updateExportLoading(message) {
        if (this.exportLoadingMessage) {
            this.exportLoadingMessage.textContent = message;
        }
    }
    
    /**
     * Hide export loading indicator
     */
    hideExportLoading() {
        const existingToast = document.getElementById('export-loading-toast');
        if (existingToast) {
            existingToast.remove();
        }
        this.exportLoadingToast = null;
        this.exportLoadingMessage = null;
    }

    /**
     * Get composite pixel data for a sheet
     */
    getSheetCompositePixels(sheet) {
        // Temporarily switch to the sheet
        const currentSheet = this.currentSheet;
        this.switchToSheet(sheet.id);
        
        // Get composite data
        const composite = this.editor.compositeAllLayers();
        const pixels = new Uint8Array(composite.pixels.length);
        
        // Copy pixel data
        for (let i = 0; i < composite.pixels.length; i++) {
            pixels[i] = composite.pixels[i];
        }
        
        // Switch back to original sheet
        this.switchToSheet(currentSheet);
        
        return pixels;
    }

    /**
     * Export animation as APNG (Phase 5)
     */
    exportAnimationAPNG() {
        // Animation export temporarily disabled
        alert('APNG export is temporarily unavailable. Please use GIF export instead.');
        return;
        
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

    // Helper method for animation system to select sheets by number
    selectSheet(sheetNumber) {
        if (sheetNumber >= 1 && sheetNumber <= this.sheets.length) {
            const sheet = this.sheets[sheetNumber - 1]; // Convert to 0-based index
            this.switchToSheet(sheet.id);
            this.animationState.currentFrame = sheetNumber;
        }
    }

    // ===== ANIMATION CONTROL METHODS =====

    playAnimation() {
        
        if (this.sheets.length <= 1) {
            this.showNotification('Need at least 2 sheets to play animation', 'warning');
            return;
        }

        this.animationState.isPlaying = true;
        this.animationState.isPaused = false;
        this.animationState.totalFrames = this.sheets.length;

        // Start animation timer
        const frameInterval = 1000 / this.animationState.speed; // Convert FPS to milliseconds
        this.animationState.animationTimer = setInterval(() => {
            // Check if we've reached the end BEFORE moving to next frame
            if (this.animationState.currentFrame >= this.animationState.totalFrames) {
                if (this.animationState.loop) {
                    this.animationState.currentFrame = 1;
                    this.selectSheet(1);
                } else {
                    this.stopAnimation();
                    return;
                }
            } else {
                // Move to next frame only if we haven't reached the end
                this.goToNextFrame();
            }
        }, frameInterval);

        this.updateAnimationUI();
        this.showNotification(`Playing animation at ${this.animationState.speed} FPS`, 'info');
    }

    pauseAnimation() {
        if (this.animationState.animationTimer) {
            clearInterval(this.animationState.animationTimer);
            this.animationState.animationTimer = null;
        }
        this.animationState.isPlaying = false;
        this.animationState.isPaused = true;
        this.updateAnimationUI();
        this.showNotification('Animation paused', 'info');
    }

    stopAnimation() {
        if (this.animationState.animationTimer) {
            clearInterval(this.animationState.animationTimer);
            this.animationState.animationTimer = null;
        }
        this.animationState.isPlaying = false;
        this.animationState.isPaused = false;
        this.animationState.currentFrame = 1;
        this.selectSheet(1);
        this.updateAnimationUI();
        this.showNotification('Animation stopped', 'info');
    }

    goToFirstFrame() {
        this.animationState.currentFrame = 1;
        this.selectSheet(1);
        this.updateAnimationUI();
    }

    goToPreviousFrame() {
        if (this.animationState.currentFrame > 1) {
            this.animationState.currentFrame--;
            this.selectSheet(this.animationState.currentFrame);
        } else if (this.animationState.loop && this.sheets.length > 1) {
            this.animationState.currentFrame = this.sheets.length;
            this.selectSheet(this.animationState.currentFrame);
        }
        this.updateAnimationUI();
    }

    goToNextFrame() {
        // Simply increment frame - don't handle looping here (that's handled in playAnimation)
        this.animationState.currentFrame++;
        
        // Only switch sheet if we're within bounds
        if (this.animationState.currentFrame <= this.sheets.length) {
            this.selectSheet(this.animationState.currentFrame);
        }
        
        this.updateAnimationUI();
    }

    goToLastFrame() {
        this.animationState.currentFrame = this.sheets.length;
        this.selectSheet(this.sheets.length);
        this.updateAnimationUI();
    }

    goToFrame(frameNumber) {
        if (frameNumber >= 1 && frameNumber <= this.sheets.length) {
            this.animationState.currentFrame = frameNumber;
            this.selectSheet(frameNumber);
            this.updateAnimationUI();
        }
    }

    updateAnimationUI() {
        // Safety check for sheets
        if (!this.sheets || !Array.isArray(this.sheets)) return;
        
        // Update frame counter
        const frameCounter = document.getElementById('frame-counter');
        if (frameCounter) {
            frameCounter.textContent = `${this.animationState.currentFrame} / ${this.sheets.length}`;
        }

        // Update speed input display
        const speedInput = document.getElementById('animation-speed');
        if (speedInput) {
            speedInput.value = this.animationState.speed;
        }

        // Update button states
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (playBtn) {
            playBtn.disabled = this.animationState.isPlaying;
        }
        if (pauseBtn) {
            pauseBtn.disabled = !this.animationState.isPlaying;
        }
        if (stopBtn) {
            stopBtn.disabled = !this.animationState.isPlaying && !this.animationState.isPaused;
        }

        // Timeline removed - no longer needed
        // this.updateTimeline();
    }

    updateTimeline() {
        const timelineTrack = document.getElementById('timeline-track');
        if (!timelineTrack) return;
        
        // Safety check for sheets
        if (!this.sheets || !Array.isArray(this.sheets)) return;

        // Clear existing timeline frames
        timelineTrack.innerHTML = '';

        // Create timeline frames for each sheet
        this.sheets.forEach((sheet, index) => {
            const frameElement = document.createElement('div');
            frameElement.className = 'timeline-frame';
            frameElement.textContent = index + 1;
            
            // Mark current frame
            if (index + 1 === this.animationState.currentFrame) {
                frameElement.classList.add('current');
            }

            // Add click listener to jump to frame
            frameElement.addEventListener('click', () => {
                this.goToFrame(index + 1);
            });

            timelineTrack.appendChild(frameElement);
        });
    }

    // ===== ONION SKINNING METHODS =====

    debouncedUpdateOnionSkinning() {
        // Clear previous timeout
        if (this.onionSkinningUpdateTimeout) {
            clearTimeout(this.onionSkinningUpdateTimeout);
        }
        
        // Set new timeout for delayed update (improves performance during rapid pan/zoom)
        this.onionSkinningUpdateTimeout = setTimeout(() => {
            this.updateOnionSkinning();
        }, 50); // 50ms delay
    }

    updateOnionSkinning() {
        if (!this.animationState.onionSkinning) {
            // Clear onion skin layers
            this.clearOnionSkinning();
            return;
        }

        // Show onion skinning for previous and next frames
        this.renderOnionSkinning();
    }

    clearOnionSkinning() {
        // Remove any existing onion skin overlay
        const existingOverlay = document.getElementById('onion-skin-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    renderOnionSkinning() {
        this.clearOnionSkinning();

        if (this.sheets.length <= 1) return;

        // Create overlay canvas
        const canvas = document.getElementById('bitmap-canvas');
        if (!canvas) {
            console.error('Bitmap canvas not found');
            return;
        }
        
        // Get canvas computed style and transform to match exact positioning
        const canvasStyle = window.getComputedStyle(canvas);
        
        // Ensure canvas parent has relative positioning
        const parent = canvas.parentNode;
        if (window.getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        
        const overlay = document.createElement('canvas');
        overlay.id = 'onion-skin-overlay';
        
        // Match canvas dimensions exactly
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        
        // Position and styling
        overlay.style.position = 'absolute';
        overlay.style.top = canvas.offsetTop + 'px';
        overlay.style.left = canvas.offsetLeft + 'px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10';
        overlay.style.imageRendering = 'pixelated';
        overlay.style.border = canvasStyle.border; // Match border if any
        
        // Match CSS dimensions for zoom effect
        overlay.style.width = canvasStyle.width;
        overlay.style.height = canvasStyle.height;
        
        // Copy canvas transform (pan) to overlay
        overlay.style.transform = canvasStyle.transform;
        overlay.style.transformOrigin = canvasStyle.transformOrigin;
        
        console.log('Creating onion skin overlay:', overlay.width, 'x', overlay.height, 'at', overlay.style.left, overlay.style.top);
        console.log('Canvas transform:', canvasStyle.transform);
        console.log('Canvas style width/height:', canvasStyle.width, canvasStyle.height);
        console.log('Canvas actual width/height:', canvas.width, canvas.height);
        console.log('Canvas clientWidth/Height:', canvas.clientWidth, canvas.clientHeight);
        console.log('Editor zoom level:', this.editor.zoom);
        parent.appendChild(overlay);
        
        const ctx = overlay.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Render previous frame only (light gray, 40% opacity)
        const prevFrameIndex = this.animationState.currentFrame - 2; // 0-based
        if (prevFrameIndex >= 0 && prevFrameIndex < this.sheets.length) {
            console.log(`Onion skin: Current frame ${this.animationState.currentFrame}, showing frame ${prevFrameIndex + 1}`);
            const prevSheet = this.sheets[prevFrameIndex];
            console.log('Previous sheet data:', prevSheet);
            this.renderOnionFrame(ctx, prevSheet, '#808080', 0.4);
        } else {
            console.log(`No previous frame to show (current: ${this.animationState.currentFrame}, sheets: ${this.sheets.length})`);
        }
    }

    renderOnionFrame(ctx, sheet, color, opacity) {
        if (!sheet || !sheet.layers) {
            console.log('No sheet or layers to render');
            return;
        }

        console.log('=== ONION SKIN DEBUG ===');
        console.log('Sheet ID:', sheet.id, 'Size:', sheet.width, 'x', sheet.height);
        console.log('Layers count:', sheet.layers.length);
        
        // Debug: Check each layer
        sheet.layers.forEach((layer, index) => {
            if (layer && layer.pixels) {
                const blackPixels = layer.pixels.reduce((count, pixel) => count + (pixel === 1 ? 1 : 0), 0);
                const alphaPixels = layer.alpha ? layer.alpha.reduce((count, alpha) => count + (alpha > 0 ? 1 : 0), 0) : 0;
                const drawnPixels = layer.pixels.reduce((count, pixel, idx) => {
                    return count + ((pixel === 1 && layer.alpha && layer.alpha[idx] > 0) ? 1 : 0);
                }, 0);
                console.log(`Layer ${index}: visible=${layer.visible}, black=${blackPixels}, alpha=${alphaPixels}, drawn=${drawnPixels}/${layer.pixels.length}`);
            } else {
                console.log(`Layer ${index}: INVALID - no pixels array`);
            }
        });

        // Clear the overlay first
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Get current zoom level for proper scaling
        const currentZoom = this.editor ? this.editor.zoom : 1;
        
        // Create image data for pixel-level control at current zoom level
        const scaledWidth = sheet.width * currentZoom;
        const scaledHeight = sheet.height * currentZoom;
        const imageData = ctx.createImageData(scaledWidth, scaledHeight);
        const data = imageData.data;
        
        // Parse the color to RGB values
        const grayValue = parseInt(color.substring(1, 3), 16); // Extract gray value from #808080
        
        let pixelsRendered = 0;
        let totalPixelsChecked = 0;
        
        console.log(`Onion skin: Rendering at zoom ${currentZoom}x (${sheet.width}x${sheet.height} -> ${scaledWidth}x${scaledHeight})`);
        
        // For BitsDraw, drawing happens on layer 0, so we need to show it
        // but distinguish between background and actual drawing
        const layersToRender = [];
        
        sheet.layers.forEach((layer, layerIndex) => {
            if (!layer || !layer.visible || !layer.pixels) return;
            
            const totalPixels = layer.pixels.length;
            const blackPixels = layer.pixels.reduce((count, pixel) => count + (pixel === 1 ? 1 : 0), 0);
            // Count ACTUAL drawn pixels (any alpha > 0, regardless of color)
            const actualDrawnPixels = layer.alpha ? layer.alpha.reduce((count, alpha) => count + (alpha > 0 ? 1 : 0), 0) : 0;
            
            // Also separately count black vs white drawn pixels
            const blackDrawnPixels = layer.pixels.reduce((count, pixel, idx) => {
                return count + ((pixel === 1 && layer.alpha && layer.alpha[idx] > 0) ? 1 : 0);
            }, 0);
            const whiteDrawnPixels = layer.pixels.reduce((count, pixel, idx) => {
                return count + ((pixel === 0 && layer.alpha && layer.alpha[idx] > 0) ? 1 : 0);
            }, 0);
            
            console.log(`Sheet ${sheet.id} Layer ${layerIndex}: ${actualDrawnPixels} drawn pixels (${blackDrawnPixels} black + ${whiteDrawnPixels} white), total black: ${blackPixels}`);
            
            // Simplified approach: Check if layer matches the expected project background pattern
            if (layerIndex === 0) {
                // For background layer (layer 0), check if it exactly matches project background
                let isProjectBackgroundLayer = false;
                
                if (this.projectBackgroundType === 'transparent') {
                    // Transparent: all pixels=0, all alpha=0
                    isProjectBackgroundLayer = (blackPixels === 0 && layer.alpha.every(a => a === 0));
                } else if (this.projectBackgroundType === 'white') {
                    // White: all pixels=0, all alpha=1
                    isProjectBackgroundLayer = (blackPixels === 0 && layer.alpha.every(a => a === 1));
                } else if (this.projectBackgroundType === 'black') {
                    // Black: all pixels=1, all alpha=1
                    isProjectBackgroundLayer = (blackPixels === totalPixels && layer.alpha.every(a => a === 1));
                }
                
                if (isProjectBackgroundLayer) {
                    console.log(`Skipping layer ${layerIndex} - matches project background type (${this.projectBackgroundType})`);
                } else {
                    layersToRender.push(layer);
                    console.log(`Including layer ${layerIndex} for onion skin - contains modifications from background`);
                }
            } else if (actualDrawnPixels > 0) {
                layersToRender.push(layer);
                console.log(`Including layer ${layerIndex} for onion skin - has ${actualDrawnPixels} drawn pixels`);
            } else {
                console.log(`Skipping layer ${layerIndex} - no drawn pixels`);
            }
        });
        
        console.log(`Will render ${layersToRender.length} layers for onion skin`);
        
        // Check if this is showing a different sheet than current
        const currentSheet = this.sheets.find(s => s.id === this.currentSheetId);
        const isDifferentSheet = sheet.id !== this.currentSheetId;
        console.log(`Onion skin: Different sheet? ${isDifferentSheet}, Current: ${this.currentSheetId}, Showing: ${sheet.id}`);

        // Composite selected layers to create the onion skin with zoom support
        for (let y = 0; y < sheet.height; y++) {
            for (let x = 0; x < sheet.width; x++) {
                const index = y * sheet.width + x;
                totalPixelsChecked++;
                
                let pixelSet = false;
                
                // Check selected layers for this pixel
                layersToRender.forEach((layer) => {
                    // Check if pixel is drawn in this layer (any alpha > 0, regardless of color)
                    if (layer.alpha && layer.alpha[index] > 0) {
                        pixelSet = true;
                    }
                });
                
                if (pixelSet) {
                    // Draw zoomed pixel (currentZoom x currentZoom square)
                    for (let zy = 0; zy < currentZoom; zy++) {
                        for (let zx = 0; zx < currentZoom; zx++) {
                            const scaledX = x * currentZoom + zx;
                            const scaledY = y * currentZoom + zy;
                            
                            // Bounds check for scaled coordinates
                            if (scaledX < scaledWidth && scaledY < scaledHeight) {
                                const scaledIndex = (scaledY * scaledWidth + scaledX) * 4;
                                
                                data[scaledIndex] = grayValue;     // Red
                                data[scaledIndex + 1] = grayValue; // Green
                                data[scaledIndex + 2] = grayValue; // Blue
                                data[scaledIndex + 3] = Math.floor(255 * opacity); // Alpha
                            }
                        }
                    }
                    pixelsRendered++;
                }
            }
        }
        
        // Put the image data on the canvas
        ctx.putImageData(imageData, 0, 0);
        
        console.log(`Onion skin result: ${pixelsRendered}/${totalPixelsChecked} pixels rendered`);
        console.log('=== END ONION SKIN DEBUG ===');
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

    // showNotification method moved to enhanced version at line 9113

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
        const primaryDisplay = document.querySelector('#primary-color .color-display');
        if (primaryDisplay) {
            primaryDisplay.style.backgroundColor = this.primaryColor;
        }
        
        // Update secondary color display
        const secondaryDisplay = document.querySelector('#secondary-color .color-display');
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

    // Hand tool canvas panning methods
    startCanvasPan(e) {
        if (this.currentTool !== 'hand') return;
        
        this.isPanningCanvas = true;
        this.panStart = {
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

    updateCanvasPan(e) {
        if (!this.isPanningCanvas || !this.panStart) return;
        
        const deltaX = e.clientX - this.panStart.x;
        const deltaY = e.clientY - this.panStart.y;
        
        // Initialize canvas offset if it doesn't exist
        if (!this.canvasOffset) {
            this.canvasOffset = { x: 0, y: 0 };
        }
        
        // Update canvas offset
        this.canvasOffset.x = this.panStart.canvasOffsetX + deltaX;
        this.canvasOffset.y = this.panStart.canvasOffsetY + deltaY;
        
        // Apply the transformation to the canvas
        this.canvas.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px)`;
        
        // Update guide positions
        this.renderGuides();
        
        // Update onion skinning overlay for new pan position (debounced)
        this.debouncedUpdateOnionSkinning();
        
        e.preventDefault();
    }

    stopCanvasPan() {
        if (!this.isPanningCanvas) return;
        
        this.isPanningCanvas = false;
        this.panStart = null;
        
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

    // Enhanced Guide Management Methods
    editGuideName(guideId) {
        const guide = this.guides.find(g => g.id === guideId);
        if (!guide) return;
        
        const newName = prompt('Enter new guide name:', guide.name);
        if (newName && newName.trim() !== '' && newName !== guide.name) {
            guide.name = newName.trim();
            this.updateGuidesPanel();
            this.showNotification(`Guide renamed to "${guide.name}"`, 'success');
        }
    }

    changeGuideColor(guideId) {
        const guide = this.guides.find(g => g.id === guideId);
        if (!guide) return;
        
        // Create color picker dropdown
        this.showGuideColorPicker(guide);
    }

    showGuideColorPicker(guide) {
        // Remove any existing color picker
        const existingPicker = document.querySelector('.guide-color-picker');
        if (existingPicker) {
            existingPicker.remove();
        }
        
        // Create color picker popup
        const picker = document.createElement('div');
        picker.className = 'guide-color-picker';
        picker.innerHTML = `
            <div class="guide-color-picker-header">
                <span>Choose Color</span>
                <button class="guide-color-picker-close">\u00d7</button>
            </div>
            <div class="guide-color-picker-colors">
                ${this.guideColors.map((color, index) => 
                    `<div class="guide-color-option ${color === guide.color ? 'selected' : ''}" 
                          style="background-color: ${color}" 
                          data-color="${color}"></div>`
                ).join('')}
            </div>
            <div class="guide-color-picker-custom">
                <input type="color" id="guide-custom-color" value="${guide.color}">
                <label for="guide-custom-color">Custom Color</label>
            </div>
        `;
        
        // Position near the guide item
        const guideItem = document.querySelector(`[onclick*="${guide.id}"]`)?.closest('.guide-item');
        if (guideItem) {
            const rect = guideItem.getBoundingClientRect();
            picker.style.position = 'fixed';
            picker.style.left = (rect.right + 10) + 'px';
            picker.style.top = rect.top + 'px';
            picker.style.zIndex = '1000';
        }
        
        document.body.appendChild(picker);
        
        // Add event handlers
        picker.addEventListener('click', (e) => {
            if (e.target.classList.contains('guide-color-option')) {
                const newColor = e.target.dataset.color;
                this.updateGuideColor(guide, newColor);
                picker.remove();
            } else if (e.target.classList.contains('guide-color-picker-close')) {
                picker.remove();
            }
        });
        
        // Custom color input
        const customColorInput = picker.querySelector('#guide-custom-color');
        customColorInput.addEventListener('change', (e) => {
            this.updateGuideColor(guide, e.target.value);
            picker.remove();
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!picker.contains(e.target)) {
                    picker.remove();
                }
            }, { once: true });
        }, 100);
    }

    updateGuideColor(guide, newColor) {
        guide.color = newColor;
        this.updateGuidesPanel();
        this.renderGuides();
        this.showNotification(`Guide color updated`, 'success');
    }

    toggleGuideSort() {
        this.guideSortEnabled = !this.guideSortEnabled;
        this.updateGuidesPanel();
        this.showNotification(
            `Guide sorting ${this.guideSortEnabled ? 'enabled' : 'disabled'}`, 
            'success'
        );
    }

    exportGuides(format = 'txt') {
        if (this.guides.length === 0) {
            this.showNotification('No guides to export', 'error');
            return;
        }
        
        let content = '';
        let mimeType = 'text/plain';
        
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
                h: guide.h,
                color: guide.color
            }));
            content = JSON.stringify(guidesData, null, 2);
            mimeType = 'application/json';
        } else if (format === 'csv') {
            // CSV format with color information
            content = 'name,x,y,width,height,color\n';
            this.guides.forEach(guide => {
                content += `"${guide.name}",${guide.x},${guide.y},${guide.w},${guide.h},"${guide.color}"\n`;
            });
            mimeType = 'text/csv';
        }
        
        // Create and download file
        const blob = new Blob([content], { type: mimeType });
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

    showImportGuidesDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.json,.csv';
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    const extension = file.name.split('.').pop().toLowerCase();
                    
                    if (extension === 'json') {
                        this.importGuides(content, 'json');
                    } else if (extension === 'txt') {
                        this.importGuides(content, 'txt');
                    } else if (extension === 'csv') {
                        this.importGuides(content, 'csv');
                    } else {
                        this.showNotification('Unsupported file format. Please use .json, .txt, or .csv files.', 'error');
                    }
                } catch (error) {
                    this.showNotification('Error reading file: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
            document.body.removeChild(input);
        });
        
        document.body.appendChild(input);
        input.click();
    }

    importGuides(content, format) {
        try {
            let guidesToImport = [];
            
            if (format === 'json') {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    guidesToImport = parsed;
                } else {
                    throw new Error('Invalid JSON format: expected array of guides');
                }
            } else if (format === 'txt') {
                const lines = content.split('\n').filter(line => line.trim());
                guidesToImport = lines.map((line, index) => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length < 5) {
                        throw new Error(`Invalid line ${index + 1}: expected format "name x y w h"`);
                    }
                    return {
                        name: parts[0],
                        x: parseInt(parts[1]),
                        y: parseInt(parts[2]),
                        w: parseInt(parts[3]),
                        h: parseInt(parts[4])
                    };
                });
            } else if (format === 'csv') {
                const lines = content.split('\n').filter(line => line.trim());
                if (lines.length === 0) {
                    throw new Error('CSV file is empty');
                }
                
                // Skip header line if it exists
                const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;
                
                guidesToImport = dataLines.map((line, index) => {
                    // Simple CSV parsing (handles quoted fields)
                    const fields = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            fields.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current.trim());
                    
                    if (fields.length < 5) {
                        throw new Error(`Invalid CSV line ${index + 2}: expected at least 5 columns (name,x,y,width,height)`);
                    }
                    
                    return {
                        name: fields[0].replace(/^"|"$/g, ''), // Remove quotes
                        x: parseInt(fields[1]),
                        y: parseInt(fields[2]),
                        w: parseInt(fields[3]),
                        h: parseInt(fields[4]),
                        color: fields[5] ? fields[5].replace(/^"|"$/g, '') : undefined
                    };
                });
            }
            
            // Validate and import guides
            let importedCount = 0;
            guidesToImport.forEach((guideData, index) => {
                if (this.validateGuideData(guideData)) {
                    const guide = {
                        id: 'guide_' + Date.now() + '_' + index,
                        name: guideData.name || `Imported Guide ${this.guides.length + 1}`,
                        x: Math.max(0, Math.min(guideData.x, this.editor.width)),
                        y: Math.max(0, Math.min(guideData.y, this.editor.height)),
                        w: Math.max(1, guideData.w),
                        h: Math.max(1, guideData.h),
                        color: guideData.color || this.guideColors[this.guideColorIndex % this.guideColors.length]
                    };
                    
                    this.guides.push(guide);
                    this.guideColorIndex++;
                    importedCount++;
                }
            });
            
            if (importedCount > 0) {
                this.updateGuidesPanel();
                this.renderGuides();
                this.showNotification(`Successfully imported ${importedCount} guide(s)`, 'success');
            } else {
                this.showNotification('No valid guides found to import', 'error');
            }
        } catch (error) {
            this.showNotification('Import failed: ' + error.message, 'error');
        }
    }

    validateGuideData(data) {
        return data && 
               typeof data.x === 'number' && !isNaN(data.x) &&
               typeof data.y === 'number' && !isNaN(data.y) &&
               typeof data.w === 'number' && !isNaN(data.w) && data.w > 0 &&
               typeof data.h === 'number' && !isNaN(data.h) && data.h > 0;
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
        
        // Import guides button
        const importBtn = document.getElementById('import-guides-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportGuidesDialog();
            });
        } else {
            console.error('Import guides button not found');
        }
        
        // Sort guides button
        const sortBtn = document.getElementById('sort-guides-btn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                this.toggleGuideSort();
                // Update icon based on sort state
                const icon = sortBtn.querySelector('i');
                if (this.guideSortEnabled) {
                    icon.className = 'ph ph-sort-descending';
                    sortBtn.title = 'Disable Sort';
                } else {
                    icon.className = 'ph ph-sort-ascending';
                    sortBtn.title = 'Enable Sort by Name';
                }
            });
        } else {
            console.error('Sort guides button not found');
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
        jsonItem.innerHTML = '<i class="ph ph-download"></i> Download as .json (with colors)';
        jsonItem.addEventListener('click', () => {
            this.exportGuides('json');
            dropdown.remove();
        });
        
        const csvItem = document.createElement('div');
        csvItem.className = 'dropdown-item';
        csvItem.innerHTML = '<i class="ph ph-download"></i> Download as .csv (with colors)';
        csvItem.addEventListener('click', () => {
            this.exportGuides('csv');
            dropdown.remove();
        });
        
        dropdown.appendChild(txtItem);
        dropdown.appendChild(jsonItem);
        dropdown.appendChild(csvItem);
        
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
        
        // Define the active tool indicator HTML
        const activeToolIndicatorHTML = `
            <div class="active-tool-indicator" id="active-tool-indicator">
                <div class="active-tool-icon">
                    <i class="ph ph-paint-brush" id="active-tool-icon"></i>
                </div>
                <div class="active-tool-name" id="active-tool-name">Brush</div>
            </div>
            <div class="tool-options-separator"></div>
        `;
        
        // Add options based on current tool
        const tool = this.currentTool;
        
        if (tool === 'brush') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <div class="number-input">
                        <button type="button" id="brush-size-dec">−</button>
                        <input type="number" id="brush-size-bar" min="1" max="10" value="${this.brushSize}">
                        <button type="button" id="brush-size-inc">+</button>
                    </div>
                </div>
                <div class="option-group">
                    <div class="btn-group">
                        <button class="btn-toggle ${this.brushShape === 'circle' ? 'active' : ''}" id="brush-shape-circle">
                            <i class="ph ph-circle"></i>
                        </button>
                        <button class="btn-toggle ${this.brushShape === 'square' ? 'active' : ''}" id="brush-shape-square">
                            <i class="ph ph-square"></i>
                        </button>
                    </div>
                </div>
                <div class="option-group">
                    <button class="btn-toggle ${this.smoothDrawing ? 'active' : ''}" id="smooth-drawing-bar">
                        <i class="ph ph-sneaker-move"></i>
                    </button>
                </div>
            `;
            
            // Re-attach events for brush
            const brushSizeBar = document.getElementById('brush-size-bar');
            const brushSizeInc = document.getElementById('brush-size-inc');
            const brushSizeDec = document.getElementById('brush-size-dec');
            const brushShapeCircle = document.getElementById('brush-shape-circle');
            const brushShapeSquare = document.getElementById('brush-shape-square');
            const smoothDrawingBar = document.getElementById('smooth-drawing-bar');
            
            // Size input and +/- buttons
            if (brushSizeBar) {
                brushSizeBar.addEventListener('input', (e) => {
                    this.brushSize = parseInt(e.target.value);
                    this.updateBrushCursorSize();
                });
            }
            
            if (brushSizeInc) {
                brushSizeInc.addEventListener('click', () => {
                    if (this.brushSize < 10) {
                        this.brushSize++;
                        brushSizeBar.value = this.brushSize;
                        this.updateBrushCursorSize();
                    }
                });
            }
            
            if (brushSizeDec) {
                brushSizeDec.addEventListener('click', () => {
                    if (this.brushSize > 1) {
                        this.brushSize--;
                        brushSizeBar.value = this.brushSize;
                        this.updateBrushCursorSize();
                    }
                });
            }
            
            // Shape toggle buttons
            if (brushShapeCircle) {
                brushShapeCircle.addEventListener('click', () => {
                    this.brushShape = 'circle';
                    brushShapeCircle.classList.add('active');
                    brushShapeSquare.classList.remove('active');
                    this.updateBrushCursorSize();
                });
            }
            
            if (brushShapeSquare) {
                brushShapeSquare.addEventListener('click', () => {
                    this.brushShape = 'square';
                    brushShapeSquare.classList.add('active');
                    brushShapeCircle.classList.remove('active');
                    this.updateBrushCursorSize();
                });
            }
            
            // Smooth drawing toggle
            if (smoothDrawingBar) {
                smoothDrawingBar.addEventListener('click', () => {
                    this.smoothDrawing = !this.smoothDrawing;
                    smoothDrawingBar.classList.toggle('active', this.smoothDrawing);
                });
            }
            
        } else if (tool === 'pencil') {
            // Pencil tool - simple with no options
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML;
            
        } else if (tool === 'eraser') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <div class="number-input">
                        <button type="button" id="eraser-size-dec">−</button>
                        <input type="number" id="eraser-size-bar" min="1" max="10" value="${this.eraserSize || 2}">
                        <button type="button" id="eraser-size-inc">+</button>
                    </div>
                </div>
                <div class="option-group">
                    <button class="btn-toggle ${this.smoothDrawing ? 'active' : ''}" id="eraser-smooth-bar">
                        <i class="ph ph-sneaker-move"></i>
                    </button>
                </div>
            `;
            
            const eraserSizeBar = document.getElementById('eraser-size-bar');
            const eraserSizeInc = document.getElementById('eraser-size-inc');
            const eraserSizeDec = document.getElementById('eraser-size-dec');
            const eraserSmoothBar = document.getElementById('eraser-smooth-bar');
            
            if (eraserSizeBar) {
                eraserSizeBar.addEventListener('input', (e) => {
                    this.eraserSize = parseInt(e.target.value);
                    this.updateBrushCursorSize();
                });
            }
            
            if (eraserSizeInc) {
                eraserSizeInc.addEventListener('click', () => {
                    if (this.eraserSize < 10) {
                        this.eraserSize++;
                        eraserSizeBar.value = this.eraserSize;
                        this.updateBrushCursorSize();
                    }
                });
            }
            
            if (eraserSizeDec) {
                eraserSizeDec.addEventListener('click', () => {
                    if (this.eraserSize > 1) {
                        this.eraserSize--;
                        eraserSizeBar.value = this.eraserSize;
                        this.updateBrushCursorSize();
                    }
                });
            }
            
            if (eraserSmoothBar) {
                eraserSmoothBar.addEventListener('click', () => {
                    this.smoothDrawing = !this.smoothDrawing;
                    eraserSmoothBar.classList.toggle('active', this.smoothDrawing);
                });
            }
            
        } else if (tool === 'shapes') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <button class="btn-toggle ${this.currentShapeMode === 'rectangle' ? 'active' : ''}" id="shape-rectangle-bar" title="Rectangle">
                        <i class="ph ph-rectangle"></i>
                    </button>
                    <button class="btn-toggle ${this.currentShapeMode === 'circle' ? 'active' : ''}" id="shape-circle-bar" title="Circle">
                        <i class="ph ph-circle"></i>
                    </button>
                </div>
                <div class="option-group">
                    <button class="btn-toggle ${this.unifiedShapeBorder ? 'active' : ''}" id="shape-border-bar" title="Border">
                        <i class="ph ph-selection-background"></i>
                    </button>
                    <button class="btn-toggle ${this.unifiedShapeFill ? 'active' : ''}" id="shape-fill-bar" title="Fill">
                        <i class="ph ph-paint-bucket"></i>
                    </button>
                </div>
            `;
            
            // Shape mode selection event handlers
            const shapeRectangleBar = document.getElementById('shape-rectangle-bar');
            const shapeCircleBar = document.getElementById('shape-circle-bar');
            const shapeBorderBar = document.getElementById('shape-border-bar');
            const shapeFillBar = document.getElementById('shape-fill-bar');
            
            if (shapeRectangleBar) {
                shapeRectangleBar.addEventListener('click', () => {
                    this.currentShapeMode = 'rectangle';
                    shapeRectangleBar.classList.add('active');
                    if (shapeCircleBar) shapeCircleBar.classList.remove('active');
                });
            }
            
            if (shapeCircleBar) {
                shapeCircleBar.addEventListener('click', () => {
                    this.currentShapeMode = 'circle';
                    shapeCircleBar.classList.add('active');
                    if (shapeRectangleBar) shapeRectangleBar.classList.remove('active');
                });
            }
            
            if (shapeBorderBar) {
                shapeBorderBar.addEventListener('click', () => {
                    this.unifiedShapeBorder = !this.unifiedShapeBorder;
                    shapeBorderBar.classList.toggle('active', this.unifiedShapeBorder);
                });
            }
            
            if (shapeFillBar) {
                shapeFillBar.addEventListener('click', () => {
                    this.unifiedShapeFill = !this.unifiedShapeFill;
                    shapeFillBar.classList.toggle('active', this.unifiedShapeFill);
                });
            }
            
        } else if (tool === 'spray') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <div class="number-input">
                        <button type="button" id="spray-radius-dec">−</button>
                        <input type="number" id="spray-radius-bar" min="2" max="15" value="${this.sprayRadius || 8}">
                        <button type="button" id="spray-radius-inc">+</button>
                    </div>
                </div>
                <div class="option-group">
                    <div class="number-input">
                        <button type="button" id="spray-density-dec">−</button>
                        <input type="number" id="spray-density-bar" min="10" max="100" value="${this.sprayDensity || 60}">
                        <button type="button" id="spray-density-inc">+</button>
                    </div>
                </div>
            `;
            
            const sprayRadiusBar = document.getElementById('spray-radius-bar');
            const sprayRadiusInc = document.getElementById('spray-radius-inc');
            const sprayRadiusDec = document.getElementById('spray-radius-dec');
            const sprayDensityBar = document.getElementById('spray-density-bar');
            const sprayDensityInc = document.getElementById('spray-density-inc');
            const sprayDensityDec = document.getElementById('spray-density-dec');
            
            if (sprayRadiusBar) {
                sprayRadiusBar.addEventListener('input', (e) => {
                    this.sprayRadius = parseInt(e.target.value);
                });
            }
            
            if (sprayRadiusInc) {
                sprayRadiusInc.addEventListener('click', () => {
                    if (this.sprayRadius < 15) {
                        this.sprayRadius++;
                        sprayRadiusBar.value = this.sprayRadius;
                    }
                });
            }
            
            if (sprayRadiusDec) {
                sprayRadiusDec.addEventListener('click', () => {
                    if (this.sprayRadius > 2) {
                        this.sprayRadius--;
                        sprayRadiusBar.value = this.sprayRadius;
                    }
                });
            }
            
            if (sprayDensityBar) {
                sprayDensityBar.addEventListener('input', (e) => {
                    this.sprayDensity = parseInt(e.target.value);
                });
            }
            
            if (sprayDensityInc) {
                sprayDensityInc.addEventListener('click', () => {
                    if (this.sprayDensity < 100) {
                        this.sprayDensity = Math.min(100, this.sprayDensity + 5);
                        sprayDensityBar.value = this.sprayDensity;
                    }
                });
            }
            
            if (sprayDensityDec) {
                sprayDensityDec.addEventListener('click', () => {
                    if (this.sprayDensity > 10) {
                        this.sprayDensity = Math.max(10, this.sprayDensity - 5);
                        sprayDensityBar.value = this.sprayDensity;
                    }
                });
            }
            
        } else if (tool === 'bucket') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <button class="btn-toggle ${this.fillContiguous ? 'active' : ''}" id="fill-contiguous-bar">
                        <i class="ph ph-path"></i>
                    </button>
                </div>
            `;
            
            const fillContiguousBar = document.getElementById('fill-contiguous-bar');
            if (fillContiguousBar) {
                fillContiguousBar.addEventListener('click', () => {
                    this.fillContiguous = !this.fillContiguous;
                    fillContiguousBar.classList.toggle('active', this.fillContiguous);
                });
            }
            
        } else if (tool === 'move') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <button class="btn-toggle ${this.moveLoop ? 'active' : ''}" id="move-loop-bar">
                        <i class="ph ph-arrows-clockwise"></i>
                    </button>
                </div>
            `;
            
            const moveLoopBar = document.getElementById('move-loop-bar');
            if (moveLoopBar) {
                moveLoopBar.addEventListener('click', () => {
                    this.moveLoop = !this.moveLoop;
                    moveLoopBar.classList.toggle('active', this.moveLoop);
                });
            }
            
        } else if (tool === 'line') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <div class="number-input">
                        <button type="button" id="line-width-dec">−</button>
                        <input type="number" id="line-width-bar" min="1" max="5" value="${this.lineWidth || 1}">
                        <button type="button" id="line-width-inc">+</button>
                    </div>
                </div>
            `;
            
            const lineWidthBar = document.getElementById('line-width-bar');
            const lineWidthInc = document.getElementById('line-width-inc');
            const lineWidthDec = document.getElementById('line-width-dec');
            
            if (lineWidthBar) {
                lineWidthBar.addEventListener('input', (e) => {
                    this.lineWidth = parseInt(e.target.value);
                });
            }
            
            if (lineWidthInc) {
                lineWidthInc.addEventListener('click', () => {
                    if (this.lineWidth < 5) {
                        this.lineWidth++;
                        lineWidthBar.value = this.lineWidth;
                    }
                });
            }
            
            if (lineWidthDec) {
                lineWidthDec.addEventListener('click', () => {
                    if (this.lineWidth > 1) {
                        this.lineWidth--;
                        lineWidthBar.value = this.lineWidth;
                    }
                });
            }
            
        } else if (tool === 'text') {
            const currentFont = TextRenderer.getCurrentFont();
            const currentSize = TextRenderer.getCurrentSize();
            
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <div class="text-tool-info">
                        <span class="text-info-label">Current:</span>
                        <span class="text-info-value">${currentFont.replace('bitmap-', '')} @ ${currentSize}×</span>
                    </div>
                </div>
                <div class="option-group">
                    <div class="text-tool-instruction">
                        <i class="ph ph-info"></i>
                        <span>Click canvas to place text • Double-click to edit</span>
                    </div>
                </div>
            `;
            
        } else if (tool === 'select-rect' || tool === 'select-circle') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <button id="select-copy-bar" class="btn-toggle">
                        <i class="ph ph-copy"></i>
                    </button>
                    <button id="select-cut-bar" class="btn-toggle">
                        <i class="ph ph-scissors"></i>
                    </button>
                    <button id="select-paste-bar" class="btn-toggle">
                        <i class="ph ph-clipboard"></i>
                    </button>
                    <button id="select-clear-bar" class="btn-toggle">
                        <i class="ph ph-x"></i>
                    </button>
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
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <button id="guide-add-bar" class="btn-toggle">
                        <i class="ph ph-plus"></i>
                    </button>
                    <button id="guide-clear-bar" class="btn-toggle">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
                <div class="option-group">
                    <button class="btn-toggle ${this.snapToGuides ? 'active' : ''}" id="guide-snap-bar">
                        <i class="ph ph-magnet"></i>
                    </button>
                </div>
            `;
            
            const addGuideBtn = document.getElementById('guide-add-bar');
            const clearGuidesBtn = document.getElementById('guide-clear-bar');
            const snapToGuidesBar = document.getElementById('guide-snap-bar');
            
            if (addGuideBtn) addGuideBtn.addEventListener('click', () => this.addGuide());
            if (clearGuidesBtn) clearGuidesBtn.addEventListener('click', () => this.clearGuides());
            if (snapToGuidesBar) {
                snapToGuidesBar.addEventListener('click', () => {
                    this.snapToGuides = !this.snapToGuides;
                    snapToGuidesBar.classList.toggle('active', this.snapToGuides);
                });
            }
            
        } else if (tool === 'blur') {
            this.toolOptionsBar.innerHTML = activeToolIndicatorHTML + `
                <div class="option-group">
                    <div class="number-input">
                        <button type="button" id="blur-size-dec">−</button>
                        <input type="number" id="blur-size-bar" min="1" max="10" value="${this.blurSize}">
                        <button type="button" id="blur-size-inc">+</button>
                    </div>
                </div>
                <div class="option-group">
                    <select id="blur-dither-method" title="Blur Algorithm">
                        <option value="Bayer2x2" ${this.blurDitherMethod === 'Bayer2x2' ? 'selected' : ''}>Bayer 2×2</option>
                        <option value="Bayer4x4" ${this.blurDitherMethod === 'Bayer4x4' ? 'selected' : ''}>Bayer 4×4</option>
                        <option value="Bayer8x8" ${this.blurDitherMethod === 'Bayer8x8' ? 'selected' : ''}>Bayer 8×8</option>
                        <option value="FloydSteinberg" ${this.blurDitherMethod === 'FloydSteinberg' ? 'selected' : ''}>Floyd-Steinberg</option>
                        <option value="Atkinson" ${this.blurDitherMethod === 'Atkinson' ? 'selected' : ''}>Atkinson</option>
                        <option value="Burkes" ${this.blurDitherMethod === 'Burkes' ? 'selected' : ''}>Burkes</option>
                    </select>
                </div>
                <div class="option-group">
                    <button class="btn-toggle ${this.blurAlphaChannel ? 'active' : ''}" id="blur-alpha-channel">
                        <i class="ph ph-drop-half-bottom"></i>
                    </button>
                </div>
            `;
            
            const blurSizeBar = document.getElementById('blur-size-bar');
            const blurSizeInc = document.getElementById('blur-size-inc');
            const blurSizeDec = document.getElementById('blur-size-dec');
            const blurDitherMethod = document.getElementById('blur-dither-method');
            const blurAlphaChannelBar = document.getElementById('blur-alpha-channel');
            
            if (blurSizeBar) {
                blurSizeBar.addEventListener('input', (e) => {
                    this.blurSize = parseInt(e.target.value);
                    this.updateBrushCursorSize();
                });
            }
            
            if (blurSizeInc) {
                blurSizeInc.addEventListener('click', () => {
                    if (this.blurSize < 10) {
                        this.blurSize++;
                        blurSizeBar.value = this.blurSize;
                        this.updateBrushCursorSize();
                    }
                });
            }
            
            if (blurSizeDec) {
                blurSizeDec.addEventListener('click', () => {
                    if (this.blurSize > 1) {
                        this.blurSize--;
                        blurSizeBar.value = this.blurSize;
                        this.updateBrushCursorSize();
                    }
                });
            }
            
            if (blurDitherMethod) {
                blurDitherMethod.addEventListener('change', (e) => {
                    this.blurDitherMethod = e.target.value;
                });
            }
            
            if (blurAlphaChannelBar) {
                blurAlphaChannelBar.addEventListener('click', () => {
                    this.blurAlphaChannel = !this.blurAlphaChannel;
                    blurAlphaChannelBar.classList.toggle('active', this.blurAlphaChannel);
                });
            }
        }
        
        // Update the active tool indicator for current tool
        this.updateActiveToolIndicator(this.currentTool);
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
        
        DEBUG.log(`🔧 Blur region: ${width}x${height}, data length: ${grayscaleData.length}`);
        
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
            ditheredDrawData = this.applyPixelDithering(blurredDrawData, width, height, this.blurDitherMethod);
            
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
        
        let ditheredAlpha;
        if (typeof DitheringEffects === 'undefined') {
            DEBUG.warn('DitheringEffects not available in blurBlackWithAlphaOnly');
            // Fallback: simple threshold
            ditheredAlpha = normalizedAlpha.map(pixel => pixel > 0.5 ? 1 : 0);
        } else {
            const dithering = new DitheringEffects();
            ditheredAlpha = dithering.ditherLayer(alphaLayer, 1.0, this.blurDitherMethod);
        }
        
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
        
        let ditheredAlpha;
        if (typeof DitheringEffects === 'undefined') {
            DEBUG.warn('DitheringEffects not available in blurWhiteWithAlphaOnly');
            // Fallback: simple threshold
            ditheredAlpha = normalizedAlpha.map(pixel => pixel > 0.5 ? 1 : 0);
        } else {
            const dithering = new DitheringEffects();
            ditheredAlpha = dithering.ditherLayer(alphaLayer, 1.0, this.blurDitherMethod);
        }
        
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
        // Check for valid input
        if (!data || !data.length) {
            DEBUG.warn('gaussianBlur: Invalid input data');
            return new Uint8Array(0);
        }
        
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
    
    applyPixelDithering(grayscaleData, width, height, method) {
        // Check for valid input
        if (!grayscaleData || !grayscaleData.length) {
            DEBUG.warn('applyDithering: Invalid grayscaleData');
            return new Uint8Array(0);
        }
        
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
        // Check for valid input
        if (!grayscaleAlphaData || !grayscaleAlphaData.length) {
            DEBUG.warn('applyAlphaDithering: Invalid grayscaleAlphaData');
            return new Uint8Array(0);
        }
        
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

    // ========================================
    // Project Management System
    // ========================================

    /**
     * Initialize project management system
     */
    setupProjectManagement() {
        try {
            // Initialize ProjectManager with unitManager and legacyAdapter
            this.projectManager = new ProjectManager(this.unitManager, this.legacyAdapter);
            
            // Initialize ProjectDialog
            this.projectDialog = new ProjectDialog(this.projectManager);
            
            DEBUG.log('Project management system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize project management system:', error);
            this.projectManager = null;
            this.projectDialog = null;
        }
    }

    /**
     * Show new project dialog
     */
    showNewProjectDialog() {
        if (this.projectDialog) {
            this.projectDialog.show('new');
        } else {
            console.warn('Project dialog not available');
        }
    }

    /**
     * Show open project dialog
     */
    showOpenProjectDialog() {
        if (this.projectDialog) {
            this.projectDialog.show('import');
        } else {
            console.warn('Project dialog not available');
        }
    }

    /**
     * Show recent projects dialog
     */
    showRecentProjectsDialog() {
        if (this.projectDialog) {
            this.projectDialog.show('recent');
        } else {
            console.warn('Project dialog not available');
        }
    }

    /**
     * Save current project (.bdp format)
     */
    async saveProject() {
        if (!this.projectManager) {
            console.warn('Project manager not available');
            return false;
        }

        try {
            const success = await this.projectManager.exportProject();
            if (success) {
                this.showNotification('Project saved successfully', 'success');
            } else {
                this.showNotification('Failed to save project', 'error');
            }
            return success;
        } catch (error) {
            console.error('Error saving project:', error);
            this.showNotification('Error saving project', 'error');
            return false;
        }
    }

    /**
     * Save project with custom filename
     */
    async saveProjectAs() {
        if (!this.projectManager) {
            console.warn('Project manager not available');
            return false;
        }

        try {
            const projectName = prompt('Enter project name:', this.projectManager.getCurrentProject()?.meta?.name || 'My Project');
            if (!projectName) return false;

            const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}.bdp`;
            const success = await this.projectManager.exportProject(filename);
            
            if (success) {
                this.showNotification(`Project saved as ${filename}`, 'success');
            } else {
                this.showNotification('Failed to save project', 'error');
            }
            return success;
        } catch (error) {
            console.error('Error saving project as:', error);
            this.showNotification('Error saving project', 'error');
            return false;
        }
    }

    /**
     * Export project (.bdp format)
     */
    async exportProject() {
        return await this.saveProject();
    }

    /**
     * Enhanced export functionality with multiple formats
     */
    async exportToFormat(format = 'png', options = {}) {
        try {
            // Get project name from multiple sources
            let projectName = 'bitmap';
            if (this.projectManager?.getCurrentProject()?.meta?.name) {
                projectName = this.projectManager.getCurrentProject().meta.name;
            } else {
                const projectNameElement = document.getElementById('project-name');
                if (projectNameElement && projectNameElement.value) {
                    projectName = projectNameElement.value;
                }
            }
            
            const editorBitmapData = this.editor.getBitmapData();
            const bitmapData = {
                width: this.editor.width,
                height: this.editor.height,
                pixels: editorBitmapData.pixels || editorBitmapData // Handle both formats
            };

            this.showNotification(`Exporting to ${format.toUpperCase()}...`, 'info');

            const exportData = await BitmapExporter.exportBitmap(bitmapData, format, projectName, options);
            const filename = projectName.replace(/[^a-z0-9]/gi, '_');
            
            BitmapExporter.downloadExport(exportData, filename, format);
            
            this.showNotification(`${format.toUpperCase()} export completed successfully!`, 'success');
            return true;

        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification(`Export failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Export to SVG with options dialog
     */
    // SVG export removed

    // WebP export removed

    /**
     * Export to JSON format
     */
    // JSON export removed

    // ASCII Art export removed

    /**
     * Export to CSS format
     */
    // CSS export removed

    // Raw Binary export removed

    /**
     * Show export format selection dialog
     */
    showExportDialog() {
        // Create a simple export format selection dialog
        const formats = BitmapExporter.getExportFormats();
        const formatList = Object.entries(formats)
            .map(([key, info]) => `${key}: ${info.name} - ${info.description}`)
            .join('\n');

        const selectedFormat = prompt(
            `Select export format:\n\n${formatList}\n\nEnter format code:`,
            'svg'
        );

        if (selectedFormat && formats[selectedFormat]) {
            this.exportToFormat(selectedFormat);
        } else if (selectedFormat) {
            this.showNotification('Invalid format selected', 'error');
        }
    }

    // ========================================
    // Auto-Save and Recovery System
    // ========================================

    /**
     * Initialize auto-save system
     */
    setupAutoSave() {
        // Auto-save configuration
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.lastAutoSave = Date.now();
        this.autoSaveTimer = null;
        this.changesSinceLastSave = false;

        // Start auto-save timer
        this.startAutoSave();

        // Listen for changes to trigger auto-save
        this.setupAutoSaveListeners();

        // Check for existing auto-save on startup
        this.checkAutoSaveOnStartup();

        DEBUG.log('Auto-save system initialized');
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            this.clearTimer(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        this.autoSaveTimer = this.createInterval(() => {
            if (this.autoSaveEnabled && this.changesSinceLastSave && this.projectManager) {
                this.performAutoSave();
            }
        }, this.autoSaveInterval);

        DEBUG.log(`Auto-save timer started (${this.autoSaveInterval / 1000}s interval)`);
    }

    /**
     * Setup listeners for changes that trigger auto-save
     */
    setupAutoSaveListeners() {
        // Listen for editor changes
        if (this.editor) {
            // Override the editor's commit method to track changes
            const originalCommit = this.editor.commit;
            this.editor.commit = () => {
                originalCommit.call(this.editor);
                this.markAutoSaveNeeded();
            };
        }

        // Listen for tool changes, canvas resizes, etc.
        document.addEventListener('tool-changed', () => this.markAutoSaveNeeded());
        document.addEventListener('canvas-modified', () => this.markAutoSaveNeeded());
        
        // Listen for pattern changes
        document.addEventListener('pattern-changed', () => this.markAutoSaveNeeded());
    }

    /**
     * Mark that auto-save is needed
     */
    markAutoSaveNeeded() {
        this.changesSinceLastSave = true;
        this.lastChange = Date.now();
    }

    /**
     * Perform auto-save
     */
    performAutoSave() {
        if (!this.projectManager) return;

        try {
            this.projectManager.autoSave();
            this.changesSinceLastSave = false;
            this.lastAutoSave = Date.now();
            
            // Show subtle auto-save indicator
            this.showAutoSaveIndicator();
            
            DEBUG.log('Auto-save completed');
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Show auto-save indicator
     */
    showAutoSaveIndicator() {
        // Create or update auto-save indicator
        let indicator = document.getElementById('auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'auto-save-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(34, 197, 94, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 9999;
                transition: opacity 0.3s ease;
                opacity: 0;
                pointer-events: none;
            `;
            document.body.appendChild(indicator);
        }

        indicator.textContent = '💾 Auto-saved';
        indicator.style.opacity = '1';

        // Fade out after 2 seconds
        setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = '0';
            }
        }, 2000);
    }

    /**
     * Check for auto-save on startup
     */
    checkAutoSaveOnStartup() {
        if (!this.projectManager) return;

        if (this.projectManager.hasAutoSave()) {
            // Show recovery prompt after a short delay to let the app initialize
            setTimeout(() => {
                this.showAutoSaveRecoveryDialog();
            }, 1000);
        }
    }

    /**
     * Show auto-save recovery dialog
     */
    showAutoSaveRecoveryDialog() {
        const shouldRecover = confirm(
            '💾 Auto-saved project found!\n\nWould you like to recover your previous work?'
        );

        if (shouldRecover) {
            this.recoverAutoSave();
        } else {
            // Clear the auto-save if user doesn't want to recover
            this.clearAutoSave();
        }
    }

    /**
     * Recover auto-saved project
     */
    recoverAutoSave() {
        if (!this.projectManager) return;

        try {
            const success = this.projectManager.loadAutoSave();
            if (success) {
                this.showNotification('Auto-saved project recovered successfully!', 'success');
                this.changesSinceLastSave = false;
            } else {
                this.showNotification('Failed to recover auto-saved project', 'error');
            }
        } catch (error) {
            console.error('Auto-save recovery failed:', error);
            this.showNotification('Auto-save recovery failed', 'error');
        }
    }

    /**
     * Clear auto-save
     */
    clearAutoSave() {
        try {
            localStorage.removeItem('bitsdraw_autosave');
            DEBUG.log('Auto-save cleared');
        } catch (error) {
            console.warn('Failed to clear auto-save:', error);
        }
    }

    /**
     * Enable/disable auto-save
     */
    setAutoSaveEnabled(enabled) {
        this.autoSaveEnabled = enabled;
        
        if (enabled) {
            this.startAutoSave();
            this.showNotification('Auto-save enabled', 'info');
        } else {
            if (this.autoSaveTimer) {
                this.clearTimer(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }
            this.showNotification('Auto-save disabled', 'info');
        }

        DEBUG.log(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get auto-save status
     */
    getAutoSaveStatus() {
        return {
            enabled: this.autoSaveEnabled,
            interval: this.autoSaveInterval,
            lastSave: this.lastAutoSave,
            hasChanges: this.changesSinceLastSave,
            hasAutoSave: this.projectManager?.hasAutoSave() || false
        };
    }

    /**
     * Show notification to user (enhanced version)
     */
    showNotification(message, type = 'info', options = {}) {
        // Create or update notification element
        let notification = document.getElementById('app-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'app-notification';
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
                transform: translateX(100%);
                opacity: 0;
            `;
            document.body.appendChild(notification);
        }

        // Set notification style based on type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Enhanced notification with icon support
        const icons = {
            success: 'ph-check-circle',
            error: 'ph-warning-circle',
            warning: 'ph-warning',
            info: 'ph-info'
        };
        
        if (options.showIcon !== false) {
            notification.innerHTML = `
                <i class="ph ${icons[type] || icons.info} notification-icon"></i>
                <span>${message}</span>
            `;
        } else {
            notification.textContent = message;
        }

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 50);

        // Auto-hide with configurable duration
        const duration = options.duration || (type === 'error' ? 5000 : 3000);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // ===============================
    // Memory Management Methods
    // ===============================

    /**
     * Add global event listener and track for cleanup
     */
    addGlobalEventListener(target, event, handler) {
        target.addEventListener(event, handler);
        
        if (!this.globalEventListeners.has(target)) {
            this.globalEventListeners.set(target, new Map());
        }
        this.globalEventListeners.get(target).set(event, handler);
        
        DEBUG.log(`Added global event listener: ${event} on ${target.constructor.name}`);
    }

    /**
     * Remove specific global event listener
     */
    removeGlobalEventListener(target, event) {
        if (this.globalEventListeners.has(target)) {
            const targetListeners = this.globalEventListeners.get(target);
            if (targetListeners.has(event)) {
                const handler = targetListeners.get(event);
                target.removeEventListener(event, handler);
                targetListeners.delete(event);
                
                if (targetListeners.size === 0) {
                    this.globalEventListeners.delete(target);
                }
                
                DEBUG.log(`Removed global event listener: ${event} from ${target.constructor.name}`);
            }
        }
    }

    /**
     * Track timers for cleanup
     */
    addTimer(timer) {
        this.timers.add(timer);
        return timer;
    }

    /**
     * Clear tracked timer
     */
    clearTimer(timer) {
        if (this.timers.has(timer)) {
            if (timer.type === 'interval') {
                clearInterval(timer.id);
            } else {
                clearTimeout(timer.id);
            }
            this.timers.delete(timer);
        }
    }

    /**
     * Create tracked timeout
     */
    createTimeout(callback, delay) {
        const timer = {
            id: setTimeout(callback, delay),
            type: 'timeout'
        };
        return this.addTimer(timer);
    }

    /**
     * Create tracked interval
     */
    createInterval(callback, delay) {
        const timer = {
            id: setInterval(callback, delay),
            type: 'interval'
        };
        return this.addTimer(timer);
    }

    /**
     * Initialize managers for proper cleanup tracking
     */
    initializeManagers() {
        // Initialize UI managers
        this.dialogs = new DialogManager(this);
        this.windows = new WindowManager(this);
        this.menuManager = new MenuManager(this);
        
        // Initialize enhanced error handling
        this.errorHandler = new ErrorHandler(this);
        
        DEBUG.log('UI managers initialized');
    }

    /**
     * Comprehensive cleanup method to prevent memory leaks
     */
    dispose() {
        DEBUG.log('Starting BitsDraw cleanup...');
        
        // 1. Remove all global event listeners
        for (const [target, targetListeners] of this.globalEventListeners) {
            for (const [event, handler] of targetListeners) {
                target.removeEventListener(event, handler);
                DEBUG.log(`Cleaned up event listener: ${event}`);
            }
        }
        this.globalEventListeners.clear();

        // 2. Clear all timers
        for (const timer of this.timers) {
            if (timer.type === 'interval') {
                clearInterval(timer.id);
            } else {
                clearTimeout(timer.id);
            }
        }
        this.timers.clear();

        // 3. Clear auto-save timer specifically
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // 4. Clear submenu timeouts
        if (this.submenuTimeouts) {
            for (const timeout of this.submenuTimeouts.values()) {
                clearTimeout(timeout);
            }
            this.submenuTimeouts.clear();
        }

        // 5. Cleanup editor and canvas contexts
        if (this.editor) {
            // Let OptimizedBitmapEditor handle its own cleanup if it has a dispose method
            if (typeof this.editor.dispose === 'function') {
                this.editor.dispose();
            }
            this.editor = null;
        }

        // 6. Cleanup large object references
        this.canvas = null;
        this.previewCanvas = null;
        this.selection = null;
        this.selectionClipboard = null;
        this.guides = null;
        this.layers = null;

        // 7. Cleanup managers
        if (this.projectManager && typeof this.projectManager.dispose === 'function') {
            this.projectManager.dispose();
        }
        this.projectManager = null;

        if (this.legacyAdapter && typeof this.legacyAdapter.dispose === 'function') {
            this.legacyAdapter.dispose();
        }
        this.legacyAdapter = null;
        this.unitManager = null;

        // 8. Cleanup UI managers
        if (this.dialogs && typeof this.dialogs.dispose === 'function') {
            this.dialogs.dispose();
        }
        this.dialogs = null;
        
        if (this.windows && typeof this.windows.dispose === 'function') {
            this.windows.dispose();
        }
        this.windows = null;
        
        this.tools = null;
        this.menus = null;

        DEBUG.log('BitsDraw cleanup completed');
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        return {
            globalListeners: this.globalEventListeners.size,
            activeTimers: this.timers.size,
            hasAutoSaveTimer: !!this.autoSaveTimer,
            submenuTimeouts: this.submenuTimeouts ? this.submenuTimeouts.size : 0,
            canvasSize: this.editor ? `${this.editor.width}x${this.editor.height}` : 'N/A',
            hasSelection: !!this.selection,
            hasClipboard: !!this.selectionClipboard,
            guidesCount: this.guides ? this.guides.length : 0
        };
    }

    // ===== ENHANCED KEYBOARD SHORTCUTS METHODS =====

    /**
     * Clear current selection
     */
    clearSelection() {
        this.selection = null;
        this.isDraggingSelection = false;
        this.isDraggingSelectionGraphics = false;
        this.selectionDragStart = null;
        this.editor.redraw();
        this.showNotification('Selection cleared', 'info');
    }

    /**
     * Increase brush size
     */
    increaseBrushSize() {
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            const maxSize = 10;
            let currentSize, toolName;
            
            if (this.currentTool === 'brush') {
                currentSize = this.brushSize;
                toolName = 'Brush';
            } else {
                currentSize = this.eraserSize;
                toolName = 'Eraser';
            }
            
            if (currentSize < maxSize) {
                if (this.currentTool === 'brush') {
                    this.brushSize++;
                } else {
                    this.eraserSize++;
                }
                this.updateToolOptionsBar();
                this.showNotification(`${toolName} size: ${currentSize + 1}`, 'info');
            }
        } else if (this.currentTool === 'spray') {
            if (this.sprayRadius < 20) {
                this.sprayRadius++;
                this.updateToolOptionsBar();
                this.showNotification(`Spray radius: ${this.sprayRadius}`, 'info');
            }
        }
    }

    /**
     * Decrease brush size
     */
    decreaseBrushSize() {
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            let currentSize, toolName;
            
            if (this.currentTool === 'brush') {
                currentSize = this.brushSize;
                toolName = 'Brush';
            } else {
                currentSize = this.eraserSize;
                toolName = 'Eraser';
            }
            
            if (currentSize > 1) {
                if (this.currentTool === 'brush') {
                    this.brushSize--;
                } else {
                    this.eraserSize--;
                }
                this.updateToolOptionsBar();
                this.showNotification(`${toolName} size: ${currentSize - 1}`, 'info');
            }
        } else if (this.currentTool === 'spray') {
            if (this.sprayRadius > 1) {
                this.sprayRadius--;
                this.updateToolOptionsBar();
                this.showNotification(`Spray radius: ${this.sprayRadius}`, 'info');
            }
        }
    }

    /**
     * Swap primary and secondary colors
     */
    swapPrimarySecondaryColors() {
        const temp = this.primaryColor;
        this.primaryColor = this.secondaryColor;
        this.secondaryColor = temp;
        
        this.updateColorDisplay('primary');
        this.updateColorDisplay('secondary');
        this.showNotification('Colors swapped', 'info');
    }

    /**
     * Reset to default colors (black primary, white secondary)
     */
    resetToDefaultColors() {
        this.primaryColor = '#000000';
        this.secondaryColor = '#ffffff';
        
        this.updateColorDisplay('primary');
        this.updateColorDisplay('secondary');
        this.showNotification('Colors reset to default', 'info');
    }

    /**
     * Invert display mode
     */
    invertDisplayMode() {
        this.editor.inverted = !this.editor.inverted;
        this.editor.redraw();
        this.showNotification(`Display ${this.editor.inverted ? 'inverted' : 'normal'}`, 'info');
    }

    /**
     * Add new layer
     */
    addNewLayer() {
        const layerCount = this.editor.layers.length;
        const newLayerName = `Layer ${layerCount + 1}`;
        this.editor.addLayer(newLayerName);
        this.editor.setActiveLayer(this.editor.layers.length - 1);
        this.updateLayerList();
        this.showNotification(`Added ${newLayerName}`, 'success');
    }

    /**
     * Duplicate active layer
     */
    duplicateActiveLayer() {
        const activeLayer = this.editor.getActiveLayer();
        if (activeLayer) {
            const duplicatedName = activeLayer.name + ' Copy';
            this.editor.duplicateLayer(this.editor.activeLayerIndex, duplicatedName);
            this.updateLayerList();
            this.showNotification(`Duplicated layer: ${duplicatedName}`, 'success');
        }
    }

    /**
     * Move to next layer (up in the list)
     */
    moveToNextLayer() {
        const nextIndex = this.editor.activeLayerIndex + 1;
        if (nextIndex < this.editor.layers.length) {
            this.editor.setActiveLayer(nextIndex);
            this.updateLayerList();
            this.showNotification(`Switched to: ${this.editor.getActiveLayer().name}`, 'info');
        }
    }

    /**
     * Move to previous layer (down in the list)
     */
    moveToPreviousLayer() {
        const prevIndex = this.editor.activeLayerIndex - 1;
        if (prevIndex >= 0) {
            this.editor.setActiveLayer(prevIndex);
            this.updateLayerList();
            this.showNotification(`Switched to: ${this.editor.getActiveLayer().name}`, 'info');
        }
    }

    /**
     * Move layer up in order (towards front)
     */
    moveLayerUp() {
        const currentIndex = this.editor.activeLayerIndex;
        if (currentIndex < this.editor.layers.length - 1) {
            this.editor.moveLayer(currentIndex, currentIndex + 1);
            this.editor.setActiveLayer(currentIndex + 1);
            this.updateLayerList();
            this.showNotification('Layer moved up', 'info');
        }
    }

    /**
     * Move layer down in order (towards back)
     */
    moveLayerDown() {
        const currentIndex = this.editor.activeLayerIndex;
        if (currentIndex > 0) {
            this.editor.moveLayer(currentIndex, currentIndex - 1);
            this.editor.setActiveLayer(currentIndex - 1);
            this.updateLayerList();
            this.showNotification('Layer moved down', 'info');
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const app = new BitsDraw();
    
    // Expose app globally for refactor bridge
    window.bitsDraw = app;

    // Setup automatic cleanup on page unload
    window.addEventListener('beforeunload', () => {
        console.log('Page unloading, cleaning up BitsDraw...');
        app.dispose();
    });

    // Also cleanup on visibility change (page hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is being hidden, might be closed soon
            console.log('Page hidden, performing preventive cleanup...');
            // Don't dispose completely, just clear heavy resources
            if (app.editor && app.editor.compositeCache) {
                app.editor.compositeCache.pixels = null;
                app.editor.compositeCache.alpha = null;
            }
        }
    });
    
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