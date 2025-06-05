class BitsDraw {
    constructor() {
        console.log('BitsDraw constructor starting...');
        this.canvas = document.getElementById('bitmap-canvas');
        this.editor = new OptimizedBitmapEditor(this.canvas, 128, 64);
        this.previewCanvas = document.getElementById('preview-canvas');
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.startPos = null;
        this.drawBorder = true;
        this.drawFill = false;
        this.currentPattern = 'solid-black';
        this.selection = null;
        this.showGrid = false;
        this.gradientStartPos = null;
        this.selectionClipboard = null;
        this.isDraggingSelection = false;
        this.isDraggingSelectionGraphics = false;
        this.selectionDragStart = null;
        this.previewOverlay = null;
        this.textBalloonPos = null;
        this.brushSize = 1;
        this.sprayRadius = 5;
        this.sprayDensity = 0.3;
        this.currentDisplayMode = 'white';
        
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
            }
        };
        
        this.initializeEventListeners();
        this.setupColorPalette();
        this.setupMenuBar();
        this.setupWindowManagement();
        this.setupPreview();
        this.setupLayers();
        this.setupTextBalloon();
        this.setupToolOptions();
        this.setupNewCanvasDialog();
        this.setupCppExportDialog();
        this.setupCppImportDialog();
        this.setupFileImport();
        this.loadWindowStates();
        this.updateWindowMenu();
        this.updateOutput();
        this.initializeTheme();
        this.setupBrushCursor();
        
        // Initialize display mode
        this.setDisplayMode('white');
        
        // Initialize tool options display
        this.updateToolOptions('pencil');
    }

    initializeEventListeners() {
        this.setupCanvasEvents();
        this.setupToolbarEvents();
        this.setupKeyboardShortcuts();
    }

    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
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
            } else if (['rect', 'circle', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                this.isDrawing = true;
            } else {
                this.isDrawing = true;
                if (this.currentTool === 'pencil') {
                    this.hideBrushCursor();
                }
                this.handleCanvasClick(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDraggingSelection) {
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
            if (this.isDraggingSelection) {
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
                    const radius = Math.round(Math.sqrt(
                        Math.pow(coords.x - this.startPos.x, 2) + Math.pow(coords.y - this.startPos.y, 2)
                    ));
                    this.editor.drawCircle(this.startPos.x, this.startPos.y, radius, this.drawFill, false, this.currentPattern);
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
                    this.selection = this.editor.createSelection(this.startPos.x, this.startPos.y, coords.x, coords.y, 'circle');
                    this.drawSelectionOverlay();
                }
            }
            
            this.isDrawing = false;
            if (this.currentTool === 'pencil') {
                this.showBrushCursor();
            }
            this.updateOutput();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e);
        });

        document.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });
    }

    setupToolbarEvents() {
        // Tool palette events
        const tools = ['brush', 'pencil', 'bucket', 'select-rect', 'select-circle', 
                      'move', 'line', 'text', 'rect', 'circle', 'spray', 'guide', 'hand'];
        
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
        
        // Update zoom select and display
        document.getElementById('zoom-select').value = zoom;
        this.updateZoomDisplay();
    }

    showZoomDropdown() {
        // Create custom dropdown
        this.showCustomDropdown('zoom-dropdown-btn', 'zoom-select');
    }

    showDisplayModeDropdown() {
        // Create custom dropdown
        this.showCustomDropdown('display-dropdown-btn', 'display-mode-select');
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
        const display = document.getElementById('display-current-value');
        display.textContent = select.options[select.selectedIndex].textContent;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
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
            else if (e.key.toLowerCase() === 'p' && !isCtrl) {
                this.setTool('pencil');
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
            // View shortcuts
            else if (isCtrl && e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (isCtrl && e.key === '-') {
                e.preventDefault();
                this.zoomOut();
            } else if (isCtrl && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                this.cycleDisplayMode();
            } else if (isCtrl && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                const gridCheckbox = document.getElementById('show-grid');
                gridCheckbox.checked = !gridCheckbox.checked;
                this.showGrid = gridCheckbox.checked;
                this.updateGridDisplay();
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
                this.handleMenuAction(action);
                this.hideAllMenus();
                activeMenu = null;
            });
        });

        // Submenu handling for items with has-submenu class
        document.querySelectorAll('.menu-dropdown-item.has-submenu').forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const submenuId = item.dataset.action.replace('-', '') + '-submenu';
                const submenu = document.getElementById(`submenu-${item.dataset.action}`);
                if (submenu) {
                    // Hide other submenus
                    document.querySelectorAll('.menu-submenu').forEach(sm => {
                        if (sm !== submenu) sm.classList.remove('show');
                    });
                    
                    // Position and show this submenu
                    const rect = item.getBoundingClientRect();
                    submenu.style.left = (rect.right - 1) + 'px';
                    submenu.style.top = rect.top + 'px';
                    submenu.classList.add('show');
                }
            });
        });

        // Hide submenus when leaving the main dropdown
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            dropdown.addEventListener('mouseleave', () => {
                document.querySelectorAll('.menu-submenu').forEach(submenu => {
                    submenu.classList.remove('show');
                });
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
                document.getElementById('file-input').click();
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
            case 'theme-auto':
                this.setTheme('auto');
                break;
            case 'theme-light':
                this.setTheme('light');
                break;
            case 'theme-dark':
                this.setTheme('dark');
                break;
            case 'rescale':
                this.rescaleCanvas();
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
        
        // Track mouse movement over canvas
        this.canvas.addEventListener('mouseenter', () => {
            if (this.currentTool === 'pencil') {
                this.showBrushCursor();
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.hideBrushCursor();
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.currentTool === 'pencil') {
                this.updateBrushCursor(e.clientX, e.clientY);
            }
        });
    }

    showBrushCursor() {
        this.brushCursorOverlay.style.display = 'block';
        this.updateBrushCursorSize();
    }

    hideBrushCursor() {
        this.brushCursorOverlay.style.display = 'none';
    }

    updateBrushCursor(clientX, clientY) {
        this.brushCursorOverlay.style.left = clientX + 'px';
        this.brushCursorOverlay.style.top = clientY + 'px';
    }

    updateBrushCursorSize() {
        const size = this.brushSize * this.editor.zoom;
        this.brushCursorOverlay.style.width = size + 'px';
        this.brushCursorOverlay.style.height = size + 'px';
        
        // Update appearance based on tool
        this.brushCursorOverlay.className = 'brush-cursor-overlay';
        if (this.currentTool === 'pencil' && this.brushSize === 1) {
            this.brushCursorOverlay.classList.add('square');
        }
    }

    setupColorPalette() {
        const swatches = document.querySelectorAll('.color-swatch');
        
        swatches.forEach(swatch => {
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

        // Spray radius
        const sprayRadiusSlider = document.getElementById('spray-radius');
        const sprayRadiusValue = document.getElementById('spray-radius-value');
        sprayRadiusSlider.addEventListener('input', (e) => {
            this.sprayRadius = parseInt(e.target.value);
            sprayRadiusValue.textContent = this.sprayRadius;
        });

        // Spray density
        const sprayDensitySlider = document.getElementById('spray-density');
        const sprayDensityValue = document.getElementById('spray-density-value');
        sprayDensitySlider.addEventListener('input', (e) => {
            this.sprayDensity = parseInt(e.target.value) / 100;
            sprayDensityValue.textContent = e.target.value;
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
            case 'pencil':
                document.getElementById('pencil-options').style.display = 'block';
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
            case 'move':
                document.getElementById('move-options').style.display = 'block';
                break;
            case 'guide':
                document.getElementById('guide-options').style.display = 'block';
                break;
            case 'hand':
                document.getElementById('hand-options').style.display = 'block';
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
        const codeTextarea = document.getElementById('cpp-export-code');
        
        const bitmapData = this.editor.getBitmapData();
        const code = U8G2Exporter.generateHFile(bitmapData, arrayName);
        
        codeTextarea.value = code;
    }

    setupFileImport() {
        const fileInput = document.getElementById('file-input');
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageFile(file);
                fileInput.value = ''; // Clear the input
            }
        });
    }

    setupDitheringDialog() {
        const dialog = document.getElementById('dithering-dialog');
        const closeBtn = document.getElementById('dithering-close-btn');
        const cancelBtn = document.getElementById('dithering-cancel-btn');
        const applyBtn = document.getElementById('dithering-apply-btn');
        const previewBtn = document.getElementById('dither-preview-btn');
        const resetBtn = document.getElementById('dither-reset-btn');
        const levelSlider = document.getElementById('dither-level');
        const levelValue = document.getElementById('dither-level-value');

        // Store original state for preview/reset
        this.ditheringOriginalState = null;

        // Close dialog handlers
        const closeDialog = () => {
            if (this.ditheringOriginalState) {
                this.resetDitheringPreview();
            }
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

        // Level slider handler
        levelSlider.addEventListener('input', (e) => {
            levelValue.textContent = e.target.value;
        });

        // Preview handler
        previewBtn.addEventListener('click', () => {
            const algorithm = document.getElementById('dither-algorithm').value;
            const level = parseInt(levelSlider.value);
            this.previewDitheringEffect(algorithm, level);
        });

        // Reset handler
        resetBtn.addEventListener('click', () => {
            this.resetDitheringPreview();
        });

        // Apply dithering handler
        applyBtn.addEventListener('click', () => {
            const algorithm = document.getElementById('dither-algorithm').value;
            const level = parseInt(levelSlider.value);
            
            if (this.ditheringOriginalState) {
                // Apply the current preview permanently
                this.editor.saveState();
                this.ditheringOriginalState = null;
            } else {
                // Apply fresh
                this.applyDitheringEffect(algorithm, level);
            }
            
            this.showNotification('Dithering applied successfully!', 'success');
            closeDialog();
        });
    }

    showDitheringDialog() {
        const dialog = document.getElementById('dithering-dialog');
        dialog.style.display = 'flex';
        
        // Reset state
        this.ditheringOriginalState = null;
        
        // Reset to default values
        document.getElementById('dither-algorithm').value = 'floyd-steinberg';
        document.getElementById('dither-level').value = 5;
        document.getElementById('dither-level-value').textContent = '5';
        
        // Add some test data if canvas is empty
        const bitmapData = this.editor.getBitmapData();
        let hasData = false;
        for (let y = 0; y < bitmapData.height && !hasData; y++) {
            for (let x = 0; x < bitmapData.width && !hasData; x++) {
                if (bitmapData.pixels[y][x] === 1) {
                    hasData = true;
                }
            }
        }
        
        if (!hasData) {
            console.log('Canvas is empty, adding gradient test pattern for dithering');
            
            // Create a sophisticated test pattern that shows Floyd-Steinberg well
            for (let y = 0; y < bitmapData.height; y++) {
                for (let x = 0; x < bitmapData.width; x++) {
                    let intensity = 0;
                    
                    // Left-to-right gradient (primary)
                    const horizontalGradient = x / bitmapData.width;
                    
                    // Top-to-bottom gradient (secondary)
                    const verticalGradient = y / bitmapData.height;
                    
                    // Circular gradient from center
                    const centerX = bitmapData.width / 2;
                    const centerY = bitmapData.height / 2;
                    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
                    const radialGradient = 1 - (distance / maxDistance);
                    
                    // Combine gradients for complex intensity pattern
                    intensity = (horizontalGradient * 0.6 + verticalGradient * 0.2 + radialGradient * 0.2);
                    
                    // Add some sinusoidal waves for texture
                    const wave1 = (Math.sin(x * 0.1) + 1) / 2;
                    const wave2 = (Math.sin(y * 0.15) + 1) / 2;
                    intensity = (intensity * 0.8 + wave1 * 0.1 + wave2 * 0.1);
                    
                    // Convert to probability and set pixel
                    if (Math.random() < intensity) {
                        this.editor.setPixel(x, y, 1);
                    }
                }
            }
            this.updateOutput();
        }
    }

    applyDitheringEffect(algorithm, level) {
        this.applyDitheringEffectInternal(algorithm, level, true);
        this.showNotification('Dithering applied successfully!', 'success');
    }

    applyDitheringToSelection(bitmapData, algorithm, level) {
        // Extract selection area
        const selectionPixels = [];
        let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;

        // Find selection bounds
        for (let y = 0; y < bitmapData.height; y++) {
            for (let x = 0; x < bitmapData.width; x++) {
                if (this.editor.isInSelection(x, y, this.selection)) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        const selectionWidth = maxX - minX + 1;
        const selectionHeight = maxY - minY + 1;

        // Extract pixels from selection
        for (let y = 0; y < selectionHeight; y++) {
            selectionPixels[y] = [];
            for (let x = 0; x < selectionWidth; x++) {
                const sourceX = minX + x;
                const sourceY = minY + y;
                if (this.editor.isInSelection(sourceX, sourceY, this.selection)) {
                    selectionPixels[y][x] = bitmapData.pixels[sourceY][sourceX];
                } else {
                    selectionPixels[y][x] = 0;
                }
            }
        }

        // Apply dithering to selection
        const ditheredSelection = DitheringEffects.applyDithering(
            selectionPixels, 
            selectionWidth, 
            selectionHeight, 
            algorithm, 
            level
        );

        return { ditheredSelection, minX, minY, selectionWidth, selectionHeight };
    }

    applyResultToSelection(result) {
        const { ditheredSelection, minX, minY, selectionWidth, selectionHeight } = result;
        
        for (let y = 0; y < selectionHeight; y++) {
            for (let x = 0; x < selectionWidth; x++) {
                const targetX = minX + x;
                const targetY = minY + y;
                if (this.editor.isInSelection(targetX, targetY, this.selection)) {
                    this.editor.setPixel(targetX, targetY, ditheredSelection[y][x]);
                }
            }
        }
        
        this.editor.redraw();
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

    previewDitheringEffect(algorithm, level) {
        // Save original state if not already saved
        if (!this.ditheringOriginalState) {
            this.ditheringOriginalState = this.editor.getBitmapData();
        }

        // Apply dithering as preview (without saving to history)
        this.applyDitheringEffectInternal(algorithm, level, false);
        this.showNotification('Preview applied - use Reset to undo', 'info');
    }

    resetDitheringPreview() {
        if (this.ditheringOriginalState) {
            this.editor.loadBitmapData(this.ditheringOriginalState);
            this.updateOutput();
            this.ditheringOriginalState = null;
            this.showNotification('Reset to original', 'info');
        }
    }

    applyDitheringEffectInternal(algorithm, level, saveState = true) {
        console.log('Applying dithering:', algorithm, level);
        const bitmapData = this.editor.getBitmapData();
        console.log('Bitmap data:', bitmapData);
        let result;

        if (this.selection) {
            // Apply to selection only
            result = this.applyDitheringToSelection(bitmapData, algorithm, level);
        } else {
            // Apply to entire canvas
            console.log('Calling DitheringEffects.applyDithering');
            result = DitheringEffects.applyDithering(
                bitmapData.pixels, 
                bitmapData.width, 
                bitmapData.height, 
                algorithm, 
                level
            );
            console.log('Dithering result:', result);
        }

        if (this.selection) {
            // Update only selection area
            this.applyResultToSelection(result);
        } else {
            // Update entire canvas
            this.editor.loadBitmapData({
                width: bitmapData.width,
                height: bitmapData.height,
                pixels: result
            });
        }

        if (saveState) {
            this.editor.saveState();
        }
        this.updateOutput();
    }

    drawWithBrush(centerX, centerY, draw) {
        const radius = Math.floor(this.brushSize / 2);
        let pixelsChanged = false;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && x < this.editor.width && y >= 0 && y < this.editor.height) {
                    let shouldDraw = false;
                    
                    // For size 1, just draw center pixel
                    if (this.brushSize === 1) {
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
                        this.editor.setPixel(x, y, draw ? 1 : 0, draw ? this.currentPattern : null);
                        pixelsChanged = true;
                    }
                }
            }
        }
        
        // The OptimizedBitmapEditor handles rendering automatically
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


    async handleImageFile(file) {
        if (!ImageImporter.isValidImageFile(file)) {
            this.showNotification('Please select a valid image file (PNG, JPG, GIF)', 'error');
            return;
        }

        try {
            this.showNotification('Processing image...', 'info');
            
            const targetWidth = this.editor.width;
            const targetHeight = this.editor.height;
            
            const bitmapData = await ImageImporter.processImage(file, targetWidth, targetHeight);
            this.editor.loadBitmapData(bitmapData);
            this.updateOutput();
            
            this.showNotification('Image imported successfully!', 'success');
        } catch (error) {
            console.error('Image import error:', error);
            this.showNotification('Failed to import image: ' + error.message, 'error');
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
        document.getElementById(`${tool}-tool`).classList.add('active');
        
        // Update cursor based on tool
        this.canvas.className = '';
        if (tool === 'bucket') {
            this.canvas.classList.add('bucket-cursor');
        }
        
        // Update brush cursor visibility
        if (tool === 'pencil') {
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
    }

    handleCanvasClick(e) {
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        if (this.currentTool === 'pencil') {
            this.drawWithBrush(coords.x, coords.y, e.button === 0);
            if (this.isDrawing && e.type === 'mouseup') {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'bucket') {
            if (e.button === 0) { // Left click = fill with current pattern
                this.editor.floodFill(coords.x, coords.y, 1, this.currentPattern);
            } else { // Right click = fill with white
                this.editor.floodFill(coords.x, coords.y, 0);
            }
            this.editor.saveState();
        } else if (this.currentTool === 'spray') {
            this.editor.spray(coords.x, coords.y, this.sprayRadius, this.sprayDensity, this.currentPattern);
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
        
        // Copy pixels from main canvas
        const imageData = previewCtx.createImageData(this.editor.width, this.editor.height);
        const data = imageData.data;
        
        const colors = this.displayModes[this.currentDisplayMode];
        const drawColor = this.hexToRgb(colors.draw_color);
        const backgroundColor = this.hexToRgb(colors.background_color);
        
        const bitmapData = this.editor.getBitmapData();
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                const pixelValue = bitmapData.pixels[y][x];
                const displayValue = this.editor.inverted ? (1 - pixelValue) : pixelValue;
                const color = displayValue ? drawColor : backgroundColor;
                const index = (y * this.editor.width + x) * 4;
                
                data[index] = color.r;     // R
                data[index + 1] = color.g; // G
                data[index + 2] = color.b; // B
                data[index + 3] = 255;     // A
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
                    this.editor.setPixel(x, y, 0);
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
        
        // Draw line preview
        const ctx = this.editor.ctx;
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        const zoom = this.editor.zoom;
        ctx.beginPath();
        ctx.moveTo(x1 * zoom + zoom/2, y1 * zoom + zoom/2);
        ctx.lineTo(x2 * zoom + zoom/2, y2 * zoom + zoom/2);
        ctx.stroke();
        
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
        
        // Draw rect preview
        const ctx = this.editor.ctx;
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        const zoom = this.editor.zoom;
        const startX = Math.min(x1, x2) * zoom;
        const startY = Math.min(y1, y2) * zoom;
        const width = (Math.abs(x2 - x1) + 1) * zoom;
        const height = (Math.abs(y2 - y1) + 1) * zoom;
        
        ctx.strokeRect(startX, startY, width, height);
        
        ctx.restore();
    }

    drawCirclePreview(centerX, centerY, endX, endY) {
        // Clear previous preview
        this.editor.redraw();
        
        // Draw selection overlay if exists
        if (this.selection) {
            this.drawSelectionOverlay();
        }
        
        // Draw circle preview
        const ctx = this.editor.ctx;
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        const zoom = this.editor.zoom;
        const radius = Math.round(Math.sqrt(
            Math.pow(endX - centerX, 2) + Math.pow(endY - centerY, 2)
        )) * zoom;
        
        ctx.beginPath();
        ctx.arc(centerX * zoom + zoom/2, centerY * zoom + zoom/2, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }

    clearShapePreview() {
        this.editor.redraw();
        if (this.selection) {
            this.drawSelectionOverlay();
        }
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
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw bitmap data
        ctx.fillStyle = '#000000';
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                if (bitmapData.pixels[y][x] === 1) {
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        
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

    /**
     * Set application theme
     */
    setTheme(theme) {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        html.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Add new theme class
        body.classList.add(`theme-${theme}`);
        html.classList.add(`theme-${theme}`);
        
        // Store preference
        localStorage.setItem('bitsdraw-theme', theme);
        
        // Apply theme
        this.applyTheme(theme);
    }

    /**
     * Apply theme styles
     */
    applyTheme(theme) {
        if (theme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--bg-color', '#1a1a1a');
            document.documentElement.style.setProperty('--text-color', '#ffffff');
            document.documentElement.style.setProperty('--border-color', '#333333');
            document.documentElement.style.setProperty('--window-bg', '#2a2a2a');
        } else {
            document.documentElement.style.setProperty('--bg-color', '#f0f0f0');
            document.documentElement.style.setProperty('--text-color', '#000000');
            document.documentElement.style.setProperty('--border-color', '#cccccc');
            document.documentElement.style.setProperty('--window-bg', '#ffffff');
        }
    }

    /**
     * Initialize theme from saved preference
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('bitsdraw-theme') || 'auto';
        this.setTheme(savedTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (document.body.classList.contains('theme-auto')) {
                this.applyTheme('auto');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, creating BitsDraw app...');
    try {
        const app = new BitsDraw();
        
        // Make app globally available for debugging
        window.bitsDrawApp = app;
        console.log('BitsDraw app created successfully:', app);
    } catch (error) {
        console.error('Error creating BitsDraw app:', error);
        console.error('Stack trace:', error.stack);
    }
    
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