/**
 * 主题管理器模块
 * 负责处理UI元素主题的切换和样式应用
 */
(function(window) {
  class ThemeManager {
    constructor() {
      // 主题定义：使用更清晰的数组格式，便于扩展和维护
      this.themes = {
        default: {
          id: 'default',
          name: '浅色模式',
          className: 'theme-default',
          isDefault: true
        },
        dark: {
          id: 'dark',
          name: '深色模式',
          className: 'theme-dark',
          isDefault: false
        }
      };
      
      // 当前主题
      this.currentTheme = 'default';
      
      // 存储所有主题类名，用于快速移除
      this.themeClassNames = Object.values(this.themes).map(theme => theme.className);
    }

    /**
     * 初始化主题
     */
    async init() {
      try {
        // 从存储中加载保存的主题
        const result = await chrome.storage.local.get(['userSettings']);
        const settings = result.userSettings || {};

        // 调试：打印加载的设置
        console.log('加载的主题设置:', settings.uiElementTheme);

        // 修复：确保主题设置被正确处理，支持旧版本的设置格式
        let savedTheme = settings.uiElementTheme;

        // 支持旧版本的设置格式（如果需要）
        if (savedTheme === undefined || savedTheme === null) {
          // 检查是否有旧版本的设置
          savedTheme = settings.theme || 'default';

          // 如果没有任何主题设置，保存默认主题到存储中
          await this._saveDefaultThemeIfNeeded(settings);
        }

        const validTheme = this.validateTheme(savedTheme) || 'default';

        // 确保在DOM准备好之后才应用主题（不要提前设置currentTheme）
        this._applyThemeWhenReady(validTheme);

        // 调试：打印应用的主题
        console.log('应用的主题:', validTheme);
      } catch (error) {
        console.error('主题初始化失败:', error);
        // 初始化失败时使用默认主题
        this._applyThemeWhenReady('default');
      }
    }
    
    /**
     * 如果没有保存的主题设置，保存默认主题到存储中
     * @param {Object} settings - 用户设置对象
     * @private
     */
    async _saveDefaultThemeIfNeeded(settings) {
      // 检查是否有任何主题相关的设置
      if (settings.uiElementTheme === undefined && settings.theme === undefined) {
        // 没有主题设置，保存默认主题
        const updatedSettings = {
          ...settings,
          uiElementTheme: 'default'
        };
        
        await chrome.storage.local.set({ userSettings: updatedSettings });
        console.log('已保存默认主题设置:', updatedSettings);
      }
    }
    
    /**
     * 确保在DOM准备好之后才应用主题
     * @param {string} themeName - 要应用的主题名称
     * @private
     */
    _applyThemeWhenReady(themeName) {
      if (!document.body) {
        console.warn('document.body不存在，延迟应用主题');
        // 当DOM准备好后再应用主题
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.applyTheme(themeName, true); // 强制应用
          });
        } else {
          // 如果DOM已经准备好，但body还不存在，使用setTimeout延迟
          setTimeout(() => {
            this.applyTheme(themeName, true); // 强制应用
          }, 100);
        }
      } else {
        // DOM已经准备好，直接应用主题
        this.applyTheme(themeName, true); // 强制应用
      }
    }

    /**
     * 验证主题名称的有效性
     * @param {string} themeName - 主题名称
     * @returns {string|null} 有效的主题名称或null
     */
    validateTheme(themeName) {
      if (typeof themeName !== 'string') {
        return null;
      }
      
      const theme = this.themes[themeName];
      if (!theme || typeof theme !== 'object' || !theme.className) {
        return null;
      }
      
      return themeName;
    }

    /**
     * 应用主题
     * @param {string} themeName - 主题名称
     * @param {boolean} force - 是否强制应用（跳过相同主题检查）
     */
    applyTheme(themeName, force = false) {
      // 验证主题名称
      const validThemeName = this.validateTheme(themeName) || 'default';

      if (!force && validThemeName === this.currentTheme) {
        return; // 主题未变化且不强制应用，无需重新应用
      }

      try {
        // 检查document.body是否存在，如果不存在，延迟应用主题
        if (!document.body) {
          console.warn('document.body不存在，延迟应用主题');
          // 当DOM准备好后再应用主题
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              this.applyTheme(validThemeName, true); // 延迟应用时也要强制
            });
          } else {
            // 如果DOM已经准备好，但body还不存在，使用setTimeout延迟
            setTimeout(() => {
              this.applyTheme(validThemeName, true); // 延迟应用时也要强制
            }, 100);
          }
          return;
        }

        // 移除所有主题类名
        this.themeClassNames.forEach(className => {
          document.body.classList.remove(className);
        });
        
        // 明确移除深色主题类名，确保使用浅色主题
        document.body.classList.remove('theme-dark');
        
        // 应用当前主题
        const theme = this.themes[validThemeName];
        if (theme.id === 'dark') {
          // 只有在选择深色主题时才添加深色主题类名
          document.body.classList.add('theme-dark');
          console.log('应用深色主题类名: theme-dark');
        } else {
          // 使用默认浅色主题，不添加任何主题类名
          console.log('使用浅色主题，移除所有主题类名');
        }

        // 更新当前主题
        this.currentTheme = validThemeName;

        // 调试：打印应用的主题
        console.log('当前主题更新为:', this.currentTheme);

        // 触发主题变化事件
        this._dispatchThemeChangeEvent();
      } catch (error) {
        console.error('应用主题失败:', error);
      }
    }

    /**
     * 触发主题变化事件
     * @private
     */
    _dispatchThemeChangeEvent() {
      const event = new CustomEvent('themeChanged', {
        detail: {
          themeName: this.currentTheme,
          theme: this.themes[this.currentTheme]
        }
      });
      document.dispatchEvent(event);
    }

    /**
     * 保存主题设置
     * @param {string} themeName - 主题名称
     */
    async saveTheme(themeName) {
      try {
        const validThemeName = this.validateTheme(themeName) || 'default';
        
        const result = await chrome.storage.local.get(['userSettings']);
        const settings = result.userSettings || {};
        
        settings.uiElementTheme = validThemeName;
        
        await chrome.storage.local.set({ userSettings: settings });
        
        // 应用新主题
        this.applyTheme(validThemeName);
        
        return true;
      } catch (error) {
        console.error('保存主题失败:', error);
        return false;
      }
    }

    /**
     * 获取当前主题
     * @returns {string} 当前主题名称
     */
    getCurrentTheme() {
      return this.currentTheme;
    }
    
    /**
     * 获取所有可用主题
     * @returns {Object} 所有主题的对象
     */
    getAllThemes() {
      return { ...this.themes };
    }
  }

  // 创建主题管理器实例并挂载到window对象上
  window.themeManager = new ThemeManager();
})(window);