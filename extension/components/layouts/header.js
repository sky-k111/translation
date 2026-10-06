/**
 * 头部组件
 * 实现头部布局，包含logo、标题、设置按钮等
 */
const BaseComponent = require('../utils/BaseComponent.js');
const Button = require('../base/button.js');
const styleManager = require('../utils/style-manager.js');

class Header extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {string} props.title - 标题
   * @param {string} props.logo - Logo
   * @param {Array} props.actions - 操作按钮配置
   * @param {Function} props.onSettingsClick - 设置按钮点击事件回调
   * @param {Function} props.onHomeClick - 首页点击事件回调
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      title: '单词翻译助手',
      logo: '🌐',
      actions: [],
      onSettingsClick: () => {},
      onHomeClick: () => {}
    };
    
    this.props = { ...this.defaultProps, ...props };
    this.state = {};
    
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
      '.header': {
        'background': 'var(--bg-primary)',
        'border-bottom': '1px solid var(--border-color)',
        'padding': '12px 20px',
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'box-shadow': 'var(--shadow-sm)',
        'position': 'sticky',
        'top': '0',
        'z-index': '100',
        'transition': 'all 0.3s ease'
      },
      
      '.header-left': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '12px'
      },
      
      '.header-logo': {
        'font-size': 'var(--font-size-2xl)',
        'cursor': 'pointer',
        'transition': 'transform 0.2s ease'
      },
      
      '.header-logo:hover': {
        'transform': 'scale(1.1)'
      },
      
      '.header-title': {
        'font-size': 'var(--font-size-xl)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-primary)',
        'margin': '0',
        'cursor': 'pointer',
        'transition': 'color 0.2s ease'
      },
      
      '.header-title:hover': {
        'color': 'var(--accent-primary)'
      },
      
      '.header-center': {
        'flex': '1',
        'max-width': '600px',
        'margin': '0 20px'
      },
      
      '.header-right': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px'
      },
      
      '.header-actions': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px'
      },
      
      '.header-settings-btn': {
        'background': 'none',
        'border': 'none',
        'color': 'var(--text-secondary)',
        'cursor': 'pointer',
        'padding': '8px',
        'border-radius': 'var(--border-radius-md)',
        'transition': 'all 0.2s ease',
        'font-size': 'var(--font-size-lg)'
      },
      
      '.header-settings-btn:hover': {
        'background': 'var(--bg-hover)',
        'color': 'var(--text-primary)'
      }
    };
    
    styleManager.registerStyle('header', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建头部容器
    const header = document.createElement('div');
    header.className = 'header';
    
    // 左侧区域（Logo和标题）
    const left = document.createElement('div');
    left.className = 'header-left';
    
    // Logo
    const logo = document.createElement('div');
    logo.className = 'header-logo';
    logo.innerHTML = this.props.logo;
    logo.addEventListener('click', this.props.onHomeClick);
    left.appendChild(logo);
    
    // 标题
    const title = document.createElement('h1');
    title.className = 'header-title';
    title.textContent = this.props.title;
    title.addEventListener('click', this.props.onHomeClick);
    left.appendChild(title);
    
    header.appendChild(left);
    
    // 中间区域（可用于搜索栏等）
    const center = document.createElement('div');
    center.className = 'header-center';
    header.appendChild(center);
    
    // 右侧区域（操作按钮和设置按钮）
    const right = document.createElement('div');
    right.className = 'header-right';
    
    // 操作按钮
    if (this.props.actions && this.props.actions.length > 0) {
      const actions = document.createElement('div');
      actions.className = 'header-actions';
      
      this.props.actions.forEach(action => {
        const button = new Button(action);
        actions.appendChild(button.render());
      });
      
      right.appendChild(actions);
    }
    
    // 设置按钮
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'header-settings-btn';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = '设置';
    settingsBtn.addEventListener('click', this.props.onSettingsClick);
    right.appendChild(settingsBtn);
    
    header.appendChild(right);
    
    this.el = header;
    this.centerEl = center;
  }
  
  /**
   * 设置中间区域内容
   * @param {HTMLElement} content - 中间区域内容
   */
  setCenterContent(content) {
    if (this.centerEl) {
      this.centerEl.innerHTML = '';
      this.centerEl.appendChild(content);
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
module.exports = Header;