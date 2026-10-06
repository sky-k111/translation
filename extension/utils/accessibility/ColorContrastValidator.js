/**
 * ColorContrastValidator - WCAG 2.1 AA Color Contrast Validation Utility
 * 
 * Validates color contrast ratios against WCAG 2.1 AA standards:
 * - Normal text: 4.5:1 minimum contrast ratio
 * - Large text (18pt+ or 14pt+ bold): 3:1 minimum contrast ratio
 * - Focus indicators: 3:1 minimum contrast ratio
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

class ColorContrastValidator {
  /**
   * Parse color string to RGB values
   * Supports: hex (#RGB, #RRGGBB), rgb(r,g,b), rgba(r,g,b,a)
   * @param {string} color - Color string
   * @returns {{r: number, g: number, b: number} | null} RGB object or null if invalid
   */
  static parseColor(color) {
    if (!color) return null;

    // Remove whitespace
    color = color.trim();

    // Handle hex colors
    if (color.startsWith('#')) {
      let hex = color.substring(1);
      
      // Expand shorthand hex (#RGB -> #RRGGBB)
      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
      }
      
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          return { r, g, b };
        }
      }
    }

    // Handle rgb/rgba colors
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }

    // Handle named colors (basic set)
    const namedColors = {
      'white': { r: 255, g: 255, b: 255 },
      'black': { r: 0, g: 0, b: 0 },
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 128, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'transparent': { r: 255, g: 255, b: 255 } // Treat as white for contrast calculation
    };

    return namedColors[color.toLowerCase()] || null;
  }

  /**
   * Calculate relative luminance of a color
   * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
   * @param {{r: number, g: number, b: number}} rgb - RGB color object
   * @returns {number} Relative luminance (0-1)
   */
  static getRelativeLuminance(rgb) {
    // Convert RGB to sRGB (0-1 range)
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    // Apply gamma correction
    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    // Calculate relative luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate contrast ratio between two colors
   * Formula from WCAG 2.1: (L1 + 0.05) / (L2 + 0.05)
   * where L1 is the lighter color and L2 is the darker color
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @returns {number | null} Contrast ratio (1-21) or null if invalid colors
   */
  static calculateContrast(foreground, background) {
    const fgRGB = this.parseColor(foreground);
    const bgRGB = this.parseColor(background);

    if (!fgRGB || !bgRGB) {
      console.warn('ColorContrastValidator: Invalid color format', { foreground, background });
      return null;
    }

    const fgLuminance = this.getRelativeLuminance(fgRGB);
    const bgLuminance = this.getRelativeLuminance(bgRGB);

    // Ensure L1 is the lighter color
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    // Calculate contrast ratio
    const contrast = (lighter + 0.05) / (darker + 0.05);

    return Math.round(contrast * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if contrast ratio meets WCAG AA standards
   * @param {number} contrast - Contrast ratio
   * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
   * @returns {boolean} True if meets WCAG AA standards
   */
  static meetsWCAG_AA(contrast, isLargeText = false) {
    if (contrast === null) return false;
    
    const requiredRatio = isLargeText ? 3.0 : 4.5;
    return contrast >= requiredRatio;
  }

  /**
   * Check if contrast ratio meets WCAG AAA standards
   * @param {number} contrast - Contrast ratio
   * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
   * @returns {boolean} True if meets WCAG AAA standards
   */
  static meetsWCAG_AAA(contrast, isLargeText = false) {
    if (contrast === null) return false;
    
    const requiredRatio = isLargeText ? 4.5 : 7.0;
    return contrast >= requiredRatio;
  }

  /**
   * Determine if text is considered "large" for WCAG purposes
   * Large text: 18pt+ (24px+) or 14pt+ (18.66px+) bold
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if text is large
   */
  static isLargeText(element) {
    const computedStyle = window.getComputedStyle(element);
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontWeight = computedStyle.fontWeight;

    // Check if bold (weight >= 700)
    const isBold = parseInt(fontWeight) >= 700 || fontWeight === 'bold';

    // Large text thresholds
    if (isBold && fontSize >= 18.66) return true; // 14pt bold
    if (fontSize >= 24) return true; // 18pt

    return false;
  }

  /**
   * Get computed colors for an element
   * @param {HTMLElement} element - Element to analyze
   * @returns {{foreground: string, background: string}} Color object
   */
  static getElementColors(element) {
    const computedStyle = window.getComputedStyle(element);
    let foreground = computedStyle.color;
    let background = computedStyle.backgroundColor;

    // If background is transparent, traverse up to find actual background
    if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') {
      let parent = element.parentElement;
      while (parent && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
        background = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      // Default to white if no background found
      if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') {
        background = 'rgb(255, 255, 255)';
      }
    }

    return { foreground, background };
  }

  /**
   * Validate contrast for a single element
   * @param {HTMLElement} element - Element to validate
   * @returns {{
   *   element: HTMLElement,
   *   foreground: string,
   *   background: string,
   *   contrast: number,
   *   isLargeText: boolean,
   *   requiredRatio: number,
   *   passes: boolean,
   *   level: string
   * } | null} Validation result or null if not applicable
   */
  static validateElement(element) {
    // Skip non-text elements
    if (!element.textContent || element.textContent.trim() === '') {
      return null;
    }

    const { foreground, background } = this.getElementColors(element);
    const contrast = this.calculateContrast(foreground, background);
    
    if (contrast === null) return null;

    const isLarge = this.isLargeText(element);
    const requiredRatio = isLarge ? 3.0 : 4.5;
    const passesAA = this.meetsWCAG_AA(contrast, isLarge);
    const passesAAA = this.meetsWCAG_AAA(contrast, isLarge);

    let level = 'Fail';
    if (passesAAA) level = 'AAA';
    else if (passesAA) level = 'AA';

    return {
      element,
      foreground,
      background,
      contrast,
      isLargeText: isLarge,
      requiredRatio,
      passes: passesAA,
      level
    };
  }

  /**
   * Validate all text elements in a container
   * @param {HTMLElement} container - Container element
   * @returns {Array} Array of validation results
   */
  static validateAllTextElements(container) {
    const results = [];
    const textElements = container.querySelectorAll('*');

    textElements.forEach(element => {
      const result = this.validateElement(element);
      if (result) {
        results.push(result);
      }
    });

    return results;
  }

  /**
   * Adjust color brightness to meet target contrast ratio
   * @param {string} color - Color to adjust
   * @param {string} background - Background color
   * @param {number} targetRatio - Target contrast ratio
   * @returns {string | null} Adjusted color in hex format or null if impossible
   */
  static adjustColorForContrast(color, background, targetRatio) {
    const bgRGB = this.parseColor(background);
    if (!bgRGB) return null;

    const bgLuminance = this.getRelativeLuminance(bgRGB);
    
    // Calculate required luminance for target contrast
    let targetLuminance;
    if (bgLuminance > 0.5) {
      // Light background - need darker foreground
      targetLuminance = (bgLuminance + 0.05) / targetRatio - 0.05;
    } else {
      // Dark background - need lighter foreground
      targetLuminance = (bgLuminance + 0.05) * targetRatio - 0.05;
    }

    // Clamp luminance to valid range
    targetLuminance = Math.max(0, Math.min(1, targetLuminance));

    // Convert luminance back to RGB (simplified - uses grayscale)
    const value = targetLuminance <= 0.03928 
      ? targetLuminance * 12.92 
      : Math.pow((targetLuminance + 0.055) / 1.055, 1 / 2.4);
    
    const rgb = Math.round(value * 255);
    
    // Return as hex color
    const hex = rgb.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }

  /**
   * Generate a validation report for a container
   * @param {HTMLElement} container - Container to validate
   * @returns {{
   *   total: number,
   *   passed: number,
   *   failed: number,
   *   failures: Array
   * }} Validation report
   */
  static generateReport(container) {
    const results = this.validateAllTextElements(container);
    const failures = results.filter(r => !r.passes);

    return {
      total: results.length,
      passed: results.length - failures.length,
      failed: failures.length,
      failures: failures.map(f => ({
        element: f.element.tagName + (f.element.className ? '.' + f.element.className : ''),
        text: f.element.textContent.substring(0, 50),
        foreground: f.foreground,
        background: f.background,
        contrast: f.contrast,
        required: f.requiredRatio,
        isLargeText: f.isLargeText
      }))
    };
  }

  /**
   * Log validation report to console
   * @param {HTMLElement} container - Container to validate
   */
  static logReport(container) {
    const report = this.generateReport(container);
    
    console.group('🎨 Color Contrast Validation Report');
    console.log(`Total elements checked: ${report.total}`);
    console.log(`✅ Passed: ${report.passed}`);
    console.log(`❌ Failed: ${report.failed}`);
    
    if (report.failures.length > 0) {
      console.group('Failures:');
      report.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.element}`);
        console.log(`   Text: "${failure.text}..."`);
        console.log(`   Contrast: ${failure.contrast}:1 (required: ${failure.required}:1)`);
        console.log(`   Colors: ${failure.foreground} on ${failure.background}`);
        console.log(`   Large text: ${failure.isLargeText}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorContrastValidator;
}
