/**
 * POS Settings Panel Component
 * 
 * Provides UI for configuring POS recognition settings:
 * - User tier selection (free/paid)
 * - AI API configuration
 * - Approach preference
 * - Color scheme customization
 * 
 * Requirements: 10.1, 10.2
 */

class POSSettingsPanel {
  constructor() {
    this.container = null;
    this.config = null;
    this.stats = null;
  }
  
  /**
   * Create the settings panel HTML
   */
  createPanel() {
    const panel = document.createElement('div');
    panel.className = 'pos-settings-panel';
    panel.innerHTML = `
      <div class="pos-settings-header">
        <h2>词性识别设置</h2>
        <p class="pos-settings-description">配置词性识别功能的行为和外观</p>
      </div>
      
      <div class="pos-settings-content">
        <!-- User Tier Section -->
        <div class="pos-settings-section">
          <h3>用户层级</h3>
          <p class="section-description">选择您的用户层级以启用不同的识别方案</p>
          <div class="pos-tier-selector">
            <label class="pos-radio-option">
              <input type="radio" name="userTier" value="free" checked>
              <span class="radio-label">
                <strong>免费用户</strong>
                <small>使用前端轻量级识别（准确率 80%+）</small>
              </span>
            </label>
            <label class="pos-radio-option">
              <input type="radio" name="userTier" value="paid">
              <span class="radio-label">
                <strong>付费用户</strong>
                <small>使用 AI 增强识别（准确率 95%+）</small>
              </span>
            </label>
          </div>
        </div>
        
        <!-- AI Configuration Section (only for paid users) -->
        <div class="pos-settings-section pos-ai-config" style="display: none;">
          <h3>AI 服务配置</h3>
          <p class="section-description">配置 AI 翻译服务以启用高级词性识别</p>
          
          <div class="pos-form-group">
            <label for="aiEnabled">启用 AI 服务</label>
            <input type="checkbox" id="aiEnabled" class="pos-checkbox">
          </div>
          
          <div class="pos-form-group">
            <label for="aiApiUrl">API 地址</label>
            <input type="text" id="aiApiUrl" class="pos-input" 
                   placeholder="https://api.openai.com/v1/chat/completions">
          </div>
          
          <div class="pos-form-group">
            <label for="aiApiKey">API 密钥</label>
            <input type="password" id="aiApiKey" class="pos-input" 
                   placeholder="sk-...">
            <small class="form-hint">您的 API 密钥将安全存储在本地</small>
          </div>
          
          <div class="pos-form-group">
            <label for="aiModel">模型</label>
            <select id="aiModel" class="pos-select">
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
          
          <button class="pos-btn pos-btn-secondary" id="testAiConnection">
            测试连接
          </button>
          <span class="connection-status" id="aiConnectionStatus"></span>
        </div>
        
        <!-- Approach Preference Section -->
        <div class="pos-settings-section">
          <h3>识别方案偏好</h3>
          <p class="section-description">选择首选的词性识别方案</p>
          <div class="pos-form-group">
            <label for="preferredApproach">首选方案</label>
            <select id="preferredApproach" class="pos-select">
              <option value="auto">自动选择（推荐）</option>
              <option value="ai">AI 增强</option>
              <option value="nlp">NLP 后端</option>
              <option value="frontend">前端分析</option>
            </select>
            <small class="form-hint">自动模式会根据可用性和用户层级选择最佳方案</small>
          </div>
        </div>
        
        <!-- Cache Settings Section -->
        <div class="pos-settings-section">
          <h3>缓存设置</h3>
          <div class="pos-form-group">
            <label for="enableCache">启用缓存</label>
            <input type="checkbox" id="enableCache" class="pos-checkbox" checked>
            <small class="form-hint">缓存可以显著提高性能</small>
          </div>
        </div>
        
        <!-- Color Scheme Section -->
        <div class="pos-settings-section">
          <h3>颜色方案</h3>
          <p class="section-description">自定义不同词性的颜色标注</p>
          <div class="pos-color-grid">
            <div class="pos-color-item">
              <label for="colorNoun">名词</label>
              <input type="color" id="colorNoun" value="#4A90E2">
              <span class="color-preview" style="background-color: #4A90E2;"></span>
            </div>
            <div class="pos-color-item">
              <label for="colorVerb">动词</label>
              <input type="color" id="colorVerb" value="#E24A4A">
              <span class="color-preview" style="background-color: #E24A4A;"></span>
            </div>
            <div class="pos-color-item">
              <label for="colorAdjective">形容词</label>
              <input type="color" id="colorAdjective" value="#50C878">
              <span class="color-preview" style="background-color: #50C878;"></span>
            </div>
            <div class="pos-color-item">
              <label for="colorAdverb">副词</label>
              <input type="color" id="colorAdverb" value="#F5A623">
              <span class="color-preview" style="background-color: #F5A623;"></span>
            </div>
            <div class="pos-color-item">
              <label for="colorUnknown">未知</label>
              <input type="color" id="colorUnknown" value="#9B9B9B">
              <span class="color-preview" style="background-color: #9B9B9B;"></span>
            </div>
          </div>
          <button class="pos-btn pos-btn-secondary" id="resetColors">
            恢复默认颜色
          </button>
        </div>
        
        <!-- Statistics Section -->
        <div class="pos-settings-section">
          <h3>性能统计</h3>
          <div class="pos-stats-grid" id="posStatsGrid">
            <div class="stat-item">
              <span class="stat-label">总请求数</span>
              <span class="stat-value" id="statTotalRequests">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均延迟</span>
              <span class="stat-value" id="statAvgLatency">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">缓存命中率</span>
              <span class="stat-value" id="statCacheHitRate">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">错误率</span>
              <span class="stat-value" id="statErrorRate">-</span>
            </div>
          </div>
          <div class="pos-stats-actions">
            <button class="pos-btn pos-btn-secondary" id="refreshStats">
              刷新统计
            </button>
            <button class="pos-btn pos-btn-secondary" id="exportStats">
              导出数据
            </button>
            <button class="pos-btn pos-btn-danger" id="resetStats">
              重置统计
            </button>
          </div>
        </div>
        
        <!-- Service Availability Section -->
        <div class="pos-settings-section">
          <h3>服务状态</h3>
          <div class="pos-service-status">
            <div class="service-item">
              <span class="service-name">前端分析</span>
              <span class="service-indicator service-available" id="serviceFrontend">
                ● 可用
              </span>
            </div>
            <div class="service-item">
              <span class="service-name">AI 服务</span>
              <span class="service-indicator service-unavailable" id="serviceAI">
                ● 不可用
              </span>
            </div>
            <div class="service-item">
              <span class="service-name">NLP 后端</span>
              <span class="service-indicator service-unavailable" id="serviceNLP">
                ● 不可用
              </span>
            </div>
          </div>
          <button class="pos-btn pos-btn-secondary" id="refreshServices">
            刷新服务状态
          </button>
        </div>
      </div>
      
      <div class="pos-settings-footer">
        <button class="pos-btn pos-btn-primary" id="saveSettings">
          保存设置
        </button>
        <button class="pos-btn pos-btn-secondary" id="cancelSettings">
          取消
        </button>
      </div>
    `;
    
    this.container = panel;
    this.attachEventListeners();
    return panel;
  }
  
  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    // User tier selection
    const tierRadios = this.container.querySelectorAll('input[name="userTier"]');
    tierRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.onTierChange(e.target.value));
    });
    
    // Color inputs
    const colorInputs = this.container.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
      input.addEventListener('change', (e) => this.onColorChange(e.target));
    });
    
    // Buttons
    this.container.querySelector('#testAiConnection')?.addEventListener('click', () => this.testAIConnection());
    this.container.querySelector('#resetColors')?.addEventListener('click', () => this.resetColors());
    this.container.querySelector('#refreshStats')?.addEventListener('click', () => this.loadStats());
    this.container.querySelector('#exportStats')?.addEventListener('click', () => this.exportStats());
    this.container.querySelector('#resetStats')?.addEventListener('click', () => this.resetStats());
    this.container.querySelector('#refreshServices')?.addEventListener('click', () => this.refreshServices());
    this.container.querySelector('#saveSettings')?.addEventListener('click', () => this.saveSettings());
    this.container.querySelector('#cancelSettings')?.addEventListener('click', () => this.close());
  }
  
  /**
   * Handle tier change
   */
  onTierChange(tier) {
    const aiConfigSection = this.container.querySelector('.pos-ai-config');
    if (tier === 'paid') {
      aiConfigSection.style.display = 'block';
    } else {
      aiConfigSection.style.display = 'none';
    }
  }
  
  /**
   * Handle color change
   */
  onColorChange(input) {
    const preview = input.nextElementSibling;
    if (preview && preview.classList.contains('color-preview')) {
      preview.style.backgroundColor = input.value;
    }
  }
  
  /**
   * Test AI connection
   */
  async testAIConnection() {
    const statusEl = this.container.querySelector('#aiConnectionStatus');
    statusEl.textContent = '测试中...';
    statusEl.className = 'connection-status testing';
    
    try {
      // Get AI settings
      const apiUrl = this.container.querySelector('#aiApiUrl').value;
      const apiKey = this.container.querySelector('#aiApiKey').value;
      const model = this.container.querySelector('#aiModel').value;
      
      if (!apiUrl || !apiKey) {
        throw new Error('请填写 API 地址和密钥');
      }
      
      // Test connection (simple ping)
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        })
      });
      
      if (response.ok) {
        statusEl.textContent = '✓ 连接成功';
        statusEl.className = 'connection-status success';
      } else {
        throw new Error(`连接失败: ${response.status}`);
      }
    } catch (error) {
      statusEl.textContent = `✗ ${error.message}`;
      statusEl.className = 'connection-status error';
    }
  }
  
  /**
   * Reset colors to default
   */
  resetColors() {
    const defaults = {
      colorNoun: '#4A90E2',
      colorVerb: '#E24A4A',
      colorAdjective: '#50C878',
      colorAdverb: '#F5A623',
      colorUnknown: '#9B9B9B'
    };
    
    Object.entries(defaults).forEach(([id, color]) => {
      const input = this.container.querySelector(`#${id}`);
      if (input) {
        input.value = color;
        this.onColorChange(input);
      }
    });
  }
  
  /**
   * Load current configuration
   */
  async loadConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_USER_CONFIG' });
      
      if (response.ok) {
        this.config = response.config;
        this.populateForm(this.config);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }
  
  /**
   * Populate form with configuration
   */
  populateForm(config) {
    // Set tier
    const tierRadio = this.container.querySelector(`input[name="userTier"][value="${config.tier}"]`);
    if (tierRadio) {
      tierRadio.checked = true;
      this.onTierChange(config.tier);
    }
    
    // Set approach
    const approachSelect = this.container.querySelector('#preferredApproach');
    if (approachSelect) {
      approachSelect.value = config.preferredApproach;
    }
    
    // Set cache
    const cacheCheckbox = this.container.querySelector('#enableCache');
    if (cacheCheckbox) {
      cacheCheckbox.checked = config.enableCache;
    }
    
    // Set colors
    if (config.colorScheme) {
      Object.entries(config.colorScheme).forEach(([pos, color]) => {
        const input = this.container.querySelector(`#color${pos.charAt(0).toUpperCase() + pos.slice(1)}`);
        if (input) {
          input.value = color;
          this.onColorChange(input);
        }
      });
    }
    
    // Load AI settings from storage
    chrome.storage.local.get(['aiSettings'], (result) => {
      if (result.aiSettings) {
        const aiSettings = result.aiSettings;
        this.container.querySelector('#aiEnabled').checked = aiSettings.enabled || false;
        this.container.querySelector('#aiApiUrl').value = aiSettings.apiUrl || '';
        this.container.querySelector('#aiApiKey').value = aiSettings.apiKey || '';
        this.container.querySelector('#aiModel').value = aiSettings.model || 'gpt-4';
      }
    });
  }
  
  /**
   * Load statistics
   */
  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PERFORMANCE_SUMMARY' });
      
      if (response.ok) {
        this.stats = response.summary;
        this.updateStatsDisplay(this.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }
  
  /**
   * Update statistics display
   */
  updateStatsDisplay(stats) {
    this.container.querySelector('#statTotalRequests').textContent = stats.totalRequests || '0';
    this.container.querySelector('#statAvgLatency').textContent = stats.averageLatency || '0ms';
    this.container.querySelector('#statCacheHitRate').textContent = stats.cacheHitRate || '0%';
    this.container.querySelector('#statErrorRate').textContent = stats.errorRate || '0%';
  }
  
  /**
   * Export statistics
   */
  async exportStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_POS_STATS' });
      
      if (response.ok) {
        const dataStr = JSON.stringify(response.stats, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos-stats-${new Date().toISOString()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export stats:', error);
      alert('导出失败: ' + error.message);
    }
  }
  
  /**
   * Reset statistics
   */
  async resetStats() {
    if (!confirm('确定要重置所有统计数据吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'RESET_POS_STATS' });
      
      if (response.ok) {
        await this.loadStats();
        alert('统计数据已重置');
      }
    } catch (error) {
      console.error('Failed to reset stats:', error);
      alert('重置失败: ' + error.message);
    }
  }
  
  /**
   * Refresh service availability
   */
  async refreshServices() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'REFRESH_SERVICE_AVAILABILITY' });
      
      if (response.ok) {
        this.updateServiceStatus(response.availability);
      }
    } catch (error) {
      console.error('Failed to refresh services:', error);
    }
  }
  
  /**
   * Update service status display
   */
  updateServiceStatus(availability) {
    const updateIndicator = (id, available) => {
      const el = this.container.querySelector(`#${id}`);
      if (el) {
        el.className = available ? 'service-indicator service-available' : 'service-indicator service-unavailable';
        el.textContent = available ? '● 可用' : '● 不可用';
      }
    };
    
    updateIndicator('serviceFrontend', availability.frontend);
    updateIndicator('serviceAI', availability.ai);
    updateIndicator('serviceNLP', availability.nlp);
  }
  
  /**
   * Save settings
   */
  async saveSettings() {
    try {
      // Collect form data
      const tier = this.container.querySelector('input[name="userTier"]:checked').value;
      const preferredApproach = this.container.querySelector('#preferredApproach').value;
      const enableCache = this.container.querySelector('#enableCache').checked;
      
      const colorScheme = {
        noun: this.container.querySelector('#colorNoun').value,
        verb: this.container.querySelector('#colorVerb').value,
        adjective: this.container.querySelector('#colorAdjective').value,
        adverb: this.container.querySelector('#colorAdverb').value,
        unknown: this.container.querySelector('#colorUnknown').value
      };
      
      // Save POS config
      const config = {
        tier,
        preferredApproach,
        enableCache,
        colorScheme
      };
      
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_CONFIG',
        config
      });
      
      if (response.ok) {
        // Save AI settings
        const aiSettings = {
          enabled: this.container.querySelector('#aiEnabled').checked,
          apiUrl: this.container.querySelector('#aiApiUrl').value,
          apiKey: this.container.querySelector('#aiApiKey').value,
          model: this.container.querySelector('#aiModel').value
        };
        
        await chrome.storage.local.set({ aiSettings });
        
        alert('设置已保存');
        this.close();
      } else {
        throw new Error(response.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存失败: ' + error.message);
    }
  }
  
  /**
   * Close the panel
   */
  close() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
  
  /**
   * Show the panel
   */
  async show() {
    const panel = this.createPanel();
    document.body.appendChild(panel);
    
    // Load current configuration and stats
    await this.loadConfig();
    await this.loadStats();
    await this.refreshServices();
  }
}

// Export for use in popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = POSSettingsPanel;
}
