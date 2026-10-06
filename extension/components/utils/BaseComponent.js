/**
 * 组件基类，所有组件都继承自该类
 * 提供组件的基础功能，包括props管理、样式注册、事件处理等
 */
class BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props) {
    this.props = {
      id: `component-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      className: '',
      style: {},
      ...props
    };
    this.state = {};
    this.element = null;
    this.events = [];
  }

  /**
   * 初始化组件
   */
  init() {
    // 子类可以重写此方法来初始化组件
    this.registerStyle();
  }

  /**
   * 注册组件样式
   */
  registerStyle() {
    // 子类可以重写此方法来注册组件样式
  }

  /**
   * 设置组件状态
   * @param {Object} newState - 新的组件状态
   * @param {Function} callback - 状态更新后的回调函数
   */
  setState(newState, callback) {
    // 检查状态是否真的发生了变化
    const hasChanged = Object.keys(newState).some(key => this.state[key] !== newState[key]);
    if (hasChanged) {
      this.state = { ...this.state, ...newState };
      this.update();
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  }

  /**
   * 绑定事件
   * @param {HTMLElement} element - 要绑定事件的DOM元素
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 事件回调函数
   */
  bindEvent(element, eventName, callback) {
    // 避免重复绑定相同的事件
    const isAlreadyBound = this.events.some(event => 
      event.element === element && 
      event.eventName === eventName && 
      event.callback === callback
    );
    
    if (!isAlreadyBound) {
      element.addEventListener(eventName, callback);
      this.events.push({ element, eventName, callback });
    }
  }

  /**
   * 解绑所有事件
   */
  unbindEvents() {
    // 优化：使用while循环反向遍历，避免数组塌陷问题
    while (this.events.length > 0) {
      const { element, eventName, callback } = this.events.pop();
      element.removeEventListener(eventName, callback);
    }
  }

  /**
   * 渲染组件
   * @returns {HTMLElement} - 渲染后的DOM元素
   */
  render() {
    // 子类必须重写此方法来渲染组件
    throw new Error('render() method must be implemented in subclass');
  }

  /**
   * 更新组件
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    let shouldUpdate = false;
    
    if (newProps) {
      // 检查props是否真的发生了变化
      const hasPropsChanged = Object.keys(newProps).some(key => this.props[key] !== newProps[key]);
      if (hasPropsChanged) {
        this.props = { ...this.props, ...newProps };
        shouldUpdate = true;
      }
    }
    
    // 只有当props或state确实发生变化时，才调用render方法
    // 子类可以重写此方法来实现更复杂的更新逻辑
    if (shouldUpdate && this.element) {
      this.render();
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.unbindEvents();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }

  /**
   * 获取组件元素
   * @returns {HTMLElement} - 组件的DOM元素
   */
  getElement() {
    return this.element;
  }

  /**
   * 获取组件ID
   * @returns {string} - 组件的ID
   */
  getId() {
    return this.props.id;
  }

  /**
   * 添加CSS类
   * @param {string} className - 要添加的CSS类名
   */
  addClass(className) {
    if (this.element) {
      this.element.classList.add(className);
    }
  }

  /**
   * 移除CSS类
   * @param {string} className - 要移除的CSS类名
   */
  removeClass(className) {
    if (this.element) {
      this.element.classList.remove(className);
    }
  }

  /**
   * 切换CSS类
   * @param {string} className - 要切换的CSS类名
   */
  toggleClass(className) {
    if (this.element) {
      this.element.classList.toggle(className);
    }
  }

  /**
   * 设置样式
   * @param {Object} style - 要设置的样式对象
   */
  setStyle(style) {
    if (this.element) {
      Object.assign(this.element.style, style);
    }
  }
}

// 导出组件基类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseComponent;
} else if (typeof window !== 'undefined') {
  window.BaseComponent = BaseComponent;
}