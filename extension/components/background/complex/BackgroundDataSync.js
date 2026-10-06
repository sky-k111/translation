/**
 * Background数据同步组件
 * 5.3.3：迁移Background数据同步功能
 * 封装数据同步功能，包括存储变化监听、数据同步处理和冲突解决
 */
const BackgroundComponent = require('../utils/BackgroundComponent.js');

class BackgroundDataSync extends BackgroundComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      syncInterval: 60000, // 默认同步间隔：60秒
      maxRetryCount: 3,     // 最大重试次数
      retryDelay: 1000      // 重试延迟：1秒
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      isSyncing: false,
      lastSyncTime: null,
      syncQueue: [],
      retryCount: 0,
      registeredSyncHandlers: {},
      isInitialized: false
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.setupStorageListener();
    this.state.isInitialized = true;
  }

  /**
   * 设置存储监听器
   */
  setupStorageListener() {
    // 监听存储变化事件
    this.registerChromeNamespaceListener('storage', 'onChanged', this.handleStorageChange.bind(this));
  }

  /**
   * 处理存储变化
   * @param {Object} changes - 存储变化对象
   * @param {string} areaName - 存储区域名称
   */
  handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;
    
    // 遍历所有变化的键
    for (const key in changes) {
      if (changes.hasOwnProperty(key)) {
        const change = changes[key];
        this.notifySyncHandlers(key, change.oldValue, change.newValue);
      }
    }
  }

  /**
   * 通知同步处理器
   * @param {string} key - 变化的键
   * @param {*} oldValue - 旧值
   * @param {*} newValue - 新值
   */
  notifySyncHandlers(key, oldValue, newValue) {
    // 通知所有注册的同步处理器
    Object.keys(this.state.registeredSyncHandlers).forEach(handlerKey => {
      const handlers = this.state.registeredSyncHandlers[handlerKey];
      handlers.forEach(handler => {
        try {
          handler(key, oldValue, newValue);
        } catch (error) {
          console.error(`同步处理器执行失败 (${handlerKey}):`, error);
        }
      });
    });
  }

  /**
   * 注册同步处理器
   * @param {string} handlerKey - 处理器键名
   * @param {Function} handler - 处理器函数
   */
  registerSyncHandler(handlerKey, handler) {
    if (typeof handler === 'function') {
      if (!this.state.registeredSyncHandlers[handlerKey]) {
        this.state.registeredSyncHandlers[handlerKey] = [];
      }
      this.state.registeredSyncHandlers[handlerKey].push(handler);
    }
  }

  /**
   * 移除同步处理器
   * @param {string} handlerKey - 处理器键名
   * @param {Function} handler - 处理器函数
   */
  removeSyncHandler(handlerKey, handler) {
    if (this.state.registeredSyncHandlers[handlerKey]) {
      this.state.registeredSyncHandlers[handlerKey] = this.state.registeredSyncHandlers[handlerKey].filter(h => h !== handler);
      
      // 如果该键下没有处理器了，删除该键
      if (this.state.registeredSyncHandlers[handlerKey].length === 0) {
        delete this.state.registeredSyncHandlers[handlerKey];
      }
    }
  }

  /**
   * 执行数据同步
   * @param {Object} data - 要同步的数据
   * @param {boolean} immediate - 是否立即同步
   * @returns {Promise<boolean>} - 同步是否成功
   */
  async syncData(data, immediate = false) {
    if (immediate) {
      return this.performSync(data);
    } else {
      // 将数据添加到同步队列
      this.state.syncQueue.push(data);
      return true;
    }
  }

  /**
   * 执行实际的同步操作
   * @param {Object} data - 要同步的数据
   * @returns {Promise<boolean>} - 同步是否成功
   */
  async performSync(data) {
    if (this.state.isSyncing) {
      // 如果正在同步，将数据添加到队列
      this.state.syncQueue.push(data);
      return false;
    }
    
    this.state.isSyncing = true;
    let success = false;
    
    try {
      // 保存数据到Chrome存储
      await this.setStorageData(data);
      
      this.state.lastSyncTime = Date.now();
      this.state.retryCount = 0;
      success = true;
      
      console.log('数据同步成功:', data);
    } catch (error) {
      console.error('数据同步失败:', error);
      
      // 处理重试逻辑
      this.state.retryCount++;
      if (this.state.retryCount <= this.props.maxRetryCount) {
        console.log(`数据同步重试 (${this.state.retryCount}/${this.props.maxRetryCount})...`);
        await this.delay(this.props.retryDelay);
        return this.performSync(data);
      } else {
        console.error('数据同步重试次数已达上限');
        this.state.retryCount = 0;
      }
    } finally {
      this.state.isSyncing = false;
      
      // 处理同步队列中的下一个数据
      if (this.state.syncQueue.length > 0) {
        const nextData = this.state.syncQueue.shift();
        this.performSync(nextData);
      }
    }
    
    return success;
  }

  /**
   * 批量同步数据
   * @param {Array<Object>} dataArray - 要同步的数据数组
   * @returns {Promise<Array<boolean>>} - 每个数据同步是否成功
   */
  async batchSync(dataArray) {
    if (!Array.isArray(dataArray)) {
      throw new Error('数据必须是数组');
    }
    
    const results = [];
    for (const data of dataArray) {
      const result = await this.performSync(data);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 解决数据冲突
   * @param {string} key - 冲突的键
   * @param {*} localValue - 本地值
   * @param {*} remoteValue - 远程值
   * @param {Function} resolveFn - 冲突解决函数
   * @returns {*} - 解决后的值
   */
  resolveConflict(key, localValue, remoteValue, resolveFn) {
    if (typeof resolveFn === 'function') {
      return resolveFn(key, localValue, remoteValue);
    }
    
    // 默认冲突解决策略：使用最新的值
    if (localValue && remoteValue) {
      // 假设值包含timestamp字段
      if (localValue.timestamp && remoteValue.timestamp) {
        return localValue.timestamp > remoteValue.timestamp ? localValue : remoteValue;
      }
    }
    
    // 默认使用远程值
    return remoteValue;
  }

  /**
   * 启动定期同步
   */
  startPeriodicSync() {
    if (this.periodicSyncTimer) {
      this.stopPeriodicSync();
    }
    
    this.periodicSyncTimer = setInterval(() => {
      this.performPeriodicSync();
    }, this.props.syncInterval);
  }

  /**
   * 停止定期同步
   */
  stopPeriodicSync() {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.periodicSyncTimer = null;
    }
  }

  /**
   * 执行定期同步
   */
  async performPeriodicSync() {
    try {
      console.log('执行定期数据同步...');
      
      // 这里可以添加定期同步的逻辑
      // 例如：检查服务器数据更新、同步本地数据到服务器等
      
      // 目前仅记录同步时间
      this.state.lastSyncTime = Date.now();
      
      console.log('定期数据同步完成');
    } catch (error) {
      console.error('定期数据同步失败:', error);
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟时间（毫秒）
   * @returns {Promise<void>} - 延迟完成的Promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取同步状态
   * @returns {Object} - 同步状态
   */
  getSyncStatus() {
    return {
      isSyncing: this.state.isSyncing,
      lastSyncTime: this.state.lastSyncTime,
      syncQueueLength: this.state.syncQueue.length,
      retryCount: this.state.retryCount
    };
  }

  /**
   * 清空同步队列
   */
  clearSyncQueue() {
    this.state.syncQueue = [];
  }

  /**
   * 检查组件是否已初始化
   * @returns {boolean} - 是否已初始化
   */
  isInitialized() {
    return this.state.isInitialized;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 停止定期同步
    this.stopPeriodicSync();
    
    // 清空同步队列
    this.clearSyncQueue();
    
    // 清空注册的同步处理器
    this.state.registeredSyncHandlers = {};
    
    super.destroy();
  }
}

// 导出组件
module.exports = BackgroundDataSync;