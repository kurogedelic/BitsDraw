import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.', // Use project root
  base: './', // Relative paths for deployment
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  
  preview: {
    port: 8080,
    open: true
  },
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}']
      },
      includeAssets: ['icons/BitsDraw.png', 'wasm/*.wasm'],
      manifest: {
        name: 'BitsDraw - U8G2 Bitmap Editor',
        short_name: 'BitsDraw',
        description: 'Professional 1-bit graphics editor for U8G2 displays with WASM acceleration',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape-primary',
        start_url: './',
        icons: [
          {
            src: './icons/BitsDraw.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['graphics', 'productivity', 'utilities'],
        shortcuts: [
          {
            name: 'New Canvas',
            short_name: 'New',
            description: 'Create a new bitmap canvas',
            url: './?action=new',
            icons: [{ src: './icons/BitsDraw.png', sizes: '96x96' }]
          }
        ]
      }
    })
  ],
  
  // WASM support
  assetsInclude: ['**/*.wasm']
});