/**
 * Icon Generator Utility
 * Creates placeholder PNG images for UI components
 */

class IconGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Generate a simple colored rectangle icon
     * @param {number} size - Icon size (16, 24, etc.)
     * @param {string} color - Fill color
     * @param {string} borderColor - Border color
     * @param {string} shape - Shape type: 'rectangle', 'circle', 'triangle'
     * @returns {string} Data URL of the generated PNG
     */
    generateIcon(size, color = '#333333', borderColor = '#000000', shape = 'rectangle') {
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, size, size);
        
        // Set styles
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 1;
        
        const margin = 2;
        const innerSize = size - (margin * 2);
        
        switch (shape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(size / 2, size / 2, innerSize / 2, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(size / 2, margin);
                this.ctx.lineTo(margin, size - margin);
                this.ctx.lineTo(size - margin, size - margin);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case 'rectangle':
            default:
                this.ctx.fillRect(margin, margin, innerSize, innerSize);
                this.ctx.strokeRect(margin, margin, innerSize, innerSize);
                break;
        }
        
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Generate a tool-specific icon with a simple design
     * @param {string} toolName - Name of the tool
     * @param {number} size - Icon size
     * @returns {string} Data URL of the generated PNG
     */
    generateToolIcon(toolName, size = 16) {
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, size, size);
        
        this.ctx.strokeStyle = '#333333';
        this.ctx.fillStyle = '#666666';
        this.ctx.lineWidth = 1;
        
        const center = size / 2;
        const margin = 2;
        
        switch (toolName) {
            case 'pencil':
                // Draw a simple pencil shape
                this.ctx.beginPath();
                this.ctx.moveTo(margin, size - margin);
                this.ctx.lineTo(size - margin, margin);
                this.ctx.lineTo(size - margin - 2, margin + 2);
                this.ctx.lineTo(margin + 2, size - margin);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case 'brush':
                // Draw a brush shape
                this.ctx.beginPath();
                this.ctx.arc(center, center - 2, 3, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.fillRect(center - 1, center + 1, 2, 4);
                break;
                
            case 'bucket':
                // Draw a bucket shape
                this.ctx.beginPath();
                this.ctx.rect(margin + 2, center, size - 6, size - center - margin);
                this.ctx.fill();
                this.ctx.stroke();
                // Handle
                this.ctx.beginPath();
                this.ctx.arc(center + 3, center - 1, 2, 0, Math.PI);
                this.ctx.stroke();
                break;
                
            case 'eraser':
                // Draw an eraser shape
                this.ctx.fillStyle = '#ffaaaa';
                this.ctx.fillRect(margin, center - 1, size - 4, 4);
                this.ctx.strokeRect(margin, center - 1, size - 4, 4);
                break;
                
            case 'select-rect':
                // Draw a selection rectangle
                this.ctx.setLineDash([2, 2]);
                this.ctx.strokeRect(margin, margin, size - 4, size - 4);
                this.ctx.setLineDash([]);
                break;
                
            case 'select-circle':
                // Draw a selection circle
                this.ctx.setLineDash([2, 2]);
                this.ctx.beginPath();
                this.ctx.arc(center, center, (size - 4) / 2, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                break;
                
            case 'line':
                // Draw a line tool
                this.ctx.beginPath();
                this.ctx.moveTo(margin, size - margin);
                this.ctx.lineTo(size - margin, margin);
                this.ctx.stroke();
                break;
                
            case 'text':
                // Draw an "A" for text tool
                this.ctx.font = `${size - 4}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('A', center, center);
                break;
                
            case 'rect':
                // Draw a rectangle shape
                this.ctx.strokeRect(margin, margin, size - 4, size - 4);
                break;
                
            case 'circle':
                // Draw a circle shape
                this.ctx.beginPath();
                this.ctx.arc(center, center, (size - 4) / 2, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
                
            case 'spray':
                // Draw spray dots
                for (let i = 0; i < 8; i++) {
                    const x = margin + Math.random() * (size - 4);
                    const y = margin + Math.random() * (size - 4);
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 0.5, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
                break;
                
            case 'eyedropper':
                // Draw an eyedropper shape
                this.ctx.beginPath();
                this.ctx.moveTo(margin, size - margin);
                this.ctx.lineTo(center, center);
                this.ctx.lineTo(size - margin, margin);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.arc(margin + 1, size - margin - 1, 1, 0, 2 * Math.PI);
                this.ctx.fill();
                break;
                
            default:
                // Default generic tool icon
                this.ctx.fillRect(margin, margin, size - 4, size - 4);
                this.ctx.strokeRect(margin, margin, size - 4, size - 4);
                break;
        }
        
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Generate window control icons
     * @param {string} type - 'close', 'minimize', 'zoom'
     * @param {number} size - Icon size
     * @returns {string} Data URL of the generated PNG
     */
    generateWindowControl(type, size = 12) {
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, size, size);
        
        const center = size / 2;
        const radius = size / 2 - 1;
        
        // Draw circle background
        this.ctx.beginPath();
        this.ctx.arc(center, center, radius, 0, 2 * Math.PI);
        
        switch (type) {
            case 'close':
                this.ctx.fillStyle = '#ff5f57';
                this.ctx.fill();
                // Draw X
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(center - 2, center - 2);
                this.ctx.lineTo(center + 2, center + 2);
                this.ctx.moveTo(center + 2, center - 2);
                this.ctx.lineTo(center - 2, center + 2);
                this.ctx.stroke();
                break;
                
            case 'minimize':
                this.ctx.fillStyle = '#ffbd2e';
                this.ctx.fill();
                // Draw minus
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(center - 2, center);
                this.ctx.lineTo(center + 2, center);
                this.ctx.stroke();
                break;
                
            case 'zoom':
                this.ctx.fillStyle = '#28ca42';
                this.ctx.fill();
                // Draw plus
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(center - 2, center);
                this.ctx.lineTo(center + 2, center);
                this.ctx.moveTo(center, center - 2);
                this.ctx.lineTo(center, center + 2);
                this.ctx.stroke();
                break;
        }
        
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Generate Apple logo placeholder
     * @param {number} size - Icon size
     * @returns {string} Data URL of the generated PNG
     */
    generateAppleLogo(size = 16) {
        this.canvas.width = size;
        this.canvas.height = size;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, size, size);
        
        this.ctx.fillStyle = '#333333';
        
        // Simple apple shape (circle with a bite taken out)
        const center = size / 2;
        const radius = size / 2 - 2;
        
        this.ctx.beginPath();
        this.ctx.arc(center, center, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Bite mark
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(center + 2, center - 2, 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Download a data URL as a PNG file
     * @param {string} dataUrl - Data URL of the image
     * @param {string} filename - Filename for download
     */
    downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Create global instance
window.iconGenerator = new IconGenerator();