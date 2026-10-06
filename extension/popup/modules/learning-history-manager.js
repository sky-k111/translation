/**
 * 学习历史管理器
 * 记录每日学习活动，提供真实的学习数据
 * 
 * 数据结构：
 * learningHistory: {
 *   "2024-01-12": {
 *     wordsLearned: ["apple", "book", ...],  // 今天学习过的单词
 *     totalCount: 15,                         // 学习总次数
 *     modeUsage: {                            // 各模式使用次数
 *       flashcard: 10,
 *       quiz: 5,
 *       spelling: 0
 *     },
 *     startTime: 1705084400000,               // 首次学习时间
 *     lastTime: 1705088000000                 // 最后学习时间
 *   }
 * }
 * 
 * dailyChallenges: {
 *   "2024-01-12": {
 *     words: ["apple", "book", ...],          // 挑战单词列表
 *     completed: 15,                          // 已完成数量
 *     total: 20,                              // 总数量
 *     isCompleted: false,                     // 是否完成
 *     generatedAt: 1705084400000              // 生成时间
 *   }
 * }
 */

class LearningHistoryManager {
  constructor() {
    this.storageKeys = {
      history: 'learningHistory',
      challenges: 'dailyChallenges'
    };
  }

  /**
   * 获取今天的日期字符串
   * @returns {string} 格式: "2024-01-12"
   */
  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 获取学习历史数据
   * @returns {Promise<Object>}
   */
  async getHistory() {
    const result = await chrome.storage.local.get([this.storageKeys.history]);
    return result[this.storageKeys.history] || {};
  }

  /**
   * 获取今日学习数据
   * @returns {Promise<Object>}
   */
  async getTodayHistory() {
    const history = await this.getHistory();
    const todayKey = this.getTodayKey();
    
    return history[todayKey] || {
      wordsLearned: [],
      totalCount: 0,
      modeUsage: {
        flashcard: 0,
        quiz: 0,
        spelling: 0
      },
      startTime: null,
      lastTime: null
    };
  }

  /**
   * 记录学习活动
   * @param {string} wordKey - 学习的单词
   * @param {string} mode - 学习模式 (flashcard/quiz/spelling)
   * @returns {Promise<void>}
   */
  async recordLearning(wordKey, mode) {
    const history = await this.getHistory();
    const todayKey = this.getTodayKey();
    const now = Date.now();
    
    // 初始化今日数据
    if (!history[todayKey]) {
      history[todayKey] = {
        wordsLearned: [],
        totalCount: 0,
        modeUsage: {
          flashcard: 0,
          quiz: 0,
          spelling: 0
        },
        startTime: now,
        lastTime: now
      };
    }
    
    const today = history[todayKey];
    
    // 记录单词（去重）
    if (!today.wordsLearned.includes(wordKey)) {
      today.wordsLearned.push(wordKey);
    }
    
    // 更新计数
    today.totalCount++;
    today.lastTime = now;
    
    // 更新模式使用
    if (today.modeUsage[mode] !== undefined) {
      today.modeUsage[mode]++;
    }
    
    // 保存
    await chrome.storage.local.set({
      [this.storageKeys.history]: history
    });
  }

  /**
   * 获取今日学习的单词数量
   * @returns {Promise<number>}
   */
  async getTodayLearnedCount() {
    const today = await this.getTodayHistory();
    return today.wordsLearned.length;
  }

  /**
   * 获取最近N天的学习数据
   * @param {number} days - 天数
   * @returns {Promise<Array>}
   */
  async getRecentHistory(days = 7) {
    const history = await this.getHistory();
    const result = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayData = history[dateKey] || {
        wordsLearned: [],
        totalCount: 0,
        modeUsage: { flashcard: 0, quiz: 0, spelling: 0 }
      };
      
      result.push({
        date: dateKey,
        dayOfWeek: date.getDay(),
        ...dayData
      });
    }
    
    return result.reverse(); // 从早到晚排序
  }

  /**
   * 获取各模式使用统计
   * @param {number} days - 统计天数
   * @returns {Promise<Object>}
   */
  async getModeUsageStats(days = 30) {
    const recentHistory = await this.getRecentHistory(days);
    
    const totals = {
      flashcard: 0,
      quiz: 0,
      spelling: 0
    };
    
    recentHistory.forEach(day => {
      if (day.modeUsage) {
        totals.flashcard += day.modeUsage.flashcard || 0;
        totals.quiz += day.modeUsage.quiz || 0;
        totals.spelling += day.modeUsage.spelling || 0;
      }
    });
    
    return totals;
  }

  // ==================== 每日挑战相关 ====================

  /**
   * 获取每日挑战数据
   * @returns {Promise<Object>}
   */
  async getChallenges() {
    const result = await chrome.storage.local.get([this.storageKeys.challenges]);
    return result[this.storageKeys.challenges] || {};
  }

  /**
   * 获取今日挑战
   * @returns {Promise<Object|null>}
   */
  async getTodayChallenge() {
    const challenges = await this.getChallenges();
    const todayKey = this.getTodayKey();
    return challenges[todayKey] || null;
  }

  /**
   * 生成今日挑战
   * @param {Array} words - 可用单词列表
   * @param {Object} progress - 学习进度数据
   * @param {number} count - 挑战单词数量
   * @returns {Promise<Object>}
   */
  async generateTodayChallenge(words, progress, count = 20) {
    const todayKey = this.getTodayKey();
    const challenges = await this.getChallenges();
    
    // 如果今天已有挑战，返回现有的
    if (challenges[todayKey]) {
      return challenges[todayKey];
    }
    
    // 基于 SRS 算法选择单词
    const now = Date.now();
    const wordList = Object.values(words).filter(w => w.type === 'word');
    
    // 排序：优先选择需要复习的单词
    const sortedWords = wordList.sort((a, b) => {
      const progressA = progress[a.word] || { masteryLevel: 0, nextReview: 0 };
      const progressB = progress[b.word] || { masteryLevel: 0, nextReview: 0 };
      
      // 优先选择到期需要复习的
      const needReviewA = progressA.nextReview <= now ? 1 : 0;
      const needReviewB = progressB.nextReview <= now ? 1 : 0;
      if (needReviewA !== needReviewB) {
        return needReviewB - needReviewA;
      }
      
      // 其次选择掌握程度低的
      return progressA.masteryLevel - progressB.masteryLevel;
    });
    
    // 选择前 count 个单词
    const selectedWords = sortedWords.slice(0, count).map(w => w.word);
    
    // 创建挑战
    const challenge = {
      words: selectedWords,
      completed: 0,
      total: selectedWords.length,
      isCompleted: false,
      generatedAt: now
    };
    
    // 保存
    challenges[todayKey] = challenge;
    await chrome.storage.local.set({
      [this.storageKeys.challenges]: challenges
    });
    
    return challenge;
  }

  /**
   * 更新挑战进度
   * @param {string} wordKey - 完成的单词
   * @returns {Promise<Object>}
   */
  async updateChallengeProgress(wordKey) {
    const todayKey = this.getTodayKey();
    const challenges = await this.getChallenges();
    
    if (!challenges[todayKey]) {
      return null;
    }
    
    const challenge = challenges[todayKey];
    
    // 检查单词是否在挑战列表中
    if (challenge.words.includes(wordKey) && challenge.completed < challenge.total) {
      challenge.completed++;
      challenge.isCompleted = challenge.completed >= challenge.total;
      
      await chrome.storage.local.set({
        [this.storageKeys.challenges]: challenges
      });
    }
    
    return challenge;
  }

  /**
   * 获取连续挑战天数
   * @returns {Promise<number>}
   */
  async getChallengeStreak() {
    const challenges = await this.getChallenges();
    let streak = 0;
    const today = new Date();
    
    // 从今天开始往前数
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const challenge = challenges[dateKey];
      
      // 今天可以未完成
      if (i === 0) {
        if (challenge && challenge.isCompleted) {
          streak++;
        }
        continue;
      }
      
      // 之前的天必须完成
      if (challenge && challenge.isCompleted) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * 清理旧数据（保留最近30天）
   * @returns {Promise<void>}
   */
  async cleanupOldData() {
    const history = await this.getHistory();
    const challenges = await this.getChallenges();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffKey = cutoffDate.toISOString().split('T')[0];
    
    // 清理历史
    const cleanedHistory = {};
    for (const [key, value] of Object.entries(history)) {
      if (key >= cutoffKey) {
        cleanedHistory[key] = value;
      }
    }
    
    // 清理挑战
    const cleanedChallenges = {};
    for (const [key, value] of Object.entries(challenges)) {
      if (key >= cutoffKey) {
        cleanedChallenges[key] = value;
      }
    }
    
    await chrome.storage.local.set({
      [this.storageKeys.history]: cleanedHistory,
      [this.storageKeys.challenges]: cleanedChallenges
    });
  }
}

// 创建单例
const learningHistoryManager = new LearningHistoryManager();

// 暴露到全局（传统脚本加载方式）
window.LearningHistoryManager = LearningHistoryManager;
window.learningHistoryManager = learningHistoryManager;
