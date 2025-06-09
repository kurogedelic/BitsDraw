# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BitsDraw is a web-based bitmap editor specifically designed to generate U8G2-compatible bitmap data in `.h` file format. The goal is to eliminate the need for external tools like image2cpp by providing real-time drawing, inversion, and scaling capabilities.

## Architecture

This is a **pure static web application** using vanilla HTML5, CSS3, and JavaScript with **no build process required**. The core components are:

- **Canvas API**: For bitmap editing and preview rendering with multiple zoom levels
- **File API**: For output copying and file import/export
- **Data Structure**: Uint8Array pixel arrays where 1=black, 0=white
- **Layer System**: Multiple drawing layers with visibility controls
- **Tool System**: Comprehensive drawing tools (pencil, brush, shapes, selection, etc.)
- **Guide System**: Visual guides for precise positioning and measurements

## Current Directory Structure

```
/BitsDraw
  ├── index.html                 # Main HTML structure and entry point
  ├── main.js                    # Core application logic
  ├── style.css                  # Complete CSS styling
  ├── package.json               # Project metadata (no build dependencies)
  ├── /icons                     # Application icons
  ├── /utils                     # Core utility modules
  │     ├── optimizedBitmap.js   # Core bitmap operations
  │     ├── export.js            # U8G2 .h file generation
  │     ├── imageImport.js       # Advanced image import with dithering
  │     ├── imagePlacementDialog.js # Image placement UI and processing
  │     ├── ditheringEffects.js  # Dithering algorithms
  │     ├── menuManager.js       # Menu system management
  │     ├── windowManager.js     # Window management
  │     ├── toolManager.js       # Tool selection and management
  │     ├── dialogManager.js     # Dialog systems
  │     └── textRenderer.js      # Text rendering
  └── /src                       # Refactored architecture (in progress)
```

## Deployment

This is a **static web application** that requires no build process:

### GitHub Pages Deployment
1. **Direct hosting**: All files can be served directly from the repository root
2. **No compilation needed**: Pure HTML/CSS/JavaScript
3. **Instant updates**: Push to main branch → automatically deployed
4. **Simple setup**: GitHub Settings → Pages → Source: "main branch"

### Local Development
- Open `index.html` directly in any modern browser
- No server required for basic functionality
- File protocol works for all core features

## Implemented Features

### Core Drawing Tools
- **Pencil Tool**: Basic pixel drawing with smooth drawing option using Catmull-Rom spline interpolation
- **Bucket Fill**: Fill areas with contiguous option
- **Selection Tools**: Rectangle and circle selection with copy/paste/cut operations
- **Shape Tools**: Rectangle, circle/oval, line with border/fill options and modifier key support (Shift for perfect circles, Alt for center mode)
- **Spray Tool**: Configurable radius and density
- **Text Tool**: Bitmap text rendering
- **Move Tool**: Move graphics with loop wrapping option
- **Guide Tool**: Create visual guides for positioning

### Advanced Features
- **Layer System**: Multiple layers with visibility controls and priority-based blending
- **Dithering**: 6 algorithms (Bayer 2x2/4x4/8x8, Floyd-Steinberg, Burkes, Atkinson) with alpha transparency simulation
- **Display Modes**: Multiple color schemes (LCD, night mode, amber, etc.)
- **MacPaint Pattern System**: 9 authentic patterns with alpha-only format and primary/secondary color mapping
- **Viewport Navigation**: Red frame preview with drag-to-scroll for large canvases
- **Zoom System**: 1x to 32x zoom with pixel-perfect rendering
- **Grid Display**: Toggle grid overlay for precise editing
- **Undo/Redo**: Complete history system

### Import/Export
- **Image Import**: PNG/JPG import with advanced processing options:
  - Multiple dithering algorithms (Floyd-Steinberg, Atkinson, Burkes, Bayer 2×2/4×4/8×8)
  - Color inversion (black/white swapping)
  - Advanced alpha channel handling (white-to-alpha, black-to-alpha, preserve, force opaque)
  - Real-time preview with resize handles
- **CPP Export**: U8G2, Adafruit GFX, Playdate PDI, Game Boy 2BPP formats
- **PNG Export**: Direct PNG file export
- **Guide Export**: Export guides as reference data

## Key Technical Implementation

### Bitmap Data Structure
- Uses `Uint8Array` for memory-efficient pixel storage
- 1D array indexing: `index = y * width + x`
- Pixel values: `0 = white, 1 = black` (internal format)
- Display inversion handled at render time only

### Canvas Rendering
- Pixel-perfect rendering with `image-rendering: pixelated`
- Real-time zoom with efficient redraw system
- Multiple display modes with color theming
- Grid overlay system for precise editing

### Dithering System
- **Ordered Dithering**: Bayer matrix implementation (2×2, 4×4, 8×8)
- **Error Diffusion**: Floyd-Steinberg, Burkes, Atkinson algorithms
- **Alpha Simulation**: Variable transparency through fill rate control
- **Real-time Preview**: Side-by-side comparison with 8x zoom

### Image Import System
- **Professional Dithering**: 7 industry-standard algorithms for optimal bitmap conversion
- **Color Processing**: RGB to grayscale conversion with proper luminance weighting (0.299R + 0.587G + 0.114B)
- **Alpha Channel Modes**: 5 different transparency handling methods
- **Memory Efficient**: Float32Array for processing, Uint8Array for final bitmap data
- **Real-time Processing**: All changes update preview immediately with optimized algorithms

### Smooth Drawing
- Catmull-Rom spline interpolation for smooth curves
- Adaptive sampling based on brush size and distance
- Stroke point buffering for performance
- Connected to Pencil tool "Smooth" checkbox

### MacPaint Pattern System
- **Alpha-Only Format**: Patterns use 8×8 alpha arrays (0=secondary color, 1=primary color)
- **Primary/Secondary Mapping**: Left click uses primary color, right click uses secondary
- **Built-in Patterns**: 9 authentic MacPaint patterns with historical accuracy
- **Custom Pattern Support**: Users can create and manage custom patterns
- **LocalStorage Persistence**: Custom patterns saved automatically
- **Pattern Management UI**: [+] and [-] buttons in header with visual feedback

## Development Guidelines

### Code Style
- **Pure vanilla JavaScript** (no frameworks or build tools)
- ES6+ features where appropriate
- Modular utility functions in `/utils`
- Event-driven architecture with proper cleanup
- **No transpilation required** - code runs directly in browsers

### Performance Considerations
- Efficient pixel manipulation using TypedArrays
- Minimal DOM updates during drawing operations
- Optimized redraw regions when possible
- Memory management for large canvases
- **Client-side only** - no server dependencies

### UI/UX Principles
- Photoshop-style windowing system
- Keyboard shortcuts for all major functions
- Visual feedback for all operations
- Dark/light theme support

## Output Formats

### U8G2 Format (Primary)
```c
const unsigned char my_bitmap[] PROGMEM = {
  0xFF, 0x81, 0x81, 0xFF  // LSB first, XBM format
};
```

### Adafruit GFX Format
```c
const unsigned char my_bitmap[] PROGMEM = {
  0xFF, 0x81, 0x81, 0xFF  // MSB first
};
```

### Guide Export Format
```javascript
{
  guides: [
    { name: "Guide 1", x: 10, y: 20, width: 100, height: 50, color: "#ff0000" }
  ]
}
```

## Future Development Tasks

### Text Tool Enhancement (Priority: Medium)

#### Current Implementation Analysis
The current text tool provides basic functionality but has significant limitations:

**✅ Implemented Features:**
- Basic text input system with click-to-place balloon UI
- TextRenderer class with 5×7 pixel bitmap font
- Character set: A-Z, 0-9, space (37 characters total)
- Pattern application support for dithered text
- Canvas boundary checking and automatic uppercase conversion
- Simple balloon interface with check/cancel buttons

**❌ Current Limitations:**
1. **Limited Character Set**: No lowercase, symbols, punctuation, or international characters
2. **No Font Options**: Fixed 5×7 bitmap font only, no size variations
3. **Basic UI**: Simple input field without preview or formatting options
4. **No Text Editing**: Cannot modify text after placement (only undo available)
5. **Single Line Only**: No multi-line text support
6. **No Text Management**: No way to select, move, or delete placed text independently

#### Proposed Enhancements

**Phase 1: Extended Character Set**
- Add lowercase letters (a-z)
- Include common symbols: `!@#$%^&*()_+-=[]{}|;':\",./<>?`
- Add punctuation and special characters
- Implement fallback character for unsupported glyphs

**Phase 2: Font System Improvements**
- Multiple font sizes (1x, 2x, 3x scaling)
- Alternative font styles (bold, condensed)
- Variable-width font support for better readability
- Custom font loading capability

**Phase 3: Advanced Text Features**
- Real-time text preview on canvas before placement
- Multi-line text support with line breaks
- Text alignment options (left, center, right)
- Character spacing and line height controls
- Text bounding box visualization

**Phase 4: Text Management System**
- Text object system for post-placement editing
- Select and modify existing text
- Move, resize, and delete text objects
- Text layers separate from bitmap layers
- Copy/paste text with formatting

**Technical Implementation Notes:**
- Current TextRenderer class at `/utils/textRenderer.js`
- Font data stored as 2D arrays (7 rows × 5 columns per character)
- Integration point: `addTextFromBalloon()` method in main.js:2186
- UI elements: Text balloon at index.html:624-633

**Files to Modify:**
- `utils/textRenderer.js` - Extend font system and rendering
- `main.js` - Enhance text tool UI and text management
- `index.html` - Improve text input dialog with options
- `style.css` - Enhanced text tool styling and preview

## Testing and Development

### Local Testing
Since this is a static web application, testing is straightforward:
- **Open `index.html`** directly in any modern browser
- **No build step required** - changes are immediately visible
- **Browser dev tools** for debugging and console inspection

### Verification Checklist
When making changes, verify functionality with:
- Drawing tools work correctly (including modifier keys for circle tool)
- Undo/redo system functions
- Export generates valid C code
- Import handles various image formats with all dithering algorithms
- Alpha channel handling works correctly in imported images
- Color inversion functions properly
- Real-time preview updates for all image processing options
- No console errors during normal operation

### Browser Compatibility
- Chrome 60+ ✅
- Firefox 55+ ✅  
- Safari 12+ ✅
- Edge 79+ ✅

## Recent Enhancements (Completed)

### v1.0.3 Major UI/UX Overhaul
**MacPaint-Inspired Pattern System:**
- **9 Authentic Patterns**: Solid black/white, checkerboard, diagonal checkerboard, horizontal/vertical/diagonal stripes, bricks, dots
- **Alpha-Only Pattern Format**: Patterns use 8×8 alpha arrays with primary/secondary color mapping
- **Pattern Management UI**: [+] and [-] buttons in PATTERNS header for adding/removing custom patterns
- **Visual Protection**: Built-in patterns cannot be deleted, clear user feedback

**Streamlined Interface:**
- **Flat Canvas Window**: Removed title bar and borders for distraction-free editing
- **Removed UI Clutter**: Eliminated column resize handles and redundant controls
- **Enhanced Color Panel**: Redesigned primary/secondary color indicators
- **3-Column Pattern Grid**: Organized pattern display for better usability

**Viewport Navigation System:**
- **Red Frame Preview**: Shows currently visible canvas area in Preview panel
- **Drag-to-Scroll**: Drag red frame to navigate large canvases at high zoom
- **Accurate Alignment**: Fixed centering offset calculations for proper frame positioning
- **Responsive Updates**: Frame updates automatically with zoom and scroll changes

### Critical Bug Fixes
**Dithering System Repair:**
- **Fixed Preview Generation**: Resolved undefined `originalPixels` error in dithering dialog
- **Proper Data Flow**: `setupDitheringPreview()` now correctly populates layer data
- **All Algorithms Working**: Bayer matrices, Floyd-Steinberg, Burkes, Atkinson fully functional

**Pattern System Corrections:**
- **Fixed Color Mapping**: Corrected inverted primary/secondary color logic
- **Layer Compositing**: Changed from OR operation to proper layer priority blending
- **Alpha Channel Support**: Full transparency handling in pattern application

**Canvas Window Enhancement:**
- **Disabled Window Dragging**: Canvas window no longer moveable or resizable
- **Protected Title Updates**: Added null checks for hidden title bar elements
- **Seamless Integration**: Canvas appears as integral part of workspace

### Technical Improvements
**Files Enhanced:**
- `utils/patterns.js` - Complete rewrite with alpha-only format and MacPaint patterns
- `main.js` - Fixed dithering preview, viewport navigation, pattern management
- `style.css` - Flat canvas window, enhanced UI styling, pattern grid layout
- `utils/optimizedBitmap.js` - Corrected pattern application and layer blending

**Architecture Refinements:**
- **Removed WASM Dependencies**: Eliminated unused WebAssembly infrastructure
- **Pure Static Hosting**: Zero build process, direct GitHub Pages compatibility
- **Modular Pattern System**: Extensible pattern format with storage persistence
- **Optimized Rendering**: Efficient viewport frame calculations and canvas updates

### Previous Major Features

### PNG Reading Optimization
**Added comprehensive image processing capabilities:**
- **7 Dithering Algorithms**: Floyd-Steinberg, Atkinson, Burkes, Bayer 2×2/4×4/8×8, plus simple threshold
- **Color Inversion**: Black/white color swapping for imported images
- **Advanced Alpha Channel Handling**: 5 modes (ignore, preserve, white-to-alpha, black-to-alpha, force opaque)
- **Enhanced UI**: New controls in image placement dialog for all processing options
- **Real-time Preview**: All processing changes update immediately
- **Layer Integration**: Full alpha channel support in the layer system

### Circle Tool Enhancement
**Replaced radio button options with modifier key functionality:**
- **Oval Drawing**: Default behavior draws ovals/ellipses
- **Perfect Circles**: Hold Shift key for perfect circles
- **Center Mode**: Hold Alt/Option key to draw from center point
- **Combined Modes**: Shift+Alt for perfect circles from center
- **Applied to Both**: Circle tool and Circle Select tool use same modifier system

**Result**: Professional bitmap editor with MacPaint-inspired workflow and modern web technology