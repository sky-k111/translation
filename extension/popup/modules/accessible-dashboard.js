/**
 * Accessible Dashboard - 可访问性增强
 * 集成键盘导航、ARIA 标签和颜色对比度验证
 */

class AccessibleDashboard {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        this.initialized = false;
    }

    /**
     * 初始化可访问性功能
     */
    async init() {
        if (this.initialized) return;

        // 防御性检查：确保 DOM 已加载
        if (!document.body) {
            console.warn('[AccessibleDashboard] DOM not ready, delaying init');
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true });
                } else {
                    resolve();
                }
            });
        }

        try {
            // 设置键盘导航
            this.setupKeyboardNavigation();

            // 设置 ARIA 标签（直接使用 DOM API）
            this.setupARIALabels();

            // 验证颜色对比度
            this.validateColorContrast();

            // 设置焦点管理
            this.setupFocusManagement();

            this.initialized = true;
            console.log('[AccessibleDashboard] Initialized');
        } catch (error) {
            console.error('[AccessibleDashboard] Init error:', error);
            throw error;
        }
    }

    /**
     * 加载可访问性工具（已废弃，保留用于兼容性）
     */
    async loadAccessibilityTools() {
        // 不再需要加载外部工具
        // KeyboardManager 和 ARIAManager 是为 WordDrawer 设计的
    }

    /**
     * 设置键盘导航
     */
    setupKeyboardNavigation() {
        // 收集所有可聚焦元素
        this.updateFocusableElements();

        // 直接注册键盘事件监听器（不使用 KeyboardManager）
        // KeyboardManager 是为 WordDrawer 设计的，不适用于 Dashboard
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
            this.handleShortcuts(e);
        });
    }

    /**
     * 处理快捷键
     */
    handleShortcuts(e) {
        // Tab 键导航
        if (e.key === 'Tab' && !e.shiftKey) {
            // 让浏览器处理默认的 Tab 导航
            // 我们只需要确保元素有正确的 tabindex
            return;
        }

        // Shift+Tab 键导航
        if (e.key === 'Tab' && e.shiftKey) {
            // 让浏览器处理默认的 Shift+Tab 导航
            return;
        }

        // 数字键：跳转到不同区域
        if (e.key === '1' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            this.focusSection('metrics');
        }

        if (e.key === '2' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            this.focusSection('analytics');
        }

        if (e.key === '3' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            this.focusSection('history');
        }

        // Escape 键：关闭模态框
        if (e.key === 'Escape') {
            this.closeModals();
        }
    }

    /**
     * 更新可聚焦元素列表
     */
    updateFocusableElements() {
        const selectors = [
            '.menu-item',
            '.stat-card',
            '.glass-panel',
            'button',
            'a[href]',
            'input',
            'select',
            '[tabindex]:not([tabindex="-1"])'
        ];

        this.focusableElements = Array.from(
            document.querySelectorAll(selectors.join(','))
        ).filter(el => {
            return el.offsetParent !== null && // 可见
                   !el.disabled && // 未禁用
                   !el.hasAttribute('aria-hidden'); // 未隐藏
        });

        // 设置 tabindex
        this.focusableElements.forEach((el, index) => {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
        });
    }

    /**
     * 处理键盘按键
     */
    handleKeyPress(e) {
        const key = e.key;
        const target = e.target;

        // 方向键导航卡片
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            if (target.classList.contains('stat-card') || 
                target.classList.contains('glass-panel')) {
                e.preventDefault();
                this.navigateCards(key);
            }
        }

        // Enter/Space 激活元素
        if (key === 'Enter' || key === ' ') {
            if (target.classList.contains('stat-card') || 
                target.classList.contains('menu-item')) {
                e.preventDefault();
                target.click();
            }
        }
    }

    /**
     * 聚焦下一个元素
     */
    focusNext() {
        if (this.focusableElements.length === 0) return;

        this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
        this.focusableElements[this.currentFocusIndex].focus();
    }

    /**
     * 聚焦上一个元素
     */
    focusPrevious() {
        if (this.focusableElements.length === 0) return;

        this.currentFocusIndex = this.currentFocusIndex <= 0 
            ? this.focusableElements.length - 1 
            : this.currentFocusIndex - 1;
        this.focusableElements[this.currentFocusIndex].focus();
    }

    /**
     * 导航卡片（方向键）
     */
    navigateCards(direction) {
        const cards = Array.from(document.querySelectorAll('.stat-card, .glass-panel'));
        const currentCard = document.activeElement;
        const currentIndex = cards.indexOf(currentCard);

        if (currentIndex === -1) return;

        let nextIndex = currentIndex;

        switch (direction) {
            case 'ArrowRight':
            case 'ArrowDown':
                nextIndex = (currentIndex + 1) % cards.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIndex = currentIndex === 0 ? cards.length - 1 : currentIndex - 1;
                break;
        }

        cards[nextIndex].focus();
    }

    /**
     * 聚焦特定区域
     */
    focusSection(sectionName) {
        const sections = {
            metrics: '.metrics-grid',
            analytics: '.analytics-grid',
            history: '.bottom-grid'
        };

        const selector = sections[sectionName];
        if (selector) {
            const section = document.querySelector(selector);
            if (section) {
                const firstFocusable = section.querySelector('[tabindex="0"]');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        }
    }

    /**
     * 关闭所有模态框
     */
    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * 设置 ARIA 标签（直接使用 DOM API）
     */
    setupARIALabels() {
        // 主要区域
        const regions = [
            { selector: '.metrics-grid', role: 'region', label: '学习统计概览' },
            { selector: '.analytics-grid', role: 'region', label: '数据分析' },
            { selector: '.bottom-grid', role: 'region', label: '学习历史和目标' },
            { selector: '.glass-sidebar', role: 'navigation', label: '主导航' }
        ];

        regions.forEach(({ selector, role, label }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.setAttribute('role', role);
                element.setAttribute('aria-label', label);
            }
        });

        // 统计卡片
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            const label = card.querySelector('.stat-label')?.textContent || `统计卡片 ${index + 1}`;
            const value = card.querySelector('.stat-value')?.textContent || '';
            card.setAttribute('aria-label', `${label}: ${value}`);
            card.setAttribute('role', 'article');
        });

        // 图表
        document.querySelectorAll('.chart-container').forEach((chart, index) => {
            const panel = chart.closest('.glass-panel');
            const title = panel?.querySelector('h3')?.textContent || `图表 ${index + 1}`;
            chart.setAttribute('aria-label', title);
            chart.setAttribute('role', 'img');
        });

        // 按钮
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const text = button.textContent.trim() || button.title || '按钮';
            if (text) {
                button.setAttribute('aria-label', text);
            }
        });

        // 链接
        document.querySelectorAll('a:not([aria-label])').forEach(link => {
            const text = link.textContent.trim() || link.title || '链接';
            if (text) {
                link.setAttribute('aria-label', text);
            }
        });
    }

    /**
     * 验证颜色对比度
     */
    validateColorContrast() {
        if (typeof ColorContrastValidator === 'undefined') return;

        const validator = new ColorContrastValidator();
        const elementsToCheck = [
            ...document.querySelectorAll('.stat-card'),
            ...document.querySelectorAll('.glass-panel'),
            ...document.querySelectorAll('button'),
            ...document.querySelectorAll('.text-sub')
        ];

        const issues = [];

        elementsToCheck.forEach(element => {
            try {
                const result = validator.validate(element);
                if (!result.passes) {
                    issues.push({
                        element,
                        ratio: result.ratio,
                        required: result.required,
                        foreground: result.foreground,
                        background: result.background
                    });
                }
            } catch (error) {
                // 忽略验证错误
            }
        });

        if (issues.length > 0) {
            console.warn('[AccessibleDashboard] Color contrast issues found:', issues);
            
            // 可选：自动修复对比度问题
            if (this.autoFixContrast) {
                this.fixContrastIssues(issues);
            }
        }
    }

    /**
     * 修复对比度问题
     */
    fixContrastIssues(issues) {
        issues.forEach(({ element, ratio, required }) => {
            // 简单修复：增加文字阴影
            if (ratio < required) {
                element.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            }
        });
    }

    /**
     * 设置焦点管理
     */
    setupFocusManagement() {
        // 焦点陷阱（用于模态框）
        document.addEventListener('focusin', (e) => {
            const modal = document.querySelector('.modal-overlay.active');
            if (modal && !modal.contains(e.target)) {
                e.preventDefault();
                const firstFocusable = modal.querySelector('[tabindex="0"]');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        });

        // 焦点可见性指示器
        document.addEventListener('focusin', (e) => {
            e.target.classList.add('keyboard-focus');
        });

        document.addEventListener('focusout', (e) => {
            e.target.classList.remove('keyboard-focus');
        });

        // 鼠标点击时移除焦点指示器
        document.addEventListener('mousedown', () => {
            document.body.classList.add('using-mouse');
        });

        document.addEventListener('keydown', () => {
            document.body.classList.remove('using-mouse');
        });
    }

    /**
     * 宣布屏幕阅读器消息
     */
    announce(message, priority = 'polite') {
        // 防御性检查：确保 document.body 存在
        if (!document.body) {
            console.warn('[AccessibleDashboard] document.body not available yet');
            return;
        }

        let announcer = document.getElementById('aria-announcer');
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'aria-announcer';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', priority);
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            
            // 安全地添加到 body
            try {
                document.body.appendChild(announcer);
            } catch (error) {
                console.error('[AccessibleDashboard] Failed to append announcer:', error);
                return;
            }
        }

        // 清空后设置新消息（确保屏幕阅读器读取）
        announcer.textContent = '';
        setTimeout(() => {
            if (announcer) {
                announcer.textContent = message;
            }
        }, 100);
    }

    /**
     * 更新可访问性（数据变化时调用）
     */
    update() {
        this.updateFocusableElements();
        this.setupARIALabels();
    }
}

// 导出
window.AccessibleDashboard = AccessibleDashboard;
