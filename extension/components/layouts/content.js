/**
 * 内容区域组件
 * 实现内容区域布局，支持不同内容类型
 */
const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

class Content extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {string|HTMLElement} props.content - 内容
   * @param {string} props.layout - 布局类型：single, multi, grid, flex
   * @param {number} props.columns - 列数（仅适用于grid布局）
   * @param {string} props.gap - 间距
   * @param {boolean} props.padded - 是否添加内边距
   * @param {string} props.variant - 变体：default, card, plain
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      content: '',
      layout: 'single',
      columns: 1,
      gap: '20px',
      padded: true,
      variant: 'default'
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
      '.content': {
        'background': 'var(--bg-primary)',
        'transition': 'all 0.3s ease',
        'min-height': 'calc(100vh - 60px)',
        'width': '100%'
      },
      
      '.content.padded': {
        'padding': '20px'
      },
      
      '.content.plain': {
        'background': 'transparent',
        'border': 'none',
        'padding': '0'
      },
      
      '.content.card': {
        'background': 'var(--bg-primary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-lg)',
        'box-shadow': 'var(--shadow-sm)',
        'margin': '0 auto',
        'max-width': '1200px'
      },
      
      '.content-container': {
        'width': '100%',
        'max-width': '1200px',
        'margin': '0 auto',
        'transition': 'all 0.3s ease'
      },
      
      // 布局样式
      '.content.single .content-container': {
        'display': 'block'
      },
      
      '.content.multi .content-container': {
        'display': 'flex',
        'flex-direction': 'column',
        'gap': '20px'
      },
      
      '.content.flex .content-container': {
        'display': 'flex',
        'flex-wrap': 'wrap',
        'gap': '20px'
      },
      
      '.content.grid .content-container': {
        'display': 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
        'gap': '20px'
      },
      
      // 列数样式
      '.content.grid.columns-1 .content-container': {
        'grid-template-columns': '1fr'
      },
      
      '.content.grid.columns-2 .content-container': {
        'grid-template-columns': 'repeat(2, 1fr)'
      },
      
      '.content.grid.columns-3 .content-container': {
        'grid-template-columns': 'repeat(3, 1fr)'
      },
      
      '.content.grid.columns-4 .content-container': {
        'grid-template-columns': 'repeat(4, 1fr)'
      },
      
      // 间距样式
      '.content.gap-small .content-container': {
        'gap': '10px'
      },
      
      '.content.gap-medium .content-container': {
        'gap': '20px'
      },
      
      '.content.gap-large .content-container': {
        'gap': '30px'
      },
      
      // 内容项样式
      '.content-item': {
        'transition': 'all 0.3s ease'
      },
      
      // 空状态样式
      '.content-empty': {
        'text-align': 'center',
        'padding': '60px 20px',
        'color': 'var(--text-secondary)',
        'background': 'var(--bg-secondary)',
        'border-radius': 'var(--border-radius-lg)',
        'border': '1px dashed var(--border-color)'
      },
      
      '.content-empty-icon': {
        'font-size': 'var(--font-size-3xl)',
        'margin-bottom': '12px',
        'display': 'block'
      },
      
      '.content-empty-text': {
        'font-size': 'var(--font-size-md)',
        'margin': '0'
      }
    };
    
    styleManager.registerStyle('content', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建内容容器
    const content = document.createElement('div');
    
    // 构建类名
    const classes = [
      'content',
      this.props.layout,
      `columns-${this.props.columns}`,
      this.props.variant
    ];
    
    // 添加间距类
    if (this.props.gap === 'small') {
      classes.push('gap-small');
    } else if (this.props.gap === 'large') {
      classes.push('gap-large');
    } else {
      classes.push('gap-medium');
    }
    
    // 添加内边距类
    if (this.props.padded) {
      classes.push('padded');
    }
    
    content.className = classes.join(' ');
    
    // 创建内容容器
    const container = document.createElement('div');
    container.className = 'content-container';
    
    // 添加内容
    if (typeof this.props.content === 'string') {
      // 如果内容是字符串，直接设置innerHTML
      if (this.props.content.trim()) {
        container.innerHTML = this.props.content;
      } else {
        // 空状态
        this.renderEmptyState(container);
      }
    } else if (this.props.content instanceof HTMLElement) {
      // 如果内容是DOM元素，直接添加
      container.appendChild(this.props.content);
    } else if (Array.isArray(this.props.content)) {
      // 如果内容是数组，遍历添加
      if (this.props.content.length > 0) {
        this.props.content.forEach(item => {
          const contentItem = document.createElement('div');
          contentItem.className = 'content-item';
          
          if (typeof item === 'string') {
            contentItem.innerHTML = item;
          } else if (item instanceof HTMLElement) {
            contentItem.appendChild(item);
          }
          
          container.appendChild(contentItem);
        });
      } else {
        // 空状态
        this.renderEmptyState(container);
      }
    } else {
      // 空状态
      this.renderEmptyState(container);
    }
    
    content.appendChild(container);
    this.el = content;
    this.container = container;
  }
  
  /**
   * 渲染空状态
   * @param {HTMLElement} container - 容器元素
   */
  renderEmptyState(container) {
    const empty = document.createElement('div');
    empty.className = 'content-empty';
    
    const icon = document.createElement('div');
    icon.className = 'content-empty-icon';
    icon.innerHTML = '📭';
    empty.appendChild(icon);
    
    const text = document.createElement('p');
    text.className = 'content-empty-text';
    text.textContent = '暂无内容';
    empty.appendChild(text);
    
    container.appendChild(empty);
  }
  
  /**
   * 设置内容
   * @param {string|HTMLElement|Array} content - 内容
   */
  setContent(content) {
    this.props.content = content;
    this.createDOM();
  }
  
  /**
   * 添加内容
   * @param {string|HTMLElement} content - 要添加的内容
   */
  addContent(content) {
    if (!Array.isArray(this.props.content)) {
      this.props.content = [];
    }
    
    this.props.content.push(content);
    this.createDOM();
  }
  
  /**
   * 清空内容
   */
  clearContent() {
    this.props.content = '';
    this.createDOM();
  }
  
  /**
   * 获取内容
   * @returns {string|HTMLElement|Array} - 内容
   */
  getContent() {
    return this.props.content;
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
module.exports = Content;