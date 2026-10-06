/**
 * 折线图组件
 * 用于展示数据随时间或其他连续变量的变化趋势
 */
class LineChart extends BaseChart {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认折线图属性
    this.defaultLineProps = {
      lineColor: '#3b82f6',
      pointColor: '#3b82f6',
      areaColor: 'rgba(59, 130, 246, 0.1)',
      gridColor: 'rgba(0, 0, 0, 0.1)',
      labelColor: '#6b7280',
      showArea: true,
      showGrid: true,
      showPoints: true,
      smooth: true
    };
    
    this.props = { 
      ...this.props, 
      options: { ...this.defaultLineProps, ...this.props.options } 
    };
  }
  
  /**
   * 渲染折线图
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
    
    // 绘制折线和区域
    this.drawLineAndArea(padding, chartWidth, chartHeight, minValue, maxValue);
    
    // 绘制坐标轴
    this.drawAxes(padding, chartWidth, chartHeight, minValue, maxValue);
    
    // 绘制数据点
    if (this.props.options.showPoints) {
      this.drawPoints(padding, chartWidth, chartHeight, minValue, maxValue);
    }
    
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
    
    // 绘制垂直网格线（按数据点数量）
    const step = Math.max(1, Math.floor(this.props.data.length / 6));
    for (let i = 0; i < this.props.data.length; i += step) {
      const x = padding + (chartWidth / (this.props.data.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }
  }
  
  /**
   * 绘制折线和填充区域
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   * @param {number} minValue - 最小值
   * @param {number} maxValue - 最大值
   */
  drawLineAndArea(padding, chartWidth, chartHeight, minValue, maxValue) {
    const ctx = this.ctx;
    const data = this.props.data;
    const stepX = chartWidth / (data.length - 1);
    const valueRange = maxValue - minValue;
    
    // 开始路径
    ctx.beginPath();
    
    // 移动到第一个点
    const firstY = padding + chartHeight - ((data[0].value - minValue) / valueRange) * chartHeight;
    ctx.moveTo(padding, firstY);
    
    // 绘制平滑曲线或折线
    if (this.props.options.smooth) {
      // 平滑曲线
      for (let i = 1; i < data.length; i++) {
        const prevX = padding + stepX * (i - 1);
        const prevY = padding + chartHeight - ((data[i - 1].value - minValue) / valueRange) * chartHeight;
        const currX = padding + stepX * i;
        const currY = padding + chartHeight - ((data[i].value - minValue) / valueRange) * chartHeight;
        
        // 控制点计算
        const controlPointX1 = prevX + stepX / 3;
        const controlPointX2 = currX - stepX / 3;
        
        ctx.bezierCurveTo(
          controlPointX1, prevY,
          controlPointX2, currY,
          currX, currY
        );
      }
    } else {
      // 折线
      for (let i = 1; i < data.length; i++) {
        const x = padding + stepX * i;
        const y = padding + chartHeight - ((data[i].value - minValue) / valueRange) * chartHeight;
        ctx.lineTo(x, y);
      }
    }
    
    // 绘制填充区域
    if (this.props.options.showArea) {
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.closePath();
      ctx.fillStyle = this.props.options.areaColor;
      ctx.fill();
      
      // 重新开始绘制线条
      ctx.beginPath();
      ctx.moveTo(padding, firstY);
      
      // 重新绘制曲线
      if (this.props.options.smooth) {
        for (let i = 1; i < data.length; i++) {
          const prevX = padding + stepX * (i - 1);
          const prevY = padding + chartHeight - ((data[i - 1].value - minValue) / valueRange) * chartHeight;
          const currX = padding + stepX * i;
          const currY = padding + chartHeight - ((data[i].value - minValue) / valueRange) * chartHeight;
          
          const controlPointX1 = prevX + stepX / 3;
          const controlPointX2 = currX - stepX / 3;
          
          ctx.bezierCurveTo(
            controlPointX1, prevY,
            controlPointX2, currY,
            currX, currY
          );
        }
      } else {
        for (let i = 1; i < data.length; i++) {
          const x = padding + stepX * i;
          const y = padding + chartHeight - ((data[i].value - minValue) / valueRange) * chartHeight;
          ctx.lineTo(x, y);
        }
      }
    }
    
    // 绘制线条
    ctx.strokeStyle = this.props.options.lineColor;
    ctx.lineWidth = 3;
    ctx.stroke();
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
   * 绘制数据点
   * @param {number} padding - 内边距
   * @param {number} chartWidth - 图表宽度
   * @param {number} chartHeight - 图表高度
   * @param {number} minValue - 最小值
   * @param {number} maxValue - 最大值
   */
  drawPoints(padding, chartWidth, chartHeight, minValue, maxValue) {
    const ctx = this.ctx;
    const data = this.props.data;
    const stepX = chartWidth / (data.length - 1);
    const valueRange = maxValue - minValue;
    
    // 绘制数据点
    data.forEach((item, index) => {
      const x = padding + stepX * index;
      const y = padding + chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
      
      // 绘制光晕
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
      gradient.addColorStop(0, this.props.options.lineColor);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制中心点
      ctx.fillStyle = this.props.options.pointColor;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
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
    const stepX = chartWidth / (data.length - 1);
    
    // 绘制X轴标签
    const labelColor = this.props.options.labelColor;
    ctx.fillStyle = labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    data.forEach((item, index) => {
      const x = padding + stepX * index;
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
    const stepX = chartWidth / (data.length - 1);
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
      
      // 找到最近的数据点
      const index = Math.round((x - padding) / stepX);
      if (index >= 0 && index < data.length) {
        const item = data[index];
        const pointX = padding + stepX * index;
        const pointY = padding + chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
        
        // 显示tooltip
        this.showTooltip(
          { x: pointX, y: pointY - 20 },
          `${item.label}: ${item.value}`
        );
      }
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
window.LineChart = LineChart;
