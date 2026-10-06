/**
 * POS Settings Integration
 * 
 * Integrates the POS settings panel into the existing popup interface.
 * Adds a settings button to open the configuration panel.
 */

(function() {
  'use strict';
  
  /**
   * Initialize POS settings integration
   */
  function initPOSSettings() {
    // Check if we're on the dashboard page
    const isDashboard = window.location.pathname.includes('dashboard.html');
    
    if (isDashboard) {
      addSettingsButton();
    }
  }
  
  /**
   * Add settings button to the dashboard
   */
  function addSettingsButton() {
    // Find a suitable location for the button
    // This depends on your existing dashboard structure
    // For now, we'll add it to the body or a settings section
    
    const settingsButton = document.createElement('button');
    settingsButton.id = 'posSettingsButton';
    settingsButton.className = 'pos-settings-trigger';
    settingsButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
      </svg>
      <span>词性识别设置</span>
    `;
    
    settingsButton.addEventListener('click', openPOSSettings);
    
    // Try to find the settings section or add to body
    const settingsSection = document.querySelector('.settings-section') || 
                           document.querySelector('.dashboard-settings') ||
                           document.body;
    
    settingsSection.appendChild(settingsButton);
    
    // Add styles for the button
    addButtonStyles();
  }
  
  /**
   * Add styles for the settings button
   */
  function addButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pos-settings-trigger {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #333;
        transition: all 0.2s;
        margin: 12px 0;
      }
      
      .pos-settings-trigger:hover {
        background: #f8f9ff;
        border-color: #667eea;
        color: #667eea;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
      }
      
      .pos-settings-trigger svg {
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Open POS settings panel
   */
  async function openPOSSettings() {
    try {
      // Load the settings panel component if not already loaded
      if (typeof POSSettingsPanel === 'undefined') {
        await loadSettingsPanel();
      }
      
      // Create and show the panel
      const panel = new POSSettingsPanel();
      await panel.show();
    } catch (error) {
      console.error('Failed to open POS settings:', error);
      alert('无法打开设置面板: ' + error.message);
    }
  }
  
  /**
   * Load settings panel component
   */
  function loadSettingsPanel() {
    return new Promise((resolve, reject) => {
      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = '../popup/css/pos-settings.css';
      document.head.appendChild(cssLink);
      
      // Load JS
      const script = document.createElement('script');
      script.src = '../popup/components/pos-settings-panel.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Add keyboard shortcut (Ctrl+Shift+P)
   */
  function addKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        openPOSSettings();
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPOSSettings);
  } else {
    initPOSSettings();
  }
  
  // Add keyboard shortcut
  addKeyboardShortcut();
  
  // Export for external use
  window.openPOSSettings = openPOSSettings;
})();
