/**
 * 文本选择组件，用于处理网页中的文本选择和翻译触发
 * 5.2.1：迁移文本选择监听功能到组件
 */
const ContentComponent = require('../utils/ContentComponent.js');

class TextSelection extends ContentComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {Function} props.onSelection - 文本选择事件回调
   * @param {Function} props.onTranslationTrigger - 翻译触发事件回调
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      onSelection: () => {},
      onTranslationTrigger: () => {},
      debounceTime: 300
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.selectedText = '';
    this.selectedRange = null;
    this.selectionDebounceTimer = null;
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听鼠标抬起事件（完成选择）
    this.bindEvent(document, 'mouseup', this.handleMouseUp.bind(this));
    
    // 监听键盘事件（回车键或空格键触发翻译）
    this.bindEvent(document, 'keydown', this.handleKeyDown.bind(this));
    
    // 监听右键菜单事件（右键触发翻译）
    this.bindEvent(document, 'contextmenu', this.handleContextMenu.bind(this));
  }

  /**
   * 处理鼠标抬起事件，检测文本选择
   * @param {Event} e - 鼠标事件
   */
  handleMouseUp(e) {
    // 清除之前的定时器
    if (this.selectionDebounceTimer) {
      clearTimeout(this.selectionDebounceTimer);
    }
    
    // 防抖处理
    this.selectionDebounceTimer = setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        this.selectedText = text;
        this.selectedRange = selection.getRangeAt(0).cloneRange();
        
        // 调用选择事件回调
        this.props.onSelection({
          text: this.selectedText,
          range: this.selectedRange,
          event: e
        });
      }
    }, this.props.debounceTime);
  }

  /**
   * 处理键盘事件，处理回车键或空格键触发翻译
   * @param {KeyboardEvent} e - 键盘事件
   */
  handleKeyDown(e) {
    // 检查是否有输入框或文本区域处于焦点状态
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // 检查是否按下了回车键或空格键，允许直接对选中的内容执行翻译
    if ((e.key === 'Enter' || e.key === ' ') && !isInputFocused) {
      this.handleTranslationTrigger(e);
    }
    
    // ESC键清除选择
    if (e.key === 'Escape') {
      this.clearSelection();
    }
  }

  /**
   * 处理右键菜单事件，触发翻译
   * @param {MouseEvent} e - 鼠标事件
   */
  handleContextMenu(e) {
    // 检查是否有输入框或文本区域处于焦点状态
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // 如果不在输入框内，且有选中文本，则阻止默认菜单并触发翻译
    if (!isInputFocused) {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text.length > 0) {
        e.preventDefault();
        this.handleTranslationTrigger(e);
      }
    }
  }

  /**
   * 处理翻译触发事件
   * @param {Event} e - 触发事件
   */
  handleTranslationTrigger(e) {
    // 优先使用当前选择，否则使用保存的选择
    const selection = window.getSelection();
    let text, range, rect;
    
    if (selection.toString().trim().length > 0) {
      // 使用当前选择
      text = selection.toString().trim();
      range = selection.getRangeAt(0);
      rect = range.getBoundingClientRect();
    } else if (this.selectedText && this.selectedRange) {
      // 使用保存的选择
      text = this.selectedText;
      range = this.selectedRange;
      rect = range.getBoundingClientRect();
    } else {
      return;
    }
    
    // 调用翻译触发事件回调
    this.props.onTranslationTrigger({
      text,
      range,
      rect,
      event: e
    });
  }

  /**
   * 清除选择
   */
  clearSelection() {
    // 清除页面上的文本选择
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    // 清除保存的选择
    this.selectedText = '';
    this.selectedRange = null;
  }

  /**
   * 获取当前选中的文本
   * @returns {string} - 选中的文本
   */
  getSelectedText() {
    return this.selectedText;
  }

  /**
   * 获取当前选中的文本范围
   * @returns {Range|null} - 选中的文本范围
   */
  getSelectedRange() {
    return this.selectedRange;
  }

  /**
   * 渲染组件
   * @returns {HTMLElement|null} - 组件DOM元素，此组件无可见DOM
   */
  render() {
    // 此组件无可见DOM，返回null
    return null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清除定时器
    if (this.selectionDebounceTimer) {
      clearTimeout(this.selectionDebounceTimer);
    }
    
    // 清除选择
    this.clearSelection();
    
    super.destroy();
  }
}

// 导出组件
module.exports = TextSelection;
