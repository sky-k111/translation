# 缓存使用指南

> 快速上手优化后的LRU缓存系统

## 快速开始

### 1. 基本使用

```javascript
// 创建缓存实例
const translationCache = new AdvancedCache('translation', 500);

// 设置缓存
translationCache.set('hello', {
  translation: '你好',
  phonetic: 'həˈləʊ',
  timestamp: Date.now()
});

// 获取缓存
const cached = translationCache.get('hello');
if (cached) {
  console.log('翻译:', cached.translation);
} else {
  console.log('缓存未命中');
}
```

### 2. 在Background Script中使用

```javascript
// extension/background/background.js

// 创建全局缓存实例
const translationCache = new AdvancedCache('translation', 500, 7 * 24 * 60 * 60 * 1000, true);

// 翻译函数（带缓存）
async function translateWithCache(text, context) {
  // 1. 检查缓存
  const cacheKey = `${text}_${context || ''}`;
  const cached = translationCache.get(cacheKey);
  
  if (cached) {
    console.log('✅ 缓存命中:', text);
    return cached;
  }
  
  // 2. 缓存未命中，调用API
  console.log('❌ 缓存未命中，调用API:', text);
  const result = await translateWithAI(text, context);
  
  // 3. 保存到缓存
  translationCache.set(cacheKey, result);
  
  return result;
}

// 监听翻译请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translateWithCache(request.text, request.context)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 异步响应
  }
});
```

### 3. 缓存预热

```javascript
// 在扩展启动时预热缓存
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🔥 开始缓存预热...');
  
  await translationCache.warmup(
    // 获取高频词汇
    async (count) => {
      const result = await chrome.storage.local.get(['translatedWords']);
      const words = result.translatedWords || {};
      
      // 按使用次数排序
      return Object.entries(words)
        .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
        .slice(0, count)
        .map(([word]) => word);
    },
    // 翻译函数
    async (word) => {
      return await translateWithAI(word);
    },
    100 // 预热100个高频词汇
  );
  
  console.log('✅ 缓存预热完成');
});
```

### 4. 定期维护

```javascript
// 定期检查并清理持久化存储
setInterval(async () => {
  await translationCache.checkAndCleanPersistentStorage();
  
  // 显示统计信息
  const stats = translationCache.getStats();
  console.log('📊 缓存统计:', {
    size: translationCache.size(),
    hitRate: (stats.hitRate * 100).toFixed(2) + '%',
    hits: stats.hits,
    misses: stats.misses
  });
}, 60 * 60 * 1000); // 每小时
```

## 高级用法

### 多个缓存实例

```javascript
// 不同类型的数据使用不同的缓存
const translationCache = new AdvancedCache('translation', 500);
const definitionCache = new AdvancedCache('definition', 200);
const exampleCache = new AdvancedCache('example', 300);

// 翻译缓存
translationCache.set('hello', { translation: '你好' });

// 释义缓存
definitionCache.set('hello', { 
  definitions: ['问候语', '打招呼'] 
});

// 例句缓存
exampleCache.set('hello', { 
  examples: ['Hello, world!', 'Say hello to everyone'] 
});
```

### 自定义过期时间

```javascript
// 短期缓存（1小时）
const tempCache = new AdvancedCache(
  'temp',
  100,
  60 * 60 * 1000,  // 1小时过期
  false            // 不持久化
);

// 长期缓存（30天）
const longTermCache = new AdvancedCache(
  'long-term',
  1000,
  30 * 24 * 60 * 60 * 1000,  // 30天过期
  true                        // 持久化
);
```

### 缓存统计和监控

```javascript
// 获取详细统计
function printCacheStats(cache) {
  const stats = cache.getStats();
  
  console.table({
    '缓存名称': cache.name,
    '当前大小': cache.size(),
    '最大容量': stats.maxSize,
    '命中次数': stats.hits,
    '未命中次数': stats.misses,
    '命中率': (stats.hitRate * 100).toFixed(2) + '%',
    '设置次数': stats.sets,
    '删除次数': stats.deletes,
    '清理次数': stats.cleanups,
    '上次清理': new Date(stats.lastCleanupTime).toLocaleString()
  });
}

// 定期打印统计
setInterval(() => {
  printCacheStats(translationCache);
}, 5 * 60 * 1000); // 每5分钟
```

### 性能监控和告警

```javascript
// 监控缓存性能
class CacheMonitor {
  constructor(cache, thresholds = {}) {
    this.cache = cache;
    this.thresholds = {
      minHitRate: 0.5,      // 最低命中率50%
      maxSize: 0.9,         // 最大容量90%
      ...thresholds
    };
  }
  
  check() {
    const stats = this.cache.getStats();
    const alerts = [];
    
    // 检查命中率
    if (stats.hitRate < this.thresholds.minHitRate) {
      alerts.push({
        level: 'warning',
        message: `缓存命中率过低: ${(stats.hitRate * 100).toFixed(2)}%`,
        suggestion: '考虑增加缓存容量或优化缓存策略'
      });
    }
    
    // 检查容量
    const usage = this.cache.size() / stats.maxSize;
    if (usage > this.thresholds.maxSize) {
      alerts.push({
        level: 'warning',
        message: `缓存接近容量上限: ${(usage * 100).toFixed(2)}%`,
        suggestion: '考虑增加缓存容量或减少过期时间'
      });
    }
    
    // 检查清理频率
    const timeSinceCleanup = Date.now() - stats.lastCleanupTime;
    if (timeSinceCleanup < 60000 && stats.cleanups > 10) {
      alerts.push({
        level: 'error',
        message: '缓存清理过于频繁',
        suggestion: '缓存容量可能过小，建议增加容量'
      });
    }
    
    return alerts;
  }
  
  startMonitoring(interval = 60000) {
    setInterval(() => {
      const alerts = this.check();
      
      alerts.forEach(alert => {
        if (alert.level === 'error') {
          console.error('❌', alert.message, '-', alert.suggestion);
        } else {
          console.warn('⚠️', alert.message, '-', alert.suggestion);
        }
      });
      
      if (alerts.length === 0) {
        console.log('✅ 缓存运行正常');
      }
    }, interval);
  }
}

// 使用监控器
const monitor = new CacheMonitor(translationCache, {
  minHitRate: 0.7,  // 要求70%命中率
  maxSize: 0.85     // 85%容量告警
});

monitor.startMonitoring(60000); // 每分钟检查一次
```

## 最佳实践

### 1. 缓存键设计

```javascript
// ❌ 不好的做法：键太简单，可能冲突
cache.set('word', data);

// ✅ 好的做法：包含上下文信息
cache.set(`word:${word}:context:${context}`, data);

// ✅ 更好的做法：使用哈希函数
function getCacheKey(word, context) {
  const str = `${word}|${context || ''}`;
  // 简单哈希（生产环境建议使用更好的哈希函数）
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return `trans_${hash}`;
}

cache.set(getCacheKey('hello', 'greeting'), data);
```

### 2. 错误处理

```javascript
async function safeGetCache(key) {
  try {
    return cache.get(key);
  } catch (error) {
    console.error('缓存读取失败:', error);
    return null;
  }
}

async function safeSetCache(key, value) {
  try {
    cache.set(key, value);
  } catch (error) {
    console.error('缓存写入失败:', error);
    // 不影响主流程
  }
}
```

### 3. 缓存失效策略

```javascript
// 主动失效：当数据更新时
function updateWord(word, newData) {
  // 更新数据库
  saveToDatabase(word, newData);
  
  // 失效相关缓存
  cache.delete(`word:${word}`);
  cache.delete(`definition:${word}`);
  cache.delete(`example:${word}`);
}

// 批量失效：清理特定模式的缓存
function invalidatePattern(pattern) {
  for (const [key] of cache.cache) {
    if (key.startsWith(pattern)) {
      cache.cache.delete(key);
    }
  }
}

// 使用示例
invalidatePattern('word:hello'); // 清理所有hello相关的缓存
```

### 4. 缓存预加载

```javascript
// 智能预加载：基于用户行为
class SmartPreloader {
  constructor(cache) {
    this.cache = cache;
    this.accessLog = [];
  }
  
  logAccess(word) {
    this.accessLog.push({ word, time: Date.now() });
    
    // 只保留最近1000条记录
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }
  }
  
  async preloadRelated(word) {
    // 预加载相关词汇（例如：同义词、反义词）
    const related = await getRelatedWords(word);
    
    for (const relatedWord of related) {
      if (!this.cache.get(relatedWord)) {
        const data = await translateWord(relatedWord);
        this.cache.set(relatedWord, data);
      }
    }
  }
  
  async preloadFrequent() {
    // 分析访问日志，预加载高频词汇
    const frequency = {};
    
    this.accessLog.forEach(({ word }) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    const topWords = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
    
    for (const word of topWords) {
      if (!this.cache.get(word)) {
        const data = await translateWord(word);
        this.cache.set(word, data);
      }
    }
  }
}
```

## 调试技巧

### 1. 查看缓存内容

```javascript
// 在DevTools Console中
function inspectCache(cache) {
  console.log('=== 缓存内容 ===');
  console.log('大小:', cache.size());
  
  let index = 0;
  for (const [key, value] of cache.cache) {
    console.log(`[${index}]`, key, '→', value);
    index++;
    if (index >= 10) {
      console.log('... 还有', cache.size() - 10, '条');
      break;
    }
  }
}

inspectCache(translationCache);
```

### 2. 测试LRU行为

```javascript
// 测试LRU淘汰
function testLRU() {
  const testCache = new AdvancedCache('test', 3, 60000, false);
  
  console.log('添加 key1, key2, key3');
  testCache.set('key1', { value: 1 });
  testCache.set('key2', { value: 2 });
  testCache.set('key3', { value: 3 });
  console.log('缓存大小:', testCache.size()); // 3
  
  console.log('添加 key4（应该淘汰key1）');
  testCache.set('key4', { value: 4 });
  console.log('key1存在?', testCache.get('key1') !== null); // false
  console.log('key2存在?', testCache.get('key2') !== null); // true
  
  console.log('访问 key2（移到最后）');
  testCache.get('key2');
  
  console.log('添加 key5（应该淘汰key3）');
  testCache.set('key5', { value: 5 });
  console.log('key2存在?', testCache.get('key2') !== null); // true（因为被访问过）
  console.log('key3存在?', testCache.get('key3') !== null); // false
}

testLRU();
```

### 3. 性能基准测试

```javascript
// 运行完整的性能测试
async function runBenchmark() {
  // 加载测试文件
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('extension/utils/cache-manager-test.js');
  document.head.appendChild(script);
  
  // 等待加载
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 运行测试
  await window.cacheTests.runAllTests();
}

runBenchmark();
```

## 常见问题

### Q1: 缓存命中率低怎么办？

**A**: 
1. 检查缓存容量是否足够
2. 检查过期时间是否太短
3. 分析访问模式，考虑预加载
4. 检查缓存键是否设计合理

### Q2: 内存占用过高怎么办？

**A**:
1. 减少缓存容量
2. 缩短过期时间
3. 禁用持久化（如果不需要）
4. 定期清理过期数据

### Q3: 如何迁移旧缓存数据？

**A**: 
新版本会自动迁移，无需手动操作。如果遇到问题：
```javascript
// 手动清理旧缓存
await chrome.storage.local.remove(['old_cache_key']);

// 重新加载
await cache.loadFromStorage();
```

## 相关文档

- [缓存优化实施文档](CACHE_OPTIMIZATION_IMPLEMENTATION.md)
- [性能优化指南](../PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [架构概览](architecture/01_架构设计/架构概览.md)

---

**最后更新**: 2026-01-28  
**维护者**: Performance Team
