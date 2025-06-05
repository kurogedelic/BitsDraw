use wasm_bindgen::prelude::*;
use std::panic;

// Initialize panic hook for better error reporting
#[wasm_bindgen(start)]
pub fn main() {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[wasm_bindgen]
pub struct ProcessResult {
    success: bool,
    error: String,
    data: Vec<u8>,
}

#[wasm_bindgen]
impl ProcessResult {
    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool { 
        self.success 
    }
    
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { 
        self.error.clone() 
    }
    
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> { 
        self.data.clone() 
    }
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
        "box_blur" => box_blur_impl(pixels, width, height, params),
        _ => ProcessResult {
            success: false,
            error: format!("Unknown operation: {}", operation),
            data: vec![],
        }
    }
}

fn floyd_steinberg_impl(pixels: &[u8], width: u32, height: u32, params: &[f32]) -> ProcessResult {
    if params.is_empty() {
        return ProcessResult {
            success: false,
            error: "Floyd-Steinberg requires threshold parameter".to_string(),
            data: vec![],
        };
    }
    
    let threshold = params[0] as u8;
    let mut result = pixels.to_vec();
    let w = width as usize;
    let h = height as usize;
    
    // Floyd-Steinberg error diffusion
    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            let old_pixel = result[idx];
            let new_pixel = if old_pixel > threshold { 255 } else { 0 };
            result[idx] = new_pixel;
            
            let error = old_pixel as i16 - new_pixel as i16;
            
            // Distribute error to neighboring pixels
            if x + 1 < w {
                let idx_right = y * w + (x + 1);
                result[idx_right] = clamp_pixel(result[idx_right] as i16 + error * 7 / 16);
            }
            
            if y + 1 < h {
                if x > 0 {
                    let idx_below_left = (y + 1) * w + (x - 1);
                    result[idx_below_left] = clamp_pixel(result[idx_below_left] as i16 + error * 3 / 16);
                }
                
                let idx_below = (y + 1) * w + x;
                result[idx_below] = clamp_pixel(result[idx_below] as i16 + error * 5 / 16);
                
                if x + 1 < w {
                    let idx_below_right = (y + 1) * w + (x + 1);
                    result[idx_below_right] = clamp_pixel(result[idx_below_right] as i16 + error * 1 / 16);
                }
            }
        }
    }
    
    ProcessResult {
        success: true,
        error: String::new(),
        data: result,
    }
}

fn bayer_dither_impl(pixels: &[u8], width: u32, height: u32, params: &[f32]) -> ProcessResult {
    if params.is_empty() {
        return ProcessResult {
            success: false,
            error: "Bayer dither requires matrix size parameter".to_string(),
            data: vec![],
        };
    }
    
    let matrix_size = params[0] as usize;
    let threshold = if params.len() > 1 { params[1] as u8 } else { 128 };
    
    let bayer_matrix = match matrix_size {
        2 => &BAYER_2X2,
        4 => &BAYER_4X4,
        8 => &BAYER_8X8,
        _ => return ProcessResult {
            success: false,
            error: format!("Unsupported Bayer matrix size: {}", matrix_size),
            data: vec![],
        }
    };
    
    let mut result = pixels.to_vec();
    let w = width as usize;
    let h = height as usize;
    
    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            let pixel = result[idx];
            let dither_value = bayer_matrix[(y % matrix_size) * matrix_size + (x % matrix_size)];
            let adjusted_threshold = threshold as i16 + (dither_value as i16 - 128) / 4;
            
            result[idx] = if (pixel as i16) > adjusted_threshold { 255 } else { 0 };
        }
    }
    
    ProcessResult {
        success: true,
        error: String::new(),
        data: result,
    }
}

fn flood_fill_impl(pixels: &[u8], width: u32, height: u32, params: &[f32]) -> ProcessResult {
    if params.len() < 3 {
        return ProcessResult {
            success: false,
            error: "Flood fill requires x, y, fill_value parameters".to_string(),
            data: vec![],
        };
    }
    
    let start_x = params[0] as usize;
    let start_y = params[1] as usize;
    let fill_value = params[2] as u8;
    
    let w = width as usize;
    let h = height as usize;
    
    if start_x >= w || start_y >= h {
        return ProcessResult {
            success: false,
            error: "Fill coordinates out of bounds".to_string(),
            data: vec![],
        };
    }
    
    let mut result = pixels.to_vec();
    let original_value = result[start_y * w + start_x];
    
    if original_value == fill_value {
        return ProcessResult {
            success: true,
            error: String::new(),
            data: result,
        };
    }
    
    // Simple flood fill using a stack
    let mut stack = vec![(start_x, start_y)];
    
    while let Some((x, y)) = stack.pop() {
        if x >= w || y >= h {
            continue;
        }
        
        let idx = y * w + x;
        if result[idx] != original_value {
            continue;
        }
        
        result[idx] = fill_value;
        
        // Add neighboring pixels
        if x > 0 { stack.push((x - 1, y)); }
        if x + 1 < w { stack.push((x + 1, y)); }
        if y > 0 { stack.push((x, y - 1)); }
        if y + 1 < h { stack.push((x, y + 1)); }
    }
    
    ProcessResult {
        success: true,
        error: String::new(),
        data: result,
    }
}

fn box_blur_impl(pixels: &[u8], width: u32, height: u32, params: &[f32]) -> ProcessResult {
    if params.is_empty() {
        return ProcessResult {
            success: false,
            error: "Box blur requires radius parameter".to_string(),
            data: vec![],
        };
    }
    
    let radius = params[0] as usize;
    let w = width as usize;
    let h = height as usize;
    let mut result = vec![0u8; w * h];
    
    for y in 0..h {
        for x in 0..w {
            let mut sum = 0u32;
            let mut count = 0u32;
            
            let y_start = y.saturating_sub(radius);
            let y_end = (y + radius + 1).min(h);
            let x_start = x.saturating_sub(radius);
            let x_end = (x + radius + 1).min(w);
            
            for blur_y in y_start..y_end {
                for blur_x in x_start..x_end {
                    sum += pixels[blur_y * w + blur_x] as u32;
                    count += 1;
                }
            }
            
            result[y * w + x] = (sum / count) as u8;
        }
    }
    
    ProcessResult {
        success: true,
        error: String::new(),
        data: result,
    }
}

fn clamp_pixel(value: i16) -> u8 {
    if value < 0 {
        0
    } else if value > 255 {
        255
    } else {
        value as u8
    }
}

// Bayer matrices for ordered dithering
const BAYER_2X2: &[u8] = &[
    0, 128,
    192, 64
];

const BAYER_4X4: &[u8] = &[
    0, 128, 32, 160,
    192, 64, 224, 96,
    48, 176, 16, 144,
    240, 112, 208, 80
];

const BAYER_8X8: &[u8] = &[
    0, 128, 32, 160, 8, 136, 40, 168,
    192, 64, 224, 96, 200, 72, 232, 104,
    48, 176, 16, 144, 56, 184, 24, 152,
    240, 112, 208, 80, 248, 120, 216, 88,
    12, 140, 44, 172, 4, 132, 36, 164,
    204, 76, 236, 108, 196, 68, 228, 100,
    60, 188, 28, 156, 52, 180, 20, 148,
    252, 124, 220, 92, 244, 116, 212, 84
];