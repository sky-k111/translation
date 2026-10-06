/**
 * 动态背景管理器模块
 * 负责处理翻译记录页面的动态渐变背景效果
 */
class DynamicBackgroundManager {
  constructor() {
    this.currentBackgroundTheme = 'default';
    this.gradientElement = null;
    this.animationFrame = null;
    
    // 定义不同主题的渐变颜色
    this.backgroundThemes = {
      default: {
        colors: ['#667eea', '#764ba2', '#f093fb'],
        duration: 8000
      },
      dark: {
        colors: ['#2d3748', '#4a5568', '#718096'],
        duration: 10000
      },
      blue: {
        colors: ['#3182ce', '#2b6cb0', '#2c5282'],
        duration: 9000
      },
      purple: {
        colors: ['#9f7aea', '#805ad5', '#6b46c1'],
        duration: 7000
      },
      green: {
        colors: ['#38a169', '#2f855a', '#276749'],
        duration: 8000
      },
      rainbow: {
        colors: ['#ff0080', '#ff8c00', '#40e0d0', '#0080ff', '#8000ff'],
        duration: 6000
      },
      sunset: {
        colors: ['#ff4e50', '#f9d423', '#ff6b6b', '#feca57'],
        duration: 9000
      }
    };
  }

  /**
   * 初始化动态背景
   */
  init() {
    // 创建渐变背景元素
    this.gradientElement = document.createElement('div');
    this.gradientElement.id = 'dynamic-background';
    this.gradientElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      background-size: 400% 400%;
      transition: all 0.5s ease;
    `;
    
    // 添加到页面
    document.body.appendChild(this.gradientElement);
    
    // 加载保存的背景主题
    this.loadSavedTheme();
  }

  /**
   * 加载保存的背景主题
   */
  async loadSavedTheme() {
    const result = await chrome.storage.local.get(['userSettings']);
    const settings = result.userSettings || {};
    const theme = settings.backgroundTheme || 'default';
    this.setTheme(theme);
  }

  /**
   * 设置背景主题
   * @param {string} themeName - 主题名称
   */
  setTheme(themeName) {
    if (!this.backgroundThemes[themeName]) {
      themeName = 'default';
    }
    
    this.currentBackgroundTheme = themeName;
    const theme = this.backgroundThemes[themeName];
    
    // 停止当前动画
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // 应用渐变动画
    this.applyGradientAnimation(theme.colors, theme.duration);
  }

  /**
   * 应用渐变动画
   * @param {Array} colors - 渐变颜色数组
   * @param {number} duration - 动画持续时间（毫秒）
   */
  applyGradientAnimation(colors, duration) {
    let startTime = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;
      
      // 计算当前渐变位置
      const hueProgress = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
      
      // 生成动态渐变背景
      const gradient = `linear-gradient(
        ${hueProgress * 360}deg,
        ${colors[0]} 0%,
        ${colors[1]} ${hueProgress * 50}%,
        ${colors[2]} ${hueProgress * 100}%
      )`;
      
      this.gradientElement.style.background = gradient;
      
      // 继续动画
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // 循环动画
        startTime = null;
        this.animationFrame = requestAnimationFrame(animate);
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * 保存背景主题设置
   * @param {string} themeName - 主题名称
   */
  async saveTheme(themeName) {
    const result = await chrome.storage.local.get(['userSettings']);
    const settings = result.userSettings || {};
    
    settings.backgroundTheme = themeName;
    
    await chrome.storage.local.set({ userSettings: settings });
  }
}

// 创建动态背景管理器实例
const dynamicBackgroundManager = new DynamicBackgroundManager();
window.dynamicBackgroundManager = dynamicBackgroundManager;