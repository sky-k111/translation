/**
 * 单词翻译助手 - 弹出页面主脚本
 * 仅包含必要的全局状态和初始化代码
 */

// ====================
// 全局状态管理
// ====================

// 当前激活的过滤器类型
window.currentFilter = 'all';
// 待处理的学习过滤器（用于模式选择）
window.pendingLearningFilter = 'all';

// ====================
// 学习模式功能
// ====================

// 创建学习管理器实例
const learningManager = new LearningManager();

// ====================
// 新组件初始化
// ====================

/**
 * 初始化UI组件
 * 在DOM加载完成后执行，确保所有依赖都已加载
 */
function initializeComponents() {
  console.log('🚀 开始初始化UI组件...');
  
  // 确保 currentFilterState 存在并与 currentViewMode 同步
  // 注意：currentViewMode 应该已经在 initViewControls 中从存储加载
  if (!window.currentFilterState) {
    window.currentFilterState = {
      view: window.currentViewMode || 'grid',
      sort: 'count',
      letter: 'all',
      pos: []
    };
    console.log('📝 创建新的 currentFilterState:', window.currentFilterState);
  } else {
    // 确保视图模式与 currentViewMode 同步
    window.currentFilterState.view = window.currentViewMode || window.currentFilterState.view || 'grid';
    console.log('🔄 同步 currentFilterState.view:', window.currentFilterState.view);
  }

  // 检查 wordDrawer 是否已经初始化（应该在 HTML 中已经初始化）
  if (!window.wordDrawer) {
    console.warn('⚠️ wordDrawer 未在 HTML 中初始化，尝试在这里初始化...');
    // 优先使用新版 WordDrawerV2
    const DrawerClass = window.WordDrawerV2 || window.WordDrawer;
    if (typeof DrawerClass !== 'undefined') {
      try {
        window.wordDrawer = new DrawerClass({
          containerId: 'container',
          onClose: () => {
            console.log('抽屉已关闭');
          },
          onStar: (word, starred) => {
            console.log('收藏状态变更:', word, starred);
          },
          onDelete: async (word) => {
            console.log('单词已删除:', word);
            // 刷新当前页面数据
            await loadDataAndBuildIndex({ force: true });
            if (currentPage === 'home') {
              loadHomePage();
            } else {
              loadWordListPage(currentFilter);
            }
          }
        });
        console.log('✅ WordDrawer 初始化成功（备用方案）');
      } catch (error) {
        console.error('❌ WordDrawer 初始化失败:', error);
      }
    } else {
      console.error('❌ WordDrawer 类未定义！');
    }
  } else {
    console.log('✅ wordDrawer 已存在（在 HTML 中初始化）');
  }
  
  // 监听抽屉删除事件，刷新列表
  document.addEventListener('wordDrawerDelete', async () => {
    await loadDataAndBuildIndex({ force: true });
    if (currentPage === 'home') {
      loadHomePage();
    } else {
      loadWordListPage(currentFilter);
    }
  });
  
  // 监听抽屉星标事件，刷新列表
  document.addEventListener('wordDrawerStar', async () => {
    await loadDataAndBuildIndex({ force: true });
    if (currentPage === 'home') {
      loadHomePage();
    } else {
      loadWordListPage(currentFilter);
    }
  });

  // 初始化筛选面板组件
  if (typeof FilterPanel !== 'undefined') {
    try {
      window.filterPanel = new FilterPanel({
        containerId: 'wordListPage',
        initialFilters: {
          view: window.currentFilterState.view,
          sort: window.currentFilterState.sort,
          letter: window.currentFilterState.letter,
          pos: window.currentFilterState.pos
        },
        onApply: (filters) => {
          console.log('🎯 应用筛选条件:', filters);
          console.log('📍 当前页面状态:', {
            currentPage: window.currentPage,
            currentFilter: window.currentFilter,
            wordListVisible: document.getElementById('wordListPage')?.classList.contains('active')
          });

          // 更新全局筛选状态
          window.currentFilterState = { ...filters };

          // 更新视图模式（使用新的switchViewMode函数）
          if (filters.view !== window.currentViewMode) {
            window.switchViewMode(filters.view);
          }

          // 强制检查当前页面状态
          const wordListPage = document.getElementById('wordListPage');
          const isOnWordListPage = wordListPage && wordListPage.classList.contains('active');
          
          console.log('🔍 页面检查结果:', {
            windowCurrentPage: window.currentPage,
            wordListPageExists: !!wordListPage,
            wordListPageActive: isOnWordListPage
          });

          // 如果在单词列表页面，立即应用筛选
          if (isOnWordListPage || window.currentPage === 'wordList') {
            const searchTerm = document.getElementById('searchInput')?.value || '';
            window.currentPageIndex = 0;
            
            console.log('🔎 开始应用筛选，搜索词:', searchTerm);
            
            // 确保数据管理器已加载
            if (typeof window.getFilteredData !== 'function') {
              console.error('❌ getFilteredData函数不存在，无法应用筛选');
              return;
            }
            
            // 获取基础筛选数据
            window.currentPageData = window.getFilteredData(window.currentFilter, searchTerm);
            console.log('📊 基础数据获取完成，数量:', window.currentPageData.length);

            // 应用字母筛选
            if (filters.letter !== 'all') {
              const beforeCount = window.currentPageData.length;
              window.currentPageData = window.currentPageData.filter(item => {
                const firstChar = item.key.charAt(0).toLowerCase();
                if (filters.letter === 'number') {
                  return /[0-9]/.test(firstChar);
                }
                return firstChar === filters.letter;
              });
              console.log(`🔤 字母筛选 (${filters.letter}): ${beforeCount} -> ${window.currentPageData.length}`);
            }

            // 应用词性筛选
            if (filters.pos.length > 0) {
              const beforeCount = window.currentPageData.length;
              window.currentPageData = window.currentPageData.filter(item => {
                // 检查单词的词性是否在筛选列表中
                return filters.pos.some(pos => {
                  // 检查 partOfSpeech 字段
                  if (item.partOfSpeech && item.partOfSpeech.toLowerCase().includes(pos)) {
                    return true;
                  }
                  // 检查 detailedInfo 中的定义
                  if (item.detailedInfo && item.detailedInfo.definitions) {
                    return item.detailedInfo.definitions.some(def =>
                      def.pos && def.pos.toLowerCase().includes(pos)
                    );
                  }
                  // 检查 detailedInfo 中的 partOfSpeech
                  if (item.detailedInfo && item.detailedInfo.partOfSpeech) {
                    return item.detailedInfo.partOfSpeech.toLowerCase().includes(pos);
                  }
                  return false;
                });
              });
              console.log(`📝 词性筛选 (${filters.pos.join(', ')}): ${beforeCount} -> ${window.currentPageData.length}`);
            }

            // 应用排序
            console.log('🔀 应用排序:', filters.sort);
            if (typeof window.sortData === 'function') {
              window.sortData(window.currentPageData, filters.sort);
            } else {
              console.error('❌ sortData函数不存在');
            }

            // 立即更新UI
            const wordList = document.getElementById('wordList');
            if (wordList) {
              console.log('🎨 开始更新UI，wordList元素存在');
              
              // 立即更新，不使用动画延迟
              if (typeof window.displayWords === 'function') {
                window.displayWords(window.currentPageData, 0, window.PAGE_SIZE);
                console.log('✅ displayWords执行完成');
              } else {
                console.error('❌ displayWords函数不存在');
              }
              
              if (typeof window.updatePageStats === 'function') {
                window.updatePageStats(window.currentPageData.length);
                console.log('✅ updatePageStats执行完成');
              } else {
                console.error('❌ updatePageStats函数不存在');
              }
              
              // 添加视觉反馈动画（在更新后）
              wordList.style.opacity = '0.8';
              wordList.style.transform = 'scale(0.99)';
              wordList.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
              
              setTimeout(() => {
                wordList.style.opacity = '1';
                wordList.style.transform = 'scale(1)';
                setTimeout(() => {
                  wordList.style.transition = '';
                }, 200);
              }, 50);
              
            } else {
              console.warn('⚠️ wordList元素不存在');
            }

            console.log('✅ 筛选应用完成:', {
              totalItems: window.currentPageData.length,
              filters: filters,
              viewMode: filters.view
            });
          } else {
            console.warn('⚠️ 当前不在wordList页面，跳过筛选应用。当前页面:', window.currentPage);
          }
        }
      });
      console.log('✅ FilterPanel 初始化成功');
    } catch (error) {
      console.error('❌ FilterPanel 初始化失败:', error);
    }
  } else {
    console.error('❌ FilterPanel 类未定义！');
  }

  console.log('✅ UI组件初始化完成', {
    filterPanel: !!window.filterPanel,
    wordDrawer: !!window.wordDrawer,
    currentViewMode: window.currentViewMode,
    currentFilterState: window.currentFilterState
  });
}

// 立即执行初始化
console.log('popup.js 加载完成，准备初始化组件');
setTimeout(() => {
  initializeComponents();
}, 0);

document.addEventListener('wordDrawerReview', (e) => {
  const { word } = e.detail;
  console.log('添加到复习列表:', word);
  // TODO: 实现添加到复习列表的逻辑
});

document.addEventListener('wordDrawerAddToReview', (e) => {
  const { word } = e.detail;
  console.log('添加到复习列表:', word);
  // TODO: 实现添加到复习列表的逻辑
});

document.addEventListener('wordDrawerWordClick', (e) => {
  const { word } = e.detail;
  console.log('点击同义词/反义词/同根词:', word);
  // TODO: 实现查询并显示该单词的详细信息
});

// ====================
// 筛选按钮事件监听
// ====================

// 绑定筛选按钮事件
function bindFilterButton() {
  const filterBtn = document.getElementById('filterBtn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      if (window.filterPanel) {
        window.filterPanel.show();
      } else {
        console.error('FilterPanel未初始化');
      }
    });
    console.log('筛选按钮事件已绑定');
  } else {
    console.warn('找不到筛选按钮元素');
  }
}

// 确保在DOM加载完成后绑定事件
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindFilterButton);
} else {
  // DOM已经加载完成，直接绑定
  bindFilterButton();
}



// ====================
// 对话框管理器初始化
// ====================

/**
 * 初始化对话框管理器
 * 设置对话框头部的 SVG 图标
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
function initializeDialogManager() {
  if (typeof DialogManager === 'undefined') {
    console.warn('DialogManager 类未定义');
    return;
  }

  // 检查 window.iconLibrary 是否可用
  if (typeof window.iconLibrary === 'undefined' || typeof window.iconLibrary.getIcon !== 'function') {
    console.warn('iconLibrary 未正确定义或缺少 getIcon 方法');
    return;
  }

  try {
    const dialogManager = new DialogManager();
    // 传递 window.iconLibrary 对象
    dialogManager.initialize(window.iconLibrary);
    window.dialogManager = dialogManager;
    console.log('✅ 对话框管理器初始化成功');
  } catch (error) {
    console.error('❌ 对话框管理器初始化失败:', error);
  }
}

// 在 DOM 加载完成后初始化对话框管理器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDialogManager);
} else {
  initializeDialogManager();
}
