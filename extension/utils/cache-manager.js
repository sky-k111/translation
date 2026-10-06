/**
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
