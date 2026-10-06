/**
 * 翻译弹窗组件
 * 用于显示单词翻译结果，包括音标、翻译、例句等
 */
const BaseComponent = require('../utils/BaseComponent.js');
const Card = require('../base/card.js');
const Button = require('../base/button.js');
const styleManager = require('../utils/style-manager.js');

class TranslationPopup extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   * @param {string} props.word - 单词
   * @param {string} props.phonetic - 音标
   * @param {Array} props.translations - 翻译列表
   * @param {Array} props.examples - 例句列表
   * @param {string} props.partOfSpeech - 词性
   * @param {number} props.frequency - 使用频率
   * @param {Function} props.onClose - 关闭事件回调
   * @param {Function} props.onSave - 保存事件回调
   * @param {Function} props.onExampleClick - 例句点击事件回调
   * @param {Object} props.position - 弹窗位置 { top, left }
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      word: '',
      phonetic: '',
      translations: [],
      examples: [],
      partOfSpeech: '',
      frequency: 0,
      onClose: () => {},
      onSave: () => {},
      onExampleClick: () => {},
      position: { top: 0, left: 0 }
    };
    
    this.props = { ...this.defaultProps, ...props };
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
    // 注册样式
    this.registerStyle();
    
    // 创建DOM结构
    this.createDOM();
    
    // 绑定事件
    this.bindEvents();
  }
  
  /**
   * 注册组件样式
   */
  registerStyle() {
    const styles = {
      '.translation-popup': {
        'position': 'fixed',
        'background': 'var(--bg-primary)',
        'border': '1px solid var(--border-color)',
        'border-radius': 'var(--border-radius-lg)',
        'box-shadow': 'var(--shadow-xl)',
        'min-width': '300px',
        'max-width': '500px',
        'max-height': '600px',
        'overflow-y': 'auto',
        'z-index': '10000',
        'opacity': '0',
        'visibility': 'hidden',
        'transition': 'all 0.3s ease',
        'backdrop-filter': 'blur(10px)',
        'background': 'rgba(var(--bg-primary-rgb), 0.95)'
      },
      
      '.translation-popup.visible': {
        'opacity': '1',
        'visibility': 'visible',
        'transform': 'translateY(0)'
      },
      
      '.translation-popup-header': {
        'padding': '16px 20px',
        'border-bottom': '1px solid var(--border-color)',
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'flex-start',
        'background': 'var(--bg-secondary)'
      },
      
      '.translation-popup-title': {
        'font-size': 'var(--font-size-2xl)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-primary)',
        'margin': '0 0 8px 0',
        'display': 'flex',
        'align-items': 'center',
        'gap': '8px'
      },
      
      '.translation-popup-phonetic': {
        'font-size': 'var(--font-size-md)',
        'color': 'var(--text-secondary)',
        'font-style': 'italic',
        'margin': '0'
      },
      
      '.translation-popup-actions': {
        'display': 'flex',
        'gap': '8px'
      },
      
      '.translation-popup-body': {
        'padding': '20px'
      },
      
      '.translation-popup-section': {
        'margin-bottom': '20px'
      },
      
      '.translation-popup-section:last-child': {
        'margin-bottom': '0'
      },
      
      '.translation-popup-section-title': {
        'font-size': 'var(--font-size-sm)',
        'font-weight': 'var(--font-weight-bold)',
        'color': 'var(--text-tertiary)',
        'text-transform': 'uppercase',
        'letter-spacing': '0.5px',
        'margin': '0 0 8px 0'
      },
      
      '.translation-popup-translation': {
        'font-size': 'var(--font-size-lg)',
        'color': 'var(--text-primary)',
        'margin': '0 0 8px 0',
        'display': 'flex',
        'gap': '12px',
        'align-items': 'flex-start'
      },
      
      '.translation-popup-part-of-speech': {
        'font-size': 'var(--font-size-sm)',
        'color': 'var(--text-secondary)',
        'background': 'var(--bg-secondary)',
        'padding': '2px 8px',
        'border-radius': 'var(--border-radius-full)',
        'font-weight': 'var(--font-weight-medium)',
        'flex-shrink': '0',
        'align-self': 'center'
      },
      
      '.translation-popup-translation-text': {
        'flex': '1'
      },
      
      '.translation-popup-example': {
        'background': 'var(--bg-secondary)',
        'padding': '12px',
        'border-radius': 'var(--border-radius-md)',
        'margin-bottom': '8px',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease'
      },
      
      '.translation-popup-example:hover': {
        'background': 'var(--bg-hover)',
        'transform': 'translateX(4px)'
      },
      
      '.translation-popup-example-text': {
        'font-size': 'var(--font-size-md)',
        'color': 'var(--text-primary)',
        'margin': '0 0 4px 0',
        'line-height': '1.5'
      },
      
      '.translation-popup-example-translation': {
        'font-size': 'var(--font-size-sm)',
        'color': 'var(--text-secondary)',
        'margin': '0',
        'line-height': '1.4'
      },
      
      '.translation-popup-footer': {
        'padding': '16px 20px',
        'border-top': '1px solid var(--border-color)',
        'display': 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'background': 'var(--bg-secondary)'
      },
      
      '.translation-popup-meta': {
        'display': 'flex',
        'gap': '16px',
        'font-size': 'var(--font-size-xs)',
        'color': 'var(--text-tertiary)'
      },
      
      '.translation-popup-meta-item': {
        'display': 'flex',
        'align-items': 'center',
        'gap': '4px'
      },
      
      '.translation-popup-meta-icon': {
        'font-size': 'var(--font-size-sm)'
      },
      
      '.translation-popup-close-btn': {
        'background': 'none',
        'border': 'none',
        'color': 'var(--text-secondary)',
        'cursor': 'pointer',
        'padding': '4px',
        'border-radius': 'var(--border-radius-sm)',
        'transition': 'all 0.2s ease',
        'font-size': 'var(--font-size-lg)'
      },
      
      '.translation-popup-close-btn:hover': {
        'background': 'var(--bg-hover)',
        'color': 'var(--text-primary)'
      }
    };
    
    styleManager.registerStyle('translation-popup', styles);
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建弹窗容器
    const popup = document.createElement('div');
    popup.className = `translation-popup ${this.state.visible ? 'visible' : ''}`;
    
    // 设置位置
    popup.style.top = `${this.props.position.top}px`;
    popup.style.left = `${this.props.position.left}px`;
    
    // 头部
    const header = document.createElement('div');
    header.className = 'translation-popup-header';
    
    // 标题和音标
    const titleContainer = document.createElement('div');
    
    const title = document.createElement('h3');
    title.className = 'translation-popup-title';
    title.textContent = this.props.word;
    titleContainer.appendChild(title);
    
    if (this.props.phonetic) {
      const phonetic = document.createElement('p');
      phonetic.className = 'translation-popup-phonetic';
      phonetic.textContent = `/${this.props.phonetic}/`;
      titleContainer.appendChild(phonetic);
    }
    
    header.appendChild(titleContainer);
    
    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'translation-popup-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = '关闭';
    closeBtn.addEventListener('click', () => this.handleClose());
    header.appendChild(closeBtn);
    
    popup.appendChild(header);
    
    // 内容
    const body = document.createElement('div');
    body.className = 'translation-popup-body';
    
    // 翻译部分
    if (this.props.translations && this.props.translations.length > 0) {
      const translationSection = document.createElement('div');
      translationSection.className = 'translation-popup-section';
      
      const translationTitle = document.createElement('h4');
      translationTitle.className = 'translation-popup-section-title';
      translationTitle.textContent = '翻译';
      translationSection.appendChild(translationTitle);
      
      this.props.translations.forEach((translation, index) => {
        const translationItem = document.createElement('div');
        translationItem.className = 'translation-popup-translation';
        
        // 词性
        if (translation.partOfSpeech) {
          const partOfSpeech = document.createElement('span');
          partOfSpeech.className = 'translation-popup-part-of-speech';
          partOfSpeech.textContent = translation.partOfSpeech;
          translationItem.appendChild(partOfSpeech);
        }
        
        // 翻译文本
        const translationText = document.createElement('span');
        translationText.className = 'translation-popup-translation-text';
        translationText.textContent = translation.text;
        translationItem.appendChild(translationText);
        
        translationSection.appendChild(translationItem);
      });
      
      body.appendChild(translationSection);
    }
    
    // 例句部分
    if (this.props.examples && this.props.examples.length > 0) {
      const examplesSection = document.createElement('div');
      examplesSection.className = 'translation-popup-section';
      
      const examplesTitle = document.createElement('h4');
      examplesTitle.className = 'translation-popup-section-title';
      examplesTitle.textContent = '例句';
      examplesSection.appendChild(examplesTitle);
      
      this.props.examples.forEach((example, index) => {
        const exampleItem = document.createElement('div');
        exampleItem.className = 'translation-popup-example';
        exampleItem.addEventListener('click', () => this.handleExampleClick(example));
        
        const exampleText = document.createElement('p');
        exampleText.className = 'translation-popup-example-text';
        exampleText.textContent = example.text;
        exampleItem.appendChild(exampleText);
        
        if (example.translation) {
          const exampleTranslation = document.createElement('p');
          exampleTranslation.className = 'translation-popup-example-translation';
          exampleTranslation.textContent = example.translation;
          exampleItem.appendChild(exampleTranslation);
        }
        
        examplesSection.appendChild(exampleItem);
      });
      
      body.appendChild(examplesSection);
    }
    
    popup.appendChild(body);
    
    // 底部
    const footer = document.createElement('div');
    footer.className = 'translation-popup-footer';
    
    // 元数据
    const meta = document.createElement('div');
    meta.className = 'translation-popup-meta';
    
    // 使用频率
    if (this.props.frequency) {
      const frequency = document.createElement('div');
      frequency.className = 'translation-popup-meta-item';
      
      const frequencyIcon = document.createElement('span');
      frequencyIcon.className = 'translation-popup-meta-icon';
      frequencyIcon.innerHTML = '📊';
      frequency.appendChild(frequencyIcon);
      
      const frequencyText = document.createElement('span');
      frequencyText.textContent = `频率: ${this.props.frequency}`;
      frequency.appendChild(frequencyText);
      
      meta.appendChild(frequency);
    }
    
    footer.appendChild(meta);
    
    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'translation-popup-actions';
    
    // 保存按钮
    const saveBtn = new Button({
      text: '保存',
      icon: '💾',
      variant: 'secondary',
      size: 'small',
      onClick: () => this.handleSave()
    });
    
    const saveBtnElement = saveBtn.render();
    actions.appendChild(saveBtnElement);
    
    footer.appendChild(actions);
    
    popup.appendChild(footer);
    
    this.el = popup;
  }
  
  /**
   * 处理关闭事件
   */
  handleClose() {
    this.setState({ visible: false });
    if (this.props.onClose) {
      this.props.onClose();
    }
  }
  
  /**
   * 处理保存事件
   */
  handleSave() {
    if (this.props.onSave) {
      this.props.onSave({
        word: this.props.word,
        phonetic: this.props.phonetic,
        translations: this.props.translations,
        examples: this.props.examples,
        partOfSpeech: this.props.partOfSpeech,
        frequency: this.props.frequency
      });
    }
  }
  
  /**
   * 处理例句点击事件
   * @param {Object} example - 例句对象
   */
  handleExampleClick(example) {
    if (this.props.onExampleClick) {
      this.props.onExampleClick(example);
    }
  }
  
  /**
   * 显示弹窗
   * @param {Object} position - 弹窗位置 { top, left }
   */
  show(position = null) {
    if (position) {
      this.props.position = position;
    }
    
    this.setState({ visible: true });
    this.createDOM();
    
    // 如果弹窗超出视口，调整位置
    this.adjustPosition();
  }
  
  /**
   * 隐藏弹窗
   */
  hide() {
    this.setState({ visible: false });
  }
  
  /**
   * 调整弹窗位置，确保不超出视口
   */
  adjustPosition() {
    if (!this.el) return;
    
    const popupRect = this.el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let { top, left } = this.props.position;
    
    // 调整水平位置
    if (popupRect.right > viewportWidth) {
      left = viewportWidth - popupRect.width - 20;
    }
    
    // 调整垂直位置
    if (popupRect.bottom > viewportHeight) {
      top = viewportHeight - popupRect.height - 20;
    }
    
    // 确保不小于0
    left = Math.max(left, 20);
    top = Math.max(top, 20);
    
    // 更新位置
    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }
  
  /**
   * 更新翻译数据
   * @param {Object} data - 翻译数据
   */
  updateTranslation(data) {
    this.props = { ...this.props, ...data };
    this.createDOM();
  }
  
  /**
   * 渲染组件
   * @returns {HTMLElement} - 渲染后的组件元素
   */
  render() {
    return this.el;
  }
  
  /**
   * 更新组件
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
      this.createDOM();
    }
  }
  
  /**
   * 销毁组件
   */
  destroy() {
    this.unbindEvents();
    super.destroy();
  }
}

// 导出组件
module.exports = TranslationPopup;