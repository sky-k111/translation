/**
 * 卡片组件
 * 支持多种样式变体，包括流体边框动画效果
 */
const BaseComponent = require('../utils/BaseComponent.js');
const styleManager = require('../utils/style-manager.js');

class Card extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props) {
    super(props);
    this.props = {
      // 卡片标题
      title: '',
      // 卡片内容
      content: '',
      // 卡片变体：default, stat, word
      variant: 'default',
      // 是否显示流体边框动画
      fluidBorder: false,
      // 点击事件回调
      onClick: null,
      // 卡片类名
      className: '',
      // 卡片样式
      style: {},
      // 卡片头部内容
      header: null,
      // 卡片底部内容
      footer: null,
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
      '.card': {
        'background': 'var(--bg-card)',
        'backdrop-filter': 'blur(20px)',
        '-webkit-backdrop-filter': 'blur(20px)',
        'border': '1px solid var(--border-color)',
        'border-radius': '20px',
        'padding': '20px',
        'transition': 'all var(--transition-normal)',
        'position': 'relative',
        'overflow': 'hidden',
        'box-shadow': 'var(--shadow-sm)',
        'z-index': '1'
      },
      
      '.card:hover': {
        'transform': 'translateY(-4px) scale(1.01)',
        'box-shadow': 'var(--shadow-lg)'
      },
      
      '.card-clickable': {
        'cursor': 'pointer'
      },
      
      '.card-title': {
        'font-size': '18px',
        'font-weight': '700',
        'color': 'var(--text-primary)',
        'margin-bottom': '12px',
        'letter-spacing': '-0.02em'
      },
      
      '.card-content': {
        'font-size': '14px',
        'color': 'var(--text-secondary)',
        'line-height': '1.5',
        'margin-bottom': '16px'
      },
      
      '.card-header': {
        'margin-bottom': '16px',
        'padding-bottom': '12px',
        'border-bottom': '1px solid var(--border-color)'
      },
      
      '.card-footer': {
        'margin-top': '16px',
        'padding-top': '12px',
        'border-top': '1px solid var(--border-color)'
      },
      
      // 统计卡片样式
      '.card-stat': {
        'display': 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'gap': '12px',
        'text-align': 'center',
        'padding': '20px 16px'
      },
      
      '.card-stat:hover': {
        'transform': 'translateY(-6px) scale(1.03)'
      },
      
      '.card-stat-icon': {
        'font-size': '32px',
        'transition': 'transform 0.3s ease'
      },
      
      '.card-stat:hover .card-stat-icon': {
        'transform': 'scale(1.2) rotate(5deg)'
      },
      
      '.card-stat-value': {
        'font-size': '28px',
        'font-weight': '700',
        'background': 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'background-clip': 'text'
      },
      
      '.card-stat-label': {
        'font-size': '14px',
        'color': 'var(--text-secondary)',
        'font-weight': '500'
      },
      
      // 单词卡片样式
      '.card-word': {
        'padding': '24px',
        'border-radius': '20px'
      },
      
      // 流体边框样式
      '.card-fluid-border': {
        'position': 'absolute',
        'inset': '0',
        'padding': '6px',
        'border-radius': '20px',
        'pointer-events': 'none',
        'z-index': '0',
        '-webkit-mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        '-webkit-mask-composite': 'xor',
        'mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        'mask-composite': 'exclude'
      },
      
      '.card-fluid-border::before': {
        'content': "''",
        'position': 'absolute',
        'top': '-50%',
        'left': '-50%',
        'width': '200%',
        'height': '200%',
        'background': 'var(--fluid-border-gradient)',
        'animation': 'borderRotate 4s linear infinite',
        'opacity': '0',
        'transition': 'opacity 0.3s ease'
      },
      
      '.card-fluid-border::after': {
        'content': "''",
        'position': 'absolute',
        'inset': '0',
        'background': 'var(--fluid-border-gradient)',
        'filter': 'blur(10px)',
        'opacity': '0',
        'transition': 'opacity 0.3s ease',
        'animation': 'borderPulse 3s ease-in-out infinite'
      },
      
      '.card:hover .card-fluid-border::before': {
        'opacity': '0.8'
      },
      
      '.card:hover .card-fluid-border::after': {
        'opacity': '0.2'
      },
      
      // 卡片背景层
      '.card-bg-layer': {
        'content': "''",
        'position': 'absolute',
        'inset': '0',
        'background': 'var(--bg-card)',
        'backdrop-filter': 'blur(20px)',
        '-webkit-backdrop-filter': 'blur(20px)',
        'border': '1px solid var(--border-color)',
        'border-radius': '20px',
        'z-index': '-1',
        'transition': 'all 0.3s ease'
      },
      
      '.card:hover .card-bg-layer': {
        'background': 'var(--bg-card-hover)',
        'border-color': 'transparent'
      },
      
      // 卡片内容层
      '.card-content-layer': {
        'position': 'relative',
        'z-index': '1'
      }
    };
    
    // 注册组件样式
    styleManager.registerStyle('card', styles);
  }

  /**
   * 渲染卡片
   * @returns {HTMLElement} - 渲染后的卡片元素
   */
  render() {
    // 创建卡片容器
    const card = document.createElement('div');
    
    // 设置类名
    const classes = ['card', `card-${this.props.variant}`];
    if (this.props.className) {
      classes.push(this.props.className);
    }
    if (this.props.onClick) {
      classes.push('card-clickable');
    }
    card.className = classes.join(' ');
    
    // 设置样式
    if (this.props.style) {
      Object.assign(card.style, this.props.style);
    }
    
    // 创建流体边框（如果需要）
    if (this.props.fluidBorder) {
      const fluidBorder = document.createElement('div');
      fluidBorder.className = 'card-fluid-border';
      card.appendChild(fluidBorder);
    }
    
    // 创建背景层
    const bgLayer = document.createElement('div');
    bgLayer.className = 'card-bg-layer';
    card.appendChild(bgLayer);
    
    // 创建内容层
    const contentLayer = document.createElement('div');
    contentLayer.className = 'card-content-layer';
    
    // 创建卡片头部
    if (this.props.header || this.props.title) {
      const header = document.createElement('div');
      header.className = 'card-header';
      
      if (this.props.header) {
        header.innerHTML = this.props.header;
      } else if (this.props.title) {
        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = this.props.title;
        header.appendChild(title);
      }
      
      contentLayer.appendChild(header);
    }
    
    // 创建卡片内容
    if (this.props.content) {
      const content = document.createElement('div');
      content.className = 'card-content';
      content.innerHTML = this.props.content;
      contentLayer.appendChild(content);
    }
    
    // 创建卡片底部
    if (this.props.footer) {
      const footer = document.createElement('div');
      footer.className = 'card-footer';
      footer.innerHTML = this.props.footer;
      contentLayer.appendChild(footer);
    }
    
    // 将内容层添加到卡片
    card.appendChild(contentLayer);
    
    // 绑定点击事件
    if (this.props.onClick) {
      this.bindEvent(card, 'click', this.props.onClick);
    }
    
    // 保存元素引用
    this.element = card;
    
    return card;
  }

  /**
   * 更新卡片
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
      this.render();
    }
  }

  /**
   * 销毁卡片
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
module.exports = Card;