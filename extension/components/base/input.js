/**
 * 输入框组件
 * 支持多种样式变体，包括搜索框、选择器等
 */
const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

class Input extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props) {
    super(props);
    this.props = {
      // 输入框类型：text, search, password, email, number
      type: 'text',
      // 输入框占位符
      placeholder: '',
      // 输入框值
      value: '',
      // 输入框标签
      label: '',
      // 是否禁用
      disabled: false,
      // 是否只读
      readonly: false,
      // 是否必填
      required: false,
      // 输入框变体：default, search, select
      variant: 'default',
      // 输入框尺寸：small, medium, large
      size: 'medium',
      // 输入事件回调
      onChange: () => {},
      // 聚焦事件回调
      onFocus: () => {},
      // 失焦事件回调
      onBlur: () => {},
      // 输入框类名
      className: '',
      // 输入框样式
      style: {},
      // 输入框图标
      icon: null,
      // 输入框前缀
      prefix: null,
      // 输入框后缀
      suffix: null,
      // 错误信息
      error: '',
      // 帮助信息
      helperText: '',
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
      '.input-group': {
        'position': 'relative',
        'display': 'flex',
        'flex-direction': 'column',
        'margin-bottom': '16px'
      },
      
      '.input-label': {
        'font-size': '14px',
        'font-weight': '600',
        'color': 'var(--text-primary)',
        'margin-bottom': '8px',
        'display': 'block'
      },
      
      '.input-wrapper': {
        'position': 'relative',
        'display': 'flex',
        'align-items': 'center',
        'transition': 'all var(--transition-normal)'
      },
      
      '.input': {
        'width': '100%',
        'height': '42px',
        'padding': '0 16px',
        'border': '1px solid var(--border-color)',
        'border-radius': '12px',
        'font-size': '15px',
        'outline': 'none',
        'transition': 'all var(--transition-normal)',
        'background': 'var(--bg-input)',
        'backdrop-filter': 'blur(8px)',
        'color': 'var(--text-primary)',
        'box-shadow': 'none',
        'font-weight': '500'
      },
      
      // 搜索框样式
      '.input-search': {
        'padding': '0 16px 0 44px',
        'background-image': 'url("data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23a0aec0\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3E%3Ccircle cx=\"11\" cy=\"11\" r=\"8\"%3E%3C/circle%3E%3Cline x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"%3E%3C/line%3E%3C/svg%3E")',
        'background-position': '12px center',
        'background-repeat': 'no-repeat',
        'background-size': '20px 20px'
      },
      
      // 选择器样式
      '.input-select': {
        'appearance': 'none',
        'cursor': 'pointer',
        'background-image': 'url("data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23a0aec0\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3E%3Cpolyline points=\"6 9 12 15 18 9\"%3E%3C/polyline%3E%3C/svg%3E")',
        'background-position': 'right 10px center',
        'background-repeat': 'no-repeat',
        'background-size': '14px 14px',
        'padding-right': '28px'
      },
      
      // 尺寸样式
      '.input-small': {
        'height': '30px',
        'padding': '0 10px',
        'font-size': '13px',
        'border-radius': '8px'
      },
      
      '.input-medium': {
        'height': '42px',
        'padding': '0 16px',
        'font-size': '15px',
        'border-radius': '12px'
      },
      
      '.input-large': {
        'height': '50px',
        'padding': '0 20px',
        'font-size': '16px',
        'border-radius': '16px'
      },
      
      // 图标样式
      '.input-icon': {
        'position': 'absolute',
        'left': '12px',
        'top': '50%',
        'transform': 'translateY(-50%)',
        'color': 'var(--text-placeholder)',
        'pointer-events': 'none',
        'z-index': '1'
      },
      
      '.input-prefix': {
        'position': 'absolute',
        'left': '12px',
        'top': '50%',
        'transform': 'translateY(-50%)',
        'color': 'var(--text-secondary)',
        'font-size': '14px',
        'pointer-events': 'none',
        'z-index': '1'
      },
      
      '.input-suffix': {
        'position': 'absolute',
        'right': '12px',
        'top': '50%',
        'transform': 'translateY(-50%)',
        'color': 'var(--text-secondary)',
        'font-size': '14px',
        'pointer-events': 'none',
        'z-index': '1'
      },
      
      // 聚焦样式
      '.input:focus': {
        'background': 'var(--bg-input-focus)',
        'transform': 'translateY(-1px)',
        'box-shadow': 'var(--shadow-sm)'
      },
      
      // 禁用样式
      '.input:disabled': {
        'opacity': '0.6',
        'cursor': 'not-allowed',
        'background': 'var(--bg-muted)',
        'transform': 'none',
        'box-shadow': 'none'
      },
      
      // 只读样式
      '.input:read-only': {
        'background': 'var(--bg-muted)',
        'cursor': 'default'
      },
      
      // 错误样式
      '.input-error': {
        'border-color': 'var(--accent-danger)',
        'box-shadow': '0 0 0 2px rgba(220, 53, 69, 0.1)'
      },
      
      '.input-error-message': {
        'font-size': '12px',
        'color': 'var(--accent-danger)',
        'margin-top': '4px',
        'display': 'block'
      },
      
      // 帮助信息样式
      '.input-helper-text': {
        'font-size': '12px',
        'color': 'var(--text-tertiary)',
        'margin-top': '4px',
        'display': 'block'
      },
      
      // 流体边框层（搜索框专用）
      '.input-fluid-border': {
        'position': 'absolute',
        'inset': '-2px',
        'border-radius': '14px',
        'background': 'transparent',
        'z-index': '0',
        'pointer-events': 'none',
        'animation': 'liquidPulse 3s ease-in-out infinite'
      },
      
      '.input-fluid-border::before': {
        'content': "''",
        'position': 'absolute',
        'inset': '0',
        'border-radius': '14px',
        'background': 'conic-gradient(from var(--liquid-angle-1) in oklch, transparent 0%, hsl(calc(var(--liquid-hue-1) + 0), 85%, 65%) 15%, hsl(calc(var(--liquid-hue-1) + 60), 80%, 60%) 30%, transparent 50%, hsl(calc(var(--liquid-hue-1) + 180), 85%, 65%) 65%, hsl(calc(var(--liquid-hue-1) + 240), 80%, 60%) 80%, transparent 100%)',
        'animation': 'liquidFlow1 4s ease-in-out infinite',
        'filter': 'blur(8px)',
        'mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        'mask-composite': 'exclude',
        '-webkit-mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        '-webkit-mask-composite': 'destination-out',
        'padding': '2px'
      },
      
      '.input-fluid-border::after': {
        'content': "''",
        'position': 'absolute',
        'inset': '0',
        'border-radius': '14px',
        'background': 'conic-gradient(from var(--liquid-angle-2) in oklch, transparent 0%, hsl(calc(var(--liquid-hue-2) + 30), 90%, 70%) 20%, hsl(calc(var(--liquid-hue-2) + 90), 85%, 65%) 40%, transparent 60%, hsl(calc(var(--liquid-hue-2) + 210), 90%, 70%) 75%, hsl(calc(var(--liquid-hue-2) + 270), 85%, 65%) 90%, transparent 100%)',
        'animation': 'liquidFlow2 5s ease-in-out infinite reverse',
        'filter': 'blur(6px)',
        'mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        'mask-composite': 'exclude',
        '-webkit-mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        '-webkit-mask-composite': 'destination-out',
        'padding': '2px'
      }
    };
    
    // 注册组件样式
    styleManager.registerStyle('input', styles);
  }

  /**
   * 渲染输入框
   * @returns {HTMLElement} - 渲染后的输入框元素
   */
  render() {
    // 创建输入组容器
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';
    
    // 创建输入框标签
    if (this.props.label) {
      const label = document.createElement('label');
      label.className = 'input-label';
      label.textContent = this.props.label;
      if (this.props.id) {
        label.setAttribute('for', this.props.id);
      }
      inputGroup.appendChild(label);
    }
    
    // 创建输入框包装器
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';
    
    // 创建流体边框（如果是搜索框）
    if (this.props.variant === 'search') {
      const fluidBorder = document.createElement('div');
      fluidBorder.className = 'input-fluid-border';
      inputWrapper.appendChild(fluidBorder);
    }
    
    // 创建输入框前缀
    if (this.props.prefix) {
      const prefix = document.createElement('span');
      prefix.className = 'input-prefix';
      prefix.innerHTML = this.props.prefix;
      inputWrapper.appendChild(prefix);
    }
    
    // 创建输入框图标
    if (this.props.icon) {
      const icon = document.createElement('span');
      icon.className = 'input-icon';
      icon.innerHTML = this.props.icon;
      inputWrapper.appendChild(icon);
    }
    
    // 创建输入框
    const input = this.props.type === 'select' ? document.createElement('select') : document.createElement('input');
    
    // 设置输入框类型
    if (this.props.type !== 'select') {
      input.type = this.props.type;
    }
    
    // 设置类名
    const classes = ['input', `input-${this.props.variant}`, `input-${this.props.size}`];
    if (this.props.disabled) {
      classes.push('input-disabled');
    }
    if (this.props.error) {
      classes.push('input-error');
    }
    if (this.props.className) {
      classes.push(this.props.className);
    }
    input.className = classes.join(' ');
    
    // 设置属性
    input.placeholder = this.props.placeholder;
    input.value = this.props.value;
    input.disabled = this.props.disabled;
    input.readOnly = this.props.readonly;
    input.required = this.props.required;
    if (this.props.id) {
      input.id = this.props.id;
    }
    if (this.props.style) {
      Object.assign(input.style, this.props.style);
    }
    
    // 绑定事件
    this.bindEvent(input, 'change', this.props.onChange);
    this.bindEvent(input, 'focus', this.props.onFocus);
    this.bindEvent(input, 'blur', this.props.onBlur);
    if (this.props.type !== 'select') {
      this.bindEvent(input, 'input', this.props.onChange);
    }
    
    // 添加输入框到包装器
    inputWrapper.appendChild(input);
    
    // 创建输入框后缀
    if (this.props.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'input-suffix';
      suffix.innerHTML = this.props.suffix;
      inputWrapper.appendChild(suffix);
    }
    
    // 添加包装器到输入组
    inputGroup.appendChild(inputWrapper);
    
    // 创建错误信息
    if (this.props.error) {
      const errorMessage = document.createElement('span');
      errorMessage.className = 'input-error-message';
      errorMessage.textContent = this.props.error;
      inputGroup.appendChild(errorMessage);
    }
    
    // 创建帮助信息
    if (this.props.helperText) {
      const helperText = document.createElement('span');
      helperText.className = 'input-helper-text';
      helperText.textContent = this.props.helperText;
      inputGroup.appendChild(helperText);
    }
    
    // 保存元素引用
    this.element = inputGroup;
    this.inputElement = input;
    
    return inputGroup;
  }

  /**
   * 获取输入框值
   * @returns {string} - 输入框的值
   */
  getValue() {
    return this.inputElement ? this.inputElement.value : '';
  }

  /**
   * 设置输入框值
   * @param {string} value - 要设置的值
   */
  setValue(value) {
    if (this.inputElement) {
      this.inputElement.value = value;
    }
  }

  /**
   * 聚焦输入框
   */
  focus() {
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  /**
   * 失焦输入框
   */
  blur() {
    if (this.inputElement) {
      this.inputElement.blur();
    }
  }

  /**
   * 更新输入框
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
      this.render();
    }
  }

  /**
   * 销毁输入框
   */
  destroy() {
    this.unbindEvents();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
      this.inputElement = null;
    }
  }
}

// 注册组件
module.exports = Input;