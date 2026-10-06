/**
 * Integration Tests for Error Handling
 * 
 * Tests the error handling and fallback mechanisms:
 * - AI failure → Frontend fallback
 * - Timeout handling
 * - Network error recovery
 * - Validation failure handling
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  handleNetworkError,
  callAIWithTimeout,
  handleValidationFailure,
  handleCacheError,
  handleNLPError,
  handleUnknownError,
  createPOSError
} from '../utils/error-handlers';
import { POSErrorType } from '../types/errors';
import { ContextAnalyzerImpl } from '../services/context-analyzer';
import { AITranslationResult } from '../services/ai-translation-service';
import { ValidationResult, AIWordInfo } from '../validators/pos-validator';

describe('Error Handlers Integration Tests', () => {
  let mockAnalyzer: ContextAnalyzerImpl;

  beforeEach(() => {
    mockAnalyzer = new ContextAnalyzerImpl();
    jest.clearAllMocks();
  });

  describe('handleNetworkError', () => {
    test('should fallback to frontend analysis on network error', async () => {
      const sentence = 'The broken window needs repair';
      const networkError = new Error('Network connection failed');

      const result = await handleNetworkError(networkError, sentence, mockAnalyzer);

      // Should return a valid analysis result
      expect(result).toBeDefined();
      expect(result.sentence).toBe(sentence);
      expect(result.words.length).toBeGreaterThan(0);
      expect(result.approach).toBe('frontend');
      expect(result.cacheHit).toBe(false);
    });

    test('should analyze words correctly in fallback', async () => {
      const sentence = 'The broken window';
      const networkError = new Error('Connection timeout');

      const result = await handleNetworkError(networkError, sentence, mockAnalyzer);

      // Find the word "broken"
      const brokenWord = result.words.find(w => w.word.toLowerCase() === 'broken');
      expect(brokenWord).toBeDefined();
      expect(brokenWord!.pos).toBe('adjective'); // Should be adjective in "the broken window"
    });

    test('should handle empty sentence gracefully', async () => {
      const sentence = '';
      const networkError = new Error('Network error');

      const result = await handleNetworkError(networkError, sentence, mockAnalyzer);

      expect(result.sentence).toBe('');
      expect(result.words).toEqual([]);
      expect(result.approach).toBe('frontend');
    });
  });

  describe('callAIWithTimeout', () => {
    test('should return AI result when call succeeds within timeout', async () => {
      const sentence = 'The excited students';
      const mockAIResult = {
        translation: '兴奋的学生',
        words: [
          { word: 'The', pos: 'adjective' as const },
          { word: 'excited', pos: 'adjective' as const },
          { word: 'students', pos: 'noun' as const }
        ]
      };

      const aiServiceCall = jest.fn(async () => {
        // Simulate fast AI response
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockAIResult;
      });

      const result = await callAIWithTimeout(
        aiServiceCall,
        sentence,
        5000,
        mockAnalyzer
      );

      expect(aiServiceCall).toHaveBeenCalled();
      expect(result).toEqual(mockAIResult);
    });

    test('should fallback to frontend analysis on timeout', async () => {
      const sentence = 'The broken window';
      
      const aiServiceCall = jest.fn(async () => {
        // Simulate slow AI response (longer than timeout)
        await new Promise(resolve => setTimeout(resolve, 6000));
        return { translation: '', words: [] };
      });

      const result = await callAIWithTimeout(
        aiServiceCall,
        sentence,
        1000, // 1 second timeout
        mockAnalyzer
      );

      // Should have fallen back to frontend analysis
      expect(result).toHaveProperty('approach', 'frontend');
      expect(result).toHaveProperty('words');
      const analysisResult = result as any;
      expect(analysisResult.words.length).toBeGreaterThan(0);
    });

    test('should fallback to frontend analysis on AI service error', async () => {
      const sentence = 'The interesting book';
      
      const aiServiceCall = jest.fn(async () => {
        throw new Error('AI API rate limit exceeded');
      });

      const result = await callAIWithTimeout(
        aiServiceCall,
        sentence,
        5000,
        mockAnalyzer
      );

      // Should have fallen back to frontend analysis
      expect(result).toHaveProperty('approach', 'frontend');
      const analysisResult = result as any;
      expect(analysisResult.words.length).toBeGreaterThan(0);
    });

    test('should use custom timeout value', async () => {
      const sentence = 'Test sentence';
      const customTimeout = 2000;
      
      const aiServiceCall = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return { translation: '', words: [] };
      });

      const startTime = Date.now();
      await callAIWithTimeout(
        aiServiceCall,
        sentence,
        customTimeout,
        mockAnalyzer
      );
      const elapsed = Date.now() - startTime;

      // Should timeout around the custom timeout value (with some tolerance)
      expect(elapsed).toBeLessThan(customTimeout + 500);
      expect(elapsed).toBeGreaterThan(customTimeout - 500);
    });
  });

  describe('handleValidationFailure', () => {
    test('should apply corrections from validation result', () => {
      const sentence = 'The very broken window';
      const aiResult: AITranslationResult = {
        translation: '非常破碎的窗户',
        words: [
          { word: 'The', pos: 'adjective' },
          { word: 'very', pos: 'adverb' },
          { word: 'broken', pos: 'verb' }, // Wrong! Should be adjective
          { word: 'window', pos: 'noun' }
        ]
      };

      const validation: ValidationResult = {
        isValid: false,
        errors: ['Word "broken" at position 2 should be adjective after intensifier'],
        correctedTags: new Map([[2, 'adjective']])
      };

      const result = handleValidationFailure(aiResult, validation, sentence);

      // Should have corrected the POS tag
      expect(result.words[2].pos).toBe('adjective');
      expect(result.words[2].confidence).toBe(0.7); // Lower confidence
      expect(result.approach).toBe('ai');
    });

    test('should handle validation failure without corrections', () => {
      const sentence = 'Test sentence';
      const aiResult: AITranslationResult = {
        translation: '测试句子',
        words: [
          { word: 'Test', pos: 'noun' },
          { word: 'sentence', pos: 'noun' }
        ]
      };

      const validation: ValidationResult = {
        isValid: false,
        errors: ['Some validation error'],
        correctedTags: undefined
      };

      const result = handleValidationFailure(aiResult, validation, sentence);

      // Should return result with original tags but lower confidence
      expect(result.words[0].pos).toBe('noun');
      expect(result.words[1].pos).toBe('noun');
      expect(result.words[0].confidence).toBe(0.7);
    });

    test('should include error explanation in result', () => {
      const sentence = 'Test';
      const aiResult: AITranslationResult = {
        translation: '测试',
        words: [{ word: 'Test', pos: 'noun' }]
      };

      const validation: ValidationResult = {
        isValid: false,
        errors: ['Validation error message'],
        correctedTags: undefined
      };

      const result = handleValidationFailure(aiResult, validation, sentence);

      expect(result.words[0].explanation).toContain('Corrected');
      expect(result.words[0].explanation).toContain('Validation error message');
    });
  });

  describe('handleCacheError', () => {
    test('should return null for get operation errors', () => {
      const error = new Error('Cache read failed');
      const result = handleCacheError(error, 'get', 'test-key');

      expect(result).toBeNull();
    });

    test('should return void for set operation errors', () => {
      const error = new Error('Cache write failed');
      const result = handleCacheError(error, 'set', 'test-key');

      expect(result).toBeUndefined();
    });

    test('should not throw errors', () => {
      const error = new Error('Cache explosion');
      
      expect(() => {
        handleCacheError(error, 'get', 'key1');
      }).not.toThrow();

      expect(() => {
        handleCacheError(error, 'set', 'key2');
      }).not.toThrow();
    });
  });

  describe('handleNLPError', () => {
    test('should fallback to frontend analysis on NLP error', async () => {
      const sentence = 'The broken window';
      const nlpError = new Error('NLP service unavailable');

      const result = await handleNLPError(nlpError, sentence, mockAnalyzer);

      expect(result).toBeDefined();
      expect(result.sentence).toBe(sentence);
      expect(result.approach).toBe('frontend');
      expect(result.words.length).toBeGreaterThan(0);
    });

    test('should analyze correctly in fallback', async () => {
      const sentence = 'The very excited students';
      const nlpError = new Error('NLP timeout');

      const result = await handleNLPError(nlpError, sentence, mockAnalyzer);

      const excitedWord = result.words.find(w => w.word.toLowerCase() === 'excited');
      expect(excitedWord).toBeDefined();
      expect(excitedWord!.pos).toBe('adjective');
    });
  });

  describe('handleUnknownError', () => {
    test('should handle Error objects', async () => {
      const sentence = 'Test sentence';
      const error = new Error('Unknown error occurred');

      const result = await handleUnknownError(error, sentence, mockAnalyzer);

      expect(result).toBeDefined();
      expect(result.approach).toBe('frontend');
      expect(result.words.length).toBeGreaterThan(0);
    });

    test('should handle non-Error objects', async () => {
      const sentence = 'Test sentence';
      const error = 'String error message';

      const result = await handleUnknownError(error, sentence, mockAnalyzer);

      expect(result).toBeDefined();
      expect(result.approach).toBe('frontend');
    });

    test('should handle null/undefined errors', async () => {
      const sentence = 'Test sentence';

      const result1 = await handleUnknownError(null, sentence, mockAnalyzer);
      expect(result1).toBeDefined();

      const result2 = await handleUnknownError(undefined, sentence, mockAnalyzer);
      expect(result2).toBeDefined();
    });
  });

  describe('createPOSError', () => {
    test('should create structured error object', () => {
      const error = createPOSError(
        POSErrorType.NETWORK_ERROR,
        'Network failed',
        'Test sentence'
      );

      expect(error.type).toBe(POSErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Network failed');
      expect(error.context?.sentence).toBe('Test sentence');
      expect(error.context?.timestamp).toBeDefined();
    });

    test('should include original error when provided', () => {
      const originalError = new Error('Original error');
      const error = createPOSError(
        POSErrorType.AI_SERVICE_ERROR,
        'AI failed',
        'Test',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('Degradation Flow: AI → Frontend', () => {
    test('should successfully degrade from AI to Frontend', async () => {
      const sentence = 'The broken window was repaired';
      
      // Simulate AI failure
      const failingAICall = jest.fn(async () => {
        throw new Error('AI service unavailable');
      });

      // Use callAIWithTimeout which should fallback
      const result = await callAIWithTimeout(
        failingAICall,
        sentence,
        5000,
        mockAnalyzer
      );

      // Should have fallen back to frontend
      expect(result).toHaveProperty('approach', 'frontend');
      const analysisResult = result as any;
      
      // Verify the analysis is correct
      expect(analysisResult.words.length).toBeGreaterThan(0);
      const brokenWord = analysisResult.words.find((w: any) => w.word.toLowerCase() === 'broken');
      expect(brokenWord).toBeDefined();
      expect(brokenWord.pos).toBe('adjective');
    });

    test('should maintain data consistency during degradation', async () => {
      const sentence = 'The excited students are learning';
      
      const failingAICall = jest.fn(async () => {
        throw new Error('Rate limit exceeded');
      });

      const result = await callAIWithTimeout(
        failingAICall,
        sentence,
        5000,
        mockAnalyzer
      );

      const analysisResult = result as any;
      
      // Verify all words are analyzed
      expect(analysisResult.words.length).toBe(5);
      
      // Verify each word has required fields
      analysisResult.words.forEach((word: any) => {
        expect(word).toHaveProperty('word');
        expect(word).toHaveProperty('position');
        expect(word).toHaveProperty('pos');
        expect(['noun', 'verb', 'adjective', 'adverb', 'unknown']).toContain(word.pos);
      });
    });
  });

  describe('Timeout Handling', () => {
    test('should timeout after specified duration', async () => {
      const sentence = 'Test';
      const timeout = 1000;
      
      const slowAICall = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { translation: '', words: [] };
      });

      const startTime = Date.now();
      await callAIWithTimeout(slowAICall, sentence, timeout, mockAnalyzer);
      const elapsed = Date.now() - startTime;

      // Should timeout around 1 second (with tolerance)
      expect(elapsed).toBeLessThan(timeout + 500);
    });

    test('should not timeout if AI responds quickly', async () => {
      const sentence = 'Test';
      const mockResult = { translation: '测试', words: [] };
      
      const fastAICall = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockResult;
      });

      const result = await callAIWithTimeout(fastAICall, sentence, 5000, mockAnalyzer);

      expect(result).toEqual(mockResult);
    });
  });

  describe('Network Error Recovery', () => {
    test('should recover from network errors', async () => {
      const sentence = 'The interesting book';
      const networkError = new Error('ECONNREFUSED');

      const result = await handleNetworkError(networkError, sentence, mockAnalyzer);

      // Should successfully return a result
      expect(result).toBeDefined();
      expect(result.words.length).toBeGreaterThan(0);
      
      // Verify the analysis is reasonable
      const interestingWord = result.words.find(w => w.word.toLowerCase() === 'interesting');
      expect(interestingWord).toBeDefined();
      expect(interestingWord!.pos).toBe('adjective');
    });

    test('should handle multiple consecutive network errors', async () => {
      const sentences = [
        'The broken window',
        'The excited students',
        'The interesting book'
      ];

      const results = await Promise.all(
        sentences.map(sentence => 
          handleNetworkError(new Error('Network error'), sentence, mockAnalyzer)
        )
      );

      // All should succeed with frontend fallback
      results.forEach((result, idx) => {
        expect(result).toBeDefined();
        expect(result.sentence).toBe(sentences[idx]);
        expect(result.approach).toBe('frontend');
        expect(result.words.length).toBeGreaterThan(0);
      });
    });
  });
});
