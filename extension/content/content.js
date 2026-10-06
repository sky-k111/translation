(() => {
const scriptVersion = '2.1.7';
if (window.__TRANSLATION_ASSISTANT_READY?.version === scriptVersion &&
    window.__TRANSLATION_ASSISTANT_READY.extensionId === chrome.runtime.id) return;
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

// 图片懒加载器实例
let lazyImageLoader = null;

// 初始化图片懒加载器
function initLazyImageLoader() {
  if (!lazyImageLoader && typeof LazyImageLoader !== 'undefined') {
    lazyImageLoader = new LazyImageLoader({ rootMargin: '100px' });
    lazyImageLoader.observeAll();
    
    // 监听DOM变化，自动观察新图片
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const images = node.matches?.('img[data-src]') ? [node] : node.querySelectorAll?.('img[data-src]') || [];
            images.forEach(img => lazyImageLoader.observe(img));
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

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
  const cacheKey = 'auto:zh-en:v2:' + text.trim() + ':' + context.trim();
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
    phoneticHtml = `<div class="tooltip-phonetic">${phonetic}</div>`;
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
  
  // 获取POS分析（如果翻译结果中包含）
  let posAnalysis = completeTranslation.posAnalysis || null;
  
  // 初始渲染，传递完整的翻译信息
  await renderPopup({
    text: word,
    translation: completeTranslation.translation,
    rect,
    count,
    phonetic: completeTranslation.phonetic || phonetic,
    partOfSpeech: completeTranslation.partOfSpeech || partOfSpeech,
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
    const nextPhonetic = phonetic || phoneticData.phonetic;
    const nextMeanings = phoneticData.meanings || [];
    const nextPartOfSpeech = partOfSpeech || phoneticData.partOfSpeech;
    
    // 如果有新数据，重新渲染
    if (nextMeanings.length > 0 || nextPhonetic !== phonetic || nextPartOfSpeech !== partOfSpeech) {
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
async function showTranslationPopup(text, translation, rect, count = 1, context = '') {
  const isWordPhrase = isWordOrPhrase(text);
  const wordLower = text.toLowerCase().trim();
  
  // 获取音标和词性（如果还没有缓存）
  let phonetic = null;
  let partOfSpeech = null;
  let meanings = [];
  
  if (isWordPhrase) {
    const phoneticData = await getPhoneticAndPartOfSpeech(wordLower);
    phonetic = phoneticData.phonetic;
    partOfSpeech = phoneticData.partOfSpeech;
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
    await showTranslationPopup(text, translation, rect, count, context);
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
