/**
 * 学习模式管理器
 * 处理各种学习模式（闪卡、测验、拼写）的核心逻辑
 */
class LearningManager {
  constructor() {
    this.currentMode = 'flashcard';
    this.currentSession = null;
    this.currentFilter = 'all';
    this.wordsToLearn = [];
    this.currentIndex = 0;
    this.sessionStats = {
      total: 0,
      correct: 0,
      startTime: null,
      mistakes: []
    };
    
    // Initialize Review_Queue_Manager if available
    this.reviewQueueManager = null;
    this.initReviewQueue();
  }
  
  /**
   * Initialize Review_Queue_Manager for optimized review scheduling
   */
  async initReviewQueue() {
    if (typeof ReviewQueueManager !== 'undefined' && !this.reviewQueueManager) {
      try {
        this.reviewQueueManager = new ReviewQueueManager({
          storageKey: 'learning_review_queue',
          persistDelay: 2000
        });
        
        // Load existing queue from storage
        const loaded = await this.reviewQueueManager.load();
        if (!loaded) {
          // Build queue from learning progress
          const result = await chrome.storage.local.get(['learningProgress']);
          const progress = result.learningProgress || {};
          const words = Object.keys(progress).map(key => ({
            word: key,
            ...progress[key]
          }));
          
          // Add words to queue
          if (words.length > 0) {
            this.reviewQueueManager.batchAdd(words);
          }
        }
        console.log('[Learning Manager] Review_Queue_Manager initialized');
      } catch (error) {
        console.error('[Learning Manager] Failed to initialize Review_Queue_Manager:', error);
      }
    }
  }

  /**
   * 开始学习会话
   */
  async startLearningSession(mode = 'flashcard', wordFilter = 'all') {
    try {
      // 获取用户设置
      const result = await chrome.storage.local.get(['userSettings', 'translatedWords', 'learningProgress']);
      const settings = result.userSettings || {};
      const words = result.translatedWords || {};
      const progress = result.learningProgress || {};
      
      // 筛选要学习的单词
      this.wordsToLearn = this.filterWordsForLearning(words, wordFilter, progress, settings);
      
      // 测验模式下排除句子学习
      if (mode === 'quiz') {
        this.wordsToLearn = this.wordsToLearn.filter(word => word.type !== 'sentence');
      }
    
    if (this.wordsToLearn.length === 0) {
      let alertMessage = '';
      if (wordFilter === 'difficult') {
        alertMessage = '🎉 太棒了！没有需要复习的难点单词，继续保持！';
      } else if (Object.keys(words).length === 0) {
        alertMessage = '没有可学习的单词，请先添加一些翻译记录！';
      } else {
        alertMessage = '没有符合当前筛选条件的单词可学习！';
      }
      alert(alertMessage);
      return false;
    }

      // 初始化会话
      this.currentMode = mode;
      this.currentFilter = wordFilter;
      this.currentIndex = 0;
      this.sessionStats = {
        total: this.wordsToLearn.length,
        correct: 0, 
        startTime: Date.now(),
        mistakes: []
      };

      // 显示学习页面
      showPage('learning');
      
      // 初始化对应的学习模式
      this.initializeLearningMode(mode);
      
      return true;
      
    } catch (error) {
      console.error('开始学习会话失败:', error);
      alert('开始学习失败，请重试');
      return false;
    }
  }

  /**
   * 筛选适合学习的单词 - 性能优化版
   */
  filterWordsForLearning(words, filter, progress, settings) {
    // 预计算单词数量，避免重复调用 Object.values
    const wordEntries = Object.entries(words);
    let filteredWords = [];
    
    // Try using Word_Index_Manager for optimized filtering if available
    if (window.wordIndexManager && filter === 'all') {
      try {
        // Get all words from index
        const stats = window.wordIndexManager.getStats();
        if (stats.wordCount > 0) {
          // Use index to get all words efficiently
          filteredWords = wordEntries.map(([key, word]) => {
            const indexedWord = window.wordIndexManager.find(key);
            if (indexedWord) {
              return indexedWord;
            }
            return { key, ...word };
          });
        }
      } catch (error) {
        console.error('[Learning Manager] Word_Index_Manager filtering failed, falling back:', error);
      }
    }
    
    // Fallback to traditional filtering if index not available or for specific filters
    if (filteredWords.length === 0) {
      // 先根据筛选条件过滤，减少后续排序的数据量
      for (const [key, word] of wordEntries) {
        let shouldInclude = true;
        
        // 根据筛选条件快速判断是否包含
        switch (filter) {
          case 'words':
            shouldInclude = word.type === 'word';
            break;
          case 'phrases':
            shouldInclude = word.type === 'phrase';
            break;
          case 'sentences':
            shouldInclude = word.type === 'sentence';
            break;
          case 'starred':
            shouldInclude = !!word.starred;
            break;
          case 'difficult':
            // 复习难点：答错过的单词（correctCount < reviewCount）
            const wordProgressDiff = progress[word.word || word.key];
            shouldInclude = wordProgressDiff && 
              wordProgressDiff.reviewCount > 0 && 
              wordProgressDiff.correctCount < wordProgressDiff.reviewCount;
            break;
        }
        
        if (shouldInclude) {
          // 预计算进度信息，避免重复计算
          const wordKey = word.word || word.key;
          const wordProgress = progress[wordKey] || { masteryLevel: 0, lastReviewed: 0 };
          
          // 添加到结果数组，并附加预计算的进度信息
          filteredWords.push({
            ...word,
            _progress: wordProgress
          });
        }
      }
    } else {
      // Add progress info to indexed words
      filteredWords = filteredWords.map(word => {
        const wordKey = word.word || word.key;
        const wordProgress = progress[wordKey] || { masteryLevel: 0, lastReviewed: 0 };
        return {
          ...word,
          _progress: wordProgress
        };
      });
    }
    
    // 根据学习进度排序（优先学习掌握程度低的单词）
    if (filter === 'daily') {
      // 每日挑战：特殊排序逻辑
      filteredWords.sort((a, b) => {
        // 优先选择未掌握的单词（掌握程度<3）
        const isMasteredA = a._progress.masteryLevel >= 3;
        const isMasteredB = b._progress.masteryLevel >= 3;
        if (isMasteredA !== isMasteredB) {
          return isMasteredA ? 1 : -1;
        }
        
        // 然后选择最近未学习的单词
        return a._progress.lastReviewed - b._progress.lastReviewed;
      });
    } else {
      // 普通排序：优先学习掌握程度低、最近未复习的单词
      filteredWords.sort((a, b) => {
        // 优先学习掌握程度低的单词
        if (a._progress.masteryLevel !== b._progress.masteryLevel) {
          return a._progress.masteryLevel - b._progress.masteryLevel;
        }
        
        // 然后优先学习最近没有复习的单词
        return a._progress.lastReviewed - b._progress.lastReviewed;
      });
    }
    
    // 移除预计算的进度信息，保持原始数据结构
    filteredWords = filteredWords.map(({ _progress, ...word }) => word);
    
    // 随机打乱单词顺序，确保每次学习的体验不同
    // 使用 Fisher-Yates 算法，更高效
    for (let i = filteredWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredWords[i], filteredWords[j]] = [filteredWords[j], filteredWords[i]];
    }
    
    // 限制学习数量（根据用户设置）
    const dailyGoal = settings.dailyGoal || 20;
    return filteredWords.slice(0, dailyGoal);
  }

  /**
   * 初始化学习模式
   */
  initializeLearningMode(mode) {
    // 隐藏所有模式
    document.querySelectorAll('.flashcard-mode, .quiz-mode, .spelling-mode').forEach(el => {
      el.classList.remove('active');
    });

    // 强制隐藏结果框，防止跨模式显示
    ['quizResult', 'spellingResult'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    // 激活对应模式
    document.getElementById(`${mode}Mode`).classList.add('active');
    
    // 更新模式标识文本
    const badge = document.getElementById('currentModeBadge');
    if (badge) {
      let modeText = '';
      switch (mode) {
        case 'flashcard':
          modeText = '📖 闪卡模式';
          break;
        case 'quiz':
          modeText = '📝 测验模式';
          break;
        case 'spelling':
          modeText = '✍️ 拼写模式';
          break;
      }
      badge.textContent = modeText;
    }

    // 根据模式初始化
    switch (mode) {
      case 'flashcard':
        this.initFlashcardMode();
        break;
      case 'quiz':
        this.initQuizMode();
        break;
      case 'spelling':
        this.initSpellingMode();
        break;
    }
  }

  /**
   * 初始化闪卡模式
   */
  initFlashcardMode() {
    this.showCurrentFlashcard();
  }

  /**
   * 显示当前闪卡
   */
  showCurrentFlashcard() {
    const currentWord = this.wordsToLearn[this.currentIndex];
    if (!currentWord) {
      this.finishLearningSession();
      return;
    }

    const wordDisplay = document.getElementById('currentWord');
    const phoneticDisplay = document.getElementById('currentPhonetic');
    const posDisplay = document.getElementById('currentPOS');
    const translationDisplay = document.getElementById('currentTranslation');
    const examplesDisplay = document.getElementById('currentExamples');
    const flashcard = document.querySelector('.flashcard');

    // 重置翻转状态，确保显示正面
    flashcard.classList.remove('flipped');

    // 等待翻转动画完成后更新内容
    setTimeout(() => {
      wordDisplay.textContent = currentWord.word || currentWord.key;
      phoneticDisplay.textContent = currentWord.phonetic || '';
      posDisplay.textContent = currentWord.partOfSpeech ? `(${currentWord.partOfSpeech})` : '';
      translationDisplay.textContent = '点击翻转查看翻译';
      examplesDisplay.textContent = '';
    }, 150);

    // 更新进度
    this.updateLearningProgress();
  }

  /**
   * 翻转闪卡
   */
  flipFlashcard() {
    const flashcard = document.querySelector('.flashcard');
    const currentWord = this.wordsToLearn[this.currentIndex];
    
    flashcard.classList.toggle('flipped');
    
    const translationDisplay = document.getElementById('currentTranslation');
    const examplesDisplay = document.getElementById('currentExamples');
    
    // 无论翻转方向，都在动画完成后更新内容
    setTimeout(() => {
      if (flashcard.classList.contains('flipped')) {
        translationDisplay.textContent = currentWord.translation;
        if (currentWord.examples && currentWord.examples.length > 0) {
          examplesDisplay.textContent = currentWord.examples.slice(0, 2).join('\n');
        } else {
          examplesDisplay.textContent = '';
        }
      } else {
        translationDisplay.textContent = '点击翻转查看翻译';
        examplesDisplay.textContent = '';
      }
    }, 150);
  }

  /**
   * 处理闪卡难度反馈
   */
  handleFlashcardDifficulty(difficulty) {
    const currentWord = this.wordsToLearn[this.currentIndex];
    const wordKey = currentWord.word || currentWord.key;
    
    // 记录学习结果
    this.recordLearningResult(wordKey, difficulty === 'easy');
    
    // 移动到下一个单词
    this.currentIndex++;
    if (this.currentIndex >= this.wordsToLearn.length) {
      this.finishLearningSession();
    } else {
      this.showCurrentFlashcard();
    }
  }

  /**
   * 初始化测验模式
   */
  initQuizMode() {
    this.showCurrentQuiz();
  }

  /**
   * 显示当前测验题 - 优化版：使用DocumentFragment和事件委托
   */
  showCurrentQuiz() {
    const currentWord = this.wordsToLearn[this.currentIndex];
    if (!currentWord) {
      this.finishLearningSession();
      return;
    }

    // 缓存DOM引用，避免重复查询
    const questionText = this.questionText || (this.questionText = document.getElementById('quizQuestion'));
    const optionsContainer = this.optionsContainer || (this.optionsContainer = document.getElementById('quizOptions'));
    const resultContainer = this.resultContainer || (this.resultContainer = document.getElementById('quizResult'));

    // 隐藏结果区域
    resultContainer.style.display = 'none';

    // 生成问题（显示翻译，让用户选择英文）
    questionText.textContent = `"${currentWord.translation}" 的英文是什么？`;

    // 生成选项
    const options = this.generateQuizOptions(currentWord);
    
    // 使用DocumentFragment批量创建和添加选项，减少DOM操作
    const fragment = document.createDocumentFragment();
    
    options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'quiz-option';
      optionElement.textContent = option.word;
      optionElement.dataset.word = option.word;
      optionElement.dataset.correct = option.isCorrect;
      fragment.appendChild(optionElement);
    });
    
    // 清空容器并一次性添加所有选项
    optionsContainer.innerHTML = '';
    optionsContainer.appendChild(fragment);
    
    // 移除旧的事件监听器，避免重复添加
    if (this.quizOptionClickHandler) {
      optionsContainer.removeEventListener('click', this.quizOptionClickHandler);
    }
    
    // 添加事件委托，处理选项点击，减少事件监听器数量
    this.quizOptionClickHandler = (e) => {
      const option = e.target.closest('.quiz-option');
      if (option) {
        this.handleQuizAnswer(option);
      }
    };
    optionsContainer.addEventListener('click', this.quizOptionClickHandler);

    this.updateLearningProgress();
  }

  /**
   * 生成测验选项 - 确保所有选项与正确答案类型一致，包含易混淆单词
   */
  generateQuizOptions(correctWord) {
    const options = [];
    const correctOption = {
      word: correctWord.word || correctWord.key,
      isCorrect: true
    };
    options.push(correctOption);

    // 获取正确答案的类型和关键词
    const correctType = correctWord.type;
    const correctWordText = correctWord.word || correctWord.key;
    
    // 易混淆单词列表 - 按单词类型分类
    const confusableWords = {
      'word': {
        'apple': ['apples', 'apply', 'ample', 'able'],
        'book': ['look', 'cook', 'hook', 'took'],
        'cat': ['hat', 'bat', 'rat', 'mat'],
        'dog': ['fog', 'log', 'bog', 'dig'],
        'house': ['mouse', 'horse', 'hose', 'house'],
        'love': ['live', 'leave', 'life', 'lose'],
        'time': ['time', 'lime', 'mime', 'dime'],
        'water': ['waiter', 'winter', 'wetter', 'water']
      },
      'phrase': {
        'take off': ['take on', 'take in', 'take out', 'take up'],
        'look for': ['look after', 'look at', 'look up', 'look into'],
        'turn on': ['turn off', 'turn up', 'turn down', 'turn around'],
        'break down': ['break up', 'break in', 'break out', 'break through'],
        'give up': ['give in', 'give out', 'give away', 'give back'],
        'make up': ['make out', 'make off', 'make up for', 'make into']
      }
    };
    
    // 获取正确答案的易混淆单词列表
    let possibleDistractors = [];
    if (confusableWords[correctType] && confusableWords[correctType][correctWordText]) {
      // 如果有预设的易混淆单词，使用它们
      possibleDistractors = confusableWords[correctType][correctWordText];
    } else {
      // 否则，使用已有记录的同类型单词
      const otherWords = this.wordsToLearn.filter(w => 
        (w.word || w.key) !== correctWordText && 
        w.type === correctType
      );
      possibleDistractors = otherWords.map(word => word.word || word.key);
    }
    
    // 确保可能的干扰项中不包含正确答案
    possibleDistractors = possibleDistractors.filter(word => word !== correctWordText);
    
    // 生成干扰选项
    let distractors = [];
    if (possibleDistractors.length >= 3) {
      // 随机选择3个易混淆单词
      distractors = possibleDistractors
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(word => ({
          word: word,
          isCorrect: false
        }));
    } else {
      // 使用所有可用的易混淆单词
      distractors = possibleDistractors.map(word => ({
        word: word,
        isCorrect: false
      }));
      
      // 如果还是不足3个，使用其他同类型单词或生成一些变体
      if (distractors.length < 3) {
        // 获取更多同类型单词
        const moreWords = this.wordsToLearn.filter(w => 
          (w.word || w.key) !== correctWordText && 
          w.type === correctType &&
          !possibleDistractors.includes(w.word || w.key)
        );
        
        // 添加更多同类型单词
        moreWords.forEach(word => {
          if (distractors.length < 3) {
            distractors.push({
              word: word.word || word.key,
              isCorrect: false
            });
          }
        });
        
        // 如果还是不足，生成一些变体
        while (distractors.length < 3) {
          // 生成一些简单的变体，如添加s、ing等
          let variant = correctWordText;
          if (correctWordText.endsWith('e')) {
            variant = correctWordText + 's';
          } else if (correctWordText.endsWith('ing')) {
            variant = correctWordText.slice(0, -3);
          } else {
            variant = correctWordText + 's';
          }
          
          distractors.push({
            word: variant,
            isCorrect: false
          });
        }
      }
    }
    
    options.push(...distractors);
    
    // 打乱选项顺序
    return options.sort(() => Math.random() - 0.5);
  }

  /**
   * 处理测验答案
   */
  handleQuizAnswer(selectedOption) {
    const isCorrect = selectedOption.dataset.correct === 'true';
    const currentWord = this.wordsToLearn[this.currentIndex];
    const wordKey = currentWord.word || currentWord.key;
    
    // 记录学习结果
    this.recordLearningResult(wordKey, isCorrect);
    
    // 显示结果
    this.showQuizResult(isCorrect);
    
    // 禁用所有选项
    document.querySelectorAll('.quiz-option').forEach(option => {
      option.style.pointerEvents = 'none';
      if (option.dataset.correct === 'true') {
        option.classList.add('correct');
      } else if (option === selectedOption && !isCorrect) {
        option.classList.add('incorrect');
      }
    });
  }

  /**
   * 显示测验结果
   */
  showQuizResult(isCorrect) {
    const resultContainer = document.getElementById('quizResult');
    const resultIcon = document.getElementById('resultIcon');
    const resultText = document.getElementById('resultText');
    
    resultContainer.style.display = 'flex';
    // 移除旧的类
    resultContainer.classList.remove('correct', 'incorrect');
    
    if (isCorrect) {
      resultContainer.classList.add('correct');
      resultIcon.innerHTML = `
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      `;
      resultText.textContent = '回答正确！';
      resultText.style.color = '';
    } else {
      resultContainer.classList.add('incorrect');
      resultIcon.innerHTML = `
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      `;
      resultText.textContent = '回答错误，继续加油！';
      resultText.style.color = '';
    }
  }

  /**
   * 处理下一题
   */
  handleNextQuiz() {
    this.currentIndex++;
    if (this.currentIndex >= this.wordsToLearn.length) {
      this.finishLearningSession();
    } else {
      this.showCurrentQuiz();
    }
  }

  /**
   * 初始化拼写模式
   */
  initSpellingMode() {
    this.showCurrentSpelling();
  }

  /**
   * 显示当前拼写题 - 添加词性信息
   */
  showCurrentSpelling() {
    const currentWord = this.wordsToLearn[this.currentIndex];
    if (!currentWord) {
      this.finishLearningSession();
      return;
    }

    const promptElement = document.getElementById('spellingPrompt');
    const inputElement = document.getElementById('spellingInput');
    const resultContainer = document.getElementById('spellingResult');

    // 隐藏结果区域，清空输入
    resultContainer.style.display = 'none';
    inputElement.value = '';
    inputElement.disabled = false;

    // 生成提示文本，包含翻译和词性
    const posText = currentWord.partOfSpeech ? `(${currentWord.partOfSpeech})` : '';
    promptElement.textContent = `请拼写："${currentWord.translation}" ${posText}`;

    // 添加回车键监听
    inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSpellingSubmit();
      }
    });

    this.updateLearningProgress();
  }

  /**
   * 处理拼写提交
   */
  handleSpellingSubmit() {
    const currentWord = this.wordsToLearn[this.currentIndex];
    const wordKey = currentWord.word || currentWord.key;
    const userInput = document.getElementById('spellingInput').value.trim().toLowerCase();
    const correctAnswer = wordKey.toLowerCase();
    
    const isCorrect = userInput === correctAnswer;
    
    // 记录学习结果
    this.recordLearningResult(wordKey, isCorrect);
    
    // 显示结果
    this.showSpellingResult(isCorrect, correctAnswer);
  }

  /**
   * 显示拼写结果
   */
  showSpellingResult(isCorrect, correctAnswer) {
    const resultContainer = document.getElementById('spellingResult');
    const feedbackElement = document.getElementById('spellingFeedback');
    const correctElement = document.getElementById('correctSpelling');
    const inputElement = document.getElementById('spellingInput');
    
    resultContainer.style.display = 'block';
    inputElement.disabled = true;
    
    if (isCorrect) {
      feedbackElement.textContent = '拼写正确！';
      feedbackElement.style.color = '#27ae60';
      correctElement.style.display = 'none';
    } else {
      feedbackElement.textContent = '拼写错误，正确答案是：';
      feedbackElement.style.color = '#e74c3c';
      correctElement.textContent = correctAnswer;
      correctElement.style.display = 'block';
    }
  }

  /**
   * 处理下一题拼写
   */
  handleNextSpelling() {
    this.currentIndex++;
    if (this.currentIndex >= this.wordsToLearn.length) {
      this.finishLearningSession();
    } else {
      this.showCurrentSpelling();
    }
  }

  /**
   * 更新学习进度显示
   */
  updateLearningProgress() {
    const progressElement = document.getElementById('learningProgress');
    const current = this.currentIndex + 1;
    const total = this.wordsToLearn.length;
    progressElement.textContent = `${current}/${total}`;
    
    // 更新进度条
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
      const progress = (current / total) * 100;
      progressFill.style.width = `${progress}%`;
    }
  }

  /**
   * 记录学习结果
   */
  async recordLearningResult(wordKey, isCorrect) {
    try {
      const result = await chrome.storage.local.get(['learningProgress']);
      const progress = result.learningProgress || {};
      
      if (!progress[wordKey]) {
        progress[wordKey] = {
          masteryLevel: 0,
          reviewCount: 0,
          correctCount: 0,
          lastReviewed: Date.now(),
          nextReview: Date.now(),
          difficulty: 1.0
        };
      }
      
      const wordProgress = progress[wordKey];
      wordProgress.reviewCount++;
      wordProgress.lastReviewed = Date.now();
      wordProgress.lastReviewTime = Date.now(); // For Review_Queue_Manager
      
      if (isCorrect) {
        wordProgress.correctCount++;
        wordProgress.masteryLevel = Math.min(wordProgress.masteryLevel + 1, 5);
      } else {
        wordProgress.masteryLevel = Math.max(wordProgress.masteryLevel - 1, 0);
        this.sessionStats.mistakes.push(wordKey);
      }
      
      // 计算下次复习时间（基于掌握程度）
      const intervals = [1, 2, 4, 7, 14, 30]; // 天数
      const interval = intervals[wordProgress.masteryLevel] || 30;
      wordProgress.nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);
      
      await chrome.storage.local.set({ learningProgress: progress });
      
      // Update Review_Queue_Manager if available
      if (this.reviewQueueManager) {
        try {
          this.reviewQueueManager.updateAfterReview(wordKey, isCorrect);
        } catch (error) {
          console.error('[Learning Manager] Failed to update Review_Queue_Manager:', error);
        }
      }
      
      if (isCorrect) {
        this.sessionStats.correct++;
      }
      
      // 记录到学习历史（真实数据）
      if (window.learningHistoryManager) {
        await window.learningHistoryManager.recordLearning(wordKey, this.currentMode);
        
        // 如果是每日挑战，更新挑战进度
        if (this.currentFilter === 'daily') {
          await window.learningHistoryManager.updateChallengeProgress(wordKey);
        }
      }
      
    } catch (error) {
      console.error('记录学习结果失败:', error);
    }
  }

  /**
   * 完成学习会话
   */
  async finishLearningSession() {
    const endTime = Date.now();
    const duration = Math.round((endTime - this.sessionStats.startTime) / 60000); // 分钟
    // 修复正确率计算：确保 total 不为 0，且正确数不超过总数
    const total = Math.max(this.sessionStats.total, 1);
    const correct = Math.min(this.sessionStats.correct, total);
    const accuracy = Math.round((correct / total) * 100);
    
    // 显示学习总结
    this.showLearningSummary(duration, accuracy);
    
    // 更新学习统计数据
    updateLearningStats();
    
    // 如果是每日挑战，记录完成情况
    if (this.currentFilter === 'daily') {
      try {
        const today = new Date().toDateString();
        const result = await chrome.storage.local.get(['dailyChallenges']);
        const dailyChallenges = result.dailyChallenges || {};
        
        // 记录每日挑战完成情况
        dailyChallenges[today] = {
          completed: true,
          accuracy: accuracy,
          duration: duration,
          totalWords: this.sessionStats.total,
          correctWords: this.sessionStats.correct,
          timestamp: endTime
        };
        
        await chrome.storage.local.set({ dailyChallenges: dailyChallenges });
      } catch (error) {
        console.error('记录每日挑战完成情况失败:', error);
      }
    }
  }

  /**
   * 显示学习总结
   */
  showLearningSummary(duration, accuracy) {
    // 隐藏学习区域
    document.getElementById('learningArea').style.display = 'none';
    
    // 显示总结区域
    const summaryElement = document.getElementById('learningSummary');
    summaryElement.style.display = 'block';
    
    // 填充统计数据
    document.getElementById('totalQuestions').textContent = this.sessionStats.total;
    document.getElementById('correctAnswers').textContent = this.sessionStats.correct;
    document.getElementById('accuracyRate').textContent = `${accuracy}%`;
    document.getElementById('learningTime').textContent = `${duration}分钟`;
    
    // 添加重新开始学习按钮的事件监听器
    this.setupRestartButton();
  }
  
  /**
   * 设置重新开始学习按钮的事件监听器
   */
  setupRestartButton() {
    // 移除旧的事件监听器，避免重复绑定
    const restartBtn = document.getElementById('restartLearning');
    restartBtn.removeEventListener('click', this.restartLearning.bind(this));
    
    // 添加新的事件监听器
    restartBtn.addEventListener('click', this.restartLearning.bind(this));
  }

  /**
   * 复习错题
   */
  reviewMistakes() {
    if (this.sessionStats.mistakes.length === 0) {
      alert('没有错题需要复习！');
      return;
    }
    
    // 创建错题学习会话
    this.wordsToLearn = this.sessionStats.mistakes.map(wordKey => {
      return this.wordsToLearn.find(w => (w.word || w.key) === wordKey);
    }).filter(Boolean);
    
    this.currentIndex = 0;
    this.sessionStats.mistakes = [];
    
    // 重新开始学习
    document.getElementById('learningArea').style.display = 'block';
    document.getElementById('learningSummary').style.display = 'none';
    
    this.initializeLearningMode(this.currentMode);
  }
  
  /**
   * 重新开始学习会话
   */
  restartLearning() {
    // 隐藏学习总结，显示学习区域
    document.getElementById('learningSummary').style.display = 'none';
    document.getElementById('learningArea').style.display = 'block';
    
    // 重新开始相同模式的学习会话
    this.startLearningSession(this.currentMode, 'all');
  }

  /**
   * 开始新的学习会话
   */
  startNewSession() {
    // 直接返回首页，由showPage函数统一处理页面状态
    showPage('home');
  }
}

// 兼容传统脚本加载（popup.html 使用）
if (typeof window !== 'undefined') {
  window.LearningManager = LearningManager;
}