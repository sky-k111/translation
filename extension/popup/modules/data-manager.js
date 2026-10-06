/**
 * 数据管理模块
 * 处理数据存储、索引构建和搜索功能
 */

// 原始单词数据存储
window.wordsData = {};

// 单词索引 - 按类型分类存储单词键
window.wordsIndex = {
  all: [],      // 所有单词
  word: [],     // 单词类型
  phrase: [],   // 词组类型
  sentence: [], // 句子类型
  starred: []   // 收藏的单词
};

// 搜索倒排索引 - 用于快速搜索
window.searchIndex = {};

// 搜索结果缓存 - 避免重复搜索计算
window.searchCache = new Map();

// 数据加载状态标志
window.isDataLoaded = false;

// 缓存的单词数组，用于提高搜索性能
window.cachedWordArray = [];

// Word_Index_Manager instance for optimized word lookups
window.wordIndexManager = null;

if (!window.__popupStorageChangeListenerBound) {
  window.__popupStorageChangeListenerBound = true;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.translatedWords) {
      window.isDataLoaded = false;
    }
  });
}

/**
 * 加载数据并构建搜索索引
 * 从Chrome存储中获取单词数据并建立各种索引以提高查询性能
 */
window.loadDataAndBuildIndex = async function loadDataAndBuildIndex() {
  const options = arguments.length > 0 ? arguments[0] : undefined;
  const force = !!(options && options.force);
  if (window.isDataLoaded && !force) return;

  // 从Chrome本地存储获取翻译单词数据
  const result = await chrome.storage.local.get(['translatedWords']);
  window.wordsData = result.translatedWords || {};

  // 为没有复杂度数据的单词计算复杂度
  if (window.ComplexityCalculator) {
    let needsUpdate = false;
    for (const [key, wordData] of Object.entries(window.wordsData)) {
      if (!wordData.complexity || !wordData.complexity.level) {
        window.wordsData[key] = {
          ...wordData,
          complexity: window.ComplexityCalculator.calculateComplexity(wordData)
        };
        needsUpdate = true;
      }
    }
    
    // 如果有更新，保存回存储
    if (needsUpdate) {
      await chrome.storage.local.set({ translatedWords: window.wordsData });
    }
  }

  // 重建所有索引（分类索引和搜索索引）
  await window.buildIndex();

  // 标记数据已加载
  window.isDataLoaded = true;
};

/**
 * 构建高效的索引结构 (异步分片版)
 */
window.buildIndex = async function buildIndex() {
  // 清空现有索引
  window.wordsIndex = {
    all: [],
    word: [],
    phrase: [],
    sentence: [],
    starred: []
  };
  window.searchIndex = {}; // 清空搜索索引

  // 将对象转换为数组并分类
  window.cachedWordArray = Object.keys(window.wordsData).map(key => ({
    key: key,
    ...window.wordsData[key]
  }));

  // Initialize Word_Index_Manager if not already initialized
  if (!window.wordIndexManager) {
    // Dynamically load WordIndexManager if available
    if (typeof WordIndexManager !== 'undefined') {
      window.wordIndexManager = new WordIndexManager({
        storageKey: 'popup_word_index',
        persistDelay: 2000
      });
    }
  }

  // Build optimized Trie index for fast word lookups
  if (window.wordIndexManager) {
    try {
      await window.wordIndexManager.buildIndex(window.cachedWordArray);
      console.log('[Data Manager] Word_Index_Manager built successfully');
    } catch (error) {
      console.error('[Data Manager] Failed to build Word_Index_Manager:', error);
      // Continue with fallback indexing
    }
  }

  const CHUNK_SIZE = 200; // 每批处理200个单词

  // 分片处理数据
  for (let i = 0; i < window.cachedWordArray.length; i += CHUNK_SIZE) {
    const chunk = window.cachedWordArray.slice(i, i + CHUNK_SIZE);
    
    chunk.forEach((item, offset) => {
      const globalIndex = i + offset;
      const type = item.type || 'word';

      // 所有项目索引
      window.wordsIndex.all.push(item);

      // 类型索引
      if (window.wordsIndex[type]) {
        window.wordsIndex[type].push(item);
      }

      // 星标索引
      if (item.starred) {
        window.wordsIndex.starred.push(item);
      }

      // 构建搜索倒排索引
      window.buildSearchIndex(item, globalIndex);
    });

    // 每处理完一批，让出主线程
    if (i + CHUNK_SIZE < window.cachedWordArray.length) {
      await yieldToMain();
    }
  }

  // 对所有索引进行排序（按使用次数降序）
  Object.keys(window.wordsIndex).forEach(key => {
    window.wordsIndex[key].sort((a, b) => b.count - a.count);
  });
};

/**
 * 构建搜索倒排索引
 */
window.buildSearchIndex = function buildSearchIndex(item, index) {
  const text = `${item.key} ${item.translation}`.toLowerCase();
  const words = text.split(/\s+/);

  // 为每个单词建立倒排索引
  words.forEach(word => {
    if (!window.searchIndex[word]) {
      window.searchIndex[word] = new Set();
    }
    window.searchIndex[word].add(index);
  });
};

/**
 * 获取过滤后的数据
 */
window.getFilteredData = function getFilteredData(typeFilter = 'all', searchTerm = '') {
  // 生成缓存键
  const cacheKey = `${typeFilter}:${searchTerm}`;

  // 检查缓存
  if (window.searchCache.has(cacheKey)) {
    return window.searchCache.get(cacheKey);
  }

  let data = [];

  // 根据类型过滤
  if (typeFilter === 'starred') {
    data = [...window.wordsIndex.starred];
  } else if (window.wordsIndex[typeFilter]) {
    data = [...window.wordsIndex[typeFilter]];
  } else {
    data = [...window.wordsIndex.all];
  }

  // 搜索过滤 - use Word_Index_Manager for prefix search if available
  if (searchTerm) {
    // Try using Word_Index_Manager for optimized search
    if (window.wordIndexManager && searchTerm.trim().split(/\s+/).length === 1) {
      try {
        // Single word search - use prefix search from Trie
        const prefixResults = window.wordIndexManager.search(searchTerm.trim());
        if (prefixResults && prefixResults.length > 0) {
          // Filter by type
          data = prefixResults.filter(item => {
            if (typeFilter === 'starred') return item.starred;
            if (typeFilter === 'all') return true;
            return item.type === typeFilter;
          });
        } else {
          data = [];
        }
      } catch (error) {
        console.error('[Data Manager] Word_Index_Manager search failed, falling back:', error);
        data = window.performSearch(data, searchTerm);
      }
    } else {
      // Multi-word search or fallback - use traditional search
      data = window.performSearch(data, searchTerm);
    }
  }

  // 缓存结果（限制缓存大小）
  if (window.searchCache.size > 100) {
    const firstKey = window.searchCache.keys().next().value;
    window.searchCache.delete(firstKey);
  }
  window.searchCache.set(cacheKey, data);

  return data;
};

/**
 * 使用倒排索引进行高效搜索
 */
window.performSearch = function performSearch(data, searchTerm) {
  if (!searchTerm.trim()) return data;

  const searchWords = searchTerm.toLowerCase().split(/\s+/);
  
  // 使用缓存的数组，避免重复计算
  if (window.cachedWordArray.length === 0 && Object.keys(window.wordsData).length > 0) {
     window.cachedWordArray = Object.keys(window.wordsData).map(key => ({
      key: key,
      ...window.wordsData[key]
    }));
  }
  const wordArray = window.cachedWordArray;

  // 使用倒排索引进行搜索
  let resultIndices = new Set();

  searchWords.forEach(searchWord => {
    if (window.searchIndex[searchWord]) {
      if (resultIndices.size === 0) {
        // 第一个搜索词
        resultIndices = new Set(window.searchIndex[searchWord]);
      } else {
        // 交集操作
        const currentIndices = window.searchIndex[searchWord];
        resultIndices = new Set([...resultIndices].filter(x => currentIndices.has(x)));
      }
    } else {
      // 如果搜索词不在索引中，清空结果
      resultIndices.clear();
    }
  });

  // 获取匹配的项目
  const matchedItems = [...resultIndices].map(index => wordArray[index]);

  // 按相关性排序（匹配的搜索词越多越相关）
  matchedItems.sort((a, b) => {
    const aScore = calculateRelevanceScore(a, searchWords);
    const bScore = calculateRelevanceScore(b, searchWords);
    return bScore - aScore;
  });

  return matchedItems;
};

/**
 * 计算相关性分数
 */
function calculateRelevanceScore(item, searchWords) {
  const text = `${item.key} ${item.translation}`.toLowerCase();
  let score = 0;

  searchWords.forEach(word => {
    // 精确匹配获得更高分数
    if (item.key.toLowerCase().includes(word)) {
      score += 10;
    }
    if (item.translation.toLowerCase().includes(word)) {
      score += 5;
    }
    // 部分匹配获得较低分数
    if (text.includes(word)) {
      score += 1;
    }
  });

  return score;
}
