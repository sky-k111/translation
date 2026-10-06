/**
 * Error Handling Functions for POS Recognition System
 * 
 * Provides centralized error handling with fallback mechanisms.
 * Requirements 7.3, 7.5: Error handling and validation failure handling
 */

import { POSError, POSErrorType } from '../types/errors';
import { POSAnalysisResult, WordAnalysis } from '../types/pos';
import { ContextAnalyzer, contextAnalyzer as defaultContextAnalyzer } from '../services/context-analyzer';
import { AITranslationResult } from '../services/ai-translation-service';
import { ValidationResult, AIWordInfo } from '../validators/pos-validator';

/**
 * Log error to console with structured format
 */
function logError(error: POSError): void {
  console.error('[POS Error]', {
    type: error.type,
    message: error.message,
    context: error.context,
    originalError: error.originalError
  });
}

/**
 * Handle network errors by falling back to frontend analysis
 * 
 * @param error - The network error that occurred
 * @param sentence - The sentence being analyzed
 * @param fallbackAnalyzer - Context analyzer to use for fallback (optional)
 * @returns POS analysis result from frontend analyzer
 */
export async function handleNetworkError(
  error: Error,
  sentence: string,
  fallbackAnalyzer?: ContextAnalyzer
): Promise<POSAnalysisResult> {
  const analyzer = fallbackAnalyzer || defaultContextAnalyzer;
  
  // Log the error
  const posError: POSError = {
    type: POSErrorType.NETWORK_ERROR,
    message: `Network error occurred: ${error.message}`,
    originalError: error,
    context: {
      sentence,
      approach: 'network-fallback',
      timestamp: Date.now()
    }
  };
  
  logError(posError);
  
  console.warn('Network error, falling back to frontend analysis');
  
  // Fallback to frontend analysis
  return analyzer.analyze(sentence);
}

/**
 * Call AI service with timeout protection
 * 
 * @param aiServiceCall - Function that calls the AI service
 * @param sentence - The sentence being analyzed
 * @param timeout - Timeout in milliseconds (default: 5000ms)
 * @param fallbackAnalyzer - Context analyzer to use for fallback (optional)
 * @returns AI translation result or fallback result
 */
export async function callAIWithTimeout<T>(
  aiServiceCall: () => Promise<T>,
  sentence: string,
  timeout: number = 5000,
  fallbackAnalyzer?: ContextAnalyzer
): Promise<T | POSAnalysisResult> {
  const analyzer = fallbackAnalyzer || defaultContextAnalyzer;
  
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('AI service timeout'));
    }, timeout);
  });
  
  try {
    // Race between AI call and timeout
    return await Promise.race([
      aiServiceCall(),
      timeoutPromise
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a timeout error
    if (errorMessage === 'AI service timeout') {
      const posError: POSError = {
        type: POSErrorType.TIMEOUT_ERROR,
        message: `AI service timeout after ${timeout}ms`,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context: {
          sentence,
          approach: 'ai-timeout',
          timestamp: Date.now()
        }
      };
      
      logError(posError);
      console.warn(`AI service timeout after ${timeout}ms, falling back to frontend analysis`);
    } else {
      // Other AI service errors
      const posError: POSError = {
        type: POSErrorType.AI_SERVICE_ERROR,
        message: `AI service error: ${errorMessage}`,
        originalError: error instanceof Error ? error : new Error(errorMessage),
        context: {
          sentence,
          approach: 'ai-error',
          timestamp: Date.now()
        }
      };
      
      logError(posError);
      console.warn('AI service error, falling back to frontend analysis');
    }
    
    // Fallback to frontend analysis
    return analyzer.analyze(sentence);
  }
}

/**
 * Handle validation failure by applying corrections
 * 
 * @param result - AI translation result that failed validation
 * @param validation - Validation result with errors and corrections
 * @param sentence - The original sentence
 * @returns Corrected POS analysis result
 */
export function handleValidationFailure(
  result: AITranslationResult,
  validation: ValidationResult,
  sentence: string
): POSAnalysisResult {
  // Log validation errors
  const posError: POSError = {
    type: POSErrorType.VALIDATION_ERROR,
    message: `AI result validation failed: ${validation.errors.join('; ')}`,
    context: {
      sentence,
      approach: 'ai-validation-failed',
      timestamp: Date.now()
    }
  };
  
  logError(posError);
  console.warn('AI result validation failed:', validation.errors);
  
  // Apply corrections if available
  let correctedWords = result.words;
  if (validation.correctedTags && validation.correctedTags.size > 0) {
    correctedWords = result.words.map((word, idx) => {
      const correctedPOS = validation.correctedTags!.get(idx);
      if (correctedPOS) {
        return {
          ...word,
          pos: correctedPOS
        };
      }
      return word;
    });
  }
  
  // Convert to POSAnalysisResult format
  const words: WordAnalysis[] = correctedWords.map((w, idx) => ({
    word: w.word,
    position: idx,
    pos: w.pos,
    confidence: 0.7, // Lower confidence due to validation failure
    explanation: validation.errors.length > 0 
      ? `Corrected: ${validation.errors[0]}` 
      : 'Validation corrections applied'
  }));
  
  return {
    sentence,
    words,
    approach: 'ai',
    timestamp: Date.now(),
    cacheHit: false
  };
}

/**
 * Handle cache errors gracefully
 * 
 * @param error - The cache error that occurred
 * @param operation - The cache operation that failed ('get' or 'set')
 * @param key - The cache key involved
 * @returns null for get operations, void for set operations
 */
export function handleCacheError(
  error: Error,
  operation: 'get' | 'set',
  key: string
): null | void {
  const posError: POSError = {
    type: POSErrorType.CACHE_ERROR,
    message: `Cache ${operation} operation failed: ${error.message}`,
    originalError: error,
    context: {
      sentence: key,
      approach: 'cache-error',
      timestamp: Date.now()
    }
  };
  
  logError(posError);
  console.error(`Cache ${operation} error:`, error);
  
  // Cache errors should not break the main flow
  // Return null for get operations (cache miss)
  if (operation === 'get') {
    return null;
  }
  
  // Return void for set operations (silent failure)
  return;
}

/**
 * Handle NLP service errors by falling back to frontend analysis
 * 
 * @param error - The NLP service error that occurred
 * @param sentence - The sentence being analyzed
 * @param fallbackAnalyzer - Context analyzer to use for fallback (optional)
 * @returns POS analysis result from frontend analyzer
 */
export async function handleNLPError(
  error: Error,
  sentence: string,
  fallbackAnalyzer?: ContextAnalyzer
): Promise<POSAnalysisResult> {
  const analyzer = fallbackAnalyzer || defaultContextAnalyzer;
  
  const posError: POSError = {
    type: POSErrorType.NLP_SERVICE_ERROR,
    message: `NLP service error: ${error.message}`,
    originalError: error,
    context: {
      sentence,
      approach: 'nlp-error',
      timestamp: Date.now()
    }
  };
  
  logError(posError);
  console.warn('NLP service error, falling back to frontend analysis');
  
  // Fallback to frontend analysis
  return analyzer.analyze(sentence);
}

/**
 * Handle unknown errors with generic fallback
 * 
 * @param error - The unknown error that occurred
 * @param sentence - The sentence being analyzed
 * @param fallbackAnalyzer - Context analyzer to use for fallback (optional)
 * @returns POS analysis result from frontend analyzer
 */
export async function handleUnknownError(
  error: unknown,
  sentence: string,
  fallbackAnalyzer?: ContextAnalyzer
): Promise<POSAnalysisResult> {
  const analyzer = fallbackAnalyzer || defaultContextAnalyzer;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const originalError = error instanceof Error ? error : new Error(errorMessage);
  
  const posError: POSError = {
    type: POSErrorType.UNKNOWN_ERROR,
    message: `Unknown error: ${errorMessage}`,
    originalError,
    context: {
      sentence,
      approach: 'unknown-error',
      timestamp: Date.now()
    }
  };
  
  logError(posError);
  console.error('Unknown error occurred, falling back to frontend analysis');
  
  // Fallback to frontend analysis
  return analyzer.analyze(sentence);
}

/**
 * Create a standardized error response
 * 
 * @param type - Error type
 * @param message - Error message
 * @param sentence - The sentence being analyzed
 * @param originalError - The original error object (optional)
 * @returns Structured POSError object
 */
export function createPOSError(
  type: POSErrorType,
  message: string,
  sentence: string,
  originalError?: Error
): POSError {
  return {
    type,
    message,
    originalError,
    context: {
      sentence,
      timestamp: Date.now()
    }
  };
}
