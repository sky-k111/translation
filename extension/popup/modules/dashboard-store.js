/**
 * Dashboard Store - 统一状态管理
 * 使用观察者模式和 Memoization 优化数据流
 */

class DashboardStore {
    constructor() {
        this.state = {
            words: {},
            history: {},
            progress: {},
            settings: {},
            reviewQueue: null
        };
        
        this.listeners = new Set();
        this.computedCache = new Map();
        this.lastUpdate = {};
        this.initialized = false;
    }

    /**
     * 订阅状态变化
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * 通知所有订阅者
     */
    notify(changes) {
        this.listeners.forEach(listener => {
            try {
                listener(changes, this.state);
            } catch (error) {
                console.error('[DashboardStore] Listener error:', error);
            }
        });
    }

    /**
     * 初始化数据
     */
    async init() {
        if (this.initialized) return true;

        try {
            const result = await chrome.storage.local.get([
                'translatedWords',
                'learningHistory',
                'learningProgress',
                'userSettings'
            ]);

            this.state.words = result.translatedWords || {};
            this.state.history = result.learningHistory || {};
            this.state.progress = result.learningProgress || {};
            this.state.settings = result.userSettings || { dailyGoal: 20 };

            this.initialized = true;
            this.notify({ type: 'init', state: this.state });
            
            console.log('[DashboardStore] Initialized with data:', {
                words: Object.keys(this.state.words).length,
                history: Object.keys(this.state.history).length,
                progress: Object.keys(this.state.progress).length
            });

            return true;
        } catch (error) {
            console.error('[DashboardStore] Init failed:', error);
            return false;
        }
    }

    /**
     * 智能更新 - 只重新计算受影响的部分
     */
    async update(changes) {
        const affectedKeys = this.detectAffectedComputed(changes);
        
        // 清除受影响的缓存
        affectedKeys.forEach(key => this.computedCache.delete(key));
        
        // 更新状态
        Object.assign(this.state, changes);
        
        // 通知订阅者
        this.notify({ type: 'update', changes, affectedKeys });
    }

    /**
     * 检测哪些计算值受到影响
     */
    detectAffectedComputed(changes) {
        const affected = new Set();
        
        if (changes.words) {
            affected.add('totalWords');
            affected.add('weeklyData');
            affected.add('radarData');
            affected.add('overviewStats');
        }
        
        if (changes.history) {
            affected.add('weeklyData');
            affected.add('recentSessions');
            affected.add('overviewStats');
        }
        
        if (changes.progress) {
            affected.add('masteryRate');
            affected.add('overviewStats');
            affected.add('radarData');
        }
        
        return Array.from(affected);
    }

    /**
     * Memoization - 获取计算值（带缓存）
     */
    getComputed(key, computeFn, ttl = 60000) {
        const cached = this.computedCache.get(key);
        const now = Date.now();
        
        // 检查缓存是否有效
        if (cached && (now - cached.timestamp) < ttl) {
            return cached.value;
        }
        
        // 重新计算
        const value = computeFn();
        this.computedCache.set(key, { value, timestamp: now });
        
        return value;
    }

    /**
     * 清除所有缓存
     */
    clearCache() {
        this.computedCache.clear();
    }

    /**
     * 获取状态快照
     */
    getState() {
        return { ...this.state };
    }

    /**
     * 监听 Chrome Storage 变化
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;

            const stateChanges = {};
            
            if (changes.translatedWords) {
                stateChanges.words = changes.translatedWords.newValue || {};
            }
            if (changes.learningHistory) {
                stateChanges.history = changes.learningHistory.newValue || {};
            }
            if (changes.learningProgress) {
                stateChanges.progress = changes.learningProgress.newValue || {};
            }
            if (changes.userSettings) {
                stateChanges.settings = changes.userSettings.newValue || {};
            }

            if (Object.keys(stateChanges).length > 0) {
                this.update(stateChanges);
            }
        });
    }
}

// 单例模式
window.dashboardStore = window.dashboardStore || new DashboardStore();
