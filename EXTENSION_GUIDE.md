# BitsDraw Extension Guide - Frame/Tile/Animation System

## 🎯 Vision Statement

Transform BitsDraw from a simple bitmap editor into a comprehensive **1-bit Canvas System** that unifies graphics, tiles, fonts, and animations under a single, elegant data structure.

## 🧩 Core Architecture

### Unified Data Model: CanvasUnit

```javascript
CanvasUnit = {
  id: [frame, tile, layer],  // Universal 3D coordinate system
  pixels: Uint8Array(w*h),   // 1-bit bitmap data (0=white, 1=black)
  meta: {
    name: string,
    locked: boolean,
    visible: boolean,
    tags: string[],         // For categorization
    created: timestamp,
    modified: timestamp
  }
}
```

All content types (graphics, tiles, fonts, animations) are composed of CanvasUnits with different ID patterns:
- **Graphics**: `[0, 0, *]` - Single frame, single tile, multiple layers
- **Tilesets**: `[0, *, 0]` - Single frame, multiple tiles, single layer
- **Fonts**: `[0, *, 0]` - Tiles mapped to character codes
- **Animations**: `[*, 0, *]` - Multiple frames, single tile, multiple layers

## 📂 Project Structure

```
Project/
├─ Graphics/     # Traditional layered images
├─ Tilesets/     # Sprite sheets and tile collections
├─ Fonts/        # Bitmap fonts with character mapping
├─ Animations/   # Frame-based animations
├─ Tilemaps/     # 2D arrays referencing tiles
└─ Exports/      # Generated files (.h, .png, .gif, etc.)
```

## 🔄 View Modes

### 1. Canvas View (Current)
- **Display**: Single canvas with layer stack
- **ID Pattern**: `[0, 0, 0-n]`
- **Use Cases**: Illustrations, UI screens, backgrounds
- **Existing Features**: All current BitsDraw functionality

### 2. Tile View (New)
- **Display**: Grid of tiles with configurable columns
- **ID Pattern**: `[0, 0-n, 0]`
- **Use Cases**: Sprite sheets, icon sets, pattern libraries
- **Features**:
  - Tile size presets (8x8, 16x16, 32x32, custom)
  - Drag & drop reordering
  - Batch operations on multiple tiles
  - Animation preview for selected tiles

### 3. Timeline View (New)
- **Display**: Horizontal timeline with frame thumbnails
- **ID Pattern**: `[0-n, 0, 0-n]`
- **Use Cases**: Sprite animations, UI transitions
- **Features**:
  - Frame management (add, duplicate, delete)
  - Onion skinning
  - Playback controls with FPS setting
  - Per-layer timing offsets

## 🛠️ Implementation Roadmap

### Phase 1: Core Infrastructure (Priority: HIGH)

#### 1.1 Data Layer
```javascript
// Extend OptimizedBitmapEditor
class CanvasUnitManager {
  constructor() {
    this.units = new Map(); // "f-t-l" → CanvasUnit
    this.activeUnit = null;
    this.viewMode = 'canvas';
  }
  
  getUnit(frame, tile, layer) {
    return this.units.get(`${frame}-${tile}-${layer}`);
  }
  
  setUnit(frame, tile, layer, pixels, meta) {
    const unit = new CanvasUnit(frame, tile, layer);
    unit.pixels = pixels;
    unit.meta = { ...unit.meta, ...meta };
    this.units.set(unit.getKey(), unit);
  }
  
  // Pattern-based operations
  copyUnits(sourcePattern, destPattern) {
    // Implement wildcard matching: "1-*-0" → "2-*-0"
  }
}
```

#### 1.2 Migration Strategy
- Wrap existing layer system with CanvasUnit interface
- Maintain backward compatibility
- Gradual migration of features

### Phase 2: Tile View Implementation

#### 2.1 UI Components
```html
<!-- Add to index.html -->
<div id="tile-view-window" class="window-panel" style="display:none;">
  <div class="window-title-bar">
    <span class="window-title">Tile View</span>
    <div class="window-controls">...</div>
  </div>
  <div class="window-content">
    <div id="tile-view-toolbar">
      <select id="tile-size-select">
        <option value="8">8×8</option>
        <option value="16" selected>16×16</option>
        <option value="32">32×32</option>
        <option value="custom">Custom...</option>
      </select>
      <input type="number" id="tile-columns" value="8" min="1" max="32">
    </div>
    <div id="tile-grid-container">
      <div id="tile-grid"></div>
    </div>
    <div id="tile-properties-panel">
      <!-- Tile metadata editor -->
    </div>
  </div>
</div>
```

#### 2.2 Tile Grid Renderer
```javascript
class TileGridRenderer {
  constructor(container, unitManager) {
    this.container = container;
    this.unitManager = unitManager;
    this.tileSize = 16;
    this.columns = 8;
    this.selectedTiles = new Set();
  }
  
  render() {
    // Get all tiles: [0, *, 0]
    const tiles = this.unitManager.getUnitsByPattern(0, '*', 0);
    
    tiles.forEach((unit, index) => {
      const canvas = this.createTileCanvas(unit);
      const wrapper = this.createTileWrapper(canvas, index);
      this.container.appendChild(wrapper);
    });
  }
  
  createTileCanvas(unit) {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    // Render unit.pixels to canvas
    return canvas;
  }
}
```

### Phase 3: Animation System

#### 3.1 Timeline Component
```javascript
class Timeline {
  constructor(unitManager) {
    this.unitManager = unitManager;
    this.currentFrame = 0;
    this.fps = 12;
    this.playing = false;
    this.onionSkin = { enabled: true, opacity: 0.3, frames: 2 };
  }
  
  play() {
    this.playing = true;
    this.animationLoop();
  }
  
  animationLoop() {
    if (!this.playing) return;
    
    this.currentFrame = (this.currentFrame + 1) % this.getFrameCount();
    this.renderFrame(this.currentFrame);
    
    setTimeout(() => this.animationLoop(), 1000 / this.fps);
  }
}
```

### Phase 4: Advanced Features

#### 4.1 Smart Copy Tool
```javascript
class SmartCopyTool {
  constructor(unitManager) {
    this.unitManager = unitManager;
  }
  
  // Copy with pattern matching
  copyPattern(sourcePattern, destBase) {
    // Parse patterns like "1-*-0" or "*-1-*"
    const source = this.parsePattern(sourcePattern);
    const dest = this.parsePattern(destBase);
    
    // Find matching units and copy
    const matches = this.unitManager.findByPattern(source);
    matches.forEach(unit => {
      const newId = this.applyDestPattern(unit.id, source, dest);
      this.unitManager.copyUnit(unit.id, newId);
    });
  }
}
```

#### 4.2 Cross-Mode Operations
- **Canvas → Tiles**: Split layers into individual tiles
- **Tiles → Canvas**: Compose tiles into layered image
- **Tiles → Animation**: Create animation from tile sequence
- **Animation → Tiles**: Extract frames as tile set

## 📋 Development Guidelines

### For Claude Code:

1. **Maintain Backward Compatibility**
   - Never break existing BitsDraw functionality
   - Use adapter patterns for legacy code
   - Provide migration paths for old projects

2. **Performance First**
   - Leverage existing optimizations (dirty rectangles, batch operations)
   - Use virtual scrolling for large tile sets
   - Implement lazy loading for animations

3. **Incremental Development**
   - Each feature should be independently testable
   - Use feature flags for experimental features
   - Maintain stable and experimental branches

4. **UI/UX Consistency**
   - Follow existing BitsDraw UI patterns
   - Reuse window management system
   - Keep tool interactions consistent across modes

### Code Style Guidelines

```javascript
// Use consistent naming for CanvasUnit operations
getUnit(f, t, l)           // Single unit access
getUnitsByPattern(f, t, l) // Pattern matching (supports wildcards)
setUnit(f, t, l, data)     // Single unit update
batchSetUnits(operations)  // Batch updates

// Event naming convention
'unit:created'   // When new CanvasUnit is created
'unit:updated'   // When CanvasUnit is modified
'unit:deleted'   // When CanvasUnit is removed
'view:changed'   // When view mode switches
```

### Testing Checklist

- [ ] Canvas view maintains all current functionality
- [ ] Mode switching preserves unsaved changes
- [ ] Undo/redo works across all modes
- [ ] Export formats support new data structures
- [ ] Performance remains smooth with 1000+ tiles
- [ ] Memory usage is reasonable for large projects

## 🚀 Future Possibilities

### Extended Features
1. **Palette System**: Multiple color palettes for display modes
2. **Tag-Based Filtering**: Organize tiles/animations by tags
3. **Template Library**: Reusable component system
4. **Collaborative Editing**: Real-time multi-user support

### Export Enhancements
1. **Game Engine Formats**: Unity, Godot, GameMaker
2. **Animation Formats**: APNG, WebP, Lottie
3. **Font Formats**: BMFont, AngelCode
4. **Tilemap Formats**: Tiled, LDTK

### Tool Integrations
1. **Asset Pipeline**: Automated sprite sheet generation
2. **Version Control**: Git-friendly project format
3. **Cloud Sync**: Project backup and sharing
4. **Plugin System**: Extensible tool architecture

## 📝 Migration Path for Current Users

### Phase 1: Transparent Update
- Existing projects continue to work unchanged
- New features appear as optional menu items
- Data internally stored as CanvasUnits

### Phase 2: Gradual Adoption
- Conversion tools for existing projects
- Tutorial mode for new features
- Import/export compatibility layer

### Phase 3: Full Integration
- Unified project format
- Seamless mode switching
- Advanced features enabled by default

## 🎯 Success Metrics

1. **User Experience**
   - Mode switching < 100ms
   - No data loss during conversions
   - Intuitive UI without documentation

2. **Performance**
   - 60 FPS with 1000 tiles
   - < 100MB RAM for typical projects
   - Instant save/load operations

3. **Compatibility**
   - 100% backward compatibility
   - All export formats maintained
   - Cross-platform consistency

---

This guide serves as the north star for BitsDraw's evolution into a comprehensive 1-bit graphics system. Each implementation step should refer back to these principles and patterns to ensure consistency and quality.