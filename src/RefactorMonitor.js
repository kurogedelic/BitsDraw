/**
 * Refactor Monitor - Development tool for tracking migration progress
 * Provides debugging and performance monitoring during refactoring
 */
class RefactorMonitor {
    constructor() {
        this.isEnabled = this.isDevelopmentMode();
        this.metrics = {
            eventCounts: new Map(),
            commandCounts: new Map(),
            stateChanges: new Map(),
            performanceMarks: new Map(),
            errors: []
        };
        
        this.startTime = Date.now();
        this.lastActivityTime = Date.now();
        
        if (this.isEnabled) {
            this.initialize();
        }
    }

    /**
     * Check if we're in development mode
     */
    isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    }

    /**
     * Initialize monitoring
     */
    initialize() {
        console.log('🔍 Refactor Monitor initialized');
        
        // Create monitoring UI
        this.createMonitoringUI();
        
        // Setup automatic monitoring
        this.setupAutoMonitoring();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    /**
     * Monitor bridge initialization
     */
    monitorBridge(bridge) {
        if (!this.isEnabled) return;
        
        this.bridge = bridge;
        
        // Monitor event bus
        this.monitorEventBus(bridge.newApp.eventBus);
        
        // Monitor state manager
        this.monitorStateManager(bridge.newApp.stateManager);
        
        // Monitor command system
        this.monitorCommandSystem(bridge.newApp.commandSystem);
        
        // Monitor tool system
        this.monitorToolSystem(bridge.newApp.toolSystem);
        
        console.log('🔍 Bridge monitoring active');
    }

    /**
     * Monitor event bus activity
     */
    monitorEventBus(eventBus) {
        // Wrap emit method
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = (event, data) => {
            this.trackEvent(event, data);
            return originalEmit(event, data);
        };

        // Monitor event registrations
        const originalOn = eventBus.on.bind(eventBus);
        eventBus.on = (event, handler, context) => {
            this.trackEventRegistration(event);
            return originalOn(event, handler, context);
        };
    }

    /**
     * Monitor state manager activity
     */
    monitorStateManager(stateManager) {
        // Monitor state changes
        stateManager.eventBus.on('state:changed', (data) => {
            this.trackStateChange(data.path, data.value, data.oldValue);
        });

        // Monitor batch changes
        stateManager.eventBus.on('state:batch:changed', (data) => {
            this.trackBatchStateChange(data.changes);
        });
    }

    /**
     * Monitor command system activity
     */
    monitorCommandSystem(commandSystem) {
        // Monitor command execution
        commandSystem.eventBus.on('command:executed', (data) => {
            this.trackCommand(data.command, 'executed');
        });

        commandSystem.eventBus.on('command:undone', (data) => {
            this.trackCommand(data.command, 'undone');
        });

        commandSystem.eventBus.on('command:redone', (data) => {
            this.trackCommand(data.command, 'redone');
        });

        commandSystem.eventBus.on('command:error', (data) => {
            this.trackError('command', data);
        });
    }

    /**
     * Monitor tool system activity
     */
    monitorToolSystem(toolSystem) {
        toolSystem.eventBus.on('tool:changed', (data) => {
            this.trackToolChange(data.current, data.previous);
        });

        toolSystem.eventBus.on('tool:registered', (data) => {
            this.trackToolRegistration(data.name);
        });
    }

    /**
     * Track event emission
     */
    trackEvent(event, data) {
        const count = this.metrics.eventCounts.get(event) || 0;
        this.metrics.eventCounts.set(event, count + 1);
        this.lastActivityTime = Date.now();
        
        if (this.isVerbose) {
            console.log(`📡 Event: ${event}`, data);
        }
    }

    /**
     * Track event registration
     */
    trackEventRegistration(event) {
        if (this.isVerbose) {
            console.log(`📝 Event registered: ${event}`);
        }
    }

    /**
     * Track state changes
     */
    trackStateChange(path, newValue, oldValue) {
        const count = this.metrics.stateChanges.get(path) || 0;
        this.metrics.stateChanges.set(path, count + 1);
        this.lastActivityTime = Date.now();
        
        if (this.isVerbose) {
            console.log(`🏪 State: ${path}`, { old: oldValue, new: newValue });
        }
    }

    /**
     * Track batch state changes
     */
    trackBatchStateChange(changes) {
        changes.forEach(change => {
            this.trackStateChange(change.path, change.value, change.oldValue);
        });
        
        if (this.isVerbose) {
            console.log(`🏪 Batch state changes:`, changes);
        }
    }

    /**
     * Track command execution
     */
    trackCommand(command, action) {
        const key = `${command}:${action}`;
        const count = this.metrics.commandCounts.get(key) || 0;
        this.metrics.commandCounts.set(key, count + 1);
        this.lastActivityTime = Date.now();
        
        if (this.isVerbose) {
            console.log(`⚡ Command: ${command} (${action})`);
        }
    }

    /**
     * Track tool changes
     */
    trackToolChange(current, previous) {
        if (this.isVerbose) {
            console.log(`🔧 Tool changed: ${previous} → ${current}`);
        }
    }

    /**
     * Track tool registration
     */
    trackToolRegistration(name) {
        if (this.isVerbose) {
            console.log(`🔧 Tool registered: ${name}`);
        }
    }

    /**
     * Track errors
     */
    trackError(type, data) {
        this.metrics.errors.push({
            type,
            data,
            timestamp: Date.now()
        });
        
        console.error(`❌ ${type} error:`, data);
    }

    /**
     * Create monitoring UI
     */
    createMonitoringUI() {
        const panel = document.createElement('div');
        panel.id = 'refactor-monitor';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            display: none;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px;">
                <strong>🔍 Refactor Monitor</strong>
                <button id="monitor-close" style="float: right; background: none; border: none; color: #ff0000; cursor: pointer;">×</button>
            </div>
            <div id="monitor-content"></div>
        `;
        
        document.body.appendChild(panel);
        
        // Close button
        document.getElementById('monitor-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });
        
        this.panel = panel;
        this.updateUI();
        
        // Auto-update every 2 seconds
        setInterval(() => this.updateUI(), 2000);
    }

    /**
     * Update monitoring UI
     */
    updateUI() {
        if (!this.panel || this.panel.style.display === 'none') return;
        
        const content = document.getElementById('monitor-content');
        if (!content) return;
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const lastActivity = Math.floor((Date.now() - this.lastActivityTime) / 1000);
        
        let html = `
            <div>⏱️ Runtime: ${runtime}s (idle: ${lastActivity}s)</div>
            <br>
        `;
        
        // Migration status
        if (this.bridge) {
            const status = this.bridge.getMigrationStatus();
            html += `
                <div>🚀 Migration: ${Math.round(status.progress * 100)}% complete</div>
                <div style="margin-left: 10px;">
                    ${Object.entries(status.details).map(([key, value]) => 
                        `${value ? '✅' : '⏳'} ${key}`
                    ).join('<br>')}
                </div>
                <br>
            `;
        }
        
        // Top events
        const topEvents = Array.from(this.metrics.eventCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
            
        if (topEvents.length > 0) {
            html += `<div>📡 Top Events:</div>`;
            topEvents.forEach(([event, count]) => {
                html += `<div style="margin-left: 10px;">${event}: ${count}</div>`;
            });
            html += `<br>`;
        }
        
        // Top state changes
        const topStates = Array.from(this.metrics.stateChanges.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
            
        if (topStates.length > 0) {
            html += `<div>🏪 Top State Changes:</div>`;
            topStates.forEach(([path, count]) => {
                html += `<div style="margin-left: 10px;">${path}: ${count}</div>`;
            });
            html += `<br>`;
        }
        
        // Commands
        const commands = Array.from(this.metrics.commandCounts.entries());
        if (commands.length > 0) {
            html += `<div>⚡ Commands:</div>`;
            commands.forEach(([command, count]) => {
                html += `<div style="margin-left: 10px;">${command}: ${count}</div>`;
            });
            html += `<br>`;
        }
        
        // Errors
        if (this.metrics.errors.length > 0) {
            html += `<div>❌ Errors: ${this.metrics.errors.length}</div>`;
            this.metrics.errors.slice(-3).forEach(error => {
                const age = Math.floor((Date.now() - error.timestamp) / 1000);
                html += `<div style="margin-left: 10px; color: #ff6666;">${error.type} (${age}s ago)</div>`;
            });
        }
        
        content.innerHTML = html;
    }

    /**
     * Setup automatic monitoring
     */
    setupAutoMonitoring() {
        // Monitor for bridge creation
        const checkForBridge = () => {
            if (window.refactorBridge && !this.bridge) {
                this.monitorBridge(window.refactorBridge);
            }
        };
        
        // Check every second for bridge
        const bridgeChecker = setInterval(checkForBridge, 1000);
        
        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(bridgeChecker), 30000);
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+M to toggle monitor
            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                this.toggleMonitor();
            }
            
            // Ctrl+Shift+V to toggle verbose mode
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleVerbose();
            }
            
            // Ctrl+Shift+R to show refactor info
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.showRefactorInfo();
            }
        });
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor rendering performance
        let frameCount = 0;
        let lastFpsCheck = Date.now();
        
        const checkFps = () => {
            frameCount++;
            const now = Date.now();
            if (now - lastFpsCheck >= 1000) {
                this.metrics.performanceMarks.set('fps', frameCount);
                frameCount = 0;
                lastFpsCheck = now;
            }
            requestAnimationFrame(checkFps);
        };
        
        requestAnimationFrame(checkFps);
        
        // Monitor memory usage if available
        if (performance.memory) {
            setInterval(() => {
                this.metrics.performanceMarks.set('memory', {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
                });
            }, 5000);
        }
    }

    /**
     * Toggle monitor visibility
     */
    toggleMonitor() {
        if (this.panel) {
            const isVisible = this.panel.style.display !== 'none';
            this.panel.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.updateUI();
            }
        }
    }

    /**
     * Toggle verbose logging
     */
    toggleVerbose() {
        this.isVerbose = !this.isVerbose;
        console.log(`🔍 Verbose mode: ${this.isVerbose ? 'ON' : 'OFF'}`);
    }

    /**
     * Show refactor information
     */
    showRefactorInfo() {
        const info = {
            monitor: {
                enabled: this.isEnabled,
                verbose: this.isVerbose,
                runtime: Math.floor((Date.now() - this.startTime) / 1000)
            },
            metrics: {
                eventTypes: this.metrics.eventCounts.size,
                totalEvents: Array.from(this.metrics.eventCounts.values()).reduce((a, b) => a + b, 0),
                stateChanges: Array.from(this.metrics.stateChanges.values()).reduce((a, b) => a + b, 0),
                commands: Array.from(this.metrics.commandCounts.values()).reduce((a, b) => a + b, 0),
                errors: this.metrics.errors.length
            }
        };
        
        if (this.bridge) {
            info.migration = this.bridge.getMigrationStatus();
            info.applications = {
                legacy: !!this.bridge.legacy,
                new: !!this.bridge.newApp
            };
        }
        
        console.table(info);
        return info;
    }

    /**
     * Export metrics data
     */
    exportMetrics() {
        return {
            timestamp: Date.now(),
            runtime: Date.now() - this.startTime,
            metrics: {
                eventCounts: Object.fromEntries(this.metrics.eventCounts),
                stateChanges: Object.fromEntries(this.metrics.stateChanges),
                commandCounts: Object.fromEntries(this.metrics.commandCounts),
                performanceMarks: Object.fromEntries(this.metrics.performanceMarks),
                errors: this.metrics.errors
            },
            migration: this.bridge ? this.bridge.getMigrationStatus() : null
        };
    }
}

// Auto-initialize monitor
if (typeof window !== 'undefined') {
    window.refactorMonitor = new RefactorMonitor();
    
    // Add to global scope for debugging
    window.showRefactorInfo = () => window.refactorMonitor.showRefactorInfo();
    window.exportRefactorMetrics = () => window.refactorMonitor.exportMetrics();
    
    console.log('🔍 Refactor Monitor ready. Press Ctrl+Shift+M to toggle, Ctrl+Shift+V for verbose mode');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefactorMonitor;
}