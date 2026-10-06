/**
 * 星空粒子网络特效
 * 实现鼠标移动时的粒子连接效果
 */
class ParticleNetwork {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationFrame = null;
    this.mouse = { x: null, y: null };
    this.isActive = false;

    // 配置参数
    this.config = {
      particleCount: 40,        // 粒子数量（进一步减少）
      connectionDistance: 120,  // 粒子间连线距离
      mouseDistance: 250,       // 鼠标光照半径（增大以覆盖更多区域）
      // 金色系配色
      particleColor: '255, 215, 0',    // 金色粒子 RGB 值
      lineColor: '255, 223, 0',        // 淡金色连线 RGB 值
      mouseLineColor: '255, 236, 139', // 亮金色鼠标连线 RGB 值
      lineWidth: 0.5,           // 普通连线粗细
      mouseLineWidth: 0.8,      // 鼠标连线粗细
      speed: 0.4                // 粒子运动速度
    };

    // 绑定上下文
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.animate = this.animate.bind(this);
  }

  /**
   * 初始化特效
   */
  init() {
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    
    // 初始化画布大小
    this.handleResize();
    
    // 初始化粒子
    this.initParticles();
    
    // 绑定事件
    window.addEventListener('resize', this.handleResize);
    // 监听全局鼠标移动，确保光标在UI元素上时也能产生连线
    window.addEventListener('mousemove', this.handleMouseMove);
    // 监听鼠标离开窗口
    document.addEventListener('mouseleave', this.handleMouseLeave);
  }

  /**
   * 启动动画
   */
  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    // 如果还没初始化，先初始化
    if (!this.canvas) {
      this.init();
    }
    
    // 开始动画循环
    this.animate();
  }

  /**
   * 停止动画
   */
  stop() {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * 初始化粒子集合
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.config.speed,
        vy: (Math.random() - 0.5) * this.config.speed,
        size: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.6 + 0.3, // 基础透明度 0.3-0.9，保留亮度差异
        currentAlpha: 0 // 当前实际透明度
      });
    }
  }

  /**
   * 处理窗口调整
   */
  handleResize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    
    // 重新分布粒子（可选，或者只补充粒子）
    // 这里简单处理：如果画布变大太多，可能需要重置，
    // 但为了平滑体验，我们保持现有粒子，让它们自然运动到新区域
  }

  /**
   * 处理鼠标移动
   */
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  /**
   * 处理鼠标离开
   */
  handleMouseLeave() {
    this.mouse.x = null;
    this.mouse.y = null;
  }

  /**
   * 动画循环
   */
  animate() {
    if (!this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 更新和绘制粒子
    this.updateParticles();
    
    // 绘制连线
    this.drawConnections();
    
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  /**
   * 更新粒子状态
   */
  updateParticles() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      // 移动
      p.x += p.vx;
      p.y += p.vy;
      
      // 边界反弹
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // 计算与鼠标的距离
      let dist = Infinity;
      if (this.mouse.x != null && this.mouse.y != null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      }

      // 动态计算透明度
      // 1. 远离鼠标趋近透明 (0.05 * baseAlpha)
      // 2. 越靠近越亮，保留 baseAlpha 的差异
      if (dist < this.config.mouseDistance) {
        // 计算接近因子 (0~1)，距离越近越接近 1
        const proximity = 1 - (dist / this.config.mouseDistance);
        // 亮度公式：基础暗度 + (最大亮度增强 * 接近因子)
        // 使用乘法保留 baseAlpha 的个体差异
        p.currentAlpha = p.baseAlpha * (0.1 + 2.0 * proximity);
        // 限制最大透明度为 1
        if (p.currentAlpha > 1) p.currentAlpha = 1;
      } else {
        // 范围外保持极低亮度
        p.currentAlpha = p.baseAlpha * 0.1;
      }
      
      // 绘制粒子
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.config.particleColor}, ${p.currentAlpha})`;
      
      // 添加发光特效 (随粒子亮度变化)
      if (p.currentAlpha > 0.2) {
        this.ctx.shadowBlur = 15 * p.currentAlpha;
        this.ctx.shadowColor = `rgba(${this.config.particleColor}, ${p.currentAlpha})`;
      } else {
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.fill();
      
      // 重置阴影，避免影响连线
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * 绘制连线
   */
  drawConnections() {
    // 粒子间连线
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        // 如果两个粒子都太暗，就不画线，优化性能且符合视觉逻辑
        if (p1.currentAlpha < 0.05 && p2.currentAlpha < 0.05) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.config.connectionDistance) {
          this.ctx.beginPath();
          // 连线透明度优化：
          // 1. 基础透明度：取两端点透明度的较小值 (Math.min(p1.currentAlpha, p2.currentAlpha))
          // 2. 距离衰减因子：距离越近越亮 (1 - distance / this.config.connectionDistance)
          // 3. 整体系数：0.8，避免线条过亮抢夺粒子焦点
          const distanceFactor = 1 - (distance / this.config.connectionDistance);
          const lineAlpha = Math.min(p1.currentAlpha, p2.currentAlpha) * distanceFactor * 0.8;
          
          this.ctx.strokeStyle = `rgba(${this.config.lineColor}, ${lineAlpha})`;
          this.ctx.lineWidth = this.config.lineWidth; // 使用配置的细线条
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
      
      // 鼠标连线
      if (this.mouse.x != null && this.mouse.y != null) {
        const p = this.particles[i];
        
        // 如果粒子太暗，不与鼠标连线
        if (p.currentAlpha < 0.1) continue;

        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.config.mouseDistance) { // 这里可以用 mouseDistance 或单独的吸附距离
          this.ctx.beginPath();
          // 鼠标连线稍微亮一点
          const lineAlpha = p.currentAlpha * 0.8;
          this.ctx.strokeStyle = `rgba(${this.config.mouseLineColor}, ${lineAlpha})`;
          this.ctx.lineWidth = this.config.mouseLineWidth; // 使用配置的鼠标连线粗细
          this.ctx.moveTo(this.mouse.x, this.mouse.y);
          this.ctx.lineTo(p.x, p.y);
          this.ctx.stroke();
        }
      }
    }
  }
}

// 导出实例
const particleNetwork = new ParticleNetwork('particleCanvas');
window.particleNetwork = particleNetwork;
