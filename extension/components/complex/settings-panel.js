/**
 * 设置面板组件
 * 用于管理设置项、主题切换和设置保存
 */

const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

class SettingsPanel extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {Object} props.settings - 设置数据
   * @param {Function} props.onSave - 保存设置事件回调
   * @param {Function} props.onCancel - 取消设置事件回调
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      settings: {},
      onSave: () => {},
      onCancel: () => {}
    };
    
    this.props = { ...this.defaultProps, ...props };
    this.state = {
      settings: this.props.settings
    };
    
    // 初始化组件
    this.init();
  }
  
  /**
   * 初始化组件
   */
  init() {
    // 注册样式
    this.registerStyle();
    
    // 创建DOM结构
    this.createDOM();
    
    // 绑定事件
    this.bindEvents();
  }
  
  /**
   * 注册组件样式
   */
  registerStyle() {
    const styles = {
      '.settings-panel': {
        'width': '100%',
        'height': '100%',
        'overflow-y': 'auto'
      },
      
      '.settings-section': {
        'margin-bottom': '24px',
        'background': 'var(--bg-secondary)',
        'border-radius': 'var(--border-radius-lg)',
        'padding': '16px',
        'border': '1px solid var(--border-color)'
      },
      
      '.settings-section h3': {
        'margin-top': '0',
        'margin-bottom': '16px',
        'font-size': 'var(--font-size-lg)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-primary)',
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px'
      },
      
      '.setting-item': {
        'margin-bottom': '16px',
        'display': 'flex',
        'flex-direction': 'column',
        'gap': '8px'
      },
      
      '.setting-item label': {
        'font-size': 'var(--font-size-md)',
        'font-weight': 'var(--font-weight-medium)',
        'color': 'var(--text-primary)'
      },
      
      '.setting-item select, .setting-item input[type="text"], .setting-item input[type="number"], .setting-item input[type="password"]': {
        'padding': '8px 12px',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-md)',
        'background': 'var(--bg-primary)',
        'color': 'var(--text-primary)',
        'font-size': 'var(--font-size-md)',
        'transition': 'all 0.2s ease'
      },
      
      '.setting-item select:focus, .setting-item input:focus': {
        'outline': 'none',
        'border-color': 'var(--accent-primary)',
        'box-shadow': '0 0 0 2px var(--accent-primary-transparent)'
      },
      
      '.color-picker-group': {
        'display': 'grid',
        'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
        'gap': '12px'
      },
      
      '.color-item': {
        'display': 'flex',
        'flex-direction': 'column',
        'gap': '4px'
      },
      
      '.color-item input[type="color"]': {
        'width': '100%',
        'height': '40px',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-md)',
        'cursor': 'pointer'
      },
      
      '.settings-actions': {
        'display': 'flex',
        'justify-content': 'flex-end',
        'gap': '12px',
        'margin-top': '24px',
        'padding-top': '16px',
        'border-top': '1px solid var(--border-color)'
      },
      
      '.save-btn, .cancel-btn': {
        'padding': '8px 16px',
        'border': 'none',
        'border-radius': 'var(--border-radius-md)',
        'font-size': 'var(--font-size-md)',
        'font-weight': 'var(--font-weight-medium)',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease'
      },
      
      '.save-btn': {
        'background': 'var(--accent-primary)',
        'color': 'var(--text-on-primary)'
      },
      
      '.save-btn:hover': {
        'background': 'var(--accent-primary-hover)'
      },
      
      '.cancel-btn': {
        'background': 'var(--bg-secondary)',
        'color': 'var(--text-primary)',
        'border': '1px solid var(--border-color)'
      },
      
      '.cancel-btn:hover': {
        'background': 'var(--bg-hover)'
      }
    };
    
    styleManager.registerStyle('settings-panel', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建设置面板容器
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-content';
    
    // 外观设置
    const appearanceSection = this.createAppearanceSection();
    settingsPanel.appendChild(appearanceSection);
    
    // AI翻译设置
    const aiSection = this.createAISection();
    settingsPanel.appendChild(aiSection);
    
    // 常规翻译设置
    const translationSection = this.createTranslationSection();
    settingsPanel.appendChild(translationSection);
    
    // 学习设置
    const learningSection = this.createLearningSection();
    settingsPanel.appendChild(learningSection);
    
    // 数据管理
    const dataSection = this.createDataSection();
    settingsPanel.appendChild(dataSection);
    
    // 操作按钮
    const actions = this.createActions();
    settingsPanel.appendChild(actions);
    
    this.el = settingsPanel;
  }
  
  /**
   * 创建外观设置区域
   * @returns {HTMLElement} - 外观设置区域元素
   */
  createAppearanceSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    section.innerHTML = `
      <h3>
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
        外观设置
      </h3>
      <div class="setting-item">
        <label for="backgroundTheme">背景颜色主题：</label>
        <select id="backgroundTheme">
          <option value="default">默认主题</option>
          <option value="dark">深色主题</option>
          <option value="blue">蓝色主题</option>
          <option value="purple">紫色主题</option>
          <option value="green">绿色主题</option>
          <option value="rainbow">彩虹主题</option>
          <option value="sunset">日落主题</option>
        </select>
      </div>
      <div class="setting-item" id="customBackgroundColor" style="display: none;">
        <label for="backgroundColor">自定义背景颜色：</label>
        <input type="color" id="backgroundColor" value="#667eea">
      </div>
      <div class="setting-item">
        <label for="uiElementTheme">UI元素主题：</label>
        <select id="uiElementTheme">
          <option value="default">浅色模式 (Light)</option>
          <option value="dark">深色模式 (Dark)</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="highlightTheme">高亮颜色主题：</label>
        <select id="highlightTheme">
          <option value="default">默认主题</option>
          <option value="dark">深色主题</option>
          <option value="colorful">彩色主题</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div class="setting-item" id="customColors" style="display: none;">
        <h4>自定义颜色：</h4>
        <div class="color-picker-group">
          <div class="color-item">
            <label for="colorNoun">名词：</label>
            <input type="color" id="colorNoun" value="#4CAF50">
          </div>
          <div class="color-item">
            <label for="colorVerb">动词：</label>
            <input type="color" id="colorVerb" value="#2196F3">
          </div>
          <div class="color-item">
            <label for="colorAdjective">形容词：</label>
            <input type="color" id="colorAdjective" value="#FF9800">
          </div>
          <div class="color-item">
            <label for="colorAdverb">副词：</label>
            <input type="color" id="colorAdverb" value="#9C27B0">
          </div>
        </div>
      </div>
    `;
    
    return section;
  }
  
  /**
   * 创建AI翻译设置区域
   * @returns {HTMLElement} - AI翻译设置区域元素
   */
  createAISection() {
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    section.innerHTML = `
      <h3>
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
          <circle cx="12" cy="5" r="2"></circle>
          <path d="M12 7v4"></path>
          <line x1="8" y1="16" x2="8" y2="16"></line>
          <line x1="16" y1="16" x2="16" y2="16"></line>
        </svg>
        AI 翻译设置
      </h3>
      <div class="setting-item">
        <label for="aiProvider">AI 提供商：</label>
        <select id="aiProvider">
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="aiApiKey">AI Key：</label>
        <input type="password" id="aiApiKey" placeholder="输入 API Key">
      </div>
      <div class="setting-item">
        <label for="aiModel">模型名称：</label>
        <input type="text" id="aiModel" placeholder="gpt-3.5-turbo">
      </div>
      <div class="setting-item" id="aiApiUrlContainer" style="display: none;">
        <label for="aiApiUrl">API 地址：</label>
        <input type="text" id="aiApiUrl" placeholder="https://api.example.com/v1/chat/completions">
      </div>
    `;
    
    return section;
  }
  
  /**
   * 创建常规翻译设置区域
   * @returns {HTMLElement} - 常规翻译设置区域元素
   */
  createTranslationSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    section.innerHTML = `
      <h3>
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        常规翻译设置
      </h3>
      <div class="setting-item">
        <label for="translationAPI">备用翻译：</label>
        <select id="translationAPI">
          <option value="youdao">有道翻译</option>
          <option value="baidu">百度翻译</option>
          <option value="google">谷歌翻译</option>
          <option value="mymemory">MyMemory</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="apiKey">有道 Key：</label>
        <input type="password" id="apiKey" placeholder="输入有道 API Key">
      </div>
      <div class="setting-item">
        <label for="apiSecret">有道 Secret：</label>
        <input type="password" id="apiSecret" placeholder="输入有道 API Secret">
      </div>
    `;
    
    return section;
  }
  
  /**
   * 创建学习设置区域
   * @returns {HTMLElement} - 学习设置区域元素
   */
  createLearningSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    section.innerHTML = `
      <h3>
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        学习设置
      </h3>
      <div class="setting-item">
        <label for="dailyGoal">每日学习目标：</label>
        <input type="number" id="dailyGoal" value="20" min="5" max="100">
        <span>个单词</span>
      </div>
      <div class="setting-item">
        <label for="learningMode">学习模式：</label>
        <select id="learningMode">
          <option value="normal">普通模式</option>
          <option value="intensive">强化模式</option>
          <option value="review">复习模式</option>
        </select>
      </div>
    `;
    
    return section;
  }
  
  /**
   * 创建数据管理设置区域
   * @returns {HTMLElement} - 数据管理设置区域元素
   */
  createDataSection() {
    const section = document.createElement('div');
    section.className = 'settings-section';
    
    section.innerHTML = `
      <h3>
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        数据管理
      </h3>
      <div class="setting-item">
        <button id="exportSettingsBtn" class="settings-action-btn">导出设置</button>
        <button id="importSettingsBtn" class="settings-action-btn">导入设置</button>
      </div>
      <div class="setting-item">
        <button id="resetSettingsBtn" class="settings-action-btn reset-btn">重置所有设置</button>
      </div>
    `;
    
    return section;
  }
  
  /**
   * 创建操作按钮
   * @returns {HTMLElement} - 操作按钮区域元素
   */
  createActions() {
    const actions = document.createElement('div');
    actions.className = 'settings-actions';
    
    actions.innerHTML = `
      <button id="saveSettingsBtn" class="save-btn">保存设置</button>
      <button id="cancelSettingsBtn" class="cancel-btn">取消</button>
    `;
    
    return actions;
  }
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 保存设置事件
    const saveBtn = this.el.querySelector('#saveSettingsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', this.props.onSave);
    }
    
    // 取消设置事件
    const cancelBtn = this.el.querySelector('#cancelSettingsBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.props.onCancel);
    }
    
    // 背景主题选择事件
    const backgroundTheme = this.el.querySelector('#backgroundTheme');
    if (backgroundTheme) {
      backgroundTheme.addEventListener('change', () => {
        this.handleBackgroundThemeChange();
      });
    }
    
    // 高亮主题选择事件
    const highlightTheme = this.el.querySelector('#highlightTheme');
    if (highlightTheme) {
      highlightTheme.addEventListener('change', () => {
        this.handleHighlightThemeChange();
      });
    }
    
    // AI提供商选择事件
    const aiProvider = this.el.querySelector('#aiProvider');
    if (aiProvider) {
      aiProvider.addEventListener('change', () => {
        this.handleAIProviderChange();
      });
    }
  }
  
  /**
   * 处理背景主题变化
   */
  handleBackgroundThemeChange() {
    const backgroundTheme = this.el.querySelector('#backgroundTheme').value;
    const customBackgroundColor = this.el.querySelector('#customBackgroundColor');
    
    if (backgroundTheme === 'custom') {
      customBackgroundColor.style.display = 'flex';
    } else {
      customBackgroundColor.style.display = 'none';
    }
  }
  
  /**
   * 处理高亮主题变化
   */
  handleHighlightThemeChange() {
    const highlightTheme = this.el.querySelector('#highlightTheme').value;
    const customColors = this.el.querySelector('#customColors');
    
    if (highlightTheme === 'custom') {
      customColors.style.display = 'flex';
    } else {
      customColors.style.display = 'none';
    }
  }
  
  /**
   * 处理AI提供商变化
   */
  handleAIProviderChange() {
    const aiProvider = this.el.querySelector('#aiProvider').value;
    const aiApiUrlContainer = this.el.querySelector('#aiApiUrlContainer');
    
    if (aiProvider === 'custom') {
      aiApiUrlContainer.style.display = 'flex';
    } else {
      aiApiUrlContainer.style.display = 'none';
    }
  }
  
  /**
   * 渲染组件
   * @returns {HTMLElement} - 渲染后的组件元素
   */
  render() {
    return this.el;
  }
  
  /**
   * 更新组件
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
      this.createDOM();
      this.bindEvents();
    }
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    this.unbindEvents();
    super.destroy();
  }
}

// 导出组件
module.exports = SettingsPanel;