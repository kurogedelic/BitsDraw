/**
 * Menu Manager - Handles menu bar interactions and menu actions
 */
class MenuManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.setupMenuBar();
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
        switch (action) {
            // File menu
            case 'new':
                this.app.dialogs.showNewCanvasDialog();
                break;
            case 'save':
                this.app.saveBitmapToStorage();
                break;
            case 'open':
                this.app.loadBitmapFromStorage();
                break;
            case 'export-cpp':
                this.app.dialogs.showCppExportDialog();
                break;
            case 'export-png':
                this.app.exportPNG();
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

            // Effects menu
            case 'invert-bitmap':
                this.app.applyInvertEffect();
                break;

            // View menu
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
            case 'invert':
                this.app.cycleDisplayMode();
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