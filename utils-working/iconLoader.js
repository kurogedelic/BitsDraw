/**
 * Icon Loader - Loads SVG icons into IMG elements
 * This script runs after the DOM is loaded and replaces empty src attributes
 * with the appropriate icon data URLs from IconData
 */

class IconLoader {
    constructor() {
        this.iconData = window.IconData;
        this.loadedIcons = new Set();
    }

    /**
     * Get icon data URL from the IconData object using dot notation
     * @param {string} iconPath - Path like "tools.pencil" or "windowControls.close"
     * @returns {string|null} Data URL or null if not found
     */
    getIconDataUrl(iconPath) {
        const parts = iconPath.split('.');
        let current = this.iconData;
        
        for (const part of parts) {
            if (current && current[part]) {
                current = current[part];
            } else {
                console.warn(`Icon not found: ${iconPath}`);
                return null;
            }
        }
        
        return typeof current === 'string' ? current : null;
    }

    /**
     * Load all icons in the document
     */
    loadAllIcons() {
        const iconElements = document.querySelectorAll('img.icon[data-icon]');
        
        iconElements.forEach(img => {
            const iconPath = img.getAttribute('data-icon');
            if (iconPath && !this.loadedIcons.has(iconPath)) {
                const dataUrl = this.getIconDataUrl(iconPath);
                if (dataUrl) {
                    img.src = dataUrl;
                    this.loadedIcons.add(iconPath);
                    
                    // Set some default styling for icons
                    img.style.width = img.style.width || '12px';
                    img.style.height = img.style.height || '12px';
                    img.style.imageRendering = 'pixelated';
                    img.style.pointerEvents = 'none'; // Prevent dragging
                    
                    console.log(`Loaded icon: ${iconPath}`);
                } else {
                    console.error(`Failed to load icon: ${iconPath}`);
                }
            }
        });
        
        console.log(`Loaded ${this.loadedIcons.size} unique icons`);
    }

    /**
     * Load a specific icon element
     * @param {HTMLImageElement} imgElement - The image element to load
     */
    loadIcon(imgElement) {
        const iconPath = imgElement.getAttribute('data-icon');
        if (iconPath) {
            const dataUrl = this.getIconDataUrl(iconPath);
            if (dataUrl) {
                imgElement.src = dataUrl;
                return true;
            }
        }
        return false;
    }

    /**
     * Set custom sizes for specific icon types
     */
    setSizes() {
        // Tool icons should be 16x16
        const toolIcons = document.querySelectorAll('.tool-icon img.icon');
        toolIcons.forEach(img => {
            img.style.width = '16px';
            img.style.height = '16px';
        });

        // Window control icons should be 12x12
        const controlIcons = document.querySelectorAll('.window-control-icon');
        controlIcons.forEach(img => {
            img.style.width = '12px';
            img.style.height = '12px';
        });

        // Menu apple logo should be 16x16
        const appleIcon = document.querySelector('.apple-logo');
        if (appleIcon) {
            appleIcon.style.width = '16px';
            appleIcon.style.height = '16px';
        }
    }

    /**
     * Initialize the icon loader
     */
    init() {
        if (!this.iconData) {
            console.error('IconData not available. Make sure iconData.js is loaded first.');
            return;
        }

        // Load all icons immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadAllIcons();
                this.setSizes();
            });
        } else {
            this.loadAllIcons();
            this.setSizes();
        }

        // Set up a mutation observer to load icons that are added dynamically
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node is an icon
                            if (node.matches && node.matches('img.icon[data-icon]')) {
                                this.loadIcon(node);
                            }
                            // Check for icon children
                            const iconChildren = node.querySelectorAll && node.querySelectorAll('img.icon[data-icon]');
                            if (iconChildren) {
                                iconChildren.forEach(child => this.loadIcon(child));
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
}

// Create global instance and initialize
window.iconLoader = new IconLoader();
window.iconLoader.init();