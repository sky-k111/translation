/**
 * 增强 UX 管理器
 * 集成 Feedback 功能
 */

class EnhancedUXManager {
  constructor() {
    this.feedbackManager = null;
    this.isInitialized = false;
    
    this.init();
  }
  
  /**
   * 初始化
   */
  async init() {
    try {
      // 等待 DOM 加载完成
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // 初始化反馈管理器
      this.feedbackManager = window.feedbackManager || new FeedbackManager();
      
      // 设置交互增强
      this.setupInteractionEnhancements();
      
      this.isInitialized = true;
      console.log('✓ Enhanced UX Manager 初始化完成');
      
    } catch (error) {
      console.error('Enhanced UX Manager 初始化失败:', error);
    }
  }
  
  /**
   * 设置交互增强
   */
  setupInteractionEnhancements() {
    // 增强所有按钮的反馈
    this.enhanceButtons();
    
    // 增强表单输入
    this.enhanceInputs();
    
    // 增强卡片交互
    this.enhanceCards();
    
    // 增强学习模式
    this.enhanceLearningMode();
  }
  
  /**
   * 增强按钮
   */
  enhanceButtons() {
    // 为所有主要按钮添加加载状态支持
    document.addEventListener('click', async (e) => {
      const button = e.target.closest('button[data-async], .async-btn');
      if (!button || button.disabled) return;
      
      // 显示加载状态
      this.feedbackManager.setButtonLoading(button, true);
      
      // 模拟异步操作（实际应该由具体功能触发）
      button.addEventListener('asyncComplete', () => {
        this.feedbackManager.setButtonLoading(button, false);
      }, { once: true });
    });
    
    // 收藏按钮增强
    document.addEventListener('click', (e) => {
      const starBtn = e.target.closest('.star-btn');
      if (!starBtn) return;
      
      const isStarred = starBtn.classList.contains('starred');
      
      if (!isStarred) {
        // 添加收藏动画
        this.feedbackManager.bounce(starBtn);
        
        // 显示浮动文字
        const rect = starBtn.getBoundingClientRect();
        this.feedbackManager.showFloatingText(
          '+1 收藏',
          rect.left + rect.width / 2,
          rect.top
        );
      } else {
        // 取消收藏动画
        this.feedbackManager.shake(starBtn);
      }
    });
    
    // 学习按钮增强
    document.addEventListener('click', (e) => {
      const learningBtn = e.target.closest('#startLearningBtn, #reviewDifficultBtn, #dailyChallengeBtn');
      if (!learningBtn) return;
      
      this.feedbackManager.pulse(learningBtn);
    });
  }
  
  /**
   * 增强输入框
   */
  enhanceInputs() {
    // 搜索框增强
    const searchInput = document.querySelector('#searchInput');
    if (searchInput) {
      let searchTimeout;
      
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        
        // 显示搜索中状态
        const container = searchInput.closest('.search-container');
        if (container) {
          container.classList.add('searching');
        }
        
        searchTimeout = setTimeout(() => {
          // 移除搜索中状态
          if (container) {
            container.classList.remove('searching');
          }
          
          // 如果有结果，显示成功反馈
          if (e.target.value.trim()) {
            this.feedbackManager.pulse(searchInput);
          }
        }, 500);
      });
    }
  }
  
  /**
   * 增强卡片
   */
  enhanceCards() {
    // 统计卡片点击增强
    document.addEventListener('click', (e) => {
      const statCard = e.target.closest('.stat-card');
      if (!statCard) return;
      
      this.feedbackManager.pulse(statCard);
      
      // 显示加载骨架屏（如果需要加载数据）
      const wordList = document.querySelector('#wordList');
      if (wordList) {
        this.feedbackManager.showSkeleton(wordList, {
          lines: 5,
          height: '60px',
          spacing: '12px'
        });
        
        // 模拟数据加载
        setTimeout(() => {
          // 实际数据加载完成后移除骨架屏
          // 这里应该由实际的数据加载逻辑触发
        }, 500);
      }
    });
  }
  
  /**
   * 增强学习模式
   */
  enhanceLearningMode() {
    // 闪卡翻转增强
    document.addEventListener('click', (e) => {
      const flipBtn = e.target.closest('#flipCard');
      if (!flipBtn) return;
      
      const flashcard = document.querySelector('.flashcard');
      if (flashcard) {
        this.feedbackManager.rotate(flashcard);
      }
    });
    
    // 答题反馈增强
    document.addEventListener('click', (e) => {
      const option = e.target.closest('.quiz-option');
      if (!option) return;
      
      const isCorrect = option.dataset.correct === 'true';
      
      if (isCorrect) {
        // 正确答案
        option.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        this.feedbackManager.bounce(option);
        this.feedbackManager.showFloatingText('✓ 正确！', 
          option.offsetLeft + option.offsetWidth / 2,
          option.offsetTop
        );
      } else {
        // 错误答案
        option.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
        this.feedbackManager.shake(option);
      }
    });
    
    // 学习完成增强
    document.addEventListener('learningComplete', (e) => {
      const stats = e.detail || {};
      
      this.feedbackManager.showSuccess(
        `太棒了！完成 ${stats.total || 0} 题，正确率 ${stats.accuracy || 0}%`,
        3000
      );
    });
  }
  
  /**
   * 显示翻译进度
   */
  showTranslationProgress(word) {
    const steps = [
      '正在查询词典...',
      '正在获取释义...',
      '正在加载例句...',
      '翻译完成！'
    ];
    
    const progress = this.feedbackManager.showProgress(`正在翻译 "${word}"`, steps);
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        progress.updateStep(currentStep);
      } else {
        clearInterval(interval);
        progress.close();
      }
    }, 500);
    
    return progress;
  }
  
  /**
   * 显示成功提示
   */
  showSuccess(message) {
    this.feedbackManager.showToast(message, 'success');
  }
  
  /**
   * 显示错误提示
   */
  showError(message) {
    this.feedbackManager.showToast(message, 'error');
  }
  
  /**
   * 显示警告提示
   */
  showWarning(message) {
    this.feedbackManager.showToast(message, 'warning');
  }
  
  /**
   * 显示信息提示
   */
  showInfo(message) {
    this.feedbackManager.showToast(message, 'info');
  }
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.EnhancedUXManager = EnhancedUXManager;
  
  // 自动初始化
  window.enhancedUXManager = new EnhancedUXManager();
}
