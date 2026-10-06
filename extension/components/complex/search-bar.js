/**
 * 搜索栏组件
 * 基于Input和Button组件开发，支持搜索功能、搜索历史和建议
 * 支持 animated 模式，启用渐变旋转边框动效
 */
const BaseComponent = require('../utils/BaseComponent.js');
const Input = require('../base/input.js');
const Button = require('../base/button.js');
const styleManager = require('../utils/style-manager.js');

class SearchBar extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {string} props.placeholder - 占位符
   * @param {string} props.value - 值
   * @param {Array} props.suggestions - 搜索建议列表
   * @param {Array} props.history - 搜索历史列表
   * @param {Function} props.onSearch - 搜索事件回调
   * @param {Function} props.onClear - 清空事件回调
   * @param {Function} props.onSuggestionClick - 建议点击事件回调
   * @param {Function} props.onHistoryClick - 历史点击事件回调
   * @param {boolean} props.showSuggestions - 是否显示建议
   * @param {boolean} props.showHistory - 是否显示历史
   * @param {string} props.size - 尺寸：small, medium, large
   * @param {boolean} props.animated - 是否启用动效模式（默认 false）
   */
  constructor(props = {}) {
    super(props);

    // 默认属性
    this.defaultProps = {
      placeholder: '搜索单词...',
      value: '',
      suggestions: [],
      history: [],
      onSearch: () => {},
      onClear: () => {},
      onSuggestionClick: () => {},
      onHistoryClick: () => {},
      showSuggestions: true,
      showHistory: true,
      size: 'medium',
      animated: false
    };

    this.props = { ...this.defaultProps, ...props };
    this.state = {
      value: this.props.value,
      showDropdown: false,
      filteredSuggestions: this.props.suggestions
    };

    // 组件实例
    this.input = null;
    this.searchButton = null;
    this.clearButton = null;

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
      '.search-bar': {
        'position': 'relative',
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px',
        'width': '100%'
      },

      '.search-bar-input-container': {
        'flex': '1',
        'position': 'relative'
      },

      '.search-bar-input': {
        'width': '100%'
      },

      '.search-bar-buttons': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px'
      },

      '.search-bar-clear-btn': {
        'position': 'absolute',
        'right': '8px',
        'top': '50%',
        'transform': 'translateY(-50%)',
        'z-index': '2',
        'background': 'none',
        'border': 'none',
        'color': 'var(--text-secondary)',
        'cursor': 'pointer',
        'padding': '4px',
        'border-radius': 'var(--border-radius-sm)',
        'transition': 'all 0.2s ease',
        'font-size': 'var(--font-size-lg)'
      },

      '.search-bar-clear-btn:hover': {
        'background': 'var(--bg-hover)',
        'color': 'var(--text-primary)'
      },

      '.search-bar-dropdown': {
        'position': 'absolute',
        'top': '100%',
        'left': '0',
        'right': '0',
        'background': 'var(--bg-primary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-md)',
        'box-shadow': 'var(--shadow-lg)',
        'margin-top': '4px',
        'z-index': '100',
        'max-height': '300px',
        'overflow-y': 'auto',
        'opacity': '0',
        'visibility': 'hidden',
        'transition': 'all 0.2s ease'
      },

      '.search-bar-dropdown.visible': {
        'opacity': '1',
        'visibility': 'visible'
      },

      '.search-bar-section': {
        'padding': '8px 0'
      },

      '.search-bar-section-title': {
        'font-size': 'var(--font-size-xs)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-tertiary)',
        'padding': '4px 12px',
        'margin': '0',
        'text-transform': 'uppercase',
        'letter-spacing': '0.5px'
      },

      '.search-bar-item': {
        'display': 'flex',
        'align-items': 'center',
        'padding': '8px 12px',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease',
        'gap': '8px'
      },

      '.search-bar-item:hover': {
        'background': 'var(--bg-hover)'
      },

      '.search-bar-item-icon': {
        'font-size': 'var(--font-size-sm)',
        'color': 'var(--text-secondary)',
        'flex-shrink': '0'
      },

      '.search-bar-item-text': {
        'font-size': 'var(--font-size-md)',
        'color': 'var(--text-primary)',
        'flex': '1'
      },

      '.search-bar-item-highlight': {
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--accent-primary)'
      },

      '.search-bar-divider': {
        'height': '1px',
        'background': 'var(--border-color)',
        'margin': '4px 0'
      },

      '.search-bar-empty': {
        'padding': '16px',
        'text-align': 'center',
        'color': 'var(--text-secondary)',
        'font-size': 'var(--font-size-sm)'
      }
    };

    styleManager.registerStyle('search-bar', styles);
  }

  /**
   * 创建DOM结构
   */
  createDOM() {
    // 根据 animated 模式创建不同的结构
    if (this.props.animated) {
      this.createAnimatedDOM();
    } else {
      this.createStandardDOM();
    }
  }

  /**
   * 创建带动效的DOM结构
   */
  createAnimatedDOM() {
    // 创建搜索栏容器
    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar search-bar--animated';

    // 动效层
    this.createEffectLayers(searchBar);

    // 主容器
    const mainContainer = document.createElement('div');
    mainContainer.className = 'search-bar__main';

    // 搜索图标
    const searchIcon = document.createElement('div');
    searchIcon.className = 'search-bar__search-icon';
    searchIcon.innerHTML = this.getSearchIconSVG();
    mainContainer.appendChild(searchIcon);

    // 输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'search-bar__input';
    input.placeholder = this.props.placeholder;
    input.value = this.state.value;
    mainContainer.appendChild(input);

    // 输入遮罩
    const inputMask = document.createElement('div');
    inputMask.className = 'search-bar__input-mask';
    mainContainer.appendChild(inputMask);

    // 粉色遮罩
    const pinkMask = document.createElement('div');
    pinkMask.className = 'search-bar__pink-mask';
    mainContainer.appendChild(pinkMask);

    // 过滤图标（可选）
    if (this.props.showFilterIcon) {
      this.createFilterIcon(mainContainer);
    }

    searchBar.appendChild(mainContainer);
    this.el = searchBar;

    // 绑定输入事件
    input.addEventListener('input', (e) => this.handleInputChange(e));
    input.addEventListener('focus', () => this.handleInputFocus());
    input.addEventListener('blur', () => this.handleInputBlur());
    input.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /**
   * 创建动效层
   */
  createEffectLayers(container) {
    // 发光层
    const glow = document.createElement('div');
    glow.className = 'search-bar__effect-layer search-bar__glow';
    container.appendChild(glow);

    // 深色边框背景层（3层）
    for (let i = 0; i < 3; i++) {
      const darkBorderBg = document.createElement('div');
      darkBorderBg.className = 'search-bar__effect-layer search-bar__dark-border-bg';
      container.appendChild(darkBorderBg);
    }

    // 白色层
    const white = document.createElement('div');
    white.className = 'search-bar__effect-layer search-bar__white';
    container.appendChild(white);

    // 边框层
    const border = document.createElement('div');
    border.className = 'search-bar__effect-layer search-bar__border';
    container.appendChild(border);
  }

  /**
   * 创建过滤图标
   */
  createFilterIcon(container) {
    // 过滤图标边框
    const filterBorder = document.createElement('div');
    filterBorder.className = 'search-bar__filter-border';
    container.appendChild(filterBorder);

    // 过滤图标容器
    const filterIcon = document.createElement('div');
    filterIcon.className = 'search-bar__filter-icon-container';
    filterIcon.innerHTML = this.getFilterIconSVG();
    container.appendChild(filterIcon);
  }

  /**
   * 获取搜索图标SVG
   */
  getSearchIconSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" height="24" fill="none">
      <circle stroke="url(#search-bar-gradient)" r="8" cy="11" cx="11"></circle>
      <line stroke="url(#search-bar-line-gradient)" y2="16.65" y1="22" x2="16.65" x1="22"></line>
      <defs>
        <linearGradient gradientTransform="rotate(50)" id="search-bar-gradient">
          <stop stop-color="#f8e7f8" offset="0%"></stop>
          <stop stop-color="#b6a9b7" offset="50%"></stop>
        </linearGradient>
        <linearGradient id="search-bar-line-gradient">
          <stop stop-color="#b6a9b7" offset="0%"></stop>
          <stop stop-color="#837484" offset="50%"></stop>
        </linearGradient>
      </defs>
    </svg>`;
  }

  /**
   * 获取过滤图标SVG
   */
  getFilterIconSVG() {
    return `<svg preserveAspectRatio="none" height="27" width="27" viewBox="4.8 4.56 14.832 15.408" fill="none">
      <path d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
        stroke="#d6d6e6" stroke-width="1" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;
  }

  /**
   * 创建标准DOM结构
   */
  createStandardDOM() {
    // 创建搜索栏容器
    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar';

    // 输入框容器
    const inputContainer = document.createElement('div');
    inputContainer.className = 'search-bar-input-container';

    // 创建输入框
    this.input = new Input({
      type: 'search',
      placeholder: this.props.placeholder,
      value: this.state.value,
      variant: 'search',
      size: this.props.size,
      className: 'search-bar-input',
      onChange: (e) => this.handleInputChange(e),
      onFocus: () => this.handleInputFocus(),
      onBlur: () => this.handleInputBlur()
    });

    const inputElement = this.input.render();
    inputContainer.appendChild(inputElement);

    // 清空按钮
    if (this.state.value) {
      this.clearButton = document.createElement('button');
      this.clearButton.className = 'search-bar-clear-btn';
      this.clearButton.innerHTML = '&times;';
      this.clearButton.title = '清空';
      this.clearButton.addEventListener('click', () => this.handleClear());
      inputContainer.appendChild(this.clearButton);
    }

    searchBar.appendChild(inputContainer);

    // 按钮组
    const buttons = document.createElement('div');
    buttons.className = 'search-bar-buttons';

    // 搜索按钮
    this.searchButton = new Button({
      text: '搜索',
      icon: '🔍',
      variant: 'primary',
      size: this.props.size,
      onClick: () => this.handleSearch()
    });

    const searchButtonElement = this.searchButton.render();
    buttons.appendChild(searchButtonElement);

    searchBar.appendChild(buttons);

    // 下拉菜单
    this.dropdown = document.createElement('div');
    this.dropdown.className = `search-bar-dropdown ${this.state.showDropdown ? 'visible' : ''}`;
    inputContainer.appendChild(this.dropdown);

    // 渲染下拉菜单内容
    this.renderDropdown();

    this.el = searchBar;
  }

  /**
   * 渲染下拉菜单
   */
  renderDropdown() {
    if (!this.dropdown || this.props.animated) return;

    // 清空下拉菜单
    this.dropdown.innerHTML = '';

    let hasContent = false;

    // 渲染搜索历史
    if (this.props.showHistory && this.props.history && this.props.history.length > 0) {
      hasContent = true;

      // 历史记录标题
      const historyTitle = document.createElement('h4');
      historyTitle.className = 'search-bar-section-title';
      historyTitle.textContent = '搜索历史';
      this.dropdown.appendChild(historyTitle);

      // 历史记录列表
      this.props.history.forEach((item, index) => {
        const historyItem = this.createDropdownItem({
          text: item,
          icon: '🕒',
          onClick: () => this.handleHistoryClick(item)
        });
        this.dropdown.appendChild(historyItem);
      });
    }

    // 渲染搜索建议
    if (this.props.showSuggestions && this.state.filteredSuggestions && this.state.filteredSuggestions.length > 0) {
      // 如果有历史记录，添加分隔线
      if (hasContent) {
        const divider = document.createElement('div');
        divider.className = 'search-bar-divider';
        this.dropdown.appendChild(divider);
      }

      hasContent = true;

      // 建议标题
      const suggestionsTitle = document.createElement('h4');
      suggestionsTitle.className = 'search-bar-section-title';
      suggestionsTitle.textContent = '搜索建议';
      this.dropdown.appendChild(suggestionsTitle);

      // 建议列表
      this.state.filteredSuggestions.forEach((item, index) => {
        const suggestionItem = this.createDropdownItem({
          text: item,
          icon: '💡',
          onClick: () => this.handleSuggestionClick(item)
        });
        this.dropdown.appendChild(suggestionItem);
      });
    }

    // 如果没有内容，显示空状态
    if (!hasContent) {
      const empty = document.createElement('div');
      empty.className = 'search-bar-empty';
      empty.textContent = '没有搜索历史和建议';
      this.dropdown.appendChild(empty);
    }
  }

  /**
   * 创建下拉菜单项
   * @param {Object} item - 菜单项配置
   * @returns {HTMLElement} - 菜单项元素
   */
  createDropdownItem(item) {
    const dropdownItem = document.createElement('div');
    dropdownItem.className = 'search-bar-item';

    // 图标
    const icon = document.createElement('span');
    icon.className = 'search-bar-item-icon';
    icon.innerHTML = item.icon;
    dropdownItem.appendChild(icon);

    // 文本
    const text = document.createElement('span');
    text.className = 'search-bar-item-text';

    // 高亮匹配文本
    if (this.state.value) {
      const regex = new RegExp(`(${this.state.value})`, 'gi');
      text.innerHTML = item.text.replace(regex, '<span class="search-bar-item-highlight">$1</span>');
    } else {
      text.textContent = item.text;
    }

    dropdownItem.appendChild(text);

    // 点击事件
    dropdownItem.addEventListener('click', item.onClick);

    return dropdownItem;
  }

  /**
   * 处理输入变化
   * @param {Event} e - 输入事件
   */
  handleInputChange(e) {
    const value = e.target.value;
    this.setState({ value });

    // 过滤建议
    this.filterSuggestions(value);

    // 更新清空按钮（仅标准模式）
    if (!this.props.animated) {
      this.updateClearButton();
    }

    // 显示下拉菜单
    this.setState({ showDropdown: true });
  }

  /**
   * 处理输入聚焦
   */
  handleInputFocus() {
    this.setState({ showDropdown: true });

    // 动效模式：隐藏所有紫色动效层
    if (this.props.animated && this.el) {
      const effectLayers = this.el.querySelectorAll('.search-bar__effect-layer');
      effectLayers.forEach(layer => {
        layer.style.display = 'none';
        layer.style.opacity = '0';
        layer.style.visibility = 'hidden';
      });

      const pinkMask = this.el.querySelector('.search-bar__pink-mask');
      if (pinkMask) {
        pinkMask.style.display = 'none';
        pinkMask.style.opacity = '0';
      }

      const inputMask = this.el.querySelector('.search-bar__input-mask');
      if (inputMask) {
        inputMask.style.display = 'none';
      }

      const filterBorder = this.el.querySelector('.search-bar__filter-border');
      if (filterBorder) {
        filterBorder.style.display = 'none';
        filterBorder.style.opacity = '0';
        filterBorder.style.visibility = 'hidden';
      }
    }
  }

  /**
   * 处理输入失焦
   */
  handleInputBlur() {
    // 延迟隐藏下拉菜单，以便点击事件可以触发
    setTimeout(() => {
      this.setState({ showDropdown: false });
    }, 200);

    // 动效模式：恢复所有紫色动效层
    if (this.props.animated && this.el) {
      const effectLayers = this.el.querySelectorAll('.search-bar__effect-layer');
      effectLayers.forEach(layer => {
        layer.style.display = '';
        layer.style.opacity = '';
        layer.style.visibility = '';
      });

      const pinkMask = this.el.querySelector('.search-bar__pink-mask');
      if (pinkMask) {
        pinkMask.style.display = '';
        pinkMask.style.opacity = '';
      }

      const inputMask = this.el.querySelector('.search-bar__input-mask');
      if (inputMask) {
        inputMask.style.display = '';
      }

      const filterBorder = this.el.querySelector('.search-bar__filter-border');
      if (filterBorder) {
        filterBorder.style.display = '';
        filterBorder.style.opacity = '';
        filterBorder.style.visibility = '';
      }
    }
  }

  /**
   * 处理键盘事件
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleKeyDown(e) {
    if (e.key === 'Enter') {
      this.handleSearch();
    } else if (e.key === 'Escape') {
      this.setState({ showDropdown: false });
    }
  }

  /**
   * 处理搜索
   */
  handleSearch() {
    if (this.props.onSearch) {
      this.props.onSearch(this.state.value);
    }

    // 隐藏下拉菜单
    this.setState({ showDropdown: false });
  }

  /**
   * 处理清空
   */
  handleClear() {
    this.setState({ value: '', showDropdown: false });

    // 更新输入框值
    if (this.input) {
      this.input.setValue('');
    } else if (this.el && this.el.querySelector('.search-bar__input')) {
      const inputEl = this.el.querySelector('.search-bar__input');
      inputEl.value = '';
    }

    // 移除清空按钮
    if (this.clearButton && this.clearButton.parentNode) {
      this.clearButton.parentNode.removeChild(this.clearButton);
      this.clearButton = null;
    }

    // 调用清空回调
    if (this.props.onClear) {
      this.props.onClear();
    }
  }

  /**
   * 处理建议点击
   * @param {string} suggestion - 建议文本
   */
  handleSuggestionClick(suggestion) {
    this.setState({ value: suggestion, showDropdown: false });

    // 更新输入框值
    if (this.input) {
      this.input.setValue(suggestion);
    } else if (this.el && this.el.querySelector('.search-bar__input')) {
      const inputEl = this.el.querySelector('.search-bar__input');
      inputEl.value = suggestion;
    }

    // 更新清空按钮（仅标准模式）
    if (!this.props.animated) {
      this.updateClearButton();
    }

    // 调用建议点击回调
    if (this.props.onSuggestionClick) {
      this.props.onSuggestionClick(suggestion);
    }

    // 执行搜索
    this.handleSearch();
  }

  /**
   * 处理历史点击
   * @param {string} historyItem - 历史记录文本
   */
  handleHistoryClick(historyItem) {
    this.setState({ value: historyItem, showDropdown: false });

    // 更新输入框值
    if (this.input) {
      this.input.setValue(historyItem);
    } else if (this.el && this.el.querySelector('.search-bar__input')) {
      const inputEl = this.el.querySelector('.search-bar__input');
      inputEl.value = historyItem;
    }

    // 更新清空按钮（仅标准模式）
    if (!this.props.animated) {
      this.updateClearButton();
    }

    // 调用历史点击回调
    if (this.props.onHistoryClick) {
      this.props.onHistoryClick(historyItem);
    }

    // 执行搜索
    this.handleSearch();
  }

  /**
   * 过滤建议
   * @param {string} query - 搜索关键词
   */
  filterSuggestions(query) {
    if (!query || !this.props.suggestions) {
      this.setState({ filteredSuggestions: this.props.suggestions || [] });
      return;
    }

    const filtered = this.props.suggestions.filter(suggestion => {
      return suggestion.toLowerCase().includes(query.toLowerCase());
    });

    this.setState({ filteredSuggestions: filtered });
    this.renderDropdown();
  }

  /**
   * 更新清空按钮
   */
  updateClearButton() {
    // 如果有值且没有清空按钮，创建清空按钮
    if (this.state.value && !this.clearButton) {
      this.clearButton = document.createElement('button');
      this.clearButton.className = 'search-bar-clear-btn';
      this.clearButton.innerHTML = '&times;';
      this.clearButton.title = '清空';
      this.clearButton.addEventListener('click', () => this.handleClear());

      const inputContainer = this.el.querySelector('.search-bar-input-container');
      if (inputContainer) {
        inputContainer.appendChild(this.clearButton);
      }
    }
    // 如果没有值但有清空按钮，移除清空按钮
    else if (!this.state.value && this.clearButton) {
      if (this.clearButton.parentNode) {
        this.clearButton.parentNode.removeChild(this.clearButton);
      }
      this.clearButton = null;
    }
  }

  /**
   * 获取输入值
   * @returns {string} - 输入值
   */
  getValue() {
    return this.state.value;
  }

  /**
   * 设置输入值
   * @param {string} value - 输入值
   */
  setValue(value) {
    this.setState({ value });

    if (this.input) {
      this.input.setValue(value);
    } else if (this.el && this.el.querySelector('.search-bar__input')) {
      const inputEl = this.el.querySelector('.search-bar__input');
      inputEl.value = value;
    }

    this.updateClearButton();
    this.filterSuggestions(value);
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

      // 如果提供了新的value，更新状态
      if (newProps.value !== undefined) {
        this.setState({ value: newProps.value });
      }

      // 如果提供了新的suggestions，更新状态
      if (newProps.suggestions) {
        this.setState({ filteredSuggestions: newProps.suggestions });
      }

      this.createDOM();
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.unbindEvents();

    // 销毁子组件
    if (this.input) {
      this.input.destroy();
    }

    if (this.searchButton) {
      this.searchButton.destroy();
    }

    super.destroy();
  }
}

// 导出组件
module.exports = SearchBar;
