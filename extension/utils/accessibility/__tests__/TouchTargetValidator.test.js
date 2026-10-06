/**
 * TouchTargetValidator Tests
 * 
 * Tests for touch target size validation utility
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 * 
 * @jest-environment jsdom
 */

describe('TouchTargetValidator', () => {
  let TouchTargetValidator;
  
  beforeAll(() => {
    // Load the module
    TouchTargetValidator = require('../TouchTargetValidator');
  });

  describe('validateTouchTarget', () => {
    it('should validate element meets minimum size requirements', () => {
      const element = document.createElement('button');
      element.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 0,
        right: 44,
        bottom: 44
      }));

      const result = TouchTargetValidator.validateTouchTarget(element);

      expect(result.valid).toBe(true);
      expect(result.width).toBe(44);
      expect(result.height).toBe(44);
      expect(result.meetsWidth).toBe(true);
      expect(result.meetsHeight).toBe(true);
    });

    it('should fail validation for undersized elements', () => {
      const element = document.createElement('button');
      element.getBoundingClientRect = jest.fn(() => ({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        right: 30,
        bottom: 30
      }));

      const result = TouchTargetValidator.validateTouchTarget(element);

      expect(result.valid).toBe(false);
      expect(result.meetsWidth).toBe(false);
      expect(result.meetsHeight).toBe(false);
    });

    it('should fail validation for element with insufficient width', () => {
      const element = document.createElement('button');
      element.getBoundingClientRect = jest.fn(() => ({
        width: 30,
        height: 44,
        top: 0,
        left: 0,
        right: 30,
        bottom: 44
      }));

      const result = TouchTargetValidator.validateTouchTarget(element);

      expect(result.valid).toBe(false);
      expect(result.meetsWidth).toBe(false);
      expect(result.meetsHeight).toBe(true);
    });

    it('should fail validation for element with insufficient height', () => {
      const element = document.createElement('button');
      element.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 30,
        top: 0,
        left: 0,
        right: 44,
        bottom: 30
      }));

      const result = TouchTargetValidator.validateTouchTarget(element);

      expect(result.valid).toBe(false);
      expect(result.meetsWidth).toBe(true);
      expect(result.meetsHeight).toBe(false);
    });

    it('should handle invalid element gracefully', () => {
      const result = TouchTargetValidator.validateTouchTarget(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid element provided');
    });
  });

  describe('meetsMinimumSize', () => {
    it('should return true for dimensions meeting minimum', () => {
      expect(TouchTargetValidator.meetsMinimumSize(44, 44)).toBe(true);
      expect(TouchTargetValidator.meetsMinimumSize(50, 50)).toBe(true);
      expect(TouchTargetValidator.meetsMinimumSize(44, 50)).toBe(true);
    });

    it('should return false for dimensions below minimum', () => {
      expect(TouchTargetValidator.meetsMinimumSize(43, 44)).toBe(false);
      expect(TouchTargetValidator.meetsMinimumSize(44, 43)).toBe(false);
      expect(TouchTargetValidator.meetsMinimumSize(30, 30)).toBe(false);
    });
  });

  describe('validateSpacing', () => {
    it('should validate adequate spacing between elements', () => {
      const element1 = document.createElement('button');
      element1.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        right: 44,
        bottom: 44
      }));

      const element2 = document.createElement('button');
      element2.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 52, // 8px gap
        right: 96,
        bottom: 44
      }));

      const result = TouchTargetValidator.validateSpacing(element1, element2);

      expect(result.valid).toBe(true);
      expect(result.spacing).toBeGreaterThanOrEqual(8);
    });

    it('should fail validation for insufficient spacing', () => {
      const element1 = document.createElement('button');
      element1.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        right: 44,
        bottom: 44
      }));

      const element2 = document.createElement('button');
      element2.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 48, // 4px gap
        right: 92,
        bottom: 44
      }));

      const result = TouchTargetValidator.validateSpacing(element1, element2);

      expect(result.valid).toBe(false);
      expect(result.spacing).toBeLessThan(8);
    });

    it('should handle invalid elements gracefully', () => {
      const result = TouchTargetValidator.validateSpacing(null, null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid elements provided');
    });
  });

  describe('validateAllInteractiveElements', () => {
    it('should validate all interactive elements in container', () => {
      const container = document.createElement('div');
      
      const button1 = document.createElement('button');
      button1.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 0,
        right: 44,
        bottom: 44
      }));
      
      const button2 = document.createElement('button');
      button2.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 52,
        right: 96,
        bottom: 44
      }));
      
      container.appendChild(button1);
      container.appendChild(button2);
      
      container.querySelectorAll = jest.fn(() => [button1, button2]);

      const result = TouchTargetValidator.validateAllInteractiveElements(container);

      expect(result.valid).toBe(true);
      expect(result.totalElements).toBe(2);
      expect(result.passedElements).toBe(2);
      expect(result.failedElements).toBe(0);
    });

    it('should identify failing elements', () => {
      const container = document.createElement('div');
      
      const button1 = document.createElement('button');
      button1.getBoundingClientRect = jest.fn(() => ({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        right: 30,
        bottom: 30
      }));
      
      const button2 = document.createElement('button');
      button2.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 38,
        right: 82,
        bottom: 44
      }));
      
      container.appendChild(button1);
      container.appendChild(button2);
      
      container.querySelectorAll = jest.fn(() => [button1, button2]);

      const result = TouchTargetValidator.validateAllInteractiveElements(container);

      expect(result.valid).toBe(false);
      expect(result.totalElements).toBe(2);
      expect(result.passedElements).toBe(1);
      expect(result.failedElements).toBe(1);
      expect(result.failures).toHaveLength(1);
    });

    it('should handle empty container', () => {
      const container = document.createElement('div');
      container.querySelectorAll = jest.fn(() => []);

      const result = TouchTargetValidator.validateAllInteractiveElements(container);

      expect(result.valid).toBe(true);
      expect(result.totalElements).toBe(0);
    });

    it('should handle null container', () => {
      const result = TouchTargetValidator.validateAllInteractiveElements(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No container provided');
    });
  });

  describe('generateTouchTargetReport', () => {
    it('should generate report for passing validation', () => {
      const container = document.createElement('div');
      
      const button = document.createElement('button');
      button.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 0,
        right: 44,
        bottom: 44
      }));
      
      container.appendChild(button);
      container.querySelectorAll = jest.fn(() => [button]);

      const report = TouchTargetValidator.generateTouchTargetReport(container);

      expect(report.summary.passed).toBe(true);
      expect(report.summary.complianceRate).toBe('100%');
      expect(report.message).toBeDefined();
    });

    it('should generate detailed report for failures', () => {
      const container = document.createElement('div');
      
      const button = document.createElement('button');
      button.id = 'test-button';
      button.getBoundingClientRect = jest.fn(() => ({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        right: 30,
        bottom: 30
      }));
      
      container.appendChild(button);
      container.querySelectorAll = jest.fn(() => [button]);

      const report = TouchTargetValidator.generateTouchTargetReport(container);

      expect(report.summary.passed).toBe(false);
      expect(report.summary.failedElements).toBe(1);
      expect(report.failures).toHaveLength(1);
      expect(report.failures[0].selector).toBe('#test-button');
      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate compliance rate correctly', () => {
      const container = document.createElement('div');
      
      const button1 = document.createElement('button');
      button1.getBoundingClientRect = jest.fn(() => ({
        width: 44,
        height: 44,
        top: 0,
        left: 0,
        right: 44,
        bottom: 44
      }));
      
      const button2 = document.createElement('button');
      button2.getBoundingClientRect = jest.fn(() => ({
        width: 30,
        height: 30,
        top: 0,
        left: 52,
        right: 82,
        bottom: 30
      }));
      
      container.appendChild(button1);
      container.appendChild(button2);
      container.querySelectorAll = jest.fn(() => [button1, button2]);

      const report = TouchTargetValidator.generateTouchTargetReport(container);

      expect(report.summary.complianceRate).toBe('50.0%');
    });
  });

  describe('_getElementSelector', () => {
    it('should return ID selector when available', () => {
      const element = document.createElement('button');
      element.id = 'my-button';

      const selector = TouchTargetValidator._getElementSelector(element);

      expect(selector).toBe('#my-button');
    });

    it('should return class selector when ID not available', () => {
      const element = document.createElement('button');
      element.className = 'btn btn-primary';

      const selector = TouchTargetValidator._getElementSelector(element);

      expect(selector).toBe('button.btn.btn-primary');
    });

    it('should return role selector when no ID or class', () => {
      const element = document.createElement('div');
      element.setAttribute('role', 'button');

      const selector = TouchTargetValidator._getElementSelector(element);

      expect(selector).toBe('div[role="button"]');
    });

    it('should return tag name as fallback', () => {
      const element = document.createElement('button');

      const selector = TouchTargetValidator._getElementSelector(element);

      expect(selector).toBe('button');
    });

    it('should handle null element', () => {
      const selector = TouchTargetValidator._getElementSelector(null);

      expect(selector).toBe('unknown');
    });
  });
});
