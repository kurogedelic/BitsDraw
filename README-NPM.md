# BitsDraw - NPM Development Setup

BitsDraw is now configured as a modern npm-based project with Vite build tools!

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Project Structure

```
BitsDraw/
├── src/                    # ES modules entry point
│   ├── main.js            # Main application loader
│   ├── core/              # Core architecture
│   ├── tools/             # Tool system
│   ├── ui/                # UI components
│   └── export/            # Export functionality
├── utils/                 # Utility modules
├── public/                # Static assets
│   ├── icons/             # Application icons
│   └── wasm/              # WebAssembly files
├── docs/                  # GitHub Pages deployment
├── dist/                  # Production build output
├── package.json           # NPM configuration
├── vite.config.js         # Vite build configuration
└── .eslintrc.js          # ESLint configuration
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run serve` - Serve production build on port 8080
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean build artifacts and node_modules

## 🔧 Development Features

### ⚡ Vite Build System
- **Fast Hot Reload** - Instant updates during development
- **ES Modules** - Modern JavaScript module system
- **Tree Shaking** - Optimized production bundles
- **Asset Processing** - Automatic optimization of images and WASM

### 📱 Progressive Web App (PWA)
- **Service Worker** - Automatic offline caching
- **App Manifest** - Installable web app
- **Fast Loading** - Optimized for performance

### 🎨 Code Quality
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Modern Syntax** - ES2021+ features

## 🌐 Deployment

### Development
```bash
npm run dev
# Opens http://localhost:3000
```

### Production Build
```bash
npm run build
# Creates optimized dist/ folder
```

### GitHub Pages
The `docs/` folder contains the deployment-ready version for GitHub Pages.

## 🔍 Key Improvements

### Before (Simple HTML)
- Manual script loading
- No build optimization
- No dependency management
- Limited development tools

### After (NPM + Vite)
- ✅ Dependency management with npm
- ✅ Fast development server with hot reload
- ✅ Optimized production builds
- ✅ ES modules for better code organization
- ✅ PWA support with service workers
- ✅ Code quality tools (ESLint, Prettier)
- ✅ Asset optimization
- ✅ Tree shaking for smaller bundles

## 🎯 Benefits

1. **Faster Development** - Hot reload saves time
2. **Better Performance** - Optimized builds
3. **Modern Workflow** - Industry-standard tools
4. **Easy Deployment** - Automated build process
5. **Code Quality** - Linting and formatting
6. **Offline Support** - PWA capabilities

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)
- PWA plugin for service workers
- WASM file support
- Asset optimization
- Development server settings

### Package Configuration (`package.json`)
- Modern ES modules
- Development and production scripts
- Quality assurance tools
- Dependency management

## 📱 PWA Features

- **Offline Functionality** - Works without internet
- **App-like Experience** - Can be installed on devices
- **Fast Loading** - Cached resources
- **Responsive Design** - Works on all screen sizes

Start developing with `npm run dev` and enjoy the modern development experience! 🎉