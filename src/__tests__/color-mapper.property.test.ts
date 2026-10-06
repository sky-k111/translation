/**
 * Property-Based Tests for Color Mapper
 * 
 * Feature: pos-recognition-optimization
 * Property 8: 词性到颜色的一致映射
 * 
 * Validates Requirements: 8.1, 8.2, 8.3
 * 
 * These tests verify that:
 * 1. Same POS tag always returns the same color (consistency)
 * 2. Different POS tags return different colors (distinctness)
 */

import fc from 'fast-check';
import { SimpleColorMapper, DEFAULT_COLOR_SCHEME } from '../services/color-mapper';
import { POSTag, ColorScheme } from '../types/pos';

describe('Color Mapper - Property-Based Tests', () => {
  /**
   * Property 8a: Same POS tag always maps to the same color
   * 
   * For any POS tag, calling getColor() multiple times should always
   * return the exact same color value. This ensures consistency in
   * visual representation.
   * 
   * Validates: Requirements 8.1, 8.2, 8.3
   */
  test('Property 8a: 相同词性总是映射到相同颜色', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        (pos) => {
          const colorMapper = new SimpleColorMapper();
          
          // Get color multiple times
          const color1 = colorMapper.getColor(pos);
          const color2 = colorMapper.getColor(pos);
          const color3 = colorMapper.getColor(pos);
          
          // All calls should return the same color
          return color1 === color2 && color2 === color3;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8b: Different POS tags map to different colors
   * 
   * For any two different POS tags, they should map to different colors.
   * This ensures visual distinctness for language learners.
   * 
   * Validates: Requirements 8.1, 8.2, 8.3
   */
  test('Property 8b: 不同词性映射到不同颜色', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        (pos1, pos2) => {
          const colorMapper = new SimpleColorMapper();
          
          const color1 = colorMapper.getColor(pos1);
          const color2 = colorMapper.getColor(pos2);
          
          // If POS tags are different, colors should be different
          if (pos1 === pos2) {
            return color1 === color2;
          } else {
            return color1 !== color2;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8c: Color values are valid hex colors
   * 
   * All returned colors should be valid hex color strings in the format #RRGGBB
   */
  test('Property 8c: 返回的颜色值是有效的十六进制颜色', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        (pos) => {
          const colorMapper = new SimpleColorMapper();
          const color = colorMapper.getColor(pos);
          
          // Check if color is a valid hex color (#RRGGBB)
          const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
          return hexColorRegex.test(color);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8d: Custom color scheme is respected
   * 
   * When a custom color scheme is provided, the mapper should use those colors
   * instead of the default ones.
   */
  test('Property 8d: 自定义颜色方案被正确应用', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (pos, hexColor) => {
          // Create a custom scheme where all colors are the same custom color
          const customScheme: ColorScheme = {
            noun: `#${hexColor}`,
            verb: `#${hexColor}`,
            adjective: `#${hexColor}`,
            adverb: `#${hexColor}`,
            unknown: `#${hexColor}`
          };
          
          const colorMapper = new SimpleColorMapper(customScheme);
          const color = colorMapper.getColor(pos);
          
          // Should return the custom color
          return color === `#${hexColor}`;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8e: updateColorScheme changes colors consistently
   * 
   * After updating the color scheme, all subsequent getColor calls should
   * use the new scheme.
   */
  test('Property 8e: 更新颜色方案后一致使用新颜色', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (pos, hexColor) => {
          const colorMapper = new SimpleColorMapper();
          
          // Get original color
          const originalColor = colorMapper.getColor(pos);
          
          // Update scheme
          const newScheme: ColorScheme = {
            noun: `#${hexColor}`,
            verb: `#${hexColor}`,
            adjective: `#${hexColor}`,
            adverb: `#${hexColor}`,
            unknown: `#${hexColor}`
          };
          colorMapper.updateColorScheme(newScheme);
          
          // Get new color
          const newColor = colorMapper.getColor(pos);
          
          // New color should be different from original (unless by chance they're the same)
          // and should match the new scheme
          return newColor === `#${hexColor}`;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8f: applyColor sets correct style on DOM element
   * 
   * When applyColor is called, it should set the element's color style
   * to match the POS tag's color.
   */
  test('Property 8f: applyColor 正确设置 DOM 元素样式', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
        (pos) => {
          const colorMapper = new SimpleColorMapper();
          
          // Create a mock DOM element
          const element = {
            style: { color: '' },
            setAttribute: jest.fn()
          } as unknown as HTMLElement;
          
          // Apply color
          colorMapper.applyColor(element, pos);
          
          // Check that style.color was set to the correct color
          const expectedColor = colorMapper.getColor(pos);
          return element.style.color === expectedColor;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8g: Default color scheme has all required POS tags
   * 
   * The default color scheme should have colors defined for all POS tags.
   */
  test('Property 8g: 默认颜色方案包含所有词性标签', () => {
    const requiredTags: POSTag[] = ['noun', 'verb', 'adjective', 'adverb', 'unknown'];
    
    requiredTags.forEach(tag => {
      expect(DEFAULT_COLOR_SCHEME[tag]).toBeDefined();
      expect(typeof DEFAULT_COLOR_SCHEME[tag]).toBe('string');
      expect(DEFAULT_COLOR_SCHEME[tag]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
