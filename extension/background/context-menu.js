// A native selection menu remains available even when a page handles right-clicks.
const TRANSLATION_MENU_ID = 'translation-assistant-selection';

function registerTranslationContextMenu() {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.warn('Unable to reset translation menu:', chrome.runtime.lastError.message);
      return;
    }
    chrome.contextMenus.create({
      id: TRANSLATION_MENU_ID,
      title: '单词翻译助手：翻译所选文字',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*', 'file:///*']
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Unable to create translation menu:', chrome.runtime.lastError.message);
      }
    });
  });
}

chrome.runtime.onStartup.addListener(registerTranslationContextMenu);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== TRANSLATION_MENU_ID || !info.selectionText?.trim() || tab?.id == null) return;
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'TRANSLATE_SELECTION',
      text: info.selectionText
    }, { frameId: info.frameId ?? 0 });
    if (!response?.ok) throw new Error('Content script not ready');
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: '单词翻译助手' });
  } catch (error) {
    console.warn('Translation menu could not reach the page:', error.message);
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: '翻译助手未连接到网页：请刷新网页后重试，并检查插件的网站访问权限。'
    });
  }
});
