/**
 * PNG Icon Loader for BitsDraw
 * Loads PNG icons from the icons directory structure
 */

class PNGIconLoader {
    static iconPaths = {
        // Tool icons (20x20 for 36x36 buttons)
        'tools.pencil': 'icons/tools/pencil.png',
        'tools.brush': 'icons/tools/brush.png',
        'tools.bucket': 'icons/tools/bucket.png',
        'tools.eraser': 'icons/tools/eraser.png',
        'tools.select-rect': 'icons/tools/select-rect.png',
        'tools.select-circle': 'icons/tools/select-circle.png',
        'tools.line': 'icons/tools/line.png',
        'tools.text': 'icons/tools/text.png',
        'tools.rect': 'icons/tools/rect.png',
        'tools.circle': 'icons/tools/circle.png',
        'tools.spray': 'icons/tools/spray.png',
        'tools.eyedropper': 'icons/tools/eyedropper.png',
        
        // Window control icons (12x12)
        'controls.close': 'icons/controls/close.png',
        'controls.minimize': 'icons/controls/minimize.png',
        'controls.zoom': 'icons/controls/zoom.png',
        'windowControls.close': 'icons/controls/close.png',
        'windowControls.minimize': 'icons/controls/minimize.png',
        'windowControls.zoom': 'icons/controls/zoom.png',
        
        // Menu icons (16x16)
        'menu.apple': 'icons/menu/apple.png'
    };

    static fallbackIcons = {
        // SVG fallbacks for missing PNG files
        'tools.pencil': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjQzBDMEMwIiBzdHJva2U9IiM4MDgwODAiLz4KPHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4PSI0IiB5PSI0Ij4KPGxpbmUgeDE9IjEiIHkxPSI3IiB4Mj0iNyIgeTI9IjEiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+CjwvZz4KPC9zdmc+',
        'tools.brush': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjQzBDMEMwIiBzdHJva2U9IiM4MDgwODAiLz4KPHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4PSI0IiB5PSI0Ij4KPGNpcmNsZSBjeD0iNCIgY3k9IjQiIHI9IjIiIGZpbGw9IiMwMDAwMDAiLz4KPC9nPgo8L3N2Zz4=',
        'tools.bucket': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjQzBDMEMwIiBzdHJva2U9IiM4MDgwODAiLz4KPHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4PSI0IiB5PSI0Ij4KPHJlY3QgeD0iMSIgeT0iMyIgd2lkdGg9IjYiIGhlaWdodD0iNCIgZmlsbD0iIzAwMDAwMCIvPgo8L2c+Cjwvc3ZnPg==',
        'tools.eraser': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjQzBDMEMwIiBzdHJva2U9IiM4MDgwODAiLz4KPHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4PSI0IiB5PSI0Ij4KPHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjMDAwMDAwIi8+CjwvZz4KPC9zdmc+'
    };

    /**
     * Initialize PNG icon loading for all elements with data-icon attribute
     */
    static init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.loadAllIcons();
        });
    }

    /**
     * Load all PNG icons in the document
     */
    static loadAllIcons() {
        const iconElements = document.querySelectorAll('img[data-icon]');
        iconElements.forEach(element => {
            this.loadIcon(element);
        });
    }

    /**
     * Load a specific PNG icon for an element
     * @param {HTMLImageElement} element - The img element to load icon for
     */
    static loadIcon(element) {
        const iconName = element.dataset.icon;
        const iconPath = this.iconPaths[iconName];

        console.log(`Loading icon: ${iconName} -> ${iconPath}`);

        if (!iconPath) {
            console.warn(`Icon not found: ${iconName}`);
            this.loadFallback(element, iconName);
            return;
        }

        // Set the PNG source
        element.src = iconPath;

        // Handle load error - fallback to SVG
        element.addEventListener('error', () => {
            console.warn(`PNG icon failed to load: ${iconPath}, using fallback`);
            this.loadFallback(element, iconName);
        });

        // Handle successful load
        element.addEventListener('load', () => {
            console.log(`PNG icon loaded successfully: ${iconPath}`);
            element.classList.add('png-icon-loaded');
        });
    }

    /**
     * Load fallback SVG icon when PNG is not available
     * @param {HTMLImageElement} element - The img element
     * @param {string} iconName - The icon name
     */
    static loadFallback(element, iconName) {
        const fallback = this.fallbackIcons[iconName];
        if (fallback) {
            element.src = fallback;
            element.classList.add('fallback-icon');
        } else {
            // Create a simple placeholder
            element.src = this.createPlaceholder(iconName);
            element.classList.add('placeholder-icon');
        }
    }

    /**
     * Create a simple placeholder icon
     * @param {string} iconName - The icon name
     * @returns {string} Data URL for placeholder
     */
    static createPlaceholder(iconName) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        // Draw placeholder background
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(0, 0, 16, 16);
        ctx.strokeStyle = '#808080';
        ctx.strokeRect(0, 0, 16, 16);

        // Draw first letter of icon name
        const letter = iconName.split('.').pop().charAt(0).toUpperCase();
        ctx.fillStyle = '#000000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(letter, 8, 11);

        return canvas.toDataURL();
    }

    /**
     * Add a new icon path mapping
     * @param {string} iconName - The icon identifier
     * @param {string} path - The path to the PNG file
     */
    static addIcon(iconName, path) {
        this.iconPaths[iconName] = path;
    }

    /**
     * Check if PNG icon file exists
     * @param {string} iconName - The icon identifier
     * @returns {Promise<boolean>} Whether the icon exists
     */
    static async checkIconExists(iconName) {
        const iconPath = this.iconPaths[iconName];
        if (!iconPath) return false;

        try {
            const response = await fetch(iconPath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get list of all missing PNG icons
     * @returns {Promise<string[]>} Array of missing icon names
     */
    static async getMissingIcons() {
        const missing = [];
        for (const iconName of Object.keys(this.iconPaths)) {
            const exists = await this.checkIconExists(iconName);
            if (!exists) {
                missing.push(iconName);
            }
        }
        return missing;
    }
}

// Initialize when script loads
PNGIconLoader.init();