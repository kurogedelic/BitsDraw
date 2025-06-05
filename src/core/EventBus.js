/**
 * Central Event Bus for decoupled communication
 * Replaces direct method calls between components
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} context - Handler context (this binding)
     */
    on(event, handler, context = null) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        this.events.get(event).push({
            handler: context ? handler.bind(context) : handler,
            context
        });

        // Return unsubscribe function
        return () => this.off(event, handler);
    }

    /**
     * Subscribe to an event once
     */
    once(event, handler, context = null) {
        if (!this.onceEvents.has(event)) {
            this.onceEvents.set(event, []);
        }

        this.onceEvents.get(event).push({
            handler: context ? handler.bind(context) : handler,
            context
        });
    }

    /**
     * Unsubscribe from an event
     */
    off(event, handler) {
        if (this.events.has(event)) {
            const handlers = this.events.get(event);
            this.events.set(event, handlers.filter(h => h.handler !== handler));
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit(event, data = null) {
        // Handle regular subscribers
        if (this.events.has(event)) {
            const handlers = this.events.get(event);
            handlers.forEach(({ handler }) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
            });
        }

        // Handle once subscribers
        if (this.onceEvents.has(event)) {
            const handlers = this.onceEvents.get(event);
            handlers.forEach(({ handler }) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in once event handler for '${event}':`, error);
                }
            });
            this.onceEvents.delete(event); // Remove after execution
        }
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.events.clear();
        this.onceEvents.clear();
    }

    /**
     * Get debug info about registered events
     */
    getDebugInfo() {
        return {
            events: Array.from(this.events.keys()),
            onceEvents: Array.from(this.onceEvents.keys()),
            totalHandlers: Array.from(this.events.values()).reduce((sum, handlers) => sum + handlers.length, 0)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
} else {
    window.EventBus = EventBus;
}