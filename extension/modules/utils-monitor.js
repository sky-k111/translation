/**
 * 性能监控模块 - 实时跟踪内存和CPU（通过帧率模拟）情况
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: performance.now(),
      initTime: 0,
      memoryUsage: 0,
      fps: 60,
      drops: 0
    };
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
  }

  /**
   * 启动监控
   */
  start() {
    this.trackFPS();
    this.trackMemory();
    console.log('PerformanceMonitor: Started tracking');
  }

  /**
   * 记录初始化完成时间
   */
  markInitComplete() {
    this.metrics.initTime = performance.now() - this.metrics.startTime;
    console.log(`PerformanceMonitor: Init complete in ${this.metrics.initTime.toFixed(2)}ms`);
    // 如果启动时间过长，记录日志
    if (this.metrics.initTime > 1000) {
      console.warn('PerformanceMonitor: Slow startup detected');
    }
  }

  /**
   * 跟踪帧率，识别卡顿
   */
  trackFPS() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFrameTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = now;

      if (this.metrics.fps < 40) {
        this.metrics.drops++;
        console.warn(`PerformanceMonitor: Low FPS detected: ${this.metrics.fps}`);
      }
    }

    requestAnimationFrame(() => this.trackFPS());
  }

  /**
   * 跟踪内存使用情况 (Chrome 特有 API)
   */
  trackMemory() {
    if (performance.memory) {
      this.metrics.memoryUsage = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
      if (this.metrics.memoryUsage > 50) { // 超过 50MB 警告
        console.warn(`PerformanceMonitor: High memory usage: ${this.metrics.memoryUsage}MB`);
      }
    }
    setTimeout(() => this.trackMemory(), 5000);
  }

  /**
   * 获取当前性能报告
   */
  getReport() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 全局错误处理模块 - 捕获异常并尝试恢复
 */
class GlobalErrorHandler {
  constructor() {
    this.errorCount = 0;
    this.MAX_ERRORS = 5;
  }

  /**
   * 初始化错误监听
   */
  init() {
    window.onerror = (msg, url, line, col, error) => {
      this.handleError({ type: 'Runtime Error', msg, url, line, error });
      return false; // 允许默认处理（如在控制台打印）
    };

    window.onunhandledrejection = (event) => {
      this.handleError({ type: 'Unhandled Promise Rejection', msg: event.reason });
    };

    console.log('GlobalErrorHandler: Listening for errors');
  }

  /**
   * 统一错误处理逻辑
   */
  handleError(errorInfo) {
    this.errorCount++;
    console.error('GlobalErrorHandler Caught:', errorInfo);

    // 记录错误到存储，供诊断使用
    this.logErrorToStorage(errorInfo);

    // 如果错误过多，触发恢复模式
    if (this.errorCount >= this.MAX_ERRORS) {
      this.showRecoveryUI();
    }
  }

  /**
   * 将错误记录到本地存储
   */
  async logErrorToStorage(errorInfo) {
    try {
      const { errorLogs = [] } = await chrome.storage.local.get(['errorLogs']);
      errorLogs.push({ ...errorInfo, time: new Date().toISOString() });
      // 仅保留最近 20 条日志
      await chrome.storage.local.set({ errorLogs: errorLogs.slice(-20) });
    } catch (e) {
      console.error('Failed to log error to storage', e);
    }
  }

  /**
   * 显示恢复界面
   */
  showRecoveryUI() {
    const recoveryDiv = document.createElement('div');
    recoveryDiv.className = 'recovery-overlay';
    recoveryDiv.innerHTML = `
      <div class="recovery-card">
        <h3>Oops! 插件遇到了一些问题</h3>
        <p>我们检测到多次运行错误。您可以尝试：</p>
        <div class="recovery-actions">
          <button id="reloadPlugin">🔄 刷新插件</button>
          <button id="resetData" class="danger">⚠️ 重置数据(慎用)</button>
        </div>
      </div>
    `;
    document.body.appendChild(recoveryDiv);

    document.getElementById('reloadPlugin').onclick = () => window.location.reload();
    document.getElementById('resetData').onclick = async () => {
      if (confirm('这将清除所有翻译记录和设置。确定吗？')) {
        await chrome.storage.local.clear();
        window.location.reload();
      }
    };
  }
}

// 导出单例
window.performanceMonitor = new PerformanceMonitor();
window.errorHandler = new GlobalErrorHandler();
