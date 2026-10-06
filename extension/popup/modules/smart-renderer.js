/**
 * Smart Renderer - 智能渲染器
 * 实现增量更新、虚拟滚动和组件复用
 */

class SmartRenderer {
    constructor() {
        this.componentStates = new Map();
        this.chartInstances = new Map();
        this.renderQueue = [];
        this.isRendering = false;
    }

    /**
     * 批量更新 - 收集多个更新请求，一次性渲染
     */
    scheduleUpdate(componentId, updateFn) {
        this.renderQueue.push({ componentId, updateFn });
        
        if (!this.isRendering) {
            this.isRendering = true;
            requestAnimationFrame(() => this.flushUpdates());
        }
    }

    /**
     * 执行所有待处理的更新
     */
    flushUpdates() {
        const updates = [...this.renderQueue];
        this.renderQueue = [];
        
        updates.forEach(({ componentId, updateFn }) => {
            try {
                updateFn();
            } catch (error) {
                console.error(`[SmartRenderer] Update failed for ${componentId}:`, error);
            }
        });
        
        this.isRendering = false;
    }

    /**
     * 智能更新组件 - 只在数据变化时更新
     */
    updateComponent(id, newData, renderFn) {
        const oldData = this.componentStates.get(id);
        
        if (!this.hasChanged(oldData, newData)) {
            return false; // 无需更新
        }
        
        this.scheduleUpdate(id, () => {
            renderFn(newData);
            this.componentStates.set(id, this.deepClone(newData));
        });
        
        return true;
    }

    /**
     * 检测数据是否变化
     */
    hasChanged(oldData, newData) {
        if (oldData === undefined) return true;
        
        // 简单对比（可以根据需要优化）
        return JSON.stringify(oldData) !== JSON.stringify(newData);
    }

    /**
     * 深拷贝数据
     */
    deepClone(data) {
        if (data === null || typeof data !== 'object') return data;
        if (data instanceof Date) return new Date(data);
        if (Array.isArray(data)) return data.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in data) {
            cloned[key] = this.deepClone(data[key]);
        }
        return cloned;
    }

    /**
     * 更新图表（复用实例）
     */
    updateChart(id, newData, ChartClass, options) {
        let chartInstance = this.chartInstances.get(id);
        const container = document.getElementById(id);
        
        if (!container) {
            console.warn(`[SmartRenderer] Chart container not found: ${id}`);
            return;
        }

        if (!chartInstance) {
            // 创建新图表
            container.innerHTML = '';
            chartInstance = new ChartClass({
                data: newData,
                width: container.clientWidth,
                height: container.clientHeight,
                options
            });
            container.appendChild(chartInstance.getElement());
            this.chartInstances.set(id, chartInstance);
        } else {
            // 更新现有图表
            if (chartInstance.update) {
                chartInstance.update(newData);
            } else {
                // 如果图表不支持更新，重新创建
                this.destroyChart(id);
                this.updateChart(id, newData, ChartClass, options);
            }
        }
    }

    /**
     * 销毁图表实例
     */
    destroyChart(id) {
        const chartInstance = this.chartInstances.get(id);
        if (chartInstance && chartInstance.destroy) {
            chartInstance.destroy();
        }
        this.chartInstances.delete(id);
    }

    /**
     * 虚拟滚动 - 只渲染可见区域
     */
    renderVirtualList(container, items, itemHeight, renderItemFn) {
        if (!container || items.length === 0) return;

        const containerHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // 计算可见范围
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 缓冲
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
        const endIndex = Math.min(items.length, startIndex + visibleCount);
        
        // 只渲染可见项
        const visibleItems = items.slice(startIndex, endIndex);
        
        // 创建容器
        const wrapper = document.createElement('div');
        wrapper.style.height = `${items.length * itemHeight}px`;
        wrapper.style.position = 'relative';
        
        // 渲染可见项
        visibleItems.forEach((item, index) => {
            const actualIndex = startIndex + index;
            const element = renderItemFn(item, actualIndex);
            element.style.position = 'absolute';
            element.style.top = `${actualIndex * itemHeight}px`;
            element.style.width = '100%';
            element.style.height = `${itemHeight}px`;
            wrapper.appendChild(element);
        });
        
        container.innerHTML = '';
        container.appendChild(wrapper);
    }

    /**
     * 骨架屏加载
     */
    showSkeleton(container, type = 'card') {
        const skeletons = {
            card: `
                <div class="skeleton-card">
                    <div class="skeleton-line" style="width: 60%; height: 20px; margin-bottom: 12px;"></div>
                    <div class="skeleton-line" style="width: 40%; height: 16px; margin-bottom: 8px;"></div>
                    <div class="skeleton-line" style="width: 80%; height: 16px;"></div>
                </div>
            `,
            table: `
                <div class="skeleton-table">
                    ${Array(5).fill(0).map(() => `
                        <div class="skeleton-row">
                            <div class="skeleton-cell"></div>
                            <div class="skeleton-cell"></div>
                            <div class="skeleton-cell"></div>
                        </div>
                    `).join('')}
                </div>
            `,
            chart: `
                <div class="skeleton-chart">
                    <div class="skeleton-bars">
                        ${Array(7).fill(0).map((_, i) => `
                            <div class="skeleton-bar" style="height: ${30 + Math.random() * 70}%;"></div>
                        `).join('')}
                    </div>
                </div>
            `
        };

        if (container) {
            container.innerHTML = skeletons[type] || skeletons.card;
            container.classList.add('loading');
        }
    }

    /**
     * 隐藏骨架屏
     */
    hideSkeleton(container) {
        if (container) {
            container.classList.remove('loading');
        }
    }

    /**
     * 数字滚动动画
     */
    animateNumber(element, from, to, duration = 1000, formatter = (n) => n) {
        if (!element) return;

        const start = Date.now();
        const diff = to - from;
        
        const update = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用 easeOutCubic 缓动函数
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = from + diff * eased;
            
            element.textContent = formatter(Math.floor(current));
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = formatter(to);
            }
        };
        
        requestAnimationFrame(update);
    }

    /**
     * 淡入动画
     */
    fadeIn(element, duration = 300) {
        if (!element) return;

        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    }

    /**
     * 清理所有资源
     */
    cleanup() {
        this.chartInstances.forEach((chart, id) => {
            this.destroyChart(id);
        });
        this.componentStates.clear();
        this.renderQueue = [];
    }
}

// 单例模式
window.smartRenderer = window.smartRenderer || new SmartRenderer();
