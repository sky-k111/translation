# Project Structure

## Root Directory

```
├── manifest.json              # Chrome extension configuration (Manifest V3)
├── package.json              # Node.js dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Project documentation (Chinese)
└── .gitignore               # Git ignore rules
```

## Core Extension Files

### extension/
Main extension code (native JavaScript)

```
extension/
├── background/
│   └── background.js         # Service worker (API calls, message handling)
├── content/
│   ├── content.js           # Content script (page interaction, DOM manipulation)
│   └── content.css          # Content script styles (translation popup, highlights)
├── popup/
│   ├── popup.html           # Main popup interface
│   ├── popup.js             # Popup logic
│   ├── popup.css            # Popup styles
│   ├── dashboard.html       # Dashboard page
│   ├── dashboard.js         # Dashboard logic
│   ├── components/          # Popup-specific components
│   ├── modules/             # Popup feature modules (11 managers)
│   └── assets/              # React build output (from TAROT-main)
├── components/              # Reusable component system
│   ├── utils/              # Component utilities (BaseComponent, registry, event-bus)
│   ├── styles/             # Base styles (variables, reset, utils, animations)
│   ├── base/               # Basic components (button, card, input, dialog, toast)
│   ├── complex/            # Complex components (word-card, learning-panel, etc.)
│   ├── business/           # Business components (translation-popup)
│   ├── content/            # Content script components
│   ├── background/         # Background script components
│   ├── charts/             # Data visualization components
│   └── index.js            # Component library entry point
├── services/               # Service layer
│   ├── netease-translate-service.js    # Netease Youdao API
│   ├── ai-translate-service.js         # OpenAI API
│   ├── quality_service.js              # Translation quality & fallback
│   ├── pos-integration-service-v2.js   # POS recognition integration
│   └── pos-performance-monitor.js      # POS performance monitoring
├── utils/                  # Utility modules
│   ├── cache-manager.js
│   ├── event-manager.js
│   ├── performance-monitor.js
│   ├── service-degradation-manager.js
│   ├── module-manager.js
│   ├── indexeddb-storage.js
│   ├── storage-optimizer.js
│   ├── trie-index.js
│   ├── heap.js
│   └── complexity-calculator.js
└── modules/                # Visual & interaction modules
    ├── particle-network.js           # Particle effects (Canvas)
    ├── theme-manager.js              # Theme management
    ├── dynamic-background-manager.js # Dynamic backgrounds
    └── utils-monitor.js              # Monitoring utilities
```

## TypeScript Source (POS Recognition)

### src/
TypeScript implementation for Part-of-Speech recognition

```
src/
├── types/
│   ├── pos.ts              # Core POS interfaces and types
│   └── errors.ts           # Error type definitions
├── constants/
│   └── pos-data.ts         # Determiners, intensifiers, linking verbs
├── data/
│   └── irregular-verbs.ts  # Irregular verb mappings
├── services/               # Service implementations
│   ├── lemma-mapper.ts
│   ├── context-analyzer.ts
│   ├── cache-manager.ts
│   ├── color-mapper.ts
│   ├── pattern-detector.ts
│   ├── ai-translation-service.ts
│   └── pos-service-factory.ts
├── utils/
│   ├── pos-helpers.ts
│   └── error-handlers.ts
├── validators/
│   └── pos-validator.ts
├── config/
│   └── user-config.ts
├── prompts/
│   └── pos-translation-prompt.ts
└── __tests__/              # Test files
    ├── setup.test.ts
    ├── setup.property.test.ts
    └── *.property.test.ts  # Property-based tests
```

## React Subproject

### TAROT-main/
Embedded React application (built separately)

```
TAROT-main/
├── src/
│   ├── components/         # React components
│   ├── services/          # React-specific services
│   └── App.tsx            # Application entry point
├── scripts/
│   └── copy-to-extension.js  # Build output sync script
├── package.json           # React project dependencies
├── vite.config.ts         # Vite build configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

**Build Output**: `extension/popup/assets/` (auto-synced)

## Documentation

### docs/
Comprehensive project documentation (Chinese)

```
docs/
├── architecture/
│   ├── 01_架构设计/
│   │   └── 架构概览.md
│   ├── 02_依赖文档/
│   │   └── 依赖关系图.md
│   ├── 03_审计报告/
│   │   └── 审计报告_2026-01-13.md
│   ├── 04_开发规范/
│   │   ├── UI组件化规范表.md
│   │   └── 组件文档.md
│   ├── 05_样式指南/
│   │   └── 样式规范文档.md
│   ├── 06_使用指南/
│   │   ├── 使用指南.md
│   │   └── 前后端任务分配分析.md
│   ├── 07_安全合规/
│   │   └── CSP合规性风险分析.md
│   └── README.md
└── [various implementation docs]
```

## Configuration

### config/
Configuration files

```
config/
├── api-config.js          # API keys configuration
└── opencode.json          # OpenCode configuration
```

## Build Output

### build/
Generated files (not in git)

```
build/
├── dist/                  # TypeScript compilation output
└── coverage/              # Test coverage reports
```

## Assets

### assets/
Static assets

```
assets/
├── icons/
│   └── icon16.png        # Extension icon (16x16)
├── index.js              # Asset loader
└── style.css             # Global styles
```

## Key File Patterns

### Component Files
- **JavaScript Components**: `ComponentName.js` + `component-name.css`
- **Location**: `extension/components/[category]/`
- **Pattern**: Extends BaseComponent class

### Service Files
- **JavaScript Services**: `service-name-service.js`
- **TypeScript Services**: `service-name.ts`
- **Location**: `extension/services/` or `src/services/`

### Test Files
- **Unit Tests**: `*.test.ts`
- **Property-Based Tests**: `*.property.test.ts`
- **Location**: `src/__tests__/`

### Style Files
- **Component Styles**: `component-name.css` (co-located with JS)
- **Base Styles**: `extension/components/styles/`
- **Page Styles**: `extension/popup/*.css`

## Module Organization Principles

### Separation of Concerns
- **Background**: API calls, cross-tab communication, persistent state
- **Content**: DOM manipulation, page interaction, text selection
- **Popup**: UI presentation, user interaction, data display
- **Services**: Business logic, external API integration
- **Utils**: Shared utilities, helpers, managers

### Component Hierarchy
1. **Base Components**: Reusable UI primitives (button, card, input)
2. **Complex Components**: Composed components (word-card, learning-panel)
3. **Business Components**: Domain-specific components (translation-popup)
4. **Layout Components**: Page structure components

### Code Location Guidelines
- **Shared code**: `extension/components/`, `extension/utils/`
- **Context-specific**: `extension/background/`, `extension/content/`, `extension/popup/`
- **TypeScript modules**: `src/` (POS recognition feature)
- **React code**: `TAROT-main/` (separate build process)

## Import Patterns

### Native JavaScript
```javascript
// Relative imports
import { ComponentName } from './component-name.js';

// Global access (for content scripts)
window.ComponentName
```

### TypeScript
```typescript
// Path aliases
import { POSTag } from '@/types/pos';

// Relative imports
import { CacheManager } from '../services/cache-manager';
```

## File Naming Conventions

- **JavaScript**: kebab-case (e.g., `cache-manager.js`)
- **TypeScript**: kebab-case (e.g., `cache-manager.ts`)
- **CSS**: kebab-case (e.g., `word-card.css`)
- **HTML**: kebab-case (e.g., `popup.html`)
- **Classes**: PascalCase (e.g., `BaseComponent`, `CacheManager`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_CACHE_SIZE`)
