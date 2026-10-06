/**
 * Color Mapper Service
 * 
 * Responsible for mapping part-of-speech tags to visual colors for the Chrome extension.
 * Supports customizable color schemes and DOM element styling.
 * 
 * Requirements: 8.1-8.5
 */

import { POSTag, ColorScheme } from '../types/pos';

/**
 * Default color scheme for POS visualization
 * Each POS tag is assigned a distinct, accessible color
 */
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  noun: '#4A90E2',      // Blue - stable, concrete
  verb: '#E24A4A',      // Red - action, dynamic
  adjective: '#50C878', // Green - descriptive, modifying
  adverb: '#F5A623',    // Orange - manner, degree
  unknown: '#9B9B9B'    // Gray - uncertain
};

/**
 * ColorMapper Interface
 * Defines the contract for color mapping functionality
 */
export interface ColorMapper {
  /**
   * Get the color associated with a part-of-speech tag
   * @param pos - The POS tag to get color for
   * @returns Hex color string (e.g., "#4A90E2")
   */
  getColor(pos: POSTag): string;

  /**
   * Apply color styling to a DOM element based on POS tag
   * @param element - The HTML element to style
   * @param pos - The POS tag determining the color
   */
  applyColor(element: HTMLElement, pos: POSTag): void;

  /**
   * Update the color scheme used for mapping
   * @param scheme - New color scheme to use
   */
  updateColorScheme(scheme: ColorScheme): void;
}

/**
 * Simple implementation of ColorMapper
 * Uses a configurable color scheme to map POS tags to colors
 */
export class SimpleColorMapper implements ColorMapper {
  private colorScheme: ColorScheme;

  /**
   * Create a new ColorMapper with optional custom color scheme
   * @param customScheme - Optional custom color scheme (defaults to DEFAULT_COLOR_SCHEME)
   */
  constructor(customScheme?: ColorScheme) {
    this.colorScheme = customScheme || { ...DEFAULT_COLOR_SCHEME };
  }

  /**
   * Get the color for a given POS tag
   * Requirement 8.1: Apply adjective color when word is identified as adjective
   * Requirement 8.2: Apply verb color when word is identified as verb
   * Requirement 8.3: Apply noun color when word is identified as noun
   * 
   * @param pos - The part-of-speech tag
   * @returns Hex color string
   */
  getColor(pos: POSTag): string {
    return this.colorScheme[pos];
  }

  /**
   * Apply color to a DOM element based on POS tag
   * Requirement 8.4: Update color within 50ms of POS recognition
   * Requirement 8.5: Immediately update display when POS classification changes
   * 
   * @param element - The HTML element to style
   * @param pos - The part-of-speech tag
   */
  applyColor(element: HTMLElement, pos: POSTag): void {
    const color = this.getColor(pos);
    element.style.color = color;
    // Also set a data attribute for potential CSS styling
    element.setAttribute('data-pos', pos);
  }

  /**
   * Update the color scheme
   * Allows runtime customization of colors
   * 
   * @param scheme - New color scheme to use
   */
  updateColorScheme(scheme: ColorScheme): void {
    this.colorScheme = { ...scheme };
  }

  /**
   * Get the current color scheme
   * Useful for debugging and testing
   * 
   * @returns Current color scheme
   */
  getCurrentScheme(): ColorScheme {
    return { ...this.colorScheme };
  }
}

/**
 * Factory function to create a ColorMapper instance
 * @param customScheme - Optional custom color scheme
 * @returns A new ColorMapper instance
 */
export function createColorMapper(customScheme?: ColorScheme): ColorMapper {
  return new SimpleColorMapper(customScheme);
}
