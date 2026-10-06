/**
 * 学习面板组件
 * 基于Button组件开发，用于切换不同的学习模式
 */
const BaseComponent = require('../utils/BaseComponent.js');
const Button = require('../base/button.js');
const styleManager = require('../utils/style-manager.js');

class LearningPanel extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {Array} props.modes - 学习模式配置
   * @param {string} props.activeMode - 当前激活的模式
   * @param {Function} props.onModeChange - 模式切换事件回调
   * @param {string} props.orientation - 方向：horizontal, vertical
   * @param {string} props.size - 尺寸：small, medium, large
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      modes: [
        { id: 'practice', text: '练习', icon: '📚', variant: 'primary' },
        { id: 'review', text: '复习', icon: '🔄', variant: 'secondary' },
        { id: 'test', text: '测试', icon: '📝', variant: 'warning' },
        { id: 'stats', text: '统计', icon: '📊', variant: 'info' }
      ],
      activeMode: 'practice',
      onModeChange: () => {},
      orientation: 'horizontal',
      size: 'medium'
    };
    
    this.props = { ...this.defaultProps, ...props };
    this.state = {
      activeMode: this.props.activeMode
    };
    
    // 按钮实例列表
    this.buttons = [];
    
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
      '.learning-panel': {
        'display': 'flex',
        'background': 'var(--bg-secondary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-lg)',
        'padding': '8px',
        'gap': '8px',
        'transition': 'all 0.3s ease'
      },
      
      '.learning-panel.orientation-vertical': {
        'flex-direction': 'column'
      },
      
      '.learning-panel.orientation-horizontal': {
        'flex-direction': 'row'
      },
      
      '.learning-panel.size-small': {
        'padding': '4px',
        'gap': '4px'
      },
      
      '.learning-panel.size-large': {
        'padding': '12px',
        'gap': '12px'
      },
      
      '.learning-panel-button': {
        'flex': '1',
        'min-width': '0',
        'transition': 'all 0.3s ease'
      },
      
      '.learning-panel-button.active': {
        'transform': 'translateY(-1px)',
        'box-shadow': 'var(--shadow-md)'
      }
    };
    
    styleManager.registerStyle('learning-panel', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建面板容器
    this.panel = document.createElement('div');
    this.panel.className = `learning-panel orientation-${this.props.orientation} size-${this.props.size}`;
    
    // 清空按钮列表
    this.buttons = [];
    
    // 创建学习模式按钮
    this.props.modes.forEach(mode => {
      // 创建按钮实例
      const button = new Button({
        text: mode.text,
        icon: mode.icon,
        variant: mode.variant,
        size: this.props.size,
        className: `learning-panel-button ${this.state.activeMode === mode.id ? 'active' : ''}`,
        onClick: () => this.handleModeChange(mode.id)
      });
      
      // 渲染按钮并添加到面板
      const buttonElement = button.render();
      this.panel.appendChild(buttonElement);
      
      // 保存按钮实例
      this.buttons.push({
        id: mode.id,
        button: button,
        element: buttonElement
      });
    });
    
    this.el = this.panel;
  }
  
  /**
   * 处理模式切换
   * @param {string} modeId - 模式ID
   */
  handleModeChange(modeId) {
    if (this.state.activeMode === modeId) return;
    
    // 更新状态
    this.setState({ activeMode: modeId });
    
    // 更新按钮状态
    this.buttons.forEach(({ id, button, element }) => {
      if (id === modeId) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    });
    
    // 调用回调函数
    if (this.props.onModeChange) {
      this.props.onModeChange(modeId);
    }
  }
  
  /**
   * 获取当前激活的模式
   * @returns {string} - 当前激活的模式ID
   */
  getActiveMode() {
    return this.state.activeMode;
  }
  
  /**
   * 设置激活的模式
   * @param {string} modeId - 模式ID
   */
  setActiveMode(modeId) {
    this.handleModeChange(modeId);
  }
  
  /**
   * 添加学习模式
   * @param {Object} mode - 学习模式配置
   */
  addMode(mode) {
    this.props.modes.push(mode);
    this.createDOM();
  }
  
  /**
   * 移除学习模式
   * @param {string} modeId - 模式ID
   */
  removeMode(modeId) {
    this.props.modes = this.props.modes.filter(mode => mode.id !== modeId);
    
    // 如果移除的是当前激活的模式，切换到第一个模式
    if (this.state.activeMode === modeId && this.props.modes.length > 0) {
      this.handleModeChange(this.props.modes[0].id);
    }
    
    this.createDOM();
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
      
      // 如果提供了新的activeMode，更新状态
      if (newProps.activeMode) {
        this.state.activeMode = newProps.activeMode;
      }
      
      this.createDOM();
    }
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    this.unbindEvents();
    
    // 销毁所有按钮实例
    this.buttons.forEach(({ button }) => {
      button.destroy();
    });
    
    this.buttons = [];
    super.destroy();
  }
}

// 导出组件
module.exports = LearningPanel;