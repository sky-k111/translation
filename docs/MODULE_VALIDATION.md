# 模块加载验证系统

## 概述

增强的模块加载验证系统提供了完整的模块依赖检查、错误处理和降级方案，确保插件在各种环境下都能稳定运行。

## 核心功能

### 1. 模块分级验证

模块按重要性分为三个级别：

- **核心模块 (Critical)**: 必须加载，缺失会导致插件无法运行
  - `moduleManager`: 模块管理器
  - `AdvancedCache`: 高级缓存系统

- **重要模块 (Important)**: 影响主要功能，缺失会发出警告
  - `themeManager`: 主题管理器
  - `neteaseTranslateService`: 网易翻译服务

- **可选模块 (Optional)**: 增强功能，缺失不影响基本使用
  - `performanceMonitor`: 性能监控器

### 2. 验证流程

```javascript
// 1. 配置验证规则
const MODULE_VALIDATION_CONFIG = {
  critical: [...],
  important: [...],
  optional: [...],
  maxWaitTime: 5000,
  checkInterval: 100
};

// 2. 创建验证器
const validator = new ModuleValidator(config);

// 3. 执行验证
const results = validator.validateAll();

// 4. 生成报告
const report = validator.generateReport();
```

### 3. 验证报告示例

```
========== 模块加载验证报告 ==========
验证时间: 234ms

【核心模块】
  ✓ 已加载 (2): moduleManager, AdvancedCache

【重要模块】
  ✓ 已加载 (1): themeManager
  ⚠ 缺失 (1): neteaseTranslateService

【可选模块】
  ✓ 已加载 (1): performanceMonitor

======================================
```

## 错误处理

### 超时处理

如果模块加载超过 `maxWaitTime` (默认5秒)，系统会：
1. 生成详细的验证报告
2. 记录错误日志
3. 拒绝初始化Promise

```javascript
try {
  await waitForModules();
} catch (error) {
  console.error('模块加载超时！', error);
  // 启用降级模式
  await enableFallbackMode();
}
```

### 降级模式

当核心模块加载失败时，系统会自动启用降级模式：

```javascript
async function enableFallbackMode() {
  window.EXTENSION_FALLBACK_MODE = true;
  window.EXTENSION_FEATURES = {
    advancedCache: false,
    themeManager: false,
    performanceMonitor: false,
    aiTranslation: false
  };
}
```

降级模式下：
- 禁用高级缓存
- 禁用主题管理
- 禁用性能监控
- 禁用AI翻译
- 仅保留基本翻译功能

## 使用方法

### 添加新模块

1. 在 `MODULE_VALIDATION_CONFIG` 中添加模块配置：

```javascript
const MODULE_VALIDATION_CONFIG = {
  critical: [
    { name: 'newModule', path: 'window.newModule', type: 'object' }
  ]
};
```

2. 在 `initModules` 函数中注册模块：

```javascript
const moduleRegistrations = [
  { name: 'newModule', instance: () => window.newModule, required: true }
];
```

### 检查初始化状态

```javascript
// 检查插件是否已初始化
if (window.EXTENSION_INITIALIZED) {
  console.log('插件已初始化');
  console.log('初始化时间:', window.EXTENSION_INIT_TIME);
}

// 检查是否在降级模式
if (window.EXTENSION_FALLBACK_MODE) {
  console.log('插件运行在降级模式');
  console.log('可用功能:', window.EXTENSION_FEATURES);
}
```

## 调试技巧

### 1. 启用详细日志

所有验证步骤都会输出到控制台，包括：
- 模块检查进度
- 验证结果
- 注册状态
- 初始化结果

### 2. 使用测试工具

运行模块验证测试：

```javascript
// 在浏览器控制台中
const script = document.createElement('script');
script.src = chrome.runtime.getURL('extension/utils/module-validator-test.js');
document.head.appendChild(script);
```

### 3. 手动触发验证

```javascript
// 重新运行模块验证
const validator = new ModuleValidator(MODULE_VALIDATION_CONFIG);
const results = validator.validateAll();
console.log(validator.generateReport());
```

## 性能考虑

- **检查间隔**: 100ms，平衡响应速度和CPU使用
- **最大等待时间**: 5秒，避免无限等待
- **验证开销**: 每次检查约 1-2ms
- **内存占用**: 验证器对象约 1KB

## 常见问题

### Q: 为什么模块加载超时？

A: 可能原因：
1. manifest.json 中的脚本加载顺序不正确
2. 某个模块文件加载失败（404错误）
3. 模块初始化代码有错误

解决方法：
1. 检查浏览器控制台的错误信息
2. 确认所有脚本文件都存在
3. 验证 manifest.json 中的 content_scripts 顺序

### Q: 如何禁用某个模块的验证？

A: 将模块从 `critical` 移到 `optional`，或完全移除：

```javascript
const MODULE_VALIDATION_CONFIG = {
  optional: [
    { name: 'optionalModule', path: 'window.optionalModule', type: 'object' }
  ]
};
```

### Q: 降级模式下哪些功能可用？

A: 降级模式下仅保留：
- 基本文本选择
- 简单翻译（使用备用API）
- 基本缓存（localStorage）
- 翻译历史记录

## 更新日志

### v2.0.0 (2026-01-27)
- ✨ 新增模块分级验证系统
- ✨ 新增详细的验证报告
- ✨ 新增降级模式支持
- ✨ 新增超时处理机制
- 🐛 修复模块加载顺序问题
- 📝 完善错误日志记录

## 相关文档

- [项目结构](../README.md)
- [开发规范](./architecture/04_开发规范/组件文档.md)
- [故障排查指南](./HOW_TO_RELOAD_EXTENSION.md)
