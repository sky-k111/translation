/**
 * IndexedDB存储后端 - 支持大数据集存储
 */
class IndexedDBStorage {
  constructor(dbName = 'translationDB', storeName = 'words') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.dbPromise = this.initDB();
  }

  /**
   * 初始化IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('word', 'word', { unique: true });
          store.createIndex('lastReviewed', 'lastReviewed');
          store.createIndex('nextReviewTime', 'nextReviewTime');
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   */
  async ensureDB() {
    if (!this.db) {
      this.db = await this.dbPromise;
    }
  }

  /**
   * 批量设置数据
   * @param {Array} items - 数据项数组
   */
  async batchSet(items) {
    await this.ensureDB();
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return Promise.all(items.map(item =>
      new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ));
  }

  /**
   * 批量获取数据
   * @param {Array} ids - ID数组
   * @returns {Promise<Array>}
   */
  async batchGet(ids) {
    await this.ensureDB();
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return Promise.all(ids.map(id =>
      new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
    ));
  }

  /**
   * 搜索单词
   * @param {string} query - 搜索查询
   * @returns {Promise<Array>}
   */
  async searchWords(query) {
    await this.ensureDB();
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('word');

    return new Promise((resolve, reject) => {
      const results = [];
      const range = IDBKeyRange.bound(query, query + '\uffff');
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取需要复习的单词
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>}
   */
  async getDueReviews(limit = 50) {
    await this.ensureDB();
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('nextReviewTime');

    return new Promise((resolve, reject) => {
      const results = [];
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空存储
   */
  async clear() {
    await this.ensureDB();
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取存储大小估算
   * @returns {Promise<number>}
   */
  async getStorageSize() {
    // IndexedDB大小估算（简化版）
    return new Promise((resolve) => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          resolve(estimate.usage || 0);
        });
      } else {
        resolve(0);
      }
    });
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.IndexedDBStorage = IndexedDBStorage;
} else if (typeof self !== 'undefined') {
  self.IndexedDBStorage = IndexedDBStorage;
}