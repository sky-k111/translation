/**
 * Service Worker缓存策略 - 支持离线翻译
 */
class ServiceWorkerCache {
  constructor() {
    this.cacheName = 'translation-cache-v1';
    this.apiCacheName = 'translation-api-v1';
    this.maxCacheSize = 100; // 最大缓存条目数
  }

  /**
   * 安装Service Worker
   */
  async install() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/extension/workers/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * 缓存翻译结果
   * @param {string} text - 原文
   * @param {Object} result - 翻译结果
   */
  async cacheTranslation(text, result) {
    const cacheKey = `translate_${btoa(text).slice(0, 50)}`;
    const cache = await caches.open(this.cacheName);
    const response = new Response(JSON.stringify({
      text,
      result,
      timestamp: Date.now()
    }));

    await cache.put(cacheKey, response);

    // 限制缓存大小
    await this._limitCacheSize(cache);
  }

  /**
   * 获取缓存的翻译结果
   * @param {string} text - 原文
   * @returns {Promise<Object|null>}
   */
  async getCachedTranslation(text) {
    const cacheKey = `translate_${btoa(text).slice(0, 50)}`;
    const cache = await caches.open(this.cacheName);
    const response = await cache.match(cacheKey);

    if (response) {
      const data = await response.json();
      // 检查缓存是否过期（24小时）
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.result;
      } else {
        // 删除过期缓存
        await cache.delete(cacheKey);
      }
    }
    return null;
  }

  /**
   * 缓存API响应
   * @param {string} url - API URL
   * @param {Response} response - API响应
   */
  async cacheAPIResponse(url, response) {
    const cache = await caches.open(this.apiCacheName);
    await cache.put(url, response.clone());
  }

  /**
   * 获取缓存的API响应
   * @param {string} url - API URL
   * @returns {Promise<Response|null>}
   */
  async getCachedAPIResponse(url) {
    const cache = await caches.open(this.apiCacheName);
    const response = await cache.match(url);
    return response || null;
  }

  /**
   * 限制缓存大小
   * @param {Cache} cache - 缓存实例
   */
  async _limitCacheSize(cache) {
    const keys = await cache.keys();
    if (keys.length > this.maxCacheSize) {
      // 删除最旧的缓存
      const keysToDelete = keys.slice(0, keys.length - this.maxCacheSize);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache() {
    const cache = await caches.open(this.cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
          await cache.delete(request);
        }
      }
    }
  }

  /**
   * 获取缓存统计
   * @returns {Promise<Object>}
   */
  async getCacheStats() {
    const [translationCache, apiCache] = await Promise.all([
      caches.open(this.cacheName),
      caches.open(this.apiCacheName)
    ]);

    const [translationKeys, apiKeys] = await Promise.all([
      translationCache.keys(),
      apiCache.keys()
    ]);

    return {
      translationCacheSize: translationKeys.length,
      apiCacheSize: apiKeys.length,
      maxCacheSize: this.maxCacheSize
    };
  }
}

// 离线优先翻译管理器
class OfflineFirstTranslationManager {
  constructor() {
    this.cache = new ServiceWorkerCache();
    this.indexedDB = null;
  }

  async init() {
    // 安装Service Worker
    await this.cache.install();

    // 初始化IndexedDB（如果需要）
    if (typeof IndexedDBStorage !== 'undefined') {
      this.indexedDB = new IndexedDBStorage();
    }

    // 定期清理缓存
    setInterval(() => this.cache.cleanupExpiredCache(), 60 * 60 * 1000); // 每小时清理
  }

  /**
   * 翻译文本（离线优先）
   * @param {string} text - 要翻译的文本
   * @param {Function} onlineTranslator - 在线翻译函数
   * @returns {Promise<Object>}
   */
  async translate(text, onlineTranslator) {
    // 1. 检查缓存
    let result = await this.cache.getCachedTranslation(text);
    if (result) {
      console.log('使用缓存翻译结果');
      return { ...result, source: 'cache' };
    }

    // 2. 检查IndexedDB（如果启用）
    if (this.indexedDB) {
      try {
        const cached = await this.indexedDB.searchWords(text);
        if (cached.length > 0 && cached[0].translation) {
          result = { translation: cached[0].translation };
          console.log('使用IndexedDB缓存');
          return { ...result, source: 'indexeddb' };
        }
      } catch (error) {
        console.warn('IndexedDB查询失败:', error);
      }
    }

    // 3. 在线翻译
    try {
      result = await onlineTranslator(text);
      if (result) {
        // 缓存结果
        await this.cache.cacheTranslation(text, result);
        if (this.indexedDB) {
          await this.indexedDB.batchSet([{
            id: `word_${Date.now()}`,
            word: text,
            translation: result.translation,
            timestamp: Date.now()
          }]);
        }
      }
      return { ...result, source: 'online' };
    } catch (error) {
      // 4. 离线降级：返回提示
      console.warn('在线翻译失败:', error);
      return {
        translation: '[离线模式 - 请检查网络连接]',
        source: 'offline'
      };
    }
  }

  /**
   * 获取复习单词（离线优先）
   * @returns {Promise<Array>}
   */
  async getReviewWords() {
    if (this.indexedDB) {
      try {
        return await this.indexedDB.getDueReviews();
      } catch (error) {
        console.warn('IndexedDB复习查询失败:', error);
      }
    }
    return [];
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.ServiceWorkerCache = ServiceWorkerCache;
  window.OfflineFirstTranslationManager = OfflineFirstTranslationManager;
} else if (typeof self !== 'undefined') {
  self.ServiceWorkerCache = ServiceWorkerCache;
  self.OfflineFirstTranslationManager = OfflineFirstTranslationManager;
}