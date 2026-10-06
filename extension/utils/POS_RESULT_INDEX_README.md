# POSResultIndex - 词性结果索引

## Overview

POSResultIndex is a high-performance bidirectional indexing system for Part-of-Speech (POS) analysis results. It provides O(1) constant-time lookups for both sentence-to-POS and word-to-sentences mappings, along with automatic POS statistics tracking.

## Features

- **Bidirectional Indexing**: Fast lookups in both directions (sentence→POS, word→sentences)
- **O(1) Query Performance**: Constant-time lookups regardless of index size
- **Automatic Statistics**: Tracks POS tag frequency for each word
- **Persistence**: Automatic saving to Chrome Storage with debouncing
- **Cleanup**: Automatic removal of old entries based on age or capacity
- **Memory Efficient**: Optimized data structures with memory tracking
- **Error Recovery**: Graceful handling of corrupted data and storage errors

## Architecture

### Data Structures

```javascript
{
  sentenceIndex: Map<string, Object>,  // sentence -> {posResult, timestamp, words}
  wordIndex: Map<string, Set<string>>, // word -> Set of sentences
  posStats: Map<string, Object>        // word -> {noun: 5, verb: 3, ...}
}
```

### Key Design Decisions

1. **Map-based indexing**: Uses JavaScript Map for O(1) lookups
2. **Set for word index**: Prevents duplicate sentences per word
3. **Normalized keys**: All sentences and words stored in lowercase
4. **Timestamp tracking**: Each entry has a timestamp for cleanup
5. **Debounced persistence**: Reduces storage writes with configurable delay

## API Reference

### Constructor

```javascript
const index = new POSResultIndex({
  maxEntries: 5000,                    // Max sentences before cleanup
  maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days in milliseconds
  storageKey: 'pos_index_v1',          // Chrome Storage key
  persistDelay: 1000                   // Debounce delay (ms)
});
```

### Core Methods

#### addResult(sentence, posResult)

Adds a POS analysis result to the index.

```javascript
index.addResult('The cat sits on the mat', {
  words: [
    { word: 'The', pos: 'DET', lemma: 'the', confidence: 0.99 },
    { word: 'cat', pos: 'NOUN', lemma: 'cat', confidence: 0.95 },
    { word: 'sits', pos: 'VERB', lemma: 'sit', confidence: 0.98 },
    // ...
  ],
  source: 'openai'
});
```

**Time Complexity**: O(n) where n is the number of words in the sentence

#### getPOSForWord(word)

Returns all sentences containing the word with their POS results.

```javascript
const results = index.getPOSForWord('cat');
// Returns: [{sentence, posResult, timestamp}, ...]
```

**Time Complexity**: O(1) for lookup + O(m) where m is the number of sentences containing the word

#### getPOSForSentence(sentence)

Returns the POS result for a specific sentence.

```javascript
const result = index.getPOSForSentence('The cat sits on the mat');
// Returns: {words: [...], source: 'openai'} or null
```

**Time Complexity**: O(1)

#### getWordPOSStats(word)

Returns POS statistics for a word.

```javascript
const stats = index.getWordPOSStats('the');
// Returns: {
//   counts: { DET: 15, PRON: 2 },
//   mostCommon: 'DET',
//   total: 17
// }
```

**Time Complexity**: O(k) where k is the number of unique POS tags for the word

#### cleanup(maxAge)

Removes entries older than the specified age.

```javascript
const removed = index.cleanup(30 * 24 * 60 * 60 * 1000); // 30 days
console.log(`Removed ${removed} old entries`);
```

**Time Complexity**: O(n) where n is the total number of sentences

### Persistence Methods

#### persist()

Saves the index to Chrome Storage.

```javascript
await index.persist();
```

**Time Complexity**: O(n) where n is the total number of entries

#### load()

Loads the index from Chrome Storage.

```javascript
const success = await index.load();
if (success) {
  console.log('Index loaded successfully');
}
```

**Time Complexity**: O(n) where n is the total number of entries

#### reset()

Clears all data from memory and storage.

```javascript
index.reset();
```

**Time Complexity**: O(1)

### Statistics Methods

#### getStats()

Returns comprehensive statistics about the index.

```javascript
const stats = index.getStats();
console.log(stats);
// {
//   sentenceCount: 150,
//   wordCount: 450,
//   posStatsCount: 450,
//   memoryUsage: 245760,
//   memoryUsageMB: '0.23',
//   memoryBreakdown: {...},
//   memoryOverhead: '125%',
//   memoryWarning: false,
//   performance: {...},
//   ageRange: {...},
//   version: '1.0.0',
//   lastModified: 1234567890,
//   lastModifiedDate: '2024-01-15T10:30:00.000Z',
//   config: {...}
// }
```

## Usage Examples

### Basic Usage

```javascript
// Initialize
const posIndex = new POSResultIndex();

// Add POS results
posIndex.addResult('I love programming', {
  words: [
    { word: 'I', pos: 'PRON', lemma: 'i', confidence: 0.99 },
    { word: 'love', pos: 'VERB', lemma: 'love', confidence: 0.98 },
    { word: 'programming', pos: 'NOUN', lemma: 'programming', confidence: 0.95 }
  ],
  source: 'openai'
});

// Query by word
const loveResults = posIndex.getPOSForWord('love');
console.log(`Found "love" in ${loveResults.length} sentences`);

// Query by sentence
const sentenceResult = posIndex.getPOSForSentence('I love programming');
console.log('POS tags:', sentenceResult.words.map(w => w.pos));

// Get statistics
const loveStats = posIndex.getWordPOSStats('love');
console.log(`"love" appears as ${loveStats.mostCommon} most often`);
```

### Integration with POS Service

```javascript
// In pos-integration-service-v2.js
class POSIntegrationService {
  constructor() {
    this.posIndex = new POSResultIndex({
      maxEntries: 5000,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    this.posIndex.load(); // Load cached results
  }

  async analyzeSentence(sentence) {
    // Check cache first
    const cached = this.posIndex.getPOSForSentence(sentence);
    if (cached) {
      console.log('Using cached POS result');
      return cached;
    }

    // Analyze with AI
    const result = await this.aiService.analyzePOS(sentence);
    
    // Cache the result
    this.posIndex.addResult(sentence, result);
    
    return result;
  }

  getWordUsageStats(word) {
    return this.posIndex.getWordPOSStats(word);
  }
}
```

### Periodic Cleanup

```javascript
// Run cleanup daily
setInterval(() => {
  const removed = posIndex.cleanup();
  if (removed > 0) {
    console.log(`Cleaned up ${removed} old POS entries`);
  }
}, 24 * 60 * 60 * 1000); // Once per day
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| addResult | O(n) | n = words in sentence |
| getPOSForWord | O(1) + O(m) | m = sentences with word |
| getPOSForSentence | O(1) | Constant time lookup |
| getWordPOSStats | O(k) | k = unique POS tags |
| cleanup | O(n) | n = total sentences |
| persist | O(n) | n = total entries |
| load | O(n) | n = total entries |

### Memory Usage

- **Sentence Index**: ~200 bytes per sentence (varies with content)
- **Word Index**: ~50 bytes per word-sentence mapping
- **POS Stats**: ~30 bytes per word-POS pair
- **Total Overhead**: ~130% of raw data (within target of 130%)

### Performance Targets

- **Query Time**: < 1ms (typically 0.1-0.5ms)
- **Add Time**: < 5ms per sentence
- **Persistence**: < 200ms for 5000 entries
- **Load Time**: < 200ms for 5000 entries

## Testing

### Running Tests

Open `extension/utils/test-pos-result-index.html` in a browser to run the test suite.

### Test Coverage

The test suite covers:
- ✅ Constructor initialization
- ✅ Adding POS results
- ✅ Sentence lookup
- ✅ Word lookup
- ✅ POS statistics calculation
- ✅ Multiple sentences with overlapping words
- ✅ Case-insensitive queries
- ✅ Statistics reporting
- ✅ Persistence and loading
- ✅ Cleanup of old entries
- ✅ Reset functionality
- ✅ Performance benchmarks

### Expected Results

All tests should pass with:
- Query time < 1ms
- Add time < 5ms per sentence
- 100 queries in < 10ms total

## Error Handling

### Graceful Degradation

1. **Load Failure**: Returns false, starts with empty index
2. **Corrupted Data**: Validates format, rejects invalid data
3. **Storage Quota**: Triggers cleanup, retries persistence
4. **Invalid Input**: Logs warning, skips operation

### Error Logging

All errors are logged with context:

```javascript
[POSResultIndex] Load failed: Error message
[POSResultIndex] Storage quota exceeded, attempting cleanup
[POSResultIndex] Slow addResult: 12.34ms
```

## Configuration

### Default Configuration

```javascript
{
  maxEntries: 5000,                    // Max sentences
  maxAge: 30 * 24 * 60 * 60 * 1000,   // 30 days
  storageKey: 'pos_index_v1',          // Storage key
  persistDelay: 1000                   // Debounce delay
}
```

### Tuning Recommendations

- **High-volume usage**: Increase `maxEntries` to 10000
- **Memory-constrained**: Decrease `maxAge` to 7 days
- **Frequent updates**: Increase `persistDelay` to 2000ms
- **Critical data**: Decrease `persistDelay` to 500ms

## Migration and Versioning

### Version Format

Data is stored with version information:

```javascript
{
  version: '1.0.0',
  timestamp: 1234567890,
  lastModified: 1234567890,
  sentenceIndex: [...],
  wordIndex: [...],
  posStats: [...]
}
```

### Future Migrations

The `_migrateData()` method handles version upgrades automatically.

## Integration Points

### Current Integrations

1. **pos-integration-service-v2.js**: Caches POS analysis results
2. **word-card.js**: Displays POS statistics for words

### Planned Integrations

1. **learning-manager.js**: Track word usage patterns
2. **dashboard.js**: Display POS analytics
3. **content.js**: Context-aware highlighting

## Troubleshooting

### Common Issues

**Issue**: Index not persisting
- **Solution**: Check Chrome Storage quota, run cleanup()

**Issue**: Slow queries
- **Solution**: Check index size, run cleanup() for old entries

**Issue**: High memory usage
- **Solution**: Reduce maxEntries or maxAge configuration

**Issue**: Data not loading
- **Solution**: Check browser console for errors, try reset()

## Requirements Validation

This implementation satisfies the following requirements:

- ✅ **8.1-8.7**: Bidirectional indexing with O(1) lookups
- ✅ **9.1-9.5**: POS statistics tracking and calculation
- ✅ **10.1-10.5**: Persistence with timestamp-based cleanup

## License

Part of the Word Translation Assistant Chrome Extension.
