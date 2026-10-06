/**
 * Review Queue Manager - 复习队列管理器
 * 使用MinHeap实现基于Ebbinghaus遗忘曲线的优先级队列
 * 
 * @requires MinHeap from heap.js
 */

/**
 * ReviewQueueManager - 管理单词复习队列
 * 使用最小堆维护复习优先级，基于Ebbinghaus遗忘曲线计算
 */
class ReviewQueueManager {
  /**
   * 构造函数
   * @param {Object} config - 配置选项
   * @param {number} config.persistDelay - 持久化防抖延迟（毫秒）
   * @param {number} config.maxQueueSize - 最大队列大小
   * @param {string} config.storageKey - Chrome Storage键名
   */
  constructor(config = {}) {
    this.config = {
      persistDelay: config.persistDelay || 1000,
      maxQueueSize: config.maxQueueSize || 1000,
      storageKey: config.storageKey || 'review_queue_v1'
    };

    // 使用MinHeap存储复习队列（按priority排序，越小越优先）
    this.heap = new MinHeap((a, b) => a.priority - b.priority);
    
    // 快速查找Map（word -> reviewItem）
    this.wordMap = new Map();
    
    // 版本和元数据
    this.version = '1.0.0';
    this.lastModified = Date.now();
    
    // 持久化防抖定时器
    this.persistTimer = null;
    
    // 性能监控
    this.stats = {
      addCount: 0,
      updateCount: 0,
      getCount: 0,
      totalAddTime: 0,
      totalUpdateTime: 0,
      totalGetTime: 0
    };
  }

  /**
   * 添加单词到复习队列
   * @param {Object} wordData - 单词数据
   * @param {string} wordData.word - 单词
   * @param {number} wordData.lastReviewTime - 上次复习时间（时间戳）
   * @param {number} wordData.reviewCount - 复习次数
   * @param {number} wordData.difficulty - 难度等级（1.0-2.0）
   * @returns {void}
   */
  addWord(wordData) {
    const startTime = performance.now();
    
    // Handle null or undefined wordData
    if (!wordData || typeof wordData !== 'object') {
      console.warn('[ReviewQueueManager] addWord: wordData must be an object');
      return;
    }

    const word = wordData.word;
    if (!word) {
      console.warn('[ReviewQueueManager] addWord: word is required');
      return;
    }

    // 如果单词已存在，先移除旧的
    if (this.wordMap.has(word)) {
      this.remove(word);
    }

    // 计算优先级
    const priority = this.calculatePriority(wordData);
    
    // 创建复习项
    const reviewItem = {
      word,
      lastReviewTime: wordData.lastReviewTime || Date.now(),
      reviewCount: wordData.reviewCount || 0,
      difficulty: wordData.difficulty || 1.0,
      priority,
      nextReviewTime: this._calculateNextReviewTime(wordData),
      mastered: wordData.mastered || false,
      metadata: wordData.metadata || {}
    };

    // 添加到堆和Map
    this.heap.insert(reviewItem);
    this.wordMap.set(word, reviewItem);
    
    this.lastModified = Date.now();
    this._schedulePersist();
    
    // 性能统计
    const endTime = performance.now();
    this.stats.addCount++;
    this.stats.totalAddTime += (endTime - startTime);
  }

  /**
   * 批量添加单词（优化版本）
   * @param {Array<Object>} words - 单词数组
   * @returns {void}
   */
  batchAdd(words) {
    if (!Array.isArray(words) || words.length === 0) {
      return;
    }

    const startTime = performance.now();

    // 批量处理，避免每次都触发持久化
    const oldPersistTimer = this.persistTimer;
    this.persistTimer = null;

    words.forEach(wordData => {
      const word = wordData.word;
      if (!word) return;

      // 如果单词已存在，先移除
      if (this.wordMap.has(word)) {
        this.remove(word);
      }

      const priority = this.calculatePriority(wordData);
      const reviewItem = {
        word,
        lastReviewTime: wordData.lastReviewTime || Date.now(),
        reviewCount: wordData.reviewCount || 0,
        difficulty: wordData.difficulty || 1.0,
        priority,
        nextReviewTime: this._calculateNextReviewTime(wordData),
        mastered: wordData.mastered || false,
        metadata: wordData.metadata || {}
      };

      this.heap.insert(reviewItem);
      this.wordMap.set(word, reviewItem);
    });

    this.lastModified = Date.now();
    
    // 恢复持久化定时器
    this.persistTimer = oldPersistTimer;
    this._schedulePersist();

    const endTime = performance.now();
    console.log(`[ReviewQueueManager] batchAdd: Added ${words.length} words in ${(endTime - startTime).toFixed(2)}ms`);
  }

  /**
   * 获取下一个需要复习的单词
   * @returns {Object|null} 复习项或null
   */
  getNextReview() {
    const startTime = performance.now();
    
    const now = Date.now();
    const top = this.heap.peek();
    
    // 检查是否有到期的复习项
    if (top && top.nextReviewTime <= now && !top.mastered) {
      const item = this.heap.extractMin();
      this.wordMap.delete(item.word);
      
      const endTime = performance.now();
      this.stats.getCount++;
      this.stats.totalGetTime += (endTime - startTime);
      
      return item;
    }
    
    const endTime = performance.now();
    this.stats.getCount++;
    this.stats.totalGetTime += (endTime - startTime);
    
    return null;
  }

  /**
   * 复习后更新单词
   * @param {string} word - 单词
   * @param {boolean} correct - 是否回答正确
   * @returns {void}
   */
  updateAfterReview(word, correct) {
    const startTime = performance.now();
    
    if (!word) {
      console.warn('[ReviewQueueManager] updateAfterReview: word is required');
      return;
    }

    // 创建新的复习项
    const now = Date.now();
    const oldItem = this.wordMap.get(word);
    
    let reviewCount = 0;
    let difficulty = 1.0;
    let metadata = {};
    
    if (oldItem) {
      reviewCount = oldItem.reviewCount;
      difficulty = oldItem.difficulty;
      metadata = oldItem.metadata || {};
    }

    // 更新复习次数（无论对错都要增加）
    reviewCount++;
    
    // 根据答案正确性调整难度
    if (correct) {
      // 正确答案，难度略微降低
      difficulty = Math.max(1.0, difficulty - 0.1);
    } else {
      // 错误答案，难度增加
      difficulty = Math.min(2.0, difficulty + 0.2);
    }

    // 重新添加到队列
    this.addWord({
      word,
      lastReviewTime: now,
      reviewCount,
      difficulty,
      metadata
    });

    const endTime = performance.now();
    this.stats.updateCount++;
    this.stats.totalUpdateTime += (endTime - startTime);
  }

  /**
   * 计算单词的复习优先级
   * 使用Ebbinghaus遗忘曲线公式：priority = daysSinceReview * (2^reviewCount) * difficultyMultiplier
   * 
   * @param {Object} wordData - 单词数据
   * @returns {number} 优先级分数（越小越优先）
   */
  calculatePriority(wordData) {
    const now = Date.now();
    const lastReviewTime = wordData.lastReviewTime || now;
    const reviewCount = wordData.reviewCount || 0;
    const difficulty = wordData.difficulty || 1.0;
    const mastered = wordData.mastered || false;

    // 特殊情况：已掌握的单词优先级最低
    if (mastered) {
      return Infinity;
    }

    // 特殊情况：首次复习
    if (reviewCount === 0) {
      return 1.0;
    }

    // 计算距离上次复习的天数
    const daysSinceReview = (now - lastReviewTime) / (24 * 60 * 60 * 1000);
    
    // Ebbinghaus公式：priority = daysSinceReview * (2^reviewCount) * difficulty
    // 注意：这里priority越小表示越需要复习
    // 所以我们用负值，让最近复习过的单词优先级更低
    const priority = -daysSinceReview / (Math.pow(2, reviewCount) * difficulty);
    
    return priority;
  }

  /**
   * 标记单词为已掌握
   * @param {string} word - 单词
   * @returns {void}
   */
  markAsMastered(word) {
    if (!word) {
      console.warn('[ReviewQueueManager] markAsMastered: word is required');
      return;
    }

    const item = this.wordMap.get(word);
    if (!item) {
      console.warn(`[ReviewQueueManager] markAsMastered: word "${word}" not found`);
      return;
    }

    // 更新为已掌握状态
    this.addWord({
      ...item,
      mastered: true,
      priority: Infinity
    });

    console.log(`[ReviewQueueManager] Marked "${word}" as mastered`);
  }

  /**
   * 移除单词（内部方法）
   * @param {string} word - 单词
   * @returns {boolean} 是否成功移除
   */
  remove(word) {
    if (!this.wordMap.has(word)) {
      return false;
    }

    // 从Map中移除
    this.wordMap.delete(word);
    
    // 从堆中移除（需要重建堆）
    this._rebuildHeap();
    
    return true;
  }

  /**
   * 重建堆（从wordMap）
   * @private
   */
  _rebuildHeap() {
    const items = Array.from(this.wordMap.values());
    this.heap.clear();
    items.forEach(item => this.heap.insert(item));
  }

  /**
   * 计算下次复习时间
   * @param {Object} wordData - 单词数据
   * @returns {number} 下次复习时间戳
   * @private
   */
  _calculateNextReviewTime(wordData) {
    const now = Date.now();
    const reviewCount = wordData.reviewCount || 0;
    const difficulty = wordData.difficulty || 1.0;
    const mastered = wordData.mastered || false;

    if (mastered) {
      // 已掌握的单词，设置为很久以后
      return now + 365 * 24 * 60 * 60 * 1000; // 1年后
    }

    if (reviewCount === 0) {
      // 首次复习，立即可复习
      return now;
    }

    // 基于复习次数的间隔（指数增长）
    // 间隔 = 2^reviewCount 天 / difficulty
    const intervalDays = Math.pow(2, reviewCount) / difficulty;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    
    return now + intervalMs;
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
        console.error('[ReviewQueueManager] Auto-persist failed:', err);
      });
    }, this.config.persistDelay);
  }

  /**
   * 持久化队列到Chrome Storage
   * @returns {Promise<void>}
   */
  async persist() {
    try {
      const startTime = performance.now();

      // 获取所有队列项
      let items = Array.from(this.wordMap.values());

      // 如果超过最大队列大小，只保存优先级最高的项
      if (items.length > this.config.maxQueueSize) {
        // 按priority排序（越小越优先）
        items.sort((a, b) => a.priority - b.priority);
        items = items.slice(0, this.config.maxQueueSize);
        
        console.warn(`[ReviewQueueManager] Queue size (${this.wordMap.size}) exceeds max (${this.config.maxQueueSize}), truncating to top ${this.config.maxQueueSize} items`);
      }

      // 序列化数据
      const data = {
        version: this.version,
        timestamp: Date.now(),
        lastModified: this.lastModified,
        items: items.map(item => ({
          word: item.word,
          lastReviewTime: item.lastReviewTime,
          reviewCount: item.reviewCount,
          difficulty: item.difficulty,
          priority: item.priority,
          nextReviewTime: item.nextReviewTime,
          mastered: item.mastered,
          metadata: item.metadata
        }))
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

      const endTime = performance.now();
      console.log(`[ReviewQueueManager] Persisted ${items.length} items in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('[ReviewQueueManager] Persist failed:', error);
      
      // 如果是存储配额错误，尝试清理
      if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
        console.warn('[ReviewQueueManager] Storage quota exceeded, attempting cleanup');
        await this._handleQuotaExceeded();
      }
      
      throw error;
    }
  }

  /**
   * 从Chrome Storage加载队列
   * @returns {Promise<boolean>} 是否成功加载
   */
  async load() {
    try {
      const startTime = performance.now();

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
        console.log('[ReviewQueueManager] No stored data found');
        return false;
      }

      // 验证数据格式
      if (!this._validateData(data)) {
        console.error('[ReviewQueueManager] Invalid data format, skipping load');
        return false;
      }

      // Detect and migrate old format
      const detection = this.detectOldFormat(data);
      if (detection.isOldFormat) {
        console.warn(`[ReviewQueueManager] Old format detected: version=${detection.detectedVersion}`);
        console.log(`[ReviewQueueManager] Issues found: ${detection.issues.join(', ')}`);
        
        // Attempt migration
        const migrated = this.migrateFromOldFormat(data);
        if (!migrated) {
          console.error('[ReviewQueueManager] Migration failed');
          return false;
        }
        
        data = migrated;
        console.log('[ReviewQueueManager] Migration successful, data updated to current version');
        
        // Persist migrated data immediately
        setTimeout(() => {
          this.persist().then(() => {
            console.log('[ReviewQueueManager] Migrated data persisted successfully');
          }).catch(err => {
            console.error('[ReviewQueueManager] Failed to persist migrated data:', err);
          });
        }, 100);
      }

      // 清空当前队列
      this.heap.clear();
      this.wordMap.clear();

      // 重建队列
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          this.heap.insert(item);
          this.wordMap.set(item.word, item);
        });
      }

      this.lastModified = data.lastModified || Date.now();

      const endTime = performance.now();
      console.log(`[ReviewQueueManager] Loaded ${this.wordMap.size} items in ${(endTime - startTime).toFixed(2)}ms`);
      
      return true;
    } catch (error) {
      console.error('[ReviewQueueManager] Load failed:', error);
      
      // 加载失败时，清空队列并返回false
      this.heap.clear();
      this.wordMap.clear();
      
      return false;
    }
  }

  /**
   * 重置队列（清空所有数据）
   * @returns {void}
   */
  reset() {
    console.log('[ReviewQueueManager] Resetting queue');
    
    // 清空内存数据
    this.heap.clear();
    this.wordMap.clear();
    this.lastModified = Date.now();
    
    // 清空持久化数据
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove([this.config.storageKey], () => {
        if (chrome.runtime.lastError) {
          console.error('[ReviewQueueManager] Failed to clear storage:', chrome.runtime.lastError);
        }
      });
    } else {
      localStorage.removeItem(this.config.storageKey);
    }
    
    // 清空统计
    this.stats = {
      addCount: 0,
      updateCount: 0,
      getCount: 0,
      totalAddTime: 0,
      totalUpdateTime: 0,
      totalGetTime: 0
    };
    
    console.log('[ReviewQueueManager] Queue reset complete');
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

    if (!data.items || !Array.isArray(data.items)) {
      return false;
    }

    // 验证每个项的必需字段
    for (const item of data.items) {
      if (!item.word || typeof item.word !== 'string') {
        return false;
      }
      if (typeof item.priority !== 'number') {
        return false;
      }
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
    if (!data.items || !Array.isArray(data.items)) {
      issues.push('Missing or invalid items array');
    }
    
    // Check for lastModified (added in v1.0.0)
    if (!data.lastModified) {
      issues.push('Missing lastModified field');
    }
    
    // Check item structure
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      const firstItem = data.items[0];
      
      // Check for required fields in review items
      if (!firstItem.word) {
        issues.push('Items missing word field');
      }
      if (typeof firstItem.priority !== 'number') {
        issues.push('Items missing or invalid priority field');
      }
      if (!firstItem.nextReviewTime) {
        issues.push('Items missing nextReviewTime field');
      }
    }
    
    // Detect old format patterns
    const isOldFormat = issues.length > 0 || data.version !== this.version;
    
    if (isOldFormat) {
      console.log(`[ReviewQueueManager] Old format detected: version=${detectedVersion}, issues=${issues.length}`);
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
      
      console.log(`[ReviewQueueManager] Starting migration from ${detection.detectedVersion} to ${this.version}`);
      console.log(`[ReviewQueueManager] Migration issues to fix: ${detection.issues.join(', ')}`);
      
      let migratedData = { ...oldData };
      
      // Migration path: pre-1.0.0 -> 1.0.0
      if (detection.detectedVersion === 'pre-1.0.0' || !oldData.version) {
        migratedData = this._migrateFromPreV1(oldData);
        if (!migratedData) {
          console.error('[ReviewQueueManager] Failed to migrate from pre-v1.0.0');
          return null;
        }
        console.log('[ReviewQueueManager] Successfully migrated from pre-v1.0.0 to v1.0.0');
      }
      
      // Future migration paths can be added here
      // Example: if (detection.detectedVersion === '1.0.0') { ... }
      
      // Ensure version is updated
      migratedData.version = this.version;
      migratedData.timestamp = Date.now();
      
      // Validate migrated data
      if (!this._validateData(migratedData)) {
        console.error('[ReviewQueueManager] Migrated data failed validation');
        return null;
      }
      
      console.log(`[ReviewQueueManager] Migration complete: ${detection.detectedVersion} -> ${this.version}`);
      return migratedData;
      
    } catch (error) {
      console.error('[ReviewQueueManager] Migration error:', error);
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
      let items = [];
      
      // Case 1: Direct array of review items
      if (Array.isArray(oldData)) {
        items = oldData.map(item => this._normalizeReviewItem(item));
      }
      // Case 2: Object with items array
      else if (oldData.items && Array.isArray(oldData.items)) {
        items = oldData.items.map(item => this._normalizeReviewItem(item));
      }
      // Case 3: Object with queue/words array (alternative old format)
      else if (oldData.queue && Array.isArray(oldData.queue)) {
        items = oldData.queue.map(item => this._normalizeReviewItem(item));
      }
      else if (oldData.words && Array.isArray(oldData.words)) {
        items = oldData.words.map(item => this._normalizeReviewItem(item));
      }
      // Case 4: Unknown format
      else {
        console.error('[ReviewQueueManager] Unknown old format structure');
        return null;
      }
      
      // Create v1.0.0 format
      const migratedData = {
        version: '1.0.0',
        timestamp: Date.now(),
        lastModified: oldData.lastModified || Date.now(),
        items
      };
      
      console.log(`[ReviewQueueManager] Migrated ${items.length} items from pre-v1.0.0 format`);
      return migratedData;
      
    } catch (error) {
      console.error('[ReviewQueueManager] Error migrating from pre-v1.0.0:', error);
      return null;
    }
  }

  /**
   * Normalize a review item to current format
   * @private
   * @param {Object} item - Review item (possibly old format)
   * @returns {Object} Normalized review item
   */
  _normalizeReviewItem(item) {
    // Handle string (just word)
    if (typeof item === 'string') {
      return {
        word: item,
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0,
        priority: 1.0,
        nextReviewTime: Date.now(),
        mastered: false,
        metadata: {}
      };
    }
    
    // Handle object
    const normalized = {
      word: item.word || item.text || '',
      lastReviewTime: item.lastReviewTime || item.lastReview || Date.now(),
      reviewCount: item.reviewCount || item.count || 0,
      difficulty: item.difficulty || 1.0,
      priority: item.priority !== undefined ? item.priority : this.calculatePriority(item),
      nextReviewTime: item.nextReviewTime || item.nextReview || Date.now(),
      mastered: item.mastered || false,
      metadata: item.metadata || item.meta || {}
    };
    
    // Recalculate priority if it seems wrong
    if (normalized.priority === undefined || normalized.priority === null) {
      normalized.priority = this.calculatePriority(normalized);
    }
    
    // Recalculate nextReviewTime if missing
    if (!normalized.nextReviewTime) {
      normalized.nextReviewTime = this._calculateNextReviewTime(normalized);
    }
    
    return normalized;
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

  /**
   * 处理存储配额超限
   * @private
   */
  async _handleQuotaExceeded() {
    console.warn('[ReviewQueueManager] Handling quota exceeded');
    
    // 减少队列大小到一半
    const targetSize = Math.floor(this.config.maxQueueSize / 2);
    
    let items = Array.from(this.wordMap.values());
    items.sort((a, b) => a.priority - b.priority);
    items = items.slice(0, targetSize);
    
    // 重建队列
    this.heap.clear();
    this.wordMap.clear();
    
    items.forEach(item => {
      this.heap.insert(item);
      this.wordMap.set(item.word, item);
    });
    
    console.log(`[ReviewQueueManager] Reduced queue size to ${items.length}`);
    
    // 重试持久化
    try {
      await this.persist();
    } catch (error) {
      console.error('[ReviewQueueManager] Failed to persist after cleanup:', error);
    }
  }

  /**
   * 获取队列统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const now = Date.now();
    const items = Array.from(this.wordMap.values());
    
    // 计算到期的单词数量
    const dueNow = items.filter(item => 
      item.nextReviewTime <= now && !item.mastered
    ).length;
    
    // 计算今天到期的单词数量
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const dueToday = items.filter(item => 
      item.nextReviewTime <= endOfDay.getTime() && !item.mastered
    ).length;
    
    // 计算平均优先级
    const validPriorities = items
      .filter(item => !item.mastered && isFinite(item.priority))
      .map(item => item.priority);
    const avgPriority = validPriorities.length > 0
      ? validPriorities.reduce((sum, p) => sum + p, 0) / validPriorities.length
      : 0;
    
    // 计算已掌握的单词数量
    const masteredCount = items.filter(item => item.mastered).length;
    
    // 计算内存使用（估算）
    const memoryUsage = this._estimateMemoryUsage();
    
    // 计算平均操作时间
    const avgAddTime = this.stats.addCount > 0 
      ? this.stats.totalAddTime / this.stats.addCount 
      : 0;
    const avgUpdateTime = this.stats.updateCount > 0 
      ? this.stats.totalUpdateTime / this.stats.updateCount 
      : 0;
    const avgGetTime = this.stats.getCount > 0 
      ? this.stats.totalGetTime / this.stats.getCount 
      : 0;
    
    return {
      // 队列基本信息
      totalWords: this.wordMap.size,
      heapSize: this.heap.size(),
      dueNow,
      dueToday,
      masteredCount,
      activeCount: this.wordMap.size - masteredCount,
      
      // 优先级统计
      avgPriority: avgPriority.toFixed(4),
      minPriority: validPriorities.length > 0 ? Math.min(...validPriorities).toFixed(4) : 0,
      maxPriority: validPriorities.length > 0 ? Math.max(...validPriorities).toFixed(4) : 0,
      
      // 复习统计
      avgReviewCount: items.length > 0
        ? (items.reduce((sum, item) => sum + item.reviewCount, 0) / items.length).toFixed(2)
        : 0,
      avgDifficulty: items.length > 0
        ? (items.reduce((sum, item) => sum + item.difficulty, 0) / items.length).toFixed(2)
        : 0,
      
      // 内存和性能
      memoryUsage,
      memoryUsageFormatted: this._formatBytes(memoryUsage),
      
      // 操作性能统计
      performance: {
        addCount: this.stats.addCount,
        updateCount: this.stats.updateCount,
        getCount: this.stats.getCount,
        avgAddTime: avgAddTime.toFixed(4) + 'ms',
        avgUpdateTime: avgUpdateTime.toFixed(4) + 'ms',
        avgGetTime: avgGetTime.toFixed(4) + 'ms'
      },
      
      // 元数据
      version: this.version,
      lastModified: this.lastModified,
      lastModifiedFormatted: new Date(this.lastModified).toLocaleString()
    };
  }

  /**
   * 估算内存使用量（字节）
   * @returns {number} 估算的内存使用量
   * @private
   */
  _estimateMemoryUsage() {
    let totalBytes = 0;
    
    // 估算每个复习项的大小
    this.wordMap.forEach((item) => {
      // 字符串：word (假设平均10字符)
      totalBytes += item.word.length * 2; // UTF-16编码
      
      // 数字：lastReviewTime, reviewCount, difficulty, priority, nextReviewTime (5个数字)
      totalBytes += 8 * 5; // 每个数字8字节
      
      // 布尔值：mastered
      totalBytes += 4;
      
      // metadata对象（估算）
      totalBytes += JSON.stringify(item.metadata || {}).length * 2;
      
      // 对象开销（估算）
      totalBytes += 64;
    });
    
    // 堆数组开销
    totalBytes += this.heap.size() * 8; // 指针大小
    
    // Map开销
    totalBytes += this.wordMap.size * 32; // Map entry开销
    
    return totalBytes;
  }

  /**
   * 格式化字节数
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的字符串
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 检查内存使用是否超过阈值
   * @param {number} thresholdMB - 阈值（MB）
   * @returns {boolean} 是否超过阈值
   */
  checkMemoryThreshold(thresholdMB = 10) {
    const memoryUsage = this._estimateMemoryUsage();
    const memoryMB = memoryUsage / (1024 * 1024);
    
    if (memoryMB > thresholdMB) {
      console.warn(`[ReviewQueueManager] Memory usage (${memoryMB.toFixed(2)}MB) exceeds threshold (${thresholdMB}MB)`);
      return true;
    }
    
    return false;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReviewQueueManager };
} else if (typeof window !== 'undefined') {
  window.ReviewQueueManager = ReviewQueueManager;
} else if (typeof self !== 'undefined') {
  self.ReviewQueueManager = ReviewQueueManager;
}
