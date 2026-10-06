/**
 * POS Integration Service V2 for Chrome Extension
 * 
 * Enhanced version with AI support and multi-tier user management.
 * Integrates POSServiceFactory for automatic fallback between AI, NLP, and Frontend approaches.
 * 
 * Features:
 * - User tier-based approach selection (free/paid)
 * - AI → NLP → Frontend degradation strategy
 * - Performance monitoring and statistics
 * - Chrome storage integration for user configuration
 * 
 * Requirements: 10.1-10.5, 11.1-11.5
 */

// Import compiled TypeScript modules
import { POSServiceFactory } from '../dist/services/pos-service-factory.js';
import { UserConfigManager, DEFAULT_USER_CONFIG } from '../dist/config/user-config.js';
import { SimpleColorMapper } from '../dist/services/color-mapper.js';
import { posPerformanceMonitor } from './pos-performance-monitor.js';

/**
 * Enhanced POS Integration Service with AI Support
 */
class POSIntegrationServiceV2 {
  constructor() {
    // Initialize services
    this.serviceFactory = new POSServiceFactory();
    this.configManager = new UserConfigManager();
    this.colorMapper = new SimpleColorMapper();
    
    // Initialize POS_Result_Index if available
    this.posResultIndex = null;
    this.initPOSIndex();
    
    // Performance tracking
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      aiRequests: 0,
      nlpRequests: 0,
      frontendRequests: 0,
      totalLatency: 0,
      errors: 0
    };
    
    // Initialize service factory
    this.initialize();
  }
  
  /**
   * Initialize POS_Result_Index for optimized POS result storage
   */
  async initPOSIndex() {
    if (typeof POSResultIndex !== 'undefined' && !this.posResultIndex) {
      try {
        this.posResultIndex = new POSResultIndex({
          storageKey: 'pos_service_index',
          maxEntries: 5000,
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
        // Load existing index from storage
        await this.posResultIndex.load();
        
        // Perform cleanup on initialization
        const removed = this.posResultIndex.cleanup();
        if (removed > 0) {
          console.log(`[POS Service V2] Cleaned up ${removed} old POS results`);
        }
        
        console.log('[POS Service V2] POS_Result_Index initialized');
      } catch (error) {
        console.error('[POS Service V2] Failed to initialize POS_Result_Index:', error);
      }
    }
  }

  /**
   * Initialize the service factory
   */
  async initialize() {
    try {
      await this.serviceFactory.initialize();
      console.log('[POS Service V2] Service factory initialized');
    } catch (error) {
      console.error('[POS Service V2] Failed to initialize service factory:', error);
    }
  }

  /**
   * Analyze POS with automatic approach selection based on user tier
   * 
   * @param {string} sentence - Sentence to analyze
   * @returns {Promise<Object>} Analysis result with POS tags and colors
   */
  async analyze(sentence) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Check POS_Result_Index first for cached results
      if (this.posResultIndex) {
        try {
          const cachedResult = this.posResultIndex.getPOSForSentence(sentence);
          if (cachedResult) {
            this.stats.cacheHits++;
            
            // Apply colors to cached result
            const coloredResult = this.applyColors(cachedResult);
            
            return {
              ...coloredResult,
              latency: Date.now() - startTime,
              approach: cachedResult.approach || 'cached',
              cacheHit: true
            };
          }
        } catch (error) {
          console.error('[POS Service V2] Failed to retrieve from POS_Result_Index:', error);
        }
      }
      
      // Get user configuration
      const userConfig = await this.configManager.getConfig();

      // Analyze with fallback
      const result = await this.serviceFactory.analyzeWithFallback(sentence, userConfig);

      // Store result in POS_Result_Index
      if (this.posResultIndex && result.words && result.words.length > 0) {
        try {
          this.posResultIndex.addResult(sentence, {
            sentence: result.sentence,
            words: result.words,
            approach: result.approach,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('[POS Service V2] Failed to store in POS_Result_Index:', error);
        }
      }

      // Track statistics
      this.trackStatistics(result);

      // Apply colors
      const coloredResult = this.applyColors(result);

      // Record latency
      const latency = Date.now() - startTime;
      this.stats.totalLatency += latency;

      // Log performance
      if (latency > 100) {
        console.warn(`[POS Service V2] Slow analysis: ${latency}ms for "${sentence.substring(0, 30)}..."`);
      }

      return {
        ...coloredResult,
        latency,
        approach: result.approach,
        cacheHit: result.cacheHit
      };
    } catch (error) {
      this.stats.errors++;
      console.error('[POS Service V2] Analysis failed:', error);
      
      // Return empty result on error
      return {
        sentence,
        words: [],
        colors: {},
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Track statistics for monitoring
   */
  trackStatistics(result) {
    if (result.cacheHit) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }

    switch (result.approach) {
      case 'ai':
        this.stats.aiRequests++;
        break;
      case 'nlp':
        this.stats.nlpRequests++;
        break;
      case 'frontend':
        this.stats.frontendRequests++;
        break;
    }
  }

  /**
   * Apply colors to analysis result
   */
  applyColors(result) {
    const colors = {};
    
    result.words.forEach((word, index) => {
      const color = this.colorMapper.getColor(word.pos);
      colors[index] = color;
    });

    return {
      sentence: result.sentence,
      words: result.words,
      colors
    };
  }

  /**
   * Get current statistics
   */
  getStats() {
    const avgLatency = this.stats.totalRequests > 0 
      ? Math.round(this.stats.totalLatency / this.stats.totalRequests)
      : 0;

    const cacheHitRate = this.stats.totalRequests > 0
      ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100)
      : 0;

    return {
      ...this.stats,
      averageLatency: avgLatency,
      cacheHitRate,
      errorRate: this.stats.totalRequests > 0
        ? Math.round((this.stats.errors / this.stats.totalRequests) * 100)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      aiRequests: 0,
      nlpRequests: 0,
      frontendRequests: 0,
      totalLatency: 0,
      errors: 0
    };
  }

  /**
   * Set user tier (free or paid)
   */
  async setUserTier(tier) {
    try {
      await this.configManager.setUserTier(tier);
      console.log(`[POS Service V2] User tier set to: ${tier}`);
    } catch (error) {
      console.error('[POS Service V2] Failed to set user tier:', error);
    }
  }

  /**
   * Get current user tier
   */
  async getUserTier() {
    try {
      return await this.configManager.getUserTier();
    } catch (error) {
      console.error('[POS Service V2] Failed to get user tier:', error);
      return 'free';
    }
  }

  /**
   * Set preferred approach (auto, frontend, nlp, ai)
   */
  async setPreferredApproach(approach) {
    try {
      await this.configManager.setPreferredApproach(approach);
      console.log(`[POS Service V2] Preferred approach set to: ${approach}`);
    } catch (error) {
      console.error('[POS Service V2] Failed to set preferred approach:', error);
    }
  }

  /**
   * Get service availability status
   */
  getServiceAvailability() {
    return this.serviceFactory.getServiceAvailability();
  }

  /**
   * Refresh service availability
   */
  async refreshServiceAvailability() {
    try {
      await this.serviceFactory.refreshServiceAvailability();
      console.log('[POS Service V2] Service availability refreshed');
    } catch (error) {
      console.error('[POS Service V2] Failed to refresh service availability:', error);
    }
  }

  /**
   * Batch analyze multiple sentences
   */
  async analyzeBatch(sentences) {
    const results = [];
    
    for (const sentence of sentences) {
      const result = await this.analyze(sentence);
      results.push(result);
    }

    return results;
  }

  /**
   * Export statistics as JSON
   */
  exportStats() {
    return JSON.stringify(this.getStats(), null, 2);
  }

  /**
   * Export statistics as CSV
   */
  exportStatsCSV() {
    const stats = this.getStats();
    const headers = Object.keys(stats).join(',');
    const values = Object.values(stats).join(',');
    return `${headers}\n${values}`;
  }
}

/**
 * Singleton instance
 */
let instance = null;

/**
 * Get or create singleton instance
 */
export function getPOSIntegrationService() {
  if (!instance) {
    instance = new POSIntegrationServiceV2();
  }
  return instance;
}

/**
 * Create new instance (for testing)
 */
export function createPOSIntegrationService() {
  return new POSIntegrationServiceV2();
}

/**
 * Export class for direct instantiation
 */
export { POSIntegrationServiceV2 };

/**
 * Default export
 */
export default getPOSIntegrationService();
