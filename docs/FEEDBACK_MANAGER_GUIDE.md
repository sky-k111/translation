# FeedbackManager 使用指南

## 概述

FeedbackManager 是一个轻量级的交互反馈系统，为你的扩展提供丰富的视觉反馈和流畅的微动画。

## 快速开始

### 基础使用

```javascript
// FeedbackManager 已自动初始化，直接使用
const feedback = window.feedbackManager;

// 显示 Toast 通知
feedback.showToast('操作成功！', 'success');
feedback.showToast('出错了', 'error');
feedback.showToast('请注意', 'warning');
feedback.showToast('提示', 'info');

// 添加动画效果
feedback.pulse('#myButton');      // 脉冲
feedback.shake('.error-field');   // 摇晃
feedback.bounce('.success-icon'); // 弹跳
feedback.rotate('.refresh-btn');  // 旋转
```

## 功能列表

### 1. Toast 通知

```javascript
// 基础用法
feedback.showToast(message, type, duration);

// 示例
feedback.showToast('保存成功', 'success', 3000);
```

**参数：**
- `message`: 提示文字
- `type`: 类型 (`'success'` | `'error'` | `'warning'` | `'info'`)
- `duration`: 持续时间（毫秒），默认 3000

### 2. 动画效果

```javascript
// 脉冲效果
feedback.pulse(element);

// 摇晃效果
feedback.shake(element);

// 弹跳效果
feedback.bounce(element);

// 旋转效果
feedback.rotate(element);
```

**参数：**
- `element`: CSS 选择器字符串或 DOM 元素

### 3. 浮动文字

```javascript
// 在指定位置显示浮动文字
feedback.showFloatingText(text, x, y);

// 示例：在按钮位置显示
const button = document.querySelector('.star-btn');
const rect = button.getBoundingClientRect();
feedback.showFloatingText('+1 收藏', rect.left + rect.width / 2, rect.top);
```

### 4. 进度指示器

```javascript
// 简单进度
const progress = feedback.showProgress('加载中...');
// ... 执行操作
progress.close();

// 多步骤进度
const progress = feedback.showProgress('处理中...', [
  '步骤 1: 准备数据',
  '步骤 2: 处理数据',
  '步骤 3: 保存结果'
]);

progress.updateStep(0);  // 显示步骤 1
await step1();

progress.updateStep(1);  // 显示步骤 2
await step2();

progress.close();
```

### 5. 成功动画

```javascript
// 显示成功动画（带对勾图标）
feedback.showSuccess('操作成功！', 2000);
```

### 6. 加载骨架屏

```javascript
// 在容器中显示骨架屏
feedback.showSkeleton('#content', {
  lines: 5,        // 行数
  height: '60px',  // 每行高度
  spacing: '12px'  // 行间距
});

// 数据加载完成后，直接替换内容
document.querySelector('#content').innerHTML = '实际内容';
```

### 7. 按钮加载状态

```javascript
const button = document.querySelector('#submitBtn');

// 开始加载
feedback.setButtonLoading(button, true);

// 执行异步操作
await someOperation();

// 结束加载
feedback.setButtonLoading(button, false);
```

## 实战示例

### 示例 1: 保存数据

```javascript
async function saveData() {
  const button = document.querySelector('#saveBtn');
  
  feedback.setButtonLoading(button, true);
  
  try {
    await chrome.storage.local.set({ data: 'value' });
    feedback.showSuccess('保存成功！');
    feedback.bounce(button);
  } catch (error) {
    feedback.showToast('保存失败', 'error');
    feedback.shake(button);
  } finally {
    feedback.setButtonLoading(button, false);
  }
}
```

### 示例 2: 搜索功能

```javascript
const searchInput = document.querySelector('#search');
let timeout;

searchInput.addEventListener('input', (e) => {
  clearTimeout(timeout);
  
  feedback.showSkeleton('#results', { lines: 3, height: '60px' });
  
  timeout = setTimeout(async () => {
    const results = await search(e.target.value);
    displayResults(results);
    feedback.pulse('#results');
  }, 500);
});
```

### 示例 3: 收藏功能

```javascript
document.addEventListener('click', (e) => {
  const starBtn = e.target.closest('.star-btn');
  if (!starBtn) return;
  
  const isStarred = starBtn.classList.toggle('starred');
  
  if (isStarred) {
    feedback.bounce(starBtn);
    const rect = starBtn.getBoundingClientRect();
    feedback.showFloatingText('+1 收藏', rect.left + rect.width / 2, rect.top);
  } else {
    feedback.shake(starBtn);
  }
});
```

### 示例 4: 翻译进度

```javascript
async function translateWord(word) {
  const progress = feedback.showProgress(`正在翻译 "${word}"`, [
    '正在查询词典...',
    '正在获取释义...',
    '正在加载例句...'
  ]);
  
  try {
    progress.updateStep(0);
    const dictionary = await queryDictionary(word);
    
    progress.updateStep(1);
    const meanings = await getMeanings(word);
    
    progress.updateStep(2);
    const examples = await getExamples(word);
    
    progress.close();
    feedback.showSuccess('翻译完成！');
    
    return { dictionary, meanings, examples };
  } catch (error) {
    progress.close();
    feedback.showToast('翻译失败：' + error.message, 'error');
  }
}
```

## EnhancedUXManager

EnhancedUXManager 是一个全局管理器，自动集成了 FeedbackManager 并提供了一些便捷方法。

### 访问方式

```javascript
const uxManager = window.enhancedUXManager;
const feedback = uxManager.feedbackManager;
```

### 快捷方法

```javascript
// 显示提示
uxManager.showSuccess('操作成功！');
uxManager.showError('操作失败');
uxManager.showWarning('请注意');
uxManager.showInfo('提示信息');

// 显示翻译进度
const progress = uxManager.showTranslationProgress('hello');
```

### 自动增强

EnhancedUXManager 会自动为以下元素添加增强效果：

1. **收藏按钮** - 自动添加弹跳和浮动文字
2. **学习按钮** - 自动添加脉冲效果
3. **搜索框** - 自动添加搜索状态
4. **统计卡片** - 自动添加点击反馈
5. **闪卡** - 自动添加翻转动画
6. **测验选项** - 自动添加正确/错误反馈

## 最佳实践

### 1. 性能优化

```javascript
// ✅ 好的做法：使用防抖
let timeout;
element.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    feedback.showSkeleton('#results');
  }, 300);
});

// ❌ 避免：频繁触发动画
element.addEventListener('mousemove', () => {
  feedback.pulse(element); // 会导致性能问题
});
```

### 2. 用户体验

```javascript
// ✅ 好的做法：提供明确的反馈
button.addEventListener('click', async () => {
  feedback.setButtonLoading(button, true);
  try {
    await operation();
    feedback.showSuccess('操作成功！');
  } catch (error) {
    feedback.showError('操作失败：' + error.message);
  } finally {
    feedback.setButtonLoading(button, false);
  }
});

// ❌ 避免：没有反馈
button.addEventListener('click', async () => {
  await operation(); // 用户不知道发生了什么
});
```

### 3. 动画使用

```javascript
// ✅ 好的做法：适度使用动画
feedback.bounce('.success-icon');  // 成功时弹跳一次

// ❌ 避免：过度使用动画
setInterval(() => {
  feedback.bounce('.icon');  // 持续弹跳会让用户分心
}, 1000);
```

## API 参考

### FeedbackManager

```typescript
class FeedbackManager {
  // Toast 通知
  showToast(message: string, type: 'success'|'error'|'warning'|'info', duration?: number): void
  
  // 动画效果
  pulse(element: string | HTMLElement): void
  shake(element: string | HTMLElement): void
  bounce(element: string | HTMLElement): void
  rotate(element: string | HTMLElement): void
  
  // 浮动文字
  showFloatingText(text: string, x: number, y: number): void
  
  // 进度指示器
  showProgress(message: string, steps?: string[]): ProgressController
  hideProgress(): void
  
  // 成功动画
  showSuccess(message: string, duration?: number): void
  
  // 加载骨架屏
  showSkeleton(container: string | HTMLElement, config?: SkeletonConfig): HTMLElement
  
  // 按钮加载状态
  setButtonLoading(button: string | HTMLElement, loading: boolean): void
}
```

### ProgressController

```typescript
interface ProgressController {
  updateMessage(message: string): void
  updateStep(stepIndex: number): void
  close(): void
}
```

### SkeletonConfig

```typescript
interface SkeletonConfig {
  lines?: number      // 行数，默认 3
  height?: string     // 每行高度，默认 '16px'
  spacing?: string    // 行间距，默认 '12px'
}
```

## 故障排查

### 问题 1: 动画不生效

```javascript
// 检查元素是否存在
const element = document.querySelector('#myElement');
console.log('Element exists:', !!element);

// 检查 FeedbackManager 是否加载
console.log('FeedbackManager loaded:', !!window.feedbackManager);
```

### 问题 2: Toast 被遮挡

```css
/* 增加 z-index */
.feedback-toast {
  z-index: 10003 !important;
}
```

### 问题 3: 样式冲突

确保 FeedbackManager 的样式在其他样式之后加载，或使用更高的优先级。

## 相关资源

- [模块验证文档](./MODULE_VALIDATION.md)
- [组件文档](./architecture/04_开发规范/组件文档.md)
- [样式规范](./architecture/05_样式指南/样式规范文档.md)

---

**需要帮助？** 查看代码注释或联系开发团队。
