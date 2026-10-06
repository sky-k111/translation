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

async function ensureTranslationPage(tabId, frameId) {
  const manifest = chrome.runtime.getManifest();
  const ping = () => chrome.tabs.sendMessage(tabId, { type: 'PING_TRANSLATION' }, { frameId });
  try {
    const status = await ping();
    if (status?.ready && status.version === manifest.version) return;
  } catch { /* An already-open page may not have a live content script after an extension update. */ }
  const target = { tabId, frameIds: [frameId] };
  const scripts = manifest.content_scripts[0];
  await chrome.scripting.insertCSS({ target, files: scripts.css });
  await chrome.scripting.executeScript({ target, files: scripts.js });
  const status = await ping();
  if (!status?.ready || status.version !== manifest.version) {
    throw new Error('网页翻译脚本未成功加载，请刷新网页后重试');
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== TRANSLATION_MENU_ID || !info.selectionText?.trim() || tab?.id == null) return;
  try {
    const frameId = info.frameId ?? 0;
    await ensureTranslationPage(tab.id, frameId);
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'TRANSLATE_SELECTION',
      text: info.selectionText
    }, { frameId });
    if (!response?.ok) throw new Error(response?.error || '网页未完成翻译，请刷新后重试');
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: '单词翻译助手' });
  } catch (error) {
    console.warn('Translation menu could not reach the page:', error.message);
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: '翻译失败：' + error.message + '。请刷新网页，并检查插件的网站访问权限。'
    });
  }
});
