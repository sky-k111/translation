# POS Recognition Optimization - Source Code

This directory contains the TypeScript implementation of the Part-of-Speech (POS) Recognition Optimization feature for the Word Translation Assistant Chrome extension.

## Directory Structure

```
src/
├── types/              # TypeScript type definitions
│   └── pos.ts         # Core POS interfaces and types
├── constants/         # Constant data sets
│   └── pos-data.ts   # Determiners, intensifiers, linking verbs
├── data/             # Data files (to be created)
│   └── irregular-verbs.ts
├── services/         # Service implementations (to be created)
│   ├── lemma-mapper.ts
│   ├── context-analyzer.ts
│   ├── cache-manager.ts
│   └── color-mapper.ts
├── utils/            # Utility functions (to be created)
│   └── pos-helpers.ts
└── __tests__/        # Test files
    ├── setup.test.ts
    └── setup.property.test.ts
```

## Core Types

### POSTag
Simplified part-of-speech tags: `'noun' | 'verb' | 'adjective' | 'adverb' | 'unknown'`

### Token
Represents a single word in a sentence with its position.

### Context
Contains information about surrounding tokens for context analysis.

### Pattern
Grammar patterns used for POS identification:
- `determiner_participle_noun` - e.g., "a broken window"
- `intensifier_participle` - e.g., "very excited"
- `be_participle_by` - e.g., "was written by"
- `linking_verb_participle` - e.g., "is broken"

### POSAnalysisResult
Complete analysis result including all words, approach used, and cache status.

## Constants

### DETERMINERS
Set of determiners (a, an, the, this, that, etc.) used for pattern matching.

### INTENSIFIERS
Set of degree adverbs (very, extremely, quite, etc.) used for pattern matching.

### LINKING_VERBS
Set of linking verbs (be, is, feel, seem, etc.) used for state description detection.

## Testing

The project uses Jest for unit testing and fast-check for property-based testing.

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test:watch
```

### Run property-based tests only
```bash
npm test:pbt
```

### Run tests with coverage
```bash
npm test:coverage
```

## Type Checking

```bash
npm run type-check
```

## Build

```bash
npm run build
```

## Requirements Mapping

This implementation addresses the following requirements from the specification:

- **Requirements 1.1-1.5**: Participle adjective recognition
- **Requirements 2.1-2.3**: -ed ending adjective recognition
- **Requirements 3.1-3.4**: -ing ending adjective recognition
- **Requirements 4.1-4.5**: Context pattern recognition
- **Requirements 8.1-8.5**: Color mapping accuracy
- **Requirements 9.1-9.5**: Performance and caching

## Next Steps

1. Implement Lemma Mapper (Task 2)
2. Implement Context Analyzer (Task 3)
3. Implement Cache Manager (Task 4)
4. Implement Color Mapper (Task 5)
5. Integrate into Chrome Extension (Task 6)
