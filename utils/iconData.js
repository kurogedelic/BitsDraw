/**
 * Icon Data - Base64 encoded PNG icons for BitsDraw UI
 * These are simple 16x16 pixel placeholder icons
 */

// Simple 16x16 pixel icons as data URLs
const IconData = {
    // Tool icons
    tools: {
        'pencil': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <path d="M2 14 L14 2 L13 1 L1 13 Z" fill="#333" stroke="#000" stroke-width="0.5"/>
                <rect x="1" y="13" width="2" height="2" fill="#333"/>
            </svg>
        `),
        
        'brush': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <circle cx="8" cy="6" r="3" fill="#333" stroke="#000" stroke-width="0.5"/>
                <rect x="7" y="9" width="2" height="4" fill="#333"/>
            </svg>
        `),
        
        'bucket': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <rect x="4" y="8" width="8" height="6" fill="#333" stroke="#000" stroke-width="0.5"/>
                <path d="M11 8 Q13 6 11 6" fill="none" stroke="#000" stroke-width="1"/>
            </svg>
        `),
        
        'eraser': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <rect x="2" y="7" width="12" height="4" fill="#ffaaaa" stroke="#000" stroke-width="0.5"/>
            </svg>
        `),
        
        'select-rect': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <rect x="2" y="2" width="12" height="12" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="2,2"/>
            </svg>
        `),
        
        'select-circle': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <circle cx="8" cy="8" r="6" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="2,2"/>
            </svg>
        `),
        
        'line': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <line x1="2" y1="14" x2="14" y2="2" stroke="#000" stroke-width="1"/>
            </svg>
        `),
        
        'text': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <text x="8" y="12" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#000">A</text>
            </svg>
        `),
        
        'rect': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <rect x="3" y="3" width="10" height="10" fill="none" stroke="#000" stroke-width="1"/>
            </svg>
        `),
        
        'circle': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <circle cx="8" cy="8" r="5" fill="none" stroke="#000" stroke-width="1"/>
            </svg>
        `),
        
        'spray': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <circle cx="3" cy="3" r="0.5" fill="#000"/>
                <circle cx="6" cy="2" r="0.5" fill="#000"/>
                <circle cx="9" cy="4" r="0.5" fill="#000"/>
                <circle cx="5" cy="6" r="0.5" fill="#000"/>
                <circle cx="11" cy="5" r="0.5" fill="#000"/>
                <circle cx="4" cy="9" r="0.5" fill="#000"/>
                <circle cx="8" cy="8" r="0.5" fill="#000"/>
                <circle cx="12" cy="10" r="0.5" fill="#000"/>
            </svg>
        `),
        
        'eyedropper': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <rect width="16" height="16" fill="transparent"/>
                <line x1="2" y1="14" x2="8" y2="8" stroke="#000" stroke-width="1"/>
                <line x1="8" y1="8" x2="14" y2="2" stroke="#000" stroke-width="1"/>
                <circle cx="3" cy="13" r="1" fill="#000"/>
            </svg>
        `)
    },
    
    // Window control icons (12x12)
    windowControls: {
        'close': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="12" height="12" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" fill="#ff5f57"/>
                <line x1="4" y1="4" x2="8" y2="8" stroke="#000" stroke-width="1"/>
                <line x1="8" y1="4" x2="4" y2="8" stroke="#000" stroke-width="1"/>
            </svg>
        `),
        
        'minimize': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="12" height="12" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" fill="#ffbd2e"/>
                <line x1="3" y1="6" x2="9" y2="6" stroke="#000" stroke-width="1"/>
            </svg>
        `),
        
        'zoom': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="12" height="12" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" fill="#28ca42"/>
                <line x1="3" y1="6" x2="9" y2="6" stroke="#000" stroke-width="1"/>
                <line x1="6" y1="3" x2="6" y2="9" stroke="#000" stroke-width="1"/>
            </svg>
        `)
    },
    
    // Menu icons
    menu: {
        'apple': 'data:image/svg+xml;base64,' + btoa(`
            <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6" fill="#333"/>
                <circle cx="10" cy="6" r="2" fill="white"/>
                <path d="M8 2 Q10 1 9 4" fill="none" stroke="#333" stroke-width="1"/>
            </svg>
        `)
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IconData;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.IconData = IconData;
}