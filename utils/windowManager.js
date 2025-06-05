/**
 * Window Manager - Handles window dragging, resizing, and state management
 */
class WindowManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.setupWindowManagement();
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
            if (e.target.classList.contains('window-control')) {
                return;
            }
            
            isDragging = true;
            
            const rect = window.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            window.style.zIndex = this.getTopZIndex() + 1;
            e.preventDefault();
        });

        titleBar.addEventListener('dblclick', (e) => {
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
                e.stopPropagation();
                window.classList.add('hidden');
                this.saveWindowStates();
                this.updateWindowMenu();
            });
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.classList.toggle('minimized');
                this.saveWindowStates();
                this.updateWindowMenu();
            });
        }

        if (zoomBtn) {
            zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation();
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
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = Math.max(200, startWidth + deltaX);
            const newHeight = Math.max(100, startHeight + deltaY);
            
            window.style.width = newWidth + 'px';
            window.style.height = newHeight + 'px';
            
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
        // Clean up any existing dynamic menu items to prevent duplicates
        const windowMenu = document.getElementById('menu-window');
        if (!windowMenu) return;
        
        // Remove any existing dynamic items
        const existingItems = windowMenu.querySelectorAll('.window-menu-item');
        existingItems.forEach(item => item.remove());
        
        // Remove any existing dynamic separators
        const separators = windowMenu.querySelectorAll('.menu-divider');
        separators.forEach(separator => {
            // Only remove separators that were dynamically added (not the static ones)
            if (separator.nextElementSibling && separator.nextElementSibling.classList.contains('window-menu-item')) {
                separator.remove();
            }
        });
        
        // Static window menu with icons is used instead
        return;
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
}