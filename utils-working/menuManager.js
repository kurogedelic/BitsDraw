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
            case 'export-animation-gif':
                this.app.exportAnimationGIF();
                break;
            case 'export-animation-apng':
                this.app.exportAnimationAPNG();
                break;
            case 'export-sprite-sheet':
                this.app.exportSpriteSheet();
                break;
            case 'import-image':
                document.getElementById('file-input').click();
                break;
            case 'import-cpp':
                this.app.dialogs.showCppImportDialog();
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

            // Image menu
            case 'invert-bitmap':
                this.app.applyInvertEffect();
                break;
            case 'dithering':
                this.app.showDitheringDialog();
                break;
            case 'smart-conversions':
                this.app.showSmartConversions();
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

            // Help menu
            case 'about':
                this.app.windowManager.showWindow('about-window');
                break;
            case 'shortcuts':
                this.app.windowManager.showWindow('shortcuts-window');
                break;
        }
    }
}