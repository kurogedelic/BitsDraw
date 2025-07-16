# [BitsDraw](https://kurogedelic.github.io/BitsDraw/)

A web-based bitmap editor specifically designed to generate U8G2-compatible bitmap data in `.h` file format for OLED displays and embedded systems.

## 🎯 Features

### Core Drawing Tools
- **Pencil Tool**: Precise pixel drawing with smooth curves
- **Brush Tool**: Variable size drawing with multiple patterns
- **Shape Tools**: Rectangle, circle, and line tools with modifier key support
- **Selection Tools**: Rectangle and circle selection with copy/paste operations
- **Advanced Text System**: Complete text object management with post-placement editing, multi-line support, and custom fonts
- **Bucket Fill**: Smart fill with contiguous area detection
- **Move Tool**: Layer movement with loop wrapping
- **Guide Tool**: Visual guides for precise positioning

### Animation System 🎬
- **Multi-Sheet Animation**: Create frame-by-frame animations
- **Playback Controls**: Play, pause, stop, and frame navigation
- **Onion Skinning**: Previous frame overlay for animation reference
- **Variable Speed**: 1-30 FPS animation speed control
- **Loop Animation**: Seamless loop playback option
- **GIF Export**: Multi-strategy animated GIF export with quality settings

### Advanced Features
- **Layer System**: Multiple layers with visibility and blending controls
- **Zoom & Pan**: 1x to 32x zoom with Hand tool navigation
- **Pattern System**: MacPaint-inspired patterns with custom pattern support
- **Display Modes**: Multiple color themes (LCD, night mode, amber, etc.)
- **Grid & Guides**: Visual aids for precise editing
- **Undo/Redo**: Complete history system
- **Text Object Management**: Post-placement text editing with selection and movement
- **Custom Font System**: Upload and manage custom bitmap fonts
- **Enhanced Error Handling**: User-friendly error dialogs with recovery suggestions

### Import/Export
- **Image Import**: PNG/JPG with advanced dithering (7 algorithms)
- **U8G2 Export**: Generate C header files for Arduino/ESP32
- **Multiple Formats**: Adafruit GFX, Game Boy 2BPP with optimized encoding
- **PNG Export**: Direct image file export with high-quality rendering
- **GIF Animation Export**: Multi-strategy animated GIF export with quality settings
- **Text Objects**: Import/export text object collections for project templates
- **Custom Fonts**: Import/export custom bitmap font collections
- **Project Management**: Save/load complete BitsDraw project files

## 🚀 Quick Start

### Online Version
Visit [BitsDraw on GitHub Pages](https://kurogedelic.github.io/BitsDraw/) to start drawing immediately.

### Local Development
1. Clone this repository
2. Open `index.html` in any modern browser
3. Start creating bitmap art!

No build process or server required - BitsDraw is a pure static web application.

## 🎨 Animation Workflow

1. **Create Frames**: Use "Add Sheet" to create animation frames
2. **Draw Content**: Create different content on each sheet/frame
3. **Preview Animation**: Use playback controls to test your animation
4. **Onion Skinning**: Enable to see previous frame while drawing
5. **Export**: Generate C code or export as images

## 💻 System Requirements

- Modern web browser (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- No installation required
- Works offline after initial load

## 🛠️ Technical Details

### Architecture
- **Pure Static Web App**: HTML5, CSS3, vanilla JavaScript
- **No Dependencies**: No frameworks or build tools required
- **Canvas API**: Hardware-accelerated bitmap rendering
- **Pixel-Perfect**: Optimized for pixel art creation

### Data Format
- Internal format: `Uint8Array` where 0=white, 1=black
- U8G2 compatible: LSB first, XBM format
- Layer support: Multiple drawing layers with alpha channels

### Browser Compatibility
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 📝 Version History

### v1.1.0 - Advanced Text System & Enhanced Error Handling
- Complete text object management with post-placement editing
- Multi-line text rendering with word wrapping and alignment
- Custom font system with upload, validation, and management
- Enhanced error handling with user-friendly dialogs and recovery
- GIF animation export with multi-strategy encoding and quality settings
- Text object import/export for project templates

### v1.0.7 - Coordinate System Fixes
- Fixed brush cursor positioning during zoom and pan operations
- Corrected text tool modal and preview positioning
- Unified coordinate transformation system
- Eliminated double-offset calculations

### v1.0.6 - Animation System & Onion Skinning
- Complete animation control system with playback
- Advanced onion skinning with smart background detection
- Pan support for onion skin overlay
- Project background management

### v1.0.5 - Pixel-Perfect Shape Tools
- Zoom-aware pixel-perfect preview for shape tools
- Modern About dialog with support links
- Enhanced UI consistency

### v1.0.4 - Text Tool Enhancement
- Multi-font support (5×7, 3×5, 7×9)
- Modern modal dialog system
- Live text preview

### v1.0.3 - MacPaint Pattern System
- Authentic MacPaint patterns
- Viewport navigation with red frame preview
- Streamlined interface

## 🤝 Contributing

This project welcomes contributions! Areas for improvement:
- Additional export formats
- More drawing tools
- Enhanced animation features
- Performance optimizations

## 📄 License

Copyright © 2025 Leo Kuroshita. All rights reserved.

## 🙏 Acknowledgments

Tribute to Bill Atkinson and Susan Kare for their pioneering work in bitmap graphics and user interface design.

## ☕ Support

If you find BitsDraw useful, consider [buying me a coffee](https://www.buymeacoffee.com/kurogek)!
