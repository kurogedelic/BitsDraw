/**
 * BitsDraw - Main Application Entry Point
 * ES Module version for Vite build system
 * 
 * Note: This is a placeholder since we're using traditional script loading
 * for compatibility with the existing codebase.
 */

console.log('BitsDraw running in Vite development mode');

// Vite-specific features
if (import.meta.hot) {
    import.meta.hot.accept();
}

// Development helpers
if (import.meta.env.DEV) {
    console.log('Development mode active');
    window.BITSDRAW_DEV = true;
    
    // Debug helper - check if app exists and has new methods
    setTimeout(() => {
        const app = window.bitsDrawApp;
        if (app) {
            console.log('✅ BitsDraw app found:', app);
            console.log('✅ Has setTheme method:', typeof app.setTheme === 'function');
            console.log('✅ Current tools available:', app.currentTool);
            
            // Test the functionality
            console.log('🧪 Testing theme functionality...');
            if (typeof app.setTheme === 'function') {
                console.log('🎨 Theme system is working!');
            }
        } else {
            console.log('❌ BitsDraw app not found in window.bitsDrawApp');
            console.log('🔍 Available global variables:', Object.keys(window).filter(k => k.toLowerCase().includes('bitsdraw')));
        }
    }, 2000);
}