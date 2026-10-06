/**
 * 统计卡片组件
 * 基于Card组件开发，用于展示统计数据
 */
const BaseComponent = require('../utils/BaseComponent.js');
const Card = require('../base/card.js');
const styleManager = require('../utils/style-manager.js');

class StatCard extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {string} props.title - 标题
   * @param {string|number} props.value - 数值
   * @param {string} props.unit - 单位
   * @param {string} props.icon - 图标
   * @param {string} props.color - 颜色
   * @param {number} props.trend - 趋势值（正数表示上升，负数表示下降）
   * @param {string} props.trendLabel - 趋势标签
   * @param {string} props.variant - 变体：default, primary, success, danger, warning, info
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      title: '',
      value: 0,
      unit: '',
      icon: '',
      color: 'primary',
      trend: 0,
      trendLabel: '',
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
      '.stat-card': {
        'background': 'var(--bg-primary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-lg)',
        'padding': '20px',
        'transition': 'all 0.3s ease',
        'position': 'relative',
        'overflow': 'hidden'
      },
      
      '.stat-card:hover': {
        'transform': 'translateY(-2px)',
        'box-shadow': 'var(--shadow-md)',
        'border-color': 'var(--accent-primary)'
      },
      
      '.stat-card-header': {
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': flex-start,
        'margin-bottom': '12px'
      },
      
      '.stat-card-title': {
        'font-size': 'var(--font-size-md)',
        'color': 'var(--text-secondary)',
        'margin': '0',
        'font-weight': 'var(--font-weight-medium)'
      },
      
      '.stat-card-icon': {
        'font-size': 'var(--font-size-xl)',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'width': '40px',
        'height': '40px',
        'border-radius': 'var(--border-radius-md)',
        'background': 'var(--bg-secondary)',
        'color': 'var(--accent-primary)'
      },
      
      '.stat-card-content': {
        'margin-bottom': '12px'
      },
      
      '.stat-card-value-container': {
        'display': 'flex',
        'align-items': 'baseline',
        'gap': '8px',
        'margin-bottom': '8px'
      },
      
      '.stat-card-value': {
        'font-size': 'var(--font-size-2xl)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-primary)',
        'margin': '0'
      },
      
      '.stat-card-unit': {
        'font-size': 'var(--font-size-lg)',
        'color': 'var(--text-secondary)',
        'font-weight': 'var(--font-weight-medium)'
      },
      
      '.stat-card-footer': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px'
      },
      
      '.stat-card-trend': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '4px',
        'font-size': 'var(--font-size-sm)',
        'font-weight': 'var(--font-weight-medium)'
      },
      
      '.stat-card-trend.positive': {
        'color': 'var(--accent-success)'
      },
      
      '.stat-card-trend.negative': {
        'color': 'var(--accent-danger)'
      },
      
      '.stat-card-trend.neutral': {
        'color': 'var(--text-secondary)'
      },
      
      '.stat-card-trend-label': {
        'font-size': 'var(--font-size-sm)',
        'color': 'var(--text-tertiary)'
      },
      
      // 变体样式
      '.stat-card.variant-primary': {
        'background': 'linear-gradient(135deg, var(--accent-primary-light), var(--accent-primary))',
        'color': '#fff',
        'border': 'none'
      },
      
      '.stat-card.variant-primary .stat-card-title,': {
        'color': 'rgba(255, 255, 255, 0.8)'
      },
      
      '.stat-card.variant-primary .stat-card-value,': {
        'color': '#fff'
      },
      
      '.stat-card.variant-primary .stat-card-unit,': {
        'color': 'rgba(255, 255, 255, 0.8)'
      },
      
      '.stat-card.variant-primary .stat-card-trend-label,': {
        'color': 'rgba(255, 255, 255, 0.7)'
      },
      
      '.stat-card.variant-success': {
        'background': 'linear-gradient(135deg, var(--accent-success-light), var(--accent-success))',
        'color': '#fff',
        'border': 'none'
      },
      
      '.stat-card.variant-danger': {
        'background': 'linear-gradient(135deg, var(--accent-danger-light), var(--accent-danger))',
        'color': '#fff',
        'border': 'none'
      },
      
      '.stat-card.variant-warning': {
        'background': 'linear-gradient(135deg, var(--accent-warning-light), var(--accent-warning))',
        'color': '#fff',
        'border': 'none'
      },
      
      '.stat-card.variant-info': {
        'background': 'linear-gradient(135deg, var(--accent-info-light), var(--accent-info))',
        'color': '#fff',
        'border': 'none'
      }
    };
    
    styleManager.registerStyle('stat-card', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 使用卡片组件作为基础
    this.card = new Card({
      variant: 'stat',
      content: ''
    });
    
    // 创建卡片内容
    const cardContent = document.createElement('div');
    cardContent.className = `stat-card variant-${this.props.variant}`;
    
    // 头部
    const header = document.createElement('div');
    header.className = 'stat-card-header';
    
    // 标题
    const title = document.createElement('h3');
    title.className = 'stat-card-title';
    title.textContent = this.props.title;
    header.appendChild(title);
    
    // 图标
    if (this.props.icon) {
      const icon = document.createElement('div');
      icon.className = 'stat-card-icon';
      icon.innerHTML = this.props.icon;
      header.appendChild(icon);
    }
    
    cardContent.appendChild(header);
    
    // 内容
    const content = document.createElement('div');
    content.className = 'stat-card-content';
    
    // 数值和单位
    const valueContainer = document.createElement('div');
    valueContainer.className = 'stat-card-value-container';
    
    const value = document.createElement('div');
    value.className = 'stat-card-value';
    value.textContent = this.props.value;
    valueContainer.appendChild(value);
    
    if (this.props.unit) {
      const unit = document.createElement('span');
      unit.className = 'stat-card-unit';
      unit.textContent = this.props.unit;
      valueContainer.appendChild(unit);
    }
    
    content.appendChild(valueContainer);
    
    cardContent.appendChild(content);
    
    // 底部
    if (this.props.trend || this.props.trendLabel) {
      const footer = document.createElement('div');
      footer.className = 'stat-card-footer';
      
      // 趋势
      if (this.props.trend) {
        const trend = document.createElement('div');
        const trendClass = this.props.trend > 0 ? 'positive' : this.props.trend < 0 ? 'negative' : 'neutral';
        trend.className = `stat-card-trend ${trendClass}`;
        
        const trendIcon = document.createElement('span');
        trendIcon.innerHTML = this.props.trend > 0 ? '📈' : this.props.trend < 0 ? '📉' : '➡️';
        trend.appendChild(trendIcon);
        
        const trendValue = document.createElement('span');
        trendValue.textContent = `${Math.abs(this.props.trend)}%`;
        trend.appendChild(trendValue);
        
        footer.appendChild(trend);
      }
      
      // 趋势标签
      if (this.props.trendLabel) {
        const trendLabel = document.createElement('span');
        trendLabel.className = 'stat-card-trend-label';
        trendLabel.textContent = this.props.trendLabel;
        footer.appendChild(trendLabel);
      }
      
      cardContent.appendChild(footer);
    }
    
    // 将内容添加到卡片中
    const cardElement = this.card.getElement();
    if (cardElement) {
      cardElement.appendChild(cardContent);
    }
    
    this.el = cardElement;
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
    if (this.card) {
      this.card.destroy();
    }
    super.destroy();
  }
}

// 导出组件
module.exports = StatCard;