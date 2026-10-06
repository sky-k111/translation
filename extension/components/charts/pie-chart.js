/**
 * 饼图组件
 * 用于展示数据的分布情况
 */
class PieChart extends BaseChart {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认饼图属性
    this.defaultPieProps = {
      colors: ['#3b82f6', '#f093fb', '#4facfe', '#00f2fe', '#fa709a', '#fee140', '#84fab0', '#8fd3f4'],
      showLabels: true,
      showLegend: true,
      radius: '70%',
      innerRadius: 0, // 0 为饼图，大于0为环形图
      labelColor: '#6b7280',
      hoverOffset: 10
    };
    
    this.props = { 
      ...this.props, 
      options: { ...this.defaultPieProps, ...this.props.options } 
    };
  }
  
  /**
   * 渲染饼图
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
    const radius = Math.min(centerX, centerY) * (parseInt(this.props.options.radius) / 100);
    const innerRadius = this.props.options.innerRadius;
    
    // 计算总数值
    const total = this.props.data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return;
    }
    
    // 绘制饼图
    this.drawPie(centerX, centerY, radius, innerRadius, total);
    
    // 绘制中心文本
    if (innerRadius > 0) {
      this.drawCenterText(centerX, centerY);
    }
    
    // 添加交互事件
    this.addInteractions(centerX, centerY, radius, innerRadius, total);
    
    this.state.isRendered = true;
  }
  
  /**
   * 更新主题相关样式
   */
  updateThemeStyles() {
    const isDarkTheme = this.theme === 'dark';
    
    // 更新标签颜色
    this.props.options.labelColor = isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : '#6b7280';
  }
  
  /**
   * 绘制饼图
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {number} innerRadius - 内半径
   * @param {number} total - 总数值
   */
  drawPie(centerX, centerY, radius, innerRadius, total) {
    const ctx = this.ctx;
    let currentAngle = -Math.PI / 2; // 从顶部开始
    
    // 绘制每个扇形
    this.props.data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const color = this.props.options.colors[index % this.props.options.colors.length];
      
      // 绘制扇形
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      
      // 绘制边框（可选）
      ctx.strokeStyle = this.theme === 'dark' ? '#1f2937' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 绘制标签
      if (this.props.options.showLabels) {
        this.drawSliceLabel(ctx, centerX, centerY, radius, currentAngle, sliceAngle, item, color);
      }
      
      // 更新当前角度
      currentAngle += sliceAngle;
    });
  }
  
  /**
   * 绘制扇形标签
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {number} startAngle - 起始角度
   * @param {number} sliceAngle - 扇形角度
   * @param {Object} item - 数据项
   * @param {string} color - 扇形颜色
   */
  drawSliceLabel(ctx, centerX, centerY, radius, startAngle, sliceAngle, item, color) {
    const middleAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius + 20;
    const labelX = centerX + Math.cos(middleAngle) * labelRadius;
    const labelY = centerY + Math.sin(middleAngle) * labelRadius;
    
    ctx.fillStyle = this.props.options.labelColor;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, labelX, labelY);
    
    // 绘制数值
    ctx.font = '10px sans-serif';
    ctx.fillText(item.value, labelX, labelY + 15);
  }
  
  /**
   * 绘制中心文本（环形图）
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   */
  drawCenterText(centerX, centerY) {
    const ctx = this.ctx;
    const total = this.props.data.reduce((sum, item) => sum + item.value, 0);
    
    ctx.fillStyle = this.props.options.labelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 绘制总数值
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(total, centerX, centerY);
    
    // 绘制单位
    ctx.font = '12px sans-serif';
    ctx.fillText('总数', centerX, centerY + 25);
  }
  
  /**
   * 添加交互事件
   * @param {number} centerX - 圆心X坐标
   * @param {number} centerY - 圆心Y坐标
   * @param {number} radius - 半径
   * @param {number} innerRadius - 内半径
   * @param {number} total - 总数值
   */
  addInteractions(centerX, centerY, radius, innerRadius, total) {
    // 移除现有的事件监听器
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    
    // 鼠标移动事件
    this.handleMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 计算鼠标到圆心的距离
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 检查鼠标是否在饼图区域内
      if (distance < innerRadius || distance > radius) {
        this.hideTooltip();
        return;
      }
      
      // 计算鼠标所在的扇形
      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) {
        angle += 2 * Math.PI;
      }
      
      let currentAngle = -Math.PI / 2;
      for (let i = 0; i < this.props.data.length; i++) {
        const item = this.props.data[i];
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        if (angle >= currentAngle && angle <= currentAngle + sliceAngle) {
          // 显示tooltip
          this.showTooltip(
            { x: x, y: y - 20 },
            `${item.label}: ${item.value}`
          );
          break;
        }
        
        currentAngle += sliceAngle;
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
  
  /**
   * 更新主题相关样式
   */
  updateThemeStyles() {
    const isDarkTheme = this.theme === 'dark';
    
    // 更新标签颜色
    this.props.options.labelColor = isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : '#6b7280';
  }
}

// 注册到全局作用域，供浏览器环境使用
window.PieChart = PieChart;
