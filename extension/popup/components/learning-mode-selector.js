/**
 * 学习模式选择器组件
 * 用于展示和选择多种学习模式
 */
window.LearningModeSelector = class LearningModeSelector {
  constructor(container, learningManager) {
    this.container = container;
    this.learningManager = learningManager;
    this.modes = [
      {
        id: 'flashcard',
        name: '闪卡模式',
        description: '传统闪卡学习，支持正反翻转',
        icon: `
          <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        `,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        enabled: true
      },
      {
        id: 'quiz',
        name: '测验模式',
        description: '选择题形式，测试单词掌握程度',
        icon: `
          <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        `,
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        enabled: true
      },
      {
        id: 'spelling',
        name: '拼写模式',
        description: '听写单词，强化拼写能力',
        icon: `
          <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <polyline points="16 13 8 13 8 17 16 17 16 13"></polyline>
            <line x1="10" y1="9" x2="9" y2="9"></line>
            <line x1="13" y1="9" x2="11" y2="9"></line>
          </svg>
        `,
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        enabled: true
      },
      {
        id: 'listening',
        name: '听力模式',
        description: '听单词发音，选择正确释义',
        icon: `
          <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        `,
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        enabled: false
      }
    ];
    this.selectedMode = null;
    this.onModeSelect = null;
    
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.render();
    this.bindEvents();
  }

  /**
   * 渲染学习模式卡片
   */
  render() {
    const modesHTML = this.modes.map(mode => `
      <div class="mode-card ${mode.enabled ? '' : 'disabled'}" data-mode-id="${mode.id}" style="background: ${mode.gradient}">
        <div class="mode-icon-container">
          ${mode.icon}
        </div>
        <div class="mode-content">
          <h3 class="mode-name">${mode.name}</h3>
          <p class="mode-description">${mode.description}</p>
        </div>
        ${!mode.enabled ? '<div class="mode-overlay">开发中</div>' : ''}
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="mode-selector-header">
        <h2>选择学习模式</h2>
        <p>根据你的学习目标选择合适的模式</p>
      </div>
      <div class="mode-cards-container">
        ${modesHTML}
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    this.container.addEventListener('click', (e) => {
      const modeCard = e.target.closest('.mode-card');
      if (modeCard && !modeCard.classList.contains('disabled')) {
        const modeId = modeCard.dataset.modeId;
        this.selectMode(modeId);
      }
    });
  }

  /**
   * 选择学习模式
   * @param {string} modeId - 模式ID
   */
  selectMode(modeId) {
    const mode = this.modes.find(m => m.id === modeId);
    if (mode) {
      this.selectedMode = mode;
      this.animateSelection(modeId);
      
      // 触发选择事件
      if (this.onModeSelect) {
        this.onModeSelect(mode);
      }
      
      // 调用学习管理器开始学习
      this.learningManager.startLearningSession(modeId);
    }
  }

  /**
   * 添加选择动画
   * @param {string} modeId - 模式ID
   */
  animateSelection(modeId) {
    const modeCard = this.container.querySelector(`[data-mode-id="${modeId}"]`);
    if (modeCard) {
      // 添加选中动画
      modeCard.style.transform = 'scale(0.95)';
      modeCard.style.transition = 'transform 0.1s ease';
      
      setTimeout(() => {
        modeCard.style.transform = '';
        modeCard.style.transition = '';
      }, 100);
    }
  }

  /**
   * 设置模式选择回调
   * @param {Function} callback - 回调函数
   */
  setOnModeSelect(callback) {
    this.onModeSelect = callback;
  }

  /**
   * 获取所有学习模式
   * @returns {Array} 学习模式列表
   */
  getLearningModes() {
    return this.modes;
  }

  /**
   * 获取当前选中的模式
   * @returns {Object|null} 当前选中的模式
   */
  getSelectedMode() {
    return this.selectedMode;
  }
};