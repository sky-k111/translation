/**
 * 组件库入口文件
 * 导出所有组件、工具和样式
 */

// 组件工具
import { BaseComponent } from './utils/BaseComponent.js';
import componentRegistry from './utils/component-registry.js';
import styleManager from './utils/style-manager.js';
import eventBus from './utils/event-bus.js';

// 导出组件工具
export {
  BaseComponent,
  componentRegistry,
  styleManager,
  eventBus
};

// 导出默认的组件工具
export default {
  BaseComponent,
  componentRegistry,
  styleManager,
  eventBus
};

// 导出全局变量
if (typeof window !== 'undefined') {
  window.BaseComponent = BaseComponent;
  window.componentRegistry = componentRegistry;
  window.styleManager = styleManager;
  window.eventBus = eventBus;
}