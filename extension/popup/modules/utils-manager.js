/**
 * 全局工具函数管理器
 * 提供节流、防抖、AI配置等全局工具函数
 */

// AI 配置预设
window.AI_CONFIGS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  },
  custom: {
    apiUrl: '',
    model: ''
  }
};

/**
 * 节流函数 - 限制函数在一定时间内只能执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
window.throttle = function(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 防抖函数 - 延迟执行函数，直到停止触发一段时间后
 * @param {Function} func - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
window.debounce = function(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * 让出主线程，允许浏览器处理其他任务
 * @returns {Promise} Promise对象
 */
window.yieldToMain = function() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
};
