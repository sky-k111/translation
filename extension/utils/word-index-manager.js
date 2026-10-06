/**
 * Word Index Manager - Unified interface for word indexing and querying using Trie
 * Provides O(m) time complexity for word lookups where m is word length
 */

// Import Trie if in module context
let TrieClass;
if (typeof require !== 'undefined') {
  try {
    TrieClass = require('./trie-index.js').Trie;
  } catch (e) {
    // Will use global Trie
  }
}

console.log('[WordIndexManager] Starting class definition');

class WordIndexManager {
  /**
   * Create a new WordIndexManager
   * @param {Object} config - Configuration options
   * @param {number} config.persistDelay - Debounce delay for persistence (ms)
   * @param {number} config.maxCacheSize - Max words before LRU eviction
   * @param {string} config.storageKey - Chrome Storage key
   */
  constructor(config = {}) {
    // Use imported Trie or global Trie
    const Trie = TrieClass || (typeof window !== 'undefined' ? window.Trie : (typeof global !== 'undefined' ? global.Trie : null));
    
    if (!Trie) {
      throw new Error('[WordIndexManager] Trie class not found. Please ensure Trie is loaded globally or imported.');
    }
    
    this.trie = new Trie();
    this.metadata = new Map(); // word -> metadata
    this.accessOrder = []; // LRU tracking
    this.version = '1.0.0';
    this.lastModified = Date.now();
    this.persistTimer = null;
    
    this.config = {
      persistDelay: config.persistDelay || 1000,
      maxCacheSize: config.maxCacheSize || 10000,
      storageKey: config.storageKey || 'word_index_v1',
      ...config
    };
    
    // Initialize performance metrics
    this._initPerformanceMetrics();
  }

  /**
   * Build index from word array
   * @param {Array<Object>} words - Array of word objects with metadata
   * @returns {Promise<void>}
   */
  async buildIndex(words) {
    const startTime = performance.now();
    
    // Clear existing index
    const Trie = TrieClass || (typeof window !== 'undefined' ? window.Trie : self.Trie);
    this.trie = new Trie();
    this.metadata.clear();
    this.accessOrder = [];
    
    // Build index
    for (const wordData of words) {
      const word = wordData.word.toLowerCase();
      this.trie.insert(word, { word });
      this.metadata.set(word, wordData);
      this.accessOrder.push(word);
    }
    
    this.lastModified = Date.now();
    
    const duration = performance.now() - startTime;
    console.log(`[WordIndexManager] Built index with ${words.length} words in ${duration.toFixed(2)}ms`);
  }

  /**
   * Search for words matching prefix
   * @param {string} prefix - Search prefix (case-insensitive)
   * @returns {Array<Object>} Matching word objects
   */
  search(prefix) {
    const startTime = performance.now();
    
    const results = this.trie.startsWith(prefix.toLowerCase());
    const wordObjects = results
      .filter(result => this.metadata.has(result.word)) // Only return words that exist in metadata
      .map(result => {
        const word = result.word;
        this._updateAccessOrder(word);
        return this.metadata.get(word) || result;
      });
    
    const duration = performance.now() - startTime;
    if (duration > 10) {
      console.warn(`[WordIndexManager] Slow prefix search: ${duration.toFixed(2)}ms for prefix "${prefix}"`);
    }
    
    return wordObjects;
  }

  /**
   * Find exact word match
   * @param {string} word - Word to find (case-insensitive)
   * @returns {Object|null} Word object or null
   */
  find(word) {
    const startTime = performance.now();
    
    const normalizedWord = word.toLowerCase();
    
    // Check if word exists in metadata (handles removed words)
    if (!this.metadata.has(normalizedWord)) {
      const duration = performance.now() - startTime;
      this._trackPerformance('query', duration);
      return null;
    }
    
    const result = this.trie.search(normalizedWord);
    
    if (result) {
      this._updateAccessOrder(normalizedWord);
      const metadata = this.metadata.get(normalizedWord);
      
      const duration = performance.now() - startTime;
      this._trackPerformance('query', duration);
      
      if (duration > 5) {
        console.warn(`[WordIndexManager] Slow word lookup: ${duration.toFixed(2)}ms for word "${word}"`);
      }
      
      return metadata || result;
    }
    
    const duration = performance.now() - startTime;
    this._trackPerformance('query', duration);
    
    return null;
  }

  /**
   * Add single word incrementally
   * @param {Object} wordData - Word object with metadata
   * @returns {void}
   */
  add(wordData) {
    const startTime = performance.now();
    
    const word = wordData.word.toLowerCase();
    
    // Check capacity and evict if needed
    if (this.metadata.size >= this.config.maxCacheSize) {
      this._evictLRU();
    }
    
    this.trie.insert(word, { word });
    this.metadata.set(word, wordData);
    this._updateAccessOrder(word);
    
    this.lastModified = Date.now();
    this._schedulePersist();
    
    const duration = performance.now() - startTime;
    this._trackPerformance('add', duration);
    
    if (duration > 5) {
      console.warn(`[WordIndexManager] Slow word add: ${duration.toFixed(2)}ms for word "${word}"`);
    }
  }

  /**
   * Remove word from index
   * @param {string} word - Word to remove
   * @returns {boolean} True if removed, false if not found
   */
  remove(word) {
    const normalizedWord = word.toLowerCase();
    
    if (!this.metadata.has(normalizedWord)) {
      return false;
    }
    
    // Note: Trie doesn't have a remove method, so we just remove from metadata
    // The Trie node remains but won't be returned since metadata is missing
    this.metadata.delete(normalizedWord);
    
    // Remove from access order
    const index = this.accessOrder.indexOf(normalizedWord);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    this.lastModified = Date.now();
    this._schedulePersist();
    
    return true;
  }

  /**
   * Batch add multiple words (optimized)
   * @param {Array<Object>} words - Array of word objects
   * @returns {void}
   */
  batchAdd(words) {
    const startTime = performance.now();
    
    for (const wordData of words) {
      const word = wordData.word.toLowerCase();
      
      // Check capacity before each add
      if (this.metadata.size >= this.config.maxCacheSize) {
        this._evictLRU();
      }
      
      this.trie.insert(word, { word });
      this.metadata.set(word, wordData);
      this.accessOrder.push(word);
    }
    
    this.lastModified = Date.now();
    this._schedulePersist();
    
    const duration = performance.now() - startTime;
    console.log(`[WordIndexManager] Batch added ${words.length} words in ${duration.toFixed(2)}ms`);
  }

  /**
   * Update word metadata
   * @param {string} word - Word to update
   * @param {Object} metadata - New metadata
   * @returns {boolean} True if updated, false if not found
   */
  updateMetadata(word, metadata) {
    const normalizedWord = word.toLowerCase();
    
    if (!this.metadata.has(normalizedWord)) {
      return false;
    }
    
    const existingData = this.metadata.get(normalizedWord);
    const updatedData = { ...existingData, ...metadata, word: normalizedWord };
    this.metadata.set(normalizedWord, updatedData);
    
    this._updateAccessOrder(normalizedWord);
    this.lastModified = Date.now();
    this._schedulePersist();
    
    return true;
  }

  /**
   * @deprecated Use find() instead
   * @throws {Error} Always throws error
   */
  linearSearch(word) {
    console.warn('[WordIndexManager] linearSearch() is deprecated. Use find() instead.');
    throw new Error('linearSearch() is deprecated. Use find() for O(m) time complexity.');
  }

  /**
   * Update LRU access order
   * @private
   * @param {string} word - Word that was accessed
   */
  _updateAccessOrder(word) {
    // Remove from current position
    const index = this.accessOrder.indexOf(word);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(word);
  }

  /**
   * Evict least recently used word
   * @private
   */
  _evictLRU() {
    if (this.accessOrder.length === 0) {
      return;
    }
    
    const lruWord = this.accessOrder.shift();
    this.metadata.delete(lruWord);
    
    console.log(`[WordIndexManager] Evicted LRU word: "${lruWord}"`);
  }

  /**
   * Schedule persistence with debouncing
   * @private
   */
  _schedulePersist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    
    this.persistTimer = setTimeout(() => {
      this.persist().catch(err => {
        console.error('[WordIndexManager] Auto-persist failed:', err);
      });
    }, this.config.persistDelay);
  }

  /**
   * Get index statistics
   * @returns {Object} {wordCount, nodeCount, memoryUsage, performance}
   */
  getStats() {
    const wordCount = this.metadata.size;
    const nodeCount = this.trie.size();
    
    // Estimate memory usage
    const memoryBreakdown = this._calculateMemoryUsage();
    const totalMemory = memoryBreakdown.total;
    
    // Calculate memory overhead
    let rawDataSize = 0;
    for (const [word, data] of this.metadata.entries()) {
      rawDataSize += word.length * 2;
      rawDataSize += JSON.stringify(data).length * 2;
    }
    const memoryOverhead = rawDataSize > 0 ? (totalMemory / rawDataSize) : 1;
    
    // Ensure performance metrics are initialized
    this._initPerformanceMetrics();
    
    // Performance metrics
    const performance = {
      avgQueryTime: this._performanceMetrics.avgQueryTime || 0,
      avgAddTime: this._performanceMetrics.avgAddTime || 0,
      totalQueries: this._performanceMetrics.totalQueries || 0,
      totalAdds: this._performanceMetrics.totalAdds || 0
    };
    
    // Check memory warning threshold
    const memoryWarning = memoryOverhead > 1.5;
    if (memoryWarning) {
      console.warn(`[WordIndexManager] Memory overhead is ${(memoryOverhead * 100).toFixed(0)}% (threshold: 150%)`);
    }
    
    return {
      wordCount,
      nodeCount,
      memoryUsage: totalMemory,
      memoryUsageMB: (totalMemory / 1024 / 1024).toFixed(2),
      memoryBreakdown,
      memoryOverhead: (memoryOverhead * 100).toFixed(0) + '%',
      memoryWarning,
      performance,
      version: this.version,
      lastModified: this.lastModified,
      lastModifiedDate: new Date(this.lastModified).toISOString()
    };
  }

  /**
   * Calculate detailed memory usage
   * @private
   * @returns {Object} Memory breakdown
   */
  _calculateMemoryUsage() {
    let trieMemory = 0;
    let metadataMemory = 0;
    let accessOrderMemory = 0;
    
    // Trie nodes (rough estimate: 100 bytes per node)
    const nodeCount = this.trie.size();
    trieMemory = nodeCount * 100;
    
    // Metadata map
    for (const [word, data] of this.metadata.entries()) {
      metadataMemory += word.length * 2; // String chars (UTF-16)
      metadataMemory += JSON.stringify(data).length * 2; // Data size
      metadataMemory += 50; // Map entry overhead
    }
    
    // Access order array
    for (const word of this.accessOrder) {
      accessOrderMemory += word.length * 2;
      accessOrderMemory += 8; // Array entry overhead
    }
    
    const total = trieMemory + metadataMemory + accessOrderMemory;
    
    return {
      trie: trieMemory,
      trieMB: (trieMemory / 1024 / 1024).toFixed(2),
      metadata: metadataMemory,
      metadataMB: (metadataMemory / 1024 / 1024).toFixed(2),
      accessOrder: accessOrderMemory,
      accessOrderMB: (accessOrderMemory / 1024 / 1024).toFixed(2),
      total,
      totalMB: (total / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Initialize performance metrics tracking
   * @private
   */
  _initPerformanceMetrics() {
    if (!this._performanceMetrics) {
      this._performanceMetrics = {
        totalQueries: 0,
        totalQueryTime: 0,
        avgQueryTime: 0,
        totalAdds: 0,
        totalAddTime: 0,
        avgAddTime: 0
      };
    }
  }

  /**
   * Track operation timing
   * @private
   * @param {string} operation - Operation name ('query' or 'add')
   * @param {number} duration - Duration in milliseconds
   */
  _trackPerformance(operation, duration) {
    this._initPerformanceMetrics();
    
    if (operation === 'query') {
      this._performanceMetrics.totalQueries++;
      this._performanceMetrics.totalQueryTime += duration;
      this._performanceMetrics.avgQueryTime = 
        this._performanceMetrics.totalQueryTime / this._performanceMetrics.totalQueries;
    } else if (operation === 'add') {
      this._performanceMetrics.totalAdds++;
      this._performanceMetrics.totalAddTime += duration;
      this._performanceMetrics.avgAddTime = 
        this._performanceMetrics.totalAddTime / this._performanceMetrics.totalAdds;
    }
  }

  /**
   * Serialize index to storage
   * @returns {Promise<void>}
   */
  async persist() {
    const startTime = performance.now();
    
    try {
      // Prepare serialization data
      const words = [];
      for (const [word, metadata] of this.metadata.entries()) {
        words.push(metadata);
      }
      
      const serializedData = {
        version: this.version,
        timestamp: Date.now(),
        data: {
          words,
          accessOrder: this.accessOrder
        },
        checksum: this._calculateChecksum(words)
      };
      
      // Save to Chrome Storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set(
            { [this.config.storageKey]: serializedData },
            () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            }
          );
        });
      } else {
        // Fallback to localStorage for testing
        localStorage.setItem(this.config.storageKey, JSON.stringify(serializedData));
      }
      
      const duration = performance.now() - startTime;
      console.log(`[WordIndexManager] Persisted ${words.length} words in ${duration.toFixed(2)}ms`);
      
      if (duration > 200) {
        console.warn(`[WordIndexManager] Slow persistence: ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('[WordIndexManager] Persistence failed:', error);
      
      // Handle quota exceeded
      if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
        console.warn('[WordIndexManager] Storage quota exceeded, triggering cleanup');
        this._handleQuotaExceeded();
        // Retry after cleanup
        await this.persist();
      } else {
        throw error;
      }
    }
  }

  /**
   * Load index from storage
   * @returns {Promise<boolean>} True if loaded, false if failed
   */
  async load() {
    const startTime = performance.now();
    
    try {
      let serializedData;
      
      // Load from Chrome Storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        serializedData = await new Promise((resolve, reject) => {
          chrome.storage.local.get([this.config.storageKey], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result[this.config.storageKey]);
            }
          });
        });
      } else {
        // Fallback to localStorage for testing
        const stored = localStorage.getItem(this.config.storageKey);
        serializedData = stored ? JSON.parse(stored) : null;
      }
      
      if (!serializedData) {
        console.log('[WordIndexManager] No stored data found');
        return false;
      }
      
      // Validate format
      if (!this._validateSerializedData(serializedData)) {
        console.error('[WordIndexManager] Invalid serialized data format');
        return false;
      }
      
      // Detect and migrate old format
      const detection = this.detectOldFormat(serializedData);
      if (detection.isOldFormat) {
        console.warn(`[WordIndexManager] Old format detected: version=${detection.detectedVersion}`);
        console.log(`[WordIndexManager] Issues found: ${detection.issues.join(', ')}`);
        
        // Attempt migration
        const migrated = this.migrateFromOldFormat(serializedData);
        if (!migrated) {
          console.error('[WordIndexManager] Migration failed');
          return false;
        }
        
        serializedData = migrated;
        console.log('[WordIndexManager] Migration successful, data updated to current version');
        
        // Persist migrated data immediately
        setTimeout(() => {
          this.persist().then(() => {
            console.log('[WordIndexManager] Migrated data persisted successfully');
          }).catch(err => {
            console.error('[WordIndexManager] Failed to persist migrated data:', err);
          });
        }, 100);
      }
      
      // Verify checksum
      const calculatedChecksum = this._calculateChecksum(serializedData.data.words);
      if (serializedData.checksum && serializedData.checksum !== calculatedChecksum) {
        console.warn('[WordIndexManager] Checksum mismatch, data may be corrupted (continuing anyway)');
        // Don't fail on checksum mismatch after migration
      }
      
      // Rebuild index from stored data
      await this.buildIndex(serializedData.data.words);
      
      // Restore access order
      if (serializedData.data.accessOrder) {
        this.accessOrder = serializedData.data.accessOrder;
      }
      
      const duration = performance.now() - startTime;
      console.log(`[WordIndexManager] Loaded ${serializedData.data.words.length} words in ${duration.toFixed(2)}ms`);
      
      if (duration > 200) {
        console.warn(`[WordIndexManager] Slow load: ${duration.toFixed(2)}ms`);
      }
      
      return true;
    } catch (error) {
      console.error('[WordIndexManager] Load failed:', error);
      console.log('[WordIndexManager] Starting with empty index');
      return false;
    }
  }

  /**
   * Reset index (clear all data)
   * @returns {void}
   */
  reset() {
    console.log('[WordIndexManager] Resetting index');
    
    // Clear in-memory data
    const Trie = TrieClass || (typeof window !== 'undefined' ? window.Trie : self.Trie);
    this.trie = new Trie();
    this.metadata.clear();
    this.accessOrder = [];
    this.lastModified = Date.now();
    
    // Clear persisted data
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove([this.config.storageKey], () => {
        console.log('[WordIndexManager] Cleared storage');
      });
    } else {
      localStorage.removeItem(this.config.storageKey);
    }
    
    // Cancel pending persist
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }

  /**
   * Calculate checksum for data integrity
   * @private
   * @param {Array} words - Words array
   * @returns {string} Checksum
   */
  _calculateChecksum(words) {
    // Simple checksum: hash of word count and first/last words
    const count = words.length;
    const first = words[0]?.word || '';
    const last = words[words.length - 1]?.word || '';
    return `${count}-${first}-${last}`;
  }

  /**
   * Validate serialized data format
   * @private
   * @param {Object} data - Serialized data
   * @returns {boolean} True if valid
   */
  _validateSerializedData(data) {
    return (
      data &&
      typeof data === 'object' &&
      data.version &&
      data.timestamp &&
      data.data &&
      Array.isArray(data.data.words)
    );
  }

  /**
   * Detect if data is in old format
   * @param {Object} data - Data to check
   * @returns {Object} Detection result {isOldFormat: boolean, detectedVersion: string, issues: Array}
   */
  detectOldFormat(data) {
    const issues = [];
    let detectedVersion = 'unknown';
    
    if (!data) {
      return { isOldFormat: false, detectedVersion: 'none', issues: ['No data provided'] };
    }
    
    // Check for version field
    if (!data.version) {
      issues.push('Missing version field');
      detectedVersion = 'pre-1.0.0';
    } else {
      detectedVersion = data.version;
    }
    
    // Check for required fields in current format
    if (!data.data || !Array.isArray(data.data.words)) {
      issues.push('Missing or invalid data.words array');
    }
    
    // Check for checksum (added in v1.0.0)
    if (!data.checksum) {
      issues.push('Missing checksum field');
    }
    
    // Check for accessOrder (added in v1.0.0)
    if (!data.data || !Array.isArray(data.data.accessOrder)) {
      issues.push('Missing or invalid data.accessOrder array');
    }
    
    // Detect old format patterns
    const isOldFormat = issues.length > 0 || data.version !== this.version;
    
    if (isOldFormat) {
      console.log(`[WordIndexManager] Old format detected: version=${detectedVersion}, issues=${issues.length}`);
    }
    
    return {
      isOldFormat,
      detectedVersion,
      issues,
      needsMigration: isOldFormat // Always attempt migration if old format detected
    };
  }

  /**
   * Migrate data from old format to current format
   * @param {Object} oldData - Old format data
   * @returns {Object|null} Migrated data or null if migration fails
   */
  migrateFromOldFormat(oldData) {
    try {
      const detection = this.detectOldFormat(oldData);
      
      if (!detection.needsMigration) {
        // Already in current format
        return oldData;
      }
      
      console.log(`[WordIndexManager] Starting migration from ${detection.detectedVersion} to ${this.version}`);
      console.log(`[WordIndexManager] Migration issues to fix: ${detection.issues.join(', ')}`);
      
      let migratedData = { ...oldData };
      
      // Migration path: pre-1.0.0 -> 1.0.0
      if (detection.detectedVersion === 'pre-1.0.0' || !oldData.version) {
        migratedData = this._migrateFromPreV1(oldData);
        if (!migratedData) {
          console.error('[WordIndexManager] Failed to migrate from pre-v1.0.0');
          return null;
        }
        console.log('[WordIndexManager] Successfully migrated from pre-v1.0.0 to v1.0.0');
      }
      
      // Future migration paths can be added here
      // Example: if (detection.detectedVersion === '1.0.0') { ... }
      
      // Ensure version is updated
      migratedData.version = this.version;
      migratedData.timestamp = Date.now();
      
      // Validate migrated data
      if (!this._validateSerializedData(migratedData)) {
        console.error('[WordIndexManager] Migrated data failed validation');
        return null;
      }
      
      console.log(`[WordIndexManager] Migration complete: ${detection.detectedVersion} -> ${this.version}`);
      return migratedData;
      
    } catch (error) {
      console.error('[WordIndexManager] Migration error:', error);
      return null;
    }
  }

  /**
   * Migrate from pre-v1.0.0 format
   * @private
   * @param {Object} oldData - Old format data
   * @returns {Object|null} Migrated data or null
   */
  _migrateFromPreV1(oldData) {
    try {
      // Handle various old formats
      let words = [];
      let accessOrder = [];
      
      // Case 1: Direct array of words
      if (Array.isArray(oldData)) {
        words = oldData.map(item => {
          if (typeof item === 'string') {
            return { word: item };
          }
          return item;
        });
      }
      // Case 2: Object with words array
      else if (oldData.words && Array.isArray(oldData.words)) {
        words = oldData.words;
      }
      // Case 3: Object with data.words array (partial v1 format)
      else if (oldData.data && Array.isArray(oldData.data.words)) {
        words = oldData.data.words;
        accessOrder = oldData.data.accessOrder || [];
      }
      // Case 4: Unknown format
      else {
        console.error('[WordIndexManager] Unknown old format structure');
        return null;
      }
      
      // Generate access order if missing (oldest first)
      if (accessOrder.length === 0) {
        accessOrder = words.map(w => w.word.toLowerCase());
      }
      
      // Create v1.0.0 format
      const migratedData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          words,
          accessOrder
        },
        checksum: this._calculateChecksum(words)
      };
      
      console.log(`[WordIndexManager] Migrated ${words.length} words from pre-v1.0.0 format`);
      return migratedData;
      
    } catch (error) {
      console.error('[WordIndexManager] Error migrating from pre-v1.0.0:', error);
      return null;
    }
  }

  /**
   * Migrate data from old format (legacy method, calls migrateFromOldFormat)
   * @private
   * @param {Object} oldData - Old format data
   * @returns {Object|null} Migrated data or null
   * @deprecated Use migrateFromOldFormat() instead
   */
  _migrateData(oldData) {
    return this.migrateFromOldFormat(oldData);
  }

  /**
   * Handle storage quota exceeded
   * @private
   */
  _handleQuotaExceeded() {
    console.warn('[WordIndexManager] Handling quota exceeded');
    
    // Evict 20% of least recently used words
    const evictCount = Math.floor(this.metadata.size * 0.2);
    for (let i = 0; i < evictCount; i++) {
      this._evictLRU();
    }
    
    console.log(`[WordIndexManager] Evicted ${evictCount} words to free space`);
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  console.log('[WordIndexManager] Exporting via module.exports');
  module.exports = { WordIndexManager };
  console.log('[WordIndexManager] Exported:', typeof WordIndexManager);
} else if (typeof window !== 'undefined') {
  window.WordIndexManager = WordIndexManager;
} else if (typeof self !== 'undefined') {
  self.WordIndexManager = WordIndexManager;
}
