# Popup 功能验证清单

## 快速验证步骤

### 1️⃣ 重新加载扩展
```
1. 打开 chrome://extensions/
2. 找到"单词翻译助手"
3. 点击刷新按钮 🔄
```

### 2️⃣ 验证首页统计数据

**打开 Popup 页面**，检查右侧学习面板：

- [ ] **今日学习** 显示数字（如 "今日学习：5"）
- [ ] **掌握程度** 显示百分比（如 "掌握程度：30%"）
- [ ] **待复习** 显示数字（如 "待复习：10"）

❌ **错误状态**（修复前）:
```
今日学习：0
掌握程度：0%
待复习：0
```

✅ **正确状态**（修复后）:
```
今日学习：5
掌握程度：30%
待复习：10
```

### 3️⃣ 验证 Dashboard 按钮

**在学习面板右上角**，找到 Dashboard 图标按钮：

```
┌─────────────────────────┐
│ 单词学习            [📊] │  ← 点击这个按钮
└─────────────────────────┘
```

- [ ] 点击 Dashboard 按钮
- [ ] 应该跳转到 `dashboard.html` 页面
- [ ] Dashboard 页面正常显示

### 4️⃣ 验证单词列表

**在首页左侧**，点击任意统计卡片：

```
┌──────────┐  ┌──────────┐
│ 单词     │  │ 词组     │
│ 150      │  │ 45       │
└──────────┘  └──────────┘
     ↑ 点击这里
```

- [ ] 点击"单词"卡片 → 显示单词列表
- [ ] 点击"词组"卡片 → 显示词组列表
- [ ] 点击"句子"卡片 → 显示句子列表
- [ ] 点击"星标单词"卡片 → 显示星标列表

### 5️⃣ 验证学习按钮

**在学习面板中**，点击学习按钮：

- [ ] 点击"开始学习" → 进入模式选择页面
- [ ] 点击"复习难点" → 进入模式选择页面
- [ ] 点击"每日挑战" → 进入模式选择页面

### 6️⃣ 检查控制台错误

**打开开发者工具**:
```
1. 右键点击 Popup 页面
2. 选择"检查"
3. 切换到 Console 标签
```

- [ ] 无红色错误信息
- [ ] 无 `wordsData is not defined` 错误
- [ ] 无 `Cannot read property of undefined` 错误

## 常见问题排查

### 问题：统计数据仍然显示 0

**可能原因**: 没有翻译记录

**解决方案**:
1. 打开任意网页
2. 选中一个英文单词
3. 等待翻译弹窗出现
4. 返回 Popup 页面，统计数据应该更新

### 问题：Dashboard 按钮找不到

**位置**: 学习面板右上角，"单词学习"标题旁边

**图标**: 📊 (四个方块组成的仪表盘图标)

### 问题：单词列表为空

**检查步骤**:
1. 打开 Chrome DevTools
2. 切换到 Application 标签
3. 展开 Storage → Local Storage
4. 选择扩展的 URL
5. 查找 `translatedWords` 键
6. 检查是否有数据

**如果没有数据**: 需要先翻译一些单词

## 修复文件清单

以下文件已被修改：

- ✅ `extension/popup/modules/home-manager.js`
- ✅ `extension/popup/modules/learning-stats.js`

以下文件未修改（无需担心）：

- ⚪ `extension/popup/popup.html`
- ⚪ `extension/popup/modules/init-manager.js`
- ⚪ `extension/popup/modules/data-manager.js`
- ⚪ `extension/popup/modules/page-manager.js`

## 技术细节

### 修复 1: 保留 HTML 结构

**修复前**:
```javascript
// home-manager.js 完全替换 HTML
learningContent.innerHTML = `
  <div class="learning-status-display">
    <span id="todayLearnedCount">...</span>
  </div>
`;
```

**修复后**:
```javascript
// home-manager.js 只绑定事件，不替换 HTML
const startLearningBtn = document.getElementById('startLearningBtn');
if (startLearningBtn && !startLearningBtn.dataset.bound) {
  startLearningBtn.addEventListener('click', handler);
  startLearningBtn.dataset.bound = 'true';
}
```

### 修复 2: 全局变量引用

**修复前**:
```javascript
// learning-stats.js
let totalWords = Object.keys(wordsData).length; // ❌ 可能未定义
```

**修复后**:
```javascript
// learning-stats.js
if (!window.wordsData) return; // ✅ 防御性检查
let totalWords = Object.keys(window.wordsData).length; // ✅ 明确全局作用域
```

## 需要帮助？

如果验证过程中遇到问题，请提供以下信息：

1. **浏览器版本**: chrome://version/
2. **扩展版本**: 在 chrome://extensions/ 中查看
3. **控制台错误**: 截图或复制错误信息
4. **复现步骤**: 详细描述操作步骤

## 相关文档

- 📄 `POPUP_FIX_SUMMARY.md` - 详细修复说明
- 📄 `CHANGELOG_DASHBOARD.md` - 版本变更日志
- 📄 `HOTFIX_GUIDE.md` - Service Worker 修复指南
