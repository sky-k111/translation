/**
 * Dashboard 2.0 Logic - 优化版
 * 集成统一状态管理、智能渲染、轻量级图表和可访问性
 */

// SVG Icons Constants
const ICONS = {
    ROBOT: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="coach-avatar"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`,
    CHECK: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    CLOCK: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    ZAP: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    FLAME: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-4-3-6-.928 2-1.928 3.857-3 6a2.5 2.5 0 0 0 2.5 2.5z"></path><path d="M15.5 14.5A2.5 2.5 0 0 0 18 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-4-3-6-.928 2-1.928 3.857-3 6a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    BOOK: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
};

// 全局实例
let store, renderer, coach, accessible;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    try {
        // 显示加载状态
        showGlobalLoading();

        // 1. 初始化 Store
        store = window.dashboardStore;
        if (!store) {
            throw new Error('DashboardStore not loaded');
        }
        
        if (!store.initialized) {
            const success = await store.init();
            if (!success) {
                showError('数据加载失败，请刷新页面重试');
                return;
            }
        }
        store.setupStorageListener();

        // 2. 初始化渲染器
        renderer = window.smartRenderer;
        if (!renderer) {
            throw new Error('SmartRenderer not loaded');
        }

        // 3. 初始化智能教练
        if (window.SmartCoach) {
            coach = new window.SmartCoach(store);
        } else {
            console.warn('[Dashboard] SmartCoach not available');
        }

        // 4. 初始化可访问性
        if (window.AccessibleDashboard) {
            accessible = new window.AccessibleDashboard();
            await accessible.init();
        } else {
            console.warn('[Dashboard] AccessibleDashboard not available');
        }

        // 5. 订阅状态变化
        store.subscribe((changes, state) => {
            console.log('[Dashboard] State changed:', changes);
            refreshDashboard();
        });

        // 6. 首次渲染
        await refreshDashboard();

        // 7. 绑定交互事件
        bindEvents();

        // 隐藏加载状态
        hideGlobalLoading();

        // 宣布页面加载完成（屏幕阅读器）
        if (accessible && accessible.initialized) {
            accessible.announce('Dashboard 加载完成');
        }

    } catch (error) {
        console.error('[Dashboard] Init error:', error);
        showError('初始化失败: ' + error.message);
    }
}

/**
 * 显示全局加载状态
 */
function showGlobalLoading() {
    const main = document.querySelector('.dashboard-main');
    if (main) {
        main.classList.add('loading');
    }
}

/**
 * 隐藏全局加载状态
 */
function hideGlobalLoading() {
    const main = document.querySelector('.dashboard-main');
    if (main) {
        main.classList.remove('loading');
    }
}

/**
 * 显示错误信息
 */
function showError(message) {
    const main = document.querySelector('.dashboard-main');
    if (main) {
        main.innerHTML = `
            <div class="error-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2>${message}</h2>
                <button onclick="location.reload()" class="glass-btn-sm">重新加载</button>
            </div>
        `;
    }
}

async function refreshDashboard() {
    // 使用全局 dashboardManager 实例
    const manager = window.dashboardManager;
    if (!manager || !manager.initialized) {
        console.warn('[Dashboard] Manager not initialized, waiting...');
        // 如果未初始化，等待一下再试
        setTimeout(refreshDashboard, 500);
        return;
    }

    // 显示骨架屏
    showSkeletons();

    // 批量渲染
    await Promise.all([
        renderHeader(manager),
        renderMetrics(manager),
        renderCharts(manager),
        renderAICoach(manager),
        renderSessionTable(manager),
        renderGoals(manager),
        renderSubjectProgress(manager)
    ]);

    // 更新可访问性
    if (accessible) {
        accessible.update();
    }
}

/**
 * 显示骨架屏
 */
function showSkeletons() {
    const containers = [
        { id: 'activityChartContainer', type: 'chart' },
        { id: 'efficiencyChartContainer', type: 'chart' },
        { id: 'radarChartContainer', type: 'chart' },
        { selector: '#sessionTable tbody', type: 'table' }
    ];

    containers.forEach(({ id, selector, type }) => {
        const container = id ? document.getElementById(id) : document.querySelector(selector);
        if (container && renderer) {
            renderer.showSkeleton(container, type);
        }
    });
}

/**
 * 渲染头部欢迎语 & 等级入口
 */
function renderHeader(manager) {
    const userName = localStorage.getItem('userName') || 'Learner';
    const userLevel = manager.getUserLevel();
    
    document.getElementById('userName').textContent = userName;
    
    // 状态 Badge
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
        statusBadge.innerHTML = `
            <span class="status-dot"></span>
            Lv.${userLevel.level} 学习者
        `;
        // 添加点击事件打开等级详情
        statusBadge.style.cursor = 'pointer';
        statusBadge.onclick = () => showLevelModal(userLevel);
    }
}

/**
 * 显示等级详情弹窗
 */
function showLevelModal(levelInfo) {
    const modal = document.getElementById('levelModal');
    if (!modal) return;
    
    // 填充数据
    document.getElementById('modalLevel').textContent = levelInfo.level;
    document.getElementById('modalXP').textContent = levelInfo.xp;
    document.getElementById('modalNextXP').textContent = levelInfo.nextLevelXp;
    
    // 动画显示进度条
    const fill = document.getElementById('modalProgressFill');
    fill.style.width = '0%';
    
    // 显示弹窗
    modal.classList.add('active');
    
    // 延迟触发进度条动画
    setTimeout(() => {
        fill.style.width = `${levelInfo.progress}%`;
    }, 100);
}

/**
 * 渲染关键指标卡片（带数字动画）
 */
function renderMetrics(manager) {
    const stats = manager.getOverviewStats();
    
    const metrics = [
        {
            title: '本周学习时长',
            value: `${stats.weekHours}`,
            suffix: ' 小时',
            icon: ICONS.CLOCK,
            trend: 'Keep going',
            trendClass: 'text-white',
            bgClass: 'card-blue'
        },
        {
            title: '掌握度',
            value: `${stats.masteryRate}`,
            suffix: '%',
            icon: ICONS.ZAP,
            trend: 'Level Up',
            trendClass: 'text-white',
            bgClass: 'card-amber'
        },
        {
            title: '连续打卡',
            value: `${stats.streak}`,
            suffix: ' 天',
            icon: ICONS.FLAME,
            trend: 'On Fire!',
            trendClass: 'text-white',
            bgClass: 'card-rose'
        },
        {
            title: '词汇总量',
            value: stats.totalWords,
            suffix: '',
            icon: ICONS.BOOK,
            trend: `+${stats.todayCount}`,
            trendClass: 'text-white',
            bgClass: 'card-emerald'
        }
    ];

    const container = document.querySelector('.metrics-grid');
    
    // 使用智能渲染器
    renderer.updateComponent('metrics', metrics, (data) => {
        container.innerHTML = data.map((m, index) => `
            <div class="stat-card ${m.bgClass}">
                <div class="stat-header">
                    <div class="stat-icon-wrapper">
                        ${m.icon}
                    </div>
                    <div class="stat-trend ${m.trendClass}">${m.trend}</div>
                </div>
                <div class="stat-info">
                    <div class="stat-value" data-value="${m.value}" data-suffix="${m.suffix}" id="metric-${index}">0${m.suffix}</div>
                    <div class="stat-label">${m.title}</div>
                </div>
            </div>
        `).join('');

        // 数字滚动动画
        data.forEach((m, index) => {
            const element = document.getElementById(`metric-${index}`);
            if (element && renderer) {
                renderer.animateNumber(element, 0, m.value, 1000, (n) => `${n}${m.suffix}`);
            }
        });
    });
}

/**
 * 渲染 AI 教练建议 (使用 SmartCoach)
 */
function renderAICoach(manager) {
    const advice = coach ? coach.getPersonalizedAdvice() : manager.getAICoachAdvice();
    const container = document.querySelector('.ai-coach-panel .coach-content');
    
    if (!container) return;

    // 使用智能渲染器更新
    renderer.updateComponent('ai-coach', advice, (data) => {
        container.innerHTML = `
            ${ICONS.ROBOT}
            <p class="coach-text">${data.text}</p>
            <button class="glass-btn-sm" data-action="${data.action}">${data.action}</button>
        `;
        
        const button = container.querySelector('button');
        if (button) {
            button.addEventListener('click', () => handleCoachAction(data));
        }

        // 淡入动画
        renderer.fadeIn(container);
    });
}

/**
 * 处理教练建议的操作
 */
function handleCoachAction(advice) {
    if (accessible && accessible.initialized) {
        accessible.announce(`开始${advice.action}`);
    }

    switch (advice.type) {
        case 'review':
            window.location.href = "popup.html#learning";
            break;
        case 'timing':
        case 'consistency':
        case 'speed':
            window.location.href = "popup.html#learning";
            break;
        default:
            alert("即将开始: " + advice.action);
    }
}

/**
 * 渲染图表 (使用 MiniChart 替代 Chart.js)
 */
function renderCharts(manager) {
    const weeklyData = manager.getWeeklyData();
    
    // 确保数据不为空
    const safeActivityData = weeklyData.length > 0 ? weeklyData.map(d => ({
        label: d.label,
        value: d.count
    })) : Array(7).fill(0).map((_, i) => ({ label: `Day ${i+1}`, value: 0 }));

    const safeEfficiencyData = weeklyData.length > 0 ? weeklyData.map(d => ({
        label: d.label,
        value: d.words
    })) : Array(7).fill(0).map((_, i) => ({ label: `Day ${i+1}`, value: 0 }));

    const radarData = manager.getRadarData();
    const safeRadarData = radarData.length > 0 ? radarData : [
        { label: '词汇', value: 0 },
        { label: '活跃', value: 0 },
        { label: '阅读', value: 0 },
        { label: '听力', value: 0 },
        { label: '口语', value: 0 }
    ];

    // 1. Activity Chart (Line)
    if (window.MiniLineChart) {
        renderer.updateChart('activityChartContainer', safeActivityData, window.MiniLineChart, {
            lineColor: '#38bdf8',
            areaColor: 'rgba(56, 189, 248, 0.1)',
            labelColor: '#94a3b8',
            gridColor: 'rgba(255,255,255,0.05)',
            smooth: true,
            showPoints: true
        });
    }

    // 2. Efficiency Chart (Bar)
    if (window.MiniBarChart) {
        renderer.updateChart('efficiencyChartContainer', safeEfficiencyData, window.MiniBarChart, {
            barColor: '#fbbf24',
            labelColor: '#94a3b8'
        });
    }

    // 3. Radar Chart
    if (window.MiniRadarChart) {
        renderer.updateChart('radarChartContainer', safeRadarData, window.MiniRadarChart, {
            lineColor: '#34d399',
            areaColor: 'rgba(52, 211, 153, 0.2)',
            labelColor: '#94a3b8'
        });
    }
}

/**
 * 渲染最近学习记录
 */
function renderSessionTable(manager) {
    const records = manager.getRecentSessions(5);
    const tbody = document.querySelector('#sessionTable tbody');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 20px;">暂无学习记录，快去查个单词吧！</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(r => `
        <tr>
            <td>
                <span style="display:flex; align-items:center; gap:8px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:${getModeColor(r.mode)}"></span>
                    ${getModeName(r.mode)}
                </span>
            </td>
            <td title="${r.translation}" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.word}</td>
            <td>${formatDuration(r.duration)}</td>
            <td>${new Date(r.timestamp).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}</td>
            <td>
                <span style="color:${r.correct ? '#34d399' : '#f87171'}">
                    ${r.correct ? 'High' : 'Normal'}
                </span>
            </td>
        </tr>
    `).join('');
}

/**
 * 渲染目标列表 (SVG Replaced)
 */
function renderGoals(manager) {
    const stats = manager.getOverviewStats();
    
    const goals = [
        { text: `每日学习 ${stats.dailyGoal} 个单词`, done: stats.todayCount >= stats.dailyGoal },
        { text: '保持连续打卡', done: stats.streak > 0 },
        { text: '完成一次复习', done: false }
    ];

    const container = document.getElementById('goalsList');
    container.innerHTML = goals.map(g => `
        <div class="goal-item ${g.done ? 'done' : ''}">
            <div class="goal-check">
                ${g.done ? ICONS.CHECK : ''}
            </div>
            <span>${g.text}</span>
        </div>
    `).join('');
}

/**
 * 渲染科目进度列表
 */
function renderSubjectProgress(manager) {
    const subjects = [
        { name: '通用词汇', progress: manager.getUserLevel().progress, color: '#38bdf8' },
        { name: '长难句', progress: 30, color: '#f472b6' },
        { name: '专业术语', progress: 15, color: '#34d399' }
    ];

    const container = document.getElementById('subjectProgressList');
    container.innerHTML = subjects.map(s => `
        <div style="margin-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#e2e8f0;">
                <span>${s.name}</span>
                <span>${s.progress}%</span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="width:${s.progress}%; height:100%; background:${s.color}; border-radius:3px;"></div>
            </div>
        </div>
    `).join('');
}

function bindEvents() {
    // Sidebar
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Modal Close
    const modal = document.getElementById('levelModal');
    if (modal) {
        // 点击遮罩层关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // 点击关闭按钮关闭
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    // Add Goal
    document.querySelector('.add-goal-btn')?.addEventListener('click', () => {
        const newGoal = prompt("请输入新目标 (例如：背诵50个单词)");
        if (newGoal) {
            alert("目标已添加: " + newGoal);
        }
    });
}

// Helpers (Same as before)
function getModeName(mode) {
    const map = { 'flashcard': '闪卡', 'quiz': '测验', 'spelling': '拼写', 'listening': '听力' };
    return map[mode] || '学习';
}
function getModeColor(mode) {
    const map = { 'flashcard': '#38bdf8', 'quiz': '#f472b6', 'spelling': '#fbbf24', 'listening': '#34d399' };
    return map[mode] || '#94a3b8';
}
function formatDuration(ms) {
    if (!ms) return '0s';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec}s`;
}
