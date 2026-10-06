/**
 * ARIAManager - 管理 ARIA 属性和角色
 * 
 * 功能：
 * - 管理对话框角色和 aria-modal 属性
 * - 管理 aria-labelledby 和 aria-describedby 关联
 * - 管理 aria-live 区域用于动态内容更新
 * - 确保所有交互元素有可访问名称
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

class ARIAManager {
  /**
   * 构造函数
   * @param {HTMLElement} drawerElement - 抽屉容器元素
   */
  constructor(drawerElement) {
    this.drawer = drawerElement;
    this.liveRegionPolite = null;
    this.liveRegionAssertive = null;
    this.titleId = null;
    this.descriptionId = null;
  }

  /**
   * 设置对话框属性
   * Requirements: 1.1
   */
  setDialogAttributes() {
    if (!this.drawer) {
      console.error('ARIAManager: 抽屉元素不存在');
      return;
    }

    // 设置对话框角色和模态属性
    this.drawer.setAttribute('role', 'dialog');
    this.drawer.setAttribute('aria-modal', 'true');
    
    console.log('ARIAManager: 对话框属性已设置', {
      role: 'dialog',
      'aria-modal': 'true'
    });
  }

  /**
   * 设置标签关联
   * Requirements: 1.2, 1.3
   * @param {string} titleId - 标题元素的 ID
   * @param {string} descriptionId - 描述元素的 ID（可选）
   */
  setLabelAssociations(titleId, descriptionId = null) {
    if (!this.drawer) return;

    // 设置 aria-labelledby
    if (titleId) {
      this.titleId = titleId;
      this.drawer.setAttribute('aria-labelledby', titleId);
      console.log('ARIAManager: 已设置 aria-labelledby', titleId);
    }

    // 设置 aria-describedby
    if (descriptionId) {
      this.descriptionId = descriptionId;
      this.drawer.setAttribute('aria-describedby', descriptionId);
      console.log('ARIAManager: 已设置 aria-describedby', descriptionId);
    }
  }

  /**
   * 创建 aria-live 区域
   * Requirement: 1.5
   */
  createLiveRegions() {
    // 创建 polite 级别的 live region（用于一般更新）
    this.liveRegionPolite = document.createElement('div');
    this.liveRegionPolite.setAttribute('aria-live', 'polite');
    this.liveRegionPolite.setAttribute('aria-atomic', 'true');
    this.liveRegionPolite.className = 'sr-only';
    this.liveRegionPolite.id = `drawer-live-polite-${Date.now()}`;
    
    // 创建 assertive 级别的 live region（用于重要更新/错误）
    this.liveRegionAssertive = document.createElement('div');
    this.liveRegionAssertive.setAttribute('aria-live', 'assertive');
    this.liveRegionAssertive.setAttribute('aria-atomic', 'true');
    this.liveRegionAssertive.className = 'sr-only';
    this.liveRegionAssertive.id = `drawer-live-assertive-${Date.now()}`;
    
    // 添加到抽屉容器
    if (this.drawer) {
      this.drawer.appendChild(this.liveRegionPolite);
      this.drawer.appendChild(this.liveRegionAssertive);
      console.log('ARIAManager: Live regions 已创建');
    }
  }

  /**
   * 更新 live region 内容
   * Requirement: 1.5
   * @param {string} message - 要宣布的消息
   * @param {string} priority - 优先级 ('polite' 或 'assertive')
   */
  updateLiveRegion(message, priority = 'polite') {
    const region = priority === 'assertive' 
      ? this.liveRegionAssertive 
      : this.liveRegionPolite;
    
    if (!region) {
      console.warn('ARIAManager: Live region 未初始化');
      return;
    }

    // 清空后设置新内容（确保屏幕阅读器检测到变化）
    region.textContent = '';
    
    // 使用 setTimeout 确保屏幕阅读器检测到更新
    setTimeout(() => {
      region.textContent = message;
      console.log(`ARIAManager: Live region 已更新 (${priority})`, message);
    }, 100);
  }

  /**
   * 确保所有交互元素有可访问名称
   * Requirement: 1.4
   */
  ensureAccessibleNames() {
    if (!this.drawer) return;

    const interactiveElements = this.drawer.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    );

    const issues = [];

    interactiveElements.forEach((el, index) => {
      const hasAccessibleName = this.hasAccessibleName(el);
      
      if (!hasAccessibleName) {
        issues.push({
          element: el,
          tagName: el.tagName,
          index: index
        });
        
        console.warn('ARIAManager: 元素缺少可访问名称', el);
      }
    });

    if (issues.length > 0) {
      console.warn(`ARIAManager: 发现 ${issues.length} 个元素缺少可访问名称`, issues);
    } else {
      console.log('ARIAManager: 所有交互元素都有可访问名称');
    }

    return issues;
  }

  /**
   * 检查元素是否有可访问名称
   * Requirement: 1.4
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean}
   */
  hasAccessibleName(element) {
    // 检查 aria-label
    if (element.getAttribute('aria-label')) {
      return true;
    }

    // 检查 aria-labelledby
    if (element.getAttribute('aria-labelledby')) {
      return true;
    }

    // 检查可见文本内容
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length > 0) {
      return true;
    }

    // 检查 alt 属性（图片）
    if (element.tagName === 'IMG' && element.getAttribute('alt')) {
      return true;
    }

    // 检查 title 属性（作为后备）
    if (element.getAttribute('title')) {
      return true;
    }

    return false;
  }

  /**
   * 为按钮添加 ARIA 标签
   * Requirement: 1.6
   * @param {HTMLElement} button - 按钮元素
   * @param {string} label - 标签文本
   */
  addButtonLabel(button, label) {
    if (!button || !label) return;

    // 如果按钮已有可访问名称，不覆盖
    if (this.hasAccessibleName(button)) {
      console.log('ARIAManager: 按钮已有可访问名称，跳过', button);
      return;
    }

    button.setAttribute('aria-label', label);
    console.log('ARIAManager: 已添加按钮标签', { button, label });
  }

  /**
   * 批量为图标按钮添加标签
   * Requirement: 1.6
   * @param {Object} buttonLabelMap - 按钮选择器到标签的映射
   */
  addButtonLabels(buttonLabelMap = {}) {
    if (!this.drawer) return;

    Object.entries(buttonLabelMap).forEach(([selector, label]) => {
      const button = this.drawer.querySelector(selector);
      if (button) {
        this.addButtonLabel(button, label);
      }
    });
  }

  /**
   * 设置标签页结构的 ARIA 角色
   * Requirement: 1.7
   * @param {HTMLElement} tablist - 标签列表容器
   * @param {HTMLElement[]} tabs - 标签元素数组
   * @param {HTMLElement[]} panels - 面板元素数组
   */
  setTabStructure(tablist, tabs, panels) {
    if (!tablist || !tabs || !panels) {
      console.warn('ARIAManager: 标签页结构参数不完整');
      return;
    }

    // 设置 tablist 角色
    tablist.setAttribute('role', 'tablist');

    // 设置每个 tab 和 panel
    tabs.forEach((tab, index) => {
      const panel = panels[index];
      if (!panel) return;

      // 生成唯一 ID
      const tabId = `tab-${Date.now()}-${index}`;
      const panelId = `panel-${Date.now()}-${index}`;

      // 设置 tab 属性
      tab.setAttribute('role', 'tab');
      tab.setAttribute('id', tabId);
      tab.setAttribute('aria-controls', panelId);
      tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      // 设置 panel 属性
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('id', panelId);
      panel.setAttribute('aria-labelledby', tabId);
      panel.setAttribute('tabindex', '0');
    });

    console.log('ARIAManager: 标签页结构已设置', {
      tabCount: tabs.length,
      panelCount: panels.length
    });
  }

  /**
   * 更新 aria-expanded 状态
   * @param {HTMLElement} element - 元素
   * @param {boolean} isExpanded - 是否展开
   */
  updateAriaExpanded(element, isExpanded) {
    if (!element) return;
    element.setAttribute('aria-expanded', isExpanded.toString());
  }

  /**
   * 更新 aria-hidden 状态
   * @param {HTMLElement} element - 元素
   * @param {boolean} isHidden - 是否隐藏
   */
  updateAriaHidden(element, isHidden) {
    if (!element) return;
    
    if (isHidden) {
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('aria-hidden');
    }
  }

  /**
   * 设置当前项指示器
   * @param {HTMLElement} element - 当前项元素
   */
  setAriaCurrent(element) {
    if (!element) return;
    element.setAttribute('aria-current', 'true');
  }

  /**
   * 移除当前项指示器
   * @param {HTMLElement} element - 元素
   */
  removeAriaCurrent(element) {
    if (!element) return;
    element.removeAttribute('aria-current');
  }

  /**
   * 销毁管理器
   */
  destroy() {
    // 移除 live regions
    if (this.liveRegionPolite && this.liveRegionPolite.parentNode) {
      this.liveRegionPolite.parentNode.removeChild(this.liveRegionPolite);
    }
    if (this.liveRegionAssertive && this.liveRegionAssertive.parentNode) {
      this.liveRegionAssertive.parentNode.removeChild(this.liveRegionAssertive);
    }

    this.liveRegionPolite = null;
    this.liveRegionAssertive = null;
    this.drawer = null;
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ARIAManager;
}

// 全局注册
if (typeof window !== 'undefined') {
  window.ARIAManager = ARIAManager;
}
