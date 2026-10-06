/**
 * Dialog Manager Module
 * Feature: svg-icon-replacement
 * 
 * Manages dialog headers and replaces emoji with SVG icons
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

class DialogManager {
  constructor() {
    this.iconLibrary = null;
    this.dialogs = [
      {
        id: 'importDialog',
        titleElementId: 'importDialogTitle',
        iconName: 'import',
        title: '导入数据'
      },
      {
        id: 'exportDialog',
        titleElementId: 'exportDialogTitle',
        iconName: 'export',
        title: '导出数据'
      },
      {
        id: 'detailTranslationDialog',
        titleElementId: 'translationDialogTitle',
        iconName: 'book',
        title: '详细翻译'
      }
    ];
  }

  /**
   * Initialize dialog manager with icon library
   * @param {Object} iconLib - Icon library instance (optional, will use window.iconLibrary if not provided)
   */
  async initialize(iconLib) {
    // Use provided icon library or fall back to window.iconLibrary
    this.iconLibrary = iconLib || (typeof window !== 'undefined' ? window.iconLibrary : null);
    
    if (!this.iconLibrary) {
      console.warn('DialogManager: Icon library not available');
      return;
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupDialogHeaders());
    } else {
      this.setupDialogHeaders();
    }
  }

  /**
   * Setup dialog headers with SVG icons
   * Requirement: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  setupDialogHeaders() {
    if (!this.iconLibrary || typeof this.iconLibrary.getIcon !== 'function') {
      console.warn('DialogManager: Icon library not properly initialized');
      return;
    }

    this.dialogs.forEach(dialog => {
      const titleElement = document.getElementById(dialog.titleElementId);
      if (!titleElement) {
        console.warn(`DialogManager: Title element not found for ${dialog.id}`);
        return;
      }

      // Get SVG icon from library
      const svg = this.iconLibrary.getIcon(dialog.iconName);
      if (!svg) {
        console.warn(`DialogManager: Icon "${dialog.iconName}" not found in library`);
        return;
      }

      // Set the title with SVG icon
      titleElement.innerHTML = svg + ' ' + dialog.title;
      
      console.log(`✅ DialogManager: Set up ${dialog.id} with ${dialog.iconName} icon`);
    });
  }

  /**
   * Get dialog configuration by ID
   * @param {string} dialogId - Dialog ID
   * @returns {Object|null} - Dialog configuration or null
   */
  getDialogConfig(dialogId) {
    return this.dialogs.find(d => d.id === dialogId) || null;
  }

  /**
   * Update dialog header icon
   * @param {string} dialogId - Dialog ID
   * @param {string} newIconName - New icon name
   */
  updateDialogIcon(dialogId, newIconName) {
    const dialog = this.getDialogConfig(dialogId);
    if (!dialog) {
      console.warn(`DialogManager: Dialog "${dialogId}" not found`);
      return;
    }

    const titleElement = document.getElementById(dialog.titleElementId);
    if (!titleElement) {
      console.warn(`DialogManager: Title element not found for ${dialogId}`);
      return;
    }

    const svg = this.iconLibrary.getIcon(newIconName);
    if (!svg) {
      console.warn(`DialogManager: Icon "${newIconName}" not found in library`);
      return;
    }

    titleElement.innerHTML = svg + ' ' + dialog.title;
    dialog.iconName = newIconName;
    
    console.log(`✅ DialogManager: Updated ${dialogId} icon to ${newIconName}`);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DialogManager;
} else if (typeof window !== 'undefined') {
  window.DialogManager = DialogManager;
}
