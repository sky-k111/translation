/**
 * 首页功能管理器
 * 负责加载和更新首页内容，包括学习面板、统计数据等
 */

// Helper function to get icon from library
function getIconFromLibrary(name) {
  // Try to use window.iconLibrary if available
  if (window.iconLibrary && typeof window.iconLibrary.getIcon === 'function') {
    return window.iconLibrary.getIcon(name);
  }
  
  // Fallback icons if icon library not loaded
  const fallbackIcons = {
    'book': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    'target': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="9"></circle></svg>',
    'checkmark': '<svg viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>'
  };
  return fallbackIcons[name] || fallbackIcons['book'];
}

// 加载首页
async function loadHomePage() {
  await loadDataAndBuildIndex();

  // 使用索引快速统计
  const counts = {
    word: wordsIndex.word.length,
    phrase: wordsIndex.phrase.length,
    sentence: wordsIndex.sentence.length,
    starred: wordsIndex.starred.length
  };

  // 更新统计面板
  document.getElementById('totalWords').textContent = wordsIndex.all.length;
  document.getElementById('wordCount').textContent = counts.word;
  document.getElementById('phraseCount').textContent = counts.phrase;
  document.getElementById('sentenceCount').textContent = counts.sentence;
  document.getElementById('starredCount').textContent = counts.starred;

  // 初始化学习面板
  updateLearningPanel();
  
  // 更新学习统计数据
  updateLearningStats();
}

/**
 * 更新学习面板内容
 * 不替换HTML，只更新按钮事件和统计数据
 */
async function updateLearningPanel() {
  const learningContent = document.getElementById('learningContent');

  // 如果没有单词数据，显示占位符
  if (wordsIndex.all.length === 0) {
    learningContent.innerHTML = `
      <div class="learning-placeholder">
        <div class="placeholder-icon">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px;">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
        </div>
        <div class="placeholder-text">开始翻译一些单词来开始学习吧！</div>
      </div>
    `;
    return;
  }

  // 不替换HTML，只绑定事件监听器（使用事件委托避免重复绑定）
  const startLearningBtn = document.getElementById('startLearningBtn');
  const reviewDifficultBtn = document.getElementById('reviewDifficultBtn');
  const dailyChallengeBtn = document.getElementById('dailyChallengeBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');

  // 移除旧的事件监听器（如果存在）
  if (startLearningBtn && !startLearningBtn.dataset.bound) {
    startLearningBtn.addEventListener('click', () => {
      window.pendingLearningFilter = 'all';
      showPage('modeSelection');
    });
    startLearningBtn.dataset.bound = 'true';
  }

  if (reviewDifficultBtn && !reviewDifficultBtn.dataset.bound) {
    reviewDifficultBtn.addEventListener('click', () => {
      window.pendingLearningFilter = 'difficult';
      showPage('modeSelection');
    });
    reviewDifficultBtn.dataset.bound = 'true';
  }

  if (dailyChallengeBtn && !dailyChallengeBtn.dataset.bound) {
    dailyChallengeBtn.addEventListener('click', async () => {
      // 生成或获取今日挑战
      if (window.learningHistoryManager) {
        const result = await chrome.storage.local.get(['translatedWords', 'learningProgress']);
        const words = result.translatedWords || {};
        const progress = result.learningProgress || {};
        
        await window.learningHistoryManager.generateTodayChallenge(words, progress, 20);
      }
      
      // 每日挑战进入模式选择
      window.pendingLearningFilter = 'daily';
      showPage('modeSelection');
    });
    dailyChallengeBtn.dataset.bound = 'true';
  }

  // 为header中的Dashboard按钮添加事件监听器
  if (dashboardBtn && !dashboardBtn.dataset.bound) {
    dashboardBtn.addEventListener('click', () => {
      showPage('dashboard');
    });
    dashboardBtn.dataset.bound = 'true';
  }
}



/**
 * 获取最近学习的单词
 * @param {number} limit - 返回的单词数量限制
 * @returns {Array} 最近学习的单词数组
 */
function getRecentWords(limit) {
  // 从所有单词中按最后使用时间排序，取最新的limit个
  const allWords = Object.values(wordsData);
  return allWords
    .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
    .slice(0, limit)
    .map(word => ({
      key: word.word, // 使用word.word而不是word.key
      count: word.count,
      lastUsed: word.lastUsed
    }));
}

/**
 * 显示单词详情
 * @param {string} wordKey - 单词键
 */
function showWordDetail(wordKey) {
  // 这里可以实现显示单词详情的逻辑
  // 暂时跳转到对应的单词列表页面
  const wordData = wordsData[wordKey];
  if (wordData) {
    // 根据单词类型跳转到对应页面
    let filterType = 'word'; // 默认单词
    if (wordData.key.includes(' ')) {
      if (wordData.key.split(' ').length > 3) {
        filterType = 'sentence';
      } else {
        filterType = 'phrase';
      }
    }
    showPage(filterType);
  }
}

// 将函数挂载到window对象，以便在其他文件中使用
window.loadHomePage = loadHomePage;
window.updateLearningPanel = updateLearningPanel;
window.getRecentWords = getRecentWords;
window.showWordDetail = showWordDetail;
