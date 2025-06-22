# [BitsDraw v1.0.4](https://kurogedelic.github.io/BitsDraw/)

A professional web-based bitmap editor designed specifically for creating graphics compatible with U8G2 monochrome displays. Perfect for Arduino, ESP32, and embedded display projects.

## Overview

BitsDraw eliminates the need for external tools like image2cpp by providing a complete in-browser solution for creating and converting bitmap graphics for embedded displays. Features professional drawing tools, multiple dithering algorithms, advanced image import capabilities, authentic MacPaint-style patterns, and multi-format export options optimized for embedded development.

**Key Features:**
- Professional drawing tools with smooth spline interpolation
- Advanced image import with 7 dithering algorithms
- Multi-layer bitmap editor with alpha channel support
- MacPaint-inspired pattern system with 9 authentic patterns
- Real-time preview with viewport navigation
- Export to U8G2, Adafruit GFX, Playdate PDI, and Game Boy 2BPP formats
- Streamlined flat interface optimized for drawing workflows

## Live Demo

🎨 **[Try BitsDraw Online](https://kurogedelic.github.io/BitsDraw/)**

## Quick Start

1. **Local Usage**: Download and open `index.html` in any modern browser
2. **GitHub Pages**: Visit the live demo link above
3. **No installation required** - Pure static web application

## Recent Updates (v1.0.4)

### ✨ New Features
- **MacPaint Pattern System**: 9 authentic patterns (solid black/white, checkerboard, stripes, bricks, dots)
- **Pattern Management**: Add/remove custom patterns with [+] and [-] header buttons
- **Viewport Navigation**: Red frame preview with drag-to-scroll functionality
- **Streamlined Interface**: Flat canvas window without decorative chrome

### 🐛 Fixes
- Fixed dithering effect dialog preview generation
- Corrected viewport frame alignment with centered canvas
- Resolved pattern drawing color mapping issues
- Improved layer compositing with proper priority handling

### 🎨 UI Improvements
- Removed unnecessary UI clutter (column handles, redundant controls)
- Enhanced pattern panel with 3-column grid layout
- Improved color panel design with primary/secondary indicators
- Added visual feedback for pattern management buttons

## License

MIT License

Copyright (c) 2024 kurogedelic

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.