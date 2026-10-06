/**
 * ARIAManager Unit Tests
 * Tests ARIA attributes, roles, and live regions
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const ARIAManager = require('../ARIAManager.js');

describe('ARIAManager', () => {
  let dom;
  let document;
  let drawer;
  let ariaManager;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="drawer">
            <h2 id="drawer-title">Word Details</h2>
            <p id="drawer-description">Detailed information about the word</p>
            <button id="close-btn">×</button>
            <button id="icon-btn">
              <svg><path d="M0 0"/></svg>
            </button>
            <button id="text-btn">Save</button>
            <a href="#" id="link1">Link</a>
          </div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    
    drawer = document.getElementById('drawer');
    ariaManager = new ARIAManager(drawer);
  });

  afterEach(() => {
    if (ariaManager) {
      ariaManager.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(ariaManager.drawer).toBe(drawer);
      expect(ariaManager.liveRegionPolite).toBeNull();
      expect(ariaManager.liveRegionAssertive).toBeNull();
      expect(ariaManager.titleId).toBeNull();
      expect(ariaManager.descriptionId).toBeNull();
    });
  });

  describe('Dialog Attributes - Requirement 1.1', () => {
    test('should set dialog role and aria-modal', () => {
      ariaManager.setDialogAttributes();
      
      expect(drawer.getAttribute('role')).toBe('dialog');
      expect(drawer.getAttribute('aria-modal')).toBe('true');
    });

    test('should handle missing drawer element gracefully', () => {
      const nullManager = new ARIAManager(null);
      
      // Should not throw error
      expect(() => nullManager.setDialogAttributes()).not.toThrow();
    });
  });

  describe('Label Associations - Requirements 1.2, 1.3', () => {
    test('should set aria-labelledby', () => {
      ariaManager.setLabelAssociations('drawer-title');
      
      expect(drawer.getAttribute('aria-labelledby')).toBe('drawer-title');
      expect(ariaManager.titleId).toBe('drawer-title');
    });

    test('should set aria-describedby', () => {
      ariaManager.setLabelAssociations('drawer-title', 'drawer-description');
      
      expect(drawer.getAttribute('aria-labelledby')).toBe('drawer-title');
      expect(drawer.getAttribute('aria-describedby')).toBe('drawer-description');
      expect(ariaManager.descriptionId).toBe('drawer-description');
    });

    test('should handle only title ID', () => {
      ariaManager.setLabelAssociations('drawer-title', null);
      
      expect(drawer.getAttribute('aria-labelledby')).toBe('drawer-title');
      expect(drawer.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('Live Regions - Requirement 1.5', () => {
    test('should create live regions', () => {
      ariaManager.createLiveRegions();
      
      expect(ariaManager.liveRegionPolite).not.toBeNull();
      expect(ariaManager.liveRegionAssertive).not.toBeNull();
      
      expect(ariaManager.liveRegionPolite.getAttribute('aria-live')).toBe('polite');
      expect(ariaManager.liveRegionAssertive.getAttribute('aria-live')).toBe('assertive');
    });

    test('should add live regions to drawer', () => {
      ariaManager.createLiveRegions();
      
      expect(drawer.contains(ariaManager.liveRegionPolite)).toBe(true);
      expect(drawer.contains(ariaManager.liveRegionAssertive)).toBe(true);
    });

    test('should set aria-atomic on live regions', () => {
      ariaManager.createLiveRegions();
      
      expect(ariaManager.liveRegionPolite.getAttribute('aria-atomic')).toBe('true');
      expect(ariaManager.liveRegionAssertive.getAttribute('aria-atomic')).toBe('true');
    });

    test('should update polite live region', (done) => {
      ariaManager.createLiveRegions();
      
      ariaManager.updateLiveRegion('Test message', 'polite');
      
      // Wait for setTimeout in updateLiveRegion
      setTimeout(() => {
        expect(ariaManager.liveRegionPolite.textContent).toBe('Test message');
        done();
      }, 150);
    });

    test('should update assertive live region', (done) => {
      ariaManager.createLiveRegions();
      
      ariaManager.updateLiveRegion('Error message', 'assertive');
      
      // Wait for setTimeout in updateLiveRegion
      setTimeout(() => {
        expect(ariaManager.liveRegionAssertive.textContent).toBe('Error message');
        done();
      }, 150);
    });

    test('should default to polite priority', (done) => {
      ariaManager.createLiveRegions();
      
      ariaManager.updateLiveRegion('Default message');
      
      setTimeout(() => {
        expect(ariaManager.liveRegionPolite.textContent).toBe('Default message');
        done();
      }, 150);
    });

    test('should handle update without initialized live regions', () => {
      // Should not throw error
      expect(() => ariaManager.updateLiveRegion('Test')).not.toThrow();
    });
  });

  describe('Accessible Names - Requirement 1.4', () => {
    test('should detect element with aria-label', () => {
      const btn = document.getElementById('close-btn');
      btn.setAttribute('aria-label', 'Close');
      
      expect(ariaManager.hasAccessibleName(btn)).toBe(true);
    });

    test('should detect element with aria-labelledby', () => {
      const btn = document.getElementById('close-btn');
      btn.setAttribute('aria-labelledby', 'some-id');
      
      expect(ariaManager.hasAccessibleName(btn)).toBe(true);
    });

    test('should detect element with text content', () => {
      const btn = document.getElementById('text-btn');
      
      expect(ariaManager.hasAccessibleName(btn)).toBe(true);
    });

    test('should detect element with title attribute', () => {
      const btn = document.getElementById('close-btn');
      btn.setAttribute('title', 'Close button');
      
      expect(ariaManager.hasAccessibleName(btn)).toBe(true);
    });

    test('should detect missing accessible name', () => {
      const btn = document.getElementById('icon-btn');
      
      expect(ariaManager.hasAccessibleName(btn)).toBe(false);
    });

    test('should validate all interactive elements', () => {
      const issues = ariaManager.ensureAccessibleNames();
      
      expect(Array.isArray(issues)).toBe(true);
      // Icon button should be flagged
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should pass validation when all elements have names', () => {
      // Add labels to all buttons
      document.getElementById('close-btn').setAttribute('aria-label', 'Close');
      document.getElementById('icon-btn').setAttribute('aria-label', 'Icon action');
      
      const issues = ariaManager.ensureAccessibleNames();
      
      expect(issues.length).toBe(0);
    });
  });

  describe('Button Labels - Requirement 1.6', () => {
    test('should add aria-label to button', () => {
      const btn = document.getElementById('icon-btn');
      
      ariaManager.addButtonLabel(btn, 'Delete');
      
      expect(btn.getAttribute('aria-label')).toBe('Delete');
    });

    test('should not overwrite existing accessible name', () => {
      const btn = document.getElementById('text-btn');
      const originalText = btn.textContent;
      
      ariaManager.addButtonLabel(btn, 'New Label');
      
      // Should not add aria-label because button has text content
      expect(btn.hasAttribute('aria-label')).toBe(false);
      expect(btn.textContent).toBe(originalText);
    });

    test('should handle null button gracefully', () => {
      expect(() => ariaManager.addButtonLabel(null, 'Label')).not.toThrow();
    });

    test('should add labels in batch', () => {
      // Remove text content from buttons so they need labels
      document.getElementById('close-btn').textContent = '';
      document.getElementById('icon-btn').textContent = '';
      
      ariaManager.addButtonLabels({
        '#close-btn': 'Close drawer',
        '#icon-btn': 'Favorite'
      });
      
      expect(document.getElementById('close-btn').getAttribute('aria-label')).toBe('Close drawer');
      expect(document.getElementById('icon-btn').getAttribute('aria-label')).toBe('Favorite');
    });
  });

  describe('Tab Structure - Requirement 1.7', () => {
    test('should set tab structure with roles', () => {
      const tablist = document.createElement('div');
      const tab1 = document.createElement('button');
      const tab2 = document.createElement('button');
      const panel1 = document.createElement('div');
      const panel2 = document.createElement('div');
      
      drawer.appendChild(tablist);
      tablist.appendChild(tab1);
      tablist.appendChild(tab2);
      drawer.appendChild(panel1);
      drawer.appendChild(panel2);
      
      ariaManager.setTabStructure(tablist, [tab1, tab2], [panel1, panel2]);
      
      expect(tablist.getAttribute('role')).toBe('tablist');
      expect(tab1.getAttribute('role')).toBe('tab');
      expect(tab2.getAttribute('role')).toBe('tab');
      expect(panel1.getAttribute('role')).toBe('tabpanel');
      expect(panel2.getAttribute('role')).toBe('tabpanel');
    });

    test('should set aria-controls on tabs', () => {
      const tablist = document.createElement('div');
      const tab1 = document.createElement('button');
      const panel1 = document.createElement('div');
      
      drawer.appendChild(tablist);
      tablist.appendChild(tab1);
      drawer.appendChild(panel1);
      
      ariaManager.setTabStructure(tablist, [tab1], [panel1]);
      
      const panelId = panel1.getAttribute('id');
      expect(tab1.getAttribute('aria-controls')).toBe(panelId);
    });

    test('should set aria-labelledby on panels', () => {
      const tablist = document.createElement('div');
      const tab1 = document.createElement('button');
      const panel1 = document.createElement('div');
      
      drawer.appendChild(tablist);
      tablist.appendChild(tab1);
      drawer.appendChild(panel1);
      
      ariaManager.setTabStructure(tablist, [tab1], [panel1]);
      
      const tabId = tab1.getAttribute('id');
      expect(panel1.getAttribute('aria-labelledby')).toBe(tabId);
    });

    test('should set first tab as focusable', () => {
      const tablist = document.createElement('div');
      const tab1 = document.createElement('button');
      const tab2 = document.createElement('button');
      const panel1 = document.createElement('div');
      const panel2 = document.createElement('div');
      
      drawer.appendChild(tablist);
      
      ariaManager.setTabStructure(tablist, [tab1, tab2], [panel1, panel2]);
      
      expect(tab1.getAttribute('tabindex')).toBe('0');
      expect(tab2.getAttribute('tabindex')).toBe('-1');
    });

    test('should handle incomplete tab structure', () => {
      expect(() => ariaManager.setTabStructure(null, [], [])).not.toThrow();
    });
  });

  describe('ARIA State Management', () => {
    test('should update aria-expanded', () => {
      const element = document.createElement('button');
      
      ariaManager.updateAriaExpanded(element, true);
      expect(element.getAttribute('aria-expanded')).toBe('true');
      
      ariaManager.updateAriaExpanded(element, false);
      expect(element.getAttribute('aria-expanded')).toBe('false');
    });

    test('should update aria-hidden', () => {
      const element = document.createElement('div');
      
      ariaManager.updateAriaHidden(element, true);
      expect(element.getAttribute('aria-hidden')).toBe('true');
      
      ariaManager.updateAriaHidden(element, false);
      expect(element.hasAttribute('aria-hidden')).toBe(false);
    });

    test('should set aria-current', () => {
      const element = document.createElement('div');
      
      ariaManager.setAriaCurrent(element);
      expect(element.getAttribute('aria-current')).toBe('true');
    });

    test('should remove aria-current', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-current', 'true');
      
      ariaManager.removeAriaCurrent(element);
      expect(element.hasAttribute('aria-current')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should remove live regions on destroy', () => {
      ariaManager.createLiveRegions();
      
      const politeRegion = ariaManager.liveRegionPolite;
      const assertiveRegion = ariaManager.liveRegionAssertive;
      
      ariaManager.destroy();
      
      expect(drawer.contains(politeRegion)).toBe(false);
      expect(drawer.contains(assertiveRegion)).toBe(false);
      expect(ariaManager.liveRegionPolite).toBeNull();
      expect(ariaManager.liveRegionAssertive).toBeNull();
    });

    test('should handle destroy without live regions', () => {
      expect(() => ariaManager.destroy()).not.toThrow();
    });
  });
});
