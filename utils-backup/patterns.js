/**
 * Pattern utility for BitsDraw
 * Provides various fill patterns for drawing tools
 */

class Patterns {
    static getPatterns() {
        return {
            'solid-black': {
                name: 'Solid Black',
                getValue: (x, y) => 1
            },
            'solid-white': {
                name: 'Solid White', 
                getValue: (x, y) => 0
            },
            'checker-2x2': {
                name: 'Checker 2x2',
                getValue: (x, y) => ((Math.floor(x / 2) + Math.floor(y / 2)) % 2)
            },
            'checker-4x4': {
                name: 'Checker 4x4',
                getValue: (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2)
            },
            'diagonal-lines': {
                name: 'Diagonal Lines',
                getValue: (x, y) => ((x + y) % 3 === 0) ? 1 : 0
            },
            'horizontal-lines': {
                name: 'Horizontal Lines',
                getValue: (x, y) => (y % 2 === 0) ? 1 : 0
            },
            'vertical-lines': {
                name: 'Vertical Lines',
                getValue: (x, y) => (x % 2 === 0) ? 1 : 0
            },
            'dots-sparse': {
                name: 'Dots Sparse',
                getValue: (x, y) => (x % 4 === 0 && y % 4 === 0) ? 1 : 0
            },
            'dots-dense': {
                name: 'Dots Dense',
                getValue: (x, y) => (x % 2 === 0 && y % 2 === 0) ? 1 : 0
            },
            'cross-hatch': {
                name: 'Cross Hatch',
                getValue: (x, y) => ((x % 4 === 0) || (y % 4 === 0)) ? 1 : 0
            },
            'brick-pattern': {
                name: 'Brick Pattern',
                getValue: (x, y) => {
                    const rowOffset = (Math.floor(y / 2) % 2) * 2;
                    return ((x + rowOffset) % 4 < 2 && y % 4 < 2) ? 1 : 0;
                }
            },
            'diagonal-fill-25': {
                name: 'Diagonal 25%',
                getValue: (x, y) => ((x + y) % 4 === 0) ? 1 : 0
            },
            'diagonal-fill-50': {
                name: 'Diagonal 50%',
                getValue: (x, y) => ((x + y) % 2 === 0) ? 1 : 0
            },
            'diagonal-fill-75': {
                name: 'Diagonal 75%',
                getValue: (x, y) => ((x + y) % 4 !== 1) ? 1 : 0
            }
        };
    }

    static applyPattern(patternName, x, y) {
        const patterns = this.getPatterns();
        const pattern = patterns[patternName];
        
        if (!pattern) {
            // Fallback to solid black if pattern not found
            return 1;
        }
        
        return pattern.getValue(x, y);
    }

    static getPatternNames() {
        return Object.keys(this.getPatterns());
    }

    static getPatternDisplayName(patternName) {
        const patterns = this.getPatterns();
        return patterns[patternName]?.name || patternName;
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