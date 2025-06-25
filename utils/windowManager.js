/**
 * Window Manager - Handles window dragging, resizing, and state management
 */
class WindowManager {
    constructor(bitsDraw) {
        this.app = bitsDraw;
        this.globalListeners = new Map(); // Track global listeners
        this.setupWindowManagement();
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

        const mouseMoveHandler = (e) => {
            if (!isDragging) return;
            
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            
            window.style.left = newLeft + 'px';
            window.style.top = newTop + 'px';
        };

        const mouseUpHandler = () => {
            if (isDragging) {
                this.saveWindowStates();
            }
            isDragging = false;
        };

        // Track listeners for cleanup
        this.addGlobalListener(document, 'mousemove', mouseMoveHandler, window.id);
        this.addGlobalListener(document, 'mouseup', mouseUpHandler, window.id);
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

    /**
     * Add global event listener and track for cleanup
     */
    addGlobalListener(target, event, handler, windowId) {
        target.addEventListener(event, handler);
        
        if (!this.globalListeners.has(windowId)) {
            this.globalListeners.set(windowId, []);
        }
        this.globalListeners.get(windowId).push({ target, event, handler });
    }

    /**
     * Remove global listeners for a specific window
     */
    removeWindowListeners(windowId) {
        if (this.globalListeners.has(windowId)) {
            const listeners = this.globalListeners.get(windowId);
            listeners.forEach(({ target, event, handler }) => {
                target.removeEventListener(event, handler);
            });
            this.globalListeners.delete(windowId);
        }
    }

    /**
     * Dispose of all global listeners and cleanup resources
     */
    dispose() {
        for (const [windowId, listeners] of this.globalListeners) {
            listeners.forEach(({ target, event, handler }) => {
                target.removeEventListener(event, handler);
            });
        }
        this.globalListeners.clear();
        this.app = null;
    }
}