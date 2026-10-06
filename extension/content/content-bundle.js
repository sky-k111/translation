(() => {
const scriptVersion = '2.1.8';
if (window.__TRANSLATION_ASSISTANT_READY?.version === scriptVersion &&
    window.__TRANSLATION_ASSISTANT_READY.extensionId === chrome.runtime.id) return;
/**
 * Trie树实现 - 用于单词搜索索引
 */
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.wordData = null; // 存储单词的完整数据
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * 插入单词到Trie树
   * @param {string} word - 要插入的单词
   * @param {Object} data - 单词相关数据
   */
  insert(word, data) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.wordData = data;
  }

  /**
   * 搜索单词
   * @param {string} word - 要搜索的单词
   * @returns {Object|null} 单词数据或null
   */
  search(word) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        return null;
      }
      node = node.children[char];
    }
    return node.isEndOfWord ? node.wordData : null;
  }

  /**
   * 前缀搜索
   * @param {string} prefix - 前缀
   * @returns {Array} 匹配的单词数据数组
   */
  startsWith(prefix) {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    return this._collectAllWords(node, prefix);
  }

  /**
   * 收集节点下的所有单词
   * @param {TrieNode} node - 起始节点
   * @param {string} currentPrefix - 当前前缀
   * @returns {Array} 单词数据数组
   */
  _collectAllWords(node, currentPrefix) {
    const results = [];
    if (node.isEndOfWord) {
      results.push(node.wordData);
    }
    for (const char in node.children) {
      results.push(...this._collectAllWords(node.children[char], currentPrefix + char));
    }
    return results;
  }

  /**
   * 获取Trie树大小
   * @returns {number} 节点数量
   */
  size() {
    return this._countNodes(this.root);
  }

  /**
   * 递归计数节点
   * @param {TrieNode} node - 节点
   * @returns {number} 节点数量
   */
  _countNodes(node) {
    let count = 1; // 当前节点
    for (const child in node.children) {
      count += this._countNodes(node.children[child]);
    }
    return count;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Trie };
} else if (typeof window !== 'undefined') {
  window.Trie = Trie;
} else if (typeof self !== 'undefined') {
  self.Trie = Trie;
}
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
/**
 * 动态模块加载器
 * 用于延迟加载非关键模块，减少初始加载时间
 * 
 * 性能优化：
 * - 支持优先级队列
 * - 并行加载控制
 * - 加载失败重试
 * - 加载统计和监控
 */

class DynamicLoader {
  constructor() {
    this.loadedScripts = new Set();
    this.loadingScripts = new Map(); // script path -> Promise
    this.failedScripts = new Set();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalLoadTime: 0,
      avgLoadTime: 0,
      loadTimes: []
    };
    
    // 优先级队列
    this.priorityQueue = {
      high: [],
      normal: [],
      low: []
    };
    
    // 并发控制
    this.maxConcurrent = 3;
    this.currentLoading = 0;
    
    console.log('🔧 动态加载器已初始化');
  }
  
  /**
   * 加载脚本
   * @param {string} scriptPath - 脚本路径
   * @param {Object} options - 加载选项
   * @returns {Promise} 加载Promise
   */
  async loadScript(scriptPath, options = {}) {
    const {
      priority = 'normal',
      retry = 2,
      timeout = 10000
    } = options;
    
    // 如果已加载，直接返回
    if (this.loadedScripts.has(scriptPath)) {
      console.log(`✅ 脚本已加载: ${scriptPath}`);
      return Promise.resolve();
    }
    
    // 如果正在加载，返回现有Promise
    if (this.loadingScripts.has(scriptPath)) {
      console.log(`⏳ 脚本正在加载: ${scriptPath}`);
      return this.loadingScripts.get(scriptPath);
    }
    
    // 创建加载Promise
    const loadPromise = this._loadScriptWithRetry(scriptPath, retry, timeout);
    this.loadingScripts.set(scriptPath, loadPromise);
    
    try {
      await loadPromise;
      this.loadedScripts.add(scriptPath);
      this.loadingScripts.delete(scriptPath);
      console.log(`✅ 脚本加载成功: ${scriptPath}`);
      return Promise.resolve();
    } catch (error) {
      this.failedScripts.add(scriptPath);
      this.loadingScripts.delete(scriptPath);
      console.error(`❌ 脚本加载失败: ${scriptPath}`, error);
      throw error;
    }
  }
  
  /**
   * 带重试的脚本加载
   * @private
   */
  async _loadScriptWithRetry(scriptPath, maxRetries, timeout) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 重试加载 (${attempt}/${maxRetries}): ${scriptPath}`);
          // 指数退避
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
        
        const startTime = Date.now();
        await this._loadScriptCore(scriptPath, timeout);
        const loadTime = Date.now() - startTime;
        
        // 更新统计
        this._updateStats(loadTime, true);
        
        return;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ 加载失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${scriptPath}`, error);
      }
    }
    
    // 所有重试都失败
    this._updateStats(0, false);
    throw lastError;
  }
  
  /**
   * 核心脚本加载逻辑
   * @private
   */
  _loadScriptCore(scriptPath, timeout) {
    return new Promise((resolve, reject) => {
      // 验证扩展上下文是否有效
      if (!chrome.runtime || !chrome.runtime.id) {
        reject(new Error('Extension context is invalid'));
        return;
      }
      
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(scriptPath);
      script.async = true;
      
      // 超时控制
      const timeoutId = setTimeout(() => {
        script.remove();
        reject(new Error(`Script load timeout: ${scriptPath}`));
      }, timeout);
      
      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      
      script.onerror = (error) => {
        clearTimeout(timeoutId);
        script.remove();
        reject(new Error(`Script load error: ${scriptPath}`));
      };
      
      // 添加到DOM
      (document.head || document.documentElement).appendChild(script);
    });
  }
  
  /**
   * 批量加载脚本
   * @param {Array} scripts - 脚本路径数组
   * @param {Object} options - 加载选项
   * @returns {Promise} 加载Promise
   */
  async loadScripts(scripts, options = {}) {
    const { parallel = true } = options;
    
    if (parallel) {
      // 并行加载
      const results = await Promise.allSettled(
        scripts.map(script => this.loadScript(script, options))
      );
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`📦 批量加载完成: ${succeeded}成功, ${failed}失败`);
      
      return {
        succeeded,
        failed,
        total: scripts.length
      };
    } else {
      // 串行加载
      let succeeded = 0;
      let failed = 0;
      
      for (const script of scripts) {
        try {
          await this.loadScript(script, options);
          succeeded++;
        } catch (error) {
          failed++;
        }
      }
      
      console.log(`📦 批量加载完成: ${succeeded}成功, ${failed}失败`);
      
      return {
        succeeded,
        failed,
        total: scripts.length
      };
    }
  }
  
  /**
   * 预加载脚本（不执行）
   * @param {string} scriptPath - 脚本路径
   */
  preloadScript(scriptPath) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = chrome.runtime.getURL(scriptPath);
    document.head.appendChild(link);
    
    console.log(`🔮 预加载脚本: ${scriptPath}`);
  }
  
  /**
   * 更新加载统计
   * @private
   */
  _updateStats(loadTime, success) {
    if (success) {
      this.stats.totalLoaded++;
      this.stats.totalLoadTime += loadTime;
      this.stats.loadTimes.push(loadTime);
      
      // 只保留最近100次加载时间
      if (this.stats.loadTimes.length > 100) {
        this.stats.loadTimes.shift();
      }
      
      // 计算平均加载时间
      this.stats.avgLoadTime = this.stats.totalLoadTime / this.stats.totalLoaded;
    } else {
      this.stats.totalFailed++;
    }
  }
  
  /**
   * 获取加载统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      loadedCount: this.loadedScripts.size,
      failedCount: this.failedScripts.size,
      loadingCount: this.loadingScripts.size,
      successRate: this.stats.totalLoaded / (this.stats.totalLoaded + this.stats.totalFailed) || 0
    };
  }
  
  /**
   * 检查脚本是否已加载
   * @param {string} scriptPath - 脚本路径
   * @returns {boolean} 是否已加载
   */
  isLoaded(scriptPath) {
    return this.loadedScripts.has(scriptPath);
  }
  
  /**
   * 检查脚本是否正在加载
   * @param {string} scriptPath - 脚本路径
   * @returns {boolean} 是否正在加载
   */
  isLoading(scriptPath) {
    return this.loadingScripts.has(scriptPath);
  }
  
  /**
   * 检查脚本是否加载失败
   * @param {string} scriptPath - 脚本路径
   * @returns {boolean} 是否加载失败
   */
  isFailed(scriptPath) {
    return this.failedScripts.has(scriptPath);
  }
  
  /**
   * 重置加载器状态
   */
  reset() {
    this.loadedScripts.clear();
    this.loadingScripts.clear();
    this.failedScripts.clear();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalLoadTime: 0,
      avgLoadTime: 0,
      loadTimes: []
    };
    
    console.log('🔄 动态加载器已重置');
  }
  
  /**
   * 获取加载器状态报告
   * @returns {string} 状态报告
   */
  getReport() {
    const stats = this.getStats();
    
    return `
动态加载器状态报告
==================
已加载: ${stats.loadedCount}
失败: ${stats.failedCount}
正在加载: ${stats.loadingCount}
总加载次数: ${stats.totalLoaded}
总失败次数: ${stats.totalFailed}
成功率: ${(stats.successRate * 100).toFixed(2)}%
平均加载时间: ${stats.avgLoadTime.toFixed(2)}ms
总加载时间: ${stats.totalLoadTime.toFixed(2)}ms
    `.trim();
  }
}

// 创建全局实例
const dynamicLoader = new DynamicLoader();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DynamicLoader, dynamicLoader };
} else if (typeof window !== 'undefined') {
  window.DynamicLoader = DynamicLoader;
  window.dynamicLoader = dynamicLoader;
} else if (typeof self !== 'undefined') {
  self.DynamicLoader = DynamicLoader;
  self.dynamicLoader = dynamicLoader;
}
/**
 * 单词翻译助手 - 模块管理模块
 * 负责统一管理所有模块的初始化流程
 */

/**
 * 模块管理器类
 * 用于统一管理所有模块的初始化流程
 */
class ModuleManager {
  constructor() {
    this.modules = new Map(); // 存储所有模块
    this.initializedModules = new Set(); // 已初始化的模块
    this.initPromises = new Map(); // 模块初始化Promise
    this.moduleDependencies = new Map(); // 模块依赖关系
    this.isInitialized = false; // 是否已完成所有模块初始化
  }
  
  /**
   * 注册模块
   * @param {string} name - 模块名称
   * @param {Object} module - 模块对象
   * @param {Array<string>} dependencies - 依赖的模块名称列表
   */
  registerModule(name, module, dependencies = []) {
    if (this.modules.has(name)) {
      console.warn(`模块 ${name} 已存在，将被覆盖`);
    }
    
    this.modules.set(name, module);
    this.moduleDependencies.set(name, dependencies);
    
    // 如果模块存在且有init方法，立即创建初始化Promise
    if (module && typeof module.init === 'function') {
      this.initPromises.set(name, null);
    }
  }
  
  /**
   * 获取模块
   * @param {string} name - 模块名称
   * @returns {Object|null} 模块对象或null
   */
  getModule(name) {
    return this.modules.get(name) || null;
  }
  
  /**
   * 初始化所有模块
   * @returns {Promise<Array>} 所有模块初始化结果的Promise
   */
  async initAll() {
    if (this.isInitialized) {
      return Promise.resolve('所有模块已初始化');
    }
    
    console.log('开始初始化所有模块...');
    const startTime = Date.now();
    
    try {
      // 按照依赖关系排序模块
      const sortedModules = this._topologicalSort();
      
      // 依次初始化每个模块
      for (const moduleName of sortedModules) {
        await this.initModule(moduleName);
      }
      
      this.isInitialized = true;
      const endTime = Date.now();
      console.log(`所有模块初始化完成，耗时 ${endTime - startTime}ms`);
      
      // 触发全局初始化完成事件
      this._dispatchInitCompleteEvent();
      
      return Promise.resolve(`所有模块初始化完成，共初始化 ${this.initializedModules.size} 个模块`);
    } catch (error) {
      console.error('模块初始化失败:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * 初始化单个模块
   * @param {string} name - 模块名称
   * @returns {Promise<any>} 模块初始化结果的Promise
   */
  async initModule(name) {
    if (this.initializedModules.has(name)) {
      return Promise.resolve(`${name} 模块已初始化`);
    }
    
    const module = this.modules.get(name);
    // 检查模块是否存在
    if (!module) {
      console.debug(`模块 ${name} 为 null 或 undefined，跳过初始化`);
      return Promise.resolve(`${name} 模块不存在`);
    }
    
    // 检查模块是否有init方法
    if (typeof module.init !== 'function') {
      console.debug(`模块 ${name} 没有init方法，跳过初始化`);
      return Promise.resolve(`${name} 模块没有init方法`);
    }
    
    // 检查并初始化依赖模块
    const dependencies = this.moduleDependencies.get(name) || [];
    for (const depName of dependencies) {
      await this.initModule(depName);
    }
    
    console.log(`开始初始化模块: ${name}`);
    const startTime = Date.now();
    
    try {
      // 执行模块初始化
      const result = await module.init();
      
      this.initializedModules.add(name);
      const endTime = Date.now();
      console.log(`模块 ${name} 初始化完成，耗时 ${endTime - startTime}ms`);
      
      return Promise.resolve(result);
    } catch (error) {
      console.error(`模块 ${name} 初始化失败:`, error);
      return Promise.reject(error);
    }
  }
  
  /**
   * 拓扑排序，确定模块初始化顺序
   * @returns {Array<string>} 排序后的模块名称列表
   * @private
   */
  _topologicalSort() {
    const visited = new Set();
    const temp = new Set();
    const result = [];
    
    // 深度优先遍历
    const dfs = (node) => {
      if (temp.has(node)) {
        throw new Error(`模块依赖存在循环: ${node}`);
      }
      
      if (!visited.has(node)) {
        temp.add(node);
        
        const dependencies = this.moduleDependencies.get(node) || [];
        for (const dep of dependencies) {
          dfs(dep);
        }
        
        temp.delete(node);
        visited.add(node);
        result.push(node);
      }
    };
    
    // 遍历所有模块
    for (const moduleName of this.modules.keys()) {
      if (!visited.has(moduleName)) {
        dfs(moduleName);
      }
    }
    
    return result;
  }
  
  /**
   * 触发初始化完成事件
   * @private
   */
  _dispatchInitCompleteEvent() {
    // 只在有 document 的环境中分发事件（popup/dashboard页面）
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('modulesInitialized', {
        detail: {
          initializedModules: Array.from(this.initializedModules),
          totalModules: this.modules.size
        }
      });
      document.dispatchEvent(event);
    }
  }
  
  /**
   * 获取模块初始化状态
   * @returns {Object} 模块初始化状态
   */
  getInitStatus() {
    return {
      isInitialized: this.isInitialized,
      initializedModules: Array.from(this.initializedModules),
      totalModules: this.modules.size,
      uninitializedModules: Array.from(this.modules.keys()).filter(name => !this.initializedModules.has(name))
    };
  }
  
  /**
   * 重置模块管理器
   */
  reset() {
    this.initializedModules.clear();
    this.initPromises.clear();
    this.isInitialized = false;
  }
}

// 创建模块管理器实例
const moduleManager = new ModuleManager();

// 导出到全局作用域
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { ModuleManager, moduleManager };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.ModuleManager = ModuleManager;
  window.moduleManager = moduleManager;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.ModuleManager = ModuleManager;
  self.moduleManager = moduleManager;
}/**
 * 单词翻译助手 - 缓存管理模块
 * 负责处理所有缓存相关功能
 */

// 缓存配置
const CACHE_CONFIG = {
  // 缓存过期时间（毫秒）- 7天
  DEFAULT_EXPIRY: 7 * 24 * 60 * 60 * 1000,
  // 短期缓存过期时间（毫秒）- 1小时
  SHORT_EXPIRY: 60 * 60 * 1000,
  // 最大缓存容量 (Reduced for memory optimization)
  MAX_CACHE_SIZE: 500,
  // 持久化存储最大条目数（新增）
  MAX_PERSISTENT_ENTRIES: 5000,
  // 持久化存储清理阈值（90%时触发清理）
  CLEANUP_THRESHOLD: 0.9,
  // 容量满时清理比例
  CLEANUP_RATIO: 0.2,
  // 持久化存储键前缀
  STORAGE_PREFIX: 'gtp_',
  // 启用持久化存储
  ENABLE_PERSISTENCE: true,
  // 压缩阈值（字节）
  COMPRESSION_THRESHOLD: 1024,
  // 缓存预热配置
  WARMUP_ENABLED: true,
  WARMUP_TOP_WORDS: 100
};

// 导入存储优化工具（延迟导入避免循环依赖）
let storageOptimizer = null;
const getStorageOptimizer = async () => {
  if (!storageOptimizer) {
    try {
      // 检查是否在浏览器环境中
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        throw new Error('Not in Chrome extension environment');
      }
      
      // 验证扩展上下文
      if (!chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context is invalid');
      }
      
      // 尝试动态导入存储优化器
      const scriptPath = chrome.runtime.getURL('extension/utils/storage-optimizer.js');
      
      // 使用script标签加载（更可靠）
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptPath;
        script.onload = () => {
          // 检查是否成功加载
          if (window.batchStorageOps || self.batchStorageOps) {
            storageOptimizer = window.batchStorageOps || self.batchStorageOps;
            resolve();
          } else {
            reject(new Error('Storage optimizer not found after loading'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load storage optimizer'));
        (document.head || document.documentElement || document.body).appendChild(script);
      });
      
      console.log('✅ Storage optimizer loaded successfully');
    } catch (error) {
      console.warn('⚠️ Storage optimizer not available, using fallback:', error.message);
      // 降级到无优化版本 - 提供兼容的接口
      storageOptimizer = {
        batchSet: (data) => {
          return new Promise((resolve, reject) => {
            chrome.storage.local.set(data, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        },
        batchGet: (keys) => {
          return new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result);
              }
            });
          });
        },
        compress: (data) => JSON.stringify(data),
        decompress: (data) => {
          try {
            return JSON.parse(data);
          } catch (e) {
            // 如果解析失败，可能是旧格式数据，直接返回
            return data;
          }
        }
      };
    }
  }
  return storageOptimizer;
};

/**
 * 高级缓存类，支持LRU策略、容量限制和持久化存储
 * 优化1：使用LRU（最近最少使用）替代FIFO策略
 * 优化2：持久化存储上限控制
 * 优化3：缓存预热机制
 * 优化4：防抖保存到存储，减少IO
 */
class AdvancedCache {
  constructor(name, maxSize = CACHE_CONFIG.MAX_CACHE_SIZE, expiry = CACHE_CONFIG.DEFAULT_EXPIRY, enablePersistence = CACHE_CONFIG.ENABLE_PERSISTENCE) {
    this.name = name;
    this.maxSize = maxSize;
    this.expiry = expiry;
    this.enablePersistence = enablePersistence;
    // 使用Map实现LRU：Map保持插入顺序，最新访问的移到末尾
    this.cache = new Map();
    this.storageKey = `${CACHE_CONFIG.STORAGE_PREFIX}${name}`;
    this.saveTimer = null; // For debouncing

    // 初始化缓存统计信息
    this.resetStats();

    // 保存加载后的缓存状态，用于增量保存
    this.lastSavedCache = new Map();
    this.lastVersion = null; // 版本控制

    // 从持久化存储加载缓存
    this.loadFromStorage();
  }
  
  /**
   * 初始化缓存（用于模块管理器统一调用）
   */
  async init() {
    // 缓存已经在构造函数中初始化，这里只需要返回一个成功的Promise
    return Promise.resolve('缓存初始化完成');
  }
  
  /**
   * 获取缓存项（LRU策略）
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存值，如果过期或不存在则返回null
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    // 检查过期时间
    if (Date.now() - cached.timestamp > this.expiry) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.debouncedSave(); // Use debounced save
      this.stats.misses++;
      return null;
    }
    
    // LRU策略：将访问的项移到最后（最近使用）
    this.cache.delete(key);
    this.cache.set(key, cached);
    
    // 更新使用频率（用于统计）
    cached.usage = (cached.usage || 0) + 1;
    cached.lastAccess = Date.now();
    
    this.stats.hits++;
    return cached;
  }
  
  /**
   * 设置缓存项（LRU策略）
   * @param {string} key - 缓存键
   * @param {Object} value - 缓存值
   */
  set(key, value) {
    // 如果key已存在，先删除（LRU：重新插入会放到末尾）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 检查容量限制，使用LRU清理
    if (this.cache.size >= this.maxSize) {
      this.cleanupLRU();
    }
    
    // 确保值包含timestamp和usage
    const cachedValue = {
      ...value,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      usage: 1
    };
    
    // 设置缓存（会自动放到Map的末尾）
    this.cache.set(key, cachedValue);
    
    // 保存到持久化存储
    this.debouncedSave();
    
    this.stats.sets++;
  }
  
  /**
   * LRU清理：删除最旧的缓存项
   * Map的迭代顺序就是插入顺序，第一个就是最旧的
   */
  cleanupLRU() {
    // 计算需要清理的数量
    const itemsToClean = Math.ceil(this.maxSize * CACHE_CONFIG.CLEANUP_RATIO);
    
    // 删除最旧的项（Map的前面几项）
    let deleted = 0;
    for (const [key] of this.cache) {
      if (deleted >= itemsToClean) break;
      this.cache.delete(key);
      this.stats.deletes++;
      deleted++;
    }
    
    // 保存到持久化存储
    this.debouncedSave();
    
    this.stats.cleanups++;
    this.stats.lastCleanupTime = Date.now();
  }
  
  /**
   * 清理过期和不常用的缓存项（保留旧方法作为备用）
   * 优化：使用快速选择算法，避免全量排序，提高性能
   */
  cleanup() {
    // 优先使用LRU清理
    this.cleanupLRU();
  }
  
  /**
   * 使用快速选择算法找到最不常用的缓存项
   * @param {Array} entries - 缓存项数组
   * @param {number} count - 需要返回的项数量
   * @returns {Array} 最不常用的缓存项
   */
  _findLeastUsedItems(entries, count) {
    // 定义比较函数：先比较使用频率，再比较时间戳
    const compare = (a, b) => {
      if (a[1].usage !== b[1].usage) {
        return a[1].usage - b[1].usage;
      } else {
        return a[1].timestamp - b[1].timestamp;
      }
    };
    
    const partition = (arr, left, right, pivotIndex) => {
      const pivotValue = arr[pivotIndex];
      [arr[pivotIndex], arr[right]] = [arr[right], arr[pivotIndex]];
      let storeIndex = left;
      
      for (let i = left; i < right; i++) {
        if (compare(arr[i], pivotValue) < 0) {
          [arr[storeIndex], arr[i]] = [arr[i], arr[storeIndex]];
          storeIndex++;
        }
      }
      
      [arr[right], arr[storeIndex]] = [arr[storeIndex], arr[right]];
      return storeIndex;
    };
    
    // 快速选择算法实现
    const quickSelect = (arr, left, right, k) => {
      if (left === right) {
        return arr.slice(0, left + 1);
      }
      
      const pivotIndex = Math.floor(Math.random() * (right - left + 1)) + left;
      const newPivotIndex = partition(arr, left, right, pivotIndex);
      
      if (newPivotIndex === k) {
        return arr.slice(0, k + 1);
      } else if (newPivotIndex > k) {
        return quickSelect(arr, left, newPivotIndex - 1, k);
      } else {
        return quickSelect(arr, newPivotIndex + 1, right, k);
      }
    };
    
    // 复制数组以避免修改原数组
    const copy = [...entries];
    
    // 如果需要的项数大于数组长度，返回整个数组
    if (count >= copy.length) {
      return copy.map(entry => ({ key: entry[0], value: entry[1] }));
    }
    
    // 使用快速选择找到前 count 个最不常用的项
    const selected = quickSelect(copy, 0, copy.length - 1, count - 1);
    
    // 返回前 count 个项
    return selected.slice(0, count).map(entry => ({ key: entry[0], value: entry[1] }));
  }
  
  /**
   * 从持久化存储加载缓存
   * 优化：支持压缩数据解压、批量读取和版本控制的增量同步
   * 新增：持久化存储上限检查
   */
  async loadFromStorage() {
    if (!this.enablePersistence) return;

    try {
      const optimizer = await getStorageOptimizer();
      // 修复：使用箭头函数确保正确的this绑定
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get([this.storageKey], (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });
      
      const stored = result[this.storageKey];

      if (stored) {
        // 解压数据
        const data = optimizer.decompress(stored);

        let entries = [];
        if (Array.isArray(data.cache)) {
              entries = data.cache;
        } else if (Array.isArray(data)) {
              entries = data;
        }

        // 检查持久化存储是否超过上限
        if (entries.length > CACHE_CONFIG.MAX_PERSISTENT_ENTRIES) {
          console.warn(`持久化存储超过上限(${entries.length}/${CACHE_CONFIG.MAX_PERSISTENT_ENTRIES})，执行清理`);
          // 只保留最近的条目（按timestamp排序）
          entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
          entries = entries.slice(0, CACHE_CONFIG.MAX_PERSISTENT_ENTRIES);
        }

        // 根据数据类型处理缓存加载
        if (data.type === 'incremental') {
          // 增量加载：将新的缓存项合并到现有缓存中
          const incrementalMap = new Map(entries);

          // 合并新的缓存项到现有缓存
          incrementalMap.forEach((value, key) => {
            this.cache.set(key, value);
          });

          // 更新版本号
          this.lastVersion = data.timestamp;
        } else {
          // 全量加载：替换整个缓存
          this.cache = new Map(entries);
          this.lastVersion = data.timestamp;
        }

        // 简单迁移：如果没有 usage 字段，初始化为 1
        this.cache.forEach((val, key) => {
            if (val.usage === undefined) val.usage = 1;
            if (val.lastAccess === undefined) val.lastAccess = val.timestamp || Date.now();
        });

        // 保存加载后的缓存状态，用于增量保存
        this.lastSavedCache = new Map(this.cache);
        
        console.log(`缓存${this.name}加载完成: ${this.cache.size}条`);
      }
    } catch (error) {
      console.warn(`加载缓存${this.name}失败:`, error);
      this.cache = new Map();
      this.lastVersion = null;
    }
  }
  
  /**
   * 防抖保存
   */
  debouncedSave() {
      if (!this.enablePersistence) return;
      if (this.saveTimer) clearTimeout(this.saveTimer);
      // 动态调整防抖时间，根据缓存大小和变化频率调整
      const debounceTime = Math.min(3000, Math.max(1000, this.cache.size / 100 * 100));
      this.saveTimer = setTimeout(() => this.saveToStorage(), debounceTime);
  }

  /**
   * 保存缓存到持久化存储
   * 优化：实现增量保存，只保存变化的缓存项，添加压缩和批量写入，带版本控制
   */
  async saveToStorage() {
    if (!this.enablePersistence) return;

    try {
      const optimizer = await getStorageOptimizer();

      // 当前版本号（基于时间戳）
      const currentVersion = Date.now();

      // 实现增量保存，只保存变化的缓存项
      let data;
      if (this.lastSavedCache && this.lastVersion) {
        // 检查缓存是否发生变化
        const hasChanges = this._hasCacheChanged();
        if (!hasChanges) {
          return; // 缓存没有变化，不需要保存
        }

        // 增量保存：只保存新添加或修改的缓存项
        const changedEntries = [...this.cache.entries()].filter(([key, value]) => {
          const lastValue = this.lastSavedCache.get(key);
          return !lastValue || JSON.stringify(lastValue) !== JSON.stringify(value);
        });

        data = {
          cache: changedEntries,
          type: 'incremental',
          timestamp: currentVersion,
          baseVersion: this.lastVersion
        };
      } else {
        // 首次保存，全量保存
        data = {
          cache: [...this.cache.entries()],
          type: 'full',
          timestamp: currentVersion
        };
      }

      // 压缩数据
      const compressed = optimizer.compress(data);

      // 修复：使用Promise包装chrome.storage.local.set，确保正确的this绑定
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [this.storageKey]: compressed }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      // 更新上次保存的状态
      this.lastSavedCache = new Map(this.cache);
      this.lastVersion = currentVersion;
    } catch (error) {
      console.warn(`保存缓存${this.name}失败:`, error);
    }
  }
  
  /**
   * 检查缓存是否发生变化
   * @returns {boolean} 缓存是否发生变化
   */
  _hasCacheChanged() {
    // 检查缓存大小是否变化
    if (this.cache.size !== this.lastSavedCache.size) {
      return true;
    }
    
    // 检查每个缓存项是否变化
    for (const [key, value] of this.cache) {
      const lastValue = this.lastSavedCache.get(key);
      if (!lastValue || JSON.stringify(lastValue) !== JSON.stringify(value)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 清空缓存
   */
  clear() {
    // 统计删除的缓存项数量
    this.stats.deletes += this.cache.size;
    
    this.cache.clear();
    this.debouncedSave();
    
    // 重置上次保存的缓存状态
    this.lastSavedCache = new Map();
  }
  
  /**
   * 获取缓存大小
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * 获取缓存命中率
   * @returns {number} 缓存命中率（0-1）
   */
  getHitRate() {
    const totalRequests = this.stats.hits + this.stats.misses;
    return totalRequests > 0 ? this.stats.hits / totalRequests : 0;
  }
  
  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计信息
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      expiry: this.expiry,
      enablePersistence: this.enablePersistence
    };
  }
  
  /**
   * 重置缓存统计信息
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      lastCleanupTime: Date.now()
    };
  }
  
  /**
   * 缓存预热：预加载高频词汇
   * @param {Function} getTopWordsFunc - 获取高频词汇的函数
   * @param {Function} translateFunc - 翻译函数
   * @param {number} count - 预热词汇数量
   */
  async warmup(getTopWordsFunc, translateFunc, count = CACHE_CONFIG.WARMUP_TOP_WORDS) {
    if (!CACHE_CONFIG.WARMUP_ENABLED) {
      console.log('缓存预热已禁用');
      return;
    }
    
    try {
      console.log(`开始缓存预热: ${this.name}，预热${count}个高频词汇`);
      const startTime = Date.now();
      
      // 获取高频词汇
      const topWords = await getTopWordsFunc(count);
      
      let warmedCount = 0;
      for (const word of topWords) {
        // 检查是否已缓存
        const cached = this.get(word);
        if (!cached) {
          try {
            // 翻译并缓存
            const result = await translateFunc(word);
            this.set(word, result);
            warmedCount++;
          } catch (error) {
            console.warn(`预热词汇${word}失败:`, error);
          }
        }
      }
      
      const endTime = Date.now();
      console.log(`缓存预热完成: ${warmedCount}/${topWords.length}个词汇，耗时${endTime - startTime}ms`);
    } catch (error) {
      console.error('缓存预热失败:', error);
    }
  }
  
  /**
   * 检查并清理持久化存储
   * 当存储接近上限时自动清理
   */
  async checkAndCleanPersistentStorage() {
    if (!this.enablePersistence) return;
    
    try {
      // 获取当前存储大小
      const bytesInUse = await new Promise((resolve) => {
        chrome.storage.local.getBytesInUse(null, (bytes) => {
          resolve(bytes);
        });
      });
      
      // Chrome Storage API限制：5MB
      const STORAGE_LIMIT = 5 * 1024 * 1024;
      const threshold = STORAGE_LIMIT * CACHE_CONFIG.CLEANUP_THRESHOLD;
      
      if (bytesInUse > threshold) {
        console.warn(`持久化存储接近上限(${(bytesInUse / 1024 / 1024).toFixed(2)}MB/${(STORAGE_LIMIT / 1024 / 1024).toFixed(2)}MB)，执行清理`);
        
        // 清理最旧的20%缓存项
        const itemsToClean = Math.ceil(this.cache.size * 0.2);
        let deleted = 0;
        
        for (const [key] of this.cache) {
          if (deleted >= itemsToClean) break;
          this.cache.delete(key);
          deleted++;
        }
        
        // 立即保存
        await this.saveToStorage();
        
        console.log(`持久化存储清理完成: 删除${deleted}条，剩余${this.cache.size}条`);
      }
    } catch (error) {
      console.error('检查持久化存储失败:', error);
    }
  }
}

// 导出常量和类，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { AdvancedCache, CACHE_CONFIG };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.AdvancedCache = AdvancedCache;
  window.CACHE_CONFIG = CACHE_CONFIG;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.AdvancedCache = AdvancedCache;
  self.CACHE_CONFIG = CACHE_CONFIG;
}
/**
 * 单词翻译助手 - 事件管理模块
 * 负责处理事件委托和防抖节流等事件处理功能
 */

/**
 * 防抖函数
 * 限制函数在一定时间内只能执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * 节流函数
 * 限制函数在一定时间内只能执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 事件委托管理器
 * 用于统一管理所有事件监听，实现更高效的事件委托
 */
class EventDelegateManager {
  constructor() {
    this.eventListeners = new Map(); // 存储事件监听器
    this.delegatedEvents = new Map(); // 存储委托的事件
    this.stats = {
      totalEvents: 0,
      handledEvents: 0,
      delegatedEvents: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
  }
  
  /**
   * 添加事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 事件选项
   * @param {string} selector - 选择器，用于事件委托
   * @returns {string} 事件监听器ID
   */
  addEventListener(eventName, handler, options = {}, selector = null) {
    const listenerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (selector) {
      // 事件委托
      this._addDelegatedEventListener(eventName, handler, options, selector, listenerId);
    } else {
      // 普通事件监听
      const listener = {
        id: listenerId,
        handler,
        options,
        element: document
      };
      
      document.addEventListener(eventName, handler, options);
      
      // 存储事件监听器
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, new Map());
      }
      this.eventListeners.get(eventName).set(listenerId, listener);
    }
    
    return listenerId;
  }
  
  /**
   * 添加委托事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 事件选项
   * @param {string} selector - 选择器
   * @param {string} listenerId - 事件监听器ID
   * @private
   */
  _addDelegatedEventListener(eventName, handler, options, selector, listenerId) {
    // 检查是否已经有相同的事件委托
    if (!this.delegatedEvents.has(eventName)) {
      const delegatedHandler = this._createDelegatedHandler(eventName);
      document.addEventListener(eventName, delegatedHandler, options);
      this.delegatedEvents.set(eventName, {
        handler: delegatedHandler,
        listeners: new Map()
      });
      this.stats.delegatedEvents++;
    }
    
    // 添加事件监听器
    const delegatedEvent = this.delegatedEvents.get(eventName);
    delegatedEvent.listeners.set(listenerId, {
      id: listenerId,
      handler,
      selector,
      options
    });
  }
  
  /**
   * 创建委托事件处理函数
   * @param {string} eventName - 事件名称
   * @returns {Function} 委托事件处理函数
   * @private
   */
  _createDelegatedHandler(eventName) {
    return (event) => {
      const startTime = Date.now();
      this.stats.totalEvents++;
      
      const delegatedEvent = this.delegatedEvents.get(eventName);
      if (!delegatedEvent) return;
      
      // 遍历所有监听器，找到匹配的选择器
      for (const [listenerId, listener] of delegatedEvent.listeners.entries()) {
        const target = event.target;
        if (target.matches(listener.selector) || target.closest(listener.selector)) {
          // 执行事件处理函数
          listener.handler.call(target, event);
          this.stats.handledEvents++;
        }
      }
      
      // 更新统计信息
      const processingTime = Date.now() - startTime;
      this.stats.totalProcessingTime += processingTime;
      this.stats.avgProcessingTime = this.stats.totalEvents > 0 
        ? this.stats.totalProcessingTime / this.stats.totalEvents 
        : 0;
    };
  }
  
  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {string} listenerId - 事件监听器ID
   */
  removeEventListener(eventName, listenerId) {
    // 检查是否是委托事件
    if (this.delegatedEvents.has(eventName)) {
      const delegatedEvent = this.delegatedEvents.get(eventName);
      if (delegatedEvent.listeners.has(listenerId)) {
        delegatedEvent.listeners.delete(listenerId);
        
        // 如果没有监听器了，移除委托事件
        if (delegatedEvent.listeners.size === 0) {
          document.removeEventListener(eventName, delegatedEvent.handler);
          this.delegatedEvents.delete(eventName);
        }
      }
    }
    
    // 检查是否是普通事件
    if (this.eventListeners.has(eventName)) {
      const listeners = this.eventListeners.get(eventName);
      if (listeners.has(listenerId)) {
        const listener = listeners.get(listenerId);
        document.removeEventListener(eventName, listener.handler, listener.options);
        listeners.delete(listenerId);
        
        // 如果没有监听器了，移除事件
        if (listeners.size === 0) {
          this.eventListeners.delete(eventName);
        }
      }
    }
  }
  
  /**
   * 移除所有事件监听器
   */
  removeAllEventListeners() {
    // 移除普通事件监听器
    for (const [eventName, listeners] of this.eventListeners.entries()) {
      for (const [listenerId, listener] of listeners.entries()) {
        document.removeEventListener(eventName, listener.handler, listener.options);
      }
    }
    this.eventListeners.clear();
    
    // 移除委托事件监听器
    for (const [eventName, delegatedEvent] of this.delegatedEvents.entries()) {
      document.removeEventListener(eventName, delegatedEvent.handler);
    }
    this.delegatedEvents.clear();
    
    // 重置统计信息
    this.resetStats();
  }
  
  /**
   * 初始化事件管理器（用于模块管理器统一调用）
   */
  async init() {
    // 事件管理器已经在构造函数中初始化，这里只需要返回一个成功的Promise
    return Promise.resolve('事件管理器初始化完成');
  }
  
  /**
   * 获取事件统计信息
   * @returns {Object} 事件统计信息
   */
  getStats() {
    return {
      ...this.stats,
      totalListeners: this._getTotalListeners(),
      totalDelegatedEvents: this.delegatedEvents.size
    };
  }
  
  /**
   * 获取总监听器数量
   * @returns {number} 总监听器数量
   * @private
   */
  _getTotalListeners() {
    let count = 0;
    
    // 统计普通事件监听器
    for (const listeners of this.eventListeners.values()) {
      count += listeners.size;
    }
    
    // 统计委托事件监听器
    for (const delegatedEvent of this.delegatedEvents.values()) {
      count += delegatedEvent.listeners.size;
    }
    
    return count;
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalEvents: 0,
      handledEvents: 0,
      delegatedEvents: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
  }
}

// 导出常量和类，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { EventDelegateManager, debounce, throttle };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.EventDelegateManager = EventDelegateManager;
  window.debounce = debounce;
  window.throttle = throttle;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.EventDelegateManager = EventDelegateManager;
  self.debounce = debounce;
  self.throttle = throttle;
}
/**
 * 样式管理器
 * 用于按需加载CSS文件，减少初始加载体积
 * 
 * 功能：
 * - 按需加载CSS文件
 * - 避免重复加载
 * - 支持批量加载
 * - 加载状态追踪
 */

class StyleManager {
  constructor() {
    this.loadedStyles = new Set();
    this.loadingStyles = new Map(); // style name -> Promise
    this.styleCache = new Map();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      loadTimes: []
    };
    
    // 样式文件映射
    this.styleMap = {
      'animations': 'extension/components/styles/animations.css',
      'variables': 'extension/components/styles/variables.css',
      'reset': 'extension/components/styles/reset.css',
      'utils': 'extension/components/styles/utils.css'
    };
    
    console.log('🎨 样式管理器已初始化');
  }
  
  /**
   * 加载单个样式文件
   * @param {string} styleName - 样式名称
   * @returns {Promise} 加载Promise
   */
  async loadStyle(styleName) {
    // 如果已加载，直接返回
    if (this.loadedStyles.has(styleName)) {
      console.log(`✅ 样式已加载: ${styleName}`);
      return Promise.resolve();
    }
    
    // 如果正在加载，返回现有Promise
    if (this.loadingStyles.has(styleName)) {
      console.log(`⏳ 样式加载中: ${styleName}`);
      return this.loadingStyles.get(styleName);
    }
    
    // 获取样式路径
    const path = this.styleMap[styleName];
    if (!path) {
      console.warn(`⚠️ 未知的样式名称: ${styleName}`);
      return Promise.reject(new Error(`Unknown style: ${styleName}`));
    }
    
    // 创建加载Promise
    const loadPromise = this._loadStyleCore(styleName, path);
    this.loadingStyles.set(styleName, loadPromise);
    
    return loadPromise;
  }
  
  /**
   * 核心样式加载逻辑
   * @private
   */
  async _loadStyleCore(styleName, path) {
    const startTime = performance.now();
    
    try {
      // 验证扩展上下文
      if (!chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context is invalid');
      }
      
      // 创建link元素
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(path);
      link.dataset.styleName = styleName;
      
      // 等待加载完成
      await new Promise((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load style: ${styleName}`));
        
        // 添加到DOM
        (document.head || document.documentElement).appendChild(link);
      });
      
      // 记录加载成功
      this.loadedStyles.add(styleName);
      this.loadingStyles.delete(styleName);
      this.styleCache.set(styleName, link);
      
      const loadTime = performance.now() - startTime;
      this.stats.totalLoaded++;
      this.stats.loadTimes.push(loadTime);
      
      console.log(`✅ 样式加载成功: ${styleName} (${loadTime.toFixed(0)}ms)`);
      
    } catch (error) {
      this.loadingStyles.delete(styleName);
      this.stats.totalFailed++;
      
      console.error(`❌ 样式加载失败: ${styleName}`, error);
      throw error;
    }
  }
  
  /**
   * 批量加载样式
   * @param {Array<string>} styleNames - 样式名称数组
   * @returns {Promise} 加载Promise
   */
  async loadStyles(styleNames) {
    console.log(`📦 批量加载样式: ${styleNames.join(', ')}`);
    
    const promises = styleNames.map(name => this.loadStyle(name));
    const results = await Promise.allSettled(promises);
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ 批量加载完成: ${succeeded}成功, ${failed}失败`);
    
    return results;
  }
  
  /**
   * 根据组件需求加载样式
   * @param {Array<Object>} components - 组件数组
   * @returns {Promise} 加载Promise
   */
  async loadRequiredStyles(components) {
    const requiredStyles = new Set();
    
    components.forEach(comp => {
      if (comp.requiresAnimations) requiredStyles.add('animations');
      if (comp.requiresVariables) requiredStyles.add('variables');
      if (comp.requiresReset) requiredStyles.add('reset');
      if (comp.requiresUtils) requiredStyles.add('utils');
    });
    
    if (requiredStyles.size === 0) {
      console.log('ℹ️ 无需加载额外样式');
      return Promise.resolve();
    }
    
    return this.loadStyles(Array.from(requiredStyles));
  }
  
  /**
   * 卸载样式
   * @param {string} styleName - 样式名称
   */
  unloadStyle(styleName) {
    if (!this.loadedStyles.has(styleName)) {
      console.warn(`⚠️ 样式未加载: ${styleName}`);
      return;
    }
    
    const link = this.styleCache.get(styleName);
    if (link && link.parentNode) {
      link.parentNode.removeChild(link);
    }
    
    this.loadedStyles.delete(styleName);
    this.styleCache.delete(styleName);
    
    console.log(`🗑️ 样式已卸载: ${styleName}`);
  }
  
  /**
   * 检查样式是否已加载
   * @param {string} styleName - 样式名称
   * @returns {boolean} 是否已加载
   */
  isLoaded(styleName) {
    return this.loadedStyles.has(styleName);
  }
  
  /**
   * 获取加载统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const avgLoadTime = this.stats.loadTimes.length > 0
      ? this.stats.loadTimes.reduce((a, b) => a + b, 0) / this.stats.loadTimes.length
      : 0;
    
    return {
      totalLoaded: this.stats.totalLoaded,
      totalFailed: this.stats.totalFailed,
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      loadedStyles: Array.from(this.loadedStyles),
      loadingStyles: Array.from(this.loadingStyles.keys())
    };
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      loadTimes: []
    };
  }
}

// 导出全局实例
if (typeof window !== 'undefined') {
  window.StyleManager = StyleManager;
  window.styleManager = new StyleManager();
}
/**
 * 单词翻译助手 - 内容脚本
 *
 * 主要功能：
 * 1. 在网页中注入翻译功能和UI组件
 * 2. 处理文本选择和翻译请求
 * 3. 高亮显示已翻译的单词
 * 4. 管理翻译缓存和用户交互
 * 5. 与后台服务进程通信获取翻译结果
 * 6. 预加载常用单词数据，提高响应速度
 */

// ====================
// Trusted Types Policy 定义 (修复 GitHub 等站点 CSP 问题)
// ====================
let htmlPolicy = { createHTML: (string) => string };
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  try {
    htmlPolicy = window.trustedTypes.createPolicy('trae-translation-policy', {
      createHTML: (string) => string, // 插件内部生成的 HTML 视为可信
    });
  } catch (e) {
    console.warn('Trusted Types policy creation failed:', e);
  }
}

// ====================
// 内存安全的事件监听器管理器 (防止内存泄漏)
// ====================
const EventListenerManager = {
  activeListeners: new Map(),

  add(element, event, handler, options = {}) {
    const listenerId = `${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    element.addEventListener(event, handler, options);
    this.activeListeners.set(listenerId, { element, event, handler, options });
    return listenerId;
  },

  remove(listenerId) {
    const listener = this.activeListeners.get(listenerId);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      this.activeListeners.delete(listenerId);
    }
  },

  removeByElement(element) {
    this.activeListeners.forEach((listener, id) => {
      if (listener.element === element) this.remove(id);
    });
  },

  cleanup() {
    this.activeListeners.forEach((listener, id) => {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    });
    this.activeListeners.clear();
    console.log('✅ Event listeners cleaned up');
  },

  getCount() { return this.activeListeners.size; }
};

window.addEventListener('beforeunload', () => EventListenerManager.cleanup());

// ====================  
// 配置常量定义  
// ====================

// ====================
// 模块初始化管理
// ====================

// 等待模块加载完成后再初始化
function waitForModules() {
  return new Promise((resolve) => {
    const checkModules = () => {
      // 只检查 moduleManager，不再依赖 HighlightManager
      if (window.moduleManager) {
        resolve();
      } else {
        setTimeout(checkModules, 100);
      }
    };
    checkModules();
  });
}

// 直接使用全局的moduleManager，避免重复声明
// 模块管理器由utils/module-manager.js提前加载

// 注册和初始化模块
async function initModules() {
  try {
    // 等待模块加载完成
    await waitForModules();
    
    // 直接使用全局的moduleManager
    const moduleManager = window.moduleManager;
    
    if (!moduleManager) {
      console.error('模块管理器未找到，初始化失败');
      return;
    }
    
    // 注册核心模块
    moduleManager.registerModule('eventManager', eventDelegateManager);
    moduleManager.registerModule('performanceMonitor', performanceMonitor);
    moduleManager.registerModule('serviceDegradationManager', serviceDegradationManager);
    moduleManager.registerModule('themeManager', window.themeManager);
    moduleManager.registerModule('cacheManager', window.AdvancedCache ? { AdvancedCache } : null);
    moduleManager.registerModule('neteaseTranslateService', window.neteaseTranslateService);
    
    // 初始化所有模块
    moduleManager.initAll().then(result => {
      console.log('模块初始化完成:', result);
    }).catch(error => {
      console.error('模块初始化失败:', error);
    });
  } catch (e) {
    console.error('模块管理初始化失败:', e);
  }
}

// 允许运行插件的域名列表
const ALLOWED_DOMAINS = [
  'wikipedia.org',
  'zhihu.com',
  'blog.csdn.net',
  'medium.com',
  'dev.to',
  'stackoverflow.com',
  'github.io',
  'github.com',
  'gitbook.io',
  'notion.site'
];

// 引入网易翻译服务模块
// 翻译API配置 - 使用网易API作为主要翻译服务
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';
// 音标API配置 - 使用免费的字典服务获取单词音标和词性（作为备用）
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// 预加载配置
const PRELOAD_CONFIG = {
  enabled: true,                 // 是否启用预加载
  maxWords: 20,                  // 预加载的最大单词数量
  priority: ['high', 'medium'],  // 预加载优先级
  delay: 1000                    // 延迟预加载的时间（毫秒），避免影响页面加载
};

// ====================
// 全局变量定义  
// ====================

// 存储用户选中的文本内容
let selectedText = '';
// 存储用户选中的文本范围对象，用于后续操作
let selectedRange = null;
// 翻译弹出窗口DOM元素
let translationPopup = null;
// 点击提示工具条DOM元素
let clickTooltip = null;
// 预加载状态
let isPreloading = false;

// ====================

// 翻译结果缓存 - 避免重复翻译相同文本，带有过期时间
const translationCache = new AdvancedCache('translationCache', 500, CACHE_CONFIG.DEFAULT_EXPIRY);
// 音标信息缓存 - 避免重复查询单词音标，带有过期时间
const phoneticCache = new AdvancedCache('phoneticCache', 200, CACHE_CONFIG.DEFAULT_EXPIRY);
// 例句翻译缓存 - 避免重复翻译相同例句，带有过期时间
const exampleTranslationCache = new AdvancedCache('exampleTranslationCache', 200, CACHE_CONFIG.DEFAULT_EXPIRY);
// 释义翻译缓存 - 避免重复翻译相同释义，带有过期时间
const definitionTranslationCache = new AdvancedCache('definitionTranslationCache', 200, CACHE_CONFIG.DEFAULT_EXPIRY);
// 短期缓存 - 用于临时数据，如上下文分析结果
const shortTermCache = new AdvancedCache('shortTermCache', 50, CACHE_CONFIG.SHORT_EXPIRY, false);

// Word_Index_Manager instance for optimized word lookups in content script
let contentWordIndexManager = null;

// Initialize Word_Index_Manager for content script
async function initContentWordIndex() {
  if (typeof WordIndexManager !== 'undefined' && !contentWordIndexManager) {
    try {
      contentWordIndexManager = new WordIndexManager({
        storageKey: 'content_word_index',
        persistDelay: 5000 // Longer delay for content script
      });
      
      // Load existing index from storage
      const loaded = await contentWordIndexManager.load();
      if (!loaded) {
        // Build index from current words
        const result = await chrome.storage.local.get(['translatedWords']);
        const words = result.translatedWords || {};
        const wordArray = Object.keys(words).map(key => ({
          key: key,
          word: key,
          ...words[key]
        }));
        await contentWordIndexManager.buildIndex(wordArray);
      }
      console.log('[Content Script] Word_Index_Manager initialized');
    } catch (error) {
      console.error('[Content Script] Failed to initialize Word_Index_Manager:', error);
    }
  }
}

// 加载状态管理
const loadingStates = new Map();

// ====================
// 请求管理器
// ====================

/**
 * 请求管理器
 * 用于管理翻译请求，合并相同的请求，并根据优先级处理请求
 */
class RequestManager {
  constructor() {
    this.pendingRequests = new Map(); // 存储待处理的请求
    this.requestQueue = []; // 请求队列
    this.maxConcurrentRequests = 3; // 最大并发请求数
    this.runningRequests = 0; // 当前运行的请求数
    this.requestTimeout = 20000; // 给后台 AI 翻译留出完整等待时间
    this.stats = {
      totalRequests: 0,
      mergedRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }
  
  /**
   * 添加翻译请求
   * @param {string} text - 待翻译文本
   * @param {string} context - 上下文
   * @param {boolean} skipAI - 是否跳过AI翻译
   * @param {number} priority - 请求优先级（0-100，默认50）
   * @returns {Promise<Object>} 翻译结果
   */
  addRequest(text, context = '', skipAI = false, priority = 50) {
    const cacheKey = `${text.toLowerCase().trim()}:${context.toLowerCase().trim()}:${skipAI}`;
    
    // 检查是否已经有相同的请求在处理中
    if (this.pendingRequests.has(cacheKey)) {
      this.stats.mergedRequests++;
      return this.pendingRequests.get(cacheKey);
    }
    
    let resolveRequest, rejectRequest;
    const promise = new Promise((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    // 排队后只发送一次请求，合并请求共享同一个 promise。
    const request = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      context,
      skipAI,
      priority,
      cacheKey,
      startTime: Date.now(),
      promise,
      resolve: resolveRequest,
      reject: rejectRequest
    };
    
    // 存储待处理的请求
    this.pendingRequests.set(cacheKey, request.promise);
    
    // 将请求添加到队列
    this.requestQueue.push(request);
    
    // 按照优先级排序请求队列
    this.requestQueue.sort((a, b) => b.priority - a.priority);
    
    // 处理请求队列
    this._processQueue();
    
    // 更新统计信息
    this.stats.totalRequests++;
    
    return request.promise;
  }
  
  /**
   * 执行翻译请求
   * @param {Object} requestData - 请求数据
   * @param {Function} resolve - 成功回调
   * @param {Function} reject - 失败回调
   * @param {string} cacheKey - 缓存键
   */
  async _executeRequest(requestData, resolve, reject, cacheKey) {
    const startTime = Date.now();
    let timeoutId;
    try {
      // 增加运行的请求数
      this.runningRequests++;
      
      // 执行翻译请求，添加超时处理
      const response = await Promise.race([
        chrome.runtime.sendMessage({
          type: 'SMART_TRANSLATE',
          text: requestData.text,
          context: requestData.context,
          skipAI: requestData.skipAI
        }),
        new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('请求超时，请重试')), this.requestTimeout); })
      ]);
      
      // 处理翻译结果
      if (response && response.ok && response.result && response.result.translation) {
        resolve(response.result);
      } else {
        throw new Error(response?.error || '翻译失败，请检查 AI 设置');
      }
      
      // 更新统计信息
      this.stats.completedRequests++;
    } catch (error) {
      console.error('翻译请求失败:', error);
      reject(error);
      
      // 更新统计信息
      this.stats.failedRequests++;
    } finally {
      clearTimeout(timeoutId);
      // 减少运行的请求数
      this.runningRequests--;
      
      // 移除待处理的请求
      this.pendingRequests.delete(cacheKey);
      
      // 从请求队列中移除已处理的请求
      this.requestQueue = this.requestQueue.filter(req => req.cacheKey !== cacheKey);
      
      // 处理下一个请求
      this._processQueue();
      
      // 更新统计信息
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.avgResponseTime = this.stats.completedRequests > 0 
        ? this.stats.totalResponseTime / this.stats.completedRequests 
        : 0;
    }
  }
  
  /**
   * 处理请求队列
   */
  _processQueue() {
    // 如果当前运行的请求数小于最大并发请求数，并且请求队列不为空，则处理请求
    while (this.runningRequests < this.maxConcurrentRequests && this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      this._executeRequest(
        { text: request.text, context: request.context, skipAI: request.skipAI },
        request.resolve,
        request.reject,
        request.cacheKey
      );
    }
  }
  
  /**
   * 获取请求统计信息
   * @returns {Object} 请求统计信息
   */
  getStats() {
    return {
      ...this.stats,
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.length,
      runningRequests: this.runningRequests,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }
  
  /**
   * 重置请求统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      mergedRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }
}

// 全局请求管理器实例
const requestManager = new RequestManager();

// ====================
// 事件委托管理器
// ====================

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */


/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */


// 全局事件委托管理器实例
const eventDelegateManager = new EventDelegateManager();

// ====================
// 性能监控
// ====================

// 全局性能监控实例（延迟初始化）
let performanceMonitor = null;

// 安全的性能监控包装器
const safePerformanceMonitor = {
  start: (label) => {
    return performanceMonitor ? safePerformanceMonitor.start(label) : null;
  },
  end: (perfId, label, data) => {
    if (performanceMonitor && perfId) {
      safePerformanceMonitor.end(perfId, label, data);
    }
  },
  reportPerformance: () => {
    if (performanceMonitor) {
      safePerformanceMonitor.reportPerformance();
    }
  }
};

// 延迟加载性能监控模块
async function initPerformanceMonitor() {
  try {
    if (window.dynamicLoader && !performanceMonitor) {
      await window.dynamicLoader.loadScript('extension/utils/performance-monitor.js', {
        priority: 'low',
        timeout: 5000
      });
      
      if (window.PerformanceMonitor) {
        performanceMonitor = new window.PerformanceMonitor();
        console.log('✅ Performance monitor initialized');
      }
    }
  } catch (error) {
    console.warn('⚠️ Performance monitor not available:', error);
  }
}

// 定期上报性能数据（每30秒）
setInterval(() => {
  safePerformanceMonitor.reportPerformance();
}, 30000);

// 延迟1秒后初始化性能监控（非关键模块）
setTimeout(() => {
  initPerformanceMonitor();
}, 1000);

// ====================
// 服务降级管理器
// ====================

// 全局服务降级管理器实例（延迟初始化）
let serviceDegradationManager = null;

// 安全的服务降级管理器包装器
const safeServiceDegradationManager = {
  checkAndDegrade: (metric, value) => {
    if (serviceDegradationManager) {
      return serviceDegradationManager.checkAndDegrade(metric, value);
    }
    return false;
  },
  getCurrentLevel: () => {
    return serviceDegradationManager ? serviceDegradationManager.getCurrentLevel() : 0;
  },
  getConfig: () => {
    return serviceDegradationManager ? serviceDegradationManager.getConfig() : {};
  }
};

// 延迟加载服务降级管理器
async function initServiceDegradationManager() {
  try {
    if (window.dynamicLoader && !serviceDegradationManager) {
      await window.dynamicLoader.loadScript('extension/utils/service-degradation-manager.js', {
        priority: 'normal',
        timeout: 5000
      });
      
      if (window.ServiceDegradationManager) {
        serviceDegradationManager = new window.ServiceDegradationManager();
        console.log('✅ Service degradation manager initialized');
      }
    }
  } catch (error) {
    console.warn('⚠️ Service degradation manager not available:', error);
  }
}

// 延迟500ms后初始化服务降级管理器（重要但非关键模块）
setTimeout(() => {
  initServiceDegradationManager();
}, 500);

// ====================
// 防抖定时器
// ====================

// 高亮显示的防抖定时器 - 防止频繁触发高亮更新
let highlightDebounceTimer = null;
// 文本选择的防抖定时器 - 防止频繁触发翻译请求
let selectionDebounceTimer = null;

/**
 * 检查扩展上下文是否有效
 * 防止在扩展被卸载或更新后，残留的内容脚本继续执行导致错误
 * @returns {boolean} 是否有效
 */
function isExtensionContextValid() {
  try {
    return !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

/**
 * 检查当前域名是否允许运行插件
 * @returns {boolean} 是否允许运行插件
 */
function isDomainAllowed() {
  if (!isExtensionContextValid()) return false;

  try {
    // 允许所有域名运行插件
    return true;
  } catch (error) {
    console.error('单词翻译助手: 域名检查错误:', error);
    return false;
  }
}

// ====================
// AI 辅助分析功能
// ====================

let aiDebounceTimer = null;

/**
 * 触发AI辅助分析（带防抖）
 * @param {string} text - 待分析文本
 * @param {string} context - 上下文
 * @param {Object} rect - 弹窗位置矩形
 */
async function triggerAiAnalysis(text, context, rect) {
  if (aiDebounceTimer) {
    clearTimeout(aiDebounceTimer);
  }
  
  // 500ms 防抖
  aiDebounceTimer = setTimeout(async () => {
    if (!isExtensionContextValid()) return;
    
    const start = Date.now();
    try {
      console.debug('触发AI分析:', text);
      // 700ms 响应窗口，超过则忽略结果，确保总延迟不超 1.2s
      const response = await Promise.race([
        chrome.runtime.sendMessage({
          type: 'AI_ANALYZE',
          text: text,
          context: context
        }),
        new Promise(resolve => setTimeout(() => resolve(null), 700))
      ]);
      
      // 如果响应超过 700ms 或无数据，则跳过更新
      if (response && response.success && response.data && (Date.now() - start) <= 700) {
        console.debug('AI分析完成:', response.data);
        updatePopupWithAiResult(text, response.data, rect);
      }
    } catch (error) {
      console.warn('AI analysis failed:', error);
    }
  }, 500);
}

/**
 * 使用AI分析结果更新弹窗
 * @param {string} text - 原始文本
 * @param {Object} aiData - AI分析数据
 * @param {Object} rect - 位置矩形
 */
async function updatePopupWithAiResult(text, aiData, rect) {
  if (clickTooltip?._vocabularyExpanded) return;
  // 检查弹窗是否存在且显示的是同一个词
  if (!clickTooltip || !clickTooltip.querySelector('.tooltip-word') || 
      clickTooltip.querySelector('.tooltip-word').textContent !== text) {
    return;
  }
  
  // 获取当前状态
  const currentTranslation = clickTooltip.querySelector('.tooltip-translation')?.textContent || 
                             clickTooltip.querySelector('.tooltip-primary-sense-cn')?.textContent || '';
  
  // 解析当前次数
  let count = 1;
  const countText = clickTooltip.querySelector('.tooltip-count')?.textContent;
  if (countText) {
    const match = countText.match(/\d+/);
    if (match) {
      count = parseInt(match[0]);
    }
  }
  
  const isStarred = clickTooltip.querySelector('.star-btn')?.classList.contains('starred') || false;
  const showRemoveBtn = !!clickTooltip.querySelector('.tooltip-remove-btn');
  
  // 构造结构化释义数据
  const structuredMeanings = [];
  if (aiData.meanings && aiData.meanings.length > 0) {
    structuredMeanings.push({
      partOfSpeech: aiData.partOfSpeech || 'unknown',
      definitions: aiData.meanings.map(m => ({ definition: m }))
    });
  }
  
  // 重新渲染弹窗
  await renderPopup({
    text: text,
    // 如果AI提供了最佳释义，优先使用最佳释义作为主翻译，或者是补充？
    // 用户要求："当主要翻译API返回多义结果时，用AI模型辅助选择最符合语境的释义"
    // 这里我们可以将 bestMeaning 放在显著位置，或者替换 translation
    translation: aiData.bestMeaning || currentTranslation, 
    rect: rect,
    count: count,
    phonetic: aiData.phonetic || clickTooltip.querySelector('.tooltip-phonetic')?.textContent || '',
    partOfSpeech: aiData.partOfSpeech,
    meanings: structuredMeanings,
    wordType: 'word',
    isStarred: isStarred,
    showRemoveBtn: showRemoveBtn
  });
}

/**
 * 初始化高亮功能
 * 页面加载时自动加载已翻译的单词并进行高亮显示
 * 优化：添加事件委托，优化DOM查询和正则表达式
 */
async function initHighlighting() {
  // 检查当前域名是否允许运行插件
  if (!isDomainAllowed()) {
    console.log('单词翻译助手: 当前域名不允许运行插件');
    return;
  }
  
  // 从Chrome本地存储中获取已翻译的单词数据和用户设置
  const result = await chrome.storage.local.get(['translatedWords', 'userSettings']);
  const words = result.translatedWords || {};
  const settings = result.userSettings || {};

  // 应用自定义颜色设置
  applyCustomColors(settings);

  // 对已翻译的单词进行高亮显示
  // 优化：传入 [document.body] 作为 targetRoots，避免首次加载时的全量 DOM 清理扫描
  if (document.body) {
    highlightTranslatedWords(words, [document.body]);
  }

  // 启动预加载常用单词
  if (PRELOAD_CONFIG.enabled) {
    setTimeout(() => {
      preloadCommonWords(words, settings);
    }, PRELOAD_CONFIG.delay);
  }
}



/**
 * 预加载常用单词数据
 * @param {Object} words - 单词数据对象
 * @param {Object} settings - 用户设置
 */
async function preloadCommonWords(words, settings) {
  if (isPreloading) return;
  isPreloading = true;
  
  try {
    console.log('单词翻译助手: 开始预加载常用单词数据');
    
    // 获取常用单词列表
    const commonWords = getCommonWordsForPreload(words, settings);
    if (commonWords.length === 0) {
      isPreloading = false;
      return;
    }
    
    // 批量预加载单词数据
    await preloadWordDataBatch(commonWords);
    
    console.log('单词翻译助手: 常用单词数据预加载完成');
  } catch (error) {
    console.error('单词翻译助手: 预加载常用单词失败:', error);
  } finally {
    isPreloading = false;
  }
}

/**
 * 获取用于预加载的常用单词列表
 * @param {Object} words - 单词数据对象
 * @param {Object} settings - 用户设置
 * @returns {Array<string>} 常用单词列表
 */
function getCommonWordsForPreload(words, settings) {
  // 按使用频率排序单词
  const sortedWords = Object.entries(words)
    .filter(([_, word]) => word.count > 0) // 只考虑有使用记录的单词
    .sort((a, b) => b[1].count - a[1].count) // 按使用频率降序
    .slice(0, PRELOAD_CONFIG.maxWords) // 取前N个
    .map(([wordKey, _]) => wordKey); // 提取单词键
  
  return sortedWords;
}

/**
 * 批量预加载单词数据
 * @param {Array<string>} wordKeys - 要预加载的单词键列表
 */
async function preloadWordDataBatch(wordKeys) {
  if (wordKeys.length === 0) return;
  
  // 并行预加载每个单词的数据
  const promises = wordKeys.map(wordKey => {
    // 只预加载音标和词性，不预加载完整释义，减少API调用
    return getPhoneticAndPartOfSpeech(wordKey);
  });
  
  // 等待所有预加载完成
  await Promise.all(promises);
}

/**
 * 高亮显示已翻译的单词 - 优化版本
 * 使用虚拟化高亮管理器进行性能优化
 *
 * @param {Object} words - 已翻译的单词对象，键为单词，值为翻译数据
 * @param {Array<Node>} targetRoots - 可选，指定需要处理的根节点列表
 */
async function highlightTranslatedWords(words, targetRoots = null) {
  const perfId = safePerformanceMonitor.start('highlightTranslatedWords');
  
  try {
    // 使用优化后的高亮管理器
    if (window.highlightManager) {
      await window.highlightManager.highlightTranslatedWords(words, targetRoots);
    } else {
      // 降级到原有实现
      await highlightTranslatedWordsFallback(words, targetRoots);
    }
    
    safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { 
      wordsCount: Object.keys(words).length,
      optimized: true
    });
  } catch (error) {
    console.error('高亮处理失败:', error);
    safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { 
      wordsCount: 0, 
      error: error.message 
    });
  }
}

/**
 * 降级的高亮实现（原有逻辑）
 */
async function highlightTranslatedWordsFallback(words, targetRoots = null) {
  const perfId = safePerformanceMonitor.start('highlightTranslatedWords');
  
  try {
    // 检查当前域名是否允许运行插件
    if (!isDomainAllowed()) {
      safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { wordsCount: 0, skipped: true });
      return;
    }
    
    // 暂时断开 Observer 连接，防止修改 DOM 触发递归
    if (domObserver) {
      domObserver.disconnect();
    }
    
    // 优化DOM查询：缓存document.body，避免重复查询
    const body = document.body;
    if (!body) {
      safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { wordsCount: 0, skipped: true });
      return;
    }

    // 如果是全量更新（没有指定 targetRoots），则移除之前的所有高亮元素
    if (!targetRoots) {
      const existingHighlights = document.querySelectorAll('.translated-word-highlight, trae-highlight');
      // 优化：使用documentFragment批量移除，减少重排重绘
      const fragment = document.createDocumentFragment();
      existingHighlights.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          // 将高亮元素替换为纯文本节点
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize(); // 合并相邻的文本节点
        }
      });
    }

    // 只处理单词和词组类型的翻译记录，并按使用频率排序
    let wordEntries = Object.entries(words).filter(([word, wordData]) => {
      return wordData && (wordData.type === 'word' || wordData.type === 'phrase');
    });

    // 按使用频率排序，优先高亮使用频率高的单词
    wordEntries.sort((a, b) => (b[1].count || 0) - (a[1].count || 0));

    // 限制高亮的单词数量，避免过多DOM操作
    // 使用服务降级管理器设置的值
    const MAX_HIGHLIGHTS = window.MAX_HIGHLIGHTS || 1000;
    wordEntries = wordEntries.slice(0, MAX_HIGHLIGHTS);

    // 如果没有单词需要高亮，直接返回
    if (wordEntries.length === 0) {
      safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { wordsCount: 0 });
      return;
    }

    // 确定内容区域：如果指定了 targetRoots，则只处理这些节点；否则处理整个 body
    let contentAreas = targetRoots || [body];
    
    // 过滤掉无效的节点（如已被移除的节点）
    contentAreas = contentAreas.filter(node => node && node.isConnected);
    
    if (contentAreas.length === 0) {
      return;
    }

    // 创建单词映射，用于快速查找
    const wordMap = new Map();
    
    // Try using Word_Index_Manager for optimized word lookup if available
    let useOptimizedIndex = false;
    if (contentWordIndexManager) {
      try {
        const stats = contentWordIndexManager.getStats();
        useOptimizedIndex = stats.wordCount > 0;
      } catch (error) {
        console.error('[Content Script] Word_Index_Manager stats failed:', error);
      }
    }
    
    // 优化正则表达式：预编译并缓存正则表达式
    // 优化：提前检查单词长度，避免空单词影响正则表达式
    const validWordEntries = wordEntries.filter(([word]) => word && word.trim().length > 0);
    
    // 如果没有有效单词，直接返回
    if (validWordEntries.length === 0) {
      return;
    }
    
    // 优化：创建原始单词到数据的映射，避免Object.keys().find()的性能开销
    const originalWordMap = new Map();
    validWordEntries.forEach(([word, wordData]) => {
      originalWordMap.set(word.toLowerCase(), word);
      
      // Build word map for quick lookup
      const wordLower = word.toLowerCase();
      wordMap.set(wordLower, { 
        wordData, 
        posClass: wordData.type === 'phrase' ? 'pos-phrase' : getPartOfSpeechClass(wordData.partOfSpeech || '') 
      });
    });
    
    // 创建单词边界正则表达式，用于一次性匹配所有单词
    const patterns = [];
    const chunkSize = 200;
    for (let i = 0; i < validWordEntries.length; i += chunkSize) {
      const chunk = validWordEntries.slice(i, i + chunkSize).map(([word, wordData]) => {
        const wordLower = word.toLowerCase();
        wordMap.set(wordLower, { wordData, posClass: wordData.type === 'phrase' ? 'pos-phrase' : getPartOfSpeechClass(wordData.partOfSpeech || '') });
        return `\\b${escapeRegExp(wordLower)}\\b`;
      });
      if (chunk.length > 0) {
        patterns.push(chunk.join('|'));
      }
    }
    
    // 如果没有有效的正则表达式模式，直接返回
    if (patterns.length === 0) {
      return;
    }
    
    // 优化正则表达式：创建全局正则表达式数组
    const regexArray = patterns.map(p => new RegExp(p, 'gi'));

    // 只在主要内容区域进行遍历，并且只遍历一次DOM
    contentAreas.forEach(contentArea => {
      // 遍历页面中的所有文本节点，只遍历一次
      walkTextNodes(contentArea, (node) => {
        // 处理文本节点中的单词匹配
        if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.length > 0) {
          const text = node.textContent;
          
          // 快速检查文本是否包含任何可能匹配的单词
          // 优化：使用Set快速检查
          let hasPossibleMatch = false;
          for (const [wordLower] of wordMap.entries()) {
            if (text.toLowerCase().includes(wordLower)) {
              hasPossibleMatch = true;
              break;
            }
          }
          
          if (!hasPossibleMatch) {
            return; // 快速返回，没有匹配的可能
          }
          
          let hasMatches = false;
          const matches = [];
          
          // 优化匹配逻辑，减少重复匹配
          for (const r of regexArray) {
            r.lastIndex = 0;
            let m;
            while ((m = r.exec(text)) !== null) {
              hasMatches = true;
              matches.push({ index: m.index, 0: m[0], wordLower: m[0].toLowerCase() });
              if (r.lastIndex === m.index) r.lastIndex++; // 避免无限循环
            }
          }
          
          if (!hasMatches) {
            return; // 没有匹配，快速返回
          }
          
          // 按索引排序
          matches.sort((a, b) => a.index - b.index);
          
          // 去重：保留最长匹配的单词，避免重复匹配和重叠
          // 优化：使用贪心算法，优先匹配最长的单词
          const uniqueMatches = [];
          const usedPositions = new Set();
          
          // 先按长度排序，优先处理长单词
          matches.sort((a, b) => b[0].length - a[0].length);
          
          for (const match of matches) {
            let isOverlap = false;
            
            // 检查当前匹配是否与已使用的位置重叠
            for (let i = match.index; i < match.index + match[0].length; i++) {
              if (usedPositions.has(i)) {
                isOverlap = true;
                break;
              }
            }
            
            if (!isOverlap) {
              uniqueMatches.push(match);
              // 标记当前匹配使用的位置
              for (let i = match.index; i < match.index + match[0].length; i++) {
                usedPositions.add(i);
              }
            }
          }
          
          // 按索引重新排序，确保正确的插入顺序
          uniqueMatches.sort((a, b) => a.index - b.index);
          
          // 如果有匹配的单词，才进行DOM操作
          if (uniqueMatches.length > 0) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            
            uniqueMatches.forEach(match => {
              const matchedWordLower = match.wordLower;
              const wordInfo = wordMap.get(matchedWordLower);
              if (wordInfo && match.index >= lastIndex) { // 确保当前匹配在合理位置
                const { wordData, posClass } = wordInfo;
                const originalWord = originalWordMap.get(matchedWordLower);
                if (originalWord && words[originalWord]) {
                  if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                  }
                  const highlight = document.createElement('trae-highlight');
                  highlight.className = `translated-word-highlight ${posClass}`;
                  highlight.textContent = match[0];
                  highlight.dataset.word = matchedWordLower;
                  // 修复：处理可能存储为对象的翻译数据
                  const translationData = words[originalWord].translation;
                  highlight.dataset.translation = typeof translationData === 'object' ? (translationData.translation || '') : translationData;
                  highlight.dataset.count = words[originalWord].count || 1;
                  if (wordData.partOfSpeech) {
                    highlight.dataset.partOfSpeech = wordData.partOfSpeech;
                  }
                  fragment.appendChild(highlight);
                  lastIndex = match.index + match[0].length;
                }
              }
            });

            // 添加剩余的文本内容
            if (lastIndex < text.length) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            // 用处理后的片段替换原始文本节点
            if (fragment.hasChildNodes() && node.parentNode) {
              node.parentNode.replaceChild(fragment, node);
            }
          }
        }
      });
    });
  
  // 结束性能监控
  safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { wordsCount: wordEntries.length });
  
  // 恢复观察，使用与初始化时相同的配置
  if (domObserver) {
    const observerConfig = {
      childList: true,  // 只监听子节点变化
      subtree: true,     // 监听整个DOM树
      // 移除characterData和attributes监听，减少不必要的触发
    };
    
    if (document.body) {
      domObserver.observe(document.body, observerConfig);
    }
  }
  
  } catch (error) {
    console.error('降级高亮处理失败:', error);
    safePerformanceMonitor.end(perfId, 'highlightTranslatedWords', { 
      wordsCount: 0, 
      error: error.message 
    });
  }
}

/**
 * 转义正则表达式特殊字符
 * 防止用户输入的文本影响正则表达式的正常工作
 *
 * @param {string} string - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 判断文本是否为单词或词组
 * 只包含字母、空格、连字符、撇号的文本被认为是单词或词组
 *
 * @param {string} text - 要判断的文本
 * @returns {boolean} 是否为单词或词组
 */
function isWordOrPhrase(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // 只包含字母、空格、连字符、撇号的文本被认为是单词或词组
  // 且不能是纯空格
  const wordPattern = /^[a-zA-Z\s\-']+$/;
  return wordPattern.test(trimmed) && trimmed.replace(/\s/g, '').length > 0;
}

/**
 * 处理高亮单词点击事件
 */
async function handleHighlightClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // 防抖处理：300ms
  if (highlightClickDebounceTimer) {
    clearTimeout(highlightClickDebounceTimer);
  }
  
  const target = e.target;
  
  highlightClickDebounceTimer = setTimeout(async () => {
    if (!isExtensionContextValid()) return;

    const word = target.dataset.word;
    // 修复：处理可能存储为对象的翻译数据
    const translationData = target.dataset.translation;
    let translation = translationData;
    
    // 尝试解析JSON字符串（如果是对象被转成了字符串）
    if (translation === '[object Object]') {
      // 尝试从存储中重新获取
      const result = await chrome.storage.local.get(['translatedWords']);
      const words = result.translatedWords || {};
      const storedData = words[word.toLowerCase()];
      if (storedData) {
        translation = typeof storedData.translation === 'object' ? storedData.translation.translation : storedData.translation;
      }
    }
    
    const count = parseInt(target.dataset.count || '1');
    const partOfSpeech = target.dataset.partOfSpeech;
    
    showClickTooltip(target, word, translation, count, null, partOfSpeech, 'word', 'simple');
  }, 300);
}

// 事件委托处理高亮单词的点击事件
// 使用事件委托管理器
const highlightClickListenerId = eventDelegateManager.addEventListener('click', handleHighlightClick, {}, 'trae-highlight, .translated-word-highlight');

/**
 * 递归遍历DOM树中的所有文本节点
 * 对每个文本节点执行回调函数
 * 优化：添加深度限制，避免过深的DOM遍历
 * 优化：使用对象查找代替数组includes，提高性能
 * 优化：增加更多节点过滤条件，减少不必要的遍历
 * 优化：使用更高效的节点类型检查
 *
 * @param {Node} node - 要遍历的DOM节点
 * @param {Function} callback - 对每个文本节点执行的回调函数
 * @param {number} maxLength - 最大遍历深度，默认20
 * @param {number} currentDepth - 当前遍历深度，默认0
 */
function walkTextNodes(node, callback, maxDepth = 50, currentDepth = 0) {
  // 深度限制，避免过深的DOM遍历
  if (currentDepth > maxDepth) {
    return;
  }
  
  if (node.nodeType === Node.TEXT_NODE) {
    // 如果是文本节点，直接执行回调
    callback(node);
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // 跳过不需要处理的节点类型，优化性能
    // 优化：使用对象查找代替数组includes，提高性能
    const skipTags = {
      'SCRIPT': true,
      'STYLE': true,
      'IFRAME': true,
      'SVG': true,
      'CANVAS': true,
      'VIDEO': true,
      'AUDIO': true,
      'TEXTAREA': true,
      'INPUT': true,
      'SELECT': true,
      'OPTION': true,
      'HEAD': true,
      'TITLE': true,
      'META': true,
      'LINK': true,
      'TRAE-HIGHLIGHT': true,
      'NOSCRIPT': true,
      'OBJECT': true,
      'EMBED': true,
      'APPLET': true,
      'FRAME': true,
      'FRAMESET': true,
      'BASE': true,
      'FORM': true
    };
    
    if (skipTags[node.tagName]) {
      return;
    }
    
    // 跳过已高亮的节点
    if (node.classList && (node.classList.contains('translated-word-highlight') || node.classList.contains('trae-highlight'))) {
      return;
    }
    
    // 跳过被隐藏的元素 (使用更高效的检查方式，避免 getComputedStyle 触发强制重排)
    // 仅检查内联样式和 hidden 属性，虽然不完全准确但性能更好
    if (node.style && node.style.display === 'none') {
      return;
    }
    if (node.hidden) {
      return;
    }
    
    // 跳过SVG和MathML元素
    if (node.namespaceURI === 'http://www.w3.org/2000/svg' || 
        node.namespaceURI === 'http://www.w3.org/1998/Math/MathML') {
      return;
    }
    

    
    // 使用 Array.from 创建快照，避免因 DOM 修改导致的 live collection 问题（如无限递归或跳过节点）
    const childNodes = Array.from(node.childNodes);
    for (let i = 0; i < childNodes.length; i++) {
      walkTextNodes(childNodes[i], callback, maxDepth, currentDepth + 1);
    }
  }
}

/**
 * 使用百度翻译API翻译文本（备用翻译服务）
 * @param {string} text - 要翻译的文本
 * @returns {Promise<string>} 翻译结果文本
 */
async function translateWithBaidu(text) {
  try {
    // 使用免费的百度翻译API（注意：免费API可能有使用限制）
    const url = `https://fanyi.baidu.com/sug?q=${encodeURIComponent(text)}&from=zh&to=en`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    
    if (data && data.data && data.data.length > 0) {
      return data.data[0].v || '';
    }
    return '';
  } catch (error) {
    console.error('百度翻译失败:', error);
    return '';
  }
}

/**
 * 获取节点周围的上下文文本
 * @param {Node} node - DOM节点
 * @param {number} maxLength - 最大上下文长度
 * @returns {string} 上下文文本
 */
function getContextFromNode(node, maxLength = 300) {
  if (!node) return '';
  
  // 尝试获取父级块元素的文本
  let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  let context = '';
  let depth = 0;
  
  while (current && current !== document.body && depth < 3) {
    const text = current.innerText || current.textContent || '';
    if (text.length > 50) {
      context = text;
      // 如果上下文足够长，就停止向上遍历
      if (context.length >= maxLength / 2) break;
    }
    current = current.parentElement;
    depth++;
  }
  
  // 如果还是没有找到上下文，尝试获取前后的兄弟节点
  if (!context && node.parentElement) {
    context = node.parentElement.innerText || node.parentElement.textContent || '';
  }
  
  // 截取适当长度
  if (context.length > maxLength) {
    // 尝试保留目标节点周围的文本（这里简化为截取中间部分，实际场景中难以精确定位目标节点在文本中的位置）
    return context.substring(0, maxLength) + '...';
  }
  
  return context;
}

/**
 * 获取选择范围的上下文文本
 * @param {Range} range - Selection Range
 * @returns {string} 上下文文本
 */
function getContextFromRange(range) {
  if (!range) return '';
  
  let container = range.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }
  
  return getContextFromNode(container);
}

/**
 * 翻译文本内容
 * 带缓存功能，优先使用网易翻译API，失败时回退到AI智能翻译/MyMemory/百度
 * 优化了API调用策略，增加了超时处理和缓存过期机制
 * 确保返回完整的详细翻译信息，包括词性、音标、释义和例句
 *
 * @param {string} text - 要翻译的文本
 * @param {string} context - 上下文文本（可选）
 * @param {boolean} skipAI - 是否跳过AI翻译（仅使用普通翻译API，用于快速响应）
 * @returns {Promise<Object>} 完整的翻译结果对象，包含translation、partOfSpeech、phonetic、definitions、examples等
 */
async function translateText(text, context = '', skipAI = false) {
  const perfId = safePerformanceMonitor.start('translateText');
  const cacheKey = 'auto:zh-en:ipa:v3:' + text.trim() + ':' + context.trim();
  const cached = translationCache.get(cacheKey);
  if (cached && cached.translation && Date.now() - cached.timestamp < CACHE_CONFIG.DEFAULT_EXPIRY) {
    safePerformanceMonitor.end(perfId, 'translateText', { fromCache: true });
    return cached;
  }
  try {
    const response = await requestManager.addRequest(text, context, skipAI, 40);
    const translation = response?.translation?.trim();
    if (!translation || (/\p{L}/u.test(text) && translation.toLowerCase() === text.trim().toLowerCase())) {
      throw new Error('翻译服务未返回有效译文，请重试');
    }
    const result = {
      ...response,
      translation,
      partOfSpeech: response.partOfSpeech || '',
      phonetic: response.phonetic || '',
      definitions: response.definitions || [],
      examples: response.examples || []
    };
    translationCache.set(cacheKey, { ...result, timestamp: Date.now() });
    safePerformanceMonitor.end(perfId, 'translateText', { fromCache: false, success: true });
    return result;
  } catch (error) {
    safePerformanceMonitor.end(perfId, 'translateText', { fromCache: false, success: false });
    throw error;
  }
}

/**
 * 批量翻译文本
 * 优化：改进批次处理逻辑，增加主翻译缓存检查，减少等待时间
 * @param {Array<string>} texts - 待翻译的文本数组
 * @returns {Promise<Array<string>>} 翻译结果数组
 */
async function translateBatch(texts) {
  // 检查输入参数
  if (!Array.isArray(texts)) {
    console.error('translateBatch: texts参数必须是数组');
    return [];
  }

  // 过滤空文本，但保留原始数组长度
  const filteredTexts = texts.map(text => text?.trim() || '');
  
  // 过滤空文本和重复文本，用于实际翻译
  const uniqueTexts = [...new Set(filteredTexts.filter(text => text))];
  if (uniqueTexts.length === 0) {
    // 返回与输入数组长度相同的空字符串数组
    return filteredTexts.map(() => '');
  }

  // 检查缓存，收集需要翻译的文本
  const cacheResults = {};
  const textsToTranslate = [];
  
  uniqueTexts.forEach(text => {
    const cacheKey = text.toLowerCase().trim();
    
    // 检查所有可用的缓存，包括主翻译缓存
    const cachedTranslation = translationCache.get(cacheKey);
    const cachedDefinition = definitionTranslationCache.get(cacheKey);
    const cachedExample = exampleTranslationCache.get(cacheKey);
    
    // 优先使用主翻译缓存，然后是其他缓存
    const cached = cachedTranslation || cachedDefinition || cachedExample;
    
    if (cached && (Date.now() - cached.timestamp < CACHE_CONFIG.DEFAULT_EXPIRY)) {
      cacheResults[text] = cached.translation;
    } else {
      textsToTranslate.push(text);
    }
  });

  // 如果所有文本都在缓存中，直接返回结果
  if (textsToTranslate.length === 0) {
    // 返回与输入数组顺序一致的结果
    return filteredTexts.map(text => {
      const result = cacheResults[text] || '';
      console.debug(`translateBatch: 从缓存返回结果: ${text} -> ${result}`);
      return result;
    });
  }

  // 超时处理函数
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('批量翻译超时')), 2000); // 2秒超时
  });

  try {
    // 并行处理所有需要翻译的文本
    const textPromises = textsToTranslate.map(async (text) => {
      try {
        const response = await Promise.race([
          fetch(`${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=en|zh-CN`),
          timeoutPromise
        ]);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        let translation = '';
        if (data.responseData && data.responseData.translatedText) {
          translation = data.responseData.translatedText;
          
          // 检测MyMemory翻译服务使用限制
          if (translation.includes('MYMEMORY WARNING') || translation.includes('YOU USED ALL AVAILABLE FREE TRANSLATIONS')) {
            // 如果是使用限制警告，尝试使用备用翻译
            console.warn('MyMemory翻译服务已达到每日使用限制，尝试使用备用翻译');
            try {
              translation = await translateText(text);
            } catch (err) {
              console.error(`备用翻译也失败: ${text}`, err);
              translation = '';
            }
          }
        } else if (data.matches && data.matches.length > 0) {
          translation = data.matches[0].translation;
        }
        
        console.debug(`translateBatch: 成功翻译: ${text} -> ${translation}`);
        return { text, translation };
      } catch (error) {
        console.error(`translateBatch: 翻译单个文本失败: ${text}`, error);
        return { text, translation: '' };
      }
    });
    
    // 等待所有翻译完成
    const translationResults = await Promise.all(textPromises);
    
    // 构建翻译结果映射
    const translatedResults = {};
    
    // 处理翻译结果
    translationResults.forEach(result => {
      translatedResults[result.text] = result.translation;
      
      // 缓存翻译结果到所有相关缓存中
      const cacheKey = result.text.toLowerCase().trim();
      if (result.translation) {
        // 更新所有相关缓存，确保一致性
        translationCache.set(cacheKey, {
          translation: result.translation,
          timestamp: Date.now()
        });
        definitionTranslationCache.set(cacheKey, {
          translation: result.translation,
          timestamp: Date.now()
        });
        exampleTranslationCache.set(cacheKey, {
          translation: result.translation,
          timestamp: Date.now()
        });
      }
    });
    
    // 合并缓存结果和新翻译结果
    const allResults = {
      ...cacheResults,
      ...translatedResults
    };
    
    // 返回与输入数组顺序一致的结果数组
    const finalResults = filteredTexts.map(text => {
      const result = allResults[text] || '';
      console.debug(`translateBatch: 最终返回结果: ${text} -> ${result}`);
      return result;
    });
    
    console.debug(`translateBatch: 完成翻译批次，输入长度: ${texts.length}，输出长度: ${finalResults.length}`);
    return finalResults;
  } catch (error) {
    console.error('translateBatch: 批量翻译失败:', error);
    // 翻译失败时，返回已有的缓存结果，其余为空字符串
    return filteredTexts.map(text => cacheResults[text] || '');
  }
}

/**
 * 翻译英文例句
 * @param {string} example - 英文例句
 * @returns {Promise<string>} 中文翻译结果
 */
async function translateExample(example) {
  const cacheKey = example.toLowerCase().trim();

  // 检查例句翻译缓存，带过期时间
  const cached = exampleTranslationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_CONFIG.DEFAULT_EXPIRY)) {
    return cached.translation;
  }

  // 使用批量翻译API
  const results = await translateBatch([example]);
  const translation = results[0] || '';
  
  // 缓存翻译结果
  if (translation) {
    exampleTranslationCache.set(cacheKey, {
      translation: translation,
      timestamp: Date.now()
    });
  }

  return translation;
}

/**
 * 翻译英文释义
 * @param {string} definition - 英文释义
 * @returns {Promise<string>} 中文翻译结果
 */
async function translateDefinition(definition) {
  const cacheKey = definition.toLowerCase().trim();

  // 检查释义翻译缓存，带过期时间
  const cached = definitionTranslationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_CONFIG.DEFAULT_EXPIRY)) {
    return cached.translation;
  }

  // 使用批量翻译API
  const results = await translateBatch([definition]);
  const translation = results[0] || '';
  
  // 缓存翻译结果
  if (translation) {
    definitionTranslationCache.set(cacheKey, {
      translation: translation,
      timestamp: Date.now()
    });
  }

  return translation;
}

/**
 * 获取单词的音标和词性信息
 * 使用Dictionary API获取单词的发音和词性分类
 * 优化了API调用策略，增加了超时处理和缓存过期机制
 *
 * @param {string} word - 要查询的单词
 * @returns {Promise<Object>} 包含音标和词性的对象
 */
async function getPhoneticAndPartOfSpeech(word) {
  const cacheKey = word.toLowerCase().trim();

  // 检查音标缓存，带过期时间
  const cached = phoneticCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_CONFIG.DEFAULT_EXPIRY)) {
    return cached.data;
  }

  let result = { phonetic: null, partOfSpeech: null, meanings: [] };

  // 限制单词长度：Dictionary API 通常不支持超过3个单词的短语
  // 避免对长句子发起无效请求
  if (word.split(/\s+/).length > 3) {
    // 直接返回空结果并缓存，避免后续重复尝试
    phoneticCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    return result;
  }

  // 超时处理函数
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('音标查询超时')), 1500); // 1.5秒超时
  });

  try {
    // 调用Dictionary API获取单词详细信息，带超时处理
    const response = await Promise.race([
      fetch(`${DICTIONARY_API}${encodeURIComponent(word)}`),
      timeoutPromise
    ]);
    
    // 检查响应状态，如果是404则静默处理
    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(`Dictionary API returned status: ${response.status}`);
      }
      return result; // 返回空结果
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];

      // 提取音标信息（优先使用phonetic字段，否则从phonetics数组中查找）
      result.phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text;

      // 提取完整的释义数据
      if (entry.meanings && entry.meanings.length > 0) {
        // 使用第一个词性作为主要词性
        result.partOfSpeech = entry.meanings[0].partOfSpeech || null;
        // 存储完整的meanings数组
        result.meanings = entry.meanings;
      }
    }
  } catch (error) {
    // 仅记录非网络/超时错误
    if (error.message !== '音标查询超时' && error.name !== 'TypeError') {
      console.warn('获取音标和词性失败:', error);
    }
    // 使用默认结果
    result = { phonetic: null, partOfSpeech: null, meanings: [] };
  } finally {
    // 缓存结果（包括null值），带有时间戳
    phoneticCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }

  return result;
}

/**
 * 格式化翻译结果，支持结构化显示
 * @param {string} rawTranslation - 原始翻译文本
 * @param {Array} meanings - 完整的释义数据数组
 * @returns {string} 结构化的HTML格式翻译（包含待翻译标记）
 */
function formatTranslation(rawTranslation, meanings) {
  // 如果没有完整的释义数据，直接返回原始翻译
  if (!meanings || meanings.length === 0) {
    return `<div class="tooltip-translation">${rawTranslation}</div>`;
  }

  // 构建结构化的释义HTML（包含待翻译标记）
  let html = `<div class="tooltip-meanings">`;
  
  // 添加主要释义（精简的中文翻译集合，按词性分组）
  html += `<div class="tooltip-primary-definition">
`;
  html += `<div class="tooltip-primary-definition-content">
`;
  
  // 为每个词性组创建一个主要释义条目
  meanings.forEach((posGroup, posIndex) => {
    const partOfSpeech = posGroup.partOfSpeech;
    const definitions = posGroup.definitions || [];
    
    // 跳过没有释义的词性
    if (definitions.length === 0) {
      return;
    }
    
    // 获取第一个释义作为主要释义
    const primaryDef = definitions[0].definition || '';
    
    // 添加词性标签和中文释义条目
    html += `<div class="tooltip-primary-sense" data-definition="${encodeURIComponent(primaryDef)}">
`;
    html += `<span class="tooltip-primary-sense-pos">${getPartOfSpeechLabel(partOfSpeech)}</span>
`;
    html += `<span class="tooltip-primary-sense-cn">${rawTranslation}</span>
`;
    html += `</div>
`;
  });
  
  html += `</div>
`;
  html += `</div>
`;

  // 遍历每个词性
  for (const posGroup of meanings) {
    const partOfSpeech = posGroup.partOfSpeech;
    const definitions = posGroup.definitions || [];

    // 跳过没有释义的词性
    if (definitions.length === 0) {
      continue;
    }

    // 添加词性标题
    html += `<div class="tooltip-pos-group">`;
    html += `<div class="tooltip-part-of-speech-main">${getPartOfSpeechLabel(partOfSpeech)}</div>`;

    // 遍历每个释义
    for (const [index, def] of definitions.entries()) {
      const definition = def.definition || '';
      const example = def.example || '';

      // 添加释义编号和内容，只保留英文释义，不显示中文
      html += `<div class="tooltip-definition" data-example="${encodeURIComponent(example)}">
`;
      html += `<div class="tooltip-definition-number">${index + 1}.</div>
`;
      html += `<div class="tooltip-definition-content">
`;
      
      // 只显示英文释义，不显示中文
      html += `<div class="tooltip-definition-text">${definition}</div>
`;
      
      // 如果有例句，添加例句和翻译占位符
      if (example) {
        html += `<div class="tooltip-example">例句：${example}</div>
`;
        html += `<div class="tooltip-example-cn">例句译文：</div>
`;
      }
      
      html += `</div>
`;
      html += `</div>
`;
    }

    html += `</div>
`;
  }

  html += `</div>`;

  return html;
}

/**
 * 异步更新翻译内容
 * 优化：减少DOM操作次数，改进异步处理逻辑，使用更高效的数据结构
 * @param {Element} tooltipElement - 弹窗DOM元素
 * @param {string} rawTranslation - 原始翻译文本
 */
async function updateTooltipTranslations(tooltipElement, rawTranslation) {
  const definitionElements = tooltipElement.querySelectorAll('.tooltip-definition');
  const primaryDefinitionElement = tooltipElement.querySelector('.tooltip-primary-definition');
  
  // 收集所有待翻译的文本和任务
  const textTasksMap = new Map(); // 用于映射文本到任务
  
  // 使用Set存储唯一文本，避免重复翻译
  const uniqueTextsSet = new Set();
  
  // 处理主要释义 - 确保主要释义优先被翻译
  let primaryDefinitionText = null;
  if (primaryDefinitionElement) {
    const primarySenseElements = primaryDefinitionElement.querySelectorAll('.tooltip-primary-sense');
    primarySenseElements.forEach((senseElement) => {
      const definition = decodeURIComponent(senseElement.dataset.definition || '');
      if (definition) {
        if (!primaryDefinitionText) {
          primaryDefinitionText = definition;
        }
        uniqueTextsSet.add(definition);
        if (!textTasksMap.has(definition)) {
          textTasksMap.set(definition, []);
        }
        textTasksMap.get(definition).push({
          type: 'primary-definition',
          element: senseElement
        });
      }
    });
  }
  
  // 只处理例句翻译，不处理普通释义的翻译
  definitionElements.forEach((element) => {
    const example = decodeURIComponent(element.dataset.example || '');
    
    // 只收集例句翻译任务，不收集普通释义翻译任务
    if (example) {
      uniqueTextsSet.add(example);
      if (!textTasksMap.has(example)) {
        textTasksMap.set(example, []);
      }
      textTasksMap.get(example).push({
        type: 'example',
        element: element
      });
    }
  });
  
  // 将Set转换为数组
  let uniqueTexts = Array.from(uniqueTextsSet);
  
  // 如果没有需要翻译的文本，直接返回
  if (uniqueTexts.length === 0) {
    return;
  }
  
  // 确保主要释义优先翻译
  if (primaryDefinitionText && uniqueTexts.includes(primaryDefinitionText)) {
    // 将主要释义移到数组开头，确保优先处理
    uniqueTexts = uniqueTexts.filter(text => text !== primaryDefinitionText);
    uniqueTexts.unshift(primaryDefinitionText);
  }
  
  // 使用批量翻译API处理所有文本
  const translatedTexts = await translateBatch(uniqueTexts);
  
  // 构建翻译结果映射
  const translationMap = new Map();
  
  // 确保所有唯一文本都有初始映射
  uniqueTexts.forEach(text => {
    translationMap.set(text, '');
  });
  
  // 处理翻译结果
  uniqueTexts.forEach((text, index) => {
    let translatedText = '';
    
    // 检查翻译结果数组长度是否匹配
    if (index < translatedTexts.length) {
      translatedText = translatedTexts[index] || '';
    } else {
      console.error(`updateTooltipTranslations: 翻译结果数组长度不足，文本索引超出范围: ${index}`);
    }
    
    console.debug(`updateTooltipTranslations: 翻译结果: ${text} -> ${translatedText}`);
    
    // 更新翻译结果映射
    translationMap.set(text, translatedText);
  });
  
  // 处理翻译结果为空的文本，尝试单独翻译
  const emptyTranslationPromises = [];
  for (const text of uniqueTexts) {
    if (!translationMap.get(text) && text) {
      console.warn(`updateTooltipTranslations: 批量翻译结果为空，尝试单独翻译: ${text}`);
      
      // 为每个需要单独翻译的文本创建一个Promise
      const promise = translateText(text).then(singleTranslation => {
        if (singleTranslation && singleTranslation !== '翻译失败') {
          console.debug(`updateTooltipTranslations: 单独翻译成功: ${text} -> ${singleTranslation}`);
          // 更新翻译结果映射
          translationMap.set(text, singleTranslation);
          // 单独更新对应的DOM元素
          updateSingleTranslation(text, singleTranslation, textTasksMap);
        } else {
          console.warn(`updateTooltipTranslations: 单独翻译也失败: ${text}`);
          // 即使翻译失败，也使用默认的rawTranslation
          translationMap.set(text, rawTranslation);
          updateSingleTranslation(text, rawTranslation, textTasksMap);
        }
      }).catch(err => {
        console.error(`updateTooltipTranslations: 单独翻译失败: ${text}`, err);
        // 发生错误时，使用默认的rawTranslation
        translationMap.set(text, rawTranslation);
        updateSingleTranslation(text, rawTranslation, textTasksMap);
      });
      
      emptyTranslationPromises.push(promise);
    }
  }
  
  // 等待所有单独翻译完成
  if (emptyTranslationPromises.length > 0) {
    console.debug(`updateTooltipTranslations: 等待${emptyTranslationPromises.length}个单独翻译完成`);
    await Promise.all(emptyTranslationPromises);
    console.debug(`updateTooltipTranslations: 所有单独翻译完成`);
  }
  
  // 批量更新DOM内容（使用requestAnimationFrame优化渲染）
  requestAnimationFrame(() => {
    console.debug('updateTooltipTranslations: 开始更新DOM内容');
    
    // 遍历所有文本任务映射
    for (const [text, tasks] of textTasksMap.entries()) {
      let translatedText = translationMap.get(text) || '';
      
      // 确保翻译结果不为空，否则使用默认的rawTranslation
      if (!translatedText) {
        console.debug(`updateTooltipTranslations: 更新DOM时翻译结果为空，使用默认翻译: ${text} -> ${rawTranslation}`);
        translatedText = rawTranslation;
      }
      
      console.debug(`updateTooltipTranslations: 更新DOM: ${text} -> ${translatedText}`);
      
      // 更新当前文本对应的所有任务
      tasks.forEach(task => {
        if (task.type === 'primary-definition') {
          // 更新主要释义翻译
          const cnElement = task.element.querySelector('.tooltip-primary-sense-cn');
          if (cnElement) {
            cnElement.textContent = translatedText;
          }
        } else if (task.type === 'example') {
          // 更新例句翻译
          const exampleElement = task.element.querySelector('.tooltip-example-cn');
          if (exampleElement) {
            exampleElement.textContent = `例句译文：${translatedText}`;
          }
        }
      });
    }
    
    // 额外检查：确保主要释义的中文翻译有内容
    const primaryCnElements = tooltipElement.querySelectorAll('.tooltip-primary-sense-cn');
    primaryCnElements.forEach(cnElement => {
      if (!cnElement.textContent || cnElement.textContent.trim() === '') {
        console.warn('updateTooltipTranslations: 发现没有内容的主要释义中文元素，使用默认翻译');
        cnElement.textContent = rawTranslation;
      }
    });
    
    console.debug('updateTooltipTranslations: DOM内容更新完成');
  });
}

/**
 * 根据上下文优化词性判断
 * 结合AI辅助，从多个释义中选择最符合上下文的词性
 * 
 * @param {Array<Object>} definitions - 释义列表，每个对象包含partOfSpeech和definition
 * @param {string} context - 上下文文本
 * @returns {Promise<string>} 优化后的词性
 */
async function optimizePartOfSpeechByContext(definitions, context) {
  // 如果没有释义或只有一个释义，直接返回该释义的词性
  if (!definitions || definitions.length <= 1) {
    return definitions && definitions.length > 0 ? definitions[0].partOfSpeech : '';
  }
  
  try {
    // 收集所有可能的词性和释义
    const posOptions = definitions.map((def, index) => ({
      index,
      partOfSpeech: def.partOfSpeech,
      definition: def.definition
    }));
    
    // 发送AI分析请求，让AI根据上下文选择最合适的词性
    const aiResponse = await chrome.runtime.sendMessage({
      type: 'AI_CONTEXT_ANALYSIS',
      text: posOptions,
      context: context,
      task: 'choose_best_pos'
    });
    
    if (aiResponse && aiResponse.ok && aiResponse.result && aiResponse.result.bestPosIndex !== undefined) {
      const bestIndex = aiResponse.result.bestPosIndex;
      if (bestIndex >= 0 && bestIndex < definitions.length) {
        console.debug(`根据上下文优化词性: 从${posOptions.map(p => p.partOfSpeech).join(',')}中选择了${definitions[bestIndex].partOfSpeech}`);
        return definitions[bestIndex].partOfSpeech;
      }
    }
    
    // 如果AI分析失败，默认返回第一个释义的词性
    return definitions[0].partOfSpeech;
  } catch (error) {
    console.error('优化词性判断失败:', error);
    // 出错时返回第一个释义的词性
    return definitions[0].partOfSpeech;
  }
}

/**
 * 单独更新单个翻译结果
 * @param {string} text - 原始文本
 * @param {string} translation - 翻译结果
 * @param {Map} textTasksMap - 文本任务映射
 */
function updateSingleTranslation(text, translation, textTasksMap) {
  if (!translation || !textTasksMap.has(text)) {
    return;
  }
  
  // 批量更新DOM内容（使用requestAnimationFrame优化渲染）
  requestAnimationFrame(() => {
    const tasks = textTasksMap.get(text);
    tasks.forEach(task => {
      if (task.type === 'primary-definition') {
        // 更新主要释义翻译
        const cnElement = task.element.querySelector('.tooltip-primary-sense-cn');
        if (cnElement) {
          cnElement.textContent = translation;
        }
      } else if (task.type === 'example') {
        // 更新例句翻译
        const exampleElement = task.element.querySelector('.tooltip-example-cn');
        if (exampleElement) {
          exampleElement.textContent = `例句译文：${translation}`;
        }
      }
    });
  });
}

/**
 * 获取单词音标（兼容旧代码的接口）
 * 为了保持向后兼容性，提供单独的音标获取函数
 *
 * @param {string} word - 要查询的单词
 * @returns {Promise<string|null>} 单词的音标字符串或null
 */
async function getPhonetic(word) {
  const result = await getPhoneticAndPartOfSpeech(word);
  return result.phonetic;
}

/**
 * 统一渲染翻译弹窗
 * @param {Object} options - 弹窗配置选项
 */
async function renderPopup({
  text,
  translation,
  rect, // {left, top, width, height, ...}
  count = 1,
  phonetic = '',
  partOfSpeech = null,
  meanings = [],
  wordType = 'word',
  isStarred = false,
  showRemoveBtn = false,
  mode = 'simple', // 'simple' 或 'full'
  posAnalysis = null, // 新增：POS分析结果
  context = ''
}) {
  const perfId = safePerformanceMonitor.start('renderPopup');
  
  // 调试日志：检查数据是否正确传入
  console.debug('renderPopup called', {
    text,
    mode,
    meaningsCount: meanings ? meanings.length : 0,
    hasPhonetic: !!phonetic,
    hasPartOfSpeech: !!partOfSpeech,
    hasPOSAnalysis: !!posAnalysis
  });
  
  // 移除旧的弹窗
  if (clickTooltip) {
    clickTooltip.remove();
    clickTooltip = null;
  }
  if (translationPopup) {
    translationPopup.remove();
    translationPopup = null;
  }
  
  // 根据词性获取背景颜色类
  const posClass = wordType === 'phrase' ? 'pos-phrase' : getPartOfSpeechClass(partOfSpeech);
  
  // 创建新弹窗
  clickTooltip = document.createElement('div');
  clickTooltip.className = `click-tooltip ${posClass}`;
  
  // 如果有POS分析结果，应用颜色 (Requirement 8.4, 8.5)
  if (posAnalysis && posAnalysis.color) {
    clickTooltip.style.borderLeftColor = posAnalysis.color;
    clickTooltip.style.borderLeftWidth = '4px';
    clickTooltip.style.borderLeftStyle = 'solid';
  }
  
  // 兼容性设置
  translationPopup = clickTooltip;
  
  // 音标HTML
  let phoneticHtml = '';
  if (phonetic) {
    const phoneticElement = document.createElement('div');
    phoneticElement.className = 'tooltip-phonetic';
    phoneticElement.textContent = phonetic;
    phoneticHtml = phoneticElement.outerHTML;
  }
  
  // POS分析信息HTML (新增)
  let posAnalysisHtml = '';
  if (posAnalysis && posAnalysis.pos && posAnalysis.pos !== 'unknown') {
    const posLabel = {
      'noun': '名词',
      'verb': '动词',
      'adjective': '形容词',
      'adverb': '副词'
    }[posAnalysis.pos] || posAnalysis.pos;
    
    const confidencePercent = Math.round((posAnalysis.confidence || 0) * 100);
    const cacheStatus = posAnalysis.cached ? '(缓存)' : '';
    
    posAnalysisHtml = `
      <div class="tooltip-pos-analysis" style="font-size: 11px; color: ${posAnalysis.color}; margin: 4px 0; opacity: 0.9;">
        <span style="font-weight: 600;">${posLabel}</span>
        <span style="opacity: 0.7; margin-left: 6px;">${confidencePercent}% ${cacheStatus}</span>
      </div>
    `;
  }
  
  // 格式化翻译结果（根据模式决定是否显示详细释义）
  const showFullMeanings = mode === 'full';
  const translationHtml = formatTranslation(translation, showFullMeanings ? meanings : []);
  
  // 功能按钮
  const actionButtonsHtml = `
    <div class="tooltip-function-buttons">
      <button class="tooltip-btn copy-btn" title="复制翻译结果">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
      <button class="tooltip-btn star-btn ${isStarred ? 'starred' : ''}" title="${isStarred ? '取消收藏' : '收藏单词'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      </button>
      <button class="tooltip-btn speak-btn" title="发音">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><circle cx="18.5" cy="12.5" r="4.5"></circle><line x1="17" y1="10" x2="17" y2="14"></line></svg>
      </button>
    </div>
  `;
  
  // 底部按钮区域
  let bottomActionsHtml = '';
  
  // Always offer on-demand details for words and short expressions, including phrases without dictionary data.
  if (count > 0 && window.TranslationVocabulary?.isCandidate(text)) {
    bottomActionsHtml += `
      <div class="tooltip-actions">
        <button type="button" class="tooltip-detail-btn tooltip-vocabulary-btn" aria-expanded="false">展开详解</button>
      </div>
      <div class="tooltip-vocabulary-panel" hidden></div>
    `;
  } else if (mode === 'simple' && meanings && meanings.length > 0) {
    bottomActionsHtml += `
      <div class="tooltip-actions">
        <button class="tooltip-detail-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          详细注解
        </button>
      </div>
    `;
  }
  
  // 取消高亮按钮
  if (showRemoveBtn) {
    bottomActionsHtml += `
      <div class="tooltip-actions">
        <button class="tooltip-remove-btn">取消高亮</button>
      </div>
    `;
  }
  
  // 组装HTML
  clickTooltip.innerHTML = htmlPolicy.createHTML(`
    <div class="tooltip-header">
      <span class="tooltip-word">${text}</span>
      <button class="tooltip-close">×</button>
    </div>
    ${phoneticHtml}
    ${posAnalysisHtml}
    ${translationHtml}
    ${actionButtonsHtml}
    <div class="tooltip-count">已翻译 ${count} 次</div>
    ${bottomActionsHtml}
  `);
  
  // 立即显示
  document.body.appendChild(clickTooltip);
  
  // 异步更新翻译内容（如果有名词解释且处于完整模式）
  if (showFullMeanings && meanings && meanings.length > 0) {
    updateTooltipTranslations(clickTooltip, translation);
  }
  
  // 使用新的独立定位函数
  calculatePopupPosition(clickTooltip, rect);
  
  // 绑定事件（传递当前所有参数以便重新渲染）
  const currentParams = { 
    text, translation, rect, count, phonetic, partOfSpeech, 
    meanings, wordType, isStarred, showRemoveBtn, mode, posAnalysis, context
  };
  bindPopupEvents(clickTooltip, currentParams);
  const vocabularyPopup = clickTooltip;
  window.TranslationVocabulary?.bind(vocabularyPopup, currentParams,
    () => calculatePopupPosition(vocabularyPopup, rect));
  
  // 点击外部关闭 - 使用安全的事件管理器防止内存泄漏
  setTimeout(() => {
    const closeListenerId = EventListenerManager.add(document, 'click', (e) => {
      if (clickTooltip && !clickTooltip.contains(e.target)) {
        clickTooltip.remove();
        clickTooltip = null;
        translationPopup = null;
        EventListenerManager.remove(closeListenerId);
      }
    });
  }, 100);
  
  // 结束性能监控
  safePerformanceMonitor.end(perfId, 'renderPopup', {
    text: text.slice(0, 20),
    hasMeanings: meanings && meanings.length > 0
  });
}

/**
 * 计算并设置弹窗的最佳显示位置
 * 包含视口边界检测、自动翻转和滚动偏移处理
 * @param {HTMLElement} popup - 弹窗元素
 * @param {DOMRect} targetRect - 目标元素的位置信息
 */
function calculatePopupPosition(popup, targetRect) {
  // 获取弹窗尺寸（需先插入DOM才能获取真实尺寸）
  const popupRect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 1. 水平居中定位
  let left = targetRect.left + (targetRect.width / 2) - (popupRect.width / 2);
  
  // 2. 垂直定位（默认下方）
  // 增加 10px 间距
  let top = (targetRect.bottom ?? targetRect.top + (targetRect.height || 0)) + 10;
  
  // 3. 水平边界调整
  // 左侧边界
  if (left < 10) {
    left = 10;
  } 
  // 右侧边界
  else if (left + popupRect.width > viewportWidth - 10) {
    left = viewportWidth - popupRect.width - 10;
  }
  
  // 4. 垂直翻转检测
  // 如果下方空间不足以容纳弹窗
  if (top + popupRect.height > viewportHeight - 10) {
    // 计算上方是否有足够空间
    const topSpace = targetRect.top - 10;
    
    // 如果上方空间比下方大，或者上方空间足够容纳弹窗，则翻转到上方
    if (topSpace > (viewportHeight - top) || topSpace > popupRect.height) {
      top = targetRect.top - popupRect.height - 10;
      
      // 如果翻转后上方还是溢出（极小屏幕），则强制顶端对齐
      if (top < 10) {
        top = 10;
      }
    }
  }
  
  // 5. 应用位置（使用 fixed 定位，无需考虑 scrollY）
  top = Math.max(10, Math.min(top, viewportHeight - popupRect.height - 10));
  popup.style.position = 'fixed';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  
  // 6. 添加变换原点，优化动画效果
  // 根据弹窗是在上方还是下方，设置 transform-origin
  if (top < targetRect.top) {
    popup.style.transformOrigin = 'center bottom';
  } else {
    popup.style.transformOrigin = 'center top';
  }
}

/**
 * 绑定弹窗事件
 */
function bindPopupEvents(popup, params) {
  const { text, translation, rect, count, phonetic, partOfSpeech, meanings, wordType, isStarred, showRemoveBtn, mode } = params;
  const wordLower = text.toLowerCase();

  // 关闭按钮
  const closeBtn = popup.querySelector('.tooltip-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popup.remove();
      clickTooltip = null;
      translationPopup = null;
    });
  }
  
  // 详细注解按钮
  const detailBtn = popup.querySelector('.tooltip-detail-btn:not(.tooltip-vocabulary-btn)');
  if (detailBtn) {
    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.debug('详细注解按钮被点击', {
        text,
        meaningsCount: meanings ? meanings.length : 0,
        currentMode: mode
      });
      
      try {
        // 切换到完整模式重新渲染
        renderPopup({
          ...params,
          mode: 'full'
        });
      } catch (err) {
        console.error('切换到详细模式失败:', err);
      }
    });
  }
  
  // 复制按钮
  const copyBtn = popup.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(translation);
        copyBtn.innerHTML = htmlPolicy.createHTML('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>');
        copyBtn.style.color = '#27ae60';
        setTimeout(() => {
          copyBtn.innerHTML = htmlPolicy.createHTML('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>');
          copyBtn.style.color = '';
        }, 1000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    });
  }
  
  // 收藏按钮
  const starBtn = popup.querySelector('.star-btn');
  if (starBtn) {
    starBtn.addEventListener('click', async () => {
      const result = await chrome.storage.local.get(['translatedWords']);
      const words = result.translatedWords || {};
      
      if (words[wordLower]) {
        words[wordLower].starred = !words[wordLower].starred;
        await chrome.storage.local.set({ translatedWords: words });
        
        if (words[wordLower].starred) {
          starBtn.classList.add('starred');
          starBtn.title = '取消收藏';
        } else {
          starBtn.classList.remove('starred');
          starBtn.title = '收藏单词';
        }
      }
    });
  }
  
  // 发音按钮
  const speakBtn = popup.querySelector('.speak-btn');
  if (speakBtn) {
    speakBtn.addEventListener('click', () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    });
  }
  
  // 取消高亮按钮
  if (showRemoveBtn) {
    const removeBtn = popup.querySelector('.tooltip-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        await removeWordHighlight(text);
        popup.remove();
        clickTooltip = null;
        translationPopup = null;
      });
    }
  }
}

let highlightClickDebounceTimer = null;

// 显示点击提示框
async function showClickTooltip(element, word, translation, count, phonetic, partOfSpeech, wordType = 'word', mode = 'simple') {
  const rect = element.getBoundingClientRect();
  
  // 获取收藏状态
  const storageResult = await chrome.storage.local.get(['translatedWords']);
  const words = storageResult.translatedWords || {};
  const wordLower = word.toLowerCase();
  const isStarred = words[wordLower]?.starred || false;
  
  // 获取完整的翻译信息，包括definitions和examples
  const context = getContextFromNode(element);
  const completeTranslation = await translateText(word, context, false);
  const resolvedPhonetic = completeTranslation.phonetic || phonetic || words[wordLower]?.detailedInfo?.phonetic || '';
  const resolvedPartOfSpeech = completeTranslation.partOfSpeech || partOfSpeech;
  
  // 获取POS分析（如果翻译结果中包含）
  let posAnalysis = completeTranslation.posAnalysis || null;
  
  // 初始渲染，传递完整的翻译信息
  await renderPopup({
    text: word,
    translation: completeTranslation.translation,
    rect,
    count,
    phonetic: resolvedPhonetic,
    partOfSpeech: resolvedPartOfSpeech,
    meanings: completeTranslation.definitions || [],
    wordType,
    isStarred,
    showRemoveBtn: true, // 点击高亮时总是显示移除按钮
    mode: mode,
    posAnalysis: posAnalysis, // 传递POS分析结果
    context
  });
  
  // 触发 AI 辅助分析（使用元素上下文，500ms 防抖 + 700ms 响应窗口）
  // Rich AI analysis is requested only when the user expands details.
  
  // 异步获取完整信息（音标、释义）并更新
  // 如果初始调用时没有音标、释义，或者释义为空，尝试获取
  if (!phonetic || !partOfSpeech || !completeTranslation.definitions || completeTranslation.definitions.length === 0) {
    const phoneticData = await getPhoneticAndPartOfSpeech(word);
    const nextPhonetic = resolvedPhonetic || phoneticData.phonetic;
    const nextMeanings = phoneticData.meanings || [];
    const nextPartOfSpeech = resolvedPartOfSpeech || phoneticData.partOfSpeech;
    
    // 如果有新数据，重新渲染
    if (nextMeanings.length > 0 || nextPhonetic !== resolvedPhonetic || nextPartOfSpeech !== resolvedPartOfSpeech) {
      // 检查弹窗是否还存在（可能被用户关闭了）
      if (clickTooltip && !clickTooltip._vocabularyExpanded && clickTooltip.querySelector('.tooltip-word').textContent === word) {
        await renderPopup({
          text: word,
          translation,
          rect,
          count,
          phonetic: nextPhonetic,
          partOfSpeech: nextPartOfSpeech,
          meanings: nextMeanings,
          wordType,
          isStarred,
          showRemoveBtn: true,
          mode: mode,
          posAnalysis: posAnalysis,
          context
        });
      }
    }
  }
}


// 删除单词高亮
async function removeWordHighlight(word) {
  if (!isExtensionContextValid()) return;
  const result = await chrome.storage.local.get(['translatedWords']);
  const words = result.translatedWords || {};
  
  const wordLower = word.toLowerCase();
  if (words[wordLower]) {
    delete words[wordLower];
    await chrome.storage.local.set({ translatedWords: words });
    
    // 重新高亮显示（会移除该单词的高亮）
    highlightTranslatedWords(words);
  }
}

// 保存翻译记录
async function saveTranslation(word, translation, partOfSpeech = null, detailedInfo = null) {
  if (!isExtensionContextValid()) return;
  const result = await chrome.storage.local.get(['translatedWords']);
  const words = result.translatedWords || {};
  
  const wordLower = word.toLowerCase().trim();
  const isWordPhrase = isWordOrPhrase(word);
  const type = isWordPhrase ? (word.trim().split(/\s+/).length === 1 ? 'word' : 'phrase') : 'sentence';
  const now = Date.now();
  
  if (words[wordLower]) {
    words[wordLower].count += 1;
    words[wordLower].lastUsed = new Date().toISOString();
    // 如果之前没有词性，现在有了，则更新
    if (partOfSpeech && !words[wordLower].partOfSpeech) {
      words[wordLower].partOfSpeech = partOfSpeech;
    }
    // 更新详细信息（如果有新的更详细的信息）
    if (detailedInfo && (!words[wordLower].detailedInfo || Object.keys(detailedInfo).length > Object.keys(words[wordLower].detailedInfo || {}).length)) {
      words[wordLower].detailedInfo = detailedInfo;
    }
    if (detailedInfo?.phonetic) {
      words[wordLower].detailedInfo = { ...(words[wordLower].detailedInfo || {}), phonetic: detailedInfo.phonetic };
    }
    // 添加查询历史记录（保留最近30天的记录）
    if (!words[wordLower].lookupHistory) {
      words[wordLower].lookupHistory = [];
    }
    words[wordLower].lookupHistory.push(now);
    // 清理30天前的记录
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    words[wordLower].lookupHistory = words[wordLower].lookupHistory.filter(t => t > thirtyDaysAgo);
  } else {
    words[wordLower] = {
      word: wordLower,
      translation: translation,
      count: 1,
      type: type,
      partOfSpeech: partOfSpeech,
      firstUsed: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      lookupHistory: [now],
      detailedInfo: detailedInfo || null
    };
  }
  
  await chrome.storage.local.set({ translatedWords: words });
  
  // 只对单词和词组进行高亮
  if (type === 'word' || type === 'phrase') {
    // 只对当前视口内的内容进行高亮更新，提高性能
    highlightTranslatedWords(words, [document.body]);
  }
}

// 获取词性标签（中文）
function getPartOfSpeechLabel(partOfSpeech) {
  const labels = {
    'noun': '名词',
    'verb': '动词',
    'adjective': '形容词',
    'adverb': '副词',
    'pronoun': '代词',
    'preposition': '介词',
    'conjunction': '连词',
    'interjection': '感叹词',
    'determiner': '限定词',
    'article': '冠词',
    'numeral': '数词',
    'auxiliary': '助动词',
    'modal': '情态动词'
  };
  return labels[partOfSpeech.toLowerCase()] || partOfSpeech;
}

// 根据词性获取CSS类名
function getPartOfSpeechClass(partOfSpeech) {
  if (!partOfSpeech) return 'pos-default';
  
  const pos = partOfSpeech.toLowerCase();
  const classMap = {
    // 标准全称
    'noun': 'pos-noun',
    'verb': 'pos-verb',
    'adjective': 'pos-adjective',
    'adverb': 'pos-adverb',
    'pronoun': 'pos-pronoun',
    'preposition': 'pos-preposition',
    'conjunction': 'pos-conjunction',
    'interjection': 'pos-interjection',
    'determiner': 'pos-determiner',
    'article': 'pos-article',
    'numeral': 'pos-numeral',
    'auxiliary': 'pos-auxiliary',
    'modal': 'pos-modal',
    
    // 常见缩写
    'n.': 'pos-noun',
    'n': 'pos-noun',
    'v.': 'pos-verb',
    'v': 'pos-verb',
    'adj.': 'pos-adjective',
    'adj': 'pos-adjective',
    'adv.': 'pos-adverb',
    'adv': 'pos-adverb',
    'pron.': 'pos-pronoun',
    'prep.': 'pos-preposition',
    'conj.': 'pos-conjunction',
    'art.': 'pos-article',
    'num.': 'pos-numeral'
  };
  
  return classMap[pos] || 'pos-default';
}

/**
 * Apply POS-based color to an element
 * Uses the POS Integration Service for accurate color mapping
 * Requirement 8.4: Update color within 50ms of POS recognition
 * Requirement 8.5: Immediately update display when POS classification changes
 * 
 * @param {HTMLElement} element - The element to apply color to
 * @param {string} word - The word being highlighted
 * @param {string} sentence - The sentence context
 * @param {Object} posAnalysis - Optional pre-computed POS analysis result
 */
async function applyPOSColor(element, word, sentence, posAnalysis = null) {
  const startTime = Date.now();
  
  try {
    // If we already have POS analysis from translation, use it
    if (posAnalysis && posAnalysis.color) {
      element.style.color = posAnalysis.color;
      element.setAttribute('data-pos', posAnalysis.pos);
      element.setAttribute('data-pos-confidence', posAnalysis.confidence || 0);
      
      const latency = Date.now() - startTime;
      if (latency > 50) {
        console.warn(`POS color application took ${latency}ms (target: 50ms)`);
      }
      return;
    }
    
    // Otherwise, request POS analysis from background service
    if (sentence && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'POS_ANALYZE',
          text: word,
          sentence: sentence
        });
        
        if (response && response.ok && response.result) {
          const result = response.result;
          element.style.color = result.color;
          element.setAttribute('data-pos', result.pos);
          element.setAttribute('data-pos-confidence', result.confidence || 0);
          
          const latency = Date.now() - startTime;
          if (latency > 50) {
            console.warn(`POS color application took ${latency}ms (target: 50ms)`);
          }
        }
      } catch (error) {
        console.warn('POS color application failed:', error);
        // Fallback: use default styling
      }
    }
  } catch (error) {
    console.error('Error applying POS color:', error);
  }
}

// 显示翻译弹窗（使用与点击高亮单词相同的样式）
async function showTranslationPopup(text, translation, rect, count = 1, context = '', metadata = {}) {
  const isWordPhrase = isWordOrPhrase(text);
  const wordLower = text.toLowerCase().trim();
  
  // 获取音标和词性（如果还没有缓存）
  let phonetic = metadata.phonetic || '';
  let partOfSpeech = metadata.partOfSpeech || null;
  let meanings = [];
  
  if (isWordPhrase && (!phonetic || !partOfSpeech)) {
    const phoneticData = await getPhoneticAndPartOfSpeech(wordLower);
    phonetic = phonetic || phoneticData.phonetic;
    partOfSpeech = partOfSpeech || phoneticData.partOfSpeech;
    meanings = phoneticData.meanings;
  }
  
  const type = isWordPhrase ? (text.trim().split(/\s+/).length === 1 ? 'word' : 'phrase') : 'sentence';
  
  // 获取收藏状态
  const storageResult = await chrome.storage.local.get(['translatedWords']);
  const words = storageResult.translatedWords || {};
  const isStarred = words[wordLower]?.starred || false;
  
  await renderPopup({
    text,
    translation,
    rect,
    count,
    phonetic,
    partOfSpeech,
    meanings,
    wordType: type,
    isStarred,
    showRemoveBtn: isWordPhrase, // 只有单词/词组显示移除按钮
    context
  });
  
  // 触发AI分析（延迟执行）
  // Details are fetched on demand by the expand button.
}


// 获取纯文本内容（排除高亮元素，正确处理跨节点选择）
function getPlainTextFromSelection(selection) {
  const range = selection.getRangeAt(0);
  
  // 使用 cloneContents 克隆选择内容
  const clonedRange = range.cloneContents();
  const div = document.createElement('div');
  div.appendChild(clonedRange);
  
  // 移除所有高亮元素的标签，但保留文本内容
  const highlights = div.querySelectorAll('.translated-word-highlight, trae-highlight');
  highlights.forEach(highlight => {
    const textNode = document.createTextNode(highlight.textContent);
    if (highlight.parentNode) {
      highlight.parentNode.replaceChild(textNode, highlight);
    }
  });
  
  // 获取纯文本（会自动合并相邻的文本节点）
  const text = div.textContent || div.innerText || '';
  return text.trim();
}

// 处理文本选择（仅保存选择，等待回车键触发翻译）
function handleTextSelection() {
  // 检查当前域名是否允许运行插件
  if (!isDomainAllowed()) {
    return;
  }
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  // 仅保存选择状态
  if (text && text.length > 0) {
    const range = selection.getRangeAt(0);
    
    // 保存选择和文本到全局变量，供executeTranslation使用
    selectedText = text;
    selectedRange = range.cloneRange();
    
    // 不自动翻译，不清除选区，保留浏览器默认高亮
  }
}

// 执行翻译（按回车键或空格键后调用，兼容旧逻辑）
async function executeTranslation(requestedText = '') {
  // 检查当前域名是否允许运行插件
  if (!isDomainAllowed()) {
    return;
  }
  
  // 优先使用当前选择，否则使用保存的选择
  const selection = window.getSelection();
  let text, range, rect;
  
  const currentText = selection.toString().trim();
  const menuText = requestedText.trim();
  if (currentText && (!menuText || currentText === menuText)) {
    // 使用当前选择
    text = selection.toString().trim();
    range = selection.getRangeAt(0);
    rect = range.getBoundingClientRect();
  } else if (selectedText && selectedRange && (!menuText || selectedText === menuText)) {
    // 使用保存的选择
    text = selectedText;
    range = selectedRange;
    rect = range.getBoundingClientRect();
  } else if (menuText) {
    // Native menus supply the text even if the page has cleared the selection.
    text = menuText;
    range = null;
    rect = { left: Math.max(16, window.innerWidth / 2 - 200), top: 100, width: 0, height: 0 };
  } else {
    return;
  }
  
  // 在执行翻译前显示加载动画
  showLoadingIndicator();
  
  if (!isExtensionContextValid()) {
    hideLoadingIndicator();
    return;
  }
  
  try {
    // 自动选择方向：中文译成英文，其他语言译成简体中文。
    const context = range ? getContextFromRange(range) : '';
    const translationResult = await translateText(text, context, false);
    const translation = translationResult.translation || '翻译失败';
    const resultPartOfSpeech = translationResult.partOfSpeech;
    
    // 检查是否已存在记录
    const result = await chrome.storage.local.get(['translatedWords']);
    const words = result.translatedWords || {};
    const wordLower = text.toLowerCase().trim();
    const existingWord = words[wordLower];
    const count = existingWord ? existingWord.count + 1 : 1;
    
    // 获取词性信息（如果是单词或词组）
    let partOfSpeech = resultPartOfSpeech || null;
    const isWordPhrase = isWordOrPhrase(text);
    if (isWordPhrase && !partOfSpeech) {
      const phoneticData = await getPhoneticAndPartOfSpeech(wordLower);
      partOfSpeech = phoneticData.partOfSpeech;
    }
    
    // 构建详细信息对象
    const detailedInfo = {
      phonetic: translationResult.phonetic || '',
      partOfSpeech: resultPartOfSpeech || partOfSpeech,
      definitions: translationResult.definitions || [],
      examples: translationResult.examples || [],
      basic: translationResult.basic || null,
      web: translationResult.web || null
    };
    
    // 保存翻译记录（包含词性和详细信息），会自动触发高亮显示
    await saveTranslation(text, translation, partOfSpeech, detailedInfo);
    
    // 隐藏加载动画
    hideLoadingIndicator();
    
    // 显示翻译弹窗（包含音标、词性和次数）
    await showTranslationPopup(text, translation, rect, count, context, detailedInfo);
  } catch (error) {
    console.error('执行翻译失败:', error);
    hideLoadingIndicator();
    await renderPopup({ text, translation: '翻译失败：' + error.message, rect, count: 0 });
  }
  
  // 清除选择
  selection.removeAllRanges();
  
  // 清除保存的选择
  selectedText = '';
  selectedRange = null;
}

// 监听鼠标抬起事件（完成选择）
const mouseupListenerId = eventDelegateManager.addEventListener('mouseup', async (e) => {
  // 检查当前域名是否允许运行插件
  if (!isDomainAllowed()) {
    return;
  }
  
  // 清除之前的定时器
  if (selectionDebounceTimer) {
    clearTimeout(selectionDebounceTimer);
  }
  
  // 防抖处理
  selectionDebounceTimer = setTimeout(() => {
    const selection = window.getSelection();
    if (selection.toString().trim().length > 0) {
      handleTextSelection();
    }
  }, 300);
});

// 监听键盘事件（回车键或空格键触发翻译）
const keydownListenerId = eventDelegateManager.addEventListener('keydown', async (e) => {
  // 检查当前域名是否允许运行插件
  if (!isDomainAllowed()) {
    return;
  }
  
  // 检查是否有输入框或文本区域处于焦点状态
  const activeElement = document.activeElement;
  const isInputFocused = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  );
  
  // 检查是否按下了回车键或空格键，允许直接对选中的内容执行翻译
  if ((e.key === 'Enter' || e.key === ' ') && !isInputFocused) {
    handleSelectionTranslation(e);
  }
  
  // ESC键清除选择
  if (e.key === 'Escape') {
    // 清除页面上的文本选择
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    // 清除保存的选择
    selectedText = '';
    selectedRange = null;
    
    // 移除所有高亮
    document.querySelectorAll('.translated-word-highlight').forEach(el => {
      // 简单移除高亮类，保留文本
      // 实际上应该做 unwrap，但这里简单处理
    });
    
    // 关闭弹窗
    if (translationPopup) {
      translationPopup.remove();
      translationPopup = null;
    }
  }
});

// Preserve the browser menu and remember the range for the native translation item.
const contextmenuListenerId = eventDelegateManager.addEventListener('contextmenu', () => {
  handleTextSelection();
}, { capture: true });

/**
 * 处理选区翻译逻辑（供键盘和右键事件复用）
 * @param {Event} e - 触发事件
 */
async function handleSelectionTranslation(e) {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0) {
    // 检查选区是否有效（在可视区域内）
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return; // 忽略不可见的选区
    }
    
    e.preventDefault();
    // 保存当前选择，用于执行翻译
    selectedText = text;
    selectedRange = range.cloneRange();
    console.debug('Trigger translation from active selection:', text);
    await executeTranslation();
  } else if (selectedText && selectedRange) {
    // 如果有保存的选择，使用保存的选择执行翻译
    // 再次验证保存的选区是否仍然有效
    try {
      const rect = selectedRange.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        e.preventDefault();
        console.debug('Trigger translation from cached selection:', selectedText);
        await executeTranslation();
      } else {
        // 选区已失效，清理缓存
        selectedText = '';
        selectedRange = null;
      }
    } catch (err) {
      console.warn('Invalid cached range:', err);
      selectedText = '';
      selectedRange = null;
    }
  }
}

/**
 * 应用自定义颜色设置
 * 根据用户设置动态生成和应用CSS样式
 * @param {Object} settings - 用户设置对象
 */
function applyCustomColors(settings) {
  // 移除现有的自定义样式
  const existingStyle = document.getElementById('custom-highlight-colors');
  if (existingStyle) {
    existingStyle.remove();
  }

  // 如果用户选择了自定义主题，应用自定义颜色
  if (settings.highlightTheme === 'custom' && settings.customColors) {
    const style = document.createElement('style');
    style.id = 'custom-highlight-colors';
    
    let cssContent = '';
    
    // 为每个词性生成自定义颜色
    Object.entries(settings.customColors).forEach(([pos, color]) => {
      const className = pos === 'default' ? '' : `.pos-${pos}`;
      cssContent += `
        .translated-word-highlight${className} {
          background: ${color} !important;
          background: linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 100%) !important;
        }
        .translated-word-highlight${className}:hover {
          background: linear-gradient(135deg, ${adjustBrightness(color, 10)} 0%, ${color} 100%) !important;
          filter: brightness(1.1) !important;
        }
        .click-tooltip${className} {
          background: linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 100%) !important;
        }
      `;
    });
    
    style.textContent = cssContent;
    document.head.appendChild(style);
  }
}

/**
 * 调整颜色亮度
 * @param {string} color - 颜色值（支持hex、rgb、颜色名称）
 * @param {number} percent - 亮度调整百分比（正值变亮，负值变暗）
 * @returns {string} 调整后的颜色
 */
function adjustBrightness(color, percent) {
  // 简化的亮度调整函数
  const rgb = colorToRgb(color);
  if (!rgb) return color;
  
  const factor = 1 + percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 颜色转换为RGB对象
 * @param {string} color - 颜色字符串
 * @returns {Object|null} RGB对象或null
 */
function colorToRgb(color) {
  // 处理十六进制颜色
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
  
  // 处理rgb颜色
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    };
  }
  
  return null;
}

// 监听设置变化，实时更新颜色
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.userSettings) {
    // 重新应用颜色设置
    applyCustomColors(changes.userSettings.newValue || {});
    // 重新高亮显示以应用新颜色
    chrome.storage.local.get(['translatedWords']).then(result => {
      const words = result.translatedWords || {};
      highlightTranslatedWords(words);
    });
  }
  
  // Rebuild Word_Index_Manager when words change
  if (areaName === 'local' && changes.translatedWords && contentWordIndexManager) {
    const newWords = changes.translatedWords.newValue || {};
    const wordArray = Object.keys(newWords).map(key => ({
      key: key,
      word: key,
      ...newWords[key]
    }));
    contentWordIndexManager.buildIndex(wordArray).catch(error => {
      console.error('[Content Script] Failed to rebuild Word_Index_Manager:', error);
    });
  }
});

// 使用事件委托处理所有高亮元素的点击事件
document.addEventListener('click', async (e) => {
  // 检查当前域名是否允许运行插件
  if (!isDomainAllowed()) {
    return;
  }
  
  // 检查点击的是否是高亮元素
  const highlight = e.target.closest('.translated-word-highlight');
  if (highlight) {
    await handleHighlightClick(e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'PING_TRANSLATION' && sender.id === chrome.runtime.id) {
    sendResponse({ ready: isExtensionContextValid(), version: scriptVersion });
    return;
  }
  if (msg?.type === 'TRANSLATE_SELECTION' && sender.id === chrome.runtime.id) {
    if (!isDomainAllowed() || typeof msg.text !== 'string' || !msg.text.trim()) {
      sendResponse({ ok: false });
      return;
    }
    executeTranslation(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (msg && msg.type === 'REHIGHLIGHT') {
    chrome.storage.local.get(['translatedWords']).then(result => {
      const words = result.translatedWords || {};
      highlightTranslatedWords(words);
    });
  }
});
// 页面加载完成后初始化高亮
// 优化：页面加载后立即执行高亮，确保已记录单词快速显示高亮效果
const startInit = async () => {
  // 检查是否应该运行
  if (!isDomainAllowed()) return;

  // 立即执行初始化，确保高亮及时显示
  const runInit = async () => {
    // 再次检查扩展上下文是否有效
    if (chrome.runtime && chrome.runtime.id) {
      await initModules(); // 初始化所有模块
      await initContentWordIndex(); // Initialize Word_Index_Manager for content script
      await initHighlighting();
    }
  };

  // 立即执行，不再延迟
  await runInit();
};

if (document.readyState === 'loading') {
  // 使用 load 事件而不是 DOMContentLoaded，确保页面主要资源加载完成
  window.addEventListener('load', startInit);
} else {
  // 如果脚本注入时页面已经加载完，立即执行
  startInit();
}

// ==================== 
// 加载状态UI管理 
// ====================

/**
 * 显示加载状态指示器
 */
function showLoadingIndicator() {
  // 检查是否已经存在加载指示器
  let loader = document.getElementById('translation-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'translation-loader';
    loader.innerHTML = htmlPolicy.createHTML(`
      <div class="loader-content">
        <div class="loader-spinner">
          <div class="loader-spinner-inner"></div>
        </div>
        <div class="loader-text">正在翻译...</div>
      </div>
    `);
    document.body.appendChild(loader);
  }
  
  // 显示加载指示器
  loader.style.display = 'flex';
}

/**
 * 隐藏加载状态指示器
 */
function hideLoadingIndicator() {
  // 检查是否有活跃的加载状态
  if (loadingStates.size === 0) {
    const loader = document.getElementById('translation-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  }
}

// 全局变量存储 observer 实例，以便在其他函数中控制
let domObserver = null;

// 监听DOM变化，当页面内容动态加载时自动重新高亮
// 只在允许的域名上初始化DOM观察器
if (isDomainAllowed()) {
  domObserver = new MutationObserver((mutations) => {
    // 检查document.body是否存在
    if (!document.body) return;

    // 辅助函数：检查是否是高亮相关节点
    // 优化：使用对象查找代替数组includes，提高性能
    const highlightTags = {
      'TRAE-HIGHLIGHT': true,
      'SCRIPT': true,
      'STYLE': true,
      'IFRAME': true,
      'SVG': true,
      'CANVAS': true,
      'VIDEO': true,
      'AUDIO': true,
      'TEXTAREA': true,
      'INPUT': true,
      'SELECT': true,
      'OPTION': true,
      'HEAD': true,
      'TITLE': true,
      'META': true,
      'LINK': true,
      'NOSCRIPT': true,
      'OBJECT': true,
      'EMBED': true,
      'APPLET': true,
      'FRAME': true,
      'FRAMESET': true,
      'BASE': true,
      'FORM': true
    };
    
    const isHighlightNode = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      
      const tagName = node.tagName;
      if (highlightTags[tagName]) return true;
      
      const classList = node.classList;
      if (!classList) return false;
      
      return classList.contains('translated-word-highlight') ||
             classList.contains('click-tooltip') ||
             node.id === 'translation-loader';
    };

    // 检查是否所有变动都来自插件自身的操作（高亮标记或弹窗）
    // 优化：使用some代替every，提前退出循环
    const isPluginMutation = mutations.some(mutation => {
      const addedNodes = Array.from(mutation.addedNodes);
      const removedNodes = Array.from(mutation.removedNodes);
      
      // 优化：提前退出循环，如果有高亮节点直接返回true
      for (const node of addedNodes) {
        if (isHighlightNode(node)) return true;
      }
      
      for (const node of removedNodes) {
        if (isHighlightNode(node)) return true;
      }
      
      return false;
    });

    if (isPluginMutation) {
      return;
    }

    // 收集需要更新的节点（增量更新优化）
    const nodesToUpdate = new Set();
    // 优化：使用更高效的节点类型检查和过滤
    const allowedTags = {
      'DIV': true,
      'P': true,
      'SPAN': true,
      'A': true,
      'H1': true,
      'H2': true,
      'H3': true,
      'H4': true,
      'H5': true,
      'H6': true,
      'UL': true,
      'OL': true,
      'LI': true,
      'TABLE': true,
      'TBODY': true,
      'TR': true,
      'TD': true,
      'TH': true,
      'ARTICLE': true,
      'SECTION': true,
      'MAIN': true,
      'ASIDE': true,
      'HEADER': true,
      'FOOTER': true,
      'NAV': true,
      'BLOCKQUOTE': true,
      'PRE': true,
      'CODE': true,
      'EM': true,
      'STRONG': true,
      'I': true,
      'B': true,
      'U': true,
      'S': true,
      'SUB': true,
      'SUP': true,
      'BR': true,
      'HR': true,
      'IMG': true,
      'FIGURE': true,
      'FIGCAPTION': true
    };
    
    mutations.forEach(mutation => {
      // 优化：只处理添加的节点，忽略删除的节点，因为删除节点不会影响高亮
      const addedNodes = Array.from(mutation.addedNodes);
      
      addedNodes.forEach(node => {
        if (isHighlightNode(node)) return;
        
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 如果是元素节点，添加到待更新列表
          // 优化：只处理允许的标签类型
          if (allowedTags[node.tagName]) {
            nodesToUpdate.add(node);
          }
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
           // 如果是文本节点，添加其父节点
           const parentNode = node.parentNode;
           if (parentNode && parentNode.nodeType === Node.ELEMENT_NODE && !isHighlightNode(parentNode)) {
             // 优化：只处理允许的标签类型
             if (allowedTags[parentNode.tagName]) {
               nodesToUpdate.add(parentNode);
             }
           }
        }
      });
    });

    // 如果没有实质性的内容变化，直接返回
    if (nodesToUpdate.size === 0) {
      return;
    }
    
    const uniqueNodes = Array.from(nodesToUpdate);

    // 清除之前的定时器
    if (highlightDebounceTimer) {
      clearTimeout(highlightDebounceTimer);
    }
    
    // 防抖处理：延迟执行高亮，避免频繁DOM操作导致卡顿
    // 优化：动态调整防抖时间，根据节点数量和页面复杂度调整
    // 优化：使用更高效的防抖机制
    const baseDebounceTime = 300; // 基础延迟
    const nodeFactor = Math.min(10, uniqueNodes.length); // 节点数量因子，最大10
    const debounceTime = Math.min(baseDebounceTime + nodeFactor * 50, 1500); // 动态计算延迟，最大1500ms
    
    highlightDebounceTimer = setTimeout(async () => {
      if (!isExtensionContextValid()) {
        if (domObserver) domObserver.disconnect();
        return;
      }

      try {
        // DOM变化时重新高亮显示已翻译的单词
        const result = await chrome.storage.local.get(['translatedWords']);
        const words = result.translatedWords || {};
        
        // 只有当有翻译记录时才执行高亮
        if (Object.keys(words).length > 0 && uniqueNodes.length > 0) {
          // 使用增量更新，只处理变化的节点
          console.debug(`[Optimization] Incremental highlight on ${uniqueNodes.length} nodes`);
          highlightTranslatedWords(words, uniqueNodes);
        }
      } catch (error) {
        console.error('MutationObserver callback error:', error);
      }
    }, debounceTime);
  });

  // 确保document.body存在后再开始观察
  // 优化：只观察childList变化，减少观察范围
  const observerConfig = {
    childList: true,  // 只监听子节点变化
    subtree: true,     // 监听整个DOM树
    // 移除characterData和attributes监听，减少不必要的触发
  };
  
  if (document.body) {
    domObserver.observe(document.body, observerConfig);
  } else {
    // 如果body尚未加载，等待DOMContentLoaded事件
    window.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        domObserver.observe(document.body, observerConfig);
      }
    });
  }
}

// ==================== 
// 加载状态UI管理 
// ====================

window.__TRANSLATION_ASSISTANT_READY = { version: scriptVersion, extensionId: chrome.runtime.id };
})();
