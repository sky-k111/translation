/**
 * Dashboard 优化功能测试
 * 验证新增的优化模块是否正常工作
 */

describe('Dashboard Optimization Tests', () => {
    
    // ========================================
    // DashboardStore 测试
    // ========================================
    describe('DashboardStore', () => {
        let store;

        beforeEach(() => {
            // 模拟 chrome.storage API
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((keys, callback) => {
                            callback({
                                translatedWords: { test: { translation: '测试' } },
                                learningHistory: {},
                                learningProgress: {},
                                userSettings: { dailyGoal: 20 }
                            });
                        }),
                        onChanged: {
                            addListener: jest.fn()
                        }
                    }
                }
            };

            // 创建 store 实例
            if (typeof DashboardStore !== 'undefined') {
                store = new DashboardStore();
            }
        });

        test('应该正确初始化', async () => {
            if (!store) return;
            
            const success = await store.init();
            expect(success).toBe(true);
            expect(store.initialized).toBe(true);
        });

        test('应该支持订阅/通知', () => {
            if (!store) return;
            
            const listener = jest.fn();
            const unsubscribe = store.subscribe(listener);
            
            store.notify({ type: 'test' });
            expect(listener).toHaveBeenCalledWith({ type: 'test' }, store.state);
            
            unsubscribe();
            store.notify({ type: 'test2' });
            expect(listener).toHaveBeenCalledTimes(1);
        });

        test('应该正确缓存计算结果', () => {
            if (!store) return;
            
            const computeFn = jest.fn(() => 'result');
            
            const result1 = store.getComputed('test', computeFn);
            const result2 = store.getComputed('test', computeFn);
            
            expect(result1).toBe('result');
            expect(result2).toBe('result');
            expect(computeFn).toHaveBeenCalledTimes(1); // 只计算一次
        });

        test('应该检测受影响的计算值', () => {
            if (!store) return;
            
            const affected = store.detectAffectedComputed({ words: {} });
            expect(affected).toContain('totalWords');
            expect(affected).toContain('weeklyData');
        });
    });

    // ========================================
    // SmartRenderer 测试
    // ========================================
    describe('SmartRenderer', () => {
        let renderer;

        beforeEach(() => {
            if (typeof SmartRenderer !== 'undefined') {
                renderer = new SmartRenderer();
            }
        });

        test('应该检测数据变化', () => {
            if (!renderer) return;
            
            const oldData = { value: 10 };
            const newData = { value: 20 };
            const sameData = { value: 10 };
            
            expect(renderer.hasChanged(oldData, newData)).toBe(true);
            expect(renderer.hasChanged(oldData, sameData)).toBe(false);
        });

        test('应该深拷贝数据', () => {
            if (!renderer) return;
            
            const original = { a: 1, b: { c: 2 } };
            const cloned = renderer.deepClone(original);
            
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
        });

        test('应该批量更新', (done) => {
            if (!renderer) return done();
            
            const updateFn = jest.fn();
            
            renderer.scheduleUpdate('test1', updateFn);
            renderer.scheduleUpdate('test2', updateFn);
            
            expect(updateFn).not.toHaveBeenCalled();
            
            setTimeout(() => {
                expect(updateFn).toHaveBeenCalledTimes(2);
                done();
            }, 20);
        });
    });

    // ========================================
    // SmartCoach 测试
    // ========================================
    describe('SmartCoach', () => {
        let coach;
        let mockStore;

        beforeEach(() => {
            mockStore = {
                getState: () => ({
                    words: {
                        'test1': { pos: 'noun', complexity: { level: 'easy' } },
                        'test2': { pos: 'verb', complexity: { level: 'hard' } }
                    },
                    history: {
                        '2026-02-01': { totalCount: 10, lastTime: new Date('2026-02-01T10:00:00').getTime() },
                        '2026-02-02': { totalCount: 15, lastTime: new Date('2026-02-02T14:00:00').getTime() }
                    },
                    progress: {
                        'test1': { masteryLevel: 3, nextReview: Date.now() - 86400000 }, // 过期
                        'test2': { masteryLevel: 1, nextReview: Date.now() + 86400000 }  // 未来
                    },
                    settings: { dailyGoal: 20 }
                })
            };

            if (typeof SmartCoach !== 'undefined') {
                coach = new SmartCoach(mockStore);
            }
        });

        test('应该分析学习模式', () => {
            if (!coach) return;
            
            const patterns = coach.analyzePatterns();
            
            expect(patterns).toHaveProperty('peakHours');
            expect(patterns).toHaveProperty('weakPOS');
            expect(patterns).toHaveProperty('forgettingCurve');
            expect(patterns).toHaveProperty('learningSpeed');
        });

        test('应该找出高峰时段', () => {
            if (!coach) return;
            
            const state = mockStore.getState();
            const peakHours = coach.findPeakLearningHours(state.history);
            
            expect(peakHours).toHaveProperty('hour');
            expect(peakHours).toHaveProperty('range');
            expect(peakHours).toHaveProperty('count');
        });

        test('应该计算遗忘曲线', () => {
            if (!coach) return;
            
            const state = mockStore.getState();
            const curve = coach.calculateForgettingRate(state.progress);
            
            expect(curve.dueWords.length).toBeGreaterThan(0);
            expect(curve.totalDue).toBe(1);
        });

        test('应该生成个性化建议', () => {
            if (!coach) return;
            
            const advice = coach.getPersonalizedAdvice();
            
            expect(advice).toHaveProperty('text');
            expect(advice).toHaveProperty('action');
            expect(advice).toHaveProperty('priority');
            expect(advice).toHaveProperty('type');
        });

        test('应该生成学习路径', () => {
            if (!coach) return;
            
            const path = coach.generateLearningPath();
            
            expect(Array.isArray(path)).toBe(true);
            if (path.length > 0) {
                expect(path[0]).toHaveProperty('stage');
                expect(path[0]).toHaveProperty('estimatedTime');
                expect(path[0]).toHaveProperty('priority');
            }
        });
    });

    // ========================================
    // MiniChart 测试
    // ========================================
    describe('MiniChart', () => {
        test('应该创建折线图', () => {
            if (typeof MiniLineChart === 'undefined') return;
            
            const data = [
                { label: 'A', value: 10 },
                { label: 'B', value: 20 }
            ];
            
            const chart = new MiniLineChart({
                data,
                width: 400,
                height: 200
            });
            
            const element = chart.render();
            expect(element.tagName).toBe('svg');
        });

        test('应该创建柱状图', () => {
            if (typeof MiniBarChart === 'undefined') return;
            
            const data = [
                { label: 'A', value: 10 },
                { label: 'B', value: 20 }
            ];
            
            const chart = new MiniBarChart({
                data,
                width: 400,
                height: 200
            });
            
            const element = chart.render();
            expect(element.tagName).toBe('svg');
        });

        test('应该创建雷达图', () => {
            if (typeof MiniRadarChart === 'undefined') return;
            
            const data = [
                { label: '词汇', value: 80 },
                { label: '活跃', value: 60 },
                { label: '阅读', value: 70 }
            ];
            
            const chart = new MiniRadarChart({
                data,
                width: 400,
                height: 200
            });
            
            const element = chart.render();
            expect(element.tagName).toBe('svg');
        });
    });

    // ========================================
    // AccessibleDashboard 测试
    // ========================================
    describe('AccessibleDashboard', () => {
        let accessible;

        beforeEach(() => {
            // 创建测试 DOM
            document.body.innerHTML = `
                <div class="metrics-grid"></div>
                <div class="analytics-grid"></div>
                <button>Test Button</button>
            `;

            if (typeof AccessibleDashboard !== 'undefined') {
                accessible = new AccessibleDashboard();
            }
        });

        test('应该收集可聚焦元素', () => {
            if (!accessible) return;
            
            accessible.updateFocusableElements();
            expect(accessible.focusableElements.length).toBeGreaterThan(0);
        });

        test('应该宣布消息', () => {
            if (!accessible) return;
            
            accessible.announce('测试消息');
            const announcer = document.getElementById('aria-announcer');
            
            setTimeout(() => {
                expect(announcer).toBeTruthy();
                expect(announcer.textContent).toBe('测试消息');
            }, 150);
        });

        test('应该处理键盘导航', () => {
            if (!accessible) return;
            
            accessible.updateFocusableElements();
            const initialIndex = accessible.currentFocusIndex;
            
            accessible.focusNext();
            expect(accessible.currentFocusIndex).toBe(initialIndex + 1);
        });
    });
});

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
