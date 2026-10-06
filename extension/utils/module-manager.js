/**
 * 单词翻译助手 - 模块管理模块
 * 负责统一管理所有模块的初始化流程
 */

/**
 * 模块管理器类
 * 用于统一管理所有模块的初始化流程
 */
class ModuleManager {
  constructor() {
    this.modules = new Map(); // 存储所有模块
    this.initializedModules = new Set(); // 已初始化的模块
    this.initPromises = new Map(); // 模块初始化Promise
    this.moduleDependencies = new Map(); // 模块依赖关系
    this.isInitialized = false; // 是否已完成所有模块初始化
  }
  
  /**
   * 注册模块
   * @param {string} name - 模块名称
   * @param {Object} module - 模块对象
   * @param {Array<string>} dependencies - 依赖的模块名称列表
   */
  registerModule(name, module, dependencies = []) {
    if (this.modules.has(name)) {
      console.warn(`模块 ${name} 已存在，将被覆盖`);
    }
    
    this.modules.set(name, module);
    this.moduleDependencies.set(name, dependencies);
    
    // 如果模块存在且有init方法，立即创建初始化Promise
    if (module && typeof module.init === 'function') {
      this.initPromises.set(name, null);
    }
  }
  
  /**
   * 获取模块
   * @param {string} name - 模块名称
   * @returns {Object|null} 模块对象或null
   */
  getModule(name) {
    return this.modules.get(name) || null;
  }
  
  /**
   * 初始化所有模块
   * @returns {Promise<Array>} 所有模块初始化结果的Promise
   */
  async initAll() {
    if (this.isInitialized) {
      return Promise.resolve('所有模块已初始化');
    }
    
    console.log('开始初始化所有模块...');
    const startTime = Date.now();
    
    try {
      // 按照依赖关系排序模块
      const sortedModules = this._topologicalSort();
      
      // 依次初始化每个模块
      for (const moduleName of sortedModules) {
        await this.initModule(moduleName);
      }
      
      this.isInitialized = true;
      const endTime = Date.now();
      console.log(`所有模块初始化完成，耗时 ${endTime - startTime}ms`);
      
      // 触发全局初始化完成事件
      this._dispatchInitCompleteEvent();
      
      return Promise.resolve(`所有模块初始化完成，共初始化 ${this.initializedModules.size} 个模块`);
    } catch (error) {
      console.error('模块初始化失败:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * 初始化单个模块
   * @param {string} name - 模块名称
   * @returns {Promise<any>} 模块初始化结果的Promise
   */
  async initModule(name) {
    if (this.initializedModules.has(name)) {
      return Promise.resolve(`${name} 模块已初始化`);
    }
    
    const module = this.modules.get(name);
    // 检查模块是否存在
    if (!module) {
      console.debug(`模块 ${name} 为 null 或 undefined，跳过初始化`);
      return Promise.resolve(`${name} 模块不存在`);
    }
    
    // 检查模块是否有init方法
    if (typeof module.init !== 'function') {
      console.debug(`模块 ${name} 没有init方法，跳过初始化`);
      return Promise.resolve(`${name} 模块没有init方法`);
    }
    
    // 检查并初始化依赖模块
    const dependencies = this.moduleDependencies.get(name) || [];
    for (const depName of dependencies) {
      await this.initModule(depName);
    }
    
    console.log(`开始初始化模块: ${name}`);
    const startTime = Date.now();
    
    try {
      // 执行模块初始化
      const result = await module.init();
      
      this.initializedModules.add(name);
      const endTime = Date.now();
      console.log(`模块 ${name} 初始化完成，耗时 ${endTime - startTime}ms`);
      
      return Promise.resolve(result);
    } catch (error) {
      console.error(`模块 ${name} 初始化失败:`, error);
      return Promise.reject(error);
    }
  }
  
  /**
   * 拓扑排序，确定模块初始化顺序
   * @returns {Array<string>} 排序后的模块名称列表
   * @private
   */
  _topologicalSort() {
    const visited = new Set();
    const temp = new Set();
    const result = [];
    
    // 深度优先遍历
    const dfs = (node) => {
      if (temp.has(node)) {
        throw new Error(`模块依赖存在循环: ${node}`);
      }
      
      if (!visited.has(node)) {
        temp.add(node);
        
        const dependencies = this.moduleDependencies.get(node) || [];
        for (const dep of dependencies) {
          dfs(dep);
        }
        
        temp.delete(node);
        visited.add(node);
        result.push(node);
      }
    };
    
    // 遍历所有模块
    for (const moduleName of this.modules.keys()) {
      if (!visited.has(moduleName)) {
        dfs(moduleName);
      }
    }
    
    return result;
  }
  
  /**
   * 触发初始化完成事件
   * @private
   */
  _dispatchInitCompleteEvent() {
    // 只在有 document 的环境中分发事件（popup/dashboard页面）
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('modulesInitialized', {
        detail: {
          initializedModules: Array.from(this.initializedModules),
          totalModules: this.modules.size
        }
      });
      document.dispatchEvent(event);
    }
  }
  
  /**
   * 获取模块初始化状态
   * @returns {Object} 模块初始化状态
   */
  getInitStatus() {
    return {
      isInitialized: this.isInitialized,
      initializedModules: Array.from(this.initializedModules),
      totalModules: this.modules.size,
      uninitializedModules: Array.from(this.modules.keys()).filter(name => !this.initializedModules.has(name))
    };
  }
  
  /**
   * 重置模块管理器
   */
  reset() {
    this.initializedModules.clear();
    this.initPromises.clear();
    this.isInitialized = false;
  }
}

// 创建模块管理器实例
const moduleManager = new ModuleManager();

// 导出到全局作用域
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { ModuleManager, moduleManager };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.ModuleManager = ModuleManager;
  window.moduleManager = moduleManager;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.ModuleManager = ModuleManager;
  self.moduleManager = moduleManager;
}