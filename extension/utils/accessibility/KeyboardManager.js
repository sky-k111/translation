/**
 * KeyboardManager - 管理键盘交互和快捷键
 * 
 * 功能：
 * - 实现 Escape 键关闭抽屉
 * - 实现方向键导航（左/右）
 * - 实现 Home/End 键导航
 * - 实现 Space/Enter 键激活按钮
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

class KeyboardManager {
  /**
   * 构造函数
   * @param {Object} drawerInstance - WordDrawerV2 实例
   */
  constructor(drawerInstance) {
    this.drawer = drawerInstance;
    this.enabled = false;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
  }

  /**
   * 启用键盘快捷键
   * Requirement: 3.1
   */
  enableKeyboardShortcuts() {
    if (this.enabled) return;

    this.enabled = true;
    
    // 监听键盘事件
    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('keyup', this.boundHandleKeyUp);
    
    console.log('KeyboardManager: 键盘快捷键已启用');
  }

  /**
   * 禁用键盘快捷键
   */
  disableKeyboardShortcuts() {
    if (!this.enabled) return;

    this.enabled = false;
    
    // 移除事件监听
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('keyup', this.boundHandleKeyUp);
    
    console.log('KeyboardManager: 键盘快捷键已禁用');
  }

  /**
   * 处理 keydown 事件
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleKeyDown(event) {
    if (!this.enabled) return;

    // 检查抽屉是否打开
    if (!this.drawer || !this.drawer.isOpen) return;

    const key = event.key;
    const target = event.target;

    // 如果焦点在输入框中，只处理 Escape 键
    if (this.isInputElement(target) && key !== 'Escape') {
      return;
    }

    // 根据按键执行相应操作
    switch (key) {
      case 'Escape':
        this.handleEscape(event);
        break;
      
      case 'ArrowLeft':
        this.handleArrowLeft(event);
        break;
      
      case 'ArrowRight':
        this.handleArrowRight(event);
        break;
      
      case 'Home':
        this.handleHome(event);
        break;
      
      case 'End':
        this.handleEnd(event);
        break;
      
      case ' ':
      case 'Enter':
        this.handleSpaceOrEnter(event, target);
        break;
    }
  }

  /**
   * 处理 keyup 事件
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleKeyUp(event) {
    // 预留用于处理 keyup 事件
  }

  /**
   * 处理 Escape 键 - 关闭抽屉
   * Requirement: 3.1
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleEscape(event) {
    event.preventDefault();
    
    if (this.drawer && typeof this.drawer.hide === 'function') {
      console.log('KeyboardManager: Escape 键按下，关闭抽屉');
      this.drawer.hide();
    }
  }

  /**
   * 处理左方向键 - 导航到上一个单词
   * Requirement: 3.3
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleArrowLeft(event) {
    event.preventDefault();
    
    if (this.drawer && typeof this.drawer.navigateToPrev === 'function') {
      console.log('KeyboardManager: 左方向键按下，导航到上一个单词');
      this.drawer.navigateToPrev();
    }
  }

  /**
   * 处理右方向键 - 导航到下一个单词
   * Requirement: 3.2
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleArrowRight(event) {
    event.preventDefault();
    
    if (this.drawer && typeof this.drawer.navigateToNext === 'function') {
      console.log('KeyboardManager: 右方向键按下，导航到下一个单词');
      this.drawer.navigateToNext();
    }
  }

  /**
   * 处理 Home 键 - 导航到第一个单词
   * Requirement: 3.7
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleHome(event) {
    event.preventDefault();
    
    if (this.drawer && typeof this.drawer.navigateToFirst === 'function') {
      console.log('KeyboardManager: Home 键按下，导航到第一个单词');
      this.drawer.navigateToFirst();
    } else if (this.drawer && this.drawer.wordList && this.drawer.wordList.length > 0) {
      // 如果没有 navigateToFirst 方法，使用 show 方法显示第一个单词
      console.log('KeyboardManager: Home 键按下，显示第一个单词');
      this.drawer.show(this.drawer.wordList[0], 0);
    }
  }

  /**
   * 处理 End 键 - 导航到最后一个单词
   * Requirement: 3.8
   * @param {KeyboardEvent} event - 键盘事件
   */
  handleEnd(event) {
    event.preventDefault();
    
    if (this.drawer && typeof this.drawer.navigateToLast === 'function') {
      console.log('KeyboardManager: End 键按下，导航到最后一个单词');
      this.drawer.navigateToLast();
    } else if (this.drawer && this.drawer.wordList && this.drawer.wordList.length > 0) {
      // 如果没有 navigateToLast 方法，使用 show 方法显示最后一个单词
      const lastIndex = this.drawer.wordList.length - 1;
      console.log('KeyboardManager: End 键按下，显示最后一个单词');
      this.drawer.show(this.drawer.wordList[lastIndex], lastIndex);
    }
  }

  /**
   * 处理 Space/Enter 键 - 激活按钮
   * Requirement: 3.4
   * @param {KeyboardEvent} event - 键盘事件
   * @param {HTMLElement} target - 目标元素
   */
  handleSpaceOrEnter(event, target) {
    // 只处理按钮和具有 role="button" 的元素
    if (this.isButton(target)) {
      event.preventDefault();
      
      console.log('KeyboardManager: Space/Enter 键按下，激活按钮', target);
      
      // 触发点击事件
      target.click();
    }
  }

  /**
   * 检查元素是否为按钮
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean}
   */
  isButton(element) {
    if (!element) return false;
    
    return (
      element.tagName === 'BUTTON' ||
      element.getAttribute('role') === 'button' ||
      (element.tagName === 'A' && element.getAttribute('role') === 'button')
    );
  }

  /**
   * 检查元素是否为输入元素
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean}
   */
  isInputElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName;
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      element.isContentEditable === true ||
      element.contentEditable === 'true'
    );
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.disableKeyboardShortcuts();
    this.drawer = null;
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardManager;
}

// 全局注册
if (typeof window !== 'undefined') {
  window.KeyboardManager = KeyboardManager;
}
