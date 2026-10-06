# Review Queue Manager

复习队列管理器 - 使用MinHeap和Ebbinghaus遗忘曲线实现智能复习调度

## 概述

`ReviewQueueManager` 是一个高效的复习队列管理系统，使用最小堆（MinHeap）数据结构维护单词复习优先级，基于科学的Ebbinghaus遗忘曲线算法计算最佳复习时机。

## 核心特性

- ✅ **O(log n) 性能**: 所有核心操作（添加、获取、更新）都是对数时间复杂度
- ✅ **科学算法**: 基于Ebbinghaus遗忘曲线的优先级计算
- ✅ **持久化存储**: 自动保存到Chrome Storage，支持断点恢复
- ✅ **智能调度**: 根据复习次数、难度和时间间隔动态调整优先级
- ✅ **内存优化**: 队列大小限制和LRU淘汰策略
- ✅ **错误恢复**: 完善的错误处理和数据验证机制

## 快速开始

### 基本使用

```javascript
// 创建管理器实例
const reviewQueue = new ReviewQueueManager({
  persistDelay: 1000,      // 持久化防抖延迟（毫秒）
  maxQueueSize: 1000,      // 最大队列大小
  storageKey: 'review_queue_v1'  // Chrome Storage键名
});

// 加载已保存的队列
await reviewQueue.load();

// 添加单词到复习队列
reviewQueue.addWord({
  word: 'example',
  lastReviewTime: Date.now(),
  reviewCount: 0,
  difficulty: 1.0,
  metadata: { source: 'reading' }
});

// 获取下一个需要复习的单词
const nextWord = reviewQueue.getNextReview();
if (nextWord) {
  console.log('Time to review:', nextWord.word);
}

// 复习后更新
reviewQueue.updateAfterReview('example', true); // true = 回答正确

// 标记为已掌握
reviewQueue.markAsMastered('example');

// 获取统计信息
const stats = reviewQueue.getStats();
console.log('Queue stats:', stats);
```

### 批量操作

```javascript
// 批量添加单词（性能优化）
const words = [
  { word: 'hello', reviewCount: 0, difficulty: 1.0 },
  { word: 'world', reviewCount: 1, difficulty: 1.2 },
  { word: 'test', reviewCount: 2, difficulty: 1.5 }
];
reviewQueue.batchAdd(words);
```

## API 参考

### 构造函数

```javascript
new ReviewQueueManager(config)
```

**参数:**
- `config.persistDelay` (number): 持久化防抖延迟，默认1000ms
- `config.maxQueueSize` (number): 最大队列大小，默认1000
- `config.storageKey` (string): Chrome Storage键名，默认'review_queue_v1'

### 核心方法

#### addWord(wordData)

添加单词到复习队列。

**参数:**
```javascript
{
  word: string,           // 必需：单词
  lastReviewTime: number, // 上次复习时间（时间戳）
  reviewCount: number,    // 复习次数
  difficulty: number,     // 难度等级（1.0-2.0）
  metadata: Object        // 可选：额外元数据
}
```

**时间复杂度:** O(log n)

#### batchAdd(words)

批量添加单词（优化版本）。

**参数:**
- `words` (Array): 单词数据数组

**时间复杂度:** O(n log n)，但比单独调用addWord快

#### getNextReview()

获取下一个需要复习的单词。

**返回值:**
- 复习项对象，如果没有到期的单词则返回null

**时间复杂度:** O(log n)

#### updateAfterReview(word, correct)

复习后更新单词状态。

**参数:**
- `word` (string): 单词
- `correct` (boolean): 是否回答正确

**行为:**
- 正确答案：增加复习次数，降低难度
- 错误答案：增加难度

**时间复杂度:** O(log n)

#### calculatePriority(wordData)

计算单词的复习优先级。

**公式:**
```
priority = -daysSinceReview / (2^reviewCount * difficulty)
```

**特殊情况:**
- 首次复习: priority = 1.0
- 已掌握: priority = Infinity

**返回值:** 优先级分数（越小越优先）

#### markAsMastered(word)

标记单词为已掌握。

**参数:**
- `word` (string): 单词

**效果:** 将优先级设置为Infinity，不再出现在复习队列中

### 持久化方法

#### persist()

将队列序列化并保存到Chrome Storage。

**特性:**
- 自动防抖（避免频繁写入）
- 队列大小限制（超过maxQueueSize时只保存优先级最高的项）
- 错误处理和配额管理

**返回值:** Promise<void>

#### load()

从Chrome Storage加载队列。

**特性:**
- 数据格式验证
- 版本兼容性检查
- 自动迁移旧版本数据
- 错误恢复

**返回值:** Promise<boolean> - 是否成功加载

#### reset()

重置队列（清空所有数据）。

**效果:**
- 清空内存数据
- 清空持久化数据
- 重置统计信息

### 统计方法

#### getStats()

获取队列统计信息。

**返回值:**
```javascript
{
  // 队列基本信息
  totalWords: number,      // 总单词数
  heapSize: number,        // 堆大小
  dueNow: number,          // 当前到期数量
  dueToday: number,        // 今天到期数量
  masteredCount: number,   // 已掌握数量
  activeCount: number,     // 活跃单词数
  
  // 优先级统计
  avgPriority: string,     // 平均优先级
  minPriority: string,     // 最小优先级
  maxPriority: string,     // 最大优先级
  
  // 复习统计
  avgReviewCount: string,  // 平均复习次数
  avgDifficulty: string,   // 平均难度
  
  // 内存和性能
  memoryUsage: number,     // 内存使用（字节）
  memoryUsageFormatted: string,  // 格式化的内存使用
  
  // 操作性能统计
  performance: {
    addCount: number,      // 添加操作次数
    updateCount: number,   // 更新操作次数
    getCount: number,      // 获取操作次数
    avgAddTime: string,    // 平均添加时间
    avgUpdateTime: string, // 平均更新时间
    avgGetTime: string     // 平均获取时间
  },
  
  // 元数据
  version: string,         // 版本号
  lastModified: number,    // 最后修改时间
  lastModifiedFormatted: string  // 格式化的修改时间
}
```

#### checkMemoryThreshold(thresholdMB)

检查内存使用是否超过阈值。

**参数:**
- `thresholdMB` (number): 阈值（MB），默认10

**返回值:** boolean - 是否超过阈值

## Ebbinghaus遗忘曲线算法

### 优先级计算

```javascript
priority = -daysSinceReview / (2^reviewCount * difficulty)
```

**变量说明:**
- `daysSinceReview`: 距离上次复习的天数
- `reviewCount`: 复习次数（指数增长因子）
- `difficulty`: 难度系数（1.0 = 简单，2.0 = 困难）

**原理:**
- 复习次数越多，下次复习间隔越长（指数增长）
- 难度越高，复习频率越高
- 时间越久，优先级越高（需要复习）

### 下次复习时间

```javascript
intervalDays = 2^reviewCount / difficulty
nextReviewTime = now + intervalDays * 24 * 60 * 60 * 1000
```

**示例:**
- 第1次复习后: 2^1 / 1.0 = 2天后
- 第2次复习后: 2^2 / 1.0 = 4天后
- 第3次复习后: 2^3 / 1.0 = 8天后
- 第4次复习后: 2^4 / 1.0 = 16天后

## 性能特性

### 时间复杂度

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| addWord() | O(log n) | 堆插入操作 |
| getNextReview() | O(log n) | 堆提取最小值 |
| updateAfterReview() | O(log n) | 删除+插入 |
| batchAdd() | O(n log n) | 批量插入，但有优化 |
| calculatePriority() | O(1) | 纯计算 |
| getStats() | O(n) | 遍历所有项 |

### 性能目标

- 单次操作 < 2ms（500个单词）
- 批量添加比单独添加快30%以上
- 序列化 < 50ms（500个单词）
- 反序列化 < 100ms（500个单词）

### 内存使用

- 每个复习项约 200-300 字节
- 500个单词约 100-150 KB
- 1000个单词约 200-300 KB
- 内存开销 < 120%（相比原始数据）

## 错误处理

### 加载失败

```javascript
const loaded = await reviewQueue.load();
if (!loaded) {
  console.log('Failed to load, starting with empty queue');
  // 队列会自动初始化为空
}
```

### 数据损坏

- 自动检测损坏的数据
- 记录错误日志
- 清空损坏数据，重新开始
- 不影响核心功能

### 存储配额超限

- 自动检测QuotaExceededError
- 减少队列大小到一半
- 只保留优先级最高的项
- 重试持久化

## 集成示例

### 与learning-manager.js集成

```javascript
// 在learning-manager.js中
class LearningManager {
  constructor() {
    this.reviewQueue = new ReviewQueueManager();
  }

  async init() {
    await this.reviewQueue.load();
  }

  async startReviewSession() {
    const word = this.reviewQueue.getNextReview();
    if (!word) {
      console.log('No words to review!');
      return;
    }
    
    // 显示单词给用户
    this.showWord(word);
  }

  async submitAnswer(word, correct) {
    this.reviewQueue.updateAfterReview(word, correct);
    
    // 继续下一个
    this.startReviewSession();
  }
}
```

### 与dashboard.js集成

```javascript
// 在dashboard.js中显示统计
async function updateDashboard() {
  const stats = reviewQueue.getStats();
  
  document.getElementById('total-words').textContent = stats.totalWords;
  document.getElementById('due-now').textContent = stats.dueNow;
  document.getElementById('due-today').textContent = stats.dueToday;
  document.getElementById('mastered').textContent = stats.masteredCount;
  
  // 显示性能指标
  console.log('Average add time:', stats.performance.avgAddTime);
}
```

## 最佳实践

### 1. 初始化时加载数据

```javascript
const reviewQueue = new ReviewQueueManager();
await reviewQueue.load();
```

### 2. 使用批量操作

```javascript
// 好 ✓
reviewQueue.batchAdd(words);

// 不好 ✗
words.forEach(word => reviewQueue.addWord(word));
```

### 3. 定期检查内存

```javascript
if (reviewQueue.checkMemoryThreshold(10)) {
  console.warn('Memory usage high, consider cleanup');
}
```

### 4. 处理加载失败

```javascript
const loaded = await reviewQueue.load();
if (!loaded) {
  // 从其他来源重建队列
  await rebuildQueueFromWordList();
}
```

### 5. 监控性能

```javascript
const stats = reviewQueue.getStats();
console.log('Performance:', stats.performance);
```

## 故障排查

### 问题：队列为空但应该有单词

**解决方案:**
1. 检查是否调用了load()
2. 检查Chrome Storage中的数据
3. 检查是否有错误日志

### 问题：内存使用过高

**解决方案:**
1. 检查队列大小：`stats.totalWords`
2. 减少maxQueueSize配置
3. 清理已掌握的单词

### 问题：持久化失败

**解决方案:**
1. 检查Chrome Storage配额
2. 查看错误日志
3. 尝试reset()后重建

### 问题：性能下降

**解决方案:**
1. 检查队列大小
2. 使用batchAdd而不是单独添加
3. 检查是否有内存泄漏

## 版本历史

### v1.0.0 (2026-01-29)
- ✅ 初始版本
- ✅ MinHeap实现
- ✅ Ebbinghaus算法
- ✅ 持久化支持
- ✅ 统计和监控
- ✅ 错误处理

## 相关文档

- [Heap实现](./heap.js)
- [Word Index Manager](./WORD_INDEX_MANAGER_README.md)
- [设计文档](../../.kiro/specs/data-structure-optimization/design.md)
- [需求文档](../../.kiro/specs/data-structure-optimization/requirements.md)

## 许可证

MIT License
