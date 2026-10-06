/**
 * FocusManager - 管理焦点陷阱和焦点恢复
 * 
 * 功能：
 * - 实现焦点陷阱（Tab/Shift+Tab 循环）
 * - 保存和恢复焦点位置
 * - 管理可聚焦元素列表
 * - 提供可见的焦点指示器
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

class FocusManager {
  /**
   * 构造函数
   * @param {HTMLElement} containerElement - 需要管理焦点的容器元素
   */
  constructor(containerElement) {
    this.container = containerElement;
    this.focusOrigin = null;
    this.focusableElements = [];
    this.trapEnabled = false;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    
    // 可聚焦元素选择器
    this.focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
  }

  /**
   * 启用焦点陷阱
   * Requirements: 2.1, 2.2, 2.3
   */
  enableFocusTrap() {
    if (this.trapEnabled) return;
    
    this.trapEnabled = true;
    this.updateFocusableElements();
    
    // 监听键盘事件
    this.container.addEventListener('keydown', this.boundHandleKeyDown);
    
    console.log('FocusManager: 焦点陷阱已启用', {
      focusableCount: this.focusableElements.length
    });
  }

  /**
   * 禁用焦点陷阱
   */
  disableFocusTrap() {
    if (!this.trapEnabled) return;
    
    this.trapEnabled = false;
    this.container.removeEventListener('keydown', this.boundHandleKeyDown);
    
    console.log('FocusManager: 焦点陷阱已禁用');
  }

  /**
   * 保存当前焦点位置
   * Requirement: 2.4
   */
  saveFocusOrigin() {
    this.focusOrigin = document.activeElement;
    console.log('FocusManager: 已保存焦点位置', this.focusOrigin);
  }

  /**
   * 恢复焦点到原始位置
   * Requirement: 2.4
   */
  restoreFocus() {
    if (this.focusOrigin && this.focusOrigin !== document.body) {
      try {
        // 检查元素是否仍在 DOM 中
        if (document.body.contains(this.focusOrigin)) {
          this.focusOrigin.focus();
          console.log('FocusManager: 焦点已恢复到', this.focusOrigin);
        } else {
          // 如果原始元素已被移除，聚焦到 body
          document.body.focus();
          console.log('FocusManager: 原始元素已移除，焦点恢复到 body');
        }
      } catch (error) {
        console.error('FocusManager: 恢复焦点失败', error);
        document.body.focus();
      }
    }
    
    this.focusOrigin = null;
  }

  /**
   * 移动焦点到第一个可聚焦元素
   * Requirement: 2.1
   */
  moveFocusToFirst() {
    this.updateFocusableElements();
    
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
      console.log('FocusManager: 焦点已移动到第一个元素');
    }
  }

  /**
   * 移动焦点到最后一个可聚焦元素
   */
  moveFocusToLast() {
    this.updateFocusableElements();
    
    if (this.focusableElements.length > 0) {
      const lastIndex = this.focusableElements.length - 1;
      this.focusableElements[lastIndex].focus();
      console.log('FocusManager: 焦点已移动到最后一个元素');
    }
  }

  /**
   * 获取所有可聚焦元素
   * Requirement: 2.6, 2.7
   */
  getFocusableElements() {
    return this.focusableElements;
  }

  /**
   * 更新可聚焦元素列表
   * 排除禁用的元素 (Requirement: 2.7)
   */
  updateFocusableElements() {
    const elements = Array.from(
      this.container.querySelectorAll(this.focusableSelector)
    );
    
    // 过滤掉不可见或禁用的元素
    this.focusableElements = elements.filter(el => {
      return this.isElementFocusable(el);
    });
    
    console.log('FocusManager: 更新可聚焦元素列表', {
      total: elements.length,
      focusable: this.focusableElements.length
    });
  }

  /**
   * 检查元素是否可聚焦
   * Requirement: 2.7
   */
  isElementFocusable(element) {
    // 检查元素是否可见
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    
    // 检查元素是否禁用
    if (element.disabled) {
      return false;
    }
    
    // 检查 tabindex
    const tabindex = element.getAttribute('tabindex');
    if (tabindex === '-1') {
      return false;
    }
    
    return true;
  }

  /**
   * 处理键盘事件 - 实现焦点陷阱
   * Requirements: 2.2, 2.3
   */
  handleKeyDown(event) {
    if (!this.trapEnabled) return;
    
    // 只处理 Tab 键
    if (event.key !== 'Tab') return;
    
    this.updateFocusableElements();
    
    if (this.focusableElements.length === 0) return;
    
    const currentIndex = this.focusableElements.indexOf(document.activeElement);
    
    if (event.shiftKey) {
      // Shift+Tab: 向前移动
      if (currentIndex === 0 || currentIndex === -1) {
        // 在第一个元素或不在列表中，跳转到最后一个
        event.preventDefault();
        this.moveFocusToLast();
      }
    } else {
      // Tab: 向后移动
      if (currentIndex === this.focusableElements.length - 1) {
        // 在最后一个元素，跳转到第一个
        event.preventDefault();
        this.moveFocusToFirst();
      }
    }
  }

  /**
   * 验证焦点顺序是否符合逻辑
   * Requirement: 2.6
   */
  validateFocusOrder() {
    this.updateFocusableElements();
    
    const issues = [];
    
    // 检查每个元素的 tabindex
    this.focusableElements.forEach((el, index) => {
      const tabindex = el.getAttribute('tabindex');
      
      // 如果设置了正数 tabindex，可能会打乱顺序
      if (tabindex && parseInt(tabindex) > 0) {
        issues.push({
          element: el,
          issue: `元素 ${index} 有正数 tabindex (${tabindex})，可能打乱焦点顺序`
        });
      }
    });
    
    if (issues.length > 0) {
      console.warn('FocusManager: 发现焦点顺序问题', issues);
    } else {
      console.log('FocusManager: 焦点顺序验证通过');
    }
    
    return issues;
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.disableFocusTrap();
    this.focusOrigin = null;
    this.focusableElements = [];
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FocusManager;
}

// 全局注册
if (typeof window !== 'undefined') {
  window.FocusManager = FocusManager;
}
