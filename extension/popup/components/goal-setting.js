/**
 * 学习目标设置组件
 * 允许用户设置和管理学习目标
 */
class GoalSetting {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    this.props = {
      containerId: 'dashboard-content',
      onSave: () => {},
      ...props
    };
    
    // 使用全局 GoalManager（通过传统脚本加载）
    this.goalManager = new window.GoalManager();
    this.isOpen = false;
    
    this.init();
  }
  
  /**
   * 初始化组件
   */
  async init() {
    await this.goalManager.init();
    this.createDOM();
    this.bindEvents();
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    this.container = document.createElement('div');
    this.container.className = 'goal-setting-container';
    this.container.innerHTML = `
      <div class="goal-setting-overlay"></div>
      <div class="goal-setting-dialog">
        <div class="goal-setting-header">
          <h3>设置学习目标</h3>
          <button class="goal-setting-close">×</button>
        </div>
        <div class="goal-setting-content">
          <form id="goalSettingForm">
            <!-- 每日目标 -->
            <div class="goal-item">
              <div class="goal-header">
                <div class="goal-info">
                  <h4>每日学习目标</h4>
                  <p>设置您每天希望学习的单词数量</p>
                </div>
                <div class="goal-toggle">
                  <input type="checkbox" id="dailyActive" checked>
                  <label for="dailyActive">启用</label>
                </div>
              </div>
              <div class="goal-input-group">
                <input type="number" id="dailyTarget" min="1" max="100" value="20" class="goal-input">
                <span class="goal-unit">单词</span>
              </div>
            </div>
            
            <!-- 每周目标 -->
            <div class="goal-item">
              <div class="goal-header">
                <div class="goal-info">
                  <h4>每周学习目标</h4>
                  <p>设置您每周希望学习的单词数量</p>
                </div>
                <div class="goal-toggle">
                  <input type="checkbox" id="weeklyActive" checked>
                  <label for="weeklyActive">启用</label>
                </div>
              </div>
              <div class="goal-input-group">
                <input type="number" id="weeklyTarget" min="1" max="700" value="140" class="goal-input">
                <span class="goal-unit">单词</span>
              </div>
            </div>
            
            <!-- 每月目标 -->
            <div class="goal-item">
              <div class="goal-header">
                <div class="goal-info">
                  <h4>每月学习目标</h4>
                  <p>设置您每月希望学习的单词数量</p>
                </div>
                <div class="goal-toggle">
                  <input type="checkbox" id="monthlyActive" checked>
                  <label for="monthlyActive">启用</label>
                </div>
              </div>
              <div class="goal-input-group">
                <input type="number" id="monthlyTarget" min="1" max="3000" value="600" class="goal-input">
                <span class="goal-unit">单词</span>
              </div>
            </div>
            
            <!-- 保存按钮 -->
            <div class="goal-setting-actions">
              <button type="button" class="goal-setting-cancel">取消</button>
              <button type="submit" class="goal-setting-save">保存</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // 添加样式
    this.addStyles();
    
    // 添加到容器
    const parent = document.getElementById(this.props.containerId);
    if (parent) {
      parent.appendChild(this.container);
    }
    
    // 初始化表单数据
    this.loadGoalData();
  }
  
  /**
   * 添加组件样式
   */
  addStyles() {
    const styles = `
      .goal-setting-container {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        align-items: center;
        justify-content: center;
      }
      
      .goal-setting-container.active {
        display: flex;
      }
      
      .goal-setting-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }
      
      .goal-setting-dialog {
        position: relative;
        width: 90%;
        max-width: 500px;
        background: var(--bg-primary);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 1001;
        overflow: hidden;
      }
      
      .goal-setting-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-color);
      }
      
      .goal-setting-header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 18px;
        font-weight: 600;
      }
      
      .goal-setting-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      
      .goal-setting-close:hover {
        background: var(--bg-secondary);
        color: var(--text-primary);
      }
      
      .goal-setting-content {
        padding: 20px;
      }
      
      .goal-item {
        margin-bottom: 24px;
        padding: 16px;
        background: var(--bg-secondary);
        border-radius: 8px;
      }
      
      .goal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      
      .goal-info h4 {
        margin: 0 0 4px 0;
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 600;
      }
      
      .goal-info p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
      }
      
      .goal-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .goal-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      
      .goal-toggle label {
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 14px;
      }
      
      .goal-input-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .goal-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 16px;
        background: var(--bg-primary);
        color: var(--text-primary);
      }
      
      .goal-input:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      }
      
      .goal-unit {
        font-size: 16px;
        color: var(--text-secondary);
        font-weight: 500;
      }
      
      .goal-setting-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color);
      }
      
      .goal-setting-cancel,
      .goal-setting-save {
        padding: 10px 20px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .goal-setting-cancel {
        background: var(--bg-primary);
        color: var(--text-primary);
      }
      
      .goal-setting-cancel:hover {
        background: var(--bg-secondary);
      }
      
      .goal-setting-save {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
      }
      
      .goal-setting-save:hover {
        background: var(--accent-primary-hover);
      }
      
      /* 响应式设计 */
      @media (max-width: 576px) {
        .goal-setting-dialog {
          width: 95%;
          margin: 20px;
        }
        
        .goal-header {
          flex-direction: column;
          gap: 12px;
        }
        
        .goal-toggle {
          align-self: flex-start;
        }
      }
    `;
    
    // 添加样式到head
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
  
  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 关闭按钮
    this.container.querySelector('.goal-setting-close').addEventListener('click', () => {
      this.close();
    });
    
    // 遮罩层点击
    this.container.querySelector('.goal-setting-overlay').addEventListener('click', () => {
      this.close();
    });
    
    // 取消按钮
    this.container.querySelector('.goal-setting-cancel').addEventListener('click', () => {
      this.close();
    });
    
    // 表单提交
    this.container.querySelector('#goalSettingForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  
  /**
   * 加载目标数据
   */
  async loadGoalData() {
    const goals = this.goalManager.getAllGoals();
    
    // 每日目标
    if (goals.daily) {
      this.container.querySelector('#dailyActive').checked = goals.daily.active;
      this.container.querySelector('#dailyTarget').value = goals.daily.target;
    }
    
    // 每周目标
    if (goals.weekly) {
      this.container.querySelector('#weeklyActive').checked = goals.weekly.active;
      this.container.querySelector('#weeklyTarget').value = goals.weekly.target;
    }
    
    // 每月目标
    if (goals.monthly) {
      this.container.querySelector('#monthlyActive').checked = goals.monthly.active;
      this.container.querySelector('#monthlyTarget').value = goals.monthly.target;
    }
  }
  
  /**
   * 处理表单提交
   */
  async handleSubmit() {
    const formData = {
      daily: {
        type: 'daily',
        target: parseInt(this.container.querySelector('#dailyTarget').value),
        unit: 'words',
        active: this.container.querySelector('#dailyActive').checked
      },
      weekly: {
        type: 'weekly',
        target: parseInt(this.container.querySelector('#weeklyTarget').value),
        unit: 'words',
        active: this.container.querySelector('#weeklyActive').checked
      },
      monthly: {
        type: 'monthly',
        target: parseInt(this.container.querySelector('#monthlyTarget').value),
        unit: 'words',
        active: this.container.querySelector('#monthlyActive').checked
      }
    };
    
    // 保存目标
    try {
      for (const [type, goal] of Object.entries(formData)) {
        await this.goalManager.setGoal(goal);
      }
      
      // 调用回调函数
      this.props.onSave(formData);
      
      // 显示保存成功提示
      this.showNotification('目标保存成功！', 'success');
      
      // 关闭对话框
      this.close();
    } catch (error) {
      console.error('保存目标失败:', error);
      this.showNotification('保存失败，请重试。', 'error');
    }
  }
  
  /**
   * 显示通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型（success/error/info/warning）
   */
  showNotification(message, type = 'info') {
    // 简单的通知实现
    const notification = document.createElement('div');
    notification.className = `goal-notification goal-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 2000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-20px);
    `;
    
    // 设置不同类型的背景色
    const bgColors = {
      success: '#48bb78',
      error: '#f56565',
      info: '#667eea',
      warning: '#ed8936'
    };
    notification.style.backgroundColor = bgColors[type];
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 100);
    
    // 3秒后隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  
  /**
   * 打开目标设置对话框
   */
  open() {
    this.isOpen = true;
    this.container.classList.add('active');
    this.loadGoalData();
  }
  
  /**
   * 关闭目标设置对话框
   */
  close() {
    this.isOpen = false;
    this.container.classList.remove('active');
  }
  
  /**
   * 获取组件元素
   * @returns {HTMLElement} - 组件元素
   */
  getElement() {
    return this.container;
  }
}

// 兼容传统脚本加载（popup.html 使用）
if (typeof window !== 'undefined') {
  window.GoalSetting = GoalSetting;
}