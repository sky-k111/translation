/**
 * 单词列表管理器
 * 负责单词列表的加载、显示、排序和管理
 */

// 当前页面的数据
window.currentPageData = [];
// 当前页码索引
window.currentPageIndex = 0;
// 每页显示的项目数量
window.PAGE_SIZE = 50; // 每页显示50个项目
// 当前筛选器状态（由 FilterPanel 管理）
// 注意：view 字段应与 window.currentViewMode 保持同步
window.currentFilterState = {
  view: window.currentViewMode || 'grid',
  sort: 'count',
  letter: 'all',
  pos: []
};

/**
 * 加载单词列表页面
 * @param {string} filter - 过滤器类型
 */
window.loadWordListPage = async function(filter) {
  await loadDataAndBuildIndex({ force: true });

  // 设置页面标题和相关信息
  const pageInfo = getPageInfo(filter);
  document.getElementById('pageTitle').textContent = pageInfo.title;

  // 更新搜索框placeholder
  document.getElementById('searchInput').placeholder = pageInfo.searchPlaceholder;

  const searchTerm = document.getElementById('searchInput').value;
  const sortBy = window.currentFilterState.sort; // 从全局筛选状态获取

  // 重置分页
  currentPageIndex = 0;
  currentPageData = getFilteredData(filter, searchTerm);

  // 应用排序
  sortData(currentPageData, sortBy);

  displayWords(currentPageData, 0, PAGE_SIZE);
  updatePageStats(currentPageData.length, pageInfo.unit);
};

/**
 * 获取页面信息
 * @param {string} filter - 过滤器类型
 * @returns {Object} 页面信息对象
 */
function getPageInfo(filter) {
  const pageInfos = {
    word: {
      title: '单词',
      searchPlaceholder: '搜索单词...',
      unit: '个单词'
    },
    phrase: {
      title: '词组',
      searchPlaceholder: '搜索词组...',
      unit: '个词组'
    },
    sentence: {
      title: '句子',
      searchPlaceholder: '搜索句子...',
      unit: '个句子'
    },
    starred: {
      title: '星标单词',
      searchPlaceholder: '搜索星标单词...',
      unit: '个星标单词'
    }
  };

  return pageInfos[filter] || {
    title: '翻译记录',
    searchPlaceholder: '搜索...',
  };
}

/**
 * 排序数据
 * @param {Array} data - 要排序的数据数组
 * @param {string} sortBy - 排序方式
 */
function sortData(data, sortBy) {
  const sortFunction = (a, b) => {
    switch (sortBy) {
      case 'count':
        return b.count - a.count;
      case 'lastUsed':
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      case 'word':
        return a.key.localeCompare(b.key);
      default:
        return 0;
    }
  };

  data.sort(sortFunction);
}

// 暴露到全局作用域
window.sortData = sortData;

/**
 * 更新页面统计
 * @param {number} totalCount - 总数量
 * @param {string} unit - 单位
 */
function updatePageStats(totalCount, unit = '个') {
  document.getElementById('pageStats').textContent = `${totalCount} ${unit}`;
}

// 暴露到全局作用域
window.updatePageStats = updatePageStats;

// 存储 Coverflow 滚动处理函数的引用，以便移除
let coverflowScrollHandler = null;
let paginationObserver = null;

/**
 * 显示单词列表 (优化版 - 分片渲染)
 * @param {Array} data - 要显示的数据
 * @param {number} startIndex - 开始索引
 * @param {number} pageSize - 每页大小
 */
function displayWords(data, startIndex = 0, pageSize = PAGE_SIZE) {
  const wordList = document.getElementById('wordList');
  const view = window.currentViewMode || 'grid';
  wordList.dataset.tableTheme = window.currentTableTheme || 'glass';

  // 移除旧的滚动监听器（如果有）
  if (coverflowScrollHandler) {
    wordList.removeEventListener('scroll', coverflowScrollHandler);
    coverflowScrollHandler = null;
  }
  if (paginationObserver) {
    paginationObserver.disconnect();
    paginationObserver = null;
  }

  const normalizedStartIndex = Number.isFinite(startIndex) ? startIndex : 0;
  const normalizedPageSize = Number.isFinite(pageSize) ? pageSize : PAGE_SIZE;

  // 设置当前视图模式
  wordList.className = `word-list ${view}`;

  // 清空列表
  wordList.innerHTML = '';
  wordList.setAttribute('data-start-index', String(normalizedStartIndex));
  const renderToken = `${Date.now()}_${Math.random()}`;
  wordList.dataset.renderToken = renderToken;

  // 如果是列表视图，添加表头
  if (view === 'list') {
    const header = document.createElement('div');
    header.className = 'word-list-header';
    header.innerHTML = `
      <div class="header-cell star">星标</div>
      <div class="header-cell word">单词</div>
      <div class="header-cell translation">翻译</div>
      <div class="header-cell count">使用次数</div>
      <div class="header-cell type">类型</div>
      <div class="header-cell date">日期</div>
      <div class="header-cell actions">操作</div>
    `;
    wordList.appendChild(header);
  }

  if (data.length === 0) {
    wordList.innerHTML = '<div class="empty-state">暂无翻译记录</div>';
    return;
  }

  const initialEnd = Math.min(normalizedStartIndex + normalizedPageSize, data.length);
  wordList.setAttribute('data-rendered-end', String(initialEnd));
  renderWordsRange(wordList, data, normalizedStartIndex, initialEnd, view, renderToken).then(() => {
    onRenderComplete(wordList, view);
    setupPagination(wordList, data, view, normalizedPageSize, renderToken);
  });
}

/**
 * 渲染完成后的处理
 */
function onRenderComplete(wordList, view) {
  addWordItemEventListeners(wordList);
  
  addDragAndDropSupport(wordList);

  // 如果是 Coverflow 视图，初始化 3D 效果
  if (view === 'coverflow') {
    initCoverflow(wordList);
  }
}

function renderWordsRange(wordList, data, start, end, view, renderToken) {
  const CHUNK_SIZE = 20;
  let currentIndex = start;

  return new Promise((resolve) => {
    const renderChunk = () => {
      if (wordList.dataset.renderToken !== renderToken) {
        resolve();
        return;
      }

      const fragment = document.createDocumentFragment();
      const chunkEnd = Math.min(currentIndex + CHUNK_SIZE, end);

      for (let i = currentIndex; i < chunkEnd; i++) {
        const item = data[i];
        const wordItem = createWordItem(item, i === data.length - 1, view);
        wordItem.setAttribute('data-index', i);
        wordItem.setAttribute('draggable', 'true');
        fragment.appendChild(wordItem);
      }

      const sentinel = wordList.querySelector('.pagination-sentinel');
      if (sentinel) {
        wordList.insertBefore(fragment, sentinel);
      } else {
        wordList.appendChild(fragment);
      }

      currentIndex = chunkEnd;

      if (currentIndex < end) {
        requestAnimationFrame(renderChunk);
        return;
      }

      resolve();
    };

    requestAnimationFrame(renderChunk);
  });
}

function setupPagination(wordList, data, view, pageSize, renderToken) {
  const renderedEnd = Number(wordList.getAttribute('data-rendered-end')) || 0;
  if (renderedEnd >= data.length) return;
  if (wordList.dataset.renderToken !== renderToken) return;

  const sentinel = document.createElement('div');
  sentinel.className = 'pagination-sentinel';
  sentinel.style.width = '1px';
  sentinel.style.height = '1px';
  sentinel.style.flex = '0 0 1px';
  wordList.appendChild(sentinel);

  paginationObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      if (wordList.dataset.renderToken !== renderToken) {
        if (paginationObserver) {
          paginationObserver.disconnect();
          paginationObserver = null;
        }
        return;
      }

      const currentEnd = Number(wordList.getAttribute('data-rendered-end')) || 0;
      const nextEnd = Math.min(currentEnd + pageSize, data.length);

      if (paginationObserver) {
        paginationObserver.disconnect();
        paginationObserver = null;
      }

      const existingSentinel = wordList.querySelector('.pagination-sentinel');
      if (existingSentinel) {
        existingSentinel.remove();
      }

      renderWordsRange(wordList, data, currentEnd, nextEnd, view, renderToken).then(() => {
        wordList.setAttribute('data-rendered-end', String(nextEnd));
        onRenderComplete(wordList, view);
        setupPagination(wordList, data, view, pageSize, renderToken);
      });
    },
    { root: wordList, rootMargin: '200px 0px', threshold: 0.01 }
  );

  paginationObserver.observe(sentinel);
}

/**
 * 初始化 Coverflow 3D 效果 (优化版 - 视口裁剪)
 * @param {HTMLElement} container 
 */
function initCoverflow(container) {
  let ticking = false;
  
  const updateItems = () => {
    // 缓存容器尺寸
    const containerWidth = container.offsetWidth;
    const containerCenter = containerWidth / 2;
    const scrollLeft = container.scrollLeft;
    
    // 获取所有项
    const items = container.querySelectorAll('.word-item');
    const maxDistance = containerWidth / 1.5;
    
    // 阶段1：读取阶段 (Read Phase)
    // 批量读取所有 DOM 属性，避免布局抖动 (Layout Thrashing)
    const itemStates = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      itemStates.push({
        item,
        itemLeft: item.offsetLeft,
        itemWidth: item.offsetWidth
      });
    }
    
    // 阶段2：写入阶段 (Write Phase)
    // 批量更新样式，不进行 DOM 读取
    itemStates.forEach(({ item, itemLeft, itemWidth }) => {
      // 计算相对于容器视口的中心
      const itemCenter = itemLeft + itemWidth / 2 - scrollLeft;
      
      // 视口裁剪优化
      if (itemCenter < -200 || itemCenter > containerWidth + 200) {
        if (item.style.opacity !== '0') {
            item.style.transform = 'translateZ(-200px) scale(0.8)';
            item.style.opacity = '0';
        }
        return;
      }
      
      const distance = Math.abs(containerCenter - itemCenter);
      let scale = 1, rotateY = 0, translateZ = 0, opacity = 1, zIndex = 10;
      
      if (distance < maxDistance) {
        const ratio = distance / maxDistance;
        scale = 1 - (ratio * 0.1);
        opacity = 1 - (ratio * 0.5);
        translateZ = - (ratio * 100);
        rotateY = itemCenter < containerCenter ? ratio * 20 : -ratio * 20;
        zIndex = Math.round(100 - (ratio * 50));
      } else {
        scale = 0.9;
        opacity = 0.5;
        translateZ = -100;
        rotateY = itemCenter < containerCenter ? 20 : -20;
        zIndex = 1;
      }
      
      item.style.transform = `perspective(1200px) translate3d(0, 0, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
      item.style.opacity = opacity;
      item.style.zIndex = zIndex;
    });
    
    ticking = false;
  };

  // 立即执行一次
  setTimeout(() => {
      updateItems();
  }, 0);

  // 绑定滚动事件，使用 requestAnimationFrame 节流
  coverflowScrollHandler = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateItems);
      ticking = true;
    }
  };
  
  container.addEventListener('scroll', coverflowScrollHandler, { passive: true });
}

// 暴露到全局作用域
window.displayWords = displayWords;

/**
 * 创建单词项
 * @param {Object} item - 单词数据
 * @param {boolean} isLast - 是否为最后一项
 * @param {string} view - 视图模式
 * @returns {HTMLElement} 单词项元素
 */
function createWordItem(item, isLast = false, view = 'grid') {
  const wordItem = document.createElement('div');
  wordItem.className = 'word-item';
  wordItem.setAttribute('role', 'article');
  wordItem.setAttribute('tabindex', '0');

  if (isLast) {
    wordItem.classList.add('last-item');
  }

  const firstUsed = new Date(item.firstUsed).toLocaleString('zh-CN');
  const lastUsed = new Date(item.lastUsed).toLocaleString('zh-CN');

  // 获取类型标签
  const itemType = item.type || 'word';
  const typeLabel = itemType === 'word' ? '单词' : itemType === 'phrase' ? '词组' : '句子';
  const typeClass = itemType === 'word' ? 'type-word' : itemType === 'phrase' ? 'type-phrase' : 'type-sentence';

  // 将类型类添加到容器上，以便CSS针对不同类型调整卡片尺寸
  wordItem.classList.add(typeClass);

  // 针对长单词的动态宽度调整 (仅在 Coverflow 视图下)
  if (view === 'coverflow' && itemType === 'word' && item.key.length > 12) {
    wordItem.classList.add('long-word');
    if (item.key.length > 18) {
        wordItem.classList.add('extra-long-word');
    }
  }

  // 星标状态
  const isStarred = item.starred || false;
  const starClass = isStarred ? 'starred' : '';

  const count = Number(item.count) || 0;
  const heat = Math.min(Math.log10(count + 1) / Math.log10(50), 1);
  const heatLevel = count >= 50 ? 4 : count >= 20 ? 3 : count >= 10 ? 2 : count >= 5 ? 1 : 0;
  wordItem.style.setProperty('--heat', heat.toFixed(4));
  wordItem.classList.add(`heat-${heatLevel}`);

  // 存储单词数据到元素上，方便事件委托使用
  wordItem.dataset.word = escapeHtml(item.key);
  wordItem.dataset.item = JSON.stringify(item);

  // 处理可能存储为对象的翻译数据
  let translationText = item.translation;
  if (typeof translationText === 'object' && translationText !== null) {
    translationText = translationText.translation || '';
  }

  if (view === 'list') {
    // 生成热力点 HTML
    const maxDots = 5;
    const activeDots = count >= 20 ? 5 : count >= 10 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0;
    let heatDotsHtml = '';
    for (let i = 0; i < maxDots; i++) {
      heatDotsHtml += `<span class="heat-dot ${i < activeDots ? 'active' : ''}"></span>`;
    }

    // 列表视图：表格形式
    wordItem.innerHTML = `
      <div class="cell star">
        <button class="star-btn ${starClass}" data-word="${escapeHtml(item.key)}">
          <span class="star-icon">${window.iconLibrary ? window.iconLibrary.getIcon('star') : '☆'}</span>
        </button>
      </div>
      <div class="cell word">
        <span class="word-text">${escapeHtml(item.key)}</span>
      </div>
      <div class="cell translation">
        <span class="translation-text">${escapeHtml(translationText)}</span>
      </div>
      <div class="cell count">
        <div class="heat-dots" title="查询${count}次">
          ${heatDotsHtml}
        </div>
      </div>
      <div class="cell type">
        <span class="word-type ${typeClass}">${typeLabel}</span>
      </div>
      <div class="cell date">
        <span class="first-used">${firstUsed}</span><br>
        <span class="last-used">${lastUsed}</span>
      </div>
      <div class="cell actions">
        <button class="delete-btn" data-word="${escapeHtml(item.key)}">删除</button>
      </div>
    `;
  } else if (view === 'icon') {
    // 图标视图：极简结构，减少DOM开销
    wordItem.innerHTML = `
      <div class="word-header">
        <button class="star-btn ${starClass}" data-word="${escapeHtml(item.key)}">
          <span class="star-icon">${window.iconLibrary ? window.iconLibrary.getIcon('star') : '☆'}</span>
        </button>
      </div>
      <div class="word-text">${escapeHtml(item.key)}</div>
      <div class="translation-text">${escapeHtml(translationText)}</div>
      <div class="word-meta">
         <span class="word-count" title="翻译次数">
           <span class="count-number">${item.count}</span><span class="count-unit">次</span>
         </span>
      </div>
    `;
  } else {
    // Grid 和 Coverflow 视图：完整卡片结构
    wordItem.innerHTML = `
      <div class="word-border"></div>
      <div class="word-header">
        <div class="word-title-row">
          <button class="star-btn ${starClass}" data-word="${escapeHtml(item.key)}">
            <span class="star-icon">${window.iconLibrary ? window.iconLibrary.getIcon('star') : '☆'}</span>
          </button>
          <span class="word-text">${escapeHtml(item.key)}</span>
        </div>
        <div class="word-tags">
          <span class="word-type ${typeClass}">${typeLabel}</span>
          <span class="word-count" title="翻译次数">
            <span class="count-number">${item.count}</span><span class="count-unit">次</span>
          </span>
        </div>
      </div>
      <div class="translation-text">${escapeHtml(translationText)}</div>
      <div class="word-meta">
        <div class="date-info">
          <span class="first-used">首次: ${firstUsed}</span>
          <span class="last-used">最近: ${lastUsed}</span>
        </div>
        <button class="delete-btn" data-word="${escapeHtml(item.key)}">删除</button>
      </div>
    `;
  }

  if (view === 'coverflow') {
    const keyText = String(item.key || '');
    const titleLength = keyText.length;
    const baseWidth = itemType === 'sentence' ? 420 : itemType === 'phrase' ? 300 : 220;
    const extraWidth = Math.min(Math.max((titleLength - 10) * 10, 0), itemType === 'sentence' ? 260 : 220);
    const computedWidth = Math.min(baseWidth + extraWidth, itemType === 'sentence' ? 640 : 520);
    wordItem.style.width = `${computedWidth}px`;

    const titleEl = wordItem.querySelector('.word-text');
    if (titleEl) {
      if (titleLength > 28) {
        titleEl.style.fontSize = '16px';
      } else if (titleLength > 20) {
        titleEl.style.fontSize = '18px';
      } else {
        titleEl.style.fontSize = '';
      }
    }
  }

  return wordItem;
}

/**
 * 格式化翻译文本，高亮词性标签
 * @param {string} text - 原始翻译文本
 * @returns {string} 格式化后的HTML
 */
function formatTranslationWithPos(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  // 匹配常见的词性标签：n., v., adj., adv., prep., conj., vi., vt. 等
  // 使用 regex 替换，包裹在 span 中
  return escaped.replace(/\b(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|num\.|art\.|vi\.|vt\.|aux\.)/g, '<span class="pos-tag">$1</span>');
}

/**
 * 添加单词项事件委托支持
 * @param {HTMLElement} container - 容器元素
 */
function addWordItemEventListeners(container) {
  if (container.dataset.wordItemEventsBound === '1') return;
  container.dataset.wordItemEventsBound = '1';

  // 统一事件处理函数
  container.addEventListener('click', async (e) => {
    const target = e.target;
    const wordItem = target.closest('.word-item');

    if (!wordItem) return;

    // 解析单词数据
    let item;
    try {
      item = JSON.parse(wordItem.dataset.item);
    } catch (error) {
      console.error('解析单词数据失败:', error);
      return;
    }

    // 星标按钮点击处理
    if (target.closest('.star-btn')) {
      e.stopPropagation();

      const starBtn = target.closest('.star-btn');
      const starIcon = starBtn.querySelector('.star-icon');

      // 1. 立即更新UI (Optimistic UI Update)
      // 获取当前状态 (基于 class 或 item 数据)
      const isStarred = starBtn.classList.contains('starred');
      const newStarredState = !isStarred;

      // 更新样式
      if (newStarredState) {
        starBtn.classList.add('starred');
        // SVG图标通过CSS类控制样式，不需要修改内容
        // if (starIcon) starIcon.textContent = '⭐';
      } else {
        starBtn.classList.remove('starred');
        // SVG图标通过CSS类控制样式，不需要修改内容
        // if (starIcon) starIcon.textContent = '☆';
      }

      // 添加点击动画
      starBtn.style.transform = 'scale(0.8)';
      setTimeout(() => {
        starBtn.style.transform = '';
      }, 150);

      // 2. 更新 DOM 元素上的数据
      item.starred = newStarredState;
      wordItem.dataset.item = JSON.stringify(item);

      // 3. 更新当前页面数据缓存 (window.currentPageData)
      // 这样滚动或重绘时状态能保持一致
      if (window.currentPageData) {
        const dataItem = window.currentPageData.find(d => d.key === item.key);
        if (dataItem) {
          dataItem.starred = newStarredState;
        }
      }

      // 4. 异步持久化数据 (不刷新页面)
      setStarState(item.key, newStarredState).then(() => {
        if (window.currentFilter === 'starred' && !newStarredState) {
          loadWordListPage(window.currentFilter);
        }
      }).catch(err => {
        console.error('更新星标失败:', err);

        if (isStarred) {
          starBtn.classList.add('starred');
          // if (starIcon) starIcon.textContent = '⭐';
        } else {
          starBtn.classList.remove('starred');
          // if (starIcon) starIcon.textContent = '☆';
        }

        item.starred = isStarred;
        wordItem.dataset.item = JSON.stringify(item);

        if (window.currentPageData) {
          const dataItem = window.currentPageData.find(d => d.key === item.key);
          if (dataItem) {
            dataItem.starred = isStarred;
          }
        }

        alert('星标更新失败，请稍后重试');
      });

      return;
    }

    // 删除按钮点击处理
    if (target.closest('.delete-btn')) {
      e.stopPropagation();

      // 替换为更现代的确认方式
      if (confirm(`确定要删除 "${item.key}" 吗？`)) {
        // 添加删除动画
        wordItem.style.transform = 'translateX(-100%)';
        wordItem.style.opacity = '0';

        await deleteWord(item.key);
        // 重新加载当前页面数据
        await loadDataAndBuildIndex({ force: true });
        if (currentPage === 'home') {
          loadHomePage();
        } else {
          loadWordListPage(currentFilter);
        }
      }
      return;
    }

    // 点击单词项本身，打开抽屉显示详细信息
    console.log('单词项被点击:', item.key);
    
    // 检查是否有全局的 wordDrawer 实例
    if (window.wordDrawer) {
      console.log('WordDrawer 实例存在，准备显示抽屉');
      
      // 获取当前项在列表中的索引
      const itemIndex = parseInt(wordItem.getAttribute('data-index')) || 0;
      
      // 准备单词数据，确保格式正确
      const wordData = {
        text: item.key,
        word: item.key,
        key: item.key,
        translation: typeof item.translation === 'object' ? item.translation.translation : item.translation,
        phonetic: item.phonetic || '',
        type: item.type || 'word',
        count: item.count,
        firstUsed: item.firstUsed,
        lastUsed: item.lastUsed,
        starred: item.starred || false,
        detailedInfo: item.detailedInfo || null,
        lookupHistory: item.lookupHistory || [],
        masteryLevel: item.masteryLevel || 0
      };

      console.log('单词数据:', wordData);

      // 设置单词列表供导航使用
      if (window.wordDrawer.setWordList) {
        window.wordDrawer.setWordList(currentPageData);
      }

      // 显示抽屉，传入索引
      window.wordDrawer.show(wordData, itemIndex);
      console.log('抽屉显示命令已发送');
    } else {
      console.error('WordDrawer 未初始化！请检查组件初始化顺序');
      console.log('当前 window 对象上的属性:', Object.keys(window).filter(k => k.includes('word') || k.includes('drawer')));
    }
  });

  const hoverTimers = new WeakMap();
  container.addEventListener('mouseover', (e) => {
    if (!container.classList.contains('icon')) return;
    const item = e.target.closest('.word-item');
    if (!item || !container.contains(item)) return;
    if (item.classList.contains('hover-preview-active')) return;
    if (hoverTimers.has(item)) return;
    const t = setTimeout(() => {
      const active = container.querySelector('.word-item.hover-preview-active');
      if (active && active !== item) {
        active.classList.remove('hover-preview-active');
      }
      item.classList.add('hover-preview-active');
      hoverTimers.delete(item);
    }, 1000);
    hoverTimers.set(item, t);
  });
  container.addEventListener('mouseout', (e) => {
    if (!container.classList.contains('icon')) return;
    const item = e.target.closest('.word-item');
    if (!item) return;
    const related = e.relatedTarget;
    if (related && item.contains(related)) return;
    const t = hoverTimers.get(item);
    if (t) {
      clearTimeout(t);
      hoverTimers.delete(item);
    }
    item.classList.remove('hover-preview-active');
  });
}

async function setStarState(word, starred) {
  const wordLower = word.toLowerCase();

  const result = await chrome.storage.local.get(['translatedWords']);
  const words = result.translatedWords || {};

  const matchedKey =
    words[wordLower] ? wordLower : (words[word] ? word : Object.keys(words).find(k => k.toLowerCase() === wordLower));

  if (!matchedKey) {
    throw new Error('未找到对应的单词记录');
  }

  words[matchedKey] = {
    ...words[matchedKey],
    starred: !!starred
  };

  await chrome.storage.local.set({ translatedWords: words });
  window.wordsData = words;
  await window.buildIndex();
  
  // Update Word_Index_Manager if available
  if (window.wordIndexManager) {
    try {
      window.wordIndexManager.updateMetadata(matchedKey, { starred: !!starred });
    } catch (error) {
      console.error('[Word List Manager] Failed to update Word_Index_Manager:', error);
    }
  }
  
  window.searchCache.clear();
}

/**
 * 删除单词
 * @param {string} word - 单词
 */
async function deleteWord(word) {
  const wordLower = word.toLowerCase();

  // 直接从本地存储加载最新数据
  const result = await chrome.storage.local.get(['translatedWords', 'learningProgress']);
  const words = result.translatedWords || {};
  const progress = result.learningProgress || {};

  const matchedKey =
    words[wordLower] ? wordLower : (words[word] ? word : Object.keys(words).find(k => k.toLowerCase() === wordLower));

  if (matchedKey) {
    // 从words中删除
    delete words[matchedKey];
    
    // 从learningProgress中删除对应记录
    if (progress[matchedKey]) {
      delete progress[matchedKey];
      await chrome.storage.local.set({ learningProgress: progress });
    }
    
    // 更新存储
    await chrome.storage.local.set({ translatedWords: words });
    
    // 更新全局wordsData对象，确保一致性
    window.wordsData = words;
    
    // 重新构建索引并清空搜索缓存
    await window.buildIndex();
    
    // Remove from Word_Index_Manager if available
    if (window.wordIndexManager) {
      try {
        window.wordIndexManager.remove(matchedKey);
      } catch (error) {
        console.error('[Word List Manager] Failed to remove from Word_Index_Manager:', error);
      }
    }
    
    window.searchCache.clear();
  }
}

/**
 * 清空指定类型的记录
 * 根据当前筛选类型（单词/词组/句子/星标）清空对应的记录
 */
async function clearAllWords() {
  // 获取当前筛选类型的显示名称
  let typeLabel = '';
  let confirmMessage = '';
  
  switch(currentFilter) {
    case 'word':
      typeLabel = '单词';
      confirmMessage = '确定要清空所有单词记录吗？此操作不可恢复！';
      break;
    case 'phrase':
      typeLabel = '词组';
      confirmMessage = '确定要清空所有词组记录吗？此操作不可恢复！';
      break;
    case 'sentence':
      typeLabel = '句子';
      confirmMessage = '确定要清空所有句子记录吗？此操作不可恢复！';
      break;
    case 'starred':
      typeLabel = '星标';
      confirmMessage = '确定要清空所有星标记录吗？此操作不可恢复！';
      break;
    default:
      typeLabel = '所有';
      confirmMessage = '确定要清空所有翻译记录吗？此操作不可恢复！';
  }
  
  if (confirm(confirmMessage)) {
    try {
      // 获取当前存储的数据
      const result = await chrome.storage.local.get(['translatedWords', 'learningProgress']);
      const words = result.translatedWords || {};
      const progress = result.learningProgress || {};
      
      // 根据筛选类型删除对应的记录
      if (currentFilter === 'all') {
        // 清空所有记录
        await chrome.storage.local.remove(['translatedWords']);
        window.wordsData = {};
        
        // Reset Word_Index_Manager
        if (window.wordIndexManager) {
          try {
            window.wordIndexManager.reset();
          } catch (error) {
            console.error('[Word List Manager] Failed to reset Word_Index_Manager:', error);
          }
        }
      } else if (currentFilter === 'starred') {
        // 清空所有星标记录
        Object.keys(words).forEach(key => {
          if (words[key].starred) {
            delete words[key];
            // 同时删除学习进度
            if (progress[key]) {
              delete progress[key];
            }
          }
        });
        
        // 保存更新后的数据
        await chrome.storage.local.set({ 
          translatedWords: words,
          learningProgress: progress
        });
        window.wordsData = words;
      } else {
        // 清空指定类型的记录（word/phrase/sentence）
        Object.keys(words).forEach(key => {
          if (words[key].type === currentFilter) {
            delete words[key];
            // 同时删除学习进度
            if (progress[key]) {
              delete progress[key];
            }
          }
        });
        
        // 保存更新后的数据
        await chrome.storage.local.set({ 
          translatedWords: words,
          learningProgress: progress
        });
        window.wordsData = words;
      }
      
      // 重新构建索引
      await window.buildIndex();
      window.searchCache.clear();
      
      // 刷新当前页面
      if (currentPage === 'home') {
        loadHomePage();
      } else {
        loadWordListPage(currentFilter);
      }
    } catch (error) {
      console.error('清空记录失败:', error);
      alert('清空记录失败，请重试');
    }
  }
}

/**
 * 转义HTML特殊字符，防止XSS攻击
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 添加拖拽排序支持
 * @param {HTMLElement} container - 容器元素
 * @param {Array} data - 数据数组
 */
function addDragAndDropSupport(container) {
  if (container.dataset.dragDropBound === '1') return;
  container.dataset.dragDropBound = '1';

  let draggedItem = null;
  let dragStartIndex = -1;

  // 使用事件委托，减少事件监听器数量
  container.addEventListener('dragstart', (e) => {
    if (e.target.closest('.word-item')) {
      draggedItem = e.target.closest('.word-item');
      dragStartIndex = parseInt(draggedItem.getAttribute('data-index'));
      draggedItem.style.opacity = '0.5';
      draggedItem.style.zIndex = '1000';
      draggedItem.classList.add('dragging');
    }
  });

  container.addEventListener('dragend', (e) => {
    if (draggedItem) {
      draggedItem.style.opacity = '';
      draggedItem.style.zIndex = '';
      draggedItem.classList.remove('dragging');
      draggedItem = null;
      dragStartIndex = -1;
    }
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem) return;
    
    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement == null || afterElement === draggedItem) {
      container.appendChild(draggedItem);
    } else {
      container.insertBefore(draggedItem, afterElement);
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedItem || dragStartIndex === -1) return;
    
    const items = Array.from(container.querySelectorAll('.word-item'));
    const indices = items
      .map(el => Number(el.getAttribute('data-index')))
      .filter(Number.isFinite);
    if (indices.length !== items.length) return;

    const data = window.currentPageData || [];
    if (data.length === 0) return;

    const minIndex = Math.min(...indices);
    const indexSet = new Set(indices);
    const movedItems = indices.map(idx => data[idx]).filter(Boolean);
    const remaining = data.filter((_, idx) => !indexSet.has(idx));

    const insertAt = Math.min(Math.max(minIndex, 0), remaining.length);
    remaining.splice(insertAt, 0, ...movedItems);

    window.currentPageData = remaining;
    const startIndex = Number(container.getAttribute('data-start-index')) || 0;
    displayWords(window.currentPageData, startIndex, PAGE_SIZE);
  });

  // 辅助函数：找到拖拽元素应该插入到哪个元素后面
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.word-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
}
