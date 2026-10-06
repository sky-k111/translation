/**
 * 学习目标管理模块
 * 负责学习目标的存储、管理和进度计算
 */
class GoalManager {
  /**
   * 构造函数
   */
  constructor() {
    this.goals = {};
    this.storageKey = 'learning_goals';
    this.defaultGoals = {
      daily: {
        type: 'daily',
        target: 20,
        unit: 'words',
        active: true
      },
      weekly: {
        type: 'weekly',
        target: 140,
        unit: 'words',
        active: true
      },
      monthly: {
        type: 'monthly',
        target: 600,
        unit: 'words',
        active: true
      }
    };
    
    this.init();
  }
  
  /**
   * 初始化目标管理器
   */
  async init() {
    await this.loadGoals();
  }
  
  /**
   * 从存储中加载目标
   */
  async loadGoals() {
    try {
      const savedGoals = await this.getStorageData(this.storageKey);
      this.goals = savedGoals || this.defaultGoals;
    } catch (error) {
      console.error('加载学习目标失败:', error);
      this.goals = this.defaultGoals;
    }
  }
  
  /**
   * 保存目标到存储
   */
  async saveGoals() {
    try {
      await this.saveStorageData(this.storageKey, this.goals);
    } catch (error) {
      console.error('保存学习目标失败:', error);
    }
  }
  
  /**
   * 获取指定类型的目标
   * @param {string} type - 目标类型（daily/weekly/monthly）
   * @returns {Object} - 目标对象
   */
  getGoal(type) {
    return this.goals[type] || this.defaultGoals[type];
  }
  
  /**
   * 设置学习目标
   * @param {Object} goal - 目标对象
   */
  async setGoal(goal) {
    if (!goal || !goal.type) {
      throw new Error('目标类型不能为空');
    }
    
    this.goals[goal.type] = {
      ...this.goals[goal.type],
      ...goal
    };
    
    await this.saveGoals();
  }
  
  /**
   * 获取所有目标
   * @returns {Object} - 所有目标对象
   */
  getAllGoals() {
    return this.goals;
  }
  
  /**
   * 计算目标进度
   * @param {string} type - 目标类型
   * @param {number} currentValue - 当前值
   * @returns {Object} - 进度信息
   */
  calculateProgress(type, currentValue) {
    const goal = this.getGoal(type);
    const progress = {
      type: goal.type,
      target: goal.target,
      current: currentValue,
      percentage: Math.min(100, Math.round((currentValue / goal.target) * 100)),
      completed: currentValue >= goal.target
    };
    
    return progress;
  }
  
  /**
   * 计算所有目标的进度
   * @param {Object} currentValues - 当前值对象
   * @returns {Object} - 所有目标的进度信息
   */
  calculateAllProgress(currentValues) {
    const progress = {};
    
    Object.keys(this.goals).forEach(type => {
      const currentValue = currentValues[type] || 0;
      progress[type] = this.calculateProgress(type, currentValue);
    });
    
    return progress;
  }
  
  /**
   * 检查目标是否达成
   * @param {string} type - 目标类型
   * @param {number} currentValue - 当前值
   * @returns {boolean} - 是否已达成
   */
  isGoalAchieved(type, currentValue) {
    const goal = this.getGoal(type);
    return currentValue >= goal.target;
  }
  
  /**
   * 获取目标提醒
   * @param {Object} currentValues - 当前值对象
   * @returns {Array} - 提醒列表
   */
  getGoalReminders(currentValues) {
    const reminders = [];
    
    Object.keys(this.goals).forEach(type => {
      const goal = this.getGoal(type);
      const currentValue = currentValues[type] || 0;
      
      if (goal.active) {
        if (currentValue >= goal.target) {
          reminders.push({
            type: 'success',
            message: `${this.getTypeLabel(type)}目标已达成！`,
            goal: goal,
            progress: this.calculateProgress(type, currentValue)
          });
        } else if (currentValue >= goal.target * 0.8) {
          reminders.push({
            type: 'info',
            message: `${this.getTypeLabel(type)}目标即将达成，继续加油！`,
            goal: goal,
            progress: this.calculateProgress(type, currentValue)
          });
        } else if (currentValue < goal.target * 0.3) {
          reminders.push({
            type: 'warning',
            message: `${this.getTypeLabel(type)}目标进度落后，需要努力！`,
            goal: goal,
            progress: this.calculateProgress(type, currentValue)
          });
        }
      }
    });
    
    return reminders;
  }
  
  /**
   * 获取目标类型的显示标签
   * @param {string} type - 目标类型
   * @returns {string} - 显示标签
   */
  getTypeLabel(type) {
    const labels = {
      daily: '每日',
      weekly: '每周',
      monthly: '每月'
    };
    return labels[type] || type;
  }
  
  /**
   * 从存储获取数据
   * @param {string} key - 存储键名
   * @returns {Promise<any>} - 存储的数据
   */
  getStorageData(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key]);
        }
      });
    });
  }
  
  /**
   * 保存数据到存储
   * @param {string} key - 存储键名
   * @param {any} data - 要存储的数据
   * @returns {Promise<void>} - 保存结果
   */
  saveStorageData(key, data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

// 兼容传统脚本加载（popup.html 使用）
if (typeof window !== 'undefined') {
  window.GoalManager = GoalManager;
}