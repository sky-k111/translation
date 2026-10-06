/**
 * Content脚本上下文菜单和快捷键组件
 * 5.2.5：迁移Content上下文菜单和快捷键功能到组件
 */
const ContentComponent = require('../utils/ContentComponent.js');
const styleManager = require('../../utils/style-manager.js');

class ContextMenu extends ContentComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {Function} props.onTranslation - 翻译事件回调
   * @param {Function} props.onSave - 保存事件回调
   * @param {Function} props.onSearch - 搜索事件回调
   * @param {Object} props.hotkeys - 快捷键配置
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      onTranslation: () => {},
      onSave: () => {},
      onSearch: () => {},
      hotkeys: {
        translate: ['Enter', ' '], // 翻译快捷键
        save: ['s', 'S'], // 保存快捷键
        search: ['f', 'F'], // 搜索快捷键
        close: ['Escape'] // 关闭快捷键
      }
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      visible: false,
      menu: null,
      selectedText: '',
      selectedRange: null,
      contextMenuPosition: { x: 0, y: 0 }
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
  }

  /**
   * 注册组件样式
   */
  registerStyle() {
    // 注册上下文菜单的样式
    const styles = {
      '.custom-context-menu': {
        'position': 'fixed',
        'background': 'var(--bg-primary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-md)',
        'box-shadow': 'var(--shadow-xl)',
        'z-index': '10000',
        'min-width': '180px',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'animation': 'menuFadeIn 0.2s ease-out',
        'transition': 'all 0.2s ease'
      },
      
      '@keyframes menuFadeIn': {
        '0%': {
          'opacity': '0',
          'transform': 'scale(0.95)'
        },
        '100%': {
          'opacity': '1',
          'transform': 'scale(1)'
        }
      },
      
      '.custom-context-menu ul': {
        'list-style': 'none',
        'padding': '4px 0',
        'margin': '0'
      },
      
      '.custom-context-menu li': {
        'margin': '0',
        'padding': '0'
      },
      
      '.custom-context-menu button': {
        'display': 'block',
        'width': '100%',
        'padding': '8px 16px',
        'background': 'none',
        'border': 'none',
        'border-radius': 'var(--border-radius-sm)',
        'color': 'var(--text-primary)',
        'font-size': 'var(--font-size-sm)',
        'text-align': 'left',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease'
      },
      
      '.custom-context-menu button:hover': {
        'background': 'var(--bg-hover)',
        'color': 'var(--text-primary)'
      },
      
      '.custom-context-menu .menu-divider': {
        'height': '1px',
        'background': 'var(--border-color)',
        'margin': '4px 0'
      },
      
      '.custom-context-menu .menu-shortcut': {
        'float': 'right',
        'color': 'var(--text-secondary)',
        'font-size': 'var(--font-size-xs)'
      }
    };
    
    styleManager.registerStyle('context-menu', styles);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听右键菜单事件
    this.bindEvent(document, 'contextmenu', this.handleContextMenu.bind(this));
    
    // 监听键盘事件
    this.bindEvent(document, 'keydown', this.handleKeyDown.bind(this));
    
    // 监听点击事件（关闭菜单）
    this.bindEvent(document, 'click', this.handleClickOutside.bind(this));
    
    // 监听滚动事件（关闭菜单）
    this.bindEvent(window, 'scroll', this.handleScroll.bind(this));
  }

  /**
   * 处理右键菜单事件
   * @param {MouseEvent} e - 鼠标事件
   */
  handleContextMenu(e) {
    // 检查是否有输入框或文本区域处于焦点状态
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // 如果不在输入框内，且有选中文本，则显示自定义菜单
    if (!isInputFocused) {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 0) {
        e.preventDefault();
        
        // 保存选中的文本和范围
        this.state.selectedText = text;
        this.state.selectedRange = selection.getRangeAt(0).cloneRange();
        
        // 记录菜单位置
        this.state.contextMenuPosition = {
          x: e.clientX,
          y: e.clientY
        };
        
        // 显示上下文菜单
        this.showMenu();
      }
    }
  }

  /**
   * 处理键盘事件
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleKeyDown(e) {
    // 检查是否有输入框或文本区域处于焦点状态
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    if (isInputFocused) return;
    
    // 检查是否有选中文本
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (!text) return;
    
    // 保存选中的文本和范围
    this.state.selectedText = text;
    if (selection.rangeCount > 0) {
      this.state.selectedRange = selection.getRangeAt(0).cloneRange();
    }
    
    // 处理快捷键
    if (this.props.hotkeys.translate.includes(e.key)) {
      // 翻译快捷键
      e.preventDefault();
      this.handleTranslation();
    } else if (this.props.hotkeys.save.includes(e.key)) {
      // 保存快捷键
      e.preventDefault();
      this.handleSave();
    } else if (this.props.hotkeys.search.includes(e.key)) {
      // 搜索快捷键
      e.preventDefault();
      this.handleSearch();
    } else if (this.props.hotkeys.close.includes(e.key)) {
      // 关闭快捷键
      e.preventDefault();
      this.hideMenu();
    }
  }

  /**
   * 处理外部点击事件，关闭菜单
   * @param {MouseEvent} e - 鼠标事件
   */
  handleClickOutside(e) {
    if (this.state.visible && this.state.menu && !this.state.menu.contains(e.target)) {
      this.hideMenu();
    }
  }

  /**
   * 处理滚动事件，关闭菜单
   */
  handleScroll() {
    if (this.state.visible) {
      this.hideMenu();
    }
  }

  /**
   * 显示上下文菜单
   */
  showMenu() {
    // 先隐藏已有的菜单
    this.hideMenu();
    
    // 创建菜单
    this.createMenu();
    
    // 添加到文档
    document.body.appendChild(this.state.menu);
    this.state.visible = true;
  }

  /**
   * 创建上下文菜单
   */
  createMenu() {
    // 创建菜单容器
    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    
    // 设置位置
    menu.style.left = `${this.state.contextMenuPosition.x}px`;
    menu.style.top = `${this.state.contextMenuPosition.y}px`;
    
    // 确保菜单不超出视口
    this.adjustMenuPosition(menu);
    
    // 菜单HTML结构
    menu.innerHTML = `
      <ul>
        <li><button id="menu-translate">翻译 ${this.state.selectedText}<span class="menu-shortcut">Enter/Space</span></button></li>
        <li><div class="menu-divider"></div></li>
        <li><button id="menu-save">保存到单词本<span class="menu-shortcut">S</span></button></li>
        <li><button id="menu-search">搜索<span class="menu-shortcut">F</span></button></li>
        <li><div class="menu-divider"></div></li>
        <li><button id="menu-close">关闭<span class="menu-shortcut">ESC</span></button></li>
      </ul>
    `;
    
    // 绑定菜单事件
    this.bindMenuEvents(menu);
    
    this.state.menu = menu;
  }

  /**
   * 调整菜单位置，确保不超出视口
   * @param {HTMLElement} menu - 菜单元素
   */
  adjustMenuPosition(menu) {
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 调整水平位置
    if (menuRect.right > viewportWidth) {
      menu.style.left = `${this.state.contextMenuPosition.x - menuRect.width}px`;
    }
    
    // 调整垂直位置
    if (menuRect.bottom > viewportHeight) {
      menu.style.top = `${this.state.contextMenuPosition.y - menuRect.height}px`;
    }
    
    // 确保不小于0
    if (parseInt(menu.style.left) < 0) {
      menu.style.left = '0px';
    }
    
    if (parseInt(menu.style.top) < 0) {
      menu.style.top = '0px';
    }
  }

  /**
   * 绑定菜单事件
   * @param {HTMLElement} menu - 菜单元素
   */
  bindMenuEvents(menu) {
    // 翻译按钮
    const translateBtn = menu.querySelector('#menu-translate');
    if (translateBtn) {
      translateBtn.addEventListener('click', this.handleTranslation.bind(this));
    }
    
    // 保存按钮
    const saveBtn = menu.querySelector('#menu-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', this.handleSave.bind(this));
    }
    
    // 搜索按钮
    const searchBtn = menu.querySelector('#menu-search');
    if (searchBtn) {
      searchBtn.addEventListener('click', this.handleSearch.bind(this));
    }
    
    // 关闭按钮
    const closeBtn = menu.querySelector('#menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.hideMenu.bind(this));
    }
  }

  /**
   * 处理翻译事件
   */
  handleTranslation() {
    this.props.onTranslation({
      text: this.state.selectedText,
      range: this.state.selectedRange
    });
    this.hideMenu();
  }

  /**
   * 处理保存事件
   */
  handleSave() {
    this.props.onSave({
      text: this.state.selectedText,
      range: this.state.selectedRange
    });
    this.hideMenu();
  }

  /**
   * 处理搜索事件
   */
  handleSearch() {
    this.props.onSearch({
      text: this.state.selectedText,
      range: this.state.selectedRange
    });
    this.hideMenu();
  }

  /**
   * 隐藏上下文菜单
   */
  hideMenu() {
    if (this.state.visible && this.state.menu && this.state.menu.parentNode) {
      this.state.menu.parentNode.removeChild(this.state.menu);
      this.state.menu = null;
      this.state.visible = false;
    }
  }

  /**
   * 获取当前选中的文本
   * @returns {string} - 选中的文本
   */
  getSelectedText() {
    return this.state.selectedText;
  }

  /**
   * 设置选中的文本
   * @param {string} text - 文本
   * @param {Range} range - 范围
   */
  setSelectedText(text, range) {
    this.state.selectedText = text;
    this.state.selectedRange = range;
  }

  /**
   * 渲染组件
   * @returns {HTMLElement|null} - 组件DOM元素，此组件无常驻DOM
   */
  render() {
    // 此组件只有动态创建的上下文菜单，无常驻DOM
    return null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 隐藏菜单
    this.hideMenu();
    
    super.destroy();
  }
}

// 导出组件
module.exports = ContextMenu;