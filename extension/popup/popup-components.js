/**
 * Popup页面组件化初始化脚本
 * 负责初始化组件、管理组件状态和事件处理
 *
 * 注意：此文件目前仅用于组件引用，实际组件初始化在popup.js中进行
 */

// Popup页面管理器（暂时禁用，因为依赖的组件还未完全实现）
class PopupManager {
  constructor() {
    this.components = {};
    console.log('PopupManager: 组件管理器已创建（功能暂时禁用）');
  }
}

// 初始化Popup管理器
const popupManager = new PopupManager();

// 导出Popup管理器（用于调试）
window.popupManager = popupManager;
