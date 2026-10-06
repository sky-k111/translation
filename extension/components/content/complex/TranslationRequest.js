/**
 * 翻译请求组件，用于处理翻译请求的发送和管理
 * 5.2.2：迁移翻译请求处理功能到组件
 */
const ContentComponent = require('../utils/ContentComponent.js');

class TranslationRequest extends ContentComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {number} props.maxConcurrentRequests - 最大并发请求数
   * @param {number} props.requestTimeout - 请求超时时间（毫秒）
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      maxConcurrentRequests: 3,
      requestTimeout: 5000
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.runningRequests = 0;
    this.pendingRequests = new Map();
    this.requestQueue = [];
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      mergedRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
  }

  /**
   * 添加翻译请求
   * @param {string} text - 待翻译文本
   * @param {string} context - 上下文
   * @param {boolean} skipAI - 是否跳过AI翻译
   * @param {number} priority - 请求优先级（0-100，默认50）
   * @returns {Promise<Object>} - 翻译结果Promise
   */
  addRequest(text, context = '', skipAI = false, priority = 50) {
    const cacheKey = `${text.toLowerCase().trim()}:${context.toLowerCase().trim()}:${skipAI}`;
    
    // 检查是否已经有相同的请求在处理中
    if (this.pendingRequests.has(cacheKey)) {
      this.stats.mergedRequests++;
      return this.pendingRequests.get(cacheKey);
    }
    
    // 创建新的请求
    const request = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      context,
      skipAI,
      priority,
      cacheKey,
      startTime: Date.now(),
      promise: new Promise((resolve, reject) => {
        this._executeRequest({ text, context, skipAI }, resolve, reject, cacheKey);
      })
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
    
    try {
      // 增加运行的请求数
      this.runningRequests++;
      
      // 执行翻译请求，添加超时处理
      const response = await Promise.race([
        this.sendMessage({
          type: 'SMART_TRANSLATE',
          text: requestData.text,
          context: requestData.context,
          skipAI: requestData.skipAI
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), this.props.requestTimeout))
      ]);
      
      // 处理翻译结果
      if (response && response.ok && response.result && response.result.translation) {
        resolve(response.result);
      } else {
        reject(new Error('翻译失败'));
      }
      
      // 更新统计信息
      this.stats.completedRequests++;
      
      // 更新响应时间统计
      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.completedRequests;
    } catch (error) {
      console.error('翻译请求失败:', error);
      reject(error);
      
      // 更新统计信息
      this.stats.failedRequests++;
    } finally {
      // 减少运行的请求数
      this.runningRequests--;
      
      // 移除待处理的请求
      this.pendingRequests.delete(cacheKey);
      
      // 从请求队列中移除已处理的请求
      this.requestQueue = this.requestQueue.filter(req => req.cacheKey !== cacheKey);
      
      // 继续处理队列中的其他请求
      this._processQueue();
    }
  }

  /**
   * 处理请求队列
   */
  _processQueue() {
    // 检查是否可以处理更多请求
    while (this.runningRequests < this.props.maxConcurrentRequests && this.requestQueue.length > 0) {
      // 获取下一个请求
      const request = this.requestQueue.shift();
      
      // 重新执行请求
      this._executeRequest(
        { text: request.text, context: request.context, skipAI: request.skipAI },
        (result) => {
          // 请求成功，不需要额外处理，因为Promise已经在addRequest中创建
        },
        (error) => {
          // 请求失败，不需要额外处理，因为Promise已经在addRequest中创建
        },
        request.cacheKey
      );
    }
  }

  /**
   * 获取当前运行的请求数
   * @returns {number} - 运行的请求数
   */
  getRunningRequestsCount() {
    return this.runningRequests;
  }

  /**
   * 获取待处理的请求数
   * @returns {number} - 待处理的请求数
   */
  getPendingRequestsCount() {
    return this.pendingRequests.size;
  }

  /**
   * 获取统计信息
   * @returns {Object} - 统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
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

  /**
   * 渲染组件
   * @returns {HTMLElement|null} - 组件DOM元素，此组件无可见DOM
   */
  render() {
    // 此组件无可见DOM，返回null
    return null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清空请求队列
    this.requestQueue = [];
    this.pendingRequests.clear();
    
    super.destroy();
  }
}

// 导出组件
module.exports = TranslationRequest;
