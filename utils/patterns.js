/**
 * Pattern utility for BitsDraw
 * Provides various fill patterns for drawing tools
 */

class Patterns {
    static _patterns = {
        'solid-black': {
            name: 'Solid Black',
            alphaPattern: [
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        'solid-white': {
            name: 'Solid White',
            alphaPattern: [
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0
            ]
        },
        'checkerboard': {
            name: 'Checkerboard',
            alphaPattern: [
                1, 1, 0, 0, 1, 1, 0, 0,
                1, 1, 0, 0, 1, 1, 0, 0,
                0, 0, 1, 1, 0, 0, 1, 1,
                0, 0, 1, 1, 0, 0, 1, 1,
                1, 1, 0, 0, 1, 1, 0, 0,
                1, 1, 0, 0, 1, 1, 0, 0,
                0, 0, 1, 1, 0, 0, 1, 1,
                0, 0, 1, 1, 0, 0, 1, 1
            ]
        },
        'diagonal-checkerboard': {
            name: 'Diagonal Checkerboard',
            alphaPattern: [
                1, 0, 1, 0, 1, 0, 1, 0,
                0, 1, 0, 1, 0, 1, 0, 1,
                1, 0, 1, 0, 1, 0, 1, 0,
                0, 1, 0, 1, 0, 1, 0, 1,
                1, 0, 1, 0, 1, 0, 1, 0,
                0, 1, 0, 1, 0, 1, 0, 1,
                1, 0, 1, 0, 1, 0, 1, 0,
                0, 1, 0, 1, 0, 1, 0, 1
            ]
        },
        'horizontal-stripes': {
            name: 'Horizontal Stripes',
            alphaPattern: [
                1, 1, 1, 1, 1, 1, 1, 1,
                0, 0, 0, 0, 0, 0, 0, 0,
                1, 1, 1, 1, 1, 1, 1, 1,
                0, 0, 0, 0, 0, 0, 0, 0,
                1, 1, 1, 1, 1, 1, 1, 1,
                0, 0, 0, 0, 0, 0, 0, 0,
                1, 1, 1, 1, 1, 1, 1, 1,
                0, 0, 0, 0, 0, 0, 0, 0
            ]
        },
        'vertical-stripes': {
            name: 'Vertical Stripes',
            alphaPattern: [
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0,
                1, 0, 1, 0, 1, 0, 1, 0
            ]
        },
        'diagonal-stripes': {
            name: 'Diagonal Stripes',
            alphaPattern: [
                1, 0, 0, 0, 1, 0, 0, 0,
                0, 1, 0, 0, 0, 1, 0, 0,
                0, 0, 1, 0, 0, 0, 1, 0,
                0, 0, 0, 1, 0, 0, 0, 1,
                1, 0, 0, 0, 1, 0, 0, 0,
                0, 1, 0, 0, 0, 1, 0, 0,
                0, 0, 1, 0, 0, 0, 1, 0,
                0, 0, 0, 1, 0, 0, 0, 1
            ]
        },
        'bricks': {
            name: 'Bricks',
            alphaPattern: [
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 0, 0, 0, 1, 0, 0, 0,
                1, 0, 0, 0, 1, 0, 0, 0,
                1, 1, 1, 1, 1, 1, 1, 1,
                0, 0, 1, 0, 0, 0, 1, 0,
                0, 0, 1, 0, 0, 0, 1, 0,
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 0, 0, 0, 1, 0, 0, 0
            ]
        },
        'dots': {
            name: 'Dots',
            alphaPattern: [
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 1, 0, 0, 0, 1, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 1, 0, 0, 0, 1,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 1, 0, 0, 0, 1, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 1, 0, 0, 0, 1
            ]
        }
    };

    static getPatterns() {
        return this._patterns;
    }

    static applyPattern(patternName, x, y, primaryDraw = 1, secondaryDraw = 0) {
        const patterns = this.getPatterns();
        const pattern = patterns[patternName];
        
        if (!pattern || !pattern.alphaPattern) {
            // Fallback to solid primary color if pattern not found
            return { alpha: 1, draw: primaryDraw };
        }
        
        // Get alpha value from 8x8 pattern array
        const patternX = x % 8;
        const patternY = y % 8;
        const index = patternY * 8 + patternX;
        const alpha = pattern.alphaPattern[index];
        
        // Use primary color for alpha=1, secondary for alpha=0 (when drawing)
        // For transparent pixels (alpha=0), still set draw but will be ignored during rendering
        const draw = alpha === 1 ? primaryDraw : secondaryDraw;
        
        return { alpha: alpha, draw: draw };
    }

    static getPatternNames() {
        return Object.keys(this.getPatterns());
    }

    static getPatternDisplayName(patternName) {
        const patterns = this.getPatterns();
        return patterns[patternName]?.name || patternName;
    }

    static addPattern(patternName, pattern) {
        this._patterns[patternName] = pattern;
        this.saveToStorage();
    }

    static removePattern(patternName) {
        delete this._patterns[patternName];
        this.saveToStorage();
    }

    static hasPattern(patternName) {
        return patternName in this._patterns;
    }

    // Auto-save patterns to localStorage
    static saveToStorage() {
        try {
            const patternsToSave = {};
            
            // Only save custom patterns (not built-in ones)
            Object.keys(this._patterns).forEach(patternName => {
                if (!this.isBuiltInPattern(patternName)) {
                    const pattern = this._patterns[patternName];
                    
                    // Save the alpha pattern directly
                    patternsToSave[patternName] = {
                        name: pattern.name,
                        alphaPattern: pattern.alphaPattern
                    };
                }
            });
            
            localStorage.setItem('bitsdraw-patterns', JSON.stringify(patternsToSave));
            console.log('Patterns saved to localStorage:', Object.keys(patternsToSave));
        } catch (error) {
            console.warn('Failed to save patterns to localStorage:', error);
        }
    }

    // Load patterns from localStorage
    static loadFromStorage() {
        try {
            const saved = localStorage.getItem('bitsdraw-patterns');
            if (saved) {
                const patternsData = JSON.parse(saved);
                
                Object.keys(patternsData).forEach(patternName => {
                    const patternData = patternsData[patternName];
                    
                    // Recreate pattern from alphaPattern
                    const pattern = {
                        name: patternData.name,
                        alphaPattern: patternData.alphaPattern || patternData.gridData || []
                    };
                    
                    this._patterns[patternName] = pattern;
                });
                
                console.log('Patterns loaded from localStorage:', Object.keys(patternsData));
                return Object.keys(patternsData);
            }
        } catch (error) {
            console.warn('Failed to load patterns from localStorage:', error);
        }
        return [];
    }

    // Check if a pattern is built-in
    static isBuiltInPattern(patternName) {
        const builtInPatterns = [
            'solid-black', 'solid-white', 'checkerboard', 'diagonal-checkerboard', 
            'horizontal-stripes', 'vertical-stripes', 'diagonal-stripes', 'bricks', 'dots'
        ];
        return builtInPatterns.includes(patternName);
    }

    // Clear all custom patterns from storage
    static clearStorage() {
        try {
            localStorage.removeItem('bitsdraw-patterns');
            // Remove custom patterns from memory
            Object.keys(this._patterns).forEach(patternName => {
                if (!this.isBuiltInPattern(patternName)) {
                    delete this._patterns[patternName];
                }
            });
            console.log('Patterns cleared from localStorage');
        } catch (error) {
            console.warn('Failed to clear patterns from localStorage:', error);
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Patterns;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.Patterns = Patterns;
}