/**
 * 设置管理器
 * 负责设置的加载、保存和管理
 */

/**
 * 加载设置
 */
window.loadSettings = function() {
  chrome.storage.local.get(['userSettings', 'aiSettings']).then(result => {
    const settings = result.userSettings || {};
    const ai = result.aiSettings || {};
    
    const backgroundTheme = settings.backgroundTheme || 'default';
    document.getElementById('backgroundTheme').value = backgroundTheme;
    
    const highlightTheme = settings.highlightTheme || 'default';
    document.getElementById('highlightTheme').value = highlightTheme;
    
    const translationAPI = settings.translationAPI || 'youdao';
    document.getElementById('translationAPI').value = translationAPI;
    
    const uiElementTheme = settings.uiElementTheme || 'default';
    document.getElementById('uiElementTheme').value = uiElementTheme;
    
    const dailyGoal = settings.dailyGoal || 20;
    document.getElementById('dailyGoal').value = dailyGoal;
    
    const learningMode = settings.learningMode || 'normal';
    document.getElementById('learningMode').value = learningMode;

    const youdaoKeyInput = document.getElementById('apiKey');
    const youdaoSecretInput = document.getElementById('apiSecret');
    if (youdaoKeyInput) youdaoKeyInput.value = settings.apiKey || '';
    if (youdaoSecretInput) youdaoSecretInput.value = settings.apiSecret || '';

    // 加载 AI 设置
    const aiProvider = ai.provider || 'openai';
    const aiProviderSelect = document.getElementById('aiProvider');
    if (aiProviderSelect) {
      aiProviderSelect.value = aiProvider;
    }
    
    const aiKeyInput = document.getElementById('aiApiKey');
    if (aiKeyInput) aiKeyInput.value = ai.apiKey || '';

    const aiModelInput = document.getElementById('aiModel');
    if (aiModelInput) {
      aiModelInput.value = ai.model || window.AI_CONFIGS[aiProvider]?.model || '';
    }

    const aiApiUrlInput = document.getElementById('aiApiUrl');
    if (aiApiUrlInput) {
      aiApiUrlInput.value = ai.apiUrl || window.AI_CONFIGS[aiProvider]?.apiUrl || '';
    }

    // 设置 API URL 显示状态
    const aiApiUrlContainer = document.getElementById('aiApiUrlContainer');
    if (aiApiUrlContainer) {
      aiApiUrlContainer.style.display = (aiProvider === 'custom') ? 'block' : 'none';
    }
  });
};

/**
 * 保存设置
 */
window.saveSettings = async function() {
  const backgroundTheme = document.getElementById('backgroundTheme').value;
  const highlightTheme = document.getElementById('highlightTheme').value;
  const translationAPI = document.getElementById('translationAPI').value;
  const uiElementTheme = document.getElementById('uiElementTheme').value;
  const dailyGoal = parseInt(document.getElementById('dailyGoal').value) || 20;
  const learningMode = document.getElementById('learningMode').value;
  const apiKey = document.getElementById('apiKey').value || '';
  const apiSecret = document.getElementById('apiSecret').value || '';
  
  // 获取 AI 设置
  const aiProvider = document.getElementById('aiProvider').value;
  const aiApiKey = document.getElementById('aiApiKey').value || '';
  const aiModel = document.getElementById('aiModel').value || '';
  const aiApiUrl = document.getElementById('aiApiUrl').value || '';

  const settings = {
    backgroundTheme,
    highlightTheme,
    translationAPI,
    uiElementTheme,
    dailyGoal,
    learningMode,
    apiKey,
    apiSecret
  };
  
  await chrome.storage.local.set({ userSettings: settings });
  
  // 保存完整的 AI 设置
  const aiSettings = {
    enabled: true,
    provider: aiProvider,
    apiKey: aiApiKey,
    model: aiModel,
    apiUrl: aiApiUrl
  };
  await chrome.storage.local.set({ aiSettings });
  
  await window.themeManager.saveTheme(uiElementTheme);
  window.themeManager.applyTheme(uiElementTheme);
  
  if (window.dynamicBackgroundManager) {
    await window.dynamicBackgroundManager.saveTheme(backgroundTheme);
    window.dynamicBackgroundManager.setTheme(backgroundTheme);
  }
  
  alert('设置已保存');
  
  showPage('home');
};
