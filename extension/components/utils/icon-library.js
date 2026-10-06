/**
 * Icon Library Module
 * Centralized repository of all SVG icons used for emoji replacement
 * All icons follow consistent design specifications:
 * - viewBox="0 0 24 24"
 * - stroke-width="2"
 * - stroke="currentColor"
 * - fill="none"
 * - stroke-linecap="round"
 * - stroke-linejoin="round"
 */

const iconLibrary = {
  // Book icon - for learning/studied words
  book: {
    name: 'book',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    description: 'Book/learning icon'
  },

  // Target icon - for goals/challenges
  target: {
    name: 'target',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="9"></circle></svg>',
    description: 'Target/goal icon'
  },

  // Checkmark icon - for completion/success
  checkmark: {
    name: 'checkmark',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    description: 'Checkmark/success icon'
  },

  // Import icon - for importing data
  import: {
    name: 'import',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    description: 'Import icon'
  },

  // Export icon - for exporting data
  export: {
    name: 'export',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    description: 'Export icon'
  },

  // Settings icon - for configuration
  settings: {
    name: 'settings',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m3.08-3.08l4.24-4.24"></path></svg>',
    description: 'Settings icon'
  },

  // Palette icon - for appearance/theme settings
  palette: {
    name: 'palette',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    description: 'Palette/theme icon'
  },

  // AI icon - for artificial intelligence
  ai: {
    name: 'ai',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4m0 12v4M2 12h4m12 0h4"></path></svg>',
    description: 'AI/robot icon'
  },

  // Database icon - for data management
  database: {
    name: 'database',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14a9 3 0 0 0 18 0V5"></path><path d="M3 12a9 3 0 0 0 18 0"></path></svg>',
    description: 'Database/storage icon'
  },

  // Example icon - for examples/notes
  example: {
    name: 'example',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    description: 'Example/note icon'
  },

  // Synonym icon - for synonyms
  synonym: {
    name: 'synonym',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 0 1 14.85-4.95M23 20v-6h-6"></path><path d="M20.49 9a9 9 0 0 1-14.85 4.95"></path></svg>',
    description: 'Synonym/exchange icon'
  },

  // Antonym icon - for antonyms
  antonym: {
    name: 'antonym',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M19 12H5"></path></svg>',
    description: 'Antonym/opposite icon'
  },

  // Tree icon - for word roots/etymology
  tree: {
    name: 'tree',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"></path><path d="M6 8h12"></path><path d="M9 8v6"></path><path d="M15 8v6"></path><path d="M12 14v8"></path><path d="M8 22h8"></path></svg>',
    description: 'Tree/root icon'
  },

  // Info icon - for information
  info: {
    name: 'info',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    description: 'Info icon'
  },

  // Copy icon - for copying content
  copy: {
    name: 'copy',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
    description: 'Copy icon'
  },

  // Share icon - for sharing content
  share: {
    name: 'share',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
    description: 'Share icon'
  },

  // Add icon - for adding items
  add: {
    name: 'add',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    description: 'Add/plus icon'
  },

  // Globe icon - for global/translation settings
  globe: {
    name: 'globe',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    description: 'Globe/world icon'
  },

  // Star icon - for favorites/rating
  star: {
    name: 'star',
    svg: '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    description: 'Star/favorite icon'
  }
};

/**
 * Get icon by name
 * @param {string} iconName - The name of the icon to retrieve
 * @returns {string} - SVG markup string, or fallback icon if not found
 */
function getIcon(iconName) {
  if (iconLibrary[iconName]) {
    return iconLibrary[iconName].svg;
  }
  
  // Log warning for missing icon
  console.warn(`Icon "${iconName}" not found in library. Using fallback icon.`);
  
  // Return fallback info icon
  return iconLibrary.info.svg;
}

/**
 * Get all available icons
 * @returns {Object} - Object mapping icon names to their SVG markup
 */
function getAllIcons() {
  const allIcons = {};
  for (const [name, iconData] of Object.entries(iconLibrary)) {
    allIcons[name] = iconData.svg;
  }
  return allIcons;
}

/**
 * Get icon metadata (name, svg, description)
 * @param {string} iconName - The name of the icon
 * @returns {Object|null} - Icon metadata or null if not found
 */
function getIconMetadata(iconName) {
  return iconLibrary[iconName] || null;
}

/**
 * Get all icon names
 * @returns {Array<string>} - Array of all available icon names
 */
function getIconNames() {
  return Object.keys(iconLibrary);
}

/**
 * Check if icon exists in library
 * @param {string} iconName - The name of the icon to check
 * @returns {boolean} - True if icon exists, false otherwise
 */
function hasIcon(iconName) {
  return iconName in iconLibrary;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getIcon,
    getAllIcons,
    getIconMetadata,
    getIconNames,
    hasIcon
  };
} else if (typeof window !== 'undefined') {
  window.iconLibrary = {
    getIcon,
    getAllIcons,
    getIconMetadata,
    getIconNames,
    hasIcon
  };
}
