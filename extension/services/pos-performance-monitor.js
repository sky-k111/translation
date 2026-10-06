/**
 * POS Performance Monitor
 * 
 * Tracks and analyzes performance metrics for POS recognition services.
 * Provides detailed statistics on latency, accuracy, cache hit rates,
 * and degradation events.
 * 
 * Requirements: 9.1, 9.5
 */

/**
 * Performance Monitor for POS Services
 */
class POSPerformanceMonitor {
  constructor() {
    this.metrics = {
      // Overall metrics
      totalRequests: 0,
      totalLatency: 0,
      averageLatency: 0,
      
      // Approach-specific metrics
      approaches: {
        ai: this.createApproachMetrics(),
        nlp: this.createApproachMetrics(),
        frontend: this.createApproachMetrics()
      },
      
      // Cache metrics
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageHitLatency: 0,
        averageMissLatency: 0
      },
      
      // Error tracking
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      
      // Degradation tracking
      degradations: {
        total: 0,
        byPath: {},
        recent: []
      },
      
      // Time-based metrics
      hourly: {},
      daily: {},
      
      // Start time
      startTime: Date.now()
    };
    
    console.log('POS Performance Monitor initialized');
  }
  
  /**
   * Create empty approach metrics
   * @private
   */
  createApproachMetrics() {
    return {
      requests: 0,
      totalLatency: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      errors: 0,
      errorRate: 0,
      successRate: 100,
      latencyDistribution: {
        '<50ms': 0,
        '50-100ms': 0,
        '100-200ms': 0,
        '200-500ms': 0,
        '>500ms': 0
      }
    };
  }
  
  /**
   * Record a POS analysis request
   * 
   * @param {Object} params - Request parameters
   * @param {string} params.approach - Approach used (ai/nlp/frontend)
   * @param {number} params.latency - Request latency in ms
   * @param {boolean} params.cached - Whether result was from cache
   * @param {Error} params.error - Error if request failed
   * @param {string} params.sentence - Sentence analyzed (optional)
   */
  recordRequest({ approach, latency, cached, error, sentence }) {
    // Update overall metrics
    this.metrics.totalRequests++;
    this.metrics.totalLatency += latency;
    this.metrics.averageLatency = this.metrics.totalLatency / this.metrics.totalRequests;
    
    // Update cache metrics
    if (cached) {
      this.metrics.cache.hits++;
      this.metrics.cache.averageHitLatency = 
        (this.metrics.cache.averageHitLatency * (this.metrics.cache.hits - 1) + latency) / 
        this.metrics.cache.hits;
    } else {
      this.metrics.cache.misses++;
      this.metrics.cache.averageMissLatency = 
        (this.metrics.cache.averageMissLatency * (this.metrics.cache.misses - 1) + latency) / 
        this.metrics.cache.misses;
    }
    
    const totalCacheRequests = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = totalCacheRequests > 0
      ? (this.metrics.cache.hits / totalCacheRequests * 100)
      : 0;
    
    // Update approach-specific metrics
    if (this.metrics.approaches[approach]) {
      const approachMetrics = this.metrics.approaches[approach];
      
      approachMetrics.requests++;
      approachMetrics.totalLatency += latency;
      approachMetrics.averageLatency = approachMetrics.totalLatency / approachMetrics.requests;
      approachMetrics.minLatency = Math.min(approachMetrics.minLatency, latency);
      approachMetrics.maxLatency = Math.max(approachMetrics.maxLatency, latency);
      
      // Update latency distribution
      if (latency < 50) {
        approachMetrics.latencyDistribution['<50ms']++;
      } else if (latency < 100) {
        approachMetrics.latencyDistribution['50-100ms']++;
      } else if (latency < 200) {
        approachMetrics.latencyDistribution['100-200ms']++;
      } else if (latency < 500) {
        approachMetrics.latencyDistribution['200-500ms']++;
      } else {
        approachMetrics.latencyDistribution['>500ms']++;
      }
      
      // Update error metrics
      if (error) {
        approachMetrics.errors++;
      }
      
      approachMetrics.errorRate = (approachMetrics.errors / approachMetrics.requests * 100);
      approachMetrics.successRate = 100 - approachMetrics.errorRate;
    }
    
    // Record error if present
    if (error) {
      this.recordError(error, approach, sentence);
    }
    
    // Update time-based metrics
    this.updateTimeBasedMetrics(approach, latency);
  }
  
  /**
   * Record an error
   * @private
   */
  recordError(error, approach, sentence) {
    this.metrics.errors.total++;
    
    const errorType = error.name || 'UnknownError';
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;
    
    // Add to recent errors (keep last 50)
    this.metrics.errors.recent.push({
      type: errorType,
      message: error.message,
      approach,
      sentence: sentence ? sentence.substring(0, 50) : null,
      timestamp: Date.now()
    });
    
    if (this.metrics.errors.recent.length > 50) {
      this.metrics.errors.recent.shift();
    }
  }
  
  /**
   * Record a degradation event
   * 
   * @param {string} from - Original approach
   * @param {string} to - Fallback approach
   * @param {string} reason - Reason for degradation
   */
  recordDegradation(from, to, reason) {
    this.metrics.degradations.total++;
    
    const path = `${from}->${to}`;
    if (!this.metrics.degradations.byPath[path]) {
      this.metrics.degradations.byPath[path] = 0;
    }
    this.metrics.degradations.byPath[path]++;
    
    // Add to recent degradations (keep last 100)
    this.metrics.degradations.recent.push({
      from,
      to,
      reason,
      timestamp: Date.now()
    });
    
    if (this.metrics.degradations.recent.length > 100) {
      this.metrics.degradations.recent.shift();
    }
  }
  
  /**
   * Update time-based metrics
   * @private
   */
  updateTimeBasedMetrics(approach, latency) {
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    
    // Update hourly metrics
    if (!this.metrics.hourly[hourKey]) {
      this.metrics.hourly[hourKey] = {
        requests: 0,
        totalLatency: 0,
        byApproach: {}
      };
    }
    
    this.metrics.hourly[hourKey].requests++;
    this.metrics.hourly[hourKey].totalLatency += latency;
    
    if (!this.metrics.hourly[hourKey].byApproach[approach]) {
      this.metrics.hourly[hourKey].byApproach[approach] = 0;
    }
    this.metrics.hourly[hourKey].byApproach[approach]++;
    
    // Update daily metrics
    if (!this.metrics.daily[dayKey]) {
      this.metrics.daily[dayKey] = {
        requests: 0,
        totalLatency: 0,
        byApproach: {}
      };
    }
    
    this.metrics.daily[dayKey].requests++;
    this.metrics.daily[dayKey].totalLatency += latency;
    
    if (!this.metrics.daily[dayKey].byApproach[approach]) {
      this.metrics.daily[dayKey].byApproach[approach] = 0;
    }
    this.metrics.daily[dayKey].byApproach[approach]++;
    
    // Clean up old hourly data (keep last 24 hours)
    const hourKeys = Object.keys(this.metrics.hourly);
    if (hourKeys.length > 24) {
      hourKeys.sort();
      hourKeys.slice(0, hourKeys.length - 24).forEach(key => {
        delete this.metrics.hourly[key];
      });
    }
    
    // Clean up old daily data (keep last 30 days)
    const dayKeys = Object.keys(this.metrics.daily);
    if (dayKeys.length > 30) {
      dayKeys.sort();
      dayKeys.slice(0, dayKeys.length - 30).forEach(key => {
        delete this.metrics.daily[key];
      });
    }
  }
  
  /**
   * Get current metrics
   * 
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      uptimeFormatted: this.formatUptime(Date.now() - this.metrics.startTime)
    };
  }
  
  /**
   * Get summary statistics
   * 
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return {
      totalRequests: this.metrics.totalRequests,
      averageLatency: this.metrics.averageLatency.toFixed(2) + 'ms',
      cacheHitRate: this.metrics.cache.hitRate.toFixed(2) + '%',
      errorRate: this.metrics.totalRequests > 0
        ? (this.metrics.errors.total / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      degradationRate: this.metrics.totalRequests > 0
        ? (this.metrics.degradations.total / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      approaches: Object.keys(this.metrics.approaches).map(approach => ({
        name: approach,
        requests: this.metrics.approaches[approach].requests,
        averageLatency: this.metrics.approaches[approach].averageLatency.toFixed(2) + 'ms',
        successRate: this.metrics.approaches[approach].successRate.toFixed(2) + '%'
      })),
      uptime: this.formatUptime(Date.now() - this.metrics.startTime)
    };
  }
  
  /**
   * Export metrics for analysis
   * 
   * @returns {Object} Exportable metrics
   */
  exportMetrics() {
    return {
      ...this.getMetrics(),
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
  }
  
  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      totalLatency: 0,
      averageLatency: 0,
      approaches: {
        ai: this.createApproachMetrics(),
        nlp: this.createApproachMetrics(),
        frontend: this.createApproachMetrics()
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageHitLatency: 0,
        averageMissLatency: 0
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      degradations: {
        total: 0,
        byPath: {},
        recent: []
      },
      hourly: {},
      daily: {},
      startTime: Date.now()
    };
  }
  
  /**
   * Format uptime in human-readable format
   * @private
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Create singleton instance
const posPerformanceMonitor = new POSPerformanceMonitor();

// Export for use in background.js
self.posPerformanceMonitor = posPerformanceMonitor;

// Also export for ES6 imports
export { posPerformanceMonitor, POSPerformanceMonitor };
