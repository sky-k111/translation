/**
 * POS Result Index - 词性结果索引
 * 双向索引存储和查询词性分析结果
 * 提供O(1)时间复杂度的查询性能
 * 
 * Features:
 * - Sentence -> POS result mapping (sentenceIndex)
 * - Word -> Sentences mapping (wordIndex)
 * - POS statistics per word (posStats)
 * - Automatic cleanup of old entries
 * - Persistence to Chrome Storage
 */

class POSResultIndex {
  /**
   * 构造函数
   * @param {Object} config - 配置选项
   * @param {number} config.maxEntries - 最大条目数（句子数）
   * @param {number} config.maxAge - 最大保存时间（毫秒）
   * @param {string} config.storageKey - Chrome Storage键名
   * @param {number} config.persistDelay - 持久化防抖延迟（毫秒）
   */
  constructor(config = {}) {
    this.config = {
      maxEntries: config.maxEntries || 5000,
      maxAge: config.maxAge || (30 * 24 * 60 * 60 * 1000), // 30天
      storageKey: config.storageKey || 'pos_index_v1',
      persistDelay: config.persistDelay || 1000
    };

    // 句子 -> POS结果映射
    // key: sentence (normalized), value: {posResult, timestamp, words}
    this.sentenceIndex = new Map();
    
    // 单词 -> 句子集合映射
    // key: word (normalized), value: Set of sentences
    this.wordIndex = new Map();
    
    // 单词 -> 词性统计映射
    // key: word (normalized), value: {noun: 5, verb: 3, ...}
    this.posStats = new Map();
    
    // 版本和元数据
    this.version = '1.0.0';
    this.lastModified = Date.now();
    
    // 持久化防抖定时器
    this.persistTimer = null;
    
    // 性能监控
    this._initPerformanceMetrics();
  }

  /**
   * 添加POS分析结果
   * @param {string} sentence - 原始句子
   * @param {Object} posResult - POS分析结果
   * @param {Array<Object>} posResult.words - 单词级别分析
   * @param {string} posResult.words[].word - 单词
   * @param {string} posResult.words[].pos - 词性标签
   * @param {string} posResult.words[].lemma - 词根
   * @param {number} posResult.words[].confidence - 置信度
   * @param {string} posResult.source - 分析来源
   * @returns {void}
   */
  addResult(sentence, posResult) {
    const startTime = performance.now();
    
    if (!sentence || !posResult) {
      console.warn('[POSResultIndex] addResult: sentence and posResult are required');
      return;
    }

    // 规范化句子（去除首尾空格，统一小写）
    const normalizedSentence = sentence.trim().toLowerCase();
    
    // 检查容量限制
    if (this.sentenceIndex.size >= this.config.maxEntries) {
      this._cleanupOldEntries();
    }

    // 提取单词列表
    const words = posResult.words || [];
    const wordList = words.map(w => w.word.toLowerCase());
    
    // 添加到句子索引
    const timestamp = Date.now();
    this.sentenceIndex.set(normalizedSentence, {
      posResult,
      timestamp,
      words: wordList
    });

    // 更新单词索引
    for (const word of wordList) {
      if (!this.wordIndex.has(word)) {
        this.wordIndex.set(word, new Set());
      }
      this.wordIndex.get(word).add(normalizedSentence);
    }

    // 更新词性统计
    for (const wordData of words) {
      const word = wordData.word.toLowerCase();
      const pos = wordData.pos;
      
      if (!pos) continue;
      
      if (!this.posStats.has(word)) {
        this.posStats.set(word, {});
      }
      
      const stats = this.posStats.get(word);
      stats[pos] = (stats[pos] || 0) + 1;
    }

    this.lastModified = Date.now();
    this._schedulePersist();
    
    const duration = performance.now() - startTime;
    this._trackPerformance('add', duration);
    
    if (duration > 5) {
      console.warn(`[POSResultIndex] Slow addResult: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * 获取单词的所有POS结果
   * @param {string} word - 单词
   * @returns {Array<Object>} POS结果数组 [{sentence, posResult, timestamp}, ...]
   */
  getPOSForWord(word) {
    const startTime = performance.now();
    
    if (!word) {
      return [];
    }

    const normalizedWord = word.toLowerCase();
    const sentences = this.wordIndex.get(normalizedWord);
    
    if (!sentences || sentences.size === 0) {
      const duration = performance.now() - startTime;
      this._trackPerformance('query', duration);
      return [];
    }

    // 收集所有相关的POS结果
    const results = [];
    for (const sentence of sentences) {
      const entry = this.sentenceIndex.get(sentence);
      if (entry) {
        results.push({
          sentence,
          posResult: entry.posResult,
          timestamp: entry.timestamp
        });
      }
    }

    const duration = performance.now() - startTime;
    this._trackPerformance('query', duration);
    
    if (duration > 1) {
      console.warn(`[POSResultIndex] Slow getPOSForWord: ${duration.toFixed(2)}ms for word "${word}"`);
    }

    return results;
  }

  /**
   * 获取句子的POS结果
   * @param {string} sentence - 句子
   * @returns {Object|null} POS结果或null
   */
  getPOSForSentence(sentence) {
    const startTime = performance.now();
    
    if (!sentence) {
      return null;
    }

    const normalizedSentence = sentence.trim().toLowerCase();
    const entry = this.sentenceIndex.get(normalizedSentence);
    
    const duration = performance.now() - startTime;
    this._trackPerformance('query', duration);
    
    if (duration > 1) {
      console.warn(`[POSResultIndex] Slow getPOSForSentence: ${duration.toFixed(2)}ms`);
    }

    return entry ? entry.posResult : null;
  }

  /**
   * 获取单词的词性统计
   * @param {string} word - 单词
   * @returns {Object} 统计结果 {counts: {noun: 5, verb: 3}, mostCommon: 'noun', total: 8}
   */
  getWordPOSStats(word) {
    const startTime = performance.now();
    
    if (!word) {
      return {
        counts: {},
        mostCommon: null,
        total: 0
      };
    }

    const normalizedWord = word.toLowerCase();
    const stats = this.posStats.get(normalizedWord);
    
    if (!stats || Object.keys(stats).length === 0) {
      const duration = performance.now() - startTime;
      this._trackPerformance('query', duration);
      return {
        counts: {},
        mostCommon: null,
        total: 0
      };
    }

    // 计算总数
    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    // 找出最常见的词性
    let mostCommon = null;
    let maxCount = 0;
    for (const [pos, count] of Object.entries(stats)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = pos;
      }
    }

    const duration = performance.now() - startTime;
    this._trackPerformance('query', duration);

    return {
      counts: { ...stats },
      mostCommon,
      total
    };
  }

  /**
   * 清理旧数据
   * @param {number} maxAge - 最大保存时间（毫秒），默认使用配置值
   * @returns {number} 删除的条目数
   */
  cleanup(maxAge = null) {
    const startTime = performance.now();
    
    const ageThreshold = maxAge !== null ? maxAge : this.config.maxAge;
    const now = Date.now();
    const cutoffTime = now - ageThreshold;
    
    let removedCount = 0;
    const sentencesToRemove = [];

    // 找出需要删除的句子
    for (const [sentence, entry] of this.sentenceIndex.entries()) {
      if (entry.timestamp < cutoffTime) {
        sentencesToRemove.push(sentence);
      }
    }

    // 删除旧句子
    for (const sentence of sentencesToRemove) {
      this._removeSentence(sentence);
      removedCount++;
    }

    if (removedCount > 0) {
      this.lastModified = Date.now();
      this._schedulePersist();
      
      const duration = performance.now() - startTime;
      console.log(`[POSResultIndex] Cleaned up ${removedCount} old entries in ${duration.toFixed(2)}ms`);
    }

    return removedCount;
  }

  /**
   * 删除句子及其相关索引
   * @private
   * @param {string} sentence - 句子
   */
  _removeSentence(sentence) {
    const entry = this.sentenceIndex.get(sentence);
    if (!entry) return;

    // 从句子索引中删除
    this.sentenceIndex.delete(sentence);

    // 从单词索引中删除
    for (const word of entry.words) {
      const sentences = this.wordIndex.get(word);
      if (sentences) {
        sentences.delete(sentence);
        if (sentences.size === 0) {
          this.wordIndex.delete(word);
        }
      }
    }

    // 重新计算词性统计（因为删除了一个句子）
    this._recalculatePOSStats();
  }

  /**
   * 重新计算所有词性统计
   * @private
   */
  _recalculatePOSStats() {
    // 清空现有统计
    this.posStats.clear();

    // 重新统计
    for (const entry of this.sentenceIndex.values()) {
      const words = entry.posResult.words || [];
      for (const wordData of words) {
        const word = wordData.word.toLowerCase();
        const pos = wordData.pos;
        
        if (!pos) continue;
        
        if (!this.posStats.has(word)) {
          this.posStats.set(word, {});
        }
        
        const stats = this.posStats.get(word);
        stats[pos] = (stats[pos] || 0) + 1;
      }
    }
  }

  /**
   * 清理旧条目（当达到容量限制时）
   * @private
   */
  _cleanupOldEntries() {
    console.log('[POSResultIndex] Capacity limit reached, cleaning up old entries');
    
    // 按时间戳排序，删除最旧的20%
    const entries = Array.from(this.sentenceIndex.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const removeCount = Math.floor(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      this._removeSentence(entries[i][0]);
    }
    
    console.log(`[POSResultIndex] Removed ${removeCount} oldest entries`);
  }

  /**
   * 安排持久化（防抖）
   * @private
   */
  _schedulePersist() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persist().catch(err => {
        console.error('[POSResultIndex] Auto-persist failed:', err);
      });
    }, this.config.persistDelay);
  }

  /**
   * 持久化索引到Chrome Storage
   * @returns {Promise<void>}
   */
  async persist() {
    const startTime = performance.now();
    
    try {
      // 准备序列化数据
      const sentenceEntries = [];
      for (const [sentence, entry] of this.sentenceIndex.entries()) {
        sentenceEntries.push({
          sentence,
          posResult: entry.posResult,
          timestamp: entry.timestamp,
          words: entry.words
        });
      }

      const wordIndexEntries = [];
      for (const [word, sentences] of this.wordIndex.entries()) {
        wordIndexEntries.push({
          word,
          sentences: Array.from(sentences)
        });
      }

      const posStatsEntries = [];
      for (const [word, stats] of this.posStats.entries()) {
        posStatsEntries.push({
          word,
          stats
        });
      }

      const data = {
        version: this.version,
        timestamp: Date.now(),
        lastModified: this.lastModified,
        sentenceIndex: sentenceEntries,
        wordIndex: wordIndexEntries,
        posStats: posStatsEntries
      };

      // 保存到Chrome Storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [this.config.storageKey]: data }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      } else {
        // 降级到localStorage（用于测试）
        localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      }

      const duration = performance.now() - startTime;
      console.log(`[POSResultIndex] Persisted ${sentenceEntries.length} entries in ${duration.toFixed(2)}ms`);
      
      if (duration > 200) {
        console.warn(`[POSResultIndex] Slow persistence: ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('[POSResultIndex] Persist failed:', error);
      
      // 如果是存储配额错误，尝试清理
      if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
        console.warn('[POSResultIndex] Storage quota exceeded, attempting cleanup');
        this._cleanupOldEntries();
        // 重试持久化
        await this.persist();
      } else {
        throw error;
      }
    }
  }

  /**
   * 从Chrome Storage加载索引
   * @returns {Promise<boolean>} 是否成功加载
   */
  async load() {
    const startTime = performance.now();
    
    try {
      let data = null;

      // 从Chrome Storage加载
      if (typeof chrome !== 'undefined' && chrome.storage) {
        data = await new Promise((resolve, reject) => {
          chrome.storage.local.get([this.config.storageKey], (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result[this.config.storageKey]);
            }
          });
        });
      } else {
        // 降级到localStorage（用于测试）
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          data = JSON.parse(stored);
        }
      }

      if (!data) {
        console.log('[POSResultIndex] No stored data found');
        return false;
      }

      // 验证数据格式
      if (!this._validateData(data)) {
        console.error('[POSResultIndex] Invalid data format, skipping load');
        return false;
      }

      // Detect and migrate old format
      const detection = this.detectOldFormat(data);
      if (detection.isOldFormat) {
        console.warn(`[POSResultIndex] Old format detected: version=${detection.detectedVersion}`);
        console.log(`[POSResultIndex] Issues found: ${detection.issues.join(', ')}`);
        
        // Attempt migration
        const migrated = this.migrateFromOldFormat(data);
        if (!migrated) {
          console.error('[POSResultIndex] Migration failed');
          return false;
        }
        
        data = migrated;
        console.log('[POSResultIndex] Migration successful, data updated to current version');
        
        // Persist migrated data immediately
        setTimeout(() => {
          this.persist().then(() => {
            console.log('[POSResultIndex] Migrated data persisted successfully');
          }).catch(err => {
            console.error('[POSResultIndex] Failed to persist migrated data:', err);
          });
        }, 100);
      }

      // 清空当前索引
      this.sentenceIndex.clear();
      this.wordIndex.clear();
      this.posStats.clear();

      // 重建句子索引
      if (data.sentenceIndex && Array.isArray(data.sentenceIndex)) {
        for (const entry of data.sentenceIndex) {
          this.sentenceIndex.set(entry.sentence, {
            posResult: entry.posResult,
            timestamp: entry.timestamp,
            words: entry.words
          });
        }
      }

      // 重建单词索引
      if (data.wordIndex && Array.isArray(data.wordIndex)) {
        for (const entry of data.wordIndex) {
          this.wordIndex.set(entry.word, new Set(entry.sentences));
        }
      }

      // 重建词性统计
      if (data.posStats && Array.isArray(data.posStats)) {
        for (const entry of data.posStats) {
          this.posStats.set(entry.word, entry.stats);
        }
      }

      this.lastModified = data.lastModified || Date.now();

      const duration = performance.now() - startTime;
      console.log(`[POSResultIndex] Loaded ${this.sentenceIndex.size} entries in ${duration.toFixed(2)}ms`);
      
      if (duration > 200) {
        console.warn(`[POSResultIndex] Slow load: ${duration.toFixed(2)}ms`);
      }

      return true;
    } catch (error) {
      console.error('[POSResultIndex] Load failed:', error);
      
      // 加载失败时，清空索引并返回false
      this.sentenceIndex.clear();
      this.wordIndex.clear();
      this.posStats.clear();
      
      return false;
    }
  }

  /**
   * 重置索引（清空所有数据）
   * @returns {void}
   */
  reset() {
    console.log('[POSResultIndex] Resetting index');
    
    // 清空内存数据
    this.sentenceIndex.clear();
    this.wordIndex.clear();
    this.posStats.clear();
    this.lastModified = Date.now();
    
    // 清空持久化数据
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove([this.config.storageKey], () => {
        if (chrome.runtime.lastError) {
          console.error('[POSResultIndex] Failed to clear storage:', chrome.runtime.lastError);
        }
      });
    } else {
      localStorage.removeItem(this.config.storageKey);
    }
    
    // 取消待处理的持久化
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    
    // 重置性能指标
    this._initPerformanceMetrics();
    
    console.log('[POSResultIndex] Index reset complete');
  }

  /**
   * 获取索引统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const sentenceCount = this.sentenceIndex.size;
    const wordCount = this.wordIndex.size;
    
    // 计算内存使用
    const memoryBreakdown = this._calculateMemoryUsage();
    const totalMemory = memoryBreakdown.total;
    
    // 计算内存开销
    let rawDataSize = 0;
    for (const [sentence, entry] of this.sentenceIndex.entries()) {
      rawDataSize += sentence.length * 2;
      rawDataSize += JSON.stringify(entry.posResult).length * 2;
    }
    const memoryOverhead = rawDataSize > 0 ? (totalMemory / rawDataSize) : 1;
    
    // 检查内存警告阈值
    const memoryWarning = memoryOverhead > 1.3;
    if (memoryWarning) {
      console.warn(`[POSResultIndex] Memory overhead is ${(memoryOverhead * 100).toFixed(0)}% (threshold: 130%)`);
    }
    
    // 性能指标
    const performance = {
      avgQueryTime: this._performanceMetrics.avgQueryTime || 0,
      avgAddTime: this._performanceMetrics.avgAddTime || 0,
      totalQueries: this._performanceMetrics.totalQueries || 0,
      totalAdds: this._performanceMetrics.totalAdds || 0
    };
    
    // 计算最旧和最新的条目
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;
    for (const entry of this.sentenceIndex.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }
    
    const ageRange = sentenceCount > 0 ? {
      oldest: new Date(oldestTimestamp).toISOString(),
      newest: new Date(newestTimestamp).toISOString(),
      rangeDays: ((newestTimestamp - oldestTimestamp) / (24 * 60 * 60 * 1000)).toFixed(1)
    } : null;

    return {
      sentenceCount,
      wordCount,
      posStatsCount: this.posStats.size,
      memoryUsage: totalMemory,
      memoryUsageMB: (totalMemory / 1024 / 1024).toFixed(2),
      memoryBreakdown,
      memoryOverhead: (memoryOverhead * 100).toFixed(0) + '%',
      memoryWarning,
      performance,
      ageRange,
      version: this.version,
      lastModified: this.lastModified,
      lastModifiedDate: new Date(this.lastModified).toISOString(),
      config: {
        maxEntries: this.config.maxEntries,
        maxAgeDays: (this.config.maxAge / (24 * 60 * 60 * 1000)).toFixed(0)
      }
    };
  }

  /**
   * 计算详细内存使用
   * @private
   * @returns {Object} 内存分解
   */
  _calculateMemoryUsage() {
    let sentenceIndexMemory = 0;
    let wordIndexMemory = 0;
    let posStatsMemory = 0;
    
    // 句子索引内存
    for (const [sentence, entry] of this.sentenceIndex.entries()) {
      sentenceIndexMemory += sentence.length * 2; // 句子字符串
      sentenceIndexMemory += JSON.stringify(entry.posResult).length * 2; // POS结果
      sentenceIndexMemory += entry.words.length * 20; // 单词列表（估算）
      sentenceIndexMemory += 8; // 时间戳
      sentenceIndexMemory += 50; // Map entry开销
    }
    
    // 单词索引内存
    for (const [word, sentences] of this.wordIndex.entries()) {
      wordIndexMemory += word.length * 2; // 单词字符串
      wordIndexMemory += sentences.size * 20; // Set中的句子引用（估算）
      wordIndexMemory += 50; // Map entry开销
    }
    
    // 词性统计内存
    for (const [word, stats] of this.posStats.entries()) {
      posStatsMemory += word.length * 2; // 单词字符串
      posStatsMemory += JSON.stringify(stats).length * 2; // 统计对象
      posStatsMemory += 50; // Map entry开销
    }
    
    const total = sentenceIndexMemory + wordIndexMemory + posStatsMemory;
    
    return {
      sentenceIndex: sentenceIndexMemory,
      sentenceIndexMB: (sentenceIndexMemory / 1024 / 1024).toFixed(2),
      wordIndex: wordIndexMemory,
      wordIndexMB: (wordIndexMemory / 1024 / 1024).toFixed(2),
      posStats: posStatsMemory,
      posStatsMB: (posStatsMemory / 1024 / 1024).toFixed(2),
      total,
      totalMB: (total / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * 初始化性能指标跟踪
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
   * 跟踪操作时间
   * @private
   * @param {string} operation - 操作名称 ('query' 或 'add')
   * @param {number} duration - 持续时间（毫秒）
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
   * 验证数据格式
   * @param {Object} data - 待验证的数据
   * @returns {boolean} 是否有效
   * @private
   */
  _validateData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.version || typeof data.version !== 'string') {
      return false;
    }

    if (!data.sentenceIndex || !Array.isArray(data.sentenceIndex)) {
      return false;
    }

    if (!data.wordIndex || !Array.isArray(data.wordIndex)) {
      return false;
    }

    if (!data.posStats || !Array.isArray(data.posStats)) {
      return false;
    }

    return true;
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
    if (!data.sentenceIndex || !Array.isArray(data.sentenceIndex)) {
      issues.push('Missing or invalid sentenceIndex array');
    }
    
    if (!data.wordIndex || !Array.isArray(data.wordIndex)) {
      issues.push('Missing or invalid wordIndex array');
    }
    
    if (!data.posStats || !Array.isArray(data.posStats)) {
      issues.push('Missing or invalid posStats array');
    }
    
    // Check for lastModified (added in v1.0.0)
    if (!data.lastModified) {
      issues.push('Missing lastModified field');
    }
    
    // Check entry structure
    if (data.sentenceIndex && Array.isArray(data.sentenceIndex) && data.sentenceIndex.length > 0) {
      const firstEntry = data.sentenceIndex[0];
      
      if (!firstEntry.sentence) {
        issues.push('Sentence entries missing sentence field');
      }
      if (!firstEntry.posResult) {
        issues.push('Sentence entries missing posResult field');
      }
      if (!firstEntry.timestamp) {
        issues.push('Sentence entries missing timestamp field');
      }
    }
    
    // Detect old format patterns
    const isOldFormat = issues.length > 0 || data.version !== this.version;
    
    if (isOldFormat) {
      console.log(`[POSResultIndex] Old format detected: version=${detectedVersion}, issues=${issues.length}`);
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
      
      console.log(`[POSResultIndex] Starting migration from ${detection.detectedVersion} to ${this.version}`);
      console.log(`[POSResultIndex] Migration issues to fix: ${detection.issues.join(', ')}`);
      
      let migratedData = { ...oldData };
      
      // Migration path: pre-1.0.0 -> 1.0.0
      if (detection.detectedVersion === 'pre-1.0.0' || !oldData.version) {
        migratedData = this._migrateFromPreV1(oldData);
        if (!migratedData) {
          console.error('[POSResultIndex] Failed to migrate from pre-v1.0.0');
          return null;
        }
        console.log('[POSResultIndex] Successfully migrated from pre-v1.0.0 to v1.0.0');
      }
      
      // Future migration paths can be added here
      // Example: if (detection.detectedVersion === '1.0.0') { ... }
      
      // Ensure version is updated
      migratedData.version = this.version;
      migratedData.timestamp = Date.now();
      
      // Validate migrated data
      if (!this._validateData(migratedData)) {
        console.error('[POSResultIndex] Migrated data failed validation');
        return null;
      }
      
      console.log(`[POSResultIndex] Migration complete: ${detection.detectedVersion} -> ${this.version}`);
      return migratedData;
      
    } catch (error) {
      console.error('[POSResultIndex] Migration error:', error);
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
      let sentenceEntries = [];
      let wordIndexEntries = [];
      let posStatsEntries = [];
      
      // Case 1: Object with Map-like structure (needs conversion to arrays)
      if (oldData.sentenceIndex && typeof oldData.sentenceIndex === 'object' && !Array.isArray(oldData.sentenceIndex)) {
        // Old format stored as object, convert to array
        sentenceEntries = Object.entries(oldData.sentenceIndex).map(([sentence, entry]) => ({
          sentence,
          posResult: entry.posResult || entry,
          timestamp: entry.timestamp || Date.now(),
          words: entry.words || []
        }));
      }
      // Case 2: Already array format (partial v1)
      else if (oldData.sentenceIndex && Array.isArray(oldData.sentenceIndex)) {
        sentenceEntries = oldData.sentenceIndex.map(entry => ({
          sentence: entry.sentence || '',
          posResult: entry.posResult || {},
          timestamp: entry.timestamp || Date.now(),
          words: entry.words || []
        }));
      }
      // Case 3: Direct POS results array (very old format)
      else if (Array.isArray(oldData)) {
        sentenceEntries = oldData.map(item => ({
          sentence: item.sentence || '',
          posResult: item,
          timestamp: Date.now(),
          words: (item.words || []).map(w => w.word.toLowerCase())
        }));
      }
      
      // Rebuild word index from sentence entries
      const wordIndexMap = new Map();
      for (const entry of sentenceEntries) {
        for (const word of entry.words) {
          if (!wordIndexMap.has(word)) {
            wordIndexMap.set(word, new Set());
          }
          wordIndexMap.get(word).add(entry.sentence);
        }
      }
      wordIndexEntries = Array.from(wordIndexMap.entries()).map(([word, sentences]) => ({
        word,
        sentences: Array.from(sentences)
      }));
      
      // Rebuild POS stats from sentence entries
      const posStatsMap = new Map();
      for (const entry of sentenceEntries) {
        const words = entry.posResult.words || [];
        for (const wordData of words) {
          const word = wordData.word.toLowerCase();
          const pos = wordData.pos;
          
          if (!pos) continue;
          
          if (!posStatsMap.has(word)) {
            posStatsMap.set(word, {});
          }
          
          const stats = posStatsMap.get(word);
          stats[pos] = (stats[pos] || 0) + 1;
        }
      }
      posStatsEntries = Array.from(posStatsMap.entries()).map(([word, stats]) => ({
        word,
        stats
      }));
      
      // Create v1.0.0 format
      const migratedData = {
        version: '1.0.0',
        timestamp: Date.now(),
        lastModified: oldData.lastModified || Date.now(),
        sentenceIndex: sentenceEntries,
        wordIndex: wordIndexEntries,
        posStats: posStatsEntries
      };
      
      console.log(`[POSResultIndex] Migrated ${sentenceEntries.length} sentences, ${wordIndexEntries.length} words from pre-v1.0.0 format`);
      return migratedData;
      
    } catch (error) {
      console.error('[POSResultIndex] Error migrating from pre-v1.0.0:', error);
      return null;
    }
  }

  /**
   * Migrate old version data (legacy method, calls migrateFromOldFormat)
   * @param {Object} data - Old version data
   * @returns {Object} New version data
   * @private
   * @deprecated Use migrateFromOldFormat() instead
   */
  _migrateData(data) {
    return this.migrateFromOldFormat(data);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { POSResultIndex };
} else if (typeof window !== 'undefined') {
  window.POSResultIndex = POSResultIndex;
} else if (typeof self !== 'undefined') {
  self.POSResultIndex = POSResultIndex;
}
