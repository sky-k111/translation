/**
 * Background定时任务组件
 * 5.3.4：迁移Background定时任务功能
 * 封装定时任务的管理功能，包括任务的注册、取消和执行
 */
const BackgroundComponent = require('../utils/BackgroundComponent.js');

class BackgroundScheduler extends BackgroundComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      defaultInterval: 60000,      // 默认时间间隔：60秒
      maxTaskCount: 100,           // 最大任务数量
      maxRetryCount: 3,            // 最大重试次数
      retryDelay: 1000             // 重试延迟：1秒
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      tasks: {},                   // 任务映射表
      taskIdCounter: 0,            // 任务ID计数器
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
    this.state.isInitialized = true;
  }

  /**
   * 生成唯一的任务ID
   * @returns {string} - 任务ID
   */
  generateTaskId() {
    return `task_${this.state.taskIdCounter++}_${Date.now()}`;
  }

  /**
   * 注册一个定时任务
   * @param {Object} taskOptions - 任务选项
   * @param {Function} taskOptions.callback - 任务回调函数
   * @param {number} taskOptions.interval - 时间间隔（毫秒）
   * @param {boolean} taskOptions.repeat - 是否重复执行
   * @param {number} taskOptions.delay - 延迟执行时间（毫秒）
   * @param {string} taskOptions.name - 任务名称
   * @param {Object} taskOptions.context - 回调函数上下文
   * @returns {string|null} - 任务ID，注册失败返回null
   */
  scheduleTask(taskOptions) {
    if (!taskOptions || typeof taskOptions.callback !== 'function') {
      console.error('任务回调函数必须提供');
      return null;
    }
    
    // 检查任务数量限制
    if (Object.keys(this.state.tasks).length >= this.props.maxTaskCount) {
      console.error('任务数量已达上限');
      return null;
    }
    
    const taskId = this.generateTaskId();
    const now = Date.now();
    
    // 任务配置
    const task = {
      id: taskId,
      name: taskOptions.name || `Task_${taskId}`,
      callback: taskOptions.callback,
      interval: taskOptions.interval || this.props.defaultInterval,
      repeat: typeof taskOptions.repeat === 'boolean' ? taskOptions.repeat : true,
      delay: taskOptions.delay || 0,
      context: taskOptions.context || null,
      startTime: now,
      nextRunTime: now + taskOptions.delay,
      lastRunTime: null,
      lastResult: null,
      lastError: null,
      retryCount: 0,
      status: 'scheduled', // scheduled, running, completed, failed, canceled
      timerId: null
    };
    
    // 保存任务
    this.state.tasks[taskId] = task;
    
    // 启动任务
    this.startTask(task);
    
    return taskId;
  }

  /**
   * 启动一个任务
   * @param {Object} task - 任务对象
   */
  startTask(task) {
    // 计算延迟时间
    const delay = Math.max(0, task.nextRunTime - Date.now());
    
    // 设置定时器
    task.timerId = setTimeout(() => {
      this.executeTask(task.id);
    }, delay);
    
    task.status = 'scheduled';
  }

  /**
   * 执行一个任务
   * @param {string} taskId - 任务ID
   */
  async executeTask(taskId) {
    const task = this.state.tasks[taskId];
    if (!task || task.status === 'canceled') {
      return;
    }
    
    task.status = 'running';
    task.lastRunTime = Date.now();
    task.lastError = null;
    
    try {
      // 执行任务回调
      const result = await task.callback.call(task.context, task);
      task.lastResult = result;
      task.status = 'completed';
      task.retryCount = 0;
      
      // 如果是重复任务，重新安排执行
      if (task.repeat) {
        task.nextRunTime = Date.now() + task.interval;
        this.startTask(task);
      } else {
        // 一次性任务，执行后完成
        task.status = 'completed';
      }
    } catch (error) {
      console.error(`任务执行失败 (${task.name}):`, error);
      
      task.lastError = error;
      task.status = 'failed';
      task.retryCount++;
      
      // 处理重试逻辑
      if (task.retryCount <= this.props.maxRetryCount) {
        console.log(`任务重试 (${task.name}): ${task.retryCount}/${this.props.maxRetryCount}`);
        task.nextRunTime = Date.now() + this.props.retryDelay;
        this.startTask(task);
      } else {
        console.error(`任务重试次数已达上限 (${task.name})`);
        task.status = 'failed';
      }
    }
  }

  /**
   * 取消一个任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} - 是否取消成功
   */
  cancelTask(taskId) {
    const task = this.state.tasks[taskId];
    if (!task) {
      return false;
    }
    
    // 清除定时器
    if (task.timerId) {
      clearTimeout(task.timerId);
      task.timerId = null;
    }
    
    // 更新任务状态
    task.status = 'canceled';
    
    return true;
  }

  /**
   * 取消所有任务
   * @returns {number} - 取消的任务数量
   */
  cancelAllTasks() {
    const taskIds = Object.keys(this.state.tasks);
    let canceledCount = 0;
    
    taskIds.forEach(taskId => {
      if (this.cancelTask(taskId)) {
        canceledCount++;
      }
    });
    
    return canceledCount;
  }

  /**
   * 暂停一个任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} - 是否暂停成功
   */
  pauseTask(taskId) {
    const task = this.state.tasks[taskId];
    if (!task || task.status !== 'scheduled') {
      return false;
    }
    
    // 清除定时器
    if (task.timerId) {
      clearTimeout(task.timerId);
      task.timerId = null;
    }
    
    // 更新任务状态
    task.status = 'paused';
    
    return true;
  }

  /**
   * 恢复一个任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} - 是否恢复成功
   */
  resumeTask(taskId) {
    const task = this.state.tasks[taskId];
    if (!task || task.status !== 'paused') {
      return false;
    }
    
    // 重新计算下次执行时间
    task.nextRunTime = Date.now();
    
    // 启动任务
    this.startTask(task);
    
    return true;
  }

  /**
   * 获取任务信息
   * @param {string} taskId - 任务ID
   * @returns {Object|null} - 任务对象
   */
  getTask(taskId) {
    return this.state.tasks[taskId] || null;
  }

  /**
   * 获取所有任务
   * @returns {Array} - 任务数组
   */
  getAllTasks() {
    return Object.values(this.state.tasks);
  }

  /**
   * 获取任务数量
   * @returns {number} - 任务数量
   */
  getTaskCount() {
    return Object.keys(this.state.tasks).length;
  }

  /**
   * 根据状态获取任务
   * @param {string} status - 任务状态
   * @returns {Array} - 任务数组
   */
  getTasksByStatus(status) {
    return Object.values(this.state.tasks).filter(task => task.status === status);
  }

  /**
   * 重新安排一个任务
   * @param {string} taskId - 任务ID
   * @param {number} newInterval - 新的时间间隔（毫秒）
   * @returns {boolean} - 是否重新安排成功
   */
  rescheduleTask(taskId, newInterval) {
    const task = this.state.tasks[taskId];
    if (!task) {
      return false;
    }
    
    // 保存原状态
    const wasScheduled = task.status === 'scheduled';
    
    // 取消当前任务
    this.cancelTask(taskId);
    
    // 更新任务配置
    task.interval = newInterval || this.props.defaultInterval;
    task.nextRunTime = Date.now() + task.interval;
    
    // 重新启动任务
    if (wasScheduled) {
      this.startTask(task);
    }
    
    return true;
  }

  /**
   * 立即执行一个任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} - 是否立即执行成功
   */
  runTaskNow(taskId) {
    const task = this.state.tasks[taskId];
    if (!task || task.status === 'canceled') {
      return false;
    }
    
    // 取消当前的定时器
    if (task.timerId) {
      clearTimeout(task.timerId);
      task.timerId = null;
    }
    
    // 立即执行任务
    this.executeTask(taskId);
    
    return true;
  }

  /**
   * 注册一个一次性延迟任务
   * @param {Function} callback - 任务回调函数
   * @param {number} delay - 延迟时间（毫秒）
   * @param {string} name - 任务名称
   * @param {Object} context - 回调函数上下文
   * @returns {string|null} - 任务ID，注册失败返回null
   */
  setTimeout(callback, delay, name = null, context = null) {
    return this.scheduleTask({
      callback,
      interval: 0,
      repeat: false,
      delay,
      name,
      context
    });
  }

  /**
   * 注册一个重复执行的任务
   * @param {Function} callback - 任务回调函数
   * @param {number} interval - 时间间隔（毫秒）
   * @param {string} name - 任务名称
   * @param {Object} context - 回调函数上下文
   * @returns {string|null} - 任务ID，注册失败返回null
   */
  setInterval(callback, interval, name = null, context = null) {
    return this.scheduleTask({
      callback,
      interval,
      repeat: true,
      delay: 0,
      name,
      context
    });
  }

  /**
   * 清除一个定时器任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} - 是否清除成功
   */
  clearTimeout(taskId) {
    return this.cancelTask(taskId);
  }

  /**
   * 清除一个间隔任务
   * @param {string} taskId - 任务ID
   * @returns {boolean} - 是否清除成功
   */
  clearInterval(taskId) {
    return this.cancelTask(taskId);
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
    // 取消所有任务
    this.cancelAllTasks();
    
    super.destroy();
  }
}

// 导出组件
module.exports = BackgroundScheduler;