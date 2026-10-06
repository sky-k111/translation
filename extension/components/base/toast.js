const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

/**
 * 提示组件
 * 支持不同提示类型、自动关闭和主题切换
 */
class Toast extends BaseComponent {
  /**
   * 创建提示组件
   * @param {Object} props - 组件属性
   * @param {string} props.type - 提示类型：success, error, warning, info
   * @param {string} props.message - 提示消息
   * @param {number} props.duration - 自动关闭时间（毫秒）
   * @param {string} props.position - 显示位置：top-left, top-right, bottom-left, bottom-right, center
   * @param {boolean} props.closable - 是否可关闭
   * @param {string} props.animation - 动画类型：fade, slide, zoom
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      type: 'info',
      message: '',
      duration: 3000,
      position: 'top-right',
      closable: true,
      animation: 'fade'
    };
    
    this.props = { ...this.defaultProps, ...props };
    this.state = {
      visible: false
    };
    
    // 定时器
    this.timer = null;
    
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
      .toast-container {
        position: fixed;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .toast-container.position-top-left {
        top: 20px;
        left: 20px;
      }
      
      .toast-container.position-top-right {
        top: 20px;
        right: 20px;
      }
      
      .toast-container.position-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .toast-container.position-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .toast-container.position-center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        align-items: center;
      }
      
      .toast {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        color: var(--text-primary);
        padding: 16px 20px;
        min-width: 280px;
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 12px;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .toast::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
      }
      
      .toast.type-success::before {
        background: var(--color-success);
      }
      
      .toast.type-error::before {
        background: var(--color-danger);
      }
      
      .toast.type-warning::before {
        background: var(--color-warning);
      }
      
      .toast.type-info::before {
        background: var(--color-primary);
      }
      
      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      .toast.animation-slide {
        transform: translateX(100%);
      }
      
      .toast.visible.animation-slide {
        transform: translateX(0);
      }
      
      .toast.animation-zoom {
        transform: scale(0.8);
      }
      
      .toast.visible.animation-zoom {
        transform: scale(1);
      }
      
      .toast-icon {
        font-size: var(--font-size-lg);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .toast.type-success .toast-icon {
        color: var(--color-success);
      }
      
      .toast.type-error .toast-icon {
        color: var(--color-danger);
      }
      
      .toast.type-warning .toast-icon {
        color: var(--color-warning);
      }
      
      .toast.type-info .toast-icon {
        color: var(--color-primary);
      }
      
      .toast-content {
        flex: 1;
        font-size: var(--font-size-md);
        line-height: 1.4;
        color: var(--text-primary);
      }
      
      .toast-close-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: var(--font-size-lg);
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius-sm);
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .toast-close-btn:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: var(--color-primary);
        transition: width 0.1s linear;
        width: 100%;
      }
      
      .toast.type-success .toast-progress {
        background: var(--color-success);
      }
      
      .toast.type-error .toast-progress {
        background: var(--color-danger);
      }
      
      .toast.type-warning .toast-progress {
        background: var(--color-warning);
      }
      
      .toast.type-info .toast-progress {
        background: var(--color-primary);
      }
    `;
    
    styleManager.registerStyles('toast', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建容器
    this.container = document.createElement('div');
    this.container.className = `toast-container position-${this.props.position}`;
    
    // 创建toast元素
    this.toast = document.createElement('div');
    this.toast.className = `toast type-${this.props.type} animation-${this.props.animation}`;
    
    // 创建图标
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    
    // 根据类型设置图标
    const iconMap = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    
    icon.textContent = iconMap[this.props.type] || iconMap.info;
    this.toast.appendChild(icon);
    
    // 创建内容
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = this.props.message;
    this.toast.appendChild(content);
    
    // 创建关闭按钮
    if (this.props.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.close());
      this.toast.appendChild(closeBtn);
    }
    
    // 创建进度条
    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    this.toast.appendChild(progress);
    
    this.container.appendChild(this.toast);
    this.el = this.container;
    
    // 更新进度条
    this.updateProgress();
  }
  
  /**
   * 更新进度条
   */
  updateProgress() {
    const progress = this.toast.querySelector('.toast-progress');
    if (!progress) return;
    
    let width = 100;
    const step = 100 / (this.props.duration / 100);
    
    const updateWidth = () => {
      width -= step;
      if (width <= 0) {
        width = 0;
      }
      progress.style.width = `${width}%`;
      
      if (width > 0 && this.state.visible) {
        requestAnimationFrame(updateWidth);
      }
    };
    
    updateWidth();
  }
  
  /**
   * 显示提示
   */
  show() {
    if (!this.el.parentElement) {
      document.body.appendChild(this.el);
    }
    
    this.setState({ visible: true });
    this.toast.classList.add('visible');
    
    // 更新进度条
    this.updateProgress();
    
    // 设置自动关闭
    if (this.props.duration > 0) {
      this.timer = setTimeout(() => {
        this.close();
      }, this.props.duration);
    }
  }
  
  /**
   * 关闭提示
   */
  close() {
    this.setState({ visible: false });
    this.toast.classList.remove('visible');
    
    // 清除定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
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
module.exports = Toast;