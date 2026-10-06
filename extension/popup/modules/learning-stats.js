/**
 * 学习统计模块
 * 负责计算和更新学习统计数据，包括可视化进度条
 */

/**
 * 更新学习统计数据
 * 计算并更新今日学习、掌握程度、待复习的数据，包括可视化进度条
 */
function updateLearningStats() {
  // 确保 wordsData 存在
  if (!window.wordsData) {
    console.warn('[Learning Stats] wordsData not available yet');
    return;
  }

  // 计算今日学习的单词数量
  const today = new Date().toDateString();
  let todayLearnedCount = 0;
  
  // 计算掌握程度
  let totalWords = Object.keys(window.wordsData).length;
  let masteredCount = 0;
  
  // 计算待复习的单词数量
  let toReviewCount = 0;
  
  // 获取学习进度数据
  chrome.storage.local.get(['learningProgress', 'userSettings'], (result) => {
    const progress = result.learningProgress || {};
    const settings = result.userSettings || {};
    const dailyGoal = settings.dailyGoal || 20;
    
    // 计算今日学习的单词数量
    for (const wordKey in window.wordsData) {
      const word = window.wordsData[wordKey];
      if (word.lastUsed && new Date(word.lastUsed).toDateString() === today) {
        todayLearnedCount++;
      }
    }
    
      // 计算掌握程度和待复习的单词数量
    // 防御性检查：只统计wordsData中存在的单词
    for (const wordKey in progress) {
      // 只处理存在于wordsData中的单词
      if (window.wordsData[wordKey]) {
        const wordProgress = progress[wordKey];
        if (wordProgress.masteryLevel >= 3) {
          masteredCount++;
        }
        if (wordProgress.nextReview && wordProgress.nextReview <= Date.now()) {
          toReviewCount++;
        }
      }
    }
    
    // 更新今日学习统计
    const todayLearnedElement = document.getElementById('todayLearned');
    const todayProgressBarElement = document.getElementById('todayProgressBar');
    const todayProgressTextElement = document.getElementById('todayProgressText');
    if (todayLearnedElement) {
      todayLearnedElement.textContent = todayLearnedCount;
    }
    if (todayProgressBarElement) {
      const todayProgress = Math.min((todayLearnedCount / dailyGoal) * 100, 100);
      todayProgressBarElement.style.width = `${todayProgress}%`;
    }
    if (todayProgressTextElement) {
      todayProgressTextElement.textContent = `${todayLearnedCount}/${dailyGoal}`;
    }
    
    // 更新掌握程度统计
    const masteryLevelElement = document.getElementById('masteryLevel');
    const masteryProgressCircleElement = document.getElementById('masteryProgressCircle');
    if (masteryLevelElement) {
      // 计算掌握程度，确保不超过100%
      const masteryPercentage = totalWords > 0 ? Math.min(Math.round((masteredCount / totalWords) * 100), 100) : 0;
      masteryLevelElement.textContent = `${masteryPercentage}%`;
      
      // 更新环形进度条
      if (masteryProgressCircleElement) {
        // 根据掌握程度设置不同颜色
        let progressColor = '#4CAF50';
        if (masteryPercentage < 30) {
          progressColor = '#F44336';
        } else if (masteryPercentage < 70) {
          progressColor = '#FFC107';
        }
        
        // 计算角度
        const degree = (masteryPercentage / 100) * 360;
        masteryProgressCircleElement.style.background = `conic-gradient(${progressColor} ${degree}deg, rgba(255, 255, 255, 0.1) ${degree}deg)`;
      }
    }
    
    // 更新待复习统计
    const toReviewElement = document.getElementById('toReview');
    const reviewProgressBarElement = document.getElementById('reviewProgressBar');
    if (toReviewElement) {
      toReviewElement.textContent = toReviewCount;
    }
    if (reviewProgressBarElement) {
      // 计算垂直进度条高度，最大100%
      const maxReview = Math.max(totalWords * 0.3, 20); // 最大待复习数为总单词的30%或20，取较大值
      const reviewProgress = Math.min((toReviewCount / maxReview) * 100, 100);
      reviewProgressBarElement.style.height = `${reviewProgress}%`;
    }
  });
}

// 将函数挂载到window对象，以便在其他文件中使用
window.updateLearningStats = updateLearningStats;
