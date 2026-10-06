# Technology Stack

## Core Extension (Native JavaScript)

### Languages & Standards
- **JavaScript**: ES2020+ (ES6 modules)
- **TypeScript**: For POS recognition module (src/)
- **HTML5**: Semantic markup
- **CSS3**: Modern CSS with variables, Grid, Flexbox

### Chrome Extension
- **Manifest Version**: V3 (strict CSP compliance)
- **APIs**: chrome.storage, chrome.runtime, chrome.tabs, chrome.webNavigation
- **Permissions**: storage, activeTab, tabs, webNavigation, host_permissions for all URLs

### Component System (Native)
- **Architecture**: Custom component system based on BaseComponent class
- **Pattern**: Inheritance-based with lifecycle methods (init, render, update, destroy)
- **Event Handling**: Event bus pattern with proper cleanup
- **Style Management**: Modular CSS with BEM naming, CSS variables for theming

### CSS Architecture
- **Base Layer**: variables.css, reset.css, utils.css, animations.css (40+ keyframes)
- **Component Layer**: Separate CSS files for each component (button.css, card.css, etc.)
- **Naming**: BEM convention with prefixes to avoid conflicts
- **Theming**: CSS variables for dynamic theme switching

## React Subproject (TAROT-main)

### Stack
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite
- **Animation**: Framer Motion
- **Icons**: Lucide React

### Build Process
- Source: `TAROT-main/src/`
- Build output: `popup/assets/`
- Entry point: `game.html`
- Build command: `npm run build:extension` (auto-syncs to extension directory)

## Testing

### Test Framework
- **Unit Tests**: Jest with ts-jest
- **Property-Based Tests**: fast-check
- **Environment**: jsdom for DOM testing
- **Coverage**: Jest coverage reports in build/coverage/

### Test Commands
```bash
npm test                 # Run all tests
npm test:watch          # Watch mode
npm test:coverage       # Generate coverage report
npm test:pbt            # Run property-based tests only
```

## TypeScript Configuration

### Compiler Options
- **Target**: ES2020
- **Module**: ES2020
- **Lib**: ES2020, DOM
- **Strict Mode**: Enabled
- **Source Maps**: Enabled
- **Output**: build/dist/
- **Path Aliases**: @/* maps to src/*

### Type Checking
```bash
npm run type-check      # Type check without emitting files
```

## Build & Development

### Build Commands
```bash
npm run build           # Compile TypeScript to build/dist
npm run type-check      # Type check only
```

### Extension Development
1. Load unpacked extension from project root (contains manifest.json)
2. For React changes: cd TAROT-main && npm run build:extension
3. Reload extension in chrome://extensions/

### Debugging
- **Background Service Worker**: chrome://extensions/ → "Service Worker" → "Inspect"
- **Content Scripts**: Right-click page → Inspect → Console (filter by extension ID)
- **Popup**: Right-click extension icon → Inspect popup
- **React App**: Open game.html in extension or run `npm run dev` in TAROT-main/

## Performance Optimization

### Caching
- **Memory Cache**: In-memory cache for translation results
- **Persistent Cache**: Chrome Storage API (max 1000 entries, FIFO eviction)
- **Cache Manager**: SimpleCacheManager with hit/miss tracking

### DOM Optimization
- **Highlight Limit**: Max 50 highlighted words per page
- **Event Delegation**: Used throughout to minimize event listeners
- **Debouncing/Throttling**: Applied to frequent events (scroll, resize, input)

### Module Loading
- **Lazy Loading**: ModuleManager for on-demand component loading
- **Code Splitting**: Separate CSS files for better caching

## Security & Compliance

### Content Security Policy
- **Manifest V3**: Strict CSP (no inline scripts, no eval)
- **Resource Loading**: All resources must be local
- **Trusted Types**: XSS prevention

### Privacy
- **Local Storage Only**: No cloud uploads
- **API Keys**: Stored in background script, never exposed to content scripts
- **Minimal Permissions**: Only request necessary permissions

## Dependencies

### Core Extension
- No runtime dependencies (vanilla JS)
- Dev dependencies: @types/chrome, jest, ts-jest, fast-check

### React Subproject
- React 19, TypeScript, Tailwind CSS 4, Vite
- See TAROT-main/package.json for full list

## Common Issues

### CSP Violations
- Ensure all resources are local
- No inline event handlers (use addEventListener)
- No eval or Function constructor

### Extension Not Loading
- Check manifest.json syntax
- Verify all file paths exist
- Check console for errors in chrome://extensions/

### React Changes Not Reflecting
- Must rebuild: `cd TAROT-main && npm run build:extension`
- Reload extension after build
