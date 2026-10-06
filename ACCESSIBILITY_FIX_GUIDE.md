# 可访问性模块修复指南

## 问题症状

- ✅ Dashboard 初始化失败
- ✅ 控制台错误：`this.keyboardManager.registerShortcut is not a function`
- ✅ 错误信息：`初始化失败: this.keyboardManager.registerShortcut is not a function`

## 快速修复（1 步）

### 🔄 重新加载扩展
```
1. 打开 chrome://extensions/
2. 找到"单词翻译助手"
3. 点击刷新按钮 🔄
4. 重新打开 Dashboard
```

## 问题原因

### KeyboardManager 的设计目的

`KeyboardManager` 是专门为 `WordDrawer` 组件设计的，用于处理单词抽屉的键盘交互：

```javascript
// KeyboardManager 的构造函数
class KeyboardManager {
  constructor(drawerInstance) {  // 需要 drawer 实例
    this.drawer = drawerInstance;
    this.enabled = false;
  }

  // 启用键盘快捷键
  enableKeyboardShortcuts() {
    // 监听键盘事件
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  // 处理 Escape 键 - 关闭抽屉
  handleEscape(event) {
    if (this.drawer && typeof this.drawer.hide === 'function') {
      this.drawer.hide();
    }
  }
}
```

**设计特点**:
- 需要传入 `drawerInstance` 参数
- 专门处理抽屉相关的键盘操作（Escape 关闭、方向键导航等）
- 没有通用的 `registerShortcut` 方法

### AccessibleDashboard 的错误使用

`AccessibleDashboard` 试图将 `KeyboardManager` 用作通用键盘管理器：

```javascript
// ❌ 错误的使用方式
async loadAccessibilityTools() {
    if (typeof KeyboardManager !== 'undefined') {
        this.keyboardManager = new KeyboardManager(); // ❌ 没有传入 drawer
    }
}

setupKeyboardNavigation() {
    if (this.keyboardManager) {
        this.keyboardManager.registerShortcut('Tab', ...); // ❌ 方法不存在
    }
}
```

**问题**:
1. `KeyboardManager` 构造函数需要 `drawerInstance` 参数，但没有传入
2. `KeyboardManager` 没有 `registerShortcut` 方法
3. 导致运行时错误：`registerShortcut is not a function`

## 修复方案

### 方案：直接使用原生事件监听器

不再依赖 `KeyboardManager`，直接使用原生的 `keydown` 事件：

```javascript
// ✅ 修复后的代码
setupKeyboardNavigation() {
    // 收集所有可聚焦元素
    this.updateFocusableElements();

    // 直接注册键盘事件监听器
    document.addEventListener('keydown', (e) => {
        this.handleKeyPress(e);
        this.handleShortcuts(e);
    });
}

handleShortcuts(e) {
    // 数字键：跳转到不同区域
    if (e.key === '1' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.focusSection('metrics');
    }

    if (e.key === '2' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.focusSection('analytics');
    }

    if (e.key === '3' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.focusSection('history');
    }

    // Escape 键：关闭模态框
    if (e.key === 'Escape') {
        this.closeModals();
    }
}
```

**优点**:
- 不依赖外部类
- 代码更简单直接
- 完全控制键盘行为
- 避免 API 不匹配问题

## 功能验证

### 键盘导航功能

Dashboard 支持以下键盘操作：

#### 1. Tab 键导航
- **Tab**: 聚焦下一个可交互元素
- **Shift+Tab**: 聚焦上一个可交互元素

#### 2. 方向键导航
在卡片上使用方向键：
- **←/↑**: 聚焦上一个卡片
- **→/↓**: 聚焦下一个卡片

#### 3. 快捷键
- **1**: 跳转到"学习统计概览"区域
- **2**: 跳转到"数据分析"区域
- **3**: 跳转到"学习历史和目标"区域
- **Escape**: 关闭模态框

#### 4. 激活元素
- **Enter**: 激活聚焦的按钮/链接
- **Space**: 激活聚焦的按钮

### 测试步骤

1. **打开 Dashboard**
   ```
   1. 点击扩展图标
   2. 点击 Dashboard 按钮
   ```

2. **测试 Tab 导航**
   ```
   1. 按 Tab 键
   2. 焦点应该依次移动到各个可交互元素
   3. 按 Shift+Tab 反向导航
   ```

3. **测试快捷键**
   ```
   1. 按数字键 1 → 跳转到统计区域
   2. 按数字键 2 → 跳转到分析区域
   3. 按数字键 3 → 跳转到历史区域
   ```

4. **测试模态框**
   ```
   1. 点击等级徽章打开模态框
   2. 按 Escape 键关闭模态框
   ```

5. **测试方向键**
   ```
   1. 聚焦到任意统计卡片
   2. 按方向键导航到其他卡片
   ```

## 技术细节

### 可聚焦元素

Dashboard 中的可聚焦元素包括：

```javascript
const selectors = [
    '.menu-item',        // 侧边栏菜单项
    '.stat-card',        // 统计卡片
    '.glass-panel',      // 玻璃面板
    'button',            // 所有按钮
    'a[href]',           // 所有链接
    'input',             // 输入框
    'select',            // 下拉框
    '[tabindex]:not([tabindex="-1"])' // 自定义 tabindex
];
```

### ARIA 标签

自动设置的 ARIA 标签：

```javascript
// 主要区域
{ selector: '.metrics-grid', role: 'region', label: '学习统计概览' }
{ selector: '.analytics-grid', role: 'region', label: '数据分析' }
{ selector: '.bottom-grid', role: 'region', label: '学习历史和目标' }
{ selector: '.glass-sidebar', role: 'navigation', label: '主导航' }

// 统计卡片
role: 'article'
aria-label: "单词: 150"

// 图表
role: 'img'
aria-label: "学习活跃度趋势"
```

### 焦点管理

```javascript
// 焦点可见性指示器
document.addEventListener('focusin', (e) => {
    e.target.classList.add('keyboard-focus');
});

document.addEventListener('focusout', (e) => {
    e.target.classList.remove('keyboard-focus');
});

// 区分鼠标和键盘操作
document.addEventListener('mousedown', () => {
    document.body.classList.add('using-mouse');
});

document.addEventListener('keydown', () => {
    document.body.classList.remove('using-mouse');
});
```

## 常见问题

### 问题 1: 快捷键不工作

**检查**:
1. 打开 Dashboard
2. 按 F12 打开开发者工具
3. 在 Console 中输入：
   ```javascript
   document.querySelector('.metrics-grid')
   ```
4. 应该返回元素对象

**解决**:
- 确保焦点在 Dashboard 页面上（点击页面任意位置）
- 不要在输入框中按快捷键

### 问题 2: Tab 键不工作

**检查**:
```javascript
// 在 Console 中运行
document.querySelectorAll('[tabindex="0"]').length
```

**应该返回**: > 0（有可聚焦元素）

**解决**:
- 重新加载扩展
- 检查是否有 JavaScript 错误

### 问题 3: 焦点指示器不显示

**检查 CSS**:
```css
.keyboard-focus {
    outline: 2px solid #38bdf8;
    outline-offset: 2px;
}
```

**解决**:
- 确保 `dashboard.css` 已加载
- 检查 CSS 是否被覆盖

## 架构说明

### KeyboardManager 的正确用法

`KeyboardManager` 应该只在 `WordDrawer` 中使用：

```javascript
// ✅ 正确的使用方式（在 WordDrawer 中）
class WordDrawerV2 {
    constructor(options) {
        this.keyboardManager = new KeyboardManager(this); // 传入 drawer 实例
        this.keyboardManager.enableKeyboardShortcuts();
    }
}
```

### AccessibleDashboard 的独立实现

`AccessibleDashboard` 应该有自己的键盘处理逻辑：

```javascript
// ✅ 正确的实现
class AccessibleDashboard {
    setupKeyboardNavigation() {
        // 直接使用原生事件
        document.addEventListener('keydown', (e) => {
            this.handleShortcuts(e);
        });
    }
}
```

## 修改的文件

- ✅ `extension/popup/modules/accessible-dashboard.js` - 移除 KeyboardManager 依赖

## 未修改的文件

- ⚪ `extension/utils/accessibility/KeyboardManager.js` - 保持不变（用于 WordDrawer）
- ⚪ `extension/components/complex/word-drawer-v2.js` - 保持不变

## 版本信息

- **修复版本**: v2.1.4
- **修复日期**: 2026-02-02
- **影响范围**: Dashboard 可访问性功能
- **向后兼容**: 是

## 相关文档

- 📄 `CHANGELOG_DASHBOARD.md` - 完整变更日志
- 📄 `DASHBOARD_FIX_GUIDE.md` - Dashboard 修复指南
- 📄 `COMPLETE_FIX_VERIFICATION.md` - 完整验证清单
