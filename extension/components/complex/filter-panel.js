/**
 * Filter Panel Component
 * 筛选面板组件 - iOS风格底部弹出面板
 * 提供视图选择、排序、首字母筛选、词性筛选等功能
 * 
 * 性能优化版本：
 * - 使用DocumentFragment批量DOM操作
 * - 事件委托减少事件监听器数量
 * - 延迟初始化非关键元素
 */

/**
 * 筛选面板组件类
 * 管理筛选面板的显示、交互和状态
 */
class FilterPanel {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.containerId - 容器元素ID
   * @param {Function} options.onApply - 应用筛选时的回调函数
   * @param {Object} options.initialFilters - 初始筛选条件
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      containerId: 'filterPanelContainer',
      onApply: null,
      initialFilters: {
        view: 'grid',
        sort: 'count',
        letter: 'all',
        pos: []
      },
      ...options
    };

    // 当前筛选状态
    this.filters = { ...this.options.initialFilters };

    // 临时筛选状态（用于取消时恢复）
    this.tempFilters = { ...this.filters };

    // 组件元素引用
    this.elements = {
      overlay: null,
      panel: null,
      content: null
    };

    // 是否已初始化内容
    this._contentInitialized = false;

    // 视图选项配置
    this.viewOptions = [
      { id: 'grid', label: '网格', icon: 'grid' },
      { id: 'list', label: '列表', icon: 'list' },
      { id: 'icon', label: '图标', icon: 'icon' },
      { id: 'coverflow', label: '封面流', icon: 'coverflow' }
    ];

    // 排序选项配置
    this.sortOptions = [
      { id: 'count', label: '按翻译次数' },
      { id: 'lastUsed', label: '按最近翻译' },
      { id: 'word', label: '按字母顺序' }
    ];

    // 首字母选项（全部 + A-Z + #）
    this.letterOptions = this._generateLetterOptions();

    // 词性选项配置
    this.posOptions = [
      { id: 'noun', label: '名词 (n.)' },
      { id: 'verb', label: '动词 (v.)' },
      { id: 'adjective', label: '形容词 (adj.)' },
      { id: 'adverb', label: '副词 (adv.)' },
      { id: 'pronoun', label: '代词 (pron.)' },
      { id: 'preposition', label: '介词 (prep.)' },
      { id: 'conjunction', label: '连词 (conj.)' }
    ];

    // 初始化组件（只创建外壳）
    this._initShell();
  }

  /**
   * 生成字母选项
   */
  _generateLetterOptions() {
    const options = [{ id: 'all', label: '全部', class: 'all' }];
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      options.push({ id: char.toLowerCase(), label: char });
    }
    options.push({ id: 'number', label: '#' });
    return options;
  }

  /**
   * 初始化外壳（延迟加载内容）
   */
  _initShell() {
    const container = document.getElementById(this.options.containerId) || document.body;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'filter-overlay';
    this.elements.overlay = overlay;

    // 创建筛选面板外壳
    const panel = document.createElement('div');
    panel.className = 'filter-panel';
    this.elements.panel = panel;

    // 添加到容器
    container.appendChild(overlay);
    container.appendChild(panel);

    // 绑定遮罩层点击事件
    overlay.addEventListener('click', () => this.hide());

    // ESC键关闭
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.elements.overlay.classList.contains('active')) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * 初始化面板内容（首次显示时调用）
   */
  _initContent() {
    if (this._contentInitialized) return;

    const panel = this.elements.panel;
    
    // 创建面板HTML结构
    panel.innerHTML = `
      <div class="filter-header">
        <h3 class="filter-title">筛选选项</h3>
        <button class="filter-close-btn" aria-label="关闭">×</button>
      </div>
      <div class="filter-content">
        <div class="filter-section">
          <div class="filter-section-title">视图类型</div>
          <div class="filter-view-options"></div>
        </div>
        <div class="filter-section">
          <div class="filter-section-title">排序方式</div>
          <div class="filter-sort-options"></div>
        </div>
        <div class="filter-section">
          <div class="filter-section-title">首字母筛选</div>
          <div class="filter-letters"></div>
        </div>
        <div class="filter-section">
          <div class="filter-section-title">词性筛选</div>
          <div class="filter-pos-options"></div>
        </div>
      </div>
      <div class="filter-actions">
        <button class="filter-reset-btn">
          <span>重置</span>
        </button>
        <button class="filter-apply-btn">
          <span>应用</span>
        </button>
      </div>
    `;

    this.elements.content = panel.querySelector('.filter-content');

    // 批量渲染所有选项
    this._renderAllOptions();

    // 使用事件委托绑定事件
    this._bindEvents();

    this._contentInitialized = true;
  }

  /**
   * 批量渲染所有选项
   */
  _renderAllOptions() {
    // 渲染视图选项
    const viewContainer = this.elements.panel.querySelector('.filter-view-options');
    const viewFragment = document.createDocumentFragment();
    this.viewOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'filter-view-btn' + (this.tempFilters.view === opt.id ? ' active' : '');
      btn.dataset.view = opt.id;
      btn.innerHTML = `${this._getIcon(opt.icon)}<span>${opt.label}</span>`;
      viewFragment.appendChild(btn);
    });
    viewContainer.appendChild(viewFragment);

    // 渲染排序选项
    const sortContainer = this.elements.panel.querySelector('.filter-sort-options');
    const sortFragment = document.createDocumentFragment();
    this.sortOptions.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'filter-sort-item' + (this.tempFilters.sort === opt.id ? ' active' : '');
      item.dataset.sort = opt.id;
      item.innerHTML = `<div class="filter-sort-radio"></div><div class="filter-sort-label">${opt.label}</div>`;
      sortFragment.appendChild(item);
    });
    sortContainer.appendChild(sortFragment);

    // 渲染首字母选项
    const letterContainer = this.elements.panel.querySelector('.filter-letters');
    const letterFragment = document.createDocumentFragment();
    this.letterOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'filter-letter-btn' + (opt.class ? ' ' + opt.class : '') + (this.tempFilters.letter === opt.id ? ' active' : '');
      btn.dataset.letter = opt.id;
      btn.textContent = opt.label;
      letterFragment.appendChild(btn);
    });
    letterContainer.appendChild(letterFragment);

    // 渲染词性选项
    const posContainer = this.elements.panel.querySelector('.filter-pos-options');
    const posFragment = document.createDocumentFragment();
    this.posOptions.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'filter-pos-item' + (this.tempFilters.pos.includes(opt.id) ? ' active' : '');
      item.dataset.pos = opt.id;
      item.innerHTML = `<div class="filter-pos-checkbox"></div><div class="filter-pos-label">${opt.label}</div>`;
      posFragment.appendChild(item);
    });
    posContainer.appendChild(posFragment);
  }

  /**
   * 使用事件委托绑定事件
   */
  _bindEvents() {
    const panel = this.elements.panel;

    // 关闭按钮
    panel.querySelector('.filter-close-btn').addEventListener('click', () => this.hide());

    // 重置按钮
    panel.querySelector('.filter-reset-btn').addEventListener('click', () => this.reset());

    // 应用按钮
    panel.querySelector('.filter-apply-btn').addEventListener('click', () => this.apply());

    // 使用事件委托处理所有选项点击
    panel.querySelector('.filter-content').addEventListener('click', (e) => {
      const target = e.target.closest('[data-view], [data-sort], [data-letter], [data-pos]');
      if (!target) return;

      if (target.dataset.view) {
        this._selectView(target.dataset.view);
      } else if (target.dataset.sort) {
        this._selectSort(target.dataset.sort);
      } else if (target.dataset.letter) {
        this._selectLetter(target.dataset.letter);
      } else if (target.dataset.pos) {
        this._togglePos(target.dataset.pos);
      }
    });

    // 阻止面板点击事件冒泡
    panel.addEventListener('click', (e) => e.stopPropagation());
  }

  /**
   * 获取图标SVG
   */
  _getIcon(type) {
    const icons = {
      grid: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      list: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
      icon: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>',
      coverflow: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="6" height="12" rx="1"></rect><rect x="9" y="4" width="6" height="16" rx="1"></rect><rect x="16" y="6" width="6" height="12" rx="1"></rect></svg>'
    };
    return icons[type] || '';
  }

  /**
   * 选择视图类型
   */
  _selectView(view) {
    this.tempFilters.view = view;
    this.elements.panel.querySelectorAll('.filter-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }

  /**
   * 选择排序方式
   */
  _selectSort(sort) {
    this.tempFilters.sort = sort;
    this.elements.panel.querySelectorAll('.filter-sort-item').forEach(item => {
      item.classList.toggle('active', item.dataset.sort === sort);
    });
  }

  /**
   * 选择首字母
   */
  _selectLetter(letter) {
    this.tempFilters.letter = letter;
    this.elements.panel.querySelectorAll('.filter-letter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.letter === letter);
    });
  }

  /**
   * 切换词性选择
   */
  _togglePos(pos) {
    const index = this.tempFilters.pos.indexOf(pos);
    if (index > -1) {
      this.tempFilters.pos.splice(index, 1);
    } else {
      this.tempFilters.pos.push(pos);
    }
    this.elements.panel.querySelectorAll('.filter-pos-item').forEach(item => {
      item.classList.toggle('active', this.tempFilters.pos.includes(item.dataset.pos));
    });
  }

  /**
   * 重置筛选条件
   */
  reset() {
    this.tempFilters = { view: 'grid', sort: 'count', letter: 'all', pos: [] };
    this._updateUI();
  }

  /**
   * 更新UI显示
   */
  _updateUI() {
    if (!this._contentInitialized) return;
    
    const panel = this.elements.panel;
    panel.querySelectorAll('.filter-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.tempFilters.view);
    });
    panel.querySelectorAll('.filter-sort-item').forEach(item => {
      item.classList.toggle('active', item.dataset.sort === this.tempFilters.sort);
    });
    panel.querySelectorAll('.filter-letter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.letter === this.tempFilters.letter);
    });
    panel.querySelectorAll('.filter-pos-item').forEach(item => {
      item.classList.toggle('active', this.tempFilters.pos.includes(item.dataset.pos));
    });
  }

  /**
   * 应用筛选条件
   */
  apply() {
    this.filters = { ...this.tempFilters };
    if (this.options.onApply && typeof this.options.onApply === 'function') {
      this.options.onApply(this.filters);
    }
    this.hide();
  }

  /**
   * 显示筛选面板
   */
  show() {
    // 强制同步全局视图模式
    if (window.currentViewMode) {
      this.filters.view = window.currentViewMode;
    }

    // 首次显示时初始化内容
    this._initContent();
    
    // 复制当前筛选到临时筛选
    this.tempFilters = { ...this.filters };
    this._updateUI();

    // 使用requestAnimationFrame确保DOM更新后再添加动画类
    requestAnimationFrame(() => {
      this.elements.overlay.classList.add('active');
      this.elements.panel.classList.add('active');
    });

    // 禁用body滚动
    document.body.style.overflow = 'hidden';
  }

  /**
   * 隐藏筛选面板
   */
  hide() {
    this.elements.overlay.classList.remove('active');
    this.elements.panel.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * 获取当前筛选条件
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * 设置筛选条件
   */
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.tempFilters = { ...this.filters };
    this._updateUI();
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
    }
    if (this.elements.overlay) {
      this.elements.overlay.remove();
    }
    if (this.elements.panel) {
      this.elements.panel.remove();
    }
    this.elements = {};
  }
}

// 导出组件 - 浏览器环境直接挂载到 window
if (typeof window !== 'undefined') {
  window.FilterPanel = FilterPanel;
  console.log('FilterPanel 类已挂载到 window 对象');
}

// 兼容 CommonJS 模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterPanel;
}
