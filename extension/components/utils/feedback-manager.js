/**
 * 交互反馈与微动画管理器
 * 提供丰富的用户反馈和流畅的微动画
 */

class FeedbackManager {
  constructor() {
    this.activeAnimations = new Map();
    this.toastQueue = [];
    this.isProcessingQueue = false;
    
    this.init();
  }
  
  /**
   * 初始化
   */
  init() {
    this.injectStyles();
    this.setupGlobalListeners();
  }
  
  /**
   * 注入样式
   */
  injectStyles() {
    if (document.getElementById('feedback-manager-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'feedback-manager-styles';
    style.textContent = `
      /* 加载骨架屏 */
      .skeleton-loading {
        background: linear-gradient(90deg, 
          rgba(255, 255, 255, 0.1) 25%, 
          rgba(255, 255, 255, 0.2) 50%, 
          rgba(255, 255, 255, 0.1) 75%
        );
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
        border-radius: 4px;
      }
      
      @keyframes skeleton-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      /* 按钮反馈 */
      .btn-feedback {
        position: relative;
        overflow: hidden;
      }
      
      .btn-feedback::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }
      
      .btn-feedback:active::after {
        width: 300px;
        height: 300px;
      }
      
      /* 成功动画 */
      .success-checkmark {
        width: 80px;
        height: 80px;
        margin: 0 auto;
      }
      
      .success-checkmark-circle {
        stroke-dasharray: 166;
        stroke-dashoffset: 166;
        stroke-width: 2;
        stroke-miterlimit: 10;
        stroke: #48bb78;
        fill: none;
        animation: checkmark-stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
      }
      
      .success-checkmark-check {
        transform-origin: 50% 50%;
        stroke-dasharray: 48;
        stroke-dashoffset: 48;
        stroke: #48bb78;
        animation: checkmark-stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
      }
      
      @keyframes checkmark-stroke {
        100% {
          stroke-dashoffset: 0;
        }
      }
      
      /* 浮动文字 */
      .floating-text {
        position: fixed;
        font-size: 14px;
        font-weight: 600;
        color: white;
        background: rgba(102, 126, 234, 0.9);
        padding: 8px 16px;
        border-radius: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        pointer-events: none;
        animation: float-up 1.5s ease-out forwards;
      }
      
      @keyframes float-up {
        0% {
          opacity: 0;
          transform: translateY(0) scale(0.8);
        }
        20% {
          opacity: 1;
          transform: translateY(-10px) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateY(-50px) scale(0.8);
        }
      }
      
      /* 脉冲效果 */
      .pulse-effect {
        animation: pulse 0.5s ease-in-out;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
      
      /* 摇晃效果 */
      .shake-effect {
        animation: shake 0.5s ease-in-out;
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      /* 弹跳效果 */
      .bounce-effect {
        animation: bounce 0.6s ease-in-out;
      }
      
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
      
      /* 旋转效果 */
      .rotate-effect {
        animation: rotate 0.5s ease-in-out;
      }
      
      @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* 进度指示器 */
      .progress-indicator {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        padding: 24px;
        border-radius: 16px;
        z-index: 10001;
        text-align: center;
        color: white;
      }
      
      .progress-spinner {
        width: 48px;
        height: 48px;
        margin: 0 auto 16px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      .progress-text {
        font-size: 14px;
        opacity: 0.9;
      }
      
      .progress-steps {
        margin-top: 12px;
        font-size: 12px;
        opacity: 0.7;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * 设置全局监听器
   */
  setupGlobalListeners() {
    // 为所有按钮添加反馈效果
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button, .btn, [role="button"]');
      if (button && !button.classList.contains('btn-feedback')) {
        button.classList.add('btn-feedback');
      }
    });
  }
  
  /**
   * 显示加载骨架屏
   */
  showSkeleton(container, config = {}) {
    const {
      lines = 3,
      height = '16px',
      spacing = '12px'
    } = config;
    
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-container';
    
    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton-loading';
      line.style.height = height;
      line.style.marginBottom = i < lines - 1 ? spacing : '0';
      line.style.width = i === lines - 1 ? '60%' : '100%';
      skeleton.appendChild(line);
    }
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.innerHTML = '';
      container.appendChild(skeleton);
    }
    
    return skeleton;
  }
  
  /**
   * 显示进度指示器
   */
  showProgress(message = '加载中...', steps = []) {
    const indicator = document.createElement('div');
    indicator.className = 'progress-indicator';
    indicator.id = 'global-progress-indicator';
    
    let stepsHTML = '';
    if (steps.length > 0) {
      stepsHTML = `<div class="progress-steps">${steps[0]}</div>`;
    }
    
    indicator.innerHTML = `
      <div class="progress-spinner"></div>
      <div class="progress-text">${message}</div>
      ${stepsHTML}
    `;
    
    document.body.appendChild(indicator);
    
    // 返回更新函数
    return {
      updateMessage: (msg) => {
        const textEl = indicator.querySelector('.progress-text');
        if (textEl) textEl.textContent = msg;
      },
      updateStep: (stepIndex) => {
        const stepsEl = indicator.querySelector('.progress-steps');
        if (stepsEl && steps[stepIndex]) {
          stepsEl.textContent = steps[stepIndex];
        }
      },
      close: () => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
      }
    };
  }
  
  /**
   * 隐藏进度指示器
   */
  hideProgress() {
    const indicator = document.getElementById('global-progress-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }
  }
  
  /**
   * 显示成功动画
   */
  showSuccess(message, duration = 2000) {
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      animation: fadeIn 0.3s ease;
    `;
    
    overlay.innerHTML = `
      <div style="background: white; padding: 32px; border-radius: 16px; text-align: center;">
        <svg class="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="success-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        <div style="margin-top: 16px; font-size: 18px; font-weight: 600; color: #333;">${message}</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }, duration);
  }
  
  /**
   * 显示浮动文字
   */
  showFloatingText(text, x, y) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = text;
    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    
    document.body.appendChild(floatingText);
    
    setTimeout(() => floatingText.remove(), 1500);
  }
  
  /**
   * 添加脉冲效果
   */
  pulse(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (element) {
      element.classList.add('pulse-effect');
      setTimeout(() => element.classList.remove('pulse-effect'), 500);
    }
  }
  
  /**
   * 添加摇晃效果
   */
  shake(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (element) {
      element.classList.add('shake-effect');
      setTimeout(() => element.classList.remove('shake-effect'), 500);
    }
  }
  
  /**
   * 添加弹跳效果
   */
  bounce(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (element) {
      element.classList.add('bounce-effect');
      setTimeout(() => element.classList.remove('bounce-effect'), 600);
    }
  }
  
  /**
   * 添加旋转效果
   */
  rotate(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (element) {
      element.classList.add('rotate-effect');
      setTimeout(() => element.classList.remove('rotate-effect'), 500);
    }
  }
  
  /**
   * 显示 Toast 通知
   */
  showToast(message, type = 'info', duration = 3000) {
    const toast = {
      id: Date.now(),
      message,
      type,
      duration
    };
    
    this.toastQueue.push(toast);
    
    if (!this.isProcessingQueue) {
      this.processToastQueue();
    }
  }
  
  /**
   * 处理 Toast 队列
   */
  async processToastQueue() {
    if (this.toastQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }
    
    this.isProcessingQueue = true;
    const toast = this.toastQueue.shift();
    
    await this.displayToast(toast);
    
    // 继续处理队列
    this.processToastQueue();
  }
  
  /**
   * 显示单个 Toast
   */
  displayToast(toast) {
    return new Promise((resolve) => {
      const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#4299e1'
      };
      
      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };
      
      const toastEl = document.createElement('div');
      toastEl.className = 'feedback-toast';
      toastEl.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${colors[toast.type]};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10003;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
      `;
      
      toastEl.innerHTML = `
        <div style="width: 24px; height: 24px; background: rgba(255, 255, 255, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
          ${icons[toast.type]}
        </div>
        <div style="flex: 1; font-size: 14px; font-weight: 500;">${toast.message}</div>
      `;
      
      document.body.appendChild(toastEl);
      
      setTimeout(() => {
        toastEl.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          toastEl.remove();
          resolve();
        }, 300);
      }, toast.duration);
    });
  }
  
  /**
   * 按钮加载状态
   */
  setButtonLoading(button, loading = true) {
    if (typeof button === 'string') {
      button = document.querySelector(button);
    }
    
    if (!button) return;
    
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.style.position = 'relative';
      button.style.color = 'transparent';
      
      const spinner = document.createElement('div');
      spinner.className = 'button-spinner';
      spinner.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      `;
      
      button.appendChild(spinner);
    } else {
      button.disabled = false;
      button.style.color = '';
      button.textContent = button.dataset.originalText || button.textContent;
      
      const spinner = button.querySelector('.button-spinner');
      if (spinner) spinner.remove();
    }
  }
}

// 添加动画样式
const animationStyles = document.createElement('style');
animationStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(animationStyles);

// 导出到全局
if (typeof window !== 'undefined') {
  window.FeedbackManager = FeedbackManager;
  window.feedbackManager = new FeedbackManager();
}
