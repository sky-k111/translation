/**
 * Mini Chart - 轻量级 SVG 图表组件
 * 替代 Chart.js，符合 CSP 要求，更轻量
 */

class MiniChart {
    constructor(options = {}) {
        this.container = options.container;
        this.data = options.data || [];
        this.width = options.width || 400;
        this.height = options.height || 200;
        this.options = {
            padding: 20,
            lineColor: '#38bdf8',
            areaColor: 'rgba(56, 189, 248, 0.1)',
            gridColor: 'rgba(255, 255, 255, 0.05)',
            labelColor: '#94a3b8',
            pointRadius: 4,
            showGrid: true,
            showPoints: true,
            showArea: true,
            smooth: true,
            ...options.options
        };
        
        this.svg = null;
        this.tooltip = null;
        this.maxValue = Math.max(...this.data.map(d => d.value), 1);
    }

    /**
     * 创建 SVG 元素
     */
    createSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        svg.style.overflow = 'visible';
        return svg;
    }

    /**
     * 创建网格
     */
    createGrid() {
        const { padding, gridColor } = this.options;
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('class', 'grid');

        // 水平网格线
        for (let i = 0; i <= 4; i++) {
            const y = padding + (this.height - 2 * padding) * (i / 4);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', padding);
            line.setAttribute('y1', y);
            line.setAttribute('x2', this.width - padding);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', gridColor);
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '2,2');
            gridGroup.appendChild(line);
        }

        return gridGroup;
    }

    /**
     * 获取图表元素
     */
    getElement() {
        return this.svg;
    }

    /**
     * 更新数据
     */
    update(newData) {
        this.data = newData;
        this.maxValue = Math.max(...this.data.map(d => d.value), 1);
        this.render();
    }

    /**
     * 销毁图表
     */
    destroy() {
        if (this.svg && this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg);
        }
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}

/**
 * 折线图
 */
class MiniLineChart extends MiniChart {
    render() {
        this.svg = this.createSVG();
        const { padding, lineColor, areaColor, showGrid, showPoints, showArea, smooth } = this.options;

        // 添加网格
        if (showGrid) {
            this.svg.appendChild(this.createGrid());
        }

        if (this.data.length === 0) return this.svg;

        // 计算点的坐标
        const points = this.data.map((d, i) => {
            const x = padding + (this.width - 2 * padding) * (i / Math.max(this.data.length - 1, 1));
            const y = this.height - padding - (this.height - 2 * padding) * (d.value / this.maxValue);
            return { x, y, data: d };
        });

        // 绘制区域
        if (showArea) {
            const areaPath = this.createAreaPath(points);
            const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            area.setAttribute('d', areaPath);
            area.setAttribute('fill', areaColor);
            this.svg.appendChild(area);
        }

        // 绘制线条
        const linePath = smooth ? this.createSmoothPath(points) : this.createLinePath(points);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', linePath);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', lineColor);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-linejoin', 'round');
        this.svg.appendChild(line);

        // 绘制点
        if (showPoints) {
            points.forEach((point, i) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute('r', this.options.pointRadius);
                circle.setAttribute('fill', lineColor);
                circle.setAttribute('class', 'chart-point');
                circle.style.cursor = 'pointer';
                
                // 添加交互
                circle.addEventListener('mouseenter', (e) => this.showTooltip(point.data, e));
                circle.addEventListener('mouseleave', () => this.hideTooltip());
                
                this.svg.appendChild(circle);
            });
        }

        // 添加标签
        this.addLabels(points);

        return this.svg;
    }

    createLinePath(points) {
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }

    createSmoothPath(points) {
        if (points.length < 2) return this.createLinePath(points);

        let path = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const controlX = (current.x + next.x) / 2;
            
            path += ` Q ${controlX} ${current.y}, ${controlX} ${(current.y + next.y) / 2}`;
            path += ` Q ${controlX} ${next.y}, ${next.x} ${next.y}`;
        }
        
        return path;
    }

    createAreaPath(points) {
        const { padding } = this.options;
        const linePath = this.createLinePath(points);
        const bottomY = this.height - padding;
        
        return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
    }

    addLabels(points) {
        const { labelColor, padding } = this.options;
        
        points.forEach((point, i) => {
            if (i % Math.ceil(points.length / 7) === 0 || i === points.length - 1) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', point.x);
                text.setAttribute('y', this.height - padding + 15);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('fill', labelColor);
                text.setAttribute('font-size', '11');
                text.textContent = point.data.label || '';
                this.svg.appendChild(text);
            }
        });
    }

    showTooltip(data, event) {
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'chart-tooltip';
            this.tooltip.style.cssText = `
                position: fixed;
                background: rgba(15, 23, 42, 0.95);
                color: #fff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(this.tooltip);
        }

        this.tooltip.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${data.label}</div>
            <div style="color: #94a3b8;">数值: ${data.value}</div>
        `;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${event.clientX + 10}px`;
        this.tooltip.style.top = `${event.clientY - 10}px`;
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
}

/**
 * 柱状图
 */
class MiniBarChart extends MiniChart {
    render() {
        this.svg = this.createSVG();
        const { padding, showGrid } = this.options;
        const barColor = this.options.barColor || this.options.lineColor;

        if (showGrid) {
            this.svg.appendChild(this.createGrid());
        }

        if (this.data.length === 0) return this.svg;

        const barWidth = (this.width - 2 * padding) / this.data.length * 0.7;
        const barSpacing = (this.width - 2 * padding) / this.data.length;

        this.data.forEach((d, i) => {
            const x = padding + barSpacing * i + (barSpacing - barWidth) / 2;
            const barHeight = (this.height - 2 * padding) * (d.value / this.maxValue);
            const y = this.height - padding - barHeight;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', barColor);
            rect.setAttribute('rx', '4');
            rect.style.cursor = 'pointer';
            rect.style.transition = 'opacity 0.2s';

            rect.addEventListener('mouseenter', (e) => {
                rect.style.opacity = '0.8';
                this.showTooltip(d, e);
            });
            rect.addEventListener('mouseleave', () => {
                rect.style.opacity = '1';
                this.hideTooltip();
            });

            this.svg.appendChild(rect);

            // 添加标签
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + barWidth / 2);
            text.setAttribute('y', this.height - padding + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', this.options.labelColor);
            text.setAttribute('font-size', '11');
            text.textContent = d.label || '';
            this.svg.appendChild(text);
        });

        return this.svg;
    }

    showTooltip(data, event) {
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: rgba(15, 23, 42, 0.95);
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        tooltip.innerHTML = `
            <div style="font-weight: 600;">${data.label}</div>
            <div style="color: #94a3b8;">数值: ${data.value}</div>
        `;
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY - 10}px`;
        document.body.appendChild(tooltip);
        this.tooltip = tooltip;
    }

    hideTooltip() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
            this.tooltip = null;
        }
    }
}

/**
 * 雷达图
 */
class MiniRadarChart extends MiniChart {
    render() {
        this.svg = this.createSVG();
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 2 - 40;
        const levels = 5;

        // 绘制背景网格
        for (let i = 1; i <= levels; i++) {
            const r = (radius / levels) * i;
            const polygon = this.createPolygon(centerX, centerY, r, this.data.length);
            polygon.setAttribute('fill', 'none');
            polygon.setAttribute('stroke', this.options.gridColor);
            polygon.setAttribute('stroke-width', '1');
            this.svg.appendChild(polygon);
        }

        // 绘制轴线
        this.data.forEach((d, i) => {
            const angle = (Math.PI * 2 * i) / this.data.length - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', centerX);
            line.setAttribute('y1', centerY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', this.options.gridColor);
            line.setAttribute('stroke-width', '1');
            this.svg.appendChild(line);

            // 添加标签
            const labelX = centerX + Math.cos(angle) * (radius + 20);
            const labelY = centerY + Math.sin(angle) * (radius + 20);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', labelX);
            text.setAttribute('y', labelY);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', this.options.labelColor);
            text.setAttribute('font-size', '12');
            text.textContent = d.label;
            this.svg.appendChild(text);
        });

        // 绘制数据区域
        const dataPoints = this.data.map((d, i) => {
            const angle = (Math.PI * 2 * i) / this.data.length - Math.PI / 2;
            const r = (d.value / 100) * radius;
            return {
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r
            };
        });

        const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        area.setAttribute('d', dataPath);
        area.setAttribute('fill', this.options.areaColor);
        area.setAttribute('stroke', this.options.lineColor);
        area.setAttribute('stroke-width', '2');
        this.svg.appendChild(area);

        // 绘制数据点
        dataPoints.forEach((p, i) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', p.x);
            circle.setAttribute('cy', p.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', this.options.lineColor);
            this.svg.appendChild(circle);
        });

        return this.svg;
    }

    createPolygon(cx, cy, radius, sides) {
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            points.push(`${x},${y}`);
        }
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        return polygon;
    }
}

// 导出
window.MiniLineChart = MiniLineChart;
window.MiniBarChart = MiniBarChart;
window.MiniRadarChart = MiniRadarChart;
