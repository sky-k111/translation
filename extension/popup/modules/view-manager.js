/**
 * 视图模式管理模块
 * 处理不同视图模式（网格、列表等）的切换和更新
 */

// 当前视图模式状态
window.currentViewMode = 'grid'; // 默认网格视图

/**
 * 初始化视图控制
 * 返回Promise以便等待加载完成
 */
window.initViewControls = function initViewControls() {
  return new Promise((resolve) => {
    // 从存储加载视图模式
    chrome.storage.local.get(['viewMode'], (result) => {
      const savedViewMode = result.viewMode || 'grid';
      window.currentViewMode = savedViewMode;
      
      // 同步到筛选状态
      if (!window.currentFilterState) {
        window.currentFilterState = {
          view: savedViewMode,
          sort: 'count',
          letter: 'all',
          pos: []
        };
      } else {
        window.currentFilterState.view = savedViewMode;
      }
      
      console.log('✅ 视图模式已加载:', savedViewMode, '筛选状态:', window.currentFilterState);
      
      // 更新UI
      window.updateViewMode(savedViewMode);
      
      resolve(savedViewMode);
    });
  });
}

/**
 * 更新视图模式
 * @param {string} viewMode - 要设置的视图模式
 */
window.updateViewMode = function updateViewMode(viewMode) {
  console.log('🔄 更新视图模式UI:', viewMode);
  
  // 同步全局状态
  window.currentViewMode = viewMode;
  if (window.currentFilterState) {
    window.currentFilterState.view = viewMode;
  }
  
  // 更新视图控制按钮的激活状态
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 安全地更新激活状态
  const activeBtn = document.querySelector(`[data-view="${viewMode}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    console.log('✅ 视图按钮激活:', viewMode);
  } else {
    console.warn('⚠️ 未找到视图按钮:', viewMode);
  }

  // 更新单词列表的视图类
  const wordList = document.getElementById('wordList');
  if (wordList) {
    wordList.className = `word-list ${viewMode}`;
    console.log('✅ 单词列表类名已更新:', wordList.className);
  } else {
    console.warn('⚠️ 未找到wordList元素');
  }
  
  // 保存到存储
  chrome.storage.local.set({ viewMode }, () => {
    console.log('💾 视图模式已保存到存储:', viewMode);
  });
}

/**
 * 切换视图模式（供按钮点击使用）
 * @param {string} viewMode - 要切换到的视图模式
 */
window.switchViewMode = function switchViewMode(viewMode) {
  console.log('🔀 切换视图模式:', viewMode);
  
  // 更新视图模式
  window.updateViewMode(viewMode);
  
  // 重新渲染单词列表
  if (typeof window.displayWords === 'function' && window.currentPageData) {
    window.displayWords(window.currentPageData, 0, window.PAGE_SIZE);
    console.log('✅ 单词列表已重新渲染');
  }
}
