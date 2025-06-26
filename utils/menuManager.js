/**
 * Menu Manager - Handles menu bar interactions and menu actions
 */
class MenuManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        console.log('MenuManager constructor called');
        this.setupMenuBar();
    }

    setupMenuBar() {
        console.log('setupMenuBar called');
        const menuItems = document.querySelectorAll('.menu-item');
        const menuDropdowns = document.querySelectorAll('.menu-dropdown');
        console.log('Found menu items:', menuItems.length);
        console.log('Found menu dropdowns:', menuDropdowns.length);
        let activeMenu = null;

        // Initialize window visibility icons
        this.updateWindowVisibilityIcons();
        
        // Clean up any existing dynamic window menu items
        if (this.app.windowManager) {
            this.app.windowManager.updateWindowMenu();
        }

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
        const actionItems = document.querySelectorAll('.menu-dropdown-item[data-action]');
        console.log('Found action items:', actionItems.length);
        actionItems.forEach((item, index) => {
            console.log(`Action item ${index}:`, item.dataset.action);
        });
        
        actionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                console.log('Menu item clicked:', action);
                
                // Special handling for import-image to maintain user gesture
                if (action === 'import-image') {
                    const fileInput = document.getElementById('file-input');
                    if (fileInput) {
                        fileInput.value = ''; // Reset to allow same file
                        fileInput.click();
                    }
                    this.hideAllMenus();
                    activeMenu = null;
                    return;
                }
                
                this.handleMenuAction(action);
                this.hideAllMenus();
                activeMenu = null;
                
                // Update window visibility icons after window actions
                if (action.startsWith('show-')) {
                    setTimeout(() => this.updateWindowVisibilityIcons(), 50);
                }
            });
        });

        // Submenu handling
        this.setupSubmenus();

        // Hide menus when clicking outside
        document.addEventListener('click', () => {
            this.hideAllMenus();
            activeMenu = null;
        });
    }

    setupSubmenus() {
        document.querySelectorAll('.menu-dropdown-item.has-submenu').forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const submenu = document.getElementById(`submenu-${item.dataset.action}`);
                if (submenu) {
                    document.querySelectorAll('.menu-submenu').forEach(sm => {
                        if (sm !== submenu) sm.classList.remove('show');
                    });
                    
                    const rect = item.getBoundingClientRect();
                    submenu.style.left = (rect.right - 1) + 'px';
                    submenu.style.top = rect.top + 'px';
                    submenu.classList.add('show');
                }
            });
        });

        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            dropdown.addEventListener('mouseleave', () => {
                document.querySelectorAll('.menu-submenu').forEach(submenu => {
                    submenu.classList.remove('show');
                });
            });
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
        
        // Update window visibility icons when window menu is opened
        if (dropdown.id === 'menu-window') {
            this.updateWindowVisibilityIcons();
        }
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
        console.log('handleMenuAction called with action:', action);
        switch (action) {
            // File menu
            case 'new':
                this.app.showNewProjectDialog();
                break;
            case 'save':
                this.app.saveProject();
                break;
            case 'save-as':
                this.app.saveProjectAs();
                break;
            case 'export-project':
                this.app.exportProject();
                break;
            case 'open':
                this.app.showOpenProjectDialog();
                break;
            case 'recent-projects':
                this.app.showRecentProjectsDialog();
                break;
            case 'export-cpp':
                this.app.dialogs.showCppExportDialog();
                break;
            case 'export-png':
                this.app.exportPNG();
                break;
            case 'export-static-gif':
                this.app.exportGIF();
                break;
            case 'export-gif':
                console.log('GIF export is currently disabled');
                return;
                // this.app.exportAnimationGIF();
                break;
            case 'export-animation-gif':
                console.log('GIF export is currently disabled');
                return;
                // this.app.exportAnimationGIF();
                break;
            case 'export-animation-apng':
                this.app.exportAnimationAPNG();
                break;
            case 'export-sprite-sheet':
                this.app.exportSpriteSheet();
                break;
            // WebP export also removed as requested
            // ASCII Art and Raw Binary export removed
            case 'export-formats':
                this.app.showExportDialog();
                break;
            case 'import-image':
                document.getElementById('file-input').click();
                break;
            case 'import-cpp':
                this.app.dialogs.showCppImportDialog();
                break;
            case 'import-text-objects':
                if (this.app.textObjectManager) {
                    this.app.textObjectManager.showImportDialog();
                }
                break;
            case 'export-text-objects':
                if (this.app.textObjectManager) {
                    this.app.textObjectManager.exportTextObjectsToFile();
                }
                break;

            // Image menu
            case 'canvas-resize':
                this.app.dialogs.showCanvasResizeDialog();
                break;

            // Edit menu
            case 'undo':
                if (this.app.editor.undo()) {
                    this.app.updateOutput();
                }
                break;
            case 'redo':
                if (this.app.editor.redo()) {
                    this.app.updateOutput();
                }
                break;
            case 'cut':
                this.app.cutSelection();
                break;
            case 'copy':
                this.app.copySelection();
                break;
            case 'paste':
                this.app.pasteSelection();
                break;
            case 'select-all':
                this.app.selectAll();
                break;
            case 'clear-selection':
                this.app.selection = null;
                this.app.editor.redraw();
                break;
            case 'rescale':
                this.app.rescaleCanvas();
                break;

            // Layer menu
            case 'rotate-90':
                if (this.app.editor.rotateLayer90()) {
                    this.app.updateLayersList();
                    this.app.updateOutput();
                }
                break;
            case 'rotate-180':
                if (this.app.editor.rotateLayer180()) {
                    this.app.updateLayersList();
                    this.app.updateOutput();
                }
                break;
            case 'rotate-270':
                if (this.app.editor.rotateLayer270()) {
                    this.app.updateLayersList();
                    this.app.updateOutput();
                }
                break;
            case 'flip-horizontal':
                if (this.app.editor.flipLayerHorizontal()) {
                    this.app.updateLayersList();
                    this.app.updateOutput();
                }
                break;
            case 'flip-vertical':
                if (this.app.editor.flipLayerVertical()) {
                    this.app.updateLayersList();
                    this.app.updateOutput();
                }
                break;

            // Layer-specific transformations (new Layer menu)
            case 'layer-flip-horizontal':
                this.app.editor.flipActiveLayerHorizontal();
                this.app.updateOutput();
                break;
            case 'layer-flip-vertical':
                this.app.editor.flipActiveLayerVertical();
                this.app.updateOutput();
                break;
            case 'layer-rotate-90':
                this.app.editor.rotateActiveLayer90();
                this.app.updateOutput();
                break;
            case 'layer-rotate-180':
                this.app.editor.rotateActiveLayer180();
                this.app.updateOutput();
                break;
            case 'layer-rotate-270':
                this.app.editor.rotateActiveLayer270();
                this.app.updateOutput();
                break;

            // Effects menu
            case 'invert-bitmap':
                this.app.applyInvertEffect();
                break;
            case 'dithering':
                this.app.showDitheringDialog();
                break;
            case 'draw-edge':
                console.log('Draw edge menu action triggered');
                console.log('App object:', this.app);
                console.log('showDrawEdgeDialog method exists:', typeof this.app.showDrawEdgeDialog);
                if (typeof this.app.showDrawEdgeDialog === 'function') {
                    this.app.showDrawEdgeDialog();
                } else {
                    console.error('showDrawEdgeDialog method not found on app object!');
                }
                break;

            // View menu - Mode switching
            case 'view-canvas':
                this.app.switchToCanvasView();
                break;
                
            // View menu - Zoom
            case 'zoom-in':
                this.app.zoomIn();
                break;
            case 'zoom-out':
                this.app.zoomOut();
                break;
            case 'show-grid':
                const gridCheckbox = document.getElementById('show-grid');
                gridCheckbox.checked = !gridCheckbox.checked;
                this.app.showGrid = gridCheckbox.checked;
                this.app.updateGridDisplay();
                break;
            case 'show-guides':
                this.app.showGuides = !this.app.showGuides;
                this.app.renderGuides();
                break;

            // Window menu
            case 'show-tools':
                this.app.windowManager.toggleWindow('tools-window');
                break;
            case 'show-colors':
                this.app.windowManager.toggleWindow('colors-window');
                break;
            case 'show-options':
                this.app.windowManager.toggleWindow('options-window');
                break;
            case 'show-layers':
                this.app.windowManager.toggleWindow('layers-window');
                break;
            case 'show-guides':
                this.app.windowManager.toggleWindow('guides-window');
                break;
            case 'show-preview':
                this.app.windowManager.toggleWindow('preview-window');
                break;
            case 'show-canvas-controls':
                this.app.windowManager.toggleWindow('canvas-controls-window');
                break;

            // Help menu
            case 'about':
                this.app.dialogManager.showDialog('about-dialog');
                break;
            case 'shortcuts':
                this.app.windowManager.showWindow('shortcuts-window');
                break;
        }
    }

    updateWindowVisibilityIcons() {
        // Update window visibility icons based on current window state
        const windowIcons = document.querySelectorAll('[data-window-icon]');
        
        windowIcons.forEach(icon => {
            const windowId = icon.getAttribute('data-window-icon');
            const window = document.getElementById(windowId);
            
            if (window) {
                const isVisible = !window.classList.contains('hidden') && 
                                window.style.display !== 'none';
                
                // Update icon class based on visibility
                if (isVisible) {
                    icon.className = 'ph ph-check-square';
                } else {
                    icon.className = 'ph ph-square';
                }
            }
        });
        
        // Update Export GIF menu item state
        this.updateExportGifMenuState();
    }

    updateExportGifMenuState() {
        const exportGifMenu = document.getElementById('export-gif-menu');
        if (!exportGifMenu) return;
        
        // Enable GIF export only when there are multiple sheets
        const hasMultipleSheets = this.app.sheets && this.app.sheets.length > 1;
        
        if (hasMultipleSheets) {
            exportGifMenu.classList.remove('disabled');
            exportGifMenu.style.opacity = '1';
            exportGifMenu.style.pointerEvents = 'auto';
        } else {
            exportGifMenu.classList.add('disabled');
            exportGifMenu.style.opacity = '0.5';
            exportGifMenu.style.pointerEvents = 'none';
        }
    }
}