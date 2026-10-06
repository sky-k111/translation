/**
 * 按钮组件
 * 支持多种样式变体和尺寸，适配浅色/深色主题
 */
const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

class Button extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props) {
    super(props);
    this.props = {
      // 按钮文本
      text: '',
      // 按钮变体：primary, secondary, danger, success, warning, info
      variant: 'primary',
      // 按钮尺寸：small, medium, large
      size: 'medium',
      // 是否禁用
      disabled: false,
      // 点击事件回调
      onClick: () => {},
      // 图标
      icon: null,
      // 是否显示为块级元素
      block: false,
      // 按钮类型：button, submit, reset
      type: 'button',
      ...props
    };
    
    // 注册组件样式
    this.registerStyle();
  }

  /**
   * 注册组件样式
   */
  registerStyle() {
    const styles = {
      '.btn': {
        'display': 'inline-flex',
        'align-items': 'center',
        'justify-content': 'center',
        'gap': '8px',
        'padding': '8px 16px',
        'border': '1px solid var(--border-color)',
        'border-radius': '8px',
        'font-size': '14px',
        'font-weight': '600',
        'cursor': 'pointer',
        'transition': 'all var(--transition-normal)',
        'background': 'var(--bg-input)',
        'backdrop-filter': 'blur(8px)',
        'color': 'var(--text-primary)',
        'outline': 'none',
        'box-shadow': 'none'
      },
      
      '.btn-block': {
        'display': 'flex',
        'width': '100%'
      },
      
      '.btn-primary': {
        'background': 'var(--accent-primary)',
        'color': 'white',
        'border-color': 'transparent'
      },
      
      '.btn-secondary': {
        'background': 'var(--secondary-color)',
        'color': 'white',
        'border-color': 'transparent'
      },
      
      '.btn-danger': {
        'background': 'var(--accent-danger)',
        'color': 'white',
        'border-color': 'transparent'
      },
      
      '.btn-success': {
        'background': 'var(--success-color)',
        'color': 'white',
        'border-color': 'transparent'
      },
      
      '.btn-warning': {
        'background': 'var(--warning-color)',
        'color': 'white',
        'border-color': 'transparent'
      },
      
      '.btn-info': {
        'background': 'var(--accent-info)',
        'color': 'white',
        'border-color': 'transparent'
      },
      
      '.btn-small': {
        'padding': '4px 12px',
        'font-size': '12px',
        'border-radius': '6px'
      },
      
      '.btn-medium': {
        'padding': '8px 16px',
        'font-size': '14px',
        'border-radius': '8px'
      },
      
      '.btn-large': {
        'padding': '12px 24px',
        'font-size': '16px',
        'border-radius': '12px'
      },
      
      '.btn:hover': {
        'transform': 'translateY(-1px)',
        'box-shadow': 'var(--shadow-sm)'
      },
      
      '.btn:active': {
        'transform': 'translateY(0)',
        'box-shadow': 'none'
      },
      
      '.btn:disabled': {
        'opacity': '0.6',
        'cursor': 'not-allowed',
        'transform': 'none',
        'box-shadow': 'none'
      },
      
      '.btn-primary:hover': {
        'background': 'var(--primary-hover)',
        'box-shadow': 'var(--shadow-md)'
      },
      
      '.btn-secondary:hover': {
        'background': 'var(--secondary-hover)',
        'box-shadow': 'var(--shadow-md)'
      },
      
      '.btn-danger:hover': {
        'background': 'var(--danger-hover)',
        'box-shadow': '0 2px 8px rgba(229, 62, 62, 0.3)'
      },
      
      '.btn-success:hover': {
        'background': 'var(--success-hover)',
        'box-shadow': 'var(--shadow-md)'
      },
      
      '.btn-warning:hover': {
        'background': 'var(--warning-hover)',
        'box-shadow': 'var(--shadow-md)'
      },
      
      '.btn-info:hover': {
        'background': 'var(--info-hover)',
        'box-shadow': 'var(--shadow-md)'
      },
      
      '.btn-icon': {
        'padding': '8px',
        'border-radius': '50%'
      },
      
      '.btn-icon-small': {
        'padding': '4px',
        'border-radius': '50%'
      },
      
      '.btn-icon-large': {
        'padding': '12px',
        'border-radius': '50%'
      }
    };
    
    // 注册组件样式
    styleManager.registerStyle('btn', styles);
  }

  /**
   * 渲染按钮
   * @returns {HTMLElement} - 渲染后的按钮元素
   */
  render() {
    // 创建按钮元素
    const button = document.createElement('button');
    button.type = this.props.type;
    
    // 设置类名
    const classes = ['btn', `btn-${this.props.variant}`, `btn-${this.props.size}`];
    if (this.props.disabled) {
      classes.push('btn-disabled');
    }
    if (this.props.block) {
      classes.push('btn-block');
    }
    if (this.props.icon && !this.props.text) {
      classes.push('btn-icon');
    }
    if (this.props.className) {
      classes.push(this.props.className);
    }
    button.className = classes.join(' ');
    
    // 设置属性
    button.disabled = this.props.disabled;
    if (this.props.id) {
      button.id = this.props.id;
    }
    if (this.props.style) {
      Object.assign(button.style, this.props.style);
    }
    
    // 设置内容
    if (this.props.icon) {
      button.innerHTML = this.props.icon + (this.props.text ? `<span>${this.props.text}</span>` : '');
    } else {
      button.textContent = this.props.text;
    }
    
    // 绑定点击事件
    if (!this.props.disabled) {
      this.bindEvent(button, 'click', this.props.onClick);
    }
    
    // 保存元素引用
    this.element = button;
    
    return button;
  }

  /**
   * 更新按钮
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
      this.render();
    }
  }

  /**
   * 销毁按钮
   */
  destroy() {
    this.unbindEvents();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }
}

// 导出组件
module.exports = Button;