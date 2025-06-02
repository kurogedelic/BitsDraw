class BitsDraw {
    constructor() {
        this.canvas = document.getElementById('bitmap-canvas');
        this.editor = new BitmapEditor(this.canvas, 128, 64);
        this.previewCanvas = document.getElementById('preview-canvas');
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.startPos = null;
        this.drawBorder = true;
        this.drawFill = false;
        this.currentPattern = 'solid-black';
        this.selection = null;
        this.showGrid = true;
        this.selectionClipboard = null;
        this.isDraggingSelection = false;
        this.isDraggingSelectionGraphics = false;
        this.selectionDragStart = null;
        
        this.initializeEventListeners();
        this.setupImageImport();
        this.setupColorPalette();
        this.setupMenuBar();
        this.setupWindowManagement();
        this.setupPreview();
        this.loadWindowStates();
        this.updateWindowMenu();
        this.updateOutput();
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
            
            if (this.currentTool === 'bucket' || this.currentTool === 'eyedropper') {
                this.handleCanvasClick(e);
            } else if (['rect-tool', 'circle-tool', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                this.isDrawing = true;
            } else {
                this.isDrawing = true;
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
                this.handleCanvasClick(e);
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
            } else if (this.isDrawing && ['rect-tool', 'circle-tool', 'line', 'select-rect', 'select-circle'].includes(this.currentTool)) {
                const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
                
                if (this.currentTool === 'rect-tool') {
                    this.editor.drawRect(this.startPos.x, this.startPos.y, coords.x, coords.y, this.drawFill, this.drawBorder, this.currentPattern);
                    this.editor.saveState();
                } else if (this.currentTool === 'circle-tool') {
                    const radius = Math.round(Math.sqrt(
                        Math.pow(coords.x - this.startPos.x, 2) + Math.pow(coords.y - this.startPos.y, 2)
                    ));
                    this.editor.drawCircle(this.startPos.x, this.startPos.y, radius, this.drawFill, this.drawBorder, this.currentPattern);
                    this.editor.saveState();
                } else if (this.currentTool === 'line') {
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
        const tools = ['pencil', 'brush', 'bucket', 'eraser', 'select-rect', 'select-circle', 
                      'line', 'text', 'rect', 'circle', 'spray', 'eyedropper'];
        
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

        // Undo/Redo buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (this.editor.undo()) {
                this.updateOutput();
            }
        });

        document.getElementById('redo-btn').addEventListener('click', () => {
            if (this.editor.redo()) {
                this.updateOutput();
            }
        });

        document.getElementById('zoom-select').addEventListener('change', (e) => {
            const zoom = parseInt(e.target.value);
            this.editor.setZoom(zoom);
            this.updateGridDisplay();
        });

        document.getElementById('invert-display').addEventListener('change', (e) => {
            this.editor.setInverted(e.target.checked);
        });

        document.getElementById('show-grid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.updateGridDisplay();
        });

        document.getElementById('canvas-width').addEventListener('change', () => {
            this.updateCanvasSize();
        });

        document.getElementById('canvas-height').addEventListener('change', () => {
            this.updateCanvasSize();
        });

        document.getElementById('resize-canvas').addEventListener('click', () => {
            this.resizeCanvas();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportCode();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearCanvas();
        });

        document.getElementById('project-name').addEventListener('input', () => {
            this.updateOutput();
        });

        // Selection controls
        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.selection = null;
            this.editor.redraw();
        });

        // Text tool
        document.getElementById('add-text-btn').addEventListener('click', () => {
            this.addText();
        });

        document.getElementById('text-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addText();
            }
        });

        // Save/Load buttons
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveBitmapToStorage();
        });

        document.getElementById('load-btn').addEventListener('click', () => {
            this.loadBitmapFromStorage();
        });

        // Import .h code
        document.getElementById('import-btn').addEventListener('click', () => {
            this.importHCode();
        });
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
                this.editor.clear();
                this.updateOutput();
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
            } else if (e.key.toLowerCase() === 'b' && !isCtrl) {
                this.setTool('brush');
            } else if (e.key.toLowerCase() === 'f' && !isCtrl) {
                this.setTool('bucket');
            } else if (e.key.toLowerCase() === 'e' && !isCtrl) {
                this.setTool('eraser');
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
            } else if (e.key.toLowerCase() === 'i' && !isCtrl) {
                this.setTool('eyedropper');
            } else if (e.key.toLowerCase() === 'm' && !isCtrl) {
                this.setTool('select-rect');
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
                const invertCheckbox = document.getElementById('invert-display');
                invertCheckbox.checked = !invertCheckbox.checked;
                this.editor.setInverted(invertCheckbox.checked);
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
                this.editor.clear();
                this.updateOutput();
                break;
            case 'save':
                this.saveBitmapToStorage();
                break;
            case 'open':
                this.loadBitmapFromStorage();
                break;
            case 'export-cpp':
                this.exportCode();
                break;
            case 'export-png':
                this.exportPNG();
                break;
            case 'import-image':
                document.getElementById('file-input').click();
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
            case 'clear':
                if (confirm('Clear the entire canvas?')) {
                    this.editor.clear();
                    this.updateOutput();
                }
                break;
            case 'clear-selection':
                this.selection = null;
                this.editor.redraw();
                break;
            case 'zoom-in':
                const currentZoom = parseInt(zoomSelect.value);
                const nextIndex = Math.min(zoomLevels.indexOf(currentZoom) + 1, zoomLevels.length - 1);
                zoomSelect.value = zoomLevels[nextIndex];
                this.editor.setZoom(zoomLevels[nextIndex]);
                break;
            case 'zoom-out':
                const currentZoomOut = parseInt(zoomSelect.value);
                const prevIndex = Math.max(zoomLevels.indexOf(currentZoomOut) - 1, 0);
                zoomSelect.value = zoomLevels[prevIndex];
                this.editor.setZoom(zoomLevels[prevIndex]);
                break;
            case 'invert':
                const invertCheckbox = document.getElementById('invert-display');
                invertCheckbox.checked = !invertCheckbox.checked;
                this.editor.setInverted(invertCheckbox.checked);
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
            case 'show-canvas-info':
                this.toggleWindow('canvas-info-window');
                break;
            case 'show-code':
                this.toggleWindow('code-window');
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
            { id: 'colors-window', name: 'Colors' },
            { id: 'options-window', name: 'Options' },
            { id: 'canvas-info-window', name: 'Canvas Info' },
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
        let startX, startY, startLeft, startTop;

        titleBar.addEventListener('mousedown', (e) => {
            // Don't interfere with window control buttons
            if (e.target.classList.contains('window-control')) {
                return;
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(window.style.left) || 0;
            startTop = parseInt(window.style.top) || 0;
            
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
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            window.style.left = (startLeft + deltaX) + 'px';
            window.style.top = (startTop + deltaY) + 'px';
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

    addText() {
        const textInput = document.getElementById('text-input');
        const text = textInput.value.trim();
        
        if (!text) {
            this.showNotification('Please enter some text', 'error');
            return;
        }
        
        // Calculate text position (center or at last click)
        let x = Math.floor(this.editor.width / 2 - TextRenderer.getTextWidth(text) / 2);
        let y = Math.floor(this.editor.height / 2 - TextRenderer.getTextHeight() / 2);
        
        if (this.startPos) {
            x = this.startPos.x;
            y = this.startPos.y;
        }
        
        // Render text
        TextRenderer.renderText(text, x, y, this.editor, this.currentPattern);
        this.editor.redraw();
        this.editor.saveState();
        this.updateOutput();
        
        // Clear text input
        textInput.value = '';
        
        this.showNotification('Text added!', 'success');
    }

    setupImageImport() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const fileInputBtn = document.getElementById('file-input-btn');

        // File input button
        fileInputBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageFile(e.target.files[0]);
            }
        });

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageFile(files[0]);
            }
        });

        // Click to browse
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone) {
                fileInput.click();
            }
        });
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

    importHCode() {
        const codeTextarea = document.getElementById('import-code');
        const code = codeTextarea.value.trim();
        
        if (!code) {
            this.showNotification('Please paste .h code to import', 'error');
            return;
        }
        
        try {
            const bitmapData = U8G2Exporter.parseHFile(code);
            this.editor.loadBitmapData(bitmapData);
            this.updateOutput();
            
            // Clear the textarea
            codeTextarea.value = '';
            
            this.showNotification('Code imported successfully!', 'success');
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Failed to import code: ' + error.message, 'error');
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
        
        // Only redraw once when selection is created or updated
        this.editor.redraw();
        this.editor.drawSelectionOverlay(this.editor.ctx, this.selection, this.editor.zoom);
        
        // Animation is handled by CSS, no need for continuous redraw
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
        
        // Clear selection when switching tools (except for selection tools)
        if (!['select-rect', 'select-circle'].includes(tool)) {
            this.selection = null;
            this.editor.redraw();
        }
    }

    handleCanvasClick(e) {
        const coords = this.editor.getCanvasCoordinates(e.clientX, e.clientY);
        
        if (this.currentTool === 'pencil' || this.currentTool === 'brush') {
            if (e.button === 0) { // Left click = draw with current pattern
                this.editor.setPixel(coords.x, coords.y, 1, this.currentPattern);
            } else { // Right click = erase (white)
                this.editor.setPixel(coords.x, coords.y, 0);
            }
            if (this.isDrawing && e.type === 'mouseup') {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'eraser') {
            this.editor.setPixel(coords.x, coords.y, 0);
            if (this.isDrawing && e.type === 'mouseup') {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'bucket') {
            if (e.button === 0) { // Left click = fill with current pattern
                this.editor.bucketFill(coords.x, coords.y, 1, this.currentPattern);
            } else { // Right click = fill with white
                this.editor.bucketFill(coords.x, coords.y, 0);
            }
            this.editor.saveState();
        } else if (this.currentTool === 'spray') {
            this.editor.spray(coords.x, coords.y, 5, 0.3, this.currentPattern);
            if (e.type === 'mouseup') {
                this.editor.saveState();
            }
        } else if (this.currentTool === 'eyedropper') {
            const pixelValue = this.editor.getPixel(coords.x, coords.y);
            // Set current pattern based on picked pixel
            const newPattern = pixelValue ? 'solid-black' : 'solid-white';
            this.setPattern(newPattern);
        }
    }

    handleZoom(e) {
        const zoomSelect = document.getElementById('zoom-select');
        const currentZoom = parseInt(zoomSelect.value);
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
            zoomSelect.value = newZoom;
            this.editor.setZoom(newZoom);
        }
    }

    updateCanvasSize() {
        const width = parseInt(document.getElementById('canvas-width').value);
        const height = parseInt(document.getElementById('canvas-height').value);
        
        if (width > 0 && height > 0 && width <= 256 && height <= 256) {
            document.getElementById('canvas-width').style.borderColor = '';
            document.getElementById('canvas-height').style.borderColor = '';
        } else {
            document.getElementById('canvas-width').style.borderColor = '#e74c3c';
            document.getElementById('canvas-height').style.borderColor = '#e74c3c';
        }
    }

    resizeCanvas() {
        const width = parseInt(document.getElementById('canvas-width').value);
        const height = parseInt(document.getElementById('canvas-height').value);
        
        if (width > 0 && height > 0 && width <= 256 && height <= 256) {
            this.editor.resize(width, height);
            this.updateOutput();
        } else {
            alert('Please enter valid dimensions (1-256 pixels)');
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
        
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                const pixelValue = this.editor.pixels[y][x];
                const displayValue = this.editor.inverted ? (1 - pixelValue) : pixelValue;
                const color = displayValue ? 0 : 255;
                const index = (y * this.editor.width + x) * 4;
                
                data[index] = color;     // R
                data[index + 1] = color; // G
                data[index + 2] = color; // B
                data[index + 3] = 255;   // A
            }
        }
        
        previewCtx.putImageData(imageData, 0, 0);
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
                        value: this.editor.pixels[y][x]
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
                this.editor.pixels[newY][newX] = pixel.value;
            }
        });
    }

    deleteSelection() {
        if (!this.selection) return;
        
        for (let y = 0; y < this.editor.height; y++) {
            for (let x = 0; x < this.editor.width; x++) {
                if (this.editor.isInSelection(x, y, this.selection)) {
                    this.editor.pixels[y][x] = 0;
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
                    this.selectionClipboard.pixels[y][x] = this.editor.pixels[y][x];
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
                    this.editor.pixels[y][x] = this.selectionClipboard.pixels[y][x];
                }
            }
        }
        
        this.editor.redraw();
        this.editor.saveState();
        this.updateOutput();
    }

    zoomIn() {
        const zoomSelect = document.getElementById('zoom-select');
        const zoomLevels = [1, 2, 4, 8, 16, 32];
        const currentZoom = parseInt(zoomSelect.value);
        const nextIndex = Math.min(zoomLevels.indexOf(currentZoom) + 1, zoomLevels.length - 1);
        zoomSelect.value = zoomLevels[nextIndex];
        this.editor.setZoom(zoomLevels[nextIndex]);
        this.updateGridDisplay();
    }

    zoomOut() {
        const zoomSelect = document.getElementById('zoom-select');
        const zoomLevels = [1, 2, 4, 8, 16, 32];
        const currentZoom = parseInt(zoomSelect.value);
        const prevIndex = Math.max(zoomLevels.indexOf(currentZoom) - 1, 0);
        zoomSelect.value = zoomLevels[prevIndex];
        this.editor.setZoom(zoomLevels[prevIndex]);
        this.updateGridDisplay();
    }

    updateOutput() {
        const bitmapData = this.editor.getBitmapData();
        const projectName = document.getElementById('project-name').value || 'my_bitmap';
        const code = U8G2Exporter.generateHFile(bitmapData, projectName);
        document.getElementById('output-code').value = code;
        this.updatePreview();
    }

    async exportCode() {
        const code = document.getElementById('output-code').value;
        
        try {
            await U8G2Exporter.copyToClipboard(code);
            this.showNotification('Code copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            this.showNotification('Failed to copy to clipboard. Please copy manually.', 'error');
        }
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
                if (bitmapData[y][x] === 1) {
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
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new BitsDraw();
    
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