/**
 * SimpleCanvasUnit - 基本的なCanvasUnit実装
 * Canvas作成時に自動的にユニットを作成し、タイムラインパネルを表示
 */
class SimpleCanvasUnit {
    constructor(width = 128, height = 64) {
        this.width = width;
        this.height = height;
        this.pixels = new Uint8Array(width * height);
        
        // CanvasUnit座標 [frame, layer]
        this.frame = 1;
        this.layer = 1;
        
        console.log(`Created CanvasUnit [${this.frame}-${this.layer}] ${width}x${height}`);
    }
    
    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.pixels[y * this.width + x];
    }
    
    setPixel(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.pixels[y * this.width + x] = value ? 1 : 0;
    }
    
    clear() {
        this.pixels.fill(0);
    }
    
    copyFrom(sourceUnit) {
        if (sourceUnit.pixels) {
            this.pixels.set(sourceUnit.pixels);
        }
    }
}

/**
 * SimpleUnitManager - シンプルなユニット管理
 */
class SimpleUnitManager {
    constructor() {
        this.units = new Map();
        this.currentUnit = null;
    }
    
    createUnit(frame, layer, width, height) {
        const key = `${frame}-${layer}`;
        const unit = new SimpleCanvasUnit(width, height);
        unit.frame = frame;
        unit.layer = layer;
        
        this.units.set(key, unit);
        
        if (!this.currentUnit) {
            this.currentUnit = unit;
        }
        
        console.log(`Created unit ${key}`);
        return unit;
    }
    
    getUnit(frame, layer) {
        const key = `${frame}-${layer}`;
        return this.units.get(key);
    }
    
    getCurrentUnit() {
        return this.currentUnit;
    }
    
    setCurrentUnit(frame, layer) {
        const unit = this.getUnit(frame, layer);
        if (unit) {
            this.currentUnit = unit;
            return true;
        }
        return false;
    }
    
    getAllUnits() {
        return Array.from(this.units.values());
    }
    
    
    getFrames() {
        const frames = [];
        for (const [key, unit] of this.units) {
            if (unit.layer === 1 && unit.frame > 1) {
                frames.push(unit);
            }
        }
        return frames.sort((a, b) => a.frame - b.frame);
    }
}

// グローバルに公開
window.SimpleCanvasUnit = SimpleCanvasUnit;
window.SimpleUnitManager = SimpleUnitManager;