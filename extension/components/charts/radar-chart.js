/**
 * 雷达图组件
 * 用于展示不同维度的数据对比
 */
class RadarChart extends BaseChart {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认雷达图属性
    this.defaultRadarProps = {
      colors: ['#3b82f6', '#f093fb', '#4facfe', '#00f2fe', '#fa709a', '#fee140', '#84fab0', '#8fd3f4'],
      showGrid: true,
      showAxes: true,
      showLabels: true,
      showValues: false,
      fillOpacity: 0.2,
      lineWidth: 2,
      pointSize: 4
    };
    
    this.props = { 
      ...this.props, 
      options: { ...this.defaultRadarProps, ...this.props.options } 
    };
  }
  
  /**
   * 渲染雷达图
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
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const data = this.props.data;
    const categories = data.map(item => item.label);
    const values = data.map(item => item.value);
    const angleStep = 2 * Math.PI / categories.length;
    
    // 计算最大值
    const maxValue = Math.max(...values) || 100;
    
    // 绘制网格
    if (this.props.options.showGrid) {
      this.drawGrid(centerX, centerY, radius, categories.length, maxValue);
    }
    
    // 绘制坐标轴
    if (this.props.options.showAxes) {
      this.drawAxes(centerX, centerY, radius, categories.length);
    }
    
    // 绘制数据
    this.drawData(centerX, centerY, radius, values, angleStep, maxValue);
    
    // 绘制标签
    if (this.props.options.showLabels) {
      this.drawLabels(centerX, centerY, radius, categories, angleStep);
    }
    
    // 添加交互事件
    this.addInteractions(centerX, centerY, radius, values, angleStep, maxValue, data);
    
    this.state.isRendered = true;
  }
  
  /**
   * 更新主题相关样式
   */
  updateThemeStyles() {
    const isDarkTheme = this.theme === 'dark';
    
    // 更新网格颜色
    this.gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // 更新标签颜色
    this.labelColor = isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : '#6b7280';
  }
  
  /**
   * 绘制网格
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {number} categoryCount - 类别数量
   * @param {number} maxValue - 最大值
   */
  drawGrid(centerX, centerY, radius, categoryCount, maxValue) {
    const ctx = this.ctx;
    const angleStep = 2 * Math.PI / categoryCount;
    
    // 绘制同心圆环
    for (let i = 1; i <= 5; i++) {
      const ringRadius = (i / 5) * radius;
      
      ctx.beginPath();
      ctx.moveTo(
        centerX + ringRadius * Math.cos(-Math.PI / 2),
        centerY + ringRadius * Math.sin(-Math.PI / 2)
      );
      
      for (let j = 1; j < categoryCount; j++) {
        const angle = -Math.PI / 2 + j * angleStep;
        ctx.lineTo(
          centerX + ringRadius * Math.cos(angle),
          centerY + ringRadius * Math.sin(angle)
        );
      }
      
      ctx.closePath();
      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  /**
   * 绘制坐标轴
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {number} categoryCount - 类别数量
   */
  drawAxes(centerX, centerY, radius, categoryCount) {
    const ctx = this.ctx;
    const angleStep = 2 * Math.PI / categoryCount;
    
    // 绘制放射状线条
    for (let i = 0; i < categoryCount; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      );
      ctx.strokeStyle = this.labelColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  /**
   * 绘制数据
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {Array} values - 数据值数组
   * @param {number} angleStep - 角度步长
   * @param {number} maxValue - 最大值
   */
  drawData(centerX, centerY, radius, values, angleStep, maxValue) {
    const ctx = this.ctx;
    
    // 开始绘制数据区域
    ctx.beginPath();
    
    // 移动到第一个点
    const firstAngle = -Math.PI / 2;
    const firstRadius = (values[0] / maxValue) * radius;
    ctx.moveTo(
      centerX + firstRadius * Math.cos(firstAngle),
      centerY + firstRadius * Math.sin(firstAngle)
    );
    
    // 绘制线条
    for (let i = 1; i < values.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const dataRadius = (values[i] / maxValue) * radius;
      ctx.lineTo(
        centerX + dataRadius * Math.cos(angle),
        centerY + dataRadius * Math.sin(angle)
      );
    }
    
    // 关闭路径
    ctx.closePath();
    
    // 填充区域
    ctx.fillStyle = `${this.props.options.colors[0]}${Math.round(this.props.options.fillOpacity * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
    
    // 绘制线条
    ctx.strokeStyle = this.props.options.colors[0];
    ctx.lineWidth = this.props.options.lineWidth;
    ctx.stroke();
    
    // 绘制数据点
    for (let i = 0; i < values.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const dataRadius = (values[i] / maxValue) * radius;
      const x = centerX + dataRadius * Math.cos(angle);
      const y = centerY + dataRadius * Math.sin(angle);
      
      ctx.beginPath();
      ctx.arc(x, y, this.props.options.pointSize, 0, 2 * Math.PI);
      ctx.fillStyle = this.props.options.colors[0];
      ctx.fill();
      
      // 绘制点的边框
      ctx.strokeStyle = this.theme === 'dark' ? '#1f2937' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  /**
   * 绘制标签
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {Array} categories - 类别数组
   * @param {number} angleStep - 角度步长
   */
  drawLabels(centerX, centerY, radius, categories, angleStep) {
    const ctx = this.ctx;
    
    ctx.fillStyle = this.labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < categories.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const labelRadius = radius * 1.1;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      
      ctx.fillText(categories[i], x, y);
    }
  }
  
  /**
   * 添加交互事件
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {Array} values - 数据值数组
   * @param {number} angleStep - 角度步长
   * @param {number} maxValue - 最大值
   * @param {Array} data - 原始数据
   */
  addInteractions(centerX, centerY, radius, values, angleStep, maxValue, data) {
    // 移除现有的事件监听器
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    
    // 鼠标移动事件
    this.handleMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 计算鼠标到圆心的距离和角度
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx);
      
      // 转换角度范围到0-2π
      if (angle < 0) {
        angle += 2 * Math.PI;
      }
      
      // 转换到以顶部为起点的角度
      const normalizedAngle = (angle + Math.PI / 2) % (2 * Math.PI);
      
      // 找到最接近的数据点
      const index = Math.round(normalizedAngle / angleStep) % values.length;
      const pointAngle = -Math.PI / 2 + index * angleStep;
      const pointRadius = (values[index] / maxValue) * radius;
      const pointX = centerX + pointRadius * Math.cos(pointAngle);
      const pointY = centerY + pointRadius * Math.sin(pointAngle);
      
      // 计算鼠标到数据点的距离
      const pointDistance = Math.sqrt(
        Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2)
      );
      
      // 如果鼠标接近数据点，显示tooltip
      if (pointDistance < 20) {
        this.showTooltip(
          { x: x, y: y - 20 },
          `${data[index].label}: ${data[index].value}`
        );
      } else {
        this.hideTooltip();
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
window.RadarChart = RadarChart;