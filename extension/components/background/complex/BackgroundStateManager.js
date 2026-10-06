/**
 * Background扩展状态管理组件
 * 5.3.5：迁移Background扩展状态管理功能
 * 封装扩展状态的管理功能，包括状态初始化、更新、保存和监听
 */
const BackgroundComponent = require('../utils/BackgroundComponent.js');

class BackgroundStateManager extends BackgroundComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      initialState: {},           // 初始状态
      autoSave: true,            // 是否自动保存状态
      saveDebounceTime: 1000      // 保存防抖时间：1秒
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      currentState: { ...this.props.initialState }, // 当前状态
      previousState: { ...this.props.initialState }, // 上一个状态
      stateListeners: {},         // 状态监听器映射表
      saveDebounceTimer: null,    // 保存防抖定时器
      isInitialized: false
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.loadState();
    this.state.isInitialized = true;
  }

  /**
   * 从存储加载状态
   */
  async loadState() {
    try {
      // 从Chrome存储加载状态
      const storageData = await this.getStorageData(['extensionState']);
      if (storageData.extensionState) {
        this.state.currentState = { ...this.props.initialState, ...storageData.extensionState };
        this.state.previousState = { ...this.state.currentState };
      }
      
      console.log('扩展状态加载完成:', this.state.currentState);
    } catch (error) {
      console.error('扩展状态加载失败:', error);
    }
  }

  /**
   * 保存状态到存储
   * @param {Object} state - 要保存的状态，默认为当前状态
   */
  async saveState(state = null) {
    try {
      const stateToSave = state || this.state.currentState;
      await this.setStorageData({ extensionState: stateToSave });
      console.log('扩展状态保存完成:', stateToSave);
    } catch (error) {
      console.error('扩展状态保存失败:', error);
    }
  }

  /**
   * 防抖保存状态
   */
  debouncedSaveState() {
    if (this.state.saveDebounceTimer) {
      clearTimeout(this.state.saveDebounceTimer);
    }
    
    this.state.saveDebounceTimer = setTimeout(() => {
      this.saveState();
      this.state.saveDebounceTimer = null;
    }, this.props.saveDebounceTime);
  }

  /**
   * 更新状态
   * @param {Object} newState - 新的状态
   * @param {boolean} immediateSave - 是否立即保存
   */
  updateState(newState, immediateSave = false) {
    if (typeof newState !== 'object' || newState === null) {
      console.error('状态必须是对象');
      return;
    }
    
    // 保存上一个状态
    this.state.previousState = { ...this.state.currentState };
    
    // 更新当前状态
    this.state.currentState = { ...this.state.currentState, ...newState };
    
    // 通知状态变化
    this.notifyStateChange(newState);
    
    // 保存状态
    if (this.props.autoSave) {
      if (immediateSave) {
        this.saveState();
      } else {
        this.debouncedSaveState();
      }
    }
  }

  /**
   * 更新单个状态值
   * @param {string} key - 状态键
   * @param {*} value - 状态值
   * @param {boolean} immediateSave - 是否立即保存
   */
  setState(key, value, immediateSave = false) {
    if (typeof key !== 'string') {
      console.error('状态键必须是字符串');
      return;
    }
    
    const newState = { [key]: value };
    this.updateState(newState, immediateSave);
  }

  /**
   * 获取当前状态
   * @returns {Object} - 当前状态
   */
  getState() {
    return { ...this.state.currentState };
  }

  /**
   * 获取单个状态值
   * @param {string} key - 状态键
   * @param {*} defaultValue - 默认值
   * @returns {*} - 状态值
   */
  getStateValue(key, defaultValue = undefined) {
    return this.state.currentState[key] !== undefined ? this.state.currentState[key] : defaultValue;
  }

  /**
   * 获取上一个状态
   * @returns {Object} - 上一个状态
   */
  getPreviousState() {
    return { ...this.state.previousState };
  }

  /**
   * 检查状态是否发生变化
   * @returns {boolean} - 状态是否发生变化
   */
  hasStateChanged() {
    return JSON.stringify(this.state.currentState) !== JSON.stringify(this.state.previousState);
  }

  /**
   * 通知状态变化
   * @param {Object} changedState - 变化的状态
   */
  notifyStateChange(changedState) {
    // 遍历所有状态监听器
    Object.keys(this.state.stateListeners).forEach(key => {
      const listeners = this.state.stateListeners[key];
      listeners.forEach(listener => {
        try {
          // 检查监听器是否监听了变化的状态键
          if (key === '*' || Object.keys(changedState).includes(key)) {
            listener(changedState, this.state.currentState, this.state.previousState);
          }
        } catch (error) {
          console.error(`状态监听器执行失败 (${key}):`, error);
        }
      });
    });
  }

  /**
   * 注册状态监听器
   * @param {string} key - 状态键，* 表示监听所有状态变化
   * @param {Function} listener - 监听器函数
   */
  addStateListener(key, listener) {
    if (typeof key !== 'string' || typeof listener !== 'function') {
      console.error('状态键必须是字符串，监听器必须是函数');
      return;
    }
    
    if (!this.state.stateListeners[key]) {
      this.state.stateListeners[key] = [];
    }
    
    this.state.stateListeners[key].push(listener);
  }

  /**
   * 移除状态监听器
   * @param {string} key - 状态键
   * @param {Function} listener - 监听器函数
   */
  removeStateListener(key, listener) {
    if (this.state.stateListeners[key]) {
      this.state.stateListeners[key] = this.state.stateListeners[key].filter(l => l !== listener);
      
      // 如果该键下没有监听器了，删除该键
      if (this.state.stateListeners[key].length === 0) {
        delete this.state.stateListeners[key];
      }
    }
  }

  /**
   * 移除所有状态监听器
   * @param {string} key - 状态键，不传则移除所有监听器
   */
  removeAllStateListeners(key = null) {
    if (key) {
      // 移除特定键的所有监听器
      if (this.state.stateListeners[key]) {
        delete this.state.stateListeners[key];
      }
    } else {
      // 移除所有监听器
      this.state.stateListeners = {};
    }
  }

  /**
   * 重置状态到初始值
   * @param {boolean} immediateSave - 是否立即保存
   */
  resetState(immediateSave = false) {
    this.updateState(this.props.initialState, immediateSave);
  }

  /**
   * 恢复状态
   * @param {Object} state - 要恢复的状态
   * @param {boolean} immediateSave - 是否立即保存
   */
  restoreState(state, immediateSave = false) {
    if (typeof state === 'object' && state !== null) {
      this.updateState(state, immediateSave);
    }
  }

  /**
   * 清除状态
   * @param {boolean} immediateSave - 是否立即保存
   */
  clearState(immediateSave = false) {
    this.updateState({}, immediateSave);
  }

  /**
   * 检查扩展是否启用
   * @returns {boolean} - 扩展是否启用
   */
  isExtensionEnabled() {
    return this.getStateValue('isEnabled', true);
  }

  /**
   * 设置扩展启用状态
   * @param {boolean} enabled - 是否启用
   * @param {boolean} immediateSave - 是否立即保存
   */
  setExtensionEnabled(enabled, immediateSave = false) {
    this.setState('isEnabled', enabled, immediateSave);
  }

  /**
   * 检查翻译服务是否可用
   * @returns {boolean} - 翻译服务是否可用
   */
  isTranslationServiceAvailable() {
    return this.getStateValue('translationServiceAvailable', true);
  }

  /**
   * 设置翻译服务可用性
   * @param {boolean} available - 是否可用
   * @param {boolean} immediateSave - 是否立即保存
   */
  setTranslationServiceAvailable(available, immediateSave = false) {
    this.setState('translationServiceAvailable', available, immediateSave);
  }

  /**
   * 获取服务状态
   * @returns {Object} - 服务状态
   */
  getServiceStatus() {
    return {
      translationServiceAvailable: this.isTranslationServiceAvailable(),
      aiServiceAvailable: this.getStateValue('aiServiceAvailable', true),
      youdaoServiceAvailable: this.getStateValue('youdaoServiceAvailable', true)
    };
  }

  /**
   * 设置服务状态
   * @param {Object} status - 服务状态
   * @param {boolean} immediateSave - 是否立即保存
   */
  setServiceStatus(status, immediateSave = false) {
    this.updateState({
      translationServiceAvailable: status.translationServiceAvailable,
      aiServiceAvailable: status.aiServiceAvailable,
      youdaoServiceAvailable: status.youdaoServiceAvailable
    }, immediateSave);
  }

  /**
   * 获取扩展运行时信息
   * @returns {Object} - 扩展运行时信息
   */
  getRuntimeInfo() {
    return {
      lastActiveTime: this.getStateValue('lastActiveTime', Date.now()),
      totalTranslationCount: this.getStateValue('totalTranslationCount', 0),
      activeTabCount: this.getStateValue('activeTabCount', 0),
      memoryUsage: this.getStateValue('memoryUsage', 0)
    };
  }

  /**
   * 更新扩展运行时信息
   * @param {Object} info - 运行时信息
   * @param {boolean} immediateSave - 是否立即保存
   */
  updateRuntimeInfo(info, immediateSave = false) {
    this.updateState({
      lastActiveTime: info.lastActiveTime || Date.now(),
      totalTranslationCount: info.totalTranslationCount,
      activeTabCount: info.activeTabCount,
      memoryUsage: info.memoryUsage
    }, immediateSave);
  }

  /**
   * 增加翻译计数
   * @param {boolean} immediateSave - 是否立即保存
   */
  incrementTranslationCount(immediateSave = false) {
    const currentCount = this.getStateValue('totalTranslationCount', 0);
    this.setState('totalTranslationCount', currentCount + 1, immediateSave);
  }

  /**
   * 更新最后活动时间
   * @param {boolean} immediateSave - 是否立即保存
   */
  updateLastActiveTime(immediateSave = false) {
    this.setState('lastActiveTime', Date.now(), immediateSave);
  }

  /**
   * 检查组件是否已初始化
   * @returns {boolean} - 是否已初始化
   */
  isInitialized() {
    return this.state.isInitialized;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清除防抖定时器
    if (this.state.saveDebounceTimer) {
      clearTimeout(this.state.saveDebounceTimer);
      this.state.saveDebounceTimer = null;
    }
    
    // 移除所有状态监听器
    this.removeAllStateListeners();
    
    super.destroy();
  }
}

// 导出组件
module.exports = BackgroundStateManager;