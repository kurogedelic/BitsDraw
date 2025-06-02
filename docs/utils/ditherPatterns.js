class DitherPatterns {
    static patterns = {
        'solid-black': {
            name: 'Black',
            apply: (x, y) => 1
        },
        'solid-white': {
            name: 'White', 
            apply: (x, y) => 0
        },
        'dither-50': {
            name: '50% Dither',
            apply: (x, y) => (x + y) % 2 === 0 ? 1 : 0
        },
        'dither-25': {
            name: '25% Dither',
            apply: (x, y) => (x % 2 === 0 && y % 2 === 0) ? 1 : 0
        },
        'dither-75': {
            name: '75% Dither',
            apply: (x, y) => !((x % 2 === 1 && y % 2 === 1)) ? 1 : 0
        },
        'lines-horizontal': {
            name: 'Horizontal Lines',
            apply: (x, y) => y % 3 === 0 ? 1 : 0
        },
        'lines-vertical': {
            name: 'Vertical Lines',
            apply: (x, y) => x % 3 === 0 ? 1 : 0
        },
        'cross-hatch': {
            name: 'Cross Hatch',
            apply: (x, y) => (x % 4 === 0 || y % 4 === 0) ? 1 : 0
        },
        'dots': {
            name: 'Dots',
            apply: (x, y) => (x % 4 === 0 && y % 4 === 0) ? 1 : 0
        },
        'diagonal': {
            name: 'Diagonal',
            apply: (x, y) => (x + y) % 3 === 0 ? 1 : 0
        }
    };

    static getPattern(patternName) {
        return this.patterns[patternName] || this.patterns['solid-black'];
    }

    static applyPattern(patternName, x, y) {
        const pattern = this.getPattern(patternName);
        return pattern.apply(x, y);
    }

    static getAllPatternNames() {
        return Object.keys(this.patterns);
    }
}