/**
 * 组件注册器，用于管理所有组件的注册和创建
 * 采用单例模式，确保整个应用只有一个组件注册器实例
 */
class ComponentRegistry {
  constructor() {
    if (ComponentRegistry.instance) {
      return ComponentRegistry.instance;
    }
    
    this.components = new Map();
    ComponentRegistry.instance = this;
  }

  /**
   * 注册组件
   * @param {string} name - 组件名称
   * @param {Function} componentClass - 组件类
   */
  register(name, componentClass) {
    if (typeof name !== 'string') {
      throw new Error('Component name must be a string');
    }
    if (typeof componentClass !== 'function') {
      throw new Error('Component class must be a constructor function');
    }
    
    this.components.set(name, componentClass);
    
    // 更新依赖关系图
    this.updateDependencyGraph();
  }

  /**
   * 注册多个组件
   * @param {Object} components - 组件对象，键为组件名称，值为组件类
   */
  registerAll(components) {
    if (typeof components !== 'object' || components === null) {
      throw new Error('Components must be an object');
    }
    
    for (const [name, componentClass] of Object.entries(components)) {
      this.register(name, componentClass);
    }
  }

  /**
   * 获取组件类
   * @param {string} name - 组件名称
   * @returns {Function|null} - 组件类，如果不存在则返回null
   */
  get(name) {
    return this.components.get(name) || null;
  }

  /**
   * 创建组件实例
   * @param {string} name - 组件名称
   * @param {Object} props - 组件属性
   * @returns {BaseComponent} - 组件实例
   */
  create(name, props) {
    const ComponentClass = this.get(name);
    if (!ComponentClass) {
      throw new Error(`Component "${name}" is not registered`);
    }
    
    return new ComponentClass(props);
  }

  /**
   * 获取所有注册的组件名称
   * @returns {Array} - 组件名称数组
   */
  getAllComponentNames() {
    return Array.from(this.components.keys());
  }

  /**
   * 获取所有注册的组件
   * @returns {Map} - 组件映射，键为组件名称，值为组件类
   */
  getAllComponents() {
    return new Map(this.components);
  }

  /**
   * 移除组件注册
   * @param {string} name - 组件名称
   */
  unregister(name) {
    this.components.delete(name);
    
    // 更新依赖关系图
    this.updateDependencyGraph();
  }

  /**
   * 清空所有组件注册
   */
  clear() {
    this.components.clear();
    
    // 更新依赖关系图
    this.updateDependencyGraph();
  }

  /**
   * 更新依赖关系图
   */
  updateDependencyGraph() {
    // 这里可以实现依赖关系图的更新逻辑
    // 例如，将组件注册信息写入DEPENDENCY_GRAPH.md文件
    console.log('Component registry updated, updating dependency graph...');
    
    // 实际项目中可以使用fs模块将依赖关系写入文件
    // 这里只是简单的日志记录
  }
}

// 创建单例实例
const componentRegistry = new ComponentRegistry();

// 导出组件注册器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = componentRegistry;
} else if (typeof window !== 'undefined') {
  window.componentRegistry = componentRegistry;
}