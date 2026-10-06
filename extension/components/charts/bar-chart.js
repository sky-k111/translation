/**
 * 柱状图组件
 * 用于展示不同类别的数据对比
 */
class BarChart extends BaseChart {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认柱状图属性
    this.defaultBarProps = {
      barColor: '#3b82f6',
      barWidth: 0.7,
      gridColor: 'rgba(0, 0, 0, 0.1)',
      labelColor: '#6b7280',
      showGrid: true,
      showValues: true,
      hoverEffect: true
    };
    
    this.props = { 
      ...this.props, 
      options: { ...this.defaultBarProps, ...this.props.options } 
    };
  }
  
  /**
   * 渲染柱状图
   */
  render() {
    if (!this.ctx || !this.props.data || this.props.data.length === 0) {
      return;
    }
    
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 设置主题相关样式
    this.updateThemeStyles();
    
    // 计算图表参数
    const padding = 40;
    const chartWidth = this.canvas.width - padding * 2;
    const chartHeight = this.canvas.height - padding * 2;
    
    // 计算坐标轴范围
    const minValue = Math.min(...this.props.data.map(item => item.value));
    const maxValue = Math.max(...this.props.data.map(item => item.value));
    const valueRange = maxValue - minValue || 100; // 避免除以零
    
    // 绘制网格
    if (this.props.options.showGrid) {
      this.drawGrid(padding, chartWidth, chartHeight, minValue, maxValue);
    }
    
    // 绘制柱状图
    this.drawBars(padding, chartWidth, chartHeight, minValue, maxValue);
    
    // 绘制坐标轴
    this.drawAxes(padding, chartWidth, chartHeight, minValue, maxValue);
    
    // 绘制标签
    this.drawLabels(padding, chartWidth, chartHeight);
    
    // 添加交互事件
    this.addInteractions(padding, chartWidth, chartHeight, minValue, maxValue);
    
    this.state.isRendered = true;
  }
  
  /**
   * 更新主题相关样式
   */
  updateThemeStyles() {
    const isDarkTheme = this.theme === 'dark';
    
    // 更新网格颜色
    this.props.options.gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // 更新标签颜色
    this.props.options.labelColor = isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : '#6b7280';
  }
  
  /**
   * 绘制网格
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   * @param {number} minValue - 最小值
   * @param {number} maxValue - 最大值
   */
  drawGrid(padding, chartWidth, chartHeight, minValue, maxValue) {
    const ctx = this.ctx;
    const gridColor = this.props.options.gridColor;
    
    // 绘制水平网格线
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    // 绘制5条水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
  }
  
  /**
   * 绘制柱状图
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   * @param {number} minValue - 最小值
   * @param {number} maxValue - 最大值
   */
  drawBars(padding, chartWidth, chartHeight, minValue, maxValue) {
    const ctx = this.ctx;
    const data = this.props.data;
    const barWidth = chartWidth / data.length * this.props.options.barWidth;
    const gap = chartWidth / data.length * (1 - this.props.options.barWidth) / 2;
    const valueRange = maxValue - minValue;
    
    data.forEach((item, index) => {
      // 计算柱形位置
      const x = padding + gap + index * (barWidth + gap * 2);
      const barHeight = ((item.value - minValue) / valueRange) * chartHeight;
      const y = padding + chartHeight - barHeight;
      
      // 绘制柱形
      ctx.fillStyle = this.props.options.barColor;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // 绘制柱形边框
      ctx.strokeStyle = this.theme === 'dark' ? '#1f2937' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      // 绘制数值
      if (this.props.options.showValues) {
        ctx.fillStyle = this.props.options.labelColor;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(item.value, x + barWidth / 2, y - 5);
      }
    });
  }
  
  /**
   * 绘制坐标轴
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   * @param {number} minValue - 最小值
   * @param {number} maxValue - 最大值
   */
  drawAxes(padding, chartWidth, chartHeight, minValue, maxValue) {
    const ctx = this.ctx;
    
    // 绘制坐标轴
    ctx.strokeStyle = this.props.options.labelColor;
    ctx.lineWidth = 1;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();
    
    // 绘制Y轴标签
    const labelColor = this.props.options.labelColor;
    ctx.fillStyle = labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // 绘制5个Y轴标签
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      const value = maxValue - (i / 5) * (maxValue - minValue);
      ctx.fillText(Math.round(value), padding - 10, y);
    }
  }
  
  /**
   * 绘制标签
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   */
  drawLabels(padding, chartWidth, chartHeight) {
    const ctx = this.ctx;
    const data = this.props.data;
    const barWidth = chartWidth / data.length * this.props.options.barWidth;
    const gap = chartWidth / data.length * (1 - this.props.options.barWidth) / 2;
    
    // 绘制X轴标签
    const labelColor = this.props.options.labelColor;
    ctx.fillStyle = labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    data.forEach((item, index) => {
      const x = padding + gap + index * (barWidth + gap * 2) + barWidth / 2;
      ctx.fillText(item.label, x, padding + chartHeight + 10);
    });
  }
  
  /**
   * 添加交互事件
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   * @param {number} minValue - 最小值
   * @param {number} maxValue - 最大值
   */
  addInteractions(padding, chartWidth, chartHeight, minValue, maxValue) {
    // 移除现有的事件监听器
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    
    const data = this.props.data;
    const barWidth = chartWidth / data.length * this.props.options.barWidth;
    const gap = chartWidth / data.length * (1 - this.props.options.barWidth) / 2;
    const valueRange = maxValue - minValue;
    
    // 鼠标移动事件
    this.handleMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 检查鼠标是否在图表区域内
      if (x < padding || x > padding + chartWidth || y < padding || y > padding + chartHeight) {
        this.hideTooltip();
        return;
      }
      
      // 找到鼠标所在的柱形
      const index = Math.floor((x - padding) / (barWidth + gap * 2));
      if (index >= 0 && index < data.length) {
        const item = data[index];
        const barX = padding + gap + index * (barWidth + gap * 2);
        const barHeight = ((item.value - minValue) / valueRange) * chartHeight;
        const barY = padding + chartHeight - barHeight;
        
        // 检查鼠标是否在柱形上
        if (x >= barX && x <= barX + barWidth && y >= barY && y <= barY + barHeight) {
          // 显示tooltip
          this.showTooltip(
            { x: x, y: y - 20 },
            `${item.label}: ${item.value}`
          );
          return;
        }
      }
      
      this.hideTooltip();
    };
    
    // 鼠标离开事件
    this.handleMouseLeave = () => {
      this.hideTooltip();
    };
    
    // 添加事件监听器
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }
}

// 注册到全局作用域，供浏览器环境使用
window.BarChart = BarChart;