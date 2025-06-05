#!/bin/bash

# BitsDraw Build Script for GitHub Pages Deployment
# Builds WASM module, runs tests, and prepares static assets

set -e  # Exit on any error

echo "🔨 Building BitsDraw for GitHub Pages..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
echo -e "${BLUE}📋 Checking dependencies...${NC}"

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo -e "${RED}❌ wasm-pack is not installed${NC}"
    echo "Install with: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}❌ Rust is not installed${NC}"
    echo "Install with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies OK${NC}"

# Build WASM module
echo -e "${BLUE}📦 Building WASM module...${NC}"
cd wasm-src

# Build with optimizations for web
wasm-pack build \
    --target web \
    --out-dir ../docs/wasm \
    --release \
    --no-typescript

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ WASM build failed!${NC}"
    exit 1
fi

cd ..
echo -e "${GREEN}✅ WASM module built successfully${NC}"

# Copy existing BitsDraw files to docs/
echo -e "${BLUE}📂 Copying application files...${NC}"

# Copy main application files
cp index.html docs/
cp main.js docs/
cp style.css docs/

# Copy utility files
mkdir -p docs/utils
cp utils/*.js docs/utils/

# Copy icons
cp -r icons docs/

echo -e "${GREEN}✅ Files copied${NC}"

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"

# Create basic test if it doesn't exist
if [ ! -f "tests/wasm-tests.js" ]; then
    mkdir -p tests
    cat > tests/wasm-tests.js << 'EOF'
// Basic WASM test
const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log('🧪 Running basic WASM tests...');
    
    // Check if WASM files exist
    const wasmDir = path.join(__dirname, '..', 'docs', 'wasm');
    const wasmFiles = ['bitsdraw_wasm.js', 'bitsdraw_wasm_bg.wasm'];
    
    for (const file of wasmFiles) {
        const filePath = path.join(wasmDir, file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing WASM file: ${file}`);
            process.exit(1);
        }
    }
    
    console.log('✅ All WASM files present');
    console.log('✅ Basic tests passed');
}

runTests().catch(console.error);
EOF
fi

# Run the tests
node tests/wasm-tests.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tests passed${NC}"

# Generate service worker for offline support
echo -e "${BLUE}⚡ Generating service worker...${NC}"

# Get current date for cache versioning
CACHE_VERSION=$(date +%Y%m%d%H%M)

cat > docs/sw.js << EOF
const CACHE_NAME = 'bitsdraw-v${CACHE_VERSION}';
const urlsToCache = [
    './',
    './index.html',
    './main.js',
    './style.css',
    './wasm/bitsdraw_wasm.js',
    './wasm/bitsdraw_wasm_bg.wasm',
    './wasm/wasm-accelerator.js',
    './utils/canvas-unit.js',
    './utils/alpha-renderer.js',
    './icons/BitsDraw.png'
];

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell...');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
EOF

echo -e "${GREEN}✅ Service worker generated${NC}"

# Generate PWA manifest
echo -e "${BLUE}📱 Generating PWA manifest...${NC}"

cat > docs/manifest.json << 'EOF'
{
    "name": "BitsDraw",
    "short_name": "BitsDraw",
    "description": "Professional 1-bit graphics editor with WASM acceleration",
    "start_url": "./",
    "display": "standalone",
    "theme_color": "#000000",
    "background_color": "#ffffff",
    "orientation": "landscape-primary",
    "icons": [
        {
            "src": "./icons/BitsDraw.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ],
    "categories": ["graphics", "productivity", "utilities"],
    "shortcuts": [
        {
            "name": "New Canvas",
            "short_name": "New",
            "description": "Create a new bitmap canvas",
            "url": "./?action=new",
            "icons": [{ "src": "./icons/BitsDraw.png", "sizes": "96x96" }]
        }
    ]
}
EOF

echo -e "${GREEN}✅ PWA manifest generated${NC}"

# Update version info in main application
echo -e "${BLUE}📝 Updating version info...${NC}"

VERSION_DATE=$(date +%Y%m%d)
VERSION_TIME=$(date +%H%M)
BUILD_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Update version in main.js if it exists
if [ -f "docs/main.js" ]; then
    # Add version info at the top of main.js
    TEMP_FILE=$(mktemp)
    echo "// BitsDraw v${VERSION_DATE}.${VERSION_TIME} (${BUILD_HASH})" > "$TEMP_FILE"
    echo "// Built: $(date)" >> "$TEMP_FILE"
    echo "// WASM Acceleration: Enabled" >> "$TEMP_FILE"
    echo "" >> "$TEMP_FILE"
    cat docs/main.js >> "$TEMP_FILE"
    mv "$TEMP_FILE" docs/main.js
fi

echo -e "${GREEN}✅ Version info updated${NC}"

# Update index.html with PWA features
echo -e "${BLUE}🔧 Updating index.html with PWA features...${NC}"

# Create enhanced index.html
cat > docs/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BitsDraw - Professional 1-bit Graphics Editor</title>
    
    <!-- PWA Support -->
    <link rel="manifest" href="./manifest.json">
    <meta name="theme-color" content="#000000">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="BitsDraw">
    
    <!-- Preload critical resources -->
    <link rel="preload" href="./wasm/bitsdraw_wasm_bg.wasm" as="fetch" crossorigin>
    <link rel="preload" href="./wasm/wasm-accelerator.js" as="script">
    
    <!-- Icon -->
    <link rel="icon" href="./icons/BitsDraw.png">
    <link rel="apple-touch-icon" href="./icons/BitsDraw.png">
    
    <!-- Styles -->
    <link rel="stylesheet" href="./style.css">
    
    <!-- Loading styles -->
    <style>
        #loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f0f0f0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .progress-bar {
            width: 200px;
            height: 4px;
            background: #ddd;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 20px;
        }
        
        .progress-fill {
            height: 100%;
            background: #007AFF;
            border-radius: 2px;
            transition: width 0.3s ease;
            animation: loading 2s ease-in-out infinite;
        }
        
        @keyframes loading {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
        }
        
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <!-- Loading screen -->
    <div id="loading-screen">
        <h1>BitsDraw</h1>
        <p>Loading WASM acceleration...</p>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        <p style="font-size: 0.8em; color: #666; margin-top: 10px;">
            Professional 1-bit graphics editor
        </p>
    </div>
    
    <!-- App content will be inserted here -->
    <div id="app" class="hidden">
        <!-- Content loaded by main.js -->
    </div>
    
    <!-- Module loading with PWA support -->
    <script>
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
        
        // Initialize WASM accelerator and main app
        let wasmAccelerator;
        
        async function initializeApp() {
            try {
                // Load WASM accelerator
                const WasmAcceleratorModule = await import('./wasm/wasm-accelerator.js');
                wasmAccelerator = new WasmAcceleratorModule.default();
                
                // Initialize WASM
                await wasmAccelerator.initialize();
                
                // Load main application
                const mainModule = await import('./main.js');
                
                // Hide loading screen
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                
                // Initialize BitsDraw with WASM acceleration
                window.bitsdraw = new mainModule.BitsDraw(wasmAccelerator);
                
                console.log('✅ BitsDraw initialized with WASM acceleration');
                
            } catch (error) {
                console.error('Failed to initialize app:', error);
                
                // Show error message
                const loadingScreen = document.getElementById('loading-screen');
                loadingScreen.innerHTML = `
                    <h1>BitsDraw</h1>
                    <p style="color: red;">Failed to load: ${error.message}</p>
                    <button onclick="location.reload()">Retry</button>
                `;
            }
        }
        
        // Start initialization
        initializeApp();
    </script>
</body>
</html>
EOF

echo -e "${GREEN}✅ Enhanced index.html created${NC}"

# Generate file list for debugging
echo -e "${BLUE}📋 Generating file manifest...${NC}"

find docs -type f | sort > docs/files.txt

# Calculate total size
TOTAL_SIZE=$(du -sh docs | cut -f1)

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo -e "${BLUE}📊 Build Summary:${NC}"
echo "  • WASM module: ✅ Built and optimized"
echo "  • Service worker: ✅ Generated with cache v${CACHE_VERSION}"
echo "  • PWA manifest: ✅ Generated"
echo "  • Total size: ${TOTAL_SIZE}"
echo "  • Files: $(wc -l < docs/files.txt) files"
echo ""
echo -e "${YELLOW}🚀 Ready for GitHub Pages deployment!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. git add ."
echo "  2. git commit -m \"Deploy BitsDraw with WASM and alpha support\""
echo "  3. git push origin main"
echo "  4. Enable GitHub Pages in repository settings (docs/ folder)"
echo ""
echo -e "${GREEN}Access at: https://[username].github.io/BitsDraw/${NC}"