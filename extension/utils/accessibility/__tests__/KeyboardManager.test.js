/**
 * KeyboardManager Unit Tests
 * Tests keyboard shortcuts and navigation
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const KeyboardManager = require('../KeyboardManager.js');

describe('KeyboardManager', () => {
  let dom;
  let document;
  let keyboardManager;
  let mockDrawer;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="drawer">
            <button id="btn1">Button 1</button>
            <button id="btn2" role="button">Button 2</button>
            <input type="text" id="input1" />
          </div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    
    // Create mock drawer instance
    mockDrawer = {
      isOpen: true,
      wordList: ['word1', 'word2', 'word3', 'word4', 'word5'],
      currentIndex: 2,
      hide: jest.fn(),
      navigateToPrev: jest.fn(),
      navigateToNext: jest.fn(),
      navigateToFirst: jest.fn(),
      navigateToLast: jest.fn(),
      show: jest.fn()
    };
    
    keyboardManager = new KeyboardManager(mockDrawer);
  });

  afterEach(() => {
    if (keyboardManager) {
      keyboardManager.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(keyboardManager.drawer).toBe(mockDrawer);
      expect(keyboardManager.enabled).toBe(false);
    });
  });

  describe('Enable/Disable - Requirement 3.1', () => {
    test('should enable keyboard shortcuts', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      expect(keyboardManager.enabled).toBe(true);
    });

    test('should disable keyboard shortcuts', () => {
      keyboardManager.enableKeyboardShortcuts();
      keyboardManager.disableKeyboardShortcuts();
      
      expect(keyboardManager.enabled).toBe(false);
    });

    test('should not enable twice', () => {
      keyboardManager.enableKeyboardShortcuts();
      keyboardManager.enableKeyboardShortcuts();
      
      expect(keyboardManager.enabled).toBe(true);
    });
  });

  describe('Escape Key - Requirement 3.1', () => {
    test('should close drawer on Escape', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.hide).toHaveBeenCalled();
    });

    test('should not close drawer when disabled', () => {
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.hide).not.toHaveBeenCalled();
    });

    test('should not close drawer when drawer is closed', () => {
      mockDrawer.isOpen = false;
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.hide).not.toHaveBeenCalled();
    });
  });

  describe('Arrow Keys - Requirements 3.2, 3.3', () => {
    test('should navigate to next word on ArrowRight', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.navigateToNext).toHaveBeenCalled();
    });

    test('should navigate to previous word on ArrowLeft', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.navigateToPrev).toHaveBeenCalled();
    });

    test('should not navigate when focus is in input', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const input = document.getElementById('input1');
      input.focus();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        target: input
      });
      
      Object.defineProperty(event, 'target', { value: input });
      
      keyboardManager.handleKeyDown(event);
      
      // Should not navigate when in input
      expect(mockDrawer.navigateToNext).not.toHaveBeenCalled();
    });
  });

  describe('Home/End Keys - Requirements 3.7, 3.8', () => {
    test('should navigate to first word on Home', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.navigateToFirst).toHaveBeenCalled();
    });

    test('should navigate to last word on End', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.navigateToLast).toHaveBeenCalled();
    });

    test('should fallback to show method if navigateToFirst not available', () => {
      delete mockDrawer.navigateToFirst;
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      expect(mockDrawer.show).toHaveBeenCalledWith(mockDrawer.wordList[0], 0);
    });

    test('should fallback to show method if navigateToLast not available', () => {
      delete mockDrawer.navigateToLast;
      keyboardManager.enableKeyboardShortcuts();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
      
      const lastIndex = mockDrawer.wordList.length - 1;
      expect(mockDrawer.show).toHaveBeenCalledWith(mockDrawer.wordList[lastIndex], lastIndex);
    });
  });

  describe('Space/Enter Keys - Requirement 3.4', () => {
    test('should activate button on Space', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const btn = document.getElementById('btn1');
      btn.click = jest.fn();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(event, 'target', { value: btn });
      
      keyboardManager.handleKeyDown(event);
      
      expect(btn.click).toHaveBeenCalled();
    });

    test('should activate button on Enter', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const btn = document.getElementById('btn1');
      btn.click = jest.fn();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(event, 'target', { value: btn });
      
      keyboardManager.handleKeyDown(event);
      
      expect(btn.click).toHaveBeenCalled();
    });

    test('should activate element with role="button"', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const btn = document.getElementById('btn2');
      btn.click = jest.fn();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(event, 'target', { value: btn });
      
      keyboardManager.handleKeyDown(event);
      
      expect(btn.click).toHaveBeenCalled();
    });

    test('should not activate non-button elements', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const div = document.createElement('div');
      div.click = jest.fn();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true
      });
      
      Object.defineProperty(event, 'target', { value: div });
      
      keyboardManager.handleKeyDown(event);
      
      expect(div.click).not.toHaveBeenCalled();
    });
  });

  describe('Element Type Detection', () => {
    test('should detect button elements', () => {
      const btn = document.getElementById('btn1');
      expect(keyboardManager.isButton(btn)).toBe(true);
    });

    test('should detect elements with role="button"', () => {
      const btn = document.getElementById('btn2');
      expect(keyboardManager.isButton(btn)).toBe(true);
    });

    test('should detect link with role="button"', () => {
      const link = document.createElement('a');
      link.setAttribute('role', 'button');
      expect(keyboardManager.isButton(link)).toBe(true);
    });

    test('should not detect non-button elements', () => {
      const div = document.createElement('div');
      expect(keyboardManager.isButton(div)).toBe(false);
    });

    test('should detect input elements', () => {
      const input = document.getElementById('input1');
      expect(keyboardManager.isInputElement(input)).toBe(true);
    });

    test('should detect textarea elements', () => {
      const textarea = document.createElement('textarea');
      expect(keyboardManager.isInputElement(textarea)).toBe(true);
    });

    test('should detect select elements', () => {
      const select = document.createElement('select');
      expect(keyboardManager.isInputElement(select)).toBe(true);
    });

    test('should detect contentEditable elements', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      expect(keyboardManager.isInputElement(div)).toBe(true);
    });

    test('should not detect non-input elements', () => {
      const div = document.createElement('div');
      expect(keyboardManager.isInputElement(div)).toBe(false);
    });
  });

  describe('Input Element Handling', () => {
    test('should allow Escape in input elements', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const input = document.getElementById('input1');
      input.focus();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(event, 'target', { value: input });
      
      keyboardManager.handleKeyDown(event);
      
      expect(mockDrawer.hide).toHaveBeenCalled();
    });

    test('should not handle arrow keys in input elements', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      const input = document.getElementById('input1');
      input.focus();
      
      const event = new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true
      });
      
      Object.defineProperty(event, 'target', { value: input });
      
      keyboardManager.handleKeyDown(event);
      
      expect(mockDrawer.navigateToNext).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should clean up resources on destroy', () => {
      keyboardManager.enableKeyboardShortcuts();
      
      keyboardManager.destroy();
      
      expect(keyboardManager.enabled).toBe(false);
      expect(keyboardManager.drawer).toBeNull();
    });
  });
});
