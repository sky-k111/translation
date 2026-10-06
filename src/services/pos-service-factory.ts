/**
 * POS Service Factory
 * 
 * Factory pattern implementation for selecting the appropriate POS recognition approach
 * based on user tier and service availability. Implements graceful degradation strategy:
 * AI → NLP → Frontend
 * 
 * Requirements: 10.1-10.5
 */

import { POSAnalysisResult, CachedPOSResult } from '../types/pos';
import { UserConfig, UserTier, POSApproach } from '../config/user-config';
import { ContextAnalyzer, contextAnalyzer as defaultContextAnalyzer } from './context-analyzer';
import { AITranslationService, createAIServiceFromSettings } from './ai-translation-service';
import { CacheManager, SimpleCacheManager } from './cache-manager';

/**
 * Service availability status
 */
interface ServiceAvailability {
  ai: boolean;
  nlp: boolean;
  frontend: boolean;
}

/**
 * POS Service Factory
 * 
 * Manages service selection and fallback logic based on user configuration
 * and service availability.
 */
export class POSServiceFactory {
  private contextAnalyzer: ContextAnalyzer;
  private aiService: AITranslationService | null = null;
  private cacheManager: CacheManager;
  private serviceAvailability: ServiceAvailability;

  constructor(
    contextAnalyzer?: ContextAnalyzer,
    cacheManager?: CacheManager
  ) {
    this.contextAnalyzer = contextAnalyzer || defaultContextAnalyzer;
    this.cacheManager = cacheManager || new SimpleCacheManager();
    this.serviceAvailability = {
      ai: false,
      nlp: false,
      frontend: true // Frontend is always available
    };
  }

  /**
   * Initialize the factory by checking service availability
   */
  async initialize(): Promise<void> {
    // Check AI service availability
    try {
      this.aiService = await createAIServiceFromSettings();
      this.serviceAvailability.ai = this.aiService !== null;
    } catch (error) {
      console.warn('AI service initialization failed:', error);
      this.serviceAvailability.ai = false;
    }

    // Check NLP service availability
    // Note: NLP service is backend-based and optional
    // For now, we assume it's not available unless explicitly configured
    this.serviceAvailability.nlp = await this.checkNLPServiceAvailability();
  }

  /**
   * Convert POSAnalysisResult to CachedPOSResult
   */
  private toCachedResult(result: POSAnalysisResult): CachedPOSResult {
    const posMap = new Map<number, import('../types/pos').POSTag>();
    result.words.forEach(word => {
      posMap.set(word.position, word.pos);
    });
    
    return {
      sentence: result.sentence,
      posMap,
      timestamp: result.timestamp
    };
  }

  /**
   * Convert CachedPOSResult to POSAnalysisResult
   */
  private fromCachedResult(cached: CachedPOSResult, approach: 'frontend' | 'nlp' | 'ai'): POSAnalysisResult {
    const words = Array.from(cached.posMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([position, pos]) => {
        // Extract word from sentence at position
        const tokens = cached.sentence.split(/\s+/);
        const word = tokens[position] || '';
        
        return {
          word,
          position,
          pos
        };
      });
    
    return {
      sentence: cached.sentence,
      words,
      approach,
      timestamp: cached.timestamp,
      cacheHit: true
    };
  }

  /**
   * Check if NLP backend service is available
   */
  private async checkNLPServiceAvailability(): Promise<boolean> {
    try {
      // Try to ping the NLP service endpoint
      // This is a placeholder - actual implementation depends on backend setup
      const nlpEndpoint = await this.getNLPEndpoint();
      
      if (!nlpEndpoint) {
        return false;
      }

      const response = await fetch(`${nlpEndpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });

      return response.ok;
    } catch (error) {
      // NLP service not available
      return false;
    }
  }

  /**
   * Get NLP service endpoint from configuration
   */
  private async getNLPEndpoint(): Promise<string | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['nlpEndpoint']);
        return result.nlpEndpoint || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze sentence with automatic fallback based on user configuration
   * 
   * Implements the degradation strategy:
   * 1. For paid users: Try AI → Try NLP → Use Frontend
   * 2. For free users: Use Frontend directly
   * 
   * @param sentence - Sentence to analyze
   * @param userConfig - User configuration
   * @returns POS analysis result
   */
  async analyzeWithFallback(
    sentence: string,
    userConfig: UserConfig
  ): Promise<POSAnalysisResult> {
    // Handle empty input
    if (!sentence || sentence.trim().length === 0) {
      return {
        sentence: '',
        words: [],
        approach: 'frontend',
        timestamp: Date.now(),
        cacheHit: false
      };
    }

    // Check cache first if enabled
    if (userConfig.enableCache) {
      const cached = this.cacheManager.get(sentence);
      if (cached) {
        return this.fromCachedResult(cached, 'frontend');
      }
    }

    // Determine which approach to use based on user tier and availability
    const approach = this.selectApproach(userConfig);

    let result: POSAnalysisResult;

    try {
      switch (approach) {
        case 'ai':
          result = await this.analyzeWithAI(sentence, userConfig);
          break;
        case 'nlp':
          result = await this.analyzeWithNLP(sentence, userConfig);
          break;
        case 'frontend':
        default:
          result = this.analyzeWithFrontend(sentence);
          break;
      }

      // Cache the result if caching is enabled
      if (userConfig.enableCache) {
        this.cacheManager.set(sentence, this.toCachedResult(result));
      }

      return result;
    } catch (error) {
      console.error(`POS analysis failed with approach ${approach}:`, error);
      
      // Final fallback to frontend
      result = this.analyzeWithFrontend(sentence);
      
      if (userConfig.enableCache) {
        this.cacheManager.set(sentence, this.toCachedResult(result));
      }
      
      return result;
    }
  }

  /**
   * Select the appropriate approach based on user configuration and service availability
   * 
   * Requirements: 10.1, 10.2
   */
  private selectApproach(userConfig: UserConfig): POSApproach {
    // If user specified a preferred approach and it's available, use it
    if (userConfig.preferredApproach !== 'auto') {
      const preferred = userConfig.preferredApproach;
      
      if (preferred === 'ai' && this.serviceAvailability.ai && userConfig.tier === 'paid') {
        return 'ai';
      }
      if (preferred === 'nlp' && this.serviceAvailability.nlp && userConfig.tier === 'paid') {
        return 'nlp';
      }
      if (preferred === 'frontend') {
        return 'frontend';
      }
    }

    // Auto selection based on tier and availability
    // Requirement 10.1: Free users use frontend
    if (userConfig.tier === 'free') {
      return 'frontend';
    }

    // Requirement 10.2: Paid users use AI if available
    if (userConfig.tier === 'paid') {
      // Try AI first
      if (this.serviceAvailability.ai) {
        return 'ai';
      }
      
      // Fallback to NLP if available (Requirement 10.3)
      if (this.serviceAvailability.nlp) {
        return 'nlp';
      }
    }

    // Final fallback to frontend (Requirement 10.4)
    return 'frontend';
  }

  /**
   * Analyze using AI service with fallback
   * 
   * Requirements: 10.2, 10.4
   */
  private async analyzeWithAI(
    sentence: string,
    userConfig: UserConfig
  ): Promise<POSAnalysisResult> {
    if (!this.aiService) {
      console.warn('AI service not available, falling back to NLP');
      return this.analyzeWithNLP(sentence, userConfig);
    }

    try {
      const result = await this.aiService.getPOSOnly(sentence);
      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Fallback to NLP
      if (this.serviceAvailability.nlp) {
        console.log('Falling back to NLP service');
        return this.analyzeWithNLP(sentence, userConfig);
      }
      
      // Final fallback to frontend
      console.log('Falling back to frontend analyzer');
      return this.analyzeWithFrontend(sentence);
    }
  }

  /**
   * Analyze using NLP backend service with fallback
   * 
   * Requirements: 10.3, 10.4
   */
  private async analyzeWithNLP(
    sentence: string,
    userConfig: UserConfig
  ): Promise<POSAnalysisResult> {
    if (!this.serviceAvailability.nlp) {
      console.warn('NLP service not available, falling back to frontend');
      return this.analyzeWithFrontend(sentence);
    }

    try {
      const endpoint = await this.getNLPEndpoint();
      
      if (!endpoint) {
        throw new Error('NLP endpoint not configured');
      }

      const response = await fetch(`${endpoint}/api/v1/pos/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sentences: [sentence],
          options: {
            simplifyTags: true
          }
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`NLP service error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.results[0];

      return {
        sentence: result.sentence,
        words: result.tokens.map((token: any) => ({
          word: token.word,
          position: token.position,
          pos: token.simplifiedPOS,
          confidence: 0.9
        })),
        approach: 'nlp',
        timestamp: Date.now(),
        cacheHit: false
      };
    } catch (error) {
      console.error('NLP analysis failed:', error);
      
      // Fallback to frontend
      console.log('Falling back to frontend analyzer');
      return this.analyzeWithFrontend(sentence);
    }
  }

  /**
   * Analyze using frontend context analyzer
   * 
   * This is the base implementation that always works
   * Requirements: 10.1, 10.4
   */
  private analyzeWithFrontend(sentence: string): POSAnalysisResult {
    return this.contextAnalyzer.analyze(sentence);
  }

  /**
   * Get current service availability status
   */
  getServiceAvailability(): ServiceAvailability {
    return { ...this.serviceAvailability };
  }

  /**
   * Manually set service availability (useful for testing)
   */
  setServiceAvailability(availability: Partial<ServiceAvailability>): void {
    this.serviceAvailability = {
      ...this.serviceAvailability,
      ...availability,
      frontend: true // Frontend is ALWAYS available, cannot be disabled
    };
  }

  /**
   * Refresh service availability by re-checking all services
   */
  async refreshServiceAvailability(): Promise<void> {
    await this.initialize();
  }
}

/**
 * Singleton instance of POS Service Factory
 */
export const posServiceFactory = new POSServiceFactory();

/**
 * Convenience function for analyzing with automatic fallback
 * 
 * @param sentence - Sentence to analyze
 * @param userConfig - User configuration
 * @returns POS analysis result
 */
export async function analyzeWithFallback(
  sentence: string,
  userConfig: UserConfig
): Promise<POSAnalysisResult> {
  // Ensure factory is initialized
  if (!posServiceFactory.getServiceAvailability().frontend) {
    await posServiceFactory.initialize();
  }

  return posServiceFactory.analyzeWithFallback(sentence, userConfig);
}
