# BitsDraw v1.5 Sheets Functionality Design

## Overview

BitsDraw v1.5 will introduce **Sheets** - a powerful system for managing multiple canvases within a single project, enabling image map creation and animation workflows. This transforms BitsDraw from a single-canvas bitmap editor into a multi-canvas production tool.

## Core Concept: Sheets System

### What is a Sheet?
A **Sheet** is an individual canvas with its own:
- Bitmap dimensions (width × height)
- Layer system (independent from other sheets)
- Drawing history (undo/redo per sheet)
- Export settings
- Metadata (name, tags, creation date)

### Sheet Types
1. **Static Sheets** - Individual bitmap graphics
2. **Animation Frames** - Sheets organized as animation sequences
3. **Image Map Regions** - Sheets representing different areas of a larger image map

## Feature Set

### 1. Sheet Management
- **Create/Delete Sheets** - Add new sheets, remove existing ones
- **Sheet Navigation** - Tab-based interface to switch between sheets
- **Sheet Duplication** - Copy sheets with all layers and content
- **Sheet Organization** - Reorder, group, and categorize sheets
- **Sheet Properties** - Name, size, background color, export settings

### 2. Image Map Functionality
- **Sprite Sheet Export** - Combine multiple sheets into organized sprite sheets
- **CSS/JSON Export** - Generate CSS sprite maps or JSON atlases
- **Template System** - Predefined layouts (8×8 tile sets, character sheets, etc.)
- **Auto-arrangement** - Automatically organize sheets in optimal layouts
- **Preview Mode** - Real-time sprite sheet preview

### 3. Animation System
- **Frame Management** - Create, reorder, and time animation frames
- **Onion Skinning** - Semi-transparent overlay of previous/next frames
- **Playback Controls** - Play, pause, loop, frame rate adjustment
- **Export Formats** - GIF, APNG, sprite sheet animations
- **Timeline View** - Visual timeline with frame thumbnails

## Technical Architecture

### 1. Data Structure

```javascript
// Project structure with sheets
{
  version: "1.5",
  sheets: [
    {
      id: "sheet_001",
      name: "Character_Idle_01",
      type: "animation_frame", // "static", "animation_frame", "image_map_region"
      width: 32,
      height: 32,
      layers: [...], // Standard layer system per sheet
      metadata: {
        tags: ["character", "idle"],
        frameIndex: 0,
        duration: 100, // ms for animations
        exportName: "char_idle_01"
      }
    }
  ],
  animations: [
    {
      id: "anim_001",
      name: "Character Idle",
      sheetIds: ["sheet_001", "sheet_002", "sheet_003"],
      frameRate: 10,
      loop: true
    }
  ],
  imageMaps: [
    {
      id: "map_001", 
      name: "UI Icons",
      sheetIds: ["sheet_004", "sheet_005", "sheet_006"],
      layout: "grid_8x8",
      tileSize: 16
    }
  ]
}
```

### 2. UI Components

#### Sheet Tabs
- **Tab Bar** - Horizontal tabs at top of canvas area
- **Add Sheet Button** - Quick sheet creation
- **Sheet Context Menu** - Right-click operations (rename, duplicate, delete)
- **Sheet Indicators** - Visual badges for sheet types (static/animation/map)

#### Sheets Panel
- **Sheet List** - Hierarchical view of all sheets
- **Animation Groups** - Collapsible groups for animation sequences
- **Image Map Groups** - Organized regions for sprite maps
- **Quick Actions** - Batch operations, export options

#### Animation Panel
- **Timeline** - Horizontal timeline with frame thumbnails
- **Playback Controls** - Play/pause/stop/loop buttons
- **Frame Rate Slider** - Adjust playback speed
- **Onion Skin Controls** - Toggle and opacity controls

### 3. File Structure

```
/BitsDraw
  ├── utils/
  │   ├── sheetManager.js       # Core sheet management
  │   ├── animationPlayer.js    # Animation playback engine
  │   ├── spriteSheetExporter.js # Image map generation
  │   └── projectManager.js     # Multi-sheet project handling
  ├── components/
  │   ├── SheetTabs.js         # Tab navigation component
  │   ├── SheetsPanel.js       # Sheet organization panel
  │   └── AnimationTimeline.js # Animation timeline UI
  └── exporters/
      ├── GIFExporter.js       # Animated GIF export
      ├── APNGExporter.js      # Animated PNG export
      └── SpriteMapExporter.js # CSS/JSON sprite maps
```

## Implementation Phases

### Phase 1: Basic Sheet System (Core Foundation)
**Goal**: Multiple independent canvases with navigation

**Features**:
- Sheet creation and deletion
- Tab-based navigation between sheets
- Independent layer systems per sheet
- Per-sheet undo/redo history
- Basic sheet properties (name, size)

**Technical Work**:
- Extend project data structure for multiple sheets
- Implement SheetManager class
- Add sheet tab UI components
- Modify canvas area to display active sheet
- Update save/load to handle multi-sheet projects

### Phase 2: Image Map Creation (Static Sprite Sheets)
**Goal**: Combine multiple sheets into organized sprite sheets

**Features**:
- Sprite sheet export (combine sheets into single image)
- Grid-based layout system
- CSS sprite map generation
- JSON atlas export
- Template system for common layouts

**Technical Work**:
- Implement SpriteSheetExporter class
- Add layout algorithms (grid, optimized packing)
- Create export dialogs for sprite sheets
- Generate CSS/JSON metadata
- Add template system for game development

### Phase 3: Animation System (Frame-based Animation)
**Goal**: Create and export animations from sheet sequences

**Features**:
- Animation timeline UI
- Frame management (add, delete, reorder)
- Onion skinning visualization
- Playback controls with frame rate adjustment
- GIF and APNG export

**Technical Work**:
- Implement AnimationPlayer class
- Build timeline UI component
- Add onion skinning rendering
- Create GIF/APNG exporters
- Implement frame interpolation preview

### Phase 4: Advanced Features (Polish and Optimization)
**Goal**: Production-ready animation and mapping tools

**Features**:
- Batch operations (duplicate sequence, adjust timing)
- Advanced export options (compression, quality settings)
- Animation optimization (frame reduction, palette optimization)
- Import existing animations/sprite sheets
- Project templates for common use cases

## User Experience Design

### Workflow Examples

#### 1. Creating a Character Animation
1. **New Project** → Select "Animation" template
2. **Create Base Frame** → Draw character idle pose in Sheet 1
3. **Duplicate Frame** → Create Sheet 2 from Sheet 1
4. **Modify Frame** → Edit Sheet 2 for next animation frame
5. **Repeat** → Continue adding frames (Sheets 3, 4, 5...)
6. **Preview Animation** → Use timeline playback controls
7. **Export** → Generate GIF or sprite sheet

#### 2. Building a UI Icon Set
1. **New Project** → Select "Sprite Sheet" template
2. **Create Icons** → Draw individual icons in separate sheets
3. **Organize** → Group related icons using tags
4. **Generate Sprite Sheet** → Auto-arrange in 8×8 grid
5. **Export** → Generate PNG + CSS with coordinates

### Interface Integration

#### Updated Menu Structure
```
File >
  New >
    Single Canvas Project
    Animation Project       [NEW]
    Sprite Sheet Project    [NEW]
  
Export >
  Single Image >
    CPP Header
    PNG
  Animation >               [NEW]
    Animated GIF
    Animated PNG
    Sprite Sheet Sequence
  Sprite Sheet >            [NEW]
    PNG + CSS
    PNG + JSON
    Unity Sprite Atlas
```

#### Window Layout
```
┌─────────────────────────────────────────────────────┐
│ [File] [Edit] [View] [Animation] [Sheets] [Help]    │ ← Menu Bar
├─────────────────────────────────────────────────────┤
│ Sheet1 │ Sheet2 │ Sheet3 │ [+] ▾                    │ ← Sheet Tabs
├─────────┴─────────┴─────────┴─────────────────────────┤
│                                                     │
│               Canvas Area                           │ ← Active Sheet Canvas
│                                                     │
├─────────────────────────────────────────────────────┤
│ ⏯ ⏸ ⏹ 🔄 [===▶===] 10fps Frame: 3/5              │ ← Animation Controls
└─────────────────────────────────────────────────────┘
```

## Export Formats

### Animation Exports
1. **Animated GIF**
   - Standard web format
   - Palette optimization
   - Loop control
   - Frame timing

2. **Animated PNG (APNG)**
   - High quality alternative to GIF
   - Alpha channel support
   - Better compression

3. **Sprite Sheet Animation**
   - Single PNG with all frames
   - JSON metadata with frame positions
   - Game engine compatible

### Image Map Exports
1. **CSS Sprite Sheet**
   - PNG image file
   - CSS file with background-position rules
   - Class names based on sheet names

2. **JSON Atlas**
   - PNG image file
   - JSON with sprite coordinates and metadata
   - Compatible with game frameworks

3. **Unity Sprite Atlas**
   - Native Unity .spriteatlas format
   - Automatic import into Unity projects

## Compatibility and Migration

### Backward Compatibility
- **v1.0 Projects** → Automatically convert to single-sheet v1.5 projects
- **Legacy Export** → Maintain existing CPP/PNG export for single sheets
- **File Format** → Extend existing format with sheets array

### Migration Strategy
```javascript
// Auto-migration from v1.0 to v1.5
function migrateProject(v1Project) {
  return {
    version: "1.5",
    sheets: [{
      id: "migrated_sheet",
      name: "Main Canvas",
      type: "static",
      width: v1Project.width,
      height: v1Project.height,
      layers: v1Project.layers,
      metadata: { migrated: true }
    }],
    animations: [],
    imageMaps: []
  };
}
```

## Success Metrics

### User Experience Goals
- **Reduce workflow time** for sprite sheet creation by 70%
- **Eliminate external tools** for basic animation creation
- **Seamless integration** with existing BitsDraw workflow
- **Zero learning curve** for existing users on single-sheet projects

### Technical Goals
- **Performance**: Handle 50+ sheets without UI lag
- **Memory efficiency**: Smart loading of inactive sheets
- **Export speed**: Generate sprite sheets in <2 seconds
- **File size**: Minimal increase in project file size

## Future Considerations (v2.0+)

### Advanced Animation Features
- **Tweening** - Automatic frame interpolation
- **Easing curves** - Animation timing controls
- **Layer animation** - Per-layer timeline
- **Audio sync** - Sync animations to audio tracks

### Collaborative Features
- **Sheet sharing** - Share individual sheets between projects
- **Version control** - Track changes across sheets
- **Team workflows** - Multi-user project editing

This design provides a comprehensive roadmap for implementing robust sheet management, image mapping, and animation capabilities while maintaining BitsDraw's core simplicity and focus on bitmap graphics for embedded systems.