# Changelog

All notable changes to BitsDraw will be documented in this file.

## [1.0.1] - 2024-12-03

### 🎉 Added
- **CPP Export/Import Dialogs** - Replaced Generate Code Panel with dedicated modal dialogs
- **Modular Architecture** - Split main.js into specialized managers:
  - DialogManager - Handles all modal dialogs
  - MenuManager - Manages menu bar and actions
  - WindowManager - Controls window operations
  - ToolManager - Manages tool selection and options
- **Enhanced UI** - Project name input in Tool Options window
- **Real-time Code Generation** - Array name changes update code instantly
- **Improved File Handling** - Better CPP header import/export functionality

### 🔧 Fixed
- **Bucket Fill Bug** - Fixed issue where bucket fill was limited to 50x50 pixel zones
- **Window Dragging** - Improved coordinate system for smoother window movement
- **Code Organization** - Removed redundant code and improved maintainability

### 🗑️ Removed
- **Gradient Tool** - Removed non-functional gradient tool from UI and codebase
- **Generate Code Panel** - Replaced with modal dialog system
- **Legacy bitmap.js** - Using optimized bitmap editor only

### 📝 Changed
- **Export Format** - Updated generated comments to include version information
- **File Structure** - Reorganized JavaScript files into logical modules
- **Performance** - Improved rendering performance with optimized bitmap editor

### 🏗️ Technical Improvements
- Reduced main.js from 2400+ lines to ~800 lines
- Improved separation of concerns
- Better error handling in dialogs
- Enhanced code maintainability

---

## [1.0.0] - 2024-11-30

### Initial Release
- Complete bitmap editor for U8G2 displays
- Drawing tools: Pencil, Bucket, Line, Rectangle, Circle, Text, Spray
- Selection tools with copy/paste functionality
- Pattern support with 10 built-in dither patterns
- Layer system with visibility controls
- Real-time preview window
- Multiple display modes
- Grid display toggle
- Zoom levels 1x-32x
- Image import (PNG/JPG)
- U8G2 export functionality
- Keyboard shortcuts
- Windowed interface with drag/resize
- Project save/load to browser storage