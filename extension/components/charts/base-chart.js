/**
 * 图表基类
 * 所有图表组件的基础类，提供共享功能
 */

class BaseChart extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      width: 400,
      height: 200,
      data: [],
      options: {},
      theme: 'light'
    };
    
    this.props = { ...this.defaultProps, ...props };
    this.state = {
      isRendered: false
    };
    
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
  }
  
  /**
   * 注册组件样式
   */
  registerStyle() {
    const styles = {
      '.chart-container': {
        'position': 'relative',
        'width': '100%',
        'height': '100%',
        'overflow': 'hidden',
        'border-radius': 'var(--border-radius-lg)',
        'background': 'transparent', // Changed to transparent for Glassmorphism
        'padding': '10px' // Reduced padding
      },
      
      '.chart-title': {
        'font-size': '18px',
        'font-weight': '600',
        'color': 'var(--text-primary)',
        'margin-bottom': '20px',
        'text-align': 'center'
      },
      
      '.chart-legend': {
        'display': 'flex',
        'justify-content': 'center',
        'gap': '15px',
        'margin-top': '15px',
        'font-size': '12px',
        'color': 'var(--text-secondary)'
      },
      
      '.legend-item': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '5px'
      },
      
      '.legend-color': {
        'width': '12px',
        'height': '12px',
        'border-radius': '50%'
      },
      
      '.chart-tooltip': {
        'position': 'absolute',
        'background': 'rgba(0, 0, 0, 0.8)',
        'color': 'white',
        'padding': '8px 12px',
        'border-radius': '4px',
        'font-size': '12px',
        'pointer-events': 'none',
        'z-index': '1000',
        'opacity': '0',
        'transition': 'opacity 0.2s ease'
      },
      
      '.chart-tooltip.visible': {
        'opacity': '1'
      }
    };
    
    styleManager.registerStyle('base-chart', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    this.container = document.createElement('div');
    this.container.className = 'chart-container';
    
    // 创建canvas元素
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.props.width;
    this.canvas.height = this.props.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    // 创建标题元素
    if (this.props.title) {
      this.titleElement = document.createElement('h3');
      this.titleElement.className = 'chart-title';
      this.titleElement.textContent = this.props.title;
      this.container.appendChild(this.titleElement);
    }
    
    // 添加canvas到容器
    this.container.appendChild(this.canvas);
    
    // 创建图例
    if (this.props.legend && this.props.legend.length > 0) {
      this.legendElement = this.createLegend();
      this.container.appendChild(this.legendElement);
    }
    
    // 创建tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'chart-tooltip';
    this.container.appendChild(this.tooltip);
    
    // 获取2D上下文
    this.ctx = this.canvas.getContext('2d');
    
    // 设置主题
    this.updateTheme();
  }
  
  /**
   * 创建图例
   * @returns {HTMLElement} - 图例元素
   */
  createLegend() {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    
    this.props.legend.forEach((item, index) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      
      const color = document.createElement('div');
      color.className = 'legend-color';
      color.style.backgroundColor = item.color;
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      legendItem.appendChild(color);
      legendItem.appendChild(label);
      legend.appendChild(legendItem);
    });
    
    return legend;
  }
  
  /**
   * 更新主题
   */
  updateTheme() {
    const isDarkTheme = document.body.classList.contains('theme-dark');
    this.theme = isDarkTheme ? 'dark' : 'light';
    
    // 更新容器样式
    this.container.style.backgroundColor = isDarkTheme ? 'var(--bg-primary)' : 'white';
    
    // 更新标题样式
    if (this.titleElement) {
      this.titleElement.style.color = isDarkTheme ? 'var(--text-primary)' : '#1f2937';
    }
    
    // 更新图例样式
    if (this.legendElement) {
      const legendItems = this.legendElement.querySelectorAll('.legend-item span');
      legendItems.forEach(item => {
        item.style.color = isDarkTheme ? 'var(--text-secondary)' : '#6b7280';
      });
    }
  }
  
  /**
   * 显示tooltip
   * @param {Object} position - tooltip位置
   * @param {string} content - tooltip内容
   */
  showTooltip(position, content) {
    this.tooltip.textContent = content;
    this.tooltip.style.left = `${position.x}px`;
    this.tooltip.style.top = `${position.y}px`;
    this.tooltip.classList.add('visible');
  }
  
  /**
   * 隐藏tooltip
   */
  hideTooltip() {
    this.tooltip.classList.remove('visible');
  }
  
  /**
   * 渲染图表
   */
  render() {
    // 由子类实现
  }
  
  /**
   * 更新图表数据
   * @param {Array} data - 新数据
   */
  updateData(data) {
    this.props.data = data;
    this.render();
  }
  
  /**
   * 更新图表选项
   * @param {Object} options - 新选项
   */
  updateOptions(options) {
    this.props.options = { ...this.props.options, ...options };
    this.render();
  }
  
  /**
   * 获取图表元素
   * @returns {HTMLElement} - 图表元素
   */
  getElement() {
    return this.container;
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    // 清理事件监听器
    this.container.remove();
  }
}

// 注册到全局作用域，供浏览器环境使用
window.BaseChart = BaseChart;
