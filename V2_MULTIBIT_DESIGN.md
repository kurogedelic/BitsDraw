# BitsDraw v2.0 Multi-Bit Support Design

## Overview

BitsDraw v2.0 will extend beyond the current 1-bit (black/white) limitation to support **multi-bit color depths**, enabling grayscale and multi-color bitmap creation for modern embedded systems and broader applications.

## Color Depth Support

### Supported Bit Depths
1. **1-bit** (Current) - Pure black/white, legacy compatibility
2. **2-bit** - 4 grayscale levels (black, dark gray, light gray, white)
3. **4-bit** - 16 grayscale levels or 16-color palettes
4. **8-bit** - 256 grayscale levels or indexed color

### Target Use Cases
- **e-ink displays** (2-bit, 4-bit grayscale)
- **OLED displays** with grayscale support
- **Game Boy-style graphics** (2-bit, 4-color)
- **Retro computer graphics** (4-bit, 16-color)
- **Industrial displays** with limited color palettes

## Technical Architecture

### 1. Core Data Structure Changes

#### Pixel Storage Evolution
```javascript
// v1.0: 1-bit storage
pixels: Uint8Array  // 0 = white, 1 = black

// v2.0: Multi-bit storage
class MultiBitmap {
  constructor(width, height, bitDepth = 1) {
    this.width = width;
    this.height = height;
    this.bitDepth = bitDepth;  // 1, 2, 4, or 8
    this.pixelsPerByte = 8 / bitDepth;
    this.pixels = new Uint8Array(Math.ceil((width * height * bitDepth) / 8));
    this.palette = this.createDefaultPalette(bitDepth);
  }
}
```

#### Bit-Packed Storage
```javascript
// Efficient bit packing for different depths
class BitPackedArray {
  getPixel(x, y) {
    const pixelIndex = y * this.width + x;
    const bitIndex = pixelIndex * this.bitDepth;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitOffset = bitIndex % 8;
    
    const mask = (1 << this.bitDepth) - 1;
    return (this.pixels[byteIndex] >> (8 - bitOffset - this.bitDepth)) & mask;
  }
  
  setPixel(x, y, value) {
    const pixelIndex = y * this.width + x;
    const bitIndex = pixelIndex * this.bitDepth;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitOffset = bitIndex % 8;
    
    const mask = (1 << this.bitDepth) - 1;
    this.pixels[byteIndex] = 
      (this.pixels[byteIndex] & ~(mask << (8 - bitOffset - this.bitDepth))) |
      ((value & mask) << (8 - bitOffset - this.bitDepth));
  }
}
```

### 2. Palette System

#### Default Palettes
```javascript
const DEFAULT_PALETTES = {
  1: [0x000000, 0xFFFFFF],                          // Black, White
  2: [0x000000, 0x555555, 0xAAAAAA, 0xFFFFFF],     // 4-level grayscale
  4: [  // 16-level grayscale
    0x000000, 0x111111, 0x222222, 0x333333,
    0x444444, 0x555555, 0x666666, 0x777777,
    0x888888, 0x999999, 0xAAAAAA, 0xBBBBBB,
    0xCCCCCC, 0xDDDDDD, 0xEEEEEE, 0xFFFFFF
  ],
  8: generateGrayscalePalette(256)                   // 256-level grayscale
};

const THEMED_PALETTES = {
  gameboy: [0x0F2027, 0x306850, 0x86A666, 0xC4CFA1],
  amber: [0x000000, 0x553000, 0xAA6600, 0xFFAA00],
  bluescale: [0x000033, 0x003366, 0x0066AA, 0x00AAFF]
};
```

#### Custom Palette Editor
- **Color picker** for each palette entry
- **Import/export** palette files (.pal, .act, .gpl)
- **Palette presets** for common use cases
- **Gradient generation** for smooth palette creation

### 3. Rendering Engine Changes

#### Multi-Bit Canvas Rendering
```javascript
class MultiBitRenderer {
  renderToCanvas(ctx, bitmap, zoom = 1) {
    const imageData = ctx.createImageData(
      bitmap.width * zoom, 
      bitmap.height * zoom
    );
    
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        const paletteIndex = bitmap.getPixel(x, y);
        const color = bitmap.palette[paletteIndex];
        
        // Fill zoom×zoom area with this color
        this.fillPixelArea(imageData, x, y, zoom, color);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}
```

#### Display Mode Support
```javascript
const DISPLAY_MODES = {
  // v1.0 compatibility
  black: { invert: false, palette: 'default' },
  white: { invert: true, palette: 'default' },
  
  // v2.0 additions
  grayscale: { palette: 'grayscale', gamma: 1.0 },
  gameboy: { palette: 'gameboy', gamma: 1.2 },
  amber: { palette: 'amber', scanlines: true },
  terminal: { palette: 'terminal', phosphor: true }
};
```

## UI/UX Design Changes

### 1. Color Picker Evolution

#### Current (1-bit)
```
[●] Primary: Black    [○] Secondary: White
```

#### v2.0 (Multi-bit)
```
┌─ Palette ────────────────────────┐
│ [■][■][■][■][■][■][■][■]          │
│ [■][■][■][■][■][■][■][■]          │
│ Primary: ■ (Gray-7)              │
│ Secondary: ■ (Gray-2)            │
│ [ Edit Palette ] [ Load Preset ] │
└──────────────────────────────────┘
```

### 2. Project Creation Dialog

#### New Project Options
```
┌─ New Project ─────────────────────┐
│ Canvas Size: [64] × [64] pixels   │
│                                   │
│ Color Mode:                       │
│ ○ 1-bit (Black/White)             │
│ ○ 2-bit (4 Grayscale)             │ 
│ ● 4-bit (16 Grayscale)            │
│ ○ 8-bit (256 Grayscale)           │
│                                   │
│ Palette Preset:                   │
│ [Grayscale ▼] [ Preview ]         │
│                                   │
│ [ Create ] [ Cancel ]             │
└───────────────────────────────────┘
```

### 3. Tools Adaptation

#### Brush Tool Enhancement
- **Pressure sensitivity** for grayscale values
- **Opacity control** for all tools
- **Dithering modes** for smooth gradients
- **Anti-aliasing** options

#### New Tools for Multi-bit
- **Gradient Tool** - Linear/radial gradients
- **Eyedropper** - Sample colors from canvas (now viable!)
- **Color Replace** - Replace one palette color with another
- **Histogram** - Visual color distribution analysis

### 4. Layer System Updates

#### Enhanced Blending Modes
```javascript
const BLEND_MODES = {
  normal: (a, b) => b,
  multiply: (a, b) => Math.floor((a * b) / maxValue),
  screen: (a, b) => maxValue - Math.floor(((maxValue - a) * (maxValue - b)) / maxValue),
  overlay: (a, b) => a < maxValue/2 ? 
    multiply(a, b) : screen(a, b),
  darken: (a, b) => Math.min(a, b),
  lighten: (a, b) => Math.max(a, b)
};
```

## Export Format Extensions

### 1. Code Generation Updates

#### Multi-bit C Array Export
```c
// 4-bit example output
const uint8_t my_bitmap_4bit[] PROGMEM = {
  0x01, 0x23,  // Pixel values packed: 0,1,2,3
  0x45, 0x67,  // Pixels: 4,5,6,7
  // ... more data
};

// Palette data
const uint16_t my_bitmap_palette[] PROGMEM = {
  0x0000, 0x2104, 0x4208, 0x630C,  // RGB565 colors
  0x8410, 0xA514, 0xC618, 0xE71C,
  // ... 16 total colors
};
```

#### Target Platform Support
```c
// Arduino/ESP32
#include "BitsDraw_4bit.h"
display.drawBitmap(x, y, my_bitmap_4bit, palette, 32, 32, 4);

// Playdate SDK  
LCDBitmap* bitmap = playdate->graphics->newBitmap(32, 32, kColorWhite);
playdate->graphics->setBitmapMask(bitmap, my_bitmap_4bit);

// Game Boy / Z80
ld hl, my_bitmap_4bit
ld de, VRAM_ADDR
ld bc, 256    ; Copy 256 bytes
ldir          ; Block copy to VRAM
```

### 2. Image Export Enhancements

#### Advanced PNG Export
- **Indexed color** for palette-based images
- **Grayscale** optimization for non-color images
- **Alpha channel** support for transparency
- **Metadata** embedding (palette info, bit depth)

#### New Export Formats
- **BMP** with custom bit depths
- **GIF** with optimized palettes  
- **ICO** for icon creation
- **Raw binary** for embedded systems

## Migration Strategy

### 1. Backward Compatibility

#### Automatic Migration
```javascript
// Migrate v1.0 projects to v2.0
function migrateToMultiBit(v1Project) {
  return {
    ...v1Project,
    version: "2.0",
    bitDepth: 1,  // Preserve 1-bit mode
    palette: [0x000000, 0xFFFFFF],  // Black/white palette
    sheets: v1Project.sheets?.map(sheet => ({
      ...sheet,
      bitDepth: 1,
      palette: [0x000000, 0xFFFFFF]
    }))
  };
}
```

#### Legacy Mode Toggle
- **1-bit compatibility mode** for existing workflows
- **One-click upgrade** to multi-bit for specific sheets
- **Batch conversion** tools for migrating projects

### 2. Gradual Feature Introduction

#### Phase 1: Infrastructure
- Multi-bit data structures
- Bit-packed storage system
- Basic palette support
- Canvas rendering engine

#### Phase 2: UI Integration  
- Color picker redesign
- Tool adaptations
- Display mode support
- Export format updates

#### Phase 3: Advanced Features
- Custom palette editor
- Gradient tools
- Advanced blending modes
- Optimization tools

## Performance Considerations

### 1. Memory Optimization

#### Efficient Storage
```javascript
// Memory usage comparison (64×64 canvas)
const pixels_1bit = 64 * 64 / 8;      // 512 bytes
const pixels_2bit = 64 * 64 / 4;      // 1,024 bytes  
const pixels_4bit = 64 * 64 / 2;      // 2,048 bytes
const pixels_8bit = 64 * 64;          // 4,096 bytes

// Plus palette storage
const palette_4bit = 16 * 3;          // 48 bytes (RGB)
const palette_8bit = 256 * 3;         // 768 bytes (RGB)
```

#### Smart Loading
- **Lazy palette loading** for large projects
- **Compressed storage** for unused palette entries
- **Memory pooling** for frequent operations

### 2. Rendering Performance

#### Canvas Optimization
- **Dirty rectangle** tracking for partial redraws
- **WebGL acceleration** for large canvases
- **Worker threads** for complex operations
- **Tile-based rendering** for zoom operations

## Development Roadmap

### v2.0 Release Scope
**Core Features** (Must Have):
- 2-bit and 4-bit support
- Basic palette system  
- Multi-bit export (C arrays, PNG)
- Legacy 1-bit compatibility
- Simple grayscale tools

**Enhanced Features** (Should Have):
- Custom palette editor
- Eyedropper tool
- Gradient tool
- Display mode themes

**Advanced Features** (Could Have):
- 8-bit support
- Complex blending modes
- Advanced export formats
- Performance optimizations

### Future Versions (v2.1+)
- **Color support** (RGB palettes)
- **Animation** with multi-bit frames
- **Vector tools** for scalable graphics
- **Texture mapping** for 3D applications

## Success Metrics

### Technical Goals
- **100% backward compatibility** with v1.x projects
- **<50% memory increase** for equivalent 1-bit projects
- **Rendering performance** within 10% of v1.x speeds
- **Export compatibility** with major embedded platforms

### User Experience Goals  
- **Zero learning curve** for 1-bit mode users
- **Intuitive progression** from 1-bit to multi-bit
- **Professional results** for grayscale graphics
- **Seamless integration** with existing workflows

### Platform Support
- **Arduino/ESP32** multi-bit display libraries
- **Playdate** grayscale development
- **Game Boy** homebrew development
- **e-ink display** applications

This design positions BitsDraw v2.0 as the definitive tool for multi-bit bitmap creation, expanding from its 1-bit origins while maintaining the simplicity and embedded-systems focus that makes it unique in the market.