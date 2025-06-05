# BitsDraw Complete Implementation Plan

## Project Overview

Transform BitsDraw into a professional 1-bit graphics editor with WASM acceleration, alpha layer support, and static hosting on GitHub Pages.

## Phase 1: WASM Foundation (Week 1-2)

### 1.1 Project Structure
```
BitsDraw/
├── docs/                    # GitHub Pages root
│   ├── index.html          # Main app
│   ├── main.js             # Core logic
│   ├── style.css           # Styles
│   ├── wasm/               # WASM modules
│   │   ├── bitsdraw_wasm.js
│   │   └── bitsdraw_wasm_bg.wasm
│   └── utils/              # JS utilities
├── wasm-src/               # Rust source
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
├── tests/                  # Automated tests
│   └── wasm-tests.js
└── build.sh               # Build script
```

### 1.2 WASM Core Implementation
```rust
// wasm-src/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ProcessResult {
    success: bool,
    error: String,
    data: Vec<u8>,
}

#[wasm_bindgen]
impl ProcessResult {
    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool { self.success }
    
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
    
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> { self.data.clone() }
}

// Safe wrapper pattern for all functions
#[wasm_bindgen]
pub fn process_safe(
    operation: &str,
    pixels: &[u8],
    width: u32,
    height: u32,
    params: &[f32]
) -> ProcessResult {
    match operation {
        "floyd_steinberg" => floyd_steinberg_impl(pixels, width, height, params),
        "bayer_dither" => bayer_dither_impl(pixels, width, height, params),
        "flood_fill" => flood_fill_impl(pixels, width, height, params),
        _ => ProcessResult {
            success: false,
            error: format!("Unknown operation: {}", operation),
            data: vec![],
        }
    }
}
```

### 1.3 JavaScript Integration Layer
```javascript
// docs/wasm/wasm-accelerator.js
class WasmAccelerator {
    constructor() {
        this.ready = false;
        this.module = null;
        this.initPromise = this.initialize();
    }
    
    async initialize() {
        try {
            // Dynamic import for better loading
            const wasmModule = await import('./bitsdraw_wasm.js');
            await wasmModule.default('./bitsdraw_wasm_bg.wasm');
            
            this.module = wasmModule;
            this.ready = await this.selfTest();
            
            if (this.ready) {
                console.log('✅ WASM acceleration ready');
            }
            return this.ready;
        } catch (e) {
            console.warn('⚠️ WASM not available, using JS fallback', e);
            return false;
        }
    }
    
    async selfTest() {
        try {
            const test = new Uint8Array([128, 64, 192, 32]);
            const result = this.module.process_safe(
                "floyd_steinberg", test, 2, 2, [128]
            );
            return result.success && result.data.length === 4;
        } catch (e) {
            return false;
        }
    }
    
    async process(operation, pixels, width, height, params = []) {
        await this.initPromise;
        
        if (!this.ready) {
            return this.jsFallback(operation, pixels, width, height, params);
        }
        
        try {
            const result = this.module.process_safe(
                operation, pixels, width, height, Float32Array.from(params)
            );
            
            if (!result.success) {
                console.warn(`WASM ${operation} failed:`, result.error);
                return this.jsFallback(operation, pixels, width, height, params);
            }
            
            return result.data;
        } catch (e) {
            console.error('WASM execution error:', e);
            return this.jsFallback(operation, pixels, width, height, params);
        }
    }
    
    jsFallback(operation, pixels, width, height, params) {
        // Import existing JS implementations
        switch (operation) {
            case "floyd_steinberg":
                return DitheringEffects.floydSteinberg(pixels, width, height, params[0]);
            case "flood_fill":
                return FloodFill.fill(pixels, width, height, params[0], params[1], params[2]);
            default:
                return pixels;
        }
    }
}
```

## Phase 2: Alpha Layer Implementation (Week 3-4)

### 2.1 Extended Data Model
```javascript
// docs/utils/canvas-unit.js
class CanvasUnit {
    constructor(frame, tile, layer, width, height) {
        this.id = [frame, tile, layer];
        this.width = width;
        this.height = height;
        
        // Core data
        this.pixels = new Uint8Array(width * height);  // B/W data
        this.alpha = null;                              // Optional alpha
        
        // Metadata
        this.flags = 0;  // bit 0: has alpha, bit 1: compressed
        this.meta = {
            name: '',
            locked: false,
            visible: true,
            hasAlpha: false,
            clipBounds: null
        };
    }
    
    enableAlpha() {
        if (!this.alpha) {
            this.alpha = new Uint8Array(this.width * this.height);
            this.alpha.fill(1);  // Default opaque
            this.flags |= 0x1;
            this.meta.hasAlpha = true;
            this.updateClipBounds();
        }
    }
    
    disableAlpha() {
        this.alpha = null;
        this.flags &= ~0x1;
        this.meta.hasAlpha = false;
        this.meta.clipBounds = null;
    }
    
    updateClipBounds() {
        if (!this.alpha) return;
        
        let minX = this.width, minY = this.height;
        let maxX = -1, maxY = -1;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                if (this.alpha[idx] > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        this.meta.clipBounds = (maxX >= 0) ? {
            x: minX, y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        } : null;
    }
    
    // Playdate-compatible export
    exportAsPDI() {
        const bounds = this.meta.clipBounds || {
            x: 0, y: 0, width: this.width, height: this.height
        };
        
        const stride = Math.ceil(bounds.width / 8);
        const pixelData = new Uint8Array(stride * bounds.height);
        const alphaData = this.alpha ? new Uint8Array(stride * bounds.height) : null;
        
        // Pack bits
        for (let y = 0; y < bounds.height; y++) {
            for (let x = 0; x < bounds.width; x++) {
                const srcIdx = (y + bounds.y) * this.width + (x + bounds.x);
                const dstByte = Math.floor(x / 8);
                const dstBit = 7 - (x % 8);
                const dstIdx = y * stride + dstByte;
                
                if (this.pixels[srcIdx]) {
                    pixelData[dstIdx] |= (1 << dstBit);
                }
                
                if (alphaData && this.alpha[srcIdx]) {
                    alphaData[dstIdx] |= (1 << dstBit);
                }
            }
        }
        
        return {
            flags: this.flags,
            bounds: bounds,
            stride: stride,
            pixelData: pixelData,
            alphaData: alphaData
        };
    }
}
```

### 2.2 Alpha-Aware Rendering
```javascript
// docs/utils/alpha-renderer.js
class AlphaRenderer {
    static renderWithAlpha(ctx, unit, zoom, colors) {
        const { width, height, pixels, alpha } = unit;
        
        // Draw checkerboard for transparency
        if (alpha) {
            this.drawCheckerboard(ctx, width * zoom, height * zoom);
        }
        
        // Draw pixels with alpha
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const pixel = pixels[idx];
                const alphaValue = alpha ? alpha[idx] : 1;
                
                if (alphaValue > 0) {
                    ctx.fillStyle = pixel ? colors.draw : colors.background;
                    ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
                }
            }
        }
    }
    
    static drawCheckerboard(ctx, width, height, size = 8) {
        ctx.fillStyle = '#ccc';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                if ((x / size + y / size) % 2 === 0) {
                    ctx.fillRect(x, y, size, size);
                }
            }
        }
    }
}
```

## Phase 3: Build & Deploy System (Week 5)

### 3.1 Build Script
```bash
#!/bin/bash
# build.sh

echo "🔨 Building BitsDraw for GitHub Pages..."

# 1. Build WASM
echo "📦 Building WASM module..."
cd wasm-src
wasm-pack build --target web --out-dir ../docs/wasm
cd ..

# 2. Run tests
echo "🧪 Running tests..."
node tests/wasm-tests.js
if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi

# 3. Optimize assets
echo "🎨 Optimizing assets..."
# Minify JS (optional)
# npx terser docs/main.js -o docs/main.min.js

# 4. Generate service worker for offline support
echo "⚡ Generating service worker..."
cat > docs/sw.js << 'EOF'
const CACHE_NAME = 'bitsdraw-v1';
const urlsToCache = [
    './',
    './index.html',
    './main.js',
    './style.css',
    './wasm/bitsdraw_wasm.js',
    './wasm/bitsdraw_wasm_bg.wasm',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
EOF

# 5. Update version info
echo "📝 Updating version..."
DATE=$(date +%Y%m%d)
sed -i '' "s/version: '.*'/version: '$DATE'/" docs/main.js

echo "✅ Build complete! Ready for GitHub Pages deployment."
```

### 3.2 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
        
    - name: Install wasm-pack
      run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
      
    - name: Build
      run: ./build.sh
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
```

### 3.3 Progressive Web App Configuration
```json
// docs/manifest.json
{
    "name": "BitsDraw",
    "short_name": "BitsDraw",
    "description": "Professional 1-bit graphics editor",
    "start_url": "./",
    "display": "standalone",
    "theme_color": "#000000",
    "background_color": "#ffffff",
    "icons": [
        {
            "src": "./icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "./icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

### 3.4 Index.html Updates
```html
<!-- docs/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BitsDraw - 1-bit Graphics Editor</title>
    
    <!-- PWA Support -->
    <link rel="manifest" href="./manifest.json">
    <meta name="theme-color" content="#000000">
    
    <!-- Preload critical resources -->
    <link rel="preload" href="./wasm/bitsdraw_wasm_bg.wasm" as="fetch" crossorigin>
    
    <link rel="stylesheet" href="./style.css">
</head>
<body>
    <!-- App content -->
    <div id="app">
        <!-- Loading screen -->
        <div id="loading-screen">
            <h1>BitsDraw</h1>
            <p>Loading WASM acceleration...</p>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        </div>
    </div>
    
    <!-- Module loading -->
    <script type="module">
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }
        
        // Initialize app
        import('./main.js').then(module => {
            window.bitsdraw = new module.BitsDraw();
        });
    </script>
</body>
</html>
```

## Phase 4: Testing & Performance Monitoring

### 4.1 Automated Test Suite
```javascript
// tests/test-runner.js
class TestRunner {
    static async runAll() {
        console.log('🧪 Running BitsDraw test suite...\n');
        
        const suites = [
            WasmTests,
            AlphaLayerTests,
            PerformanceTests,
            ExportTests
        ];
        
        let totalPassed = 0;
        let totalFailed = 0;
        
        for (const suite of suites) {
            const result = await suite.run();
            totalPassed += result.passed;
            totalFailed += result.failed;
        }
        
        console.log(`\n✅ Passed: ${totalPassed}`);
        console.log(`❌ Failed: ${totalFailed}`);
        
        return totalFailed === 0;
    }
}

// Performance benchmarks
class PerformanceTests {
    static async run() {
        const results = { passed: 0, failed: 0 };
        
        // Test: WASM vs JS speed
        const sizes = [64, 256, 512, 1024];
        
        for (const size of sizes) {
            const pixels = new Uint8Array(size * size);
            for (let i = 0; i < pixels.length; i++) {
                pixels[i] = Math.random() * 256;
            }
            
            // JS timing
            const jsStart = performance.now();
            await DitheringEffects.floydSteinberg(pixels, size, size, 128);
            const jsTime = performance.now() - jsStart;
            
            // WASM timing
            const wasmAccel = new WasmAccelerator();
            await wasmAccel.initialize();
            
            const wasmStart = performance.now();
            await wasmAccel.process('floyd_steinberg', pixels, size, size, [128]);
            const wasmTime = performance.now() - wasmStart;
            
            const speedup = jsTime / wasmTime;
            console.log(`${size}x${size}: WASM ${wasmTime.toFixed(1)}ms, JS ${jsTime.toFixed(1)}ms (${speedup.toFixed(1)}x)`);
            
            if (speedup > 2) {
                results.passed++;
            } else {
                results.failed++;
            }
        }
        
        return results;
    }
}
```

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] WASM module builds successfully
- [ ] Alpha layer rendering correct
- [ ] Performance benchmarks meet targets
- [ ] Service worker caches all assets
- [ ] PWA manifest configured

### GitHub Pages Setup
```bash
# 1. Enable GitHub Pages in repository settings
# 2. Set source to 'docs' folder
# 3. Push to main branch

git add .
git commit -m "Deploy BitsDraw with WASM and Alpha support"
git push origin main

# Access at: https://[username].github.io/BitsDraw/
```

### Post-deployment
- [ ] Test on multiple browsers
- [ ] Verify WASM loads correctly
- [ ] Check offline functionality
- [ ] Monitor error logs
- [ ] Gather performance metrics

## Success Metrics

### Performance Targets
- WASM dithering: >5x faster than JS
- Page load: <2 seconds on 3G
- Offline capable after first load
- Memory usage: <50MB for typical projects

### Feature Completeness
- [x] WASM acceleration with fallback
- [x] Alpha layer support
- [x] Playdate export format
- [x] Static hosting ready
- [x] PWA capabilities

## Maintenance Plan

### Monthly Tasks
1. Update dependencies
2. Review error logs
3. Performance regression tests
4. Security updates

### Continuous Improvements
- Add more WASM-accelerated functions
- Optimize bundle size
- Enhance offline capabilities
- User feedback integration

---

This plan ensures a robust, performant, and maintainable BitsDraw that can be hosted entirely on GitHub Pages with no backend requirements.