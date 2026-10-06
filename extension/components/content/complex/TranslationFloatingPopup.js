/**
 * Content脚本悬浮翻译弹窗组件，用于在网页中显示翻译结果
 * 5.2.4：迁移Content悬浮翻译弹窗功能到组件
 */
const ContentComponent = require('../utils/ContentComponent.js');
const styleManager = require('../../utils/style-manager.js');

class TranslationFloatingPopup extends ContentComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {string} props.text - 原文
   * @param {string} props.translation - 翻译结果
   * @param {string} props.phonetic - 音标
   * @param {string} props.partOfSpeech - 词性
   * @param {Array} props.meanings - 详细释义
   * @param {string} props.wordType - 单词类型
   * @param {boolean} props.isStarred - 是否收藏
   * @param {boolean} props.showRemoveBtn - 是否显示移除按钮
   * @param {string} props.mode - 显示模式：simple 或 full
   * @param {Object} props.rect - 位置矩形
   * @param {Function} props.onClose - 关闭事件回调
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      text: '',
      translation: '',
      phonetic: '',
      partOfSpeech: null,
      meanings: [],
      wordType: 'word',
      isStarred: false,
      showRemoveBtn: false,
      mode: 'simple',
      rect: { left: 0, top: 0, width: 0, height: 0 },
      onClose: () => {}
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      visible: false
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.registerStyle();
  }

  /**
   * 注册组件样式
   */
  registerStyle() {
    // 注册翻译弹窗的样式
    const styles = {
      '.click-tooltip': {
        'position': 'fixed',
        'background': 'var(--bg-primary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-lg)',
        'box-shadow': 'var(--shadow-xl)',
        'z-index': '10000',
        'min-width': '250px',
        'max-width': '400px',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'animation': 'popupFadeIn 0.3s ease-out',
        'transition': 'all 0.3s ease',
        'backdrop-filter': 'blur(10px)',
        'background': 'rgba(var(--bg-primary-rgb), 0.95)'
      },
      
      '@keyframes popupFadeIn': {
        '0%': {
          'opacity': '0',
          'transform': 'translateY(-10px) scale(0.95)'
        },
        '100%': {
          'opacity': '1',
          'transform': 'translateY(0) scale(1)'
        }
      },
      
      '.click-tooltip .tooltip-header': {
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'flex-start',
        'padding': '12px 16px',
        'border-bottom': '1px solid var(--border-color)',
        'background': 'var(--bg-secondary)',
        'border-radius': 'var(--border-radius-lg) var(--border-radius-lg) 0 0'
      },
      
      '.click-tooltip .tooltip-word': {
        'font-size': 'var(--font-size-xl)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-primary)',
        'margin': '0'
      },
      
      '.click-tooltip .tooltip-close': {
        'background': 'none',
        'border': 'none',
        'color': 'var(--text-secondary)',
        'font-size': 'var(--font-size-lg)',
        'cursor': 'pointer',
        'padding': '4px',
        'border-radius': 'var(--border-radius-sm)',
        'transition': 'all 0.2s ease'
      },
      
      '.click-tooltip .tooltip-close:hover': {
        'background': 'var(--bg-hover)',
        'color': 'var(--text-primary)'
      },
      
      '.click-tooltip .tooltip-phonetic': {
        'font-size': 'var(--font-size-sm)',
        'color': 'var(--text-secondary)',
        'font-style': 'italic',
        'margin': '4px 0 0 0'
      },
      
      '.click-tooltip .tooltip-content': {
        'padding': '16px'
      },
      
      '.click-tooltip .tooltip-translation': {
        'font-size': 'var(--font-size-lg)',
        'color': 'var(--text-primary)',
        'margin': '0 0 12px 0',
        'line-height': '1.5'
      },
      
      '.click-tooltip .tooltip-actions': {
        'display': 'flex',
        'gap': '8px',
        'margin-top': '12px',
        'padding-top': '12px',
        'border-top': '1px solid var(--border-color)'
      },
      
      '.click-tooltip .tooltip-remove-btn': {
        'background': 'var(--accent-danger)',
        'color': '#fff',
        'border': 'none',
        'padding': '6px 12px',
        'border-radius': 'var(--border-radius-md)',
        'cursor': 'pointer',
        'font-size': 'var(--font-size-sm)',
        'transition': 'all 0.2s ease'
      },
      
      '.click-tooltip .tooltip-remove-btn:hover': {
        'background': 'var(--accent-danger-hover)'
      },
      
      '.click-tooltip .tooltip-count': {
        'font-size': 'var(--font-size-xs)',
        'color': 'var(--text-tertiary)',
        'margin': '8px 0 0 0'
      }
    };
    
    styleManager.registerStyle('translation-floating-popup', styles);
  }

  /**
   * 创建DOM结构
   */
  createDOM() {
    // 根据词性获取背景颜色类
    const posClass = this.props.wordType === 'phrase' ? 'pos-phrase' : this.getPartOfSpeechClass(this.props.partOfSpeech);
    
    // 创建新弹窗
    const popup = document.createElement('div');
    popup.className = `click-tooltip ${posClass}`;
    
    // 设置位置
    this.setPosition(popup, this.props.rect);
    
    // 音标HTML
    let phoneticHtml = '';
    if (this.props.phonetic) {
      phoneticHtml = `<p class="tooltip-phonetic">/${this.props.phonetic}/</p>`;
    }
    
    // 格式化翻译结果
    const showFullMeanings = this.props.mode === 'full';
    let translationHtml = `<div class="tooltip-translation">${this.props.translation}</div>`;
    
    // 取消高亮按钮
    let bottomActionsHtml = '';
    if (this.props.showRemoveBtn) {
      bottomActionsHtml += `
        <div class="tooltip-actions">
          <button class="tooltip-remove-btn">取消高亮</button>
        </div>
      `;
    }
    
    // 组装HTML
    popup.innerHTML = `
      <div class="tooltip-header">
        <div>
          <span class="tooltip-word">${this.props.text}</span>
          ${phoneticHtml}
        </div>
        <button class="tooltip-close">×</button>
      </div>
      <div class="tooltip-content">
        ${translationHtml}
        <div class="tooltip-count">已翻译 1 次</div>
        ${bottomActionsHtml}
      </div>
    `;
    
    // 绑定事件
    this.bindEvents(popup);
    
    this.el = popup;
  }

  /**
   * 绑定弹窗事件
   * @param {HTMLElement} popup - 弹窗元素
   */
  bindEvents(popup) {
    // 关闭按钮
    const closeBtn = popup.querySelector('.tooltip-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.handleClose());
    }
    
    // 移除按钮
    const removeBtn = popup.querySelector('.tooltip-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRemove();
      });
    }
  }

  /**
   * 设置弹窗位置
   * @param {HTMLElement} popup - 弹窗元素
   * @param {Object} rect - 位置矩形
   */
  setPosition(popup, rect) {
    // 基于选中元素的位置计算弹窗位置
    const top = rect.top + window.scrollY + rect.height + 10;
    const left = rect.left + window.scrollX;
    
    popup.style.position = 'absolute';
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    
    // 确保弹窗不超出视口
    this.adjustPosition(popup);
  }

  /**
   * 调整弹窗位置，确保不超出视口
   * @param {HTMLElement} popup - 弹窗元素
   */
  adjustPosition(popup) {
    if (!popup) return;
    
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 调整水平位置
    if (popupRect.right > viewportWidth) {
      popup.style.left = `${parseInt(popup.style.left) - (popupRect.right - viewportWidth) - 10}px`;
    }
    
    // 调整垂直位置
    if (popupRect.bottom > viewportHeight) {
      popup.style.top = `${parseInt(popup.style.top) - popupRect.height - 20}px`;
    }
    
    // 确保不小于0
    if (parseInt(popup.style.left) < 0) {
      popup.style.left = '10px';
    }
    
    if (parseInt(popup.style.top) < 0) {
      popup.style.top = '10px';
    }
  }

  /**
   * 获取词性对应的CSS类名
   * @param {string} partOfSpeech - 词性
   * @returns {string} - CSS类名
   */
  getPartOfSpeechClass(partOfSpeech) {
    const posMap = {
      'n': 'pos-noun',
      'v': 'pos-verb',
      'adj': 'pos-adjective',
      'adv': 'pos-adverb',
      'phrase': 'pos-phrase'
    };
    
    return posMap[partOfSpeech] || 'pos-unknown';
  }

  /**
   * 处理关闭事件
   */
  handleClose() {
    this.hide();
    this.props.onClose();
  }

  /**
   * 处理移除事件
   */
  handleRemove() {
    this.hide();
    // 可以添加移除高亮的逻辑
  }

  /**
   * 显示弹窗
   * @param {Object} rect - 位置矩形
   */
  show(rect = null) {
    if (rect) {
      this.props.rect = rect;
    }
    
    this.state.visible = true;
    this.createDOM();
    
    // 添加到文档
    document.body.appendChild(this.el);
    
    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
    }, 0);
  }

  /**
   * 隐藏弹窗
   */
  hide() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
      this.el = null;
      this.state.visible = false;
    }
  }

  /**
   * 处理外部点击事件，关闭弹窗
   * @param {Event} e - 点击事件
   */
  handleOutsideClick(e) {
    if (this.el && !this.el.contains(e.target)) {
      this.hide();
      this.props.onClose();
    }
  }

  /**
   * 更新弹窗内容
   * @param {Object} newProps - 新的属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
      this.createDOM();
    }
  }

  /**
   * 渲染组件
   * @returns {HTMLElement} - 渲染后的组件元素
   */
  render() {
    return this.el;
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.hide();
    super.destroy();
  }
}

// 导出组件
module.exports = TranslationFloatingPopup;
