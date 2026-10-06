/**
 * Dashboard 管理器
 * 负责聚合 Chrome Storage 中的真实数据，并为 UI 提供统一的数据接口。
 * 对于缺失的数据（如 AI 建议、听说读写能力分布），提供合理的模拟/估算值。
 * 
 * 优化版本：集成错误处理、离线支持和数据验证
 */

class DashboardManager {
    constructor() {
        this.data = {
            words: {},
            history: {},
            progress: {},
            settings: {}
        };
        this.initialized = false;
        this.loading = false;
        this.error = null;
        
        // Initialize Review_Queue_Manager if available
        this.reviewQueueManager = null;
        this.initReviewQueue();
        
        // 离线缓存
        this.offlineCache = null;
        this.setupOfflineSupport();
    }
    
    /**
     * 设置离线支持
     */
    setupOfflineSupport() {
        // 监听在线/离线状态
        window.addEventListener('online', () => {
            console.log('[DashboardManager] Back online, syncing data...');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            console.log('[DashboardManager] Offline mode activated');
            this.loadOfflineCache();
        });
    }
    
    /**
     * 加载离线缓存
     */
    async loadOfflineCache() {
        try {
            const cached = localStorage.getItem('dashboard_offline_cache');
            if (cached) {
                this.offlineCache = JSON.parse(cached);
                console.log('[DashboardManager] Loaded offline cache');
            }
        } catch (error) {
            console.error('[DashboardManager] Failed to load offline cache:', error);
        }
    }
    
    /**
     * 保存离线缓存
     */
    async saveOfflineCache() {
        try {
            localStorage.setItem('dashboard_offline_cache', JSON.stringify({
                data: this.data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('[DashboardManager] Failed to save offline cache:', error);
        }
    }
    
    /**
     * 同步离线数据
     */
    async syncOfflineData() {
        if (this.offlineCache) {
            // 重新加载最新数据
            await this.init();
        }
    }
    
    /**
     * Initialize Review_Queue_Manager for dashboard stats
     */
    async initReviewQueue() {
        if (typeof ReviewQueueManager !== 'undefined' && !this.reviewQueueManager) {
            try {
                this.reviewQueueManager = new ReviewQueueManager({
                    storageKey: 'dashboard_review_queue',
                    persistDelay: 3000
                });
                
                // Load existing queue from storage
                await this.reviewQueueManager.load();
                console.log('[Dashboard Manager] Review_Queue_Manager initialized');
            } catch (error) {
                console.error('[Dashboard Manager] Failed to initialize Review_Queue_Manager:', error);
            }
        }
    }

    /**
     * 初始化：加载所有必要数据（带错误处理和验证）
     */
    async init() {
        if (this.loading) {
            console.warn('[DashboardManager] Already loading...');
            return false;
        }

        this.loading = true;
        this.error = null;

        try {
            // 检查是否在线
            const isOnline = navigator.onLine;
            
            if (!isOnline && this.offlineCache) {
                console.log('[DashboardManager] Using offline cache');
                this.data = this.offlineCache.data;
                this.initialized = true;
                this.loading = false;
                return true;
            }

            // 加载数据
            const result = await chrome.storage.local.get([
                'translatedWords', 
                'learningHistory', 
                'learningProgress', 
                'userSettings'
            ]);

            // 数据验证
            const validatedData = this.validateData(result);
            
            this.data.words = validatedData.words;
            this.data.history = validatedData.history;
            this.data.progress = validatedData.progress;
            this.data.settings = validatedData.settings;
            
            // 保存离线缓存
            await this.saveOfflineCache();
            
            this.initialized = true;
            this.loading = false;
            
            console.log('[DashboardManager] Data loaded:', {
                words: Object.keys(this.data.words).length,
                history: Object.keys(this.data.history).length,
                progress: Object.keys(this.data.progress).length
            });
            
            return true;
        } catch (error) {
            console.error('[DashboardManager] Init failed:', error);
            this.error = error;
            this.loading = false;
            
            // 尝试使用离线缓存
            if (this.offlineCache) {
                console.log('[DashboardManager] Falling back to offline cache');
                this.data = this.offlineCache.data;
                this.initialized = true;
                return true;
            }
            
            return false;
        }
    }

    /**
     * 验证数据完整性
     */
    validateData(result) {
        const validated = {
            words: {},
            history: {},
            progress: {},
            settings: { dailyGoal: 20 }
        };

        // 验证 words
        if (result.translatedWords && typeof result.translatedWords === 'object') {
            validated.words = result.translatedWords;
        }

        // 验证 history
        if (result.learningHistory && typeof result.learningHistory === 'object') {
            validated.history = result.learningHistory;
        }

        // 验证 progress
        if (result.learningProgress && typeof result.learningProgress === 'object') {
            validated.progress = result.learningProgress;
        }

        // 验证 settings
        if (result.userSettings && typeof result.userSettings === 'object') {
            validated.settings = {
                dailyGoal: result.userSettings.dailyGoal || 20,
                ...result.userSettings
            };
        }

        return validated;
    }

    /**
     * 获取加载状态
     */
    getLoadingState() {
        return {
            loading: this.loading,
            initialized: this.initialized,
            error: this.error,
            hasOfflineCache: !!this.offlineCache
        };
    }

    /**
     * 获取核心概览数据 (对应 Metrics Grid)
     */
    getOverviewStats() {
        const todayKey = new Date().toISOString().split('T')[0];
        const todayData = this.data.history[todayKey] || { totalCount: 0, wordsLearned: [] };
        
        // 1. 计算总词汇量
        const totalWords = Object.keys(this.data.words).length;
        
        // 2. 计算连续打卡 (简单逻辑：检查最近30天)
        let streak = 0;
        const now = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            
            // 今天如果还没学，不中断 streak
            if (i === 0 && !this.data.history[key]) continue;
            
            if (this.data.history[key] && this.data.history[key].totalCount > 0) {
                streak++;
            } else {
                break;
            }
        }

        // 3. 计算本周学习时长 (估算：每个交互按 30秒 计算)
        const weekData = this.getWeeklyData();
        const weekInteractionCount = weekData.reduce((sum, day) => sum + day.count, 0);
        const weekHours = (weekInteractionCount * 0.5 / 60).toFixed(1); // hours

        // 4. 计算掌握度/正确率 (基于 learningProgress)
        let masteredCount = 0;
        let totalReviews = 0;
        Object.values(this.data.progress).forEach(p => {
            if (p.masteryLevel >= 3) masteredCount++;
            totalReviews++; // 简化：假设每条进度记录代表一次复习周期
        });
        const masteryRate = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;
        
        // Get review queue stats if available
        let reviewStats = { totalWords: 0, dueNow: 0, dueToday: 0 };
        if (this.reviewQueueManager) {
            try {
                reviewStats = this.reviewQueueManager.getStats();
            } catch (error) {
                console.error('[Dashboard Manager] Failed to get review queue stats:', error);
            }
        }

        return {
            weekHours,
            masteryRate,
            streak,
            totalWords,
            todayCount: todayData.wordsLearned ? todayData.wordsLearned.length : 0,
            dailyGoal: this.data.settings.dailyGoal || 20,
            reviewQueue: reviewStats // Add review queue stats
        };
    }

    /**
     * 获取用户等级信息 (XP System)
     */
    getUserLevel() {
        // 简单的 XP 计算公式
        // 1 个单词 = 10 XP
        // 1 个熟练词 (Level >= 3) = 50 XP
        // 1 次打卡 = 100 XP
        
        const wordCount = Object.keys(this.data.words).length;
        let masteredCount = 0;
        Object.values(this.data.progress).forEach(p => {
            if (p.masteryLevel >= 3) masteredCount++;
        });
        
        // 估算总打卡天数 (Object.keys(history).length)
        const checkinDays = Object.keys(this.data.history).length;

        const xp = (wordCount * 10) + (masteredCount * 50) + (checkinDays * 100);
        const level = Math.floor(Math.sqrt(xp / 100)) + 1; // 平方根曲线升级
        
        // 计算下一级所需 XP
        const nextLevelXp = Math.pow(level, 2) * 100;
        const currentLevelBaseXp = Math.pow(level - 1, 2) * 100;
        
        return {
            level,
            xp,
            nextLevelXp,
            progress: Math.round(((xp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100)
        };
    }

    /**
     * 获取周活跃数据 (用于 Activity Chart)
     */
    getWeeklyData() {
        const days = [];
        const today = new Date();
        
        // 获取过去7天 (含今天)
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split('T')[0];
            const dayData = this.data.history[dateKey];
            
            days.push({
                date: dateKey, // "2024-01-15"
                label: dateKey.slice(5), // "01-15"
                count: dayData ? dayData.totalCount : 0,
                words: dayData ? (dayData.wordsLearned || []).length : 0
            });
        }
        return days;
    }

    /**
     * 获取最近学习记录 (用于 Session Table)
     */
    getRecentSessions(limit = 10) {
        // 由于 history 是按天聚合的，我们需要展平数据
        // 结构: { word, mode, timestamp, correct }
        // 注意：当前 history 结构没有记录每个单词的详细时间点，只有当天的列表
        // 我们这里做一个“伪展平”，把当天的单词列出来，时间设为当天的 lastTime 或估算值
        
        const sessions = [];
        const sortedDates = Object.keys(this.data.history).sort().reverse();
        
        for (const dateKey of sortedDates) {
            if (sessions.length >= limit) break;
            
            const dayData = this.data.history[dateKey];
            const words = dayData.wordsLearned || [];
            
            // 为了展示效果，我们只取每种模式的前几个，或者全部
            // 由于缺乏单次记录，我们构造模拟的 session 对象
            // 真实场景下应该在 recordLearning 时记录 log
            
            words.forEach((wordKey, index) => {
                if (sessions.length >= limit) return;
                
                // 尝试查找该单词的详细信息
                const wordInfo = this.data.words[wordKey] || { translation: '未知' };
                const progress = this.data.progress[wordKey] || { masteryLevel: 0 };
                
                // 模拟模式分布 (根据 index 简单 hash)
                const modes = ['flashcard', 'quiz', 'spelling', 'listening'];
                const mode = modes[(wordKey.length + index) % 4];
                
                sessions.push({
                    id: `${dateKey}-${index}`,
                    word: wordKey,
                    translation: wordInfo.translation,
                    mode: mode,
                    duration: 30000 + (Math.random() * 60000), // 30s - 90s
                    timestamp: dayData.lastTime || new Date(dateKey).getTime(),
                    correct: progress.masteryLevel > 1, // 假设熟练度>1算"High Focus"
                    difficulty: progress.masteryLevel
                });
            });
        }
        
        return sessions;
    }

    /**
     * 获取雷达图数据 (混合真实 + 模拟)
     */
    getRadarData() {
        // 真实指标：词汇量
        const totalWords = Object.keys(this.data.words).length;
        const vocabScore = Math.min(Math.round(totalWords / 5), 100); // 假设 500 词 = 100分
        
        // 真实指标：活跃度 (Engagement)
        const weeklyData = this.getWeeklyData();
        const totalActivity = weeklyData.reduce((sum, d) => sum + d.count, 0);
        const activeScore = Math.min(totalActivity * 2, 100);
        
        // 模拟指标：基于词汇量的衍生
        // 通常词汇量高，阅读能力也高
        const readingScore = Math.min(vocabScore * 1.2, 100);
        // 听力通常滞后
        const listeningScore = Math.min(vocabScore * 0.8, 100);
        // 口语通常最低
        const speakingScore = Math.min(vocabScore * 0.6, 100);
        
        return [
            { label: '词汇', value: vocabScore },
            { label: '活跃', value: activeScore },
            { label: '阅读', value: readingScore },
            { label: '听力', value: listeningScore },
            { label: '口语', value: speakingScore }
        ];
    }

    /**
     * 获取 AI 教练建议 (基于规则的模拟)
     */
    getAICoachAdvice() {
        const stats = this.getOverviewStats();
        const userLevel = this.getUserLevel();
        
        const advices = [];
        
        // 规则 1: 活跃度低
        if (stats.weekHours < 1) {
            advices.push({
                text: "检测到你本周学习时间较少。每天只需 5 分钟，坚持就是胜利！",
                action: "开始 5 分钟闪卡"
            });
        }
        
        // 规则 2: 词汇量里程碑
        if (stats.totalWords > 0 && stats.totalWords % 50 === 0) {
            advices.push({
                text: `恭喜达成 ${stats.totalWords} 词里程碑！建议进行一次全面复习来巩固记忆。`,
                action: "开始复习"
            });
        }
        
        // 规则 3: 掌握度低
        if (stats.masteryRate < 30 && stats.totalWords > 20) {
            advices.push({
                text: "你的词库中有很多新词待消化。建议多使用「测验模式」加深印象。",
                action: "进入测验"
            });
        }
        
        // 默认建议
        advices.push({
            text: "根据你的遗忘曲线，现在是复习的最佳时机。复习 10 个单词比新学 1 个更有效！",
            action: "智能复习"
        });
        
        // 随机返回一条高优先级的建议
        return advices[0];
    }
}

// 单例模式
window.dashboardManager = new DashboardManager();
// 立即初始化
window.dashboardManager.init();
