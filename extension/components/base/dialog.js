const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

/**
 * 弹窗组件
 * 支持不同弹窗类型、动画效果和主题切换
 */
class Dialog extends BaseComponent {
  /**
   * 创建弹窗组件
   * @param {Object} props - 组件属性
   * @param {string} props.type - 弹窗类型：alert, confirm, custom
   * @param {string} props.title - 弹窗标题
   * @param {string|HTMLElement} props.content - 弹窗内容
   * @param {Array} props.buttons - 按钮配置
   * @param {string} props.size - 弹窗大小：small, medium, large
   * @param {boolean} props.closable - 是否可关闭
   * @param {string} props.animation - 动画类型：fade, slide, zoom
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      type: 'alert',
      title: '',
      content: '',
      buttons: [],
      size: 'medium',
      closable: true,
      animation: 'fade'
    };
    
    this.props = { ...this.defaultProps, ...props };
    this.state = {
      visible: false
    };
    
    // 初始化组件
    this.init();
  }
  
  /**
   * 初始化组件
   */
  init() {
    // 注册样式
    this.registerStyles();
    
    // 创建DOM结构
    this.createDOM();
    
    // 绑定事件
    this.bindEvents();
  }
  
  /**
   * 注册组件样式
   */
  registerStyles() {
    const styles = `
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      
      .dialog-overlay.visible {
        opacity: 1;
        visibility: visible;
      }
      
      .dialog {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-lg);
        color: var(--text-primary);
        max-width: 90vw;
        max-height: 90vh;
        overflow: hidden;
        opacity: 0;
        transform: scale(0.9);
        transition: all 0.3s ease;
      }
      
      .dialog-overlay.visible .dialog {
        opacity: 1;
        transform: scale(1);
      }
      
      .dialog.animation-slide {
        transform: translateY(-50px);
      }
      
      .dialog-overlay.visible .dialog.animation-slide {
        transform: translateY(0);
      }
      
      .dialog.animation-zoom {
        transform: scale(0.8);
      }
      
      .dialog-overlay.visible .dialog.animation-zoom {
        transform: scale(1);
      }
      
      .dialog.size-small {
        width: 300px;
      }
      
      .dialog.size-medium {
        width: 500px;
      }
      
      .dialog.size-large {
        width: 700px;
      }
      
      .dialog-header {
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-secondary);
      }
      
      .dialog-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        margin: 0;
        color: var(--text-primary);
      }
      
      .dialog-close-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: var(--font-size-lg);
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius-sm);
        transition: all 0.2s ease;
      }
      
      .dialog-close-btn:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      
      .dialog-body {
        padding: 24px;
        max-height: 50vh;
        overflow-y: auto;
      }
      
      .dialog-content {
        color: var(--text-primary);
        line-height: 1.5;
      }
      
      .dialog-footer {
        padding: 16px 24px;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background: var(--bg-secondary);
      }
      
      /* 滚动条样式 */
      .dialog-body::-webkit-scrollbar {
        width: 6px;
      }
      
      .dialog-body::-webkit-scrollbar-track {
        background: var(--bg-secondary);
      }
      
      .dialog-body::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 3px;
      }
      
      .dialog-body::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
      }
    `;
    
    styleManager.registerStyles('dialog', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'dialog-overlay';
    
    // 创建弹窗容器
    this.dialog = document.createElement('div');
    this.dialog.className = `dialog size-${this.props.size} animation-${this.props.animation}`;
    
    // 创建弹窗头部
    const header = document.createElement('div');
    header.className = 'dialog-header';
    
    // 标题
    const title = document.createElement('h3');
    title.className = 'dialog-title';
    title.textContent = this.props.title;
    header.appendChild(title);
    
    // 关闭按钮
    if (this.props.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dialog-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }
    
    this.dialog.appendChild(header);
    
    // 创建弹窗内容
    const body = document.createElement('div');
    body.className = 'dialog-body';
    
    const content = document.createElement('div');
    content.className = 'dialog-content';
    
    if (typeof this.props.content === 'string') {
      content.textContent = this.props.content;
    } else {
      content.appendChild(this.props.content);
    }
    
    body.appendChild(content);
    this.dialog.appendChild(body);
    
    // 创建弹窗底部
    if (this.props.buttons && this.props.buttons.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'dialog-footer';
      
      this.props.buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        button.className = `button ${btnConfig.variant || 'primary'} ${btnConfig.size || 'medium'}`;
        button.textContent = btnConfig.text;
        button.addEventListener('click', () => {
          if (btnConfig.onClick) {
            btnConfig.onClick();
          }
          this.close();
        });
        footer.appendChild(button);
      });
      
      this.dialog.appendChild(footer);
    }
    
    this.overlay.appendChild(this.dialog);
    this.el = this.overlay;
  }
  
  /**
   * 打开弹窗
   */
  open() {
    if (!this.el.parentElement) {
      document.body.appendChild(this.el);
    }
    
    this.setState({ visible: true });
    this.overlay.classList.add('visible');
    
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
  }
  
  /**
   * 关闭弹窗
   */
  close() {
    this.setState({ visible: false });
    this.overlay.classList.remove('visible');
    
    // 恢复背景滚动
    document.body.style.overflow = '';
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (this.el.parentElement) {
        this.el.parentElement.removeChild(this.el);
      }
    }, 300);
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    this.close();
    super.destroy();
  }
}

// 导出组件
module.exports = Dialog;