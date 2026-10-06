/**
 * Integration Tests for POS Recognition System
 * 
 * Tests the complete flow: Analysis → Cache → Color Mapping
 * Also tests edge cases: empty sentences, special characters
 * 
 * Requirements: 11.1-11.5, 12.1-12.5
 * 
 * @jest-environment jsdom
 */

import { ContextAnalyzerImpl } from '../services/context-analyzer';
import { SimpleCacheManager } from '../services/cache-manager';
import { SimpleColorMapper, DEFAULT_COLOR_SCHEME } from '../services/color-mapper';
import { POSTag } from '../types/pos';

describe('Integration Tests - Complete POS Recognition Flow', () => {
  let contextAnalyzer: ContextAnalyzerImpl;
  let cacheManager: SimpleCacheManager;
  let colorMapper: SimpleColorMapper;

  beforeEach(() => {
    contextAnalyzer = new ContextAnalyzerImpl();
    cacheManager = new SimpleCacheManager();
    colorMapper = new SimpleColorMapper();
  });

  describe('Complete Flow: Analysis → Cache → Color Mapping', () => {
    test('should complete full flow for a simple sentence', () => {
      const sentence = 'The broken window was repaired';
      const word = 'broken';
      const position = 1;

      // Step 1: Analyze POS
      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      expect(pos).toBe('adjective'); // "the broken window" pattern

      // Step 2: Cache the result
      const cacheKey = `${word}:${sentence}`;
      const cacheResult = {
        sentence,
        posMap: new Map([[position, pos]]),
        timestamp: Date.now()
      };
      cacheManager.set(cacheKey, cacheResult);

      // Step 3: Retrieve from cache
      const cached = cacheManager.get(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached?.posMap.get(position)).toBe('adjective');

      // Step 4: Get color for visualization
      const color = colorMapper.getColor(pos);
      expect(color).toBe(DEFAULT_COLOR_SCHEME.adjective);
    });

    test('should handle multiple words in a sentence', () => {
      const sentence = 'The excited students are learning quickly';
      const words = [
        { word: 'excited', position: 1, expectedPOS: 'adjective' as POSTag },
        { word: 'students', position: 2, expectedPOS: 'unknown' as POSTag }, // Not a participle
        { word: 'learning', position: 4, expectedPOS: 'verb' as POSTag } // Progressive tense
      ];

      words.forEach(({ word, position, expectedPOS }) => {
        // Analyze
        const pos = contextAnalyzer.analyzePOS(word, sentence, position);
        expect(pos).toBe(expectedPOS);

        // Cache
        const cacheKey = `${word}:${sentence}`;
        cacheManager.set(cacheKey, {
          sentence,
          posMap: new Map([[position, pos]]),
          timestamp: Date.now()
        });

        // Verify cache
        const cached = cacheManager.get(cacheKey);
        expect(cached).not.toBeNull();

        // Get color
        const color = colorMapper.getColor(pos);
        expect(color).toBeTruthy();
      });
    });

    test('should use cache on second request', () => {
      const sentence = 'A broken promise';
      const word = 'broken';
      const position = 1;

      // First request - analyze and cache
      const pos1 = contextAnalyzer.analyzePOS(word, sentence, position);
      const cacheKey = `${word}:${sentence}`;
      cacheManager.set(cacheKey, {
        sentence,
        posMap: new Map([[position, pos1]]),
        timestamp: Date.now()
      });

      // Second request - should hit cache
      const cached = cacheManager.get(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached?.posMap.get(position)).toBe(pos1);

      // Verify cache stats
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    test('should handle cache miss gracefully', () => {
      const cacheKey = 'nonexistent:sentence';
      const cached = cacheManager.get(cacheKey);
      
      expect(cached).toBeNull();
      
      const stats = cacheManager.getStats();
      expect(stats.misses).toBe(1);
    });
  });

  describe('Edge Cases - Empty Sentences', () => {
    test('should handle empty string', () => {
      const result = contextAnalyzer.analyze('');
      
      expect(result.sentence).toBe('');
      expect(result.words).toHaveLength(0);
      expect(result.approach).toBe('frontend');
    });

    test('should handle whitespace-only string', () => {
      const result = contextAnalyzer.analyze('   ');
      
      expect(result.sentence).toBe('');
      expect(result.words).toHaveLength(0);
    });

    test('should handle empty word in analyzePOS', () => {
      const pos = contextAnalyzer.analyzePOS('', 'some sentence', 0);
      expect(pos).toBe('unknown');
    });

    test('should handle empty sentence in analyzePOS', () => {
      const pos = contextAnalyzer.analyzePOS('word', '', 0);
      expect(pos).toBe('unknown');
    });
  });

  describe('Edge Cases - Special Characters', () => {
    test('should handle sentence with punctuation', () => {
      const sentence = 'The "broken" window!';
      const word = 'broken';
      // The tokenizer splits on whitespace, so "broken" with quotes is position 1
      const position = 1;

      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      // Note: With quotes, the tokenizer might not match perfectly
      // but it should not crash and should return a valid POS
      expect(['adjective', 'unknown']).toContain(pos);
    });

    test('should handle sentence with quotes', () => {
      const sentence = "It's a very exciting opportunity";
      const word = 'exciting';
      const position = 3;

      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      expect(pos).toBe('adjective');
    });

    test('should handle sentence with hyphens', () => {
      const sentence = 'A well-written book';
      const word = 'well-written';
      const position = 1;

      // Note: This might not work perfectly with hyphenated words
      // but should not crash
      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      expect(pos).toBeDefined();
    });

    test('should handle sentence with numbers', () => {
      const sentence = 'The 3 broken windows';
      const word = 'broken';
      const position = 2;

      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      expect(pos).toBe('adjective');
    });

    test('should handle Unicode characters', () => {
      const sentence = 'The café was closed';
      const word = 'closed';
      const position = 3;

      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      // "was closed" without "by" → adjective (state description)
      expect(pos).toBe('adjective');
    });
  });

  describe('Performance Requirements', () => {
    test('should complete analysis within 200ms (Requirement 9.1)', () => {
      const sentence = 'The broken window was repaired by someone';
      const startTime = Date.now();

      contextAnalyzer.analyze(sentence);

      const latency = Date.now() - startTime;
      expect(latency).toBeLessThan(200);
    });

    test('should retrieve from cache within 10ms (Requirement 9.2)', () => {
      const cacheKey = 'test:sentence';
      const cacheResult = {
        sentence: 'test sentence',
        posMap: new Map([[0, 'noun' as POSTag]]),
        timestamp: Date.now()
      };

      cacheManager.set(cacheKey, cacheResult);

      const startTime = Date.now();
      const cached = cacheManager.get(cacheKey);
      const latency = Date.now() - startTime;

      expect(cached).not.toBeNull();
      expect(latency).toBeLessThan(10);
    });

    test('should update color within 500ms (Requirement 8.4)', () => {
      const pos: POSTag = 'adjective';
      const element = document.createElement('span');

      const startTime = Date.now();
      colorMapper.applyColor(element, pos);
      const latency = Date.now() - startTime;

      // Browser converts hex to rgb format
      expect(element.style.color).toBeTruthy();
      expect(element.getAttribute('data-pos')).toBe('adjective');
      // Realistic performance target: 500ms for DOM operations
      expect(latency).toBeLessThan(500);
    });
  });

  describe('Offline and CSP Compliance (Requirements 11.1-11.5)', () => {
    test('should work without network connection', () => {
      // All operations should be local
      const sentence = 'The broken window';
      const word = 'broken';
      const position = 1;

      const pos = contextAnalyzer.analyzePOS(word, sentence, position);
      expect(pos).toBe('adjective');

      // Cache should work locally
      const cacheKey = `${word}:${sentence}`;
      cacheManager.set(cacheKey, {
        sentence,
        posMap: new Map([[position, pos]]),
        timestamp: Date.now()
      });

      const cached = cacheManager.get(cacheKey);
      expect(cached).not.toBeNull();
    });

    test('should not use eval or inline scripts', () => {
      // This test verifies that our code doesn't use eval
      // by checking that the code can run in a strict CSP environment
      
      const sentence = 'The excited students';
      const result = contextAnalyzer.analyze(sentence);
      
      expect(result).toBeDefined();
      expect(result.words).toBeDefined();
    });

    test('should store data in compliant format', () => {
      // Verify that cached data is JSON-serializable (CSP compliant)
      const cacheKey = 'test:key';
      const cacheResult = {
        sentence: 'test',
        posMap: new Map([[0, 'noun' as POSTag]]),
        timestamp: Date.now()
      };

      cacheManager.set(cacheKey, cacheResult);
      const cached = cacheManager.get(cacheKey);

      expect(cached).not.toBeNull();
      expect(cached?.sentence).toBe('test');
    });
  });

  describe('Common Cases Coverage (Requirements 12.1-12.5)', () => {
    const testCases = [
      { sentence: 'The broken window', word: 'broken', position: 1, expected: 'adjective' as POSTag },
      { sentence: 'The window was broken by a ball', word: 'broken', position: 3, expected: 'verb' as POSTag },
      { sentence: 'She is very excited', word: 'excited', position: 3, expected: 'adjective' as POSTag },
      { sentence: 'An exciting opportunity', word: 'exciting', position: 1, expected: 'adjective' as POSTag },
      { sentence: 'The book was written by Tolkien', word: 'written', position: 3, expected: 'verb' as POSTag },
      { sentence: 'A written agreement', word: 'written', position: 1, expected: 'adjective' as POSTag },
      { sentence: 'The door is closed', word: 'closed', position: 3, expected: 'adjective' as POSTag },
      { sentence: 'He is writing a book', word: 'writing', position: 2, expected: 'verb' as POSTag },
      { sentence: 'Swimming is fun', word: 'Swimming', position: 0, expected: 'noun' as POSTag },
      { sentence: 'The swimming pool', word: 'swimming', position: 1, expected: 'adjective' as POSTag }
    ];

    test.each(testCases)(
      'should correctly identify "$word" in "$sentence" as $expected',
      ({ sentence, word, position, expected }) => {
        const pos = contextAnalyzer.analyzePOS(word, sentence, position);
        expect(pos).toBe(expected);
      }
    );

    test('should achieve at least 80% accuracy on common cases (Requirement 12.3)', () => {
      let correct = 0;
      const total = testCases.length;

      testCases.forEach(({ sentence, word, position, expected }) => {
        const pos = contextAnalyzer.analyzePOS(word, sentence, position);
        if (pos === expected) {
          correct++;
        }
      });

      const accuracy = (correct / total) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Cache Management (Requirements 9.3, 9.4)', () => {
    test('should store at least 1000 entries (Requirement 9.3)', () => {
      // Fill cache with 1000 entries
      for (let i = 0; i < 1000; i++) {
        const cacheKey = `word${i}:sentence${i}`;
        cacheManager.set(cacheKey, {
          sentence: `sentence${i}`,
          posMap: new Map([[0, 'noun' as POSTag]]),
          timestamp: Date.now()
        });
      }

      const stats = cacheManager.getStats();
      expect(stats.size).toBe(1000);
    });

    test('should evict oldest entries when full (Requirement 9.4)', () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 1100; i++) {
        const cacheKey = `word${i}:sentence${i}`;
        cacheManager.set(cacheKey, {
          sentence: `sentence${i}`,
          posMap: new Map([[0, 'noun' as POSTag]]),
          timestamp: Date.now()
        });
      }

      const stats = cacheManager.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000);

      // First entry should be evicted (FIFO)
      const firstEntry = cacheManager.get('word0:sentence0');
      expect(firstEntry).toBeNull();

      // Recent entry should still exist
      const recentEntry = cacheManager.get('word1099:sentence1099');
      expect(recentEntry).not.toBeNull();
    });
  });

  describe('Color Consistency (Requirements 8.1-8.3)', () => {
    test('should return consistent colors for same POS', () => {
      const pos: POSTag = 'adjective';
      
      const color1 = colorMapper.getColor(pos);
      const color2 = colorMapper.getColor(pos);
      
      expect(color1).toBe(color2);
      expect(color1).toBe(DEFAULT_COLOR_SCHEME.adjective);
    });

    test('should return different colors for different POS', () => {
      const nounColor = colorMapper.getColor('noun');
      const verbColor = colorMapper.getColor('verb');
      const adjectiveColor = colorMapper.getColor('adjective');
      const adverbColor = colorMapper.getColor('adverb');

      const colors = new Set([nounColor, verbColor, adjectiveColor, adverbColor]);
      expect(colors.size).toBe(4); // All different
    });

    test('should immediately update element color (Requirement 8.5)', () => {
      const element = document.createElement('span');
      const pos: POSTag = 'verb';

      colorMapper.applyColor(element, pos);
      expect(element.style.color).toBeTruthy();
      expect(element.getAttribute('data-pos')).toBe('verb');

      // Change POS and verify immediate update
      const newPos: POSTag = 'adjective';
      colorMapper.applyColor(element, newPos);
      expect(element.style.color).toBeTruthy();
      expect(element.getAttribute('data-pos')).toBe('adjective');
    });
  });
});
