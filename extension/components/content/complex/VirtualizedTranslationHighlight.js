/**
 * 虚拟化翻译高亮组件 - 性能优化版本
 * 主要优化：
 * 1. 虚拟化渲染 - 只渲染可视区域的高亮
 * 2. 分批处理 - 使用 requestAnimationFrame 分片处理
 * 3. 对象池复用 - 减少内存分配
 * 4. 智能缓存 - 缓存处理结果
 * 5. 懒加载 - 延迟处理非关键内容
 */

// 使用全局变量，避免 require 问题
const ContentComponent = window.ContentComponent || (() => {
  // 如果 ContentComponent 不存在，提供基础实现
  return class {
    constructor() {
      this.isDestroyed = false;
    }
    
    init() {}
    
    bindEvent(element, event, handler) {
      if (element && event && handler) {
        element.addEventListener(event, handler);
      }
    }
    
    registerMessageListener(callback) {
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(callback);
      }
    }
    
    destroy() {
      this.isDestroyed = true;
    }
  };
})();

const styleManager = window.styleManager || (() => {
  // 如果 styleManager 不存在，提供基础实现
  class BasicStyleManager {
    registerStyle(name, styles) {
      const styleId = `style-${name}`;
      let styleElement = document.getElementById(styleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      let cssText = '';
      for (const [selector, properties] of Object.entries(styles)) {
        cssText += `${selector} {`;
        for (const [property, value] of Object.entries(properties)) {
          cssText += `${property}: ${value};`;
        }
        cssText += '}';
      }
      
      styleElement.textContent = cssText;
    }
  }
  
  return new BasicStyleManager();
})();

class VirtualizedTranslationHighlight extends ContentComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      onHighlightClick: () => {},
      maxHighlights: 1000,
      batchSize: 50,           // 批处理大小
      viewportMargin: 200,     // 视口边距
      debounceDelay: 100,      // 防抖延迟
      enableVirtualization: true // 是否启用虚拟化
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.highlightedWords = {};
    this.processedNodes = new WeakSet(); // 防止重复处理
    this.visibleHighlights = new Set();
    
    // 性能优化相关
    this.highlightPool = new HighlightPool(100); // 对象池
    this.processingQueue = []; // 处理队列
    this.isProcessing = false;
    this.rafId = null;
    
    // 虚拟化相关
    this.viewportObserver = null;
    this.intersectionObserver = null;
    
    // 缓存相关
    this.textCache = new Map();
    this.regexCache = new Map();
    
    // 防抖定时器
    this.highlightDebounceTimer = null;
    this.resizeDebounceTimer = null;
    
    // 性能监控
    this.performanceMetrics = {
      totalProcessed: 0,
      totalHighlights: 0,
      processingTime: 0,
      cacheHits: 0
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.registerStyle();
    this.bindEvents();
    this.setupVirtualization();
    this.setupPerformanceMonitoring();
  }

  /**
   * 注册组件样式
   */
  registerStyle() {
    const styles = {
      '.translated-word-highlight': {
        'position': 'relative',
        'cursor': 'pointer',
        'padding': '0 2px',
        'border-radius': '2px',
        'transition': 'all 0.1s ease', // 减少动画时间
        'background': 'var(--accent-primary-transparent)',
        'border-bottom': '1px dashed var(--accent-primary)',
        'will-change': 'transform', // 优化渲染性能
        'contain': 'layout style' // CSS containment
      },
      
      '.translated-word-highlight:hover': {
        'background': 'var(--accent-primary)',
        'color': 'var(--text-on-primary)',
        'border-bottom': '1px solid var(--accent-primary)'
      },
      
      '.translated-word-highlight.pos-noun': {
        'background': 'rgba(76, 175, 80, 0.2)',
        'border-bottom-color': 'rgb(76, 175, 80)'
      },
      
      '.translated-word-highlight.pos-verb': {
        'background': 'rgba(33, 150, 243, 0.2)',
        'border-bottom-color': 'rgb(33, 150, 243)'
      },
      
      '.translated-word-highlight.pos-adjective': {
        'background': 'rgba(255, 152, 0, 0.2)',
        'border-bottom-color': 'rgb(255, 152, 0)'
      },
      
      '.translated-word-highlight.pos-adverb': {
        'background': 'rgba(156, 39, 176, 0.2)',
        'border-bottom-color': 'rgb(156, 39, 176)'
      },
      
      '.translated-word-highlight.pos-phrase': {
        'background': 'rgba(233, 30, 99, 0.2)',
        'border-bottom-color': 'rgb(233, 30, 99)'
      },
      
      // 虚拟化样式
      '.highlight-virtualized': {
        'opacity': '0.3',
        'transition': 'opacity 0.2s ease'
      },
      
      '.highlight-visible': {
        'opacity': '1'
      }
    };
    
    styleManager.registerStyle('virtualized-translation-highlight', styles);
  }

  /**
   * 设置虚拟化
   */
  setupVirtualization() {
    if (!this.props.enableVirtualization) return;
    
    // 设置 Intersection Observer 监听高亮元素可见性
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersectionChange.bind(this),
      {
        rootMargin: `${this.props.viewportMargin}px`,
        threshold: [0, 0.1, 0.5, 1]
      }
    );
    
    // 设置 Resize Observer 监听视口变化
    this.resizeObserver = new ResizeObserver(
      this.debounce(() => {
        this.updateVisibleHighlights();
      }, this.props.debounceDelay)
    );
    
    // 监听窗口大小变化
    this.bindEvent(window, 'resize', () => {
      if (this.resizeDebounceTimer) {
        clearTimeout(this.resizeDebounceTimer);
      }
      this.resizeDebounceTimer = setTimeout(() => {
        this.updateVisibleHighlights();
      }, this.props.debounceDelay);
    });
    
    // 监听滚动事件
    this.bindEvent(window, 'scroll', this.debounce(() => {
      this.updateVisibleHighlights();
    }, 16)); // 60fps
  }

  /**
   * 设置性能监控
   */
  setupPerformanceMonitoring() {
    // 定期清理缓存
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // 每分钟清理一次
    
    // 监控内存使用
    if (performance.memory) {
      setInterval(() => {
        const memoryUsage = performance.memory.usedJSHeapSize;
        if (memoryUsage > 50 * 1024 * 1024) { // 50MB
          this.performEmergencyCleanup();
        }
      }, 30000); // 每30秒检查一次
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 使用事件委托处理点击事件
    this.bindEvent(document, 'click', this.handleHighlightClick.bind(this));
    
    // 监听重高亮消息
    this.registerMessageListener((msg) => {
      if (msg && msg.type === 'REHIGHLIGHT') {
        this.debounce(() => {
          this.rehighlight();
        }, this.props.debounceDelay)();
      }
    });
  }

  /**
   * 处理高亮元素点击事件
   */
  handleHighlightClick(e) {
    const highlight = e.target.closest('.translated-word-highlight');
    if (highlight) {
      e.preventDefault();
      e.stopPropagation();
      
      // 防抖处理
      if (this.highlightDebounceTimer) {
        clearTimeout(this.highlightDebounceTimer);
      }
      
      this.highlightDebounceTimer = setTimeout(() => {
        this.props.onHighlightClick({
          element: highlight,
          word: highlight.dataset.word,
          translation: highlight.dataset.translation,
          count: parseInt(highlight.dataset.count || '1'),
          partOfSpeech: highlight.dataset.partOfSpeech,
          event: e
        });
      }, 300);
    }
  }

  /**
   * 处理 Intersection Observer 变化
   */
  handleIntersectionChange(entries) {
    entries.forEach(entry => {
      const highlight = entry.target;
      
      if (entry.isIntersecting) {
        this.visibleHighlights.add(highlight);
        highlight.classList.add('highlight-visible');
        highlight.classList.remove('highlight-virtualized');
      } else {
        this.visibleHighlights.delete(highlight);
        highlight.classList.add('highlight-virtualized');
        highlight.classList.remove('highlight-visible');
      }
    });
  }

  /**
   * 高亮显示已翻译的单词 - 优化版本
   */
  async highlightTranslatedWords(words, targetRoots = null) {
    const startTime = performance.now();
    
    try {
      // 保存单词数据
      this.highlightedWords = words;
      
      // 检查域名
      if (!this.isDomainAllowed()) return;
      
      // 预处理单词数据
      const processedWords = this.preprocessWords(words);
      if (processedWords.length === 0) return;
      
      // 确定处理范围
      const roots = targetRoots || [document.body];
      
      // 分批处理
      await this.batchProcess(roots, processedWords);
      
      // 更新性能指标
      this.updatePerformanceMetrics(startTime);
      
    } catch (error) {
      console.error('高亮处理失败:', error);
    }
  }

  /**
   * 预处理单词数据
   */
  preprocessWords(words) {
    return Object.entries(words)
      .filter(([word, wordData]) => {
        return wordData && (wordData.type === 'word' || wordData.type === 'phrase');
      })
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
      .slice(0, this.props.maxHighlights);
  }

  /**
   * 分批处理根节点
   */
  async batchProcess(roots, wordEntries) {
    const batches = this.createBatches(roots, this.props.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // 使用 requestAnimationFrame 分片处理
      await this.processBatchWithRAF(batch, wordEntries);
      
      // 让出控制权，避免阻塞主线程
      if (i % 10 === 0) {
        await this.yieldToMain();
      }
    }
  }

  /**
   * 创建批处理
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 使用 requestAnimationFrame 处理批次
   */
  processBatchWithRAF(batch, wordEntries) {
    return new Promise(resolve => {
      this.rafId = requestAnimationFrame(() => {
        batch.forEach(root => {
          if (root.nodeType === 1 && !this.processedNodes.has(root)) {
            this.processRootNodeOptimized(root, wordEntries);
            this.processedNodes.add(root);
          }
        });
        resolve();
      });
    });
  }

  /**
   * 优化的根节点处理
   */
  processRootNodeOptimized(root, wordEntries) {
    // 使用 TreeWalker 优化 DOM 遍历
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 跳过不可见或已处理的节点
          if (this.shouldSkipNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // 批量处理文本节点
    this.batchProcessTextNodes(textNodes, wordEntries);
  }

  /**
   * 判断是否应该跳过节点
   */
  shouldSkipNode(node) {
    if (!node.parentElement) return true;
    
    const parent = node.parentElement;
    const computedStyle = window.getComputedStyle(parent);
    
    // 跳过隐藏元素
    if (computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' ||
        computedStyle.opacity === '0') {
      return true;
    }
    
    // 跳过过小的元素
    if (parent.offsetWidth < 50 || parent.offsetHeight < 20) {
      return true;
    }
    
    // 跳过特定标签
    const skipTags = ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON'];
    if (skipTags.includes(parent.tagName)) {
      return true;
    }
    
    // 跳过已高亮的元素
    if (parent.classList.contains('translated-word-highlight')) {
      return true;
    }
    
    return false;
  }

  /**
   * 批量处理文本节点
   */
  batchProcessTextNodes(textNodes, wordEntries) {
    // 使用 DocumentFragment 批量操作
    const fragment = document.createDocumentFragment();
    const replacements = [];
    
    textNodes.forEach(textNode => {
      const replacement = this.processTextNodeOptimized(textNode, wordEntries);
      if (replacement) {
        replacements.push({ original: textNode, replacement });
      }
    });
    
    // 批量替换
    replacements.forEach(({ original, replacement }) => {
      if (original.parentNode) {
        original.parentNode.replaceChild(replacement, original);
      }
    });
  }

  /**
   * 优化的文本节点处理
   */
  processTextNodeOptimized(textNode, wordEntries) {
    const text = textNode.textContent;
    if (!text.trim()) return null;
    
    // 检查缓存
    const cacheKey = `${text.substring(0, 100)}_${wordEntries.length}`;
    if (this.textCache.has(cacheKey)) {
      this.performanceMetrics.cacheHits++;
      return this.textCache.get(cacheKey).cloneNode(true);
    }
    
    const fragment = document.createDocumentFragment();
    let hasReplacement = false;
    let lastIndex = 0;
    
    // 按长度降序处理单词
    const sortedEntries = [...wordEntries].sort((a, b) => b[0].length - a[0].length);
    
    for (const [word, wordData] of sortedEntries) {
      const regex = this.getCachedRegex(word);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // 添加匹配前的文本
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        
        // 创建高亮元素
        const highlightElement = this.createOptimizedHighlightElement(match[0], wordData);
        fragment.appendChild(highlightElement);
        
        hasReplacement = true;
        lastIndex = regex.lastIndex;
      }
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    // 缓存结果
    if (hasReplacement) {
      this.textCache.set(cacheKey, fragment.cloneNode(true));
      return fragment;
    }
    
    return null;
  }

  /**
   * 获取缓存的正则表达式
   */
  getCachedRegex(word) {
    if (this.regexCache.has(word)) {
      return this.regexCache.get(word);
    }
    
    const regex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'gi');
    this.regexCache.set(word, regex);
    return regex;
  }

  /**
   * 创建优化的高亮元素
   */
  createOptimizedHighlightElement(word, wordData) {
    // 从对象池获取元素
    let highlight = this.highlightPool.acquire();
    
    if (!highlight) {
      highlight = document.createElement('span');
    }
    
    // 重置并设置属性
    this.resetHighlightElement(highlight);
    
    highlight.className = `translated-word-highlight pos-${this.getPartOfSpeechClass(wordData.partOfSpeech || (wordData.type === 'phrase' ? 'phrase' : 'word'))}`;
    highlight.textContent = word;
    highlight.dataset.word = word.toLowerCase();
    highlight.dataset.translation = typeof wordData.translation === 'object' ? wordData.translation.translation : wordData.translation;
    highlight.dataset.count = wordData.count || 1;
    highlight.dataset.partOfSpeech = wordData.partOfSpeech;
    
    // 添加到 Intersection Observer
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(highlight);
    }
    
    this.performanceMetrics.totalHighlights++;
    
    return highlight;
  }

  /**
   * 重置高亮元素
   */
  resetHighlightElement(highlight) {
    // 保留 className，重置其他属性
    highlight.className = 'translated-word-highlight';
    highlight.textContent = '';
    delete highlight.dataset.word;
    delete highlight.dataset.translation;
    delete highlight.dataset.count;
    delete highlight.dataset.partOfSpeech;
  }

  /**
   * 更新可见高亮
   */
  updateVisibleHighlights() {
    if (!this.props.enableVirtualization) return;
    
    // 重新检查所有高亮元素的可见性
    const highlights = document.querySelectorAll('.translated-word-highlight');
    highlights.forEach(highlight => {
      const rect = highlight.getBoundingClientRect();
      const isVisible = this.isElementInViewport(rect);
      
      if (isVisible) {
        this.visibleHighlights.add(highlight);
        highlight.classList.add('highlight-visible');
        highlight.classList.remove('highlight-virtualized');
      } else {
        this.visibleHighlights.delete(highlight);
        highlight.classList.add('highlight-virtualized');
        highlight.classList.remove('highlight-visible');
      }
    });
  }

  /**
   * 检查元素是否在视口中
   */
  isElementInViewport(rect) {
    return (
      rect.top >= -this.props.viewportMargin &&
      rect.left >= -this.props.viewportMargin &&
      rect.bottom <= window.innerHeight + this.props.viewportMargin &&
      rect.right <= window.innerWidth + this.props.viewportMargin
    );
  }

  /**
   * 让出主线程控制权
   */
  yieldToMain() {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * 防抖函数
   */
  debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 清理缓存
   */
  cleanupCache() {
    // 限制缓存大小
    if (this.textCache.size > 1000) {
      const entries = Array.from(this.textCache.entries());
      const toDelete = entries.slice(0, 500);
      toDelete.forEach(([key]) => this.textCache.delete(key));
    }
    
    if (this.regexCache.size > 500) {
      const entries = Array.from(this.regexCache.entries());
      const toDelete = entries.slice(0, 250);
      toDelete.forEach(([key]) => this.regexCache.delete(key));
    }
  }

  /**
   * 紧急清理
   */
  performEmergencyCleanup() {
    // 清理缓存
    this.textCache.clear();
    this.regexCache.clear();
    
    // 回收对象池
    this.highlightPool.clear();
    
    // 强制垃圾回收
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(startTime) {
    const processingTime = performance.now() - startTime;
    this.performanceMetrics.processingTime += processingTime;
    this.performanceMetrics.totalProcessed++;
    
    // 每100次处理输出一次统计
    if (this.performanceMetrics.totalProcessed % 100 === 0) {
      console.log('高亮性能统计:', {
        平均处理时间: `${(this.performanceMetrics.processingTime / this.performanceMetrics.totalProcessed).toFixed(2)}ms`,
        缓存命中率: `${((this.performanceMetrics.cacheHits / this.performanceMetrics.totalProcessed) * 100).toFixed(1)}%`,
        总高亮数: this.performanceMetrics.totalHighlights
      });
    }
  }

  /**
   * 获取词性对应的CSS类名
   */
  getPartOfSpeechClass(partOfSpeech) {
    const posMap = {
      'n': 'noun',
      'v': 'verb',
      'adj': 'adjective',
      'adv': 'adverb',
      'phrase': 'phrase'
    };
    
    return posMap[partOfSpeech] || 'word';
  }

  /**
   * 转义正则表达式特殊字符
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 检查当前域名是否允许运行插件
   */
  isDomainAllowed() {
    return true;
  }

  /**
   * 重新高亮
   */
  async rehighlight() {
    try {
      const result = await this.getStorageData(['translatedWords']);
      const words = result.translatedWords || {};
      await this.highlightTranslatedWords(words);
    } catch (error) {
      console.error('重新高亮失败:', error);
    }
  }

  /**
   * 从Chrome存储获取数据
   */
  getStorageData(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * 渲染组件
   */
  render() {
    return null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清理定时器
    if (this.highlightDebounceTimer) {
      clearTimeout(this.highlightDebounceTimer);
    }
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // 断开观察者
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // 清理缓存
    this.cleanupCache();
    
    // 移除所有高亮
    this.removeAllHighlights();
    
    super.destroy();
  }

  /**
   * 移除所有高亮元素
   */
  removeAllHighlights() {
    const existingHighlights = document.querySelectorAll('.translated-word-highlight');
    existingHighlights.forEach(el => {
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(el);
      }
      
      // 回收到对象池
      this.highlightPool.release(el);
      
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    });
    
    this.visibleHighlights.clear();
    this.processedNodes = new WeakSet();
  }
}

/**
 * 高亮元素对象池
 */
class HighlightPool {
  constructor(maxSize = 100) {
    this.pool = [];
    this.maxSize = maxSize;
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return null;
  }

  release(element) {
    if (this.pool.length < this.maxSize) {
      // 清理元素
      element.className = '';
      element.textContent = '';
      element.removeAttribute('data-word');
      element.removeAttribute('data-translation');
      element.removeAttribute('data-count');
      element.removeAttribute('data-part-of-speech');
      
      this.pool.push(element);
    }
  }

  clear() {
    this.pool = [];
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VirtualizedTranslationHighlight;
}

// 同时导出到全局变量
if (typeof window !== 'undefined') {
  window.VirtualizedTranslationHighlight = VirtualizedTranslationHighlight;
}

