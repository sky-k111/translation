/**
 * Smart Coach - 智能学习教练
 * 基于用户数据提供个性化学习建议
 */

class SmartCoach {
    constructor(store) {
        this.store = store;
        this.patterns = null;
    }

    /**
     * 分析学习模式
     */
    analyzePatterns() {
        const state = this.store.getState();
        
        return {
            peakHours: this.findPeakLearningHours(state.history),
            weakPOS: this.findWeakPOSTypes(state.words, state.progress),
            forgettingCurve: this.calculateForgettingRate(state.progress),
            learningSpeed: this.calculateLearningSpeed(state.history),
            consistency: this.calculateConsistency(state.history),
            difficulty: this.analyzeDifficulty(state.words, state.progress)
        };
    }

    /**
     * 找出学习高峰时段
     */
    findPeakLearningHours(history) {
        const hourCounts = new Array(24).fill(0);
        
        Object.values(history).forEach(day => {
            if (day.lastTime) {
                const hour = new Date(day.lastTime).getHours();
                hourCounts[hour] += day.totalCount || 0;
            }
        });

        const maxCount = Math.max(...hourCounts);
        const peakHour = hourCounts.indexOf(maxCount);
        
        return {
            hour: peakHour,
            range: `${peakHour}:00-${peakHour + 1}:00`,
            count: maxCount
        };
    }

    /**
     * 找出薄弱的词性类型
     */
    findWeakPOSTypes(words, progress) {
        const posStats = {};
        
        Object.entries(words).forEach(([key, word]) => {
            const pos = word.pos || 'unknown';
            if (!posStats[pos]) {
                posStats[pos] = { total: 0, mastered: 0 };
            }
            posStats[pos].total++;
            
            const wordProgress = progress[key];
            if (wordProgress && wordProgress.masteryLevel >= 3) {
                posStats[pos].mastered++;
            }
        });

        // 计算掌握率并排序
        const weakTypes = Object.entries(posStats)
            .map(([pos, stats]) => ({
                pos,
                total: stats.total,
                mastered: stats.mastered,
                rate: stats.total > 0 ? stats.mastered / stats.total : 0
            }))
            .filter(item => item.total >= 5) // 至少5个词才统计
            .sort((a, b) => a.rate - b.rate);

        return weakTypes.slice(0, 3).map(item => item.pos);
    }

    /**
     * 计算遗忘曲线
     */
    calculateForgettingRate(progress) {
        const now = Date.now();
        const criticalWords = [];
        const dueWords = [];
        
        Object.entries(progress).forEach(([key, p]) => {
            if (p.nextReview) {
                const daysUntilReview = (p.nextReview - now) / (1000 * 60 * 60 * 24);
                
                if (daysUntilReview <= 0) {
                    dueWords.push({ key, overdue: Math.abs(daysUntilReview) });
                } else if (daysUntilReview <= 1) {
                    criticalWords.push({ key, daysLeft: daysUntilReview });
                }
            }
        });

        return {
            criticalWords: criticalWords.sort((a, b) => a.daysLeft - b.daysLeft),
            dueWords: dueWords.sort((a, b) => b.overdue - a.overdue),
            totalDue: dueWords.length,
            totalCritical: criticalWords.length
        };
    }

    /**
     * 计算学习速度
     */
    calculateLearningSpeed(history) {
        const recentDays = 7;
        const dates = Object.keys(history).sort().slice(-recentDays);
        
        if (dates.length < 2) return { wordsPerDay: 0, trend: 'stable' };

        const counts = dates.map(date => history[date].totalCount || 0);
        const avgSpeed = counts.reduce((sum, c) => sum + c, 0) / counts.length;
        
        // 计算趋势
        const firstHalf = counts.slice(0, Math.floor(counts.length / 2));
        const secondHalf = counts.slice(Math.floor(counts.length / 2));
        const firstAvg = firstHalf.reduce((sum, c) => sum + c, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, c) => sum + c, 0) / secondHalf.length;
        
        let trend = 'stable';
        if (secondAvg > firstAvg * 1.2) trend = 'increasing';
        else if (secondAvg < firstAvg * 0.8) trend = 'decreasing';

        return { wordsPerDay: Math.round(avgSpeed), trend };
    }

    /**
     * 计算学习一致性
     */
    calculateConsistency(history) {
        const last30Days = 30;
        const today = new Date();
        let activeDays = 0;

        for (let i = 0; i < last30Days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            
            if (history[key] && history[key].totalCount > 0) {
                activeDays++;
            }
        }

        return {
            activeDays,
            rate: (activeDays / last30Days) * 100,
            level: activeDays >= 25 ? 'excellent' : activeDays >= 15 ? 'good' : 'needs_improvement'
        };
    }

    /**
     * 分析学习难度分布
     */
    analyzeDifficulty(words, progress) {
        const difficulties = { easy: 0, medium: 0, hard: 0 };
        
        Object.entries(words).forEach(([key, word]) => {
            const complexity = word.complexity?.level || 'medium';
            const wordProgress = progress[key];
            const mastered = wordProgress && wordProgress.masteryLevel >= 3;
            
            if (!mastered) {
                if (complexity === 'easy' || complexity === 'beginner') {
                    difficulties.easy++;
                } else if (complexity === 'hard' || complexity === 'advanced') {
                    difficulties.hard++;
                } else {
                    difficulties.medium++;
                }
            }
        });

        return difficulties;
    }

    /**
     * 获取个性化建议
     */
    getPersonalizedAdvice() {
        this.patterns = this.analyzePatterns();
        const { forgettingCurve, consistency, learningSpeed, peakHours, difficulty } = this.patterns;

        const advices = [];

        // 优先级1: 紧急复习
        if (forgettingCurve.totalDue > 10) {
            advices.push({
                text: `有 ${forgettingCurve.totalDue} 个单词需要复习！现在复习可以防止遗忘。`,
                action: "立即复习",
                priority: "urgent",
                type: "review",
                data: { words: forgettingCurve.dueWords.slice(0, 10) }
            });
        }

        // 优先级2: 即将到期
        if (forgettingCurve.totalCritical > 5 && forgettingCurve.totalDue === 0) {
            advices.push({
                text: `有 ${forgettingCurve.totalCritical} 个单词将在24小时内到期，提前复习效果更好。`,
                action: "预习复习",
                priority: "high",
                type: "review",
                data: { words: forgettingCurve.criticalWords.slice(0, 10) }
            });
        }

        // 优先级3: 学习时段建议
        const currentHour = new Date().getHours();
        if (Math.abs(currentHour - peakHours.hour) <= 1 && peakHours.count > 0) {
            advices.push({
                text: `现在是你的黄金学习时段（${peakHours.range}）！学习效率最高。`,
                action: "开始学习",
                priority: "high",
                type: "timing"
            });
        }

        // 优先级4: 一致性激励
        if (consistency.level === 'needs_improvement') {
            advices.push({
                text: `本月学习了 ${consistency.activeDays} 天。坚持每天学习5分钟，效果会更好！`,
                action: "每日打卡",
                priority: "medium",
                type: "consistency"
            });
        } else if (consistency.level === 'excellent') {
            advices.push({
                text: `太棒了！你已经坚持 ${consistency.activeDays} 天了。继续保持这个节奏！`,
                action: "继续学习",
                priority: "low",
                type: "encouragement"
            });
        }

        // 优先级5: 学习速度建议
        if (learningSpeed.trend === 'decreasing') {
            advices.push({
                text: `最近学习速度有所下降。试试更轻松的学习模式来恢复状态。`,
                action: "轻松模式",
                priority: "medium",
                type: "speed"
            });
        } else if (learningSpeed.trend === 'increasing') {
            advices.push({
                text: `学习速度在提升！可以尝试更有挑战性的内容了。`,
                action: "挑战模式",
                priority: "low",
                type: "speed"
            });
        }

        // 优先级6: 难度平衡
        if (difficulty.hard > difficulty.easy + difficulty.medium) {
            advices.push({
                text: `困难词汇较多（${difficulty.hard}个）。建议先巩固基础词汇。`,
                action: "学习基础词",
                priority: "medium",
                type: "difficulty"
            });
        }

        // 默认建议
        if (advices.length === 0) {
            advices.push({
                text: "一切进展顺利！继续保持学习节奏，每天进步一点点。",
                action: "开始学习",
                priority: "low",
                type: "default"
            });
        }

        // 返回最高优先级的建议
        return advices.sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        })[0];
    }

    /**
     * 生成学习路径
     */
    generateLearningPath() {
        if (!this.patterns) {
            this.patterns = this.analyzePatterns();
        }

        const path = [];
        const { forgettingCurve, difficulty } = this.patterns;

        // 1. 复习阶段
        if (forgettingCurve.totalDue > 0) {
            path.push({
                stage: "紧急复习",
                description: "复习即将遗忘的单词",
                words: forgettingCurve.dueWords.slice(0, 10).map(w => w.key),
                estimatedTime: `${Math.ceil(forgettingCurve.totalDue * 0.5)} 分钟`,
                priority: "urgent"
            });
        }

        // 2. 巩固阶段
        if (forgettingCurve.totalCritical > 0) {
            path.push({
                stage: "巩固记忆",
                description: "复习即将到期的单词",
                words: forgettingCurve.criticalWords.slice(0, 10).map(w => w.key),
                estimatedTime: `${Math.ceil(forgettingCurve.totalCritical * 0.5)} 分钟`,
                priority: "high"
            });
        }

        // 3. 新词学习
        const newWordsCount = Math.min(10, difficulty.easy + difficulty.medium);
        if (newWordsCount > 0) {
            path.push({
                stage: "学习新词",
                description: "学习适合当前水平的新词汇",
                estimatedTime: `${Math.ceil(newWordsCount * 1)} 分钟`,
                priority: "medium"
            });
        }

        // 4. 强化训练
        if (difficulty.hard > 0) {
            path.push({
                stage: "强化训练",
                description: "挑战困难词汇",
                estimatedTime: `${Math.ceil(Math.min(difficulty.hard, 5) * 1.5)} 分钟`,
                priority: "low"
            });
        }

        return path;
    }

    /**
     * 获取学习统计摘要
     */
    getStatsSummary() {
        if (!this.patterns) {
            this.patterns = this.analyzePatterns();
        }

        const { consistency, learningSpeed, forgettingCurve } = this.patterns;

        return {
            consistency: {
                level: consistency.level,
                activeDays: consistency.activeDays,
                rate: Math.round(consistency.rate)
            },
            speed: {
                wordsPerDay: learningSpeed.wordsPerDay,
                trend: learningSpeed.trend
            },
            review: {
                dueNow: forgettingCurve.totalDue,
                dueSoon: forgettingCurve.totalCritical
            }
        };
    }
}

// 导出
window.SmartCoach = SmartCoach;
