/**
 * Word Drawer V2 - 重新设计的单词抽屉组件
 * 模仿现代词典应用的深色主题设计
 * 特点：深色背景、渐变卡片、流畅动画、圆形进度条、滑动切换
 */

class WordDrawerV2 {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = {
      containerId: 'wordDrawerContainer',
      onClose: null,
      onStar: null,
      onDelete: null,
      onNavigate: null,
      ...options
    };

    this.currentWord = null;
    this.currentIndex = -1;
    this.wordList = [];
    this.elements = {};
    this.isAnimating = false;
    this.isOpen = false; // Track drawer open state for KeyboardManager
    
    // 滑动手势相关
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.isSwiping = false;
    
    // 资源清理跟踪
    this.animationFrameId = null;
    this.timeouts = [];
    this.eventHandlers = {};
    
    // Accessibility modules (Requirements: 1.1, 2.1, 3.1)
    this.focusManager = null;
    this.ariaManager = null;
    this.keyboardManager = null;
    
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.injectStyles();
    this.createDOM();
    this.initializeAccessibilityModules();
    this.bindEvents();
  }

  /**
   * Initialize accessibility modules
   * Requirements: 1.1, 2.1, 3.1
   */
  initializeAccessibilityModules() {
    // Initialize FocusManager
    if (this.elements.drawer && window.FocusManager) {
      this.focusManager = new window.FocusManager(this.elements.drawer);
      console.log('WordDrawerV2: FocusManager initialized');
    } else {
      console.warn('WordDrawerV2: FocusManager not available');
    }

    // Initialize ARIAManager
    if (this.elements.drawer && window.ARIAManager) {
      this.ariaManager = new window.ARIAManager(this.elements.drawer);
      
      // Create live regions for announcements (Requirement: 1.5)
      this.ariaManager.createLiveRegions();
      
      console.log('WordDrawerV2: ARIAManager initialized');
    } else {
      console.warn('WordDrawerV2: ARIAManager not available');
    }

    // Initialize KeyboardManager
    if (window.KeyboardManager) {
      this.keyboardManager = new window.KeyboardManager(this);
      console.log('WordDrawerV2: KeyboardManager initialized');
    } else {
      console.warn('WordDrawerV2: KeyboardManager not available');
    }
  }

  /**
   * 注入样式
   */
  injectStyles() {
    if (document.getElementById('word-drawer-v2-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'word-drawer-v2-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime?.getURL ? 
      chrome.runtime.getURL('components/complex/word-drawer-v2.css') : 
      'components/complex/word-drawer-v2.css';
    document.head.appendChild(link);
  }

  /**
   * 创建DOM结构
   */
  createDOM() {
    const container = document.getElementById(this.options.containerId) || document.body;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'word-drawer-overlay';
    overlay.id = 'wordDrawerOverlayV2';
    this.elements.overlay = overlay;

    // 创建抽屉 (Requirements: 1.1, 1.2, 1.3, 1.4, 1.6)
    const drawer = document.createElement('div');
    drawer.className = 'word-drawer';
    drawer.id = 'wordDrawerV2';
    
    // Generate unique IDs for ARIA associations
    const titleId = `drawer-title-${Date.now()}`;
    const descriptionId = `drawer-description-${Date.now()}`;
    
    // Set ARIA attributes on drawer container (Requirement: 1.1)
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', titleId);
    drawer.setAttribute('aria-describedby', descriptionId);
    
    drawer.innerHTML = `
      <!-- 抽屉头部 -->
      <div class="word-drawer-header">
        <div class="drawer-nav-controls">
          <button class="drawer-nav-btn" id="drawerPrevBtn" aria-label="上一个单词">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span class="drawer-nav-indicator" id="drawerNavIndicator" aria-live="polite" aria-atomic="true">1 / 1</span>
          <button class="drawer-nav-btn" id="drawerNextBtn" aria-label="下一个单词">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <button class="word-drawer-close-btn" id="drawerCloseBtnV2" aria-label="关闭单词抽屉">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 抽屉内容区域 -->
      <div class="word-drawer-content" id="wordDrawerContentV2" role="document">
        <!-- 内容将动态填充 -->
      </div>

      <!-- 操作按钮区域 -->
      <div class="word-drawer-actions" id="wordDrawerActionsV2">
        <button class="drawer-action-btn" id="drawerCopyBtnV2" aria-label="复制单词和翻译">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          复制
        </button>
        <button class="drawer-action-btn danger" id="drawerDeleteBtnV2" aria-label="删除此单词">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          删除
        </button>
      </div>
      
      <!-- ARIA live regions for announcements (Requirement: 1.5) -->
      <div id="${titleId}" class="sr-only"></div>
      <div id="${descriptionId}" class="sr-only"></div>
    `;

    this.elements.drawer = drawer;
    this.elements.content = drawer.querySelector('#wordDrawerContentV2');
    this.elements.closeBtn = drawer.querySelector('#drawerCloseBtnV2');
    this.elements.prevBtn = drawer.querySelector('#drawerPrevBtn');
    this.elements.nextBtn = drawer.querySelector('#drawerNextBtn');
    this.elements.navIndicator = drawer.querySelector('#drawerNavIndicator');
    this.elements.titleElement = drawer.querySelector(`#${titleId}`);
    this.elements.descriptionElement = drawer.querySelector(`#${descriptionId}`);

    container.appendChild(overlay);
    container.appendChild(drawer);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 存储处理器引用以便清理
    this.eventHandlers.overlayClick = () => this.hide();
    this.eventHandlers.closeClick = () => this.hide();
    this.eventHandlers.prevClick = () => this.navigateToPrev();
    this.eventHandlers.nextClick = () => this.navigateToNext();
    this.eventHandlers.touchStart = (e) => this.handleTouchStart(e);
    this.eventHandlers.touchMove = (e) => this.handleTouchMove(e);
    this.eventHandlers.touchEnd = (e) => this.handleTouchEnd(e);

    // 遮罩层点击关闭
    this.elements.overlay.addEventListener('click', this.eventHandlers.overlayClick);

    // 关闭按钮
    this.elements.closeBtn.addEventListener('click', this.eventHandlers.closeClick);

    // 导航按钮
    this.elements.prevBtn.addEventListener('click', this.eventHandlers.prevClick);
    this.elements.nextBtn.addEventListener('click', this.eventHandlers.nextClick);

    // ESC键关闭，左右箭头导航
    this.keyHandler = (e) => {
      if (!this.elements.overlay?.classList.contains('active')) return;
      
      if (e.key === 'Escape') {
        this.hide();
      } else if (e.key === 'ArrowLeft') {
        this.navigateToPrev();
      } else if (e.key === 'ArrowRight') {
        this.navigateToNext();
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // 滑动手势支持 - 使用passive:true提升性能
    this.elements.content.addEventListener('touchstart', this.eventHandlers.touchStart, { passive: true });
    this.elements.content.addEventListener('touchmove', this.eventHandlers.touchMove, { passive: true });
    this.elements.content.addEventListener('touchend', this.eventHandlers.touchEnd);

    // 复制和删除按钮
    this.bindActionButtons();
  }

  /**
   * 绑定操作按钮事件
   */
  bindActionButtons() {
    const copyBtn = document.getElementById('drawerCopyBtnV2');
    const deleteBtn = document.getElementById('drawerDeleteBtnV2');
    
    this.eventHandlers.copyClick = () => this.handleCopy();
    this.eventHandlers.deleteClick = () => this.handleDelete();
    
    if (copyBtn) {
      copyBtn.addEventListener('click', this.eventHandlers.copyClick);
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', this.eventHandlers.deleteClick);
    }
  }

  /**
   * 处理触摸开始
   */
  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.isSwiping = false;
  }

  /**
   * 处理触摸移动
   */
  handleTouchMove(e) {
    if (!this.touchStartX || this.isAnimating) return;
    
    const diffX = e.touches[0].clientX - this.touchStartX;
    const diffY = e.touches[0].clientY - this.touchStartY;
    
    // 判断是否为水平滑动（不阻止默认滚动行为）
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      this.isSwiping = true;
    }
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(e) {
    // 防止动画过程中的重复触发
    if (!this.isSwiping || this.isAnimating) return;
    
    this.touchEndX = e.changedTouches[0].clientX;
    const diffX = this.touchEndX - this.touchStartX;
    
    // 滑动距离超过50px触发切换
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        this.navigateToPrev();
      } else {
        this.navigateToNext();
      }
    }
    
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isSwiping = false;
  }

  /**
   * 设置单词列表（用于导航）
   * @param {Array} list - 单词列表
   */
  setWordList(list) {
    this.wordList = list || [];
  }

  /**
   * 导航到上一个单词
   */
  navigateToPrev() {
    if (this.isAnimating || this.currentIndex <= 0) return;
    
    this.currentIndex--;
    this.animateTransition('prev');
  }

  /**
   * 导航到下一个单词
   */
  navigateToNext() {
    if (this.isAnimating || this.currentIndex >= this.wordList.length - 1) return;
    
    this.currentIndex++;
    this.animateTransition('next');
  }

  /**
   * 动画过渡到新单词
   * @param {string} direction - 方向 'prev' 或 'next'
   */
  animateTransition(direction) {
    this.isAnimating = true;
    const content = this.elements.content;
    
    // 添加滑出动画
    content.classList.add(direction === 'next' ? 'slide-out-left' : 'slide-out-right');
    
    setTimeout(() => {
      // 更新内容
      const newWord = this.wordList[this.currentIndex];
      this.currentWord = this.prepareWordData(newWord);
      this.renderContent(this.currentWord);
      this.updateNavigation();
      
      // Update ARIA live region to announce navigation (Requirement: 1.5)
      if (this.ariaManager) {
        const word = this.currentWord.text || this.currentWord.word || this.currentWord.key;
        const position = `单词 ${this.currentIndex + 1} / ${this.wordList.length}`;
        const message = `${position}: ${word}`;
        this.ariaManager.updateLiveRegion(message, 'polite');
      }
      
      // 移除滑出动画，添加滑入动画
      content.classList.remove('slide-out-left', 'slide-out-right');
      content.classList.add(direction === 'next' ? 'slide-in-right' : 'slide-in-left');
      
      setTimeout(() => {
        content.classList.remove('slide-in-right', 'slide-in-left');
        this.isAnimating = false;
        
        // 触发动画
        this.animateCircularProgress();
        this.animateFrequencyBars();
      }, 300);
    }, 200);
  }

  /**
   * 准备单词数据 - 确保所有字段正确传递
   */
  prepareWordData(item) {
    if (!item) return null;
    
    console.log('prepareWordData 输入:', item);
    
    const prepared = {
      text: item.key || item.text || item.word,
      word: item.key || item.text || item.word,
      key: item.key || item.text || item.word,
      translation: typeof item.translation === 'object' ? item.translation.translation : item.translation,
      phonetic: item.phonetic || '',
      type: item.type || 'word',
      count: item.count || 1,
      firstUsed: item.firstUsed,
      lastUsed: item.lastUsed,
      starred: item.starred || false,
      detailedInfo: item.detailedInfo || null,
      lookupHistory: item.lookupHistory || [],
      masteryLevel: item.masteryLevel || 0,
      partOfSpeech: item.partOfSpeech || ''
    };
    
    console.log('prepareWordData 输出:', prepared);
    return prepared;
  }

  /**
   * 更新导航状态
   */
  updateNavigation() {
    const total = this.wordList.length;
    const current = this.currentIndex + 1;
    
    this.elements.navIndicator.textContent = `${current} / ${total}`;
    this.elements.prevBtn.disabled = this.currentIndex <= 0;
    this.elements.nextBtn.disabled = this.currentIndex >= total - 1;
    
    this.elements.prevBtn.classList.toggle('disabled', this.currentIndex <= 0);
    this.elements.nextBtn.classList.toggle('disabled', this.currentIndex >= total - 1);
  }

/**
   * 显示抽屉
   * @param {Object} wordData - 单词数据对象
   * @param {number} index - 在列表中的索引（可选）
   */
  async show(wordData, index = -1) {
    if (!wordData || this.isAnimating) return;

    this.isAnimating = true;
    
    // Save focus origin before opening (Requirement: 2.4)
    if (this.focusManager) {
      this.focusManager.saveFocusOrigin();
    }
    
    // 检查 detailedInfo 是否有效（不仅要存在，还要有实际内容）
    const hasValidDetailedInfo = (info) => {
      if (!info) return false;
      // 检查 basic 是否有内容
      if (info.basic && (info.basic.phonetic || info.basic.explains?.length > 0)) {
        return true;
      }
      // 检查 definitions 是否有内容
      if (info.definitions && info.definitions.length > 0) {
        return true;
      }
      return false;
    };
    
    // 如果没有有效的 detailedInfo，尝试获取
    if (!hasValidDetailedInfo(wordData.detailedInfo)) {
      try {
        const key = (wordData.key || wordData.word || wordData.text || '').toLowerCase();
        const result = await chrome.storage.local.get(['translatedWords']);
        const words = result.translatedWords || {};
        
        // 先检查存储中是否有有效数据
        if (words[key] && hasValidDetailedInfo(words[key].detailedInfo)) {
          wordData.detailedInfo = words[key].detailedInfo;
          console.log('从存储中获取到有效 detailedInfo:', wordData.detailedInfo);
        } else {
          // 存储中没有有效数据，重新获取
          console.log('detailedInfo 无效或为空，重新获取...', wordData.detailedInfo);
          const word = wordData.text || wordData.word || wordData.key;
          if (word && this.isWord(word)) {
            const detailedInfo = await this.fetchDetailedInfo(word);
            if (detailedInfo && hasValidDetailedInfo(detailedInfo)) {
              wordData.detailedInfo = detailedInfo;
              // 更新存储
              if (words[key]) {
                words[key].detailedInfo = detailedInfo;
                await chrome.storage.local.set({ translatedWords: words });
                console.log('已更新存储中的 detailedInfo');
              }
            }
          }
        }
      } catch (error) {
        console.error('获取 detailedInfo 失败:', error);
      }
    }
    
    this.currentWord = wordData;
    this.currentIndex = index >= 0 ? index : this.findWordIndex(wordData);

    // 填充内容
    this.renderContent(wordData);
    this.updateNavigation();
    
    // Update ARIA title and description (Requirement: 1.2, 1.3)
    if (this.elements.titleElement && this.elements.descriptionElement) {
      const word = wordData.text || wordData.word || wordData.key || '单词';
      const translation = wordData.translation || '';
      this.elements.titleElement.textContent = `单词详情：${word}`;
      this.elements.descriptionElement.textContent = translation;
    }

    // 显示遮罩和抽屉（带动画）
    requestAnimationFrame(() => {
      this.elements.overlay.classList.add('active');
      this.elements.drawer.classList.remove('closing');
      this.elements.drawer.classList.add('active');
      this.isOpen = true; // Track open state for KeyboardManager
      
      // Enable keyboard shortcuts (Requirement: 3.1)
      if (this.keyboardManager) {
        this.keyboardManager.enableKeyboardShortcuts();
      }
      
      // Enable focus trap after drawer opens (Requirement: 2.1)
      if (this.focusManager) {
        this.focusManager.enableFocusTrap();
      }
      
      // 动画完成后
      setTimeout(() => {
        this.isAnimating = false;
        this.animateCircularProgress();
        this.animateFrequencyBars();
        
        // Move focus to first element after animation completes (Requirement: 2.1)
        if (this.focusManager) {
          this.focusManager.moveFocusToFirst();
        }
      }, 500);
    });

    // 禁用body滚动
    document.body.style.overflow = 'hidden';
  }

  /**
   * 查找单词在列表中的索引
   */
  findWordIndex(wordData) {
    const key = (wordData.key || wordData.word || wordData.text || '').toLowerCase();
    return this.wordList.findIndex(item => 
      (item.key || item.word || item.text || '').toLowerCase() === key
    );
  }

  /**
   * 隐藏抽屉
   */
  hide() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.isOpen = false; // Track closed state for KeyboardManager

    // Disable focus trap before closing (Requirement: 2.4)
    if (this.focusManager) {
      this.focusManager.disableFocusTrap();
    }
    
    // Disable keyboard shortcuts
    if (this.keyboardManager) {
      this.keyboardManager.disableKeyboardShortcuts();
    }

    this.elements.drawer.classList.add('closing');
    this.elements.overlay.classList.remove('active');

    setTimeout(() => {
      this.elements.drawer.classList.remove('active', 'closing');
      this.isAnimating = false;
      document.body.style.overflow = '';

      // Restore focus after drawer closes (Requirement: 2.4)
      if (this.focusManager) {
        this.focusManager.restoreFocus();
      }

      if (this.options.onClose) {
        this.options.onClose();
      }

      this.currentWord = null;
    }, 350);
  }

  /**
   * 渲染抽屉内容
   * @param {Object} data - 单词数据
   */
  renderContent(data) {
    console.log('renderContent 接收到的数据:', {
      word: data.text || data.word || data.key,
      hasDetailedInfo: !!data.detailedInfo,
      detailedInfo: data.detailedInfo,
      translation: data.translation
    });
    
    const word = data.text || data.word || data.key || '未知单词';
    
    // 优先从 detailedInfo 获取音标
    let phonetic = '';
    if (data.detailedInfo?.basic?.phonetic) {
      phonetic = `/${data.detailedInfo.basic.phonetic}/`;
    } else if (data.detailedInfo?.basic?.['uk-phonetic']) {
      phonetic = `UK: /${data.detailedInfo.basic['uk-phonetic']}/`;
      if (data.detailedInfo.basic['us-phonetic']) {
        phonetic += ` US: /${data.detailedInfo.basic['us-phonetic']}/`;
      }
    } else if (data.detailedInfo?.phonetic) {
      phonetic = data.detailedInfo.phonetic;
    } else if (data.phonetic) {
      phonetic = data.phonetic;
    }
    
    // 调试日志：音标提取
    console.log('音标提取结果:', {
      phonetic,
      hasDetailedInfo: !!data.detailedInfo,
      hasBasic: !!data.detailedInfo?.basic,
      basicPhonetic: data.detailedInfo?.basic?.phonetic,
      ukPhonetic: data.detailedInfo?.basic?.['uk-phonetic'],
      usPhonetic: data.detailedInfo?.basic?.['us-phonetic'],
      detailedInfoPhonetic: data.detailedInfo?.phonetic,
      dataPhonetic: data.phonetic
    });
    
    const translation = data.translation || '';
    const partOfSpeech = data.partOfSpeech || data.detailedInfo?.partOfSpeech || '';
    const count = data.count || 1;
    const starred = data.starred || false;
    const masteryLevel = data.masteryLevel || 0;

    // 获取释义和例句
    const definitions = this.getDefinitions(data);
    const examples = this.getExamples(data);
    
    console.log('解析后的数据:', { phonetic, definitions, examples });

    // 计算难度
    const { complexityLevel, complexityScore } = this.calculateComplexity(data);
    const starRating = complexityLevel;

    // 获取查询历史数据
    const lookupHistory = this.getLookupHistoryData(data);

    this.elements.content.innerHTML = `
      <!-- 单词标题区域 -->
      <div class="drawer-word-header drawer-animate-1">
        <!-- 标题行：单词 + 等级 + 星标 -->
        <div class="drawer-word-title-row">
          <div class="drawer-title-left">
            <h1 class="drawer-word-title">${this.escapeHtml(word)}</h1>
            ${this.renderWordLevelBadge(word)}
          </div>
          <button class="drawer-star-btn ${starred ? 'starred' : ''}" id="drawerStarBtnV2" title="${starred ? '取消星标' : '添加星标'}">
            <svg viewBox="0 0 24 24" fill="${starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
        
        <!-- 音标行：音标 + 发音 + 词频 + 学习天数 -->
        <div class="drawer-phonetic-row">
          <div class="drawer-phonetic-group">
            ${phonetic ? `<span class="drawer-word-phonetic">${this.escapeHtml(phonetic)}</span>` : ''}
            <button class="drawer-pronunciation-btn" id="drawerPronounceV2" title="播放发音">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </button>
          </div>
          <div class="drawer-meta-badges">
            ${this.renderFrequencyBadge(count)}
          </div>
        </div>
        
        <!-- 主翻译 -->
        <div class="drawer-main-translation">${this.escapeHtml(translation)}</div>
        
        <!-- 底部信息行：记忆强度 + 标签 -->
        <div class="drawer-bottom-info">
          <div class="drawer-tags-row">
            ${partOfSpeech ? `<span class="drawer-tag pos">${this.escapeHtml(partOfSpeech)}</span>` : ''}
            ${masteryLevel >= 3 ? '<span class="drawer-tag level mastered">已掌握</span>' : 
              masteryLevel >= 1 ? '<span class="drawer-tag level learning">学习中</span>' : 
              '<span class="drawer-tag level new">新单词</span>'}
            ${this.renderUsageSceneTags(word)}
          </div>
          ${this.renderMemoryStrengthCompact(masteryLevel)}
        </div>
      </div>

      <!-- 释义卡片 - 丰富的翻译内容 -->
      <div class="drawer-section drawer-animate-2">
        <h3 class="drawer-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          详细释义
          ${partOfSpeech ? `<span class="drawer-pos-badge">${this.escapeHtml(partOfSpeech)}</span>` : ''}
        </h3>
        <!-- 优化：采用tooltip-meanings样式，按词性分组 -->
        <div class="drawer-definitions tooltip-meanings">
          ${this.groupDefinitionsByPOS(definitions).map((group) => `
            <div class="tooltip-pos-group drawer-pos-group">
              <div class="drawer-pos-label">${this.escapeHtml(group.pos)}</div>
              ${group.defs.map((def, index) => `
                <div class="drawer-definition-item tooltip-definition-item">
                  <span class="drawer-definition-number">${index + 1}.</span>
                  <div class="drawer-definition-content">
                    <div class="drawer-definition-text">${this.escapeHtml(def.cn)}</div>
                    ${def.en && def.en !== def.cn ? `<div class="drawer-definition-en">${this.escapeHtml(def.en)}</div>` : ''}
                    ${def.example ? `
                      <div class="drawer-definition-example">
                        <span class="example-label">💡</span>
                        <span class="example-text">${this.highlightWord(this.escapeHtml(def.example), word)}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 词形变化 -->
      ${this.renderWordForms(data)}

      <!-- 同义词/反义词 -->
      ${this.renderSynonymsAntonyms(data)}

      <!-- 例句区域 -->
      ${examples.length > 0 ? `
        <div class="drawer-section drawer-animate-5">
          <h3 class="drawer-section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            例句
          </h3>
          <div class="drawer-examples">
            ${examples.map(ex => `
              <div class="drawer-example-item">
                <div class="drawer-example-en">${this.highlightWord(this.escapeHtml(ex.en), word)}</div>
                ${ex.cn ? `<div class="drawer-example-cn">${this.escapeHtml(ex.cn)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 统计卡片 -->
      <div class="drawer-stats-section drawer-animate-6">
        <!-- 查询频率卡片 -->
        <div class="drawer-stat-card">
          <div class="drawer-stat-header">
            <span class="drawer-stat-label">查询频率</span>
            <span class="drawer-stat-value">共 ${count} 次</span>
          </div>
          <div class="drawer-frequency-stats">
            ${this.generateFrequencyStats(data.lookupHistory || [])}
          </div>
          <div class="drawer-frequency-chart" data-count="${count}">
            ${this.generateFrequencyBars(lookupHistory)}
          </div>
          <div class="drawer-frequency-labels">
            ${lookupHistory.labels.map(label => `<span>${label}</span>`).join('')}
          </div>
        </div>

        <!-- 难度卡片 -->
        <div class="drawer-stat-card">
          <div class="drawer-stat-header">
            <span class="drawer-stat-label">难度评估</span>
          </div>
          <div class="drawer-difficulty-display">
            <div class="drawer-difficulty-meter">
              <div class="drawer-difficulty-fill" style="width: ${complexityScore}%"></div>
            </div>
            <div class="drawer-difficulty-info">
              <span class="drawer-difficulty-level">${this.getDifficultyLabel(complexityLevel)}</span>
              <span class="drawer-difficulty-score">${complexityScore}%</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // 绑定内部事件
    this.bindInternalEvents();

    // 注释掉AI增强功能，因为它依赖AI配置
    // this.enhanceTranslationIfNeeded();

    // 启动可视化动画
    setTimeout(() => {
      this.animateFrequencyBars();
    }, 300);

    // 确保可视化数据基于最新真实数据
    setTimeout(() => this.refreshVisualizationData(), 200);
  }

  /**
   * 获取难度标签
   */
  getDifficultyLabel(level) {
    const labels = ['入门', '简单', '中等', '较难', '困难'];
    return labels[Math.min(level - 1, 4)] || '中等';
  }

  /**
   * 计算复杂度
   */
  calculateComplexity(data) {
    let complexityLevel = 3;
    let complexityScore = 50;
    
    if (data.complexity && data.complexity.level) {
      complexityLevel = data.complexity.level;
      complexityScore = data.complexity.score || (complexityLevel * 20);
    } else if (window.ComplexityCalculator) {
      const complexity = window.ComplexityCalculator.calculateComplexity(data);
      complexityLevel = complexity.level;
      complexityScore = complexity.score;
    } else {
      // 基于单词长度和使用频率简单计算
      const word = data.text || data.word || '';
      const wordLength = word.length;
    const count = data.lookupHistory ? data.lookupHistory.length : 1;
      
      if (wordLength <= 4) complexityLevel = 1;
      else if (wordLength <= 6) complexityLevel = 2;
      else if (wordLength <= 8) complexityLevel = 3;
      else if (wordLength <= 10) complexityLevel = 4;
      else complexityLevel = 5;
      
      // 使用次数越多，说明越常用，难度可能越低
      if (count > 10) complexityLevel = Math.max(1, complexityLevel - 1);
      
      complexityScore = complexityLevel * 20;
    }
    
    return { complexityLevel, complexityScore };
  }

  /**
   * 获取查询历史数据 - 基于真实查询日期和次数
   */
  getLookupHistoryData(data) {
    const history = data.lookupHistory || [];

    // 如果没有历史记录，但有count，使用count生成模拟数据
    if (history.length === 0 && data.count > 0) {
      // 基于count生成最近几天的模拟数据
      const days = 7;
      const totalCount = data.count;
      const counts = new Array(days).fill(0);

      // 将总count分配到最近几天
      const activeDays = Math.min(Math.ceil(totalCount / 2), days);
      for (let i = 0; i < activeDays; i++) {
        counts[days - 1 - i] = Math.ceil(totalCount / activeDays);
      }

      return {
        counts,
        labels: ['6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天']
      };
    }

    // 如果没有历史记录，返回空数据
    if (history.length === 0) {
      return {
        counts: new Array(7).fill(0),
        labels: ['6天前', '5天前', '4天前', '3天前', '2天前', '昨天', '今天']
      };
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // 获取最近7天的数据
    const days = 7;
    const counts = new Array(days).fill(0);
    const labels = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;

      // 统计这一天的查询次数（基于真实时间戳）
      const dayCount = history.filter(timestamp =>
        timestamp >= dayStart && timestamp < dayEnd
      ).length;

      counts[days - 1 - i] = dayCount;

      // 生成标签
      if (i === 0) {
        labels.push('今天');
      } else if (i === 1) {
        labels.push('昨天');
      } else {
        labels.push(`${i}天前`);
      }
    }

    return { counts, labels };
  }

  /**
   * 生成频率统计信息
   */
  generateFrequencyStats(history) {
    if (history.length === 0) {
      return '<div class="frequency-stat">暂无查询记录</div>';
    }

    const now = Date.now();
    const firstQuery = Math.min(...history);
    const lastQuery = Math.max(...history);
    const daysSinceFirst = Math.ceil((now - firstQuery) / (24 * 60 * 60 * 1000));
    const avgDaily = daysSinceFirst > 0 ? (history.length / daysSinceFirst).toFixed(1) : history.length;

    const firstDate = new Date(firstQuery).toLocaleDateString();
    const lastDate = new Date(lastQuery).toLocaleDateString();

    return `
      <div class="frequency-stat">
        <span>首次查询: ${firstDate}</span>
        <span>最近查询: ${lastDate}</span>
        <span>平均每日: ${avgDaily} 次</span>
      </div>
    `;
  }

  /**
   * 生成频率柱状图
   */
  generateFrequencyBars(historyData) {
    const { counts } = historyData;
    const maxCount = Math.max(...counts, 1);
    
    return counts.map((count, index) => {
      const height = Math.max((count / maxCount) * 100, 5);
      const isToday = index === counts.length - 1;
      return `<div class="drawer-frequency-bar ${isToday ? 'today' : ''}" 
                   style="height: 0%" 
                   data-height="${height}%"
                   data-count="${count}">
                <span class="bar-tooltip">${count}次</span>
              </div>`;
    }).join('');
  }

  /**
   * 获取释义列表 - 增强版，支持多种数据源
   */
  getDefinitions(data) {
    const definitions = [];
    
    console.log('getDefinitions 输入数据:', {
      hasDetailedInfo: !!data.detailedInfo,
      detailedInfoKeys: data.detailedInfo ? Object.keys(data.detailedInfo) : [],
      hasBasic: !!data.detailedInfo?.basic,
      basicExplains: data.detailedInfo?.basic?.explains,
      definitionsArray: data.detailedInfo?.definitions,
      translation: data.translation
    });
    
    // 1. 优先使用 detailedInfo 中的 definitions 数组
    if (data.detailedInfo?.definitions && Array.isArray(data.detailedInfo.definitions) && data.detailedInfo.definitions.length > 0) {
      console.log('使用 detailedInfo.definitions:', data.detailedInfo.definitions);
      data.detailedInfo.definitions.forEach(def => {
        // 支持多种格式
        let cn = '';
        let en = '';
        let pos = '';
        let example = '';
        
        if (typeof def === 'string') {
          // 字符串格式，尝试解析词性
          const match = def.match(/^([a-z]+\.)\s*(.+)$/i);
          if (match) {
            pos = match[1];
            cn = match[2];
          } else {
            cn = def;
          }
        } else if (typeof def === 'object') {
          cn = def.translation || def.cn || def.meaning || def.text || '';
          en = def.text || def.definition || def.en || '';
          pos = def.pos || def.partOfSpeech || '';
          example = def.example || (def.examples && def.examples[0]) || '';
        }
        
        if (cn || en) {
          definitions.push({ en, cn, pos, example });
        }
      });
    }
    
    // 2. 使用 basic.explains（来自有道API）- 这是最常见的详细释义来源
    if (data.detailedInfo?.basic?.explains && Array.isArray(data.detailedInfo.basic.explains)) {
      console.log('使用 basic.explains:', data.detailedInfo.basic.explains);
      data.detailedInfo.basic.explains.forEach((explain) => {
        // 解析词性和释义（格式如："n. 苹果；苹果树" 或 "vt. 做某事"）
        const match = explain.match(/^([a-z]+\.)\s*(.+)$/i);
        let pos = '';
        let meaning = explain;
        
        if (match) {
          pos = match[1];
          meaning = match[2];
        }
        
        // 避免重复
        if (!definitions.find(d => d.cn === meaning)) {
          definitions.push({
            en: '',
            cn: meaning,
            pos: pos,
            example: ''
          });
        }
      });
    }
    
    // 3. 使用 basic.uk-phonetic 或 basic.us-phonetic 中可能包含的额外信息
    if (data.detailedInfo?.basic && !definitions.length) {
      // 有些API返回的basic中直接包含翻译
      const basicTrans = data.detailedInfo.basic.translation || data.detailedInfo.basic.trans;
      if (basicTrans) {
        const transArray = Array.isArray(basicTrans) ? basicTrans : [basicTrans];
        transArray.forEach(t => {
          if (t && !definitions.find(d => d.cn === t)) {
            definitions.push({ en: '', cn: t, pos: '', example: '' });
          }
        });
      }
    }
    
    // 4. 使用 web 翻译（网络释义）
    if (data.detailedInfo?.web && Array.isArray(data.detailedInfo.web)) {
      console.log('使用 web 释义:', data.detailedInfo.web);
      data.detailedInfo.web.slice(0, 3).forEach(webItem => {
        if (webItem.value && Array.isArray(webItem.value)) {
          const webMeaning = webItem.value.join('；');
          if (!definitions.find(d => d.cn === webMeaning)) {
            definitions.push({
              en: webItem.key || '',
              cn: webMeaning,
              pos: '网络',
              example: ''
            });
          }
        }
      });
    }
    
    // 5. 如果还没有定义，尝试解析主翻译
    if (definitions.length === 0 && data.translation) {
      console.log('使用主翻译:', data.translation);
      // 尝试解析多行翻译（分号、换行、逗号分隔）
      const lines = data.translation.split(/[;；\n,，]/).filter(l => l.trim());
      if (lines.length > 1) {
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !definitions.find(d => d.cn === trimmed)) {
            // 尝试解析词性
            const match = trimmed.match(/^([a-z]+\.)\s*(.+)$/i);
            if (match) {
              definitions.push({
                en: '',
                cn: match[2],
                pos: match[1],
                example: ''
              });
            } else {
              definitions.push({
                en: '',
                cn: trimmed,
                pos: '',
                example: ''
              });
            }
          }
        });
      } else {
        definitions.push({
          en: '',
          cn: data.translation,
          pos: data.partOfSpeech || data.detailedInfo?.partOfSpeech || '',
          example: ''
        });
      }
    }

    // 6. 如果仍然没有定义，提供默认值
    if (definitions.length === 0) {
      definitions.push({
        en: '',
        cn: '暂无释义',
        pos: '',
        example: ''
      });
    }

    // 限制显示数量并去重（增加到10条以显示更完整内容）
    const uniqueDefinitions = [];
    const seenMeanings = new Set();
    
    for (const def of definitions) {
      const key = def.cn || def.en;
      if (key && !seenMeanings.has(key) && uniqueDefinitions.length < 10) {
        seenMeanings.add(key);
        uniqueDefinitions.push(def);
      }
    }

    console.log('getDefinitions 输出:', uniqueDefinitions);
    return uniqueDefinitions;
  }

  /**
   * 获取例句列表 - 增强版
   */
  getExamples(data) {
    const examples = [];
    
    console.log('getExamples 输入:', {
      hasDetailedInfo: !!data.detailedInfo,
      hasExamples: !!data.detailedInfo?.examples,
      hasDefinitions: !!data.detailedInfo?.definitions
    });
    
    // 1. 从 detailedInfo.examples 获取例句
    if (data.detailedInfo?.examples && Array.isArray(data.detailedInfo.examples)) {
      data.detailedInfo.examples.forEach(ex => {
        if (typeof ex === 'string') {
          examples.push({ en: ex, cn: '' });
        } else if (ex && typeof ex === 'object') {
          examples.push({
            en: ex.text || ex.source || ex.en || ex.sentence || ex.orig || '',
            cn: ex.translation || ex.cn || ex.target || ex.trans || ''
          });
        }
      });
    }

    // 2. 从 definitions 中的 example 字段获取例句
    if (data.detailedInfo?.definitions && Array.isArray(data.detailedInfo.definitions)) {
      data.detailedInfo.definitions.forEach(def => {
        if (def.example) {
          const existingExample = examples.find(ex => ex.en === def.example);
          if (!existingExample) {
            examples.push({
              en: def.example,
              cn: def.exampleTranslation || ''
            });
          }
        }
        // 如果有 examples 数组
        if (def.examples && Array.isArray(def.examples)) {
          def.examples.forEach(ex => {
            if (typeof ex === 'string') {
              const existingExample = examples.find(e => e.en === ex);
              if (!existingExample) {
                examples.push({ en: ex, cn: '' });
              }
            } else if (ex && typeof ex === 'object') {
              const existingExample = examples.find(e => e.en === (ex.text || ex.en));
              if (!existingExample) {
                examples.push({
                  en: ex.text || ex.en || ex.sentence || '',
                  cn: ex.translation || ex.cn || ''
                });
              }
            }
          });
        }
      });
    }

    // 3. 从 basic.wfs 获取词形变化信息（作为补充）
    if (data.detailedInfo?.basic?.wfs && Array.isArray(data.detailedInfo.basic.wfs) && examples.length < 2) {
      const word = data.text || data.word || data.key || '';
      data.detailedInfo.basic.wfs.slice(0, 2).forEach(wf => {
        if (wf.wf && wf.wf.name && wf.wf.value) {
          // 构造词形变化示例
          const formName = this.getWordFormName(wf.wf.name);
          if (formName && examples.length < 3) {
            examples.push({
              en: `${wf.wf.value} (${formName})`,
              cn: `${word}的${formName}形式`
            });
          }
        }
      });
    }

    // 过滤空例句并限制数量
    const filtered = examples
      .filter(ex => ex.en && ex.en.trim().length > 0)
      .slice(0, 3);
    
    console.log('getExamples 输出:', filtered);
    return filtered;
  }
  
  /**
   * 获取词形变化名称的中文翻译
   */
  getWordFormName(name) {
    const formNames = {
      'pl': '复数',
      'past': '过去式',
      'past participle': '过去分词',
      'pres participle': '现在分词',
      'third person singular': '第三人称单数',
      '3rd person singular': '第三人称单数',
      'comparative': '比较级',
      'superlative': '最高级',
      'ing': '现在分词',
      'ed': '过去式'
    };
    return formNames[name.toLowerCase()] || name;
  }

  /**
   * 渲染词汇等级徽章 - 简化版
   */
  renderWordLevelBadge(word) {
    const wordLength = word.length;
    let level = '';
    let levelClass = '';
    
    if (wordLength <= 4) {
      level = 'CET-4';
      levelClass = 'level-basic';
    } else if (wordLength <= 6) {
      level = 'CET-6';
      levelClass = 'level-intermediate';
    } else if (wordLength <= 8) {
      level = 'TOEFL';
      levelClass = 'level-advanced';
    } else {
      level = 'GRE';
      levelClass = 'level-expert';
    }
    
    return `<span class="drawer-level-badge ${levelClass}">${level}</span>`;
  }
  
  /**
   * 渲染词频指示器 - 简化版
   */
  renderFrequencyBadge(count) {
    let stars = 1;
    
    if (count >= 20) {
      stars = 3;
    } else if (count >= 10) {
      stars = 2;
    }
    
    // 使用SVG图标代替emoji
    let starIcons = '';
    const starSvg = window.iconLibrary ? window.iconLibrary.getIcon('star') : '<svg viewBox="0 0 24 24" width="10" height="10"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    
    for (let i = 0; i < 3; i++) {
      const isFilled = i < stars;
      // 为填充的星星添加filled类，未填充的保持默认（描边）
      // 注意：这里我们包裹一层span或者直接修改svg class来控制样式
      // 简单起见，我们替换 class
      const iconHtml = starSvg.replace('class="icon-svg"', `class="icon-svg ${isFilled ? 'filled' : ''}"`);
      starIcons += iconHtml;
    }
    
    return `<span class="drawer-freq-badge" title="查询${count}次">${starIcons}</span>`;
  }
  
  /**
   * 渲染学习天数徽章 - 简化版
   */
  renderLearningDaysBadge(firstUsed) {
    // 修复NaN bug：添加有效性检查
    if (!firstUsed || typeof firstUsed !== 'number' || firstUsed <= 0 || isNaN(firstUsed)) {
      return '';
    }
    
    const now = Date.now();
    const days = Math.floor((now - firstUsed) / (24 * 60 * 60 * 1000));
    
    // 额外检查：确保days是有效数字
    if (isNaN(days) || days < 1 || days > 36500) return ''; // 限制最大100年
    
    let milestone = '';
    if (days >= 100) milestone = '💯';
    else if (days >= 30) milestone = '🎉';
    else if (days >= 7) milestone = '🔥';
    
    return `<span class="drawer-days-badge" title="学习${days}天">${days}天${milestone}</span>`;
  }
  
  /**
   * 渲染记忆强度 - 紧凑版
   */
  renderMemoryStrengthCompact(masteryLevel) {
    const percentage = Math.min(masteryLevel * 25, 100);
    let strengthClass = '';
    
    if (percentage >= 75) {
      strengthClass = 'strength-strong';
    } else if (percentage >= 50) {
      strengthClass = 'strength-good';
    } else if (percentage >= 25) {
      strengthClass = 'strength-fair';
    } else {
      strengthClass = 'strength-weak';
    }
    
    return `
      <div class="drawer-memory-compact ${strengthClass}">
        <div class="memory-bar">
          <div class="memory-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="memory-text">${percentage}%</span>
      </div>
    `;
  }
  
  /**
   * 按词性分组定义 - 优化详细释义显示
   */
  groupDefinitionsByPOS(definitions) {
    if (!Array.isArray(definitions) || definitions.length === 0) {
      return [];
    }
    
    const groups = {};
    
    definitions.forEach(def => {
      const pos = def.pos || '其他';
      if (!groups[pos]) {
        groups[pos] = { pos: pos, defs: [] };
      }
      groups[pos].defs.push(def);
    });
    
    // 按常见词性顺序排序
    const posOrder = ['n.', 'v.', 'adj.', 'adv.', 'pron.', 'prep.', 'conj.', 'interj.'];
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const indexA = posOrder.indexOf(a.pos);
      const indexB = posOrder.indexOf(b.pos);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return sortedGroups;
  }

  /**
   * 渲染使用场景标签
   */
  renderUsageSceneTags(word) {
    // 简单的场景判断（可以后续扩展为从API获取）
    const scenes = [];
    const wordLower = word.toLowerCase();
    
    // 商务词汇
    if (['business', 'company', 'market', 'profit', 'revenue', 'strategy'].includes(wordLower)) {
      scenes.push({ text: '商务', class: 'scene-business' });
    }
    
    // 学术词汇
    if (['research', 'study', 'analysis', 'theory', 'hypothesis', 'experiment'].includes(wordLower)) {
      scenes.push({ text: '学术', class: 'scene-academic' });
    }
    
    // 日常词汇
    if (word.length <= 5) {
      scenes.push({ text: '日常', class: 'scene-daily' });
    }
    
    // 最多显示2个场景
    return scenes.slice(0, 2).map(scene => 
      `<span class="drawer-tag scene ${scene.class}">${scene.text}</span>`
    ).join('');
  }

  /**
   * 渲染词形变化 - 增强版
   */
  renderWordForms(data) {
    const wfs = data.detailedInfo?.basic?.wfs;
    if (!wfs || !Array.isArray(wfs) || wfs.length === 0) {
      return '';
    }

    const forms = wfs.map(wf => {
      if (wf.wf && wf.wf.name && wf.wf.value) {
        return { 
          name: this.getWordFormName(wf.wf.name), 
          value: wf.wf.value 
        };
      }
      return null;
    }).filter(Boolean);

    if (forms.length === 0) return '';

    console.log('渲染词形变化:', forms);

    return `
      <div class="drawer-section drawer-animate-3">
        <h3 class="drawer-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M12 2v20M2 12h20"></path>
          </svg>
          词形变化
        </h3>
        <div class="drawer-word-forms">
          ${forms.map(form => `
            <div class="drawer-word-form-item">
              <span class="drawer-form-name">${this.escapeHtml(form.name)}</span>
              <span class="drawer-form-value">${this.escapeHtml(form.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染同义词/反义词
   */
  renderSynonymsAntonyms(data) {
    const synonyms = data.detailedInfo?.synonyms || [];
    const antonyms = data.detailedInfo?.antonyms || [];
    
    // 从web翻译中提取相关词
    const webRelated = [];
    if (data.detailedInfo?.web && Array.isArray(data.detailedInfo.web)) {
      data.detailedInfo.web.slice(0, 3).forEach(item => {
        if (item.key && item.value) {
          webRelated.push({
            key: item.key,
            values: Array.isArray(item.value) ? item.value : [item.value]
          });
        }
      });
    }

    if (synonyms.length === 0 && antonyms.length === 0 && webRelated.length === 0) {
      return '';
    }

    let content = '';

    // 同义词
    if (synonyms.length > 0) {
      content += `
        <div class="drawer-related-group">
          <h4 class="drawer-related-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="16 12 12 8 8 12"></polyline>
              <line x1="12" y1="16" x2="12" y2="8"></line>
            </svg>
            同义词
          </h4>
          <div class="drawer-related-tags">
            ${synonyms.slice(0, 6).map(word => `
              <span class="drawer-related-tag synonym">${this.escapeHtml(word)}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 反义词
    if (antonyms.length > 0) {
      content += `
        <div class="drawer-related-group">
          <h4 class="drawer-related-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="8 12 12 16 16 12"></polyline>
              <line x1="12" y1="8" x2="12" y2="16"></line>
            </svg>
            反义词
          </h4>
          <div class="drawer-related-tags">
            ${antonyms.slice(0, 6).map(word => `
              <span class="drawer-related-tag antonym">${this.escapeHtml(word)}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 网络释义/相关词
    if (webRelated.length > 0) {
      content += `
        <div class="drawer-related-group">
          <h4 class="drawer-related-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            网络释义
          </h4>
          <div class="drawer-web-meanings">
            ${webRelated.map(item => `
              <div class="drawer-web-meaning-item">
                <span class="drawer-web-key">${this.escapeHtml(item.key)}</span>
                <span class="drawer-web-values">${item.values.map(v => this.escapeHtml(v)).join('；')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (!content) return '';

    return `
      <div class="drawer-section drawer-animate-4">
        <h3 class="drawer-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          相关词汇
        </h3>
        ${content}
      </div>
    `;
  }

  /**
   * 高亮单词
   */
  highlightWord(text, word) {
    if (!word) return text;
    const regex = new RegExp(`(${this.escapeRegExp(word)})`, 'gi');
    return text.replace(regex, '<mark class="word-highlight">$1</mark>');
  }

  /**
   * 转义正则特殊字符
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 绑定内部事件
   */
  bindInternalEvents() {
    // 收藏按钮
    const starBtn = document.getElementById('drawerStarBtnV2');
    if (starBtn) {
      starBtn.addEventListener('click', () => this.handleStar());
    }

    // 发音按钮
    const pronounceBtn = document.getElementById('drawerPronounceV2');
    if (pronounceBtn) {
      pronounceBtn.addEventListener('click', () => this.handlePronunciation());
    }
  }

  /**
   * 动画：圆形进度条（已移除，改用条形进度条）
   */
  animateCircularProgress() {
    // 现在使用条形进度条，此方法保留以兼容
  }

  /**
   * 动画：频率柱状图 - 实时绘制效果
   */
  animateFrequencyBars() {
    console.log('开始动画频率柱状图');
    const bars = this.elements.content.querySelectorAll('.drawer-frequency-bar');
    console.log('找到的bars数量:', bars.length);

    bars.forEach((bar, index) => {
      const height = bar.dataset.height || '5%';
      const count = bar.dataset.count || 0;
      console.log(`bar ${index}: height=${height}, count=${count}`);

      // 添加过渡效果
      bar.style.transition = 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

      // 延迟动画开始
      setTimeout(() => {
        bar.style.height = height;
        console.log(`设置bar ${index}高度为${height}`);

        // 添加计数动画
        if (count > 0) {
          this.animateCount(bar.querySelector('.bar-tooltip'), count);
        }
      }, 100 + index * 120);
    });
  }

  /**
   * 动画：数字计数效果
   * @param {HTMLElement} element - 数字元素
   * @param {number} targetCount - 目标数字
   */
  animateCount(element, targetCount) {
    if (!element) return;

    // 取消之前的动画
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    let currentCount = 0;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentCount = Math.round(targetCount * easeOut);

      element.textContent = `${currentCount}次`;

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * 获取详细翻译内容 - 确保drawer总是显示最详细的翻译
   */
  async enhanceTranslationIfNeeded() {
    if (!this.currentWord) {
      console.log('enhanceTranslationIfNeeded: currentWord不存在');
      return;
    }

    try {
      const data = this.currentWord;
      const translation = data.translation || '';
      console.log('enhanceTranslationIfNeeded: 检查翻译', translation);

      // 总是获取详细翻译，确保drawer显示最丰富的内容
      console.log('enhanceTranslationIfNeeded: window.detailedTranslate =', !!window.detailedTranslate);

      if (window.detailedTranslate) {
        console.log('翻译内容简略，正在获取详细翻译...');

        // 显示加载状态
        const mainTranslationEl = this.elements.content.querySelector('.drawer-main-translation');
        if (mainTranslationEl) {
          mainTranslationEl.innerHTML += '<span style="color: #666; font-size: 12px;"> (正在加载详细内容...)</span>';
        }

        try {
          const detailedResult = await window.detailedTranslate(data.text || data.word, '');
          console.log('详细翻译结果:', detailedResult);

          // 更新数据
          if (!data.detailedInfo) data.detailedInfo = {};
          data.detailedInfo.definitions = detailedResult.definitions || [];
          if (detailedResult.translation && detailedResult.translation !== translation) {
            data.translation = detailedResult.translation;
          }

          // 如果有词性信息，添加到definitions
          if (detailedResult.partOfSpeech && detailedResult.definitions) {
            data.detailedInfo.definitions = detailedResult.definitions.map(def => ({
              ...def,
              pos: detailedResult.partOfSpeech
            }));
          }

          // 重新渲染翻译部分
          this.updateTranslationDisplay(detailedResult);

          console.log('详细翻译加载完成');
        } catch (error) {
          console.warn('获取详细翻译失败:', error);
          // 移除加载提示
          if (mainTranslationEl) {
            mainTranslationEl.innerHTML = mainTranslationEl.innerHTML.replace(' (正在加载详细内容...)', '');
          }
        }
      } else {
        console.log('翻译内容充足，无需增强');
      }
    } catch (error) {
      console.error('增强翻译失败:', error);
    }
  }

  /**
   * 更新翻译显示
   */
  updateTranslationDisplay(detailedResult) {
    const mainTranslationEl = this.elements.content.querySelector('.drawer-main-translation');
    if (mainTranslationEl && detailedResult.translation) {
      mainTranslationEl.textContent = detailedResult.translation;
    }

    // 更新释义部分
    const definitionsEl = this.elements.content.querySelector('.drawer-definitions');
    if (definitionsEl && detailedResult.definitions) {
      const definitionsHtml = detailedResult.definitions.map((def, index) => `
        <div class="drawer-definition-item">
          <span class="drawer-definition-index">${index + 1}</span>
          <div class="drawer-definition-content">
            ${detailedResult.partOfSpeech ? `<span class="drawer-definition-pos">${this.escapeHtml(detailedResult.partOfSpeech)}</span>` : ''}
            <div class="drawer-definition-cn">${this.escapeHtml(def)}</div>
          </div>
        </div>
      `).join('');

      definitionsEl.innerHTML = definitionsHtml;
    }
  }

  /**
   * 刷新可视化数据 - 确保基于最新真实数据
   */
  async refreshVisualizationData() {
    if (!this.currentWord) return;

    try {
      console.log('开始刷新可视化数据');
      // 从存储获取最新数据
      const result = await chrome.storage.local.get(['translatedWords']);
      const words = result.translatedWords || {};
      const key = this.currentWord.key || this.currentWord.text || this.currentWord.word;
      const latestData = words[key];

      if (latestData) {
        console.log('获取到最新数据:', latestData);
        // 更新lookupHistory
        this.currentWord.lookupHistory = latestData.lookupHistory || [];

        // 重新生成图表数据
        const lookupHistory = this.getLookupHistoryData(this.currentWord);
        console.log('重新生成历史数据:', lookupHistory);

        // 更新DOM - 只更新图表部分
        const chartContainer = this.elements.content.querySelector('.drawer-frequency-chart');
        if (chartContainer) {
          console.log('找到图表容器，更新HTML');
          const barsHtml = this.generateFrequencyBars(lookupHistory);
          chartContainer.innerHTML = barsHtml;

          // 重新绑定动画
          setTimeout(() => this.animateFrequencyBars(), 100);
        } else {
          console.error('未找到图表容器');
        }

        // 更新统计信息
        const statsContainer = this.elements.content.querySelector('.drawer-frequency-stats');
        if (statsContainer) {
          const statsHtml = this.generateFrequencyStats(this.currentWord.lookupHistory || []);
          statsContainer.innerHTML = statsHtml;
        }

        console.log('可视化数据已刷新');
      } else {
        console.log('未找到最新数据');
      }
    } catch (error) {
      console.error('刷新可视化数据失败:', error);
    }
  }

  /**
   * 处理发音
   */
  handlePronunciation() {
    if (!this.currentWord) return;
    
    const word = this.currentWord.text || this.currentWord.word || this.currentWord.key;
    
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
        
        const btn = document.getElementById('drawerPronounceV2');
        if (btn) {
          btn.classList.add('playing');
          setTimeout(() => btn.classList.remove('playing'), 600);
        }
      } catch (error) {
        console.error('语音合成失败:', error);
      }
    }
  }

  /**
   * 处理收藏（星标）
   */
  async handleStar() {
    if (!this.currentWord) return;

    const starBtn = document.getElementById('drawerStarBtnV2');
    const newStarred = !this.currentWord.starred;
    
    // 更新UI
    if (starBtn) {
      starBtn.classList.toggle('starred', newStarred);
      const svg = starBtn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', newStarred ? 'currentColor' : 'none');
      }
    }
    
    this.currentWord.starred = newStarred;

    // 触发自定义事件
    const event = new CustomEvent('wordDrawerStar', {
      detail: { 
        word: this.currentWord,
        starred: newStarred
      }
    });
    document.dispatchEvent(event);

    if (this.options.onStar) {
      this.options.onStar(this.currentWord, newStarred);
    }

    this.showToast(newStarred ? '已添加星标 ⭐' : '已取消星标');

    // 同步到存储
    try {
      const wordKey = (this.currentWord.word || this.currentWord.key || this.currentWord.text).toLowerCase();
      const result = await chrome.storage.local.get(['translatedWords']);
      const words = result.translatedWords || {};
      
      if (words[wordKey]) {
        words[wordKey].starred = newStarred;
        await chrome.storage.local.set({ translatedWords: words });
      }
    } catch (error) {
      console.error('更新星标状态失败:', error);
    }
  }

  /**
   * 处理复制
   */
  handleCopy() {
    if (!this.currentWord) return;

    const word = this.currentWord.text || this.currentWord.word || this.currentWord.key;
    const translation = this.currentWord.translation || '';
    const text = `${word}\n${translation}`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('已复制到剪贴板 📋');
    }).catch(err => {
      console.error('复制失败:', err);
      this.showToast('复制失败', true);
    });
  }

  /**
   * 处理删除
   */
  async handleDelete() {
    if (!this.currentWord) return;

    const word = this.currentWord.text || this.currentWord.word || this.currentWord.key;
    
    // 显示确认对话框
    const confirmed = await this.showConfirmDialog(
      '确认删除',
      `确定要删除「${word}」吗？此操作不可恢复。`
    );
    
    if (!confirmed) return;

    try {
      const wordKey = word.toLowerCase();
      const result = await chrome.storage.local.get(['translatedWords', 'learningProgress']);
      const words = result.translatedWords || {};
      const progress = result.learningProgress || {};
      
      if (words[wordKey]) {
        delete words[wordKey];
        if (progress[wordKey]) {
          delete progress[wordKey];
        }
        
        await chrome.storage.local.set({ 
          translatedWords: words,
          learningProgress: progress
        });
        
        this.showToast('已删除 🗑️');

        // 触发自定义事件
        const event = new CustomEvent('wordDrawerDelete', {
          detail: { word: this.currentWord }
        });
        document.dispatchEvent(event);

        if (this.options.onDelete) {
          this.options.onDelete(this.currentWord);
        }

        // 从列表中移除
        if (this.wordList.length > 0) {
          this.wordList.splice(this.currentIndex, 1);
          
          // 如果还有单词，切换到下一个
          if (this.wordList.length > 0) {
            if (this.currentIndex >= this.wordList.length) {
              this.currentIndex = this.wordList.length - 1;
            }
            
            const nextWord = this.wordList[this.currentIndex];
            this.currentWord = this.prepareWordData(nextWord);
            
            // 动画过渡
            this.elements.content.classList.add('fade-out');
            setTimeout(() => {
              this.renderContent(this.currentWord);
              this.updateNavigation();
              this.elements.content.classList.remove('fade-out');
              this.elements.content.classList.add('fade-in');
              
              setTimeout(() => {
                this.elements.content.classList.remove('fade-in');
                this.animateFrequencyBars();
              }, 300);
            }, 200);
          } else {
            // 没有更多单词，关闭抽屉
            setTimeout(() => this.hide(), 300);
          }
        } else {
          setTimeout(() => this.hide(), 300);
        }
      }
    } catch (error) {
      console.error('删除失败:', error);
      this.showToast('删除失败', true);
    }
  }

  /**
   * 显示确认对话框
   */
  showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      // 创建对话框
      const dialog = document.createElement('div');
      dialog.className = 'drawer-confirm-dialog';
      dialog.innerHTML = `
        <div class="drawer-confirm-overlay"></div>
        <div class="drawer-confirm-content">
          <h4 class="drawer-confirm-title">${this.escapeHtml(title)}</h4>
          <p class="drawer-confirm-message">${this.escapeHtml(message)}</p>
          <div class="drawer-confirm-actions">
            <button class="drawer-confirm-btn cancel">取消</button>
            <button class="drawer-confirm-btn confirm">确认删除</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // 动画显示
      requestAnimationFrame(() => {
        dialog.classList.add('show');
      });
      
      // 绑定事件
      const cancelBtn = dialog.querySelector('.cancel');
      const confirmBtn = dialog.querySelector('.confirm');
      const overlay = dialog.querySelector('.drawer-confirm-overlay');
      
      const close = (result) => {
        dialog.classList.remove('show');
        setTimeout(() => {
          dialog.remove();
          resolve(result);
        }, 200);
      };
      
      cancelBtn.addEventListener('click', () => close(false));
      confirmBtn.addEventListener('click', () => close(true));
      overlay.addEventListener('click', () => close(false));
    });
  }

  /**
   * 显示提示消息
   */
  showToast(message, isError = false) {
    const existingToast = document.querySelector('.drawer-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `drawer-toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2000);
  }

  /**
   * 判断是否为单词
   */
  isWord(text) {
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;
    const wordPattern = /^[a-zA-Z\s\-']+$/;
    return wordPattern.test(trimmed) && trimmed.replace(/\s/g, '').length > 0;
  }

  /**
   * 获取详细信息（从后台服务）
   */
  async fetchDetailedInfo(word) {
    try {
      console.log('正在获取单词详细信息:', word);
      
      // 通过后台服务获取翻译（包含详细信息）
      const response = await chrome.runtime.sendMessage({
        type: 'SMART_TRANSLATE',
        text: word,
        context: '',
        skipAI: true
      });
      
      if (response && response.ok && response.result) {
        console.log('获取到详细信息:', response.result);
        
        // 构建 detailedInfo 对象
        const detailedInfo = {
          phonetic: response.result.phonetic || '',
          partOfSpeech: response.result.partOfSpeech || '',
          definitions: response.result.definitions || [],
          examples: response.result.examples || [],
          basic: response.result.basic || null,
          web: response.result.web || null
        };
        
        return detailedInfo;
      }
    } catch (error) {
      console.error('获取详细信息失败:', error);
    }
    
    return null;
  }

  /**
   * 转义HTML特殊字符
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清理所有事件监听器
    if (this.elements.overlay && this.eventHandlers.overlayClick) {
      this.elements.overlay.removeEventListener('click', this.eventHandlers.overlayClick);
    }
    if (this.elements.closeBtn && this.eventHandlers.closeClick) {
      this.elements.closeBtn.removeEventListener('click', this.eventHandlers.closeClick);
    }
    if (this.elements.prevBtn && this.eventHandlers.prevClick) {
      this.elements.prevBtn.removeEventListener('click', this.eventHandlers.prevClick);
    }
    if (this.elements.nextBtn && this.eventHandlers.nextClick) {
      this.elements.nextBtn.removeEventListener('click', this.eventHandlers.nextClick);
    }
    if (this.elements.content && this.eventHandlers.touchStart) {
      this.elements.content.removeEventListener('touchstart', this.eventHandlers.touchStart);
      this.elements.content.removeEventListener('touchmove', this.eventHandlers.touchMove);
      this.elements.content.removeEventListener('touchend', this.eventHandlers.touchEnd);
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }

    // 清理操作按钮事件
    const copyBtn = document.getElementById('drawerCopyBtnV2');
    const deleteBtn = document.getElementById('drawerDeleteBtnV2');
    if (copyBtn && this.eventHandlers.copyClick) {
      copyBtn.removeEventListener('click', this.eventHandlers.copyClick);
    }
    if (deleteBtn && this.eventHandlers.deleteClick) {
      deleteBtn.removeEventListener('click', this.eventHandlers.deleteClick);
    }

    // 取消进行中的动画
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 取消语音合成
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 清理DOM元素
    if (this.elements.overlay) {
      this.elements.overlay.remove();
    }
    if (this.elements.drawer) {
      this.elements.drawer.remove();
    }

    const styleEl = document.getElementById('word-drawer-v2-styles');
    if (styleEl) {
      styleEl.remove();
    }

    // 重置状态
    this.elements = {};
    this.eventHandlers = {};
    this.currentWord = null;
    this.wordList = [];
    this.isAnimating = false;
  }
}

// 导出组件
if (typeof window !== 'undefined') {
  window.WordDrawerV2 = WordDrawerV2;
  window.WordDrawer = WordDrawerV2;
  console.log('WordDrawerV2 类已挂载到 window 对象');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordDrawerV2;
}
