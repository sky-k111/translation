/**
 * FocusManager Unit Tests
 * Tests focus trap, focus restoration, and focus management functionality
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const FocusManager = require('../FocusManager.js');

describe('FocusManager', () => {
  let dom;
  let document;
  let container;
  let focusManager;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="container">
            <button id="btn1">Button 1</button>
            <button id="btn2">Button 2</button>
            <button id="btn3">Button 3</button>
            <button id="btn4" disabled>Button 4 (disabled)</button>
            <a href="#" id="link1">Link 1</a>
            <input type="text" id="input1" />
          </div>
          <button id="external">External Button</button>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    
    container = document.getElementById('container');
    focusManager = new FocusManager(container);
  });

  afterEach(() => {
    if (focusManager) {
      focusManager.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(focusManager.container).toBe(container);
      expect(focusManager.focusOrigin).toBeNull();
      expect(focusManager.focusableElements).toEqual([]);
      expect(focusManager.trapEnabled).toBe(false);
    });

    test('should have correct focusable selector', () => {
      expect(focusManager.focusableSelector).toContain('button:not([disabled])');
      expect(focusManager.focusableSelector).toContain('[href]');
      expect(focusManager.focusableSelector).toContain('input:not([disabled])');
    });
  });

  describe('Focus Trap - Requirement 2.1, 2.2, 2.3', () => {
    test('should enable focus trap', () => {
      focusManager.enableFocusTrap();
      
      expect(focusManager.trapEnabled).toBe(true);
      expect(focusManager.focusableElements.length).toBeGreaterThan(0);
    });

    test('should disable focus trap', () => {
      focusManager.enableFocusTrap();
      focusManager.disableFocusTrap();
      
      expect(focusManager.trapEnabled).toBe(false);
    });

    test('should find all focusable elements excluding disabled', () => {
      focusManager.updateFocusableElements();
      
      // Should find 3 buttons (excluding disabled), 1 link, 1 input = 5 elements
      expect(focusManager.focusableElements.length).toBe(5);
      
      // Should not include disabled button
      const disabledButton = document.getElementById('btn4');
      expect(focusManager.focusableElements).not.toContain(disabledButton);
    });

    test('should wrap focus from last to first element on Tab', () => {
      focusManager.enableFocusTrap();
      focusManager.updateFocusableElements();
      
      const lastElement = focusManager.focusableElements[focusManager.focusableElements.length - 1];
      lastElement.focus();
      
      // Simulate Tab key
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn()
      });
      
      container.dispatchEvent(event);
      
      // Focus should move to first element
      expect(document.activeElement).toBe(focusManager.focusableElements[0]);
    });

    test('should wrap focus from first to last element on Shift+Tab', () => {
      focusManager.enableFocusTrap();
      focusManager.updateFocusableElements();
      
      const firstElement = focusManager.focusableElements[0];
      firstElement.focus();
      
      // Simulate Shift+Tab key
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(event, 'preventDefault', {
        value: jest.fn()
      });
      
      container.dispatchEvent(event);
      
      // Focus should move to last element
      const lastIndex = focusManager.focusableElements.length - 1;
      expect(document.activeElement).toBe(focusManager.focusableElements[lastIndex]);
    });
  });

  describe('Focus Restoration - Requirement 2.4', () => {
    test('should save focus origin', () => {
      const externalButton = document.getElementById('external');
      externalButton.focus();
      
      focusManager.saveFocusOrigin();
      
      expect(focusManager.focusOrigin).toBe(externalButton);
    });

    test('should restore focus to saved origin', () => {
      const externalButton = document.getElementById('external');
      externalButton.focus();
      
      focusManager.saveFocusOrigin();
      
      // Change focus
      const btn1 = document.getElementById('btn1');
      btn1.focus();
      
      // Restore focus
      focusManager.restoreFocus();
      
      expect(document.activeElement).toBe(externalButton);
    });

    test('should handle missing focus origin gracefully', () => {
      focusManager.restoreFocus();
      
      // Should not throw error
      expect(focusManager.focusOrigin).toBeNull();
    });

    test('should focus body if origin element is removed from DOM', () => {
      const tempButton = document.createElement('button');
      tempButton.id = 'temp';
      document.body.appendChild(tempButton);
      tempButton.focus();
      
      focusManager.saveFocusOrigin();
      
      // Remove element from DOM
      document.body.removeChild(tempButton);
      
      // Restore focus
      focusManager.restoreFocus();
      
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('Focus Movement - Requirement 2.1', () => {
    test('should move focus to first element', () => {
      focusManager.moveFocusToFirst();
      
      expect(document.activeElement).toBe(focusManager.focusableElements[0]);
    });

    test('should move focus to last element', () => {
      focusManager.moveFocusToLast();
      
      const lastIndex = focusManager.focusableElements.length - 1;
      expect(document.activeElement).toBe(focusManager.focusableElements[lastIndex]);
    });

    test('should handle empty focusable elements list', () => {
      // Create container with no focusable elements
      const emptyContainer = document.createElement('div');
      const emptyManager = new FocusManager(emptyContainer);
      
      // Should not throw error
      expect(() => emptyManager.moveFocusToFirst()).not.toThrow();
      expect(() => emptyManager.moveFocusToLast()).not.toThrow();
      
      emptyManager.destroy();
    });
  });

  describe('Focusable Element Detection - Requirement 2.7', () => {
    test('should exclude disabled elements', () => {
      const disabledButton = document.getElementById('btn4');
      
      expect(focusManager.isElementFocusable(disabledButton)).toBe(false);
    });

    test('should exclude hidden elements', () => {
      const btn1 = document.getElementById('btn1');
      btn1.style.display = 'none';
      
      expect(focusManager.isElementFocusable(btn1)).toBe(false);
    });

    test('should exclude elements with visibility hidden', () => {
      const btn1 = document.getElementById('btn1');
      btn1.style.visibility = 'hidden';
      
      expect(focusManager.isElementFocusable(btn1)).toBe(false);
    });

    test('should exclude elements with tabindex="-1"', () => {
      const btn1 = document.getElementById('btn1');
      btn1.setAttribute('tabindex', '-1');
      
      expect(focusManager.isElementFocusable(btn1)).toBe(false);
    });

    test('should include visible enabled elements', () => {
      const btn1 = document.getElementById('btn1');
      
      expect(focusManager.isElementFocusable(btn1)).toBe(true);
    });
  });

  describe('Focus Order Validation - Requirement 2.6', () => {
    test('should validate focus order', () => {
      const issues = focusManager.validateFocusOrder();
      
      expect(Array.isArray(issues)).toBe(true);
    });

    test('should detect positive tabindex issues', () => {
      const btn1 = document.getElementById('btn1');
      btn1.setAttribute('tabindex', '5');
      
      const issues = focusManager.validateFocusOrder();
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].issue).toContain('正数 tabindex');
    });

    test('should pass validation with no tabindex issues', () => {
      const issues = focusManager.validateFocusOrder();
      
      expect(issues.length).toBe(0);
    });
  });

  describe('Get Focusable Elements', () => {
    test('should return focusable elements array', () => {
      focusManager.updateFocusableElements();
      
      const elements = focusManager.getFocusableElements();
      
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    test('should clean up resources on destroy', () => {
      focusManager.enableFocusTrap();
      focusManager.saveFocusOrigin();
      
      focusManager.destroy();
      
      expect(focusManager.trapEnabled).toBe(false);
      expect(focusManager.focusOrigin).toBeNull();
      expect(focusManager.focusableElements).toEqual([]);
    });
  });
});
