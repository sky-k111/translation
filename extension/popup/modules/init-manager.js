/**
 * 初始化管理器
 * 负责应用的初始化、事件监听器设置和引导功能
 */

/**
 * 初始化事件监听器
 */
function initEventListeners() {
  // 初始化模式选择页面
  initModeSelectionPage();

  // 统计卡片点击事件
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const page = e.currentTarget.dataset.page;
      showPage(page);
    });
  });

   // 设置按钮点击事件
   document.getElementById('settingsBtn').addEventListener('click', () => {
     showPage('settings');
   });

  // 返回按钮点击事件
  document.getElementById('backBtn').addEventListener('click', () => {
    showPage('home');
  });

  document.getElementById('backBtnFromLearning').addEventListener('click', () => {
    showPage('modeSelection');
  });

  document.getElementById('backBtnFromSettings').addEventListener('click', () => {
    showPage('home');
  });

  // 清空所有记录按钮点击事件
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    clearAllWords();
  });

  // 搜索框输入事件（带防抖）
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', debounce(async (e) => {
    const searchTerm = e.target.value;
    currentPageIndex = 0;
    currentPageData = getFilteredData(currentFilter, searchTerm);
    displayWords(currentPageData, 0, PAGE_SIZE);
    updatePageStats(currentPageData.length);
  }, 300));

  // 搜索框聚焦/失焦控制流光进度条
  const streamProgressBar = document.getElementById('streamProgressBar');
  let progressBarTimer = null;

  searchInput.addEventListener('focus', () => {
    streamProgressBar.classList.add('active');
    // 动画自动循环，无需额外逻辑
  });

  searchInput.addEventListener('blur', () => {
    // 延迟隐藏，让动画完成当前周期
    if (progressBarTimer) clearTimeout(progressBarTimer);
    progressBarTimer = setTimeout(() => {
      streamProgressBar.classList.remove('active');
    }, 500);
  });

  // 闪卡翻转按钮点击事件
  document.getElementById('flipCard').addEventListener('click', () => {
    learningManager.flipFlashcard();
  });

  // 点击闪卡本身也可以翻转
  document.querySelector('.flashcard').addEventListener('click', (e) => {
    if (!e.target.closest('.control-btn')) {
      learningManager.flipFlashcard();
    }
  });

  // 难度按钮点击事件
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const difficulty = e.target.dataset.difficulty;
      learningManager.handleFlashcardDifficulty(difficulty);
    });
  });

  // 下一题按钮点击事件
  document.getElementById('nextQuiz').addEventListener('click', () => {
    learningManager.handleNextQuiz();
  });

  document.getElementById('nextSpelling').addEventListener('click', () => {
    learningManager.handleNextSpelling();
  });

  // 提交拼写按钮点击事件
  document.getElementById('submitSpelling').addEventListener('click', () => {
    learningManager.handleSpellingSubmit();
  });

  // 复习错题按钮点击事件
  document.getElementById('reviewMistakes').addEventListener('click', () => {
    learningManager.reviewMistakes();
  });

  // 返回首页按钮点击事件
  document.getElementById('startNewSession').addEventListener('click', () => {
    learningManager.startNewSession();
  });

  // 保存设置按钮点击事件
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    saveSettings();
  });

  // 取消设置按钮点击事件
  document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
    showPage('home');
  });

  // 防止学习界面滚轮干扰
  setupLearningWheelProtection();

  // AI Provider change event
  const aiProviderSelect = document.getElementById('aiProvider');
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener('change', (e) => {
      const provider = e.target.value;
      const config = AI_CONFIGS[provider];
      
      const aiModelInput = document.getElementById('aiModel');
      const aiApiUrlInput = document.getElementById('aiApiUrl');
      const aiApiUrlContainer = document.getElementById('aiApiUrlContainer');
      
      if (config) {
        if (aiModelInput) aiModelInput.value = config.model;
        if (aiApiUrlInput) aiApiUrlInput.value = config.apiUrl;
      }
      
      if (aiApiUrlContainer) {
        aiApiUrlContainer.style.display = (provider === 'custom') ? 'block' : 'none';
      }
    });
  }
}

/**
 * 设置学习界面的滚轮保护，防止在悬停时意外滚动
 */
function setupLearningWheelProtection() {
  const learningArea = document.getElementById('learningArea');
  const flipBtn = document.getElementById('flipCard');
  const flashcard = document.querySelector('.flashcard');
  const currentWord = document.getElementById('currentWord');
  
  if (!learningArea) return;
  
  const preventScroll = (e) => {
    if (e.target.closest('.flashcard') || 
        e.target.closest('.card-controls') ||
        e.target.closest('.quiz-question') ||
        e.target.closest('.spelling-question')) {
      e.preventDefault();
    }
  };
  
  learningArea.addEventListener('wheel', preventScroll, { passive: false });
  
  if (flipBtn) {
    flipBtn.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  }
  
  if (flashcard) {
    flashcard.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  }
  
  if (currentWord) {
    currentWord.parentElement.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  }
}

/**
 * 初始化模式选择页面
 */
function initModeSelectionPage() {
  // 绑定返回按钮
  const backBtn = document.getElementById('backBtnFromModeSelection');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showPage('home');
    });
  }

  // 仅绑定模式选择页面中的模式卡片点击事件，排除学习总结页面的按钮
  document.querySelectorAll('#modeSelectionPage .mode-icon-item').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      learningManager.startLearningSession(mode, pendingLearningFilter);
    });
  });
}

/**
 * 初始化首次使用引导
 */
async function initGuide() {
  const result = await chrome.storage.local.get(['hasSeenGuide']);
  if (result.hasSeenGuide) {
    return;
  }
  
  const guideOverlay = document.getElementById('guideOverlay');
  const steps = document.querySelectorAll('.guide-step');
  const dots = document.querySelectorAll('.dot');
  const nextBtn = document.getElementById('guideNextBtn');
  const finishBtn = document.getElementById('guideFinishBtn');
  const dontShowCheckbox = document.getElementById('guideDontShow');
  
  let currentStep = 1;
  const totalSteps = steps.length;
  
  // 显示引导层
  guideOverlay.style.display = 'flex';
  
  // 更新步骤显示
  function updateStep(step) {
    // 更新内容
    steps.forEach(el => el.classList.remove('active'));
    document.querySelector(`.guide-step[data-step="${step}"]`).classList.add('active');
    
    // 更新指示点
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index + 1 === step);
    });
    
    // 更新按钮
    if (step === totalSteps) {
      nextBtn.style.display = 'none';
      finishBtn.style.display = 'block';
    } else {
      nextBtn.style.display = 'block';
      finishBtn.style.display = 'none';
    }
    
    currentStep = step;
  }
  
  // 下一步点击事件
  nextBtn.addEventListener('click', () => {
    if (currentStep < totalSteps) {
      updateStep(currentStep + 1);
    }
  });
  
  // 完成点击事件
  finishBtn.addEventListener('click', async () => {
    // 隐藏引导层
    guideOverlay.style.opacity = '0';
    setTimeout(() => {
      guideOverlay.style.display = 'none';
    }, 300);
    
    // 保存设置
    if (dontShowCheckbox.checked) {
      await chrome.storage.local.set({ hasSeenGuide: true });
    }
  });
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async () => {
  // 启动监控
  window.performanceMonitor.start();
  // 初始化错误处理
  window.errorHandler.init();

  try {
    // 1. 首先初始化视图控制（需要在数据加载前完成）
    await window.initViewControls();
    console.log('✅ 视图控制初始化完成');

    // 2. 并行初始化核心模块 (不阻塞 UI)
    const initTasks = [
      window.themeManager.init(),
      window.dynamicBackgroundManager.init(),
      loadDataAndBuildIndex()
    ];

    // 3. 初始化事件监听器 (立即执行，不依赖数据)
    initEventListeners();

    // 4. 等待所有核心任务完成
    await Promise.all(initTasks);

    // 5. 数据就绪后的 UI 渲染
    loadHomePage();
    loadSettings();

    // 6. 性能打点：初始化完成
    window.performanceMonitor.markInitComplete();

    // 7. 触发平滑过渡
    requestAnimationFrame(() => {
      const splashScreen = document.getElementById('splashScreen');
      const container = document.querySelector('.container');
      
      if (splashScreen) splashScreen.classList.add('hidden');
      if (container) container.classList.add('visible');

      // 8. 懒加载非核心功能
      setTimeout(() => {
        initGuide();
        console.log('Lazy loaded: Guide');
      }, 500);
    });

  } catch (error) {
    window.errorHandler.handleError({
      type: 'Initialization Error',
      msg: error.message,
      stack: error.stack
    });
  }
});
