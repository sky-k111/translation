/**
 * 单词翻译助手 - 存储优化工具模块
 * 提供批量写入、压缩、重试、索引等存储优化功能
 */

// 动态导入依赖（延迟加载以避免循环依赖）
let Trie = null;
let ReviewQueueHeap = null;
let IndexedDBStorage = null;
let ServiceWorkerCache = null;
let OfflineFirstTranslationManager = null;

const loadDependencies = async () => {
  if (!Trie) {
    try {
      const { Trie: TrieClass } = await import('./trie-index.js');
      Trie = TrieClass;
    } catch (error) {
      console.warn('Trie index not available:', error);
    }
  }
  if (!ReviewQueueHeap) {
    try {
      const { ReviewQueueHeap: HeapClass } = await import('./heap.js');
      ReviewQueueHeap = HeapClass;
    } catch (error) {
      console.warn('Heap not available:', error);
    }
  }
  if (!IndexedDBStorage) {
    try {
      const { IndexedDBStorage: IDBClass } = await import('./indexeddb-storage.js');
      IndexedDBStorage = IDBClass;
    } catch (error) {
      console.warn('IndexedDB storage not available:', error);
    }
  }
  if (!ServiceWorkerCache) {
    try {
      const { ServiceWorkerCache: SWCacheClass } = await import('./service-worker-cache.js');
      ServiceWorkerCache = SWCacheClass;
    } catch (error) {
      console.warn('Service Worker cache not available:', error);
    }
  }
  if (!OfflineFirstTranslationManager) {
    try {
      const { OfflineFirstTranslationManager: OFTMClass } = await import('./service-worker-cache.js');
      OfflineFirstTranslationManager = OFTMClass;
    } catch (error) {
      console.warn('Offline-first manager not available:', error);
    }
  }
};

// 简单压缩实现（替代lz-string，避免外部依赖）
class SimpleCompressor {
  compress(data) {
    const jsonStr = JSON.stringify(data);
    if (jsonStr.length < 1024) return jsonStr; // 小数据不压缩
    // 简单压缩：移除多余空格
    return jsonStr.replace(/\s+/g, ' ').replace(/,\s+/g, ',');
  }

  decompress(compressedData) {
    if (compressedData.startsWith('{') || compressedData.startsWith('[')) {
      return JSON.parse(compressedData);
    }
    return JSON.parse(compressedData); // 假设是简化JSON
  }
}

const compressor = new SimpleCompressor();

/**
 * 批量存储操作类
 */
class BatchStorageOps {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1秒基础延迟
    this.maxBatchSize = 50; // 最大批量大小
  }

  /**
   * 批量设置存储项
   * @param {Object} items - 要设置的键值对
   * @returns {Promise<void>}
   */
  async batchSet(items) {
    const entries = Object.entries(items);
    const batches = this._chunkArray(entries, this.maxBatchSize);

    for (const batch of batches) {
      const batchObj = Object.fromEntries(batch);
      await this._retryOperation(() => chrome.storage.local.set(batchObj));
    }
  }

  /**
   * 批量获取存储项
   * @param {Array<string>} keys - 要获取的键
   * @returns {Promise<Object>}
   */
  async batchGet(keys) {
    const batches = this._chunkArray(keys, this.maxBatchSize);
    const results = {};

    for (const batch of batches) {
      const batchResult = await this._retryOperation(() => chrome.storage.local.get(batch));
      Object.assign(results, batchResult);
    }

    return results;
  }

  /**
   * 压缩数据
   * @param {any} data - 要压缩的数据
   * @returns {string} 压缩后的字符串
   */
  compress(data) {
    return compressor.compress(data);
  }

  /**
   * 解压数据
   * @param {string} compressedData - 压缩的数据
   * @returns {any} 解压后的数据
   */
  decompress(compressedData) {
    return compressor.decompress(compressedData);
  }

  /**
   * 指数退避重试操作
   * @param {Function} operation - 要重试的操作函数
   * @returns {Promise<any>}
   */
  async _retryOperation(operation) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this._delay(delay);
        }
      }
    }
    throw lastError;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 将数组分块
   * @param {Array} array - 要分块的数组
   * @param {number} size - 每块大小
   * @returns {Array<Array>} 分块后的数组
   */
  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// 创建全局实例
const batchStorageOps = new BatchStorageOps();

/**
 * 复习队列管理类 - 简单排序优化
 */
class ReviewQueueManager {
  constructor() {
    this.queue = [];
  }

  /**
   * 添加单词到复习队列
   * @param {Object} wordItem - 单词项，包含nextReviewTime等
   */
  addToQueue(wordItem) {
    this.queue.push(wordItem);
    this._sortQueue();
  }

  /**
   * 获取下一个需要复习的单词
   * @returns {Object|null} 下一个单词或null
   */
  getNextReview() {
    const now = Date.now();
    return this.queue.find(item => (item.nextReviewTime || 0) <= now) || null;
  }

  /**
   * 更新单词复习时间
   * @param {string} word - 单词
   * @param {number} nextReviewTime - 下次复习时间
   */
  updateReviewTime(word, nextReviewTime) {
    const item = this.queue.find(q => q.word === word);
    if (item) {
      item.nextReviewTime = nextReviewTime;
      this._sortQueue();
    }
  }

  /**
   * 获取队列长度
   * @returns {number} 队列长度
   */
  size() {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  clear() {
    this.queue = [];
  }

  /**
   * 排序队列（按nextReviewTime升序）
   */
  _sortQueue() {
    this.queue.sort((a, b) => (a.nextReviewTime || 0) - (b.nextReviewTime || 0));
  }
}

// 索引管理器
class IndexManager {
  constructor() {
    this.trieIndex = null;
    this.reviewHeap = null;
    this.indexedDB = null;
    this.swCache = null;
    this.offlineManager = null;
    this.initialized = false;
    this.useIndexedDB = false; // 是否使用IndexedDB（大数据集）
  }

  async init() {
    if (this.initialized) return;

    await loadDependencies();

    if (Trie) {
      this.trieIndex = new Trie();
    }
    if (ReviewQueueHeap) {
      this.reviewHeap = new ReviewQueueHeap();
    }
    if (IndexedDBStorage) {
      this.indexedDB = new IndexedDBStorage();
    }
    if (ServiceWorkerCache) {
      this.swCache = new ServiceWorkerCache();
    }
    if (OfflineFirstTranslationManager) {
      this.offlineManager = new OfflineFirstTranslationManager();
      await this.offlineManager.init();
    }

    // 决定是否使用IndexedDB
    this.useIndexedDB = await this._shouldUseIndexedDB();

    this.initialized = true;
  }

  /**
   * 判断是否应该使用IndexedDB
   * @returns {Promise<boolean>}
   */
  async _shouldUseIndexedDB() {
    if (!this.indexedDB) return false;

    try {
      const size = await this.indexedDB.getStorageSize();
      // 如果数据超过5MB，使用IndexedDB
      return size > 5 * 1024 * 1024;
    } catch (error) {
      return false;
    }
  }

  /**
   * 构建单词索引
   * @param {Object} wordsData - 单词数据对象
   */
  buildWordIndex(wordsData) {
    if (!this.trieIndex) return;

    this.trieIndex = new Trie(); // 重建
    Object.entries(wordsData).forEach(([word, data]) => {
      this.trieIndex.insert(word, { word, ...data });
    });
  }

  /**
   * 搜索单词
   * @param {string} query - 搜索查询
   * @returns {Array} 匹配结果
   */
  async searchWords(query) {
    // 优先使用IndexedDB（大数据集）
    if (this.useIndexedDB && this.indexedDB) {
      try {
        return await this.indexedDB.searchWords(query);
      } catch (error) {
        console.warn('IndexedDB search failed, falling back to Trie:', error);
      }
    }

    // 回退到Trie索引
    if (!this.trieIndex) return [];

    // 精确匹配
    const exactMatch = this.trieIndex.search(query);
    if (exactMatch) return [exactMatch];

    // 前缀匹配
    return this.trieIndex.startsWith(query);
  }

  /**
   * 管理复习队列
   * @param {Array} reviewItems - 复习项数组
   */
  updateReviewQueue(reviewItems) {
    if (!this.reviewHeap) return;

    this.reviewHeap.clear();
    reviewItems.forEach(item => {
      this.reviewHeap.addReviewItem(item);
    });
  }

  /**
   * 获取下一个复习项
   * @returns {Object|null} 复习项
   */
  getNextReview() {
    return this.reviewHeap ? this.reviewHeap.getNextReview() : null;
  }

  /**
   * 更新复习时间
   * @param {string} word - 单词
   * @param {number} newTime - 新时间
   */
  updateReviewTime(word, newTime) {
    if (this.reviewHeap) {
      this.reviewHeap.updateReviewTime(word, newTime);
    }
  }

  /**
   * 离线优先翻译
   * @param {string} text - 要翻译的文本
   * @param {Function} onlineTranslator - 在线翻译函数
   * @returns {Promise<Object>} 翻译结果
   */
  async translateOfflineFirst(text, onlineTranslator) {
    if (this.offlineManager) {
      return await this.offlineManager.translate(text, onlineTranslator);
    }
    // 回退到在线翻译
    return await onlineTranslator(text);
  }

  /**
   * 获取缓存统计
   * @returns {Promise<Object>} 缓存统计信息
   */
  async getCacheStats() {
    if (this.swCache) {
      return await this.swCache.getCacheStats();
    }
    return { translationCacheSize: 0, apiCacheSize: 0 };
  }
}

// 创建全局实例
const reviewQueueManager = new ReviewQueueManager();
const indexManager = new IndexManager();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BatchStorageOps,
    batchStorageOps,
    ReviewQueueManager,
    reviewQueueManager,
    IndexManager,
    indexManager
  };
} else if (typeof window !== 'undefined') {
  window.BatchStorageOps = BatchStorageOps;
  window.batchStorageOps = batchStorageOps;
  window.ReviewQueueManager = ReviewQueueManager;
  window.reviewQueueManager = reviewQueueManager;
  window.IndexManager = IndexManager;
  window.indexManager = indexManager;
} else if (typeof self !== 'undefined') {
  self.BatchStorageOps = BatchStorageOps;
  self.batchStorageOps = batchStorageOps;
  self.ReviewQueueManager = ReviewQueueManager;
  self.reviewQueueManager = reviewQueueManager;
  self.IndexManager = IndexManager;
  self.indexManager = indexManager;
}