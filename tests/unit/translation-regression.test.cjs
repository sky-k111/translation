const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'extension/content/content.js'), 'utf8').replace(/\r\n/g, '\n');
const bundle = fs.readFileSync(path.join(root, 'extension/content/content-bundle.js'), 'utf8').replace(/\r\n/g, '\n');
const managerCode = source.slice(source.indexOf('class RequestManager {'), source.indexOf('// 全局请求管理器实例'));
const translateCode = source.slice(source.indexOf('async function translateText('), source.indexOf('/**\n * 批量翻译文本'));
const executeCode = source.slice(source.indexOf('async function executeTranslation()'), source.indexOf('// 监听鼠标抬起事件'));

function setup(sendMessage) {
  const cache = new Map();
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout,
    chrome: { runtime: { sendMessage } }, translationCache: cache,
    CACHE_CONFIG: { DEFAULT_EXPIRY: 60000 },
    safePerformanceMonitor: { start() {}, end() {} }
  });
  vm.runInContext(managerCode + '\nconst requestManager = new RequestManager();\n' + translateCode, context);
  return { context, cache, manager: vm.runInContext('requestManager', context) };
}

test('source and loaded bundle contain the same translation flow', () => {
  assert.ok(bundle.includes(managerCode));
  assert.ok(bundle.includes(translateCode));
  assert.ok(bundle.includes(executeCode));
});

test('AI response arriving after 1.5 seconds is retained and duplicate requests are merged', async () => {
  let requests = 0;
  const { context } = setup(async () => {
    requests++;
    await new Promise(resolve => setTimeout(resolve, 1600));
    return { ok: true, result: { translation: '我们的接口现在支持论文搜索。' } };
  });
  const results = await Promise.all([
    vm.runInContext("translateText('Our API now includes paper search')", context),
    vm.runInContext("translateText('Our API now includes paper search')", context)
  ]);
  assert.equal(requests, 1);
  assert.equal(results[0].translation, '我们的接口现在支持论文搜索。');
});

test('failed requests preserve the error and never cache the original as a translation', async () => {
  const { context, cache } = setup(async () => ({ ok: false, error: 'AI Key 未配置' }));
  await assert.rejects(vm.runInContext("translateText('Hello')", context), /AI Key 未配置/);
  assert.equal(cache.size, 0);
});

test('old original-text cache is ignored and unchanged English responses are rejected', async () => {
  let requests = 0;
  const { context, cache } = setup(async () => {
    requests++;
    return { ok: true, result: { translation: 'Hello' } };
  });
  cache.set('hello', { translation: 'Hello', timestamp: Date.now() });
  await assert.rejects(vm.runInContext("translateText('Hello')", context), /未返回有效译文/);
  assert.equal(requests, 1);
  assert.equal(cache.size, 1);
});

test('Chinese translation uses a fresh direction cache and rejects unchanged Chinese', async () => {
  let requests = 0;
  const { context, cache } = setup(async () => {
    requests++;
    return { ok: true, result: { translation: 'I am preparing for the CET-6 exam.' } };
  });
  cache.set('auto:zh-CN:我正在准备六级考试:', {
    translation: '我正在准备六级考试', timestamp: Date.now()
  });
  const translated = await vm.runInContext("translateText('我正在准备六级考试')", context);
  assert.equal(translated.translation, 'I am preparing for the CET-6 exam.');
  await vm.runInContext("translateText('我正在准备六级考试')", context);
  assert.equal(requests, 1);

  context.chrome.runtime.sendMessage = async () => ({ ok: true, result: { translation: '你好' } });
  await assert.rejects(vm.runInContext("translateText('你好')", context), /未返回有效译文/);
});

test('selection invokes AI and saves only a successful translation', async () => {
  const saved = [];
  const shown = [];
  const { context } = setup(async message => {
    assert.equal(message.skipAI, false);
    return { ok: true, result: { translation: '我们的接口现在支持论文搜索。' } };
  });
  const range = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 }) };
  Object.assign(context, {
    window: { getSelection: () => ({ toString: () => 'Our API now includes paper search', getRangeAt: () => range, removeAllRanges() {} }) },
    isDomainAllowed: () => true, isExtensionContextValid: () => true,
    showLoadingIndicator() {}, hideLoadingIndicator() {}, getContextFromRange: () => '',
    isWordOrPhrase: () => false, selectedText: '', selectedRange: null,
    saveTranslation: async (...args) => saved.push(args),
    showTranslationPopup: async (...args) => shown.push(args),
    renderPopup: async args => shown.push(args)
  });
  context.chrome.storage = { local: { get: async () => ({ translatedWords: {} }) } };
  vm.runInContext(executeCode, context);
  await vm.runInContext('executeTranslation()', context);
  assert.equal(saved.length, 1);
  assert.equal(saved[0][1], '我们的接口现在支持论文搜索。');
  assert.equal(shown[0][1], saved[0][1]);

  context.chrome.runtime.sendMessage = async () => ({ ok: false, error: '网络请求失败' });
  context.translationCache.clear();
  await vm.runInContext('executeTranslation()', context);
  assert.equal(saved.length, 1);
  assert.match(shown[1].translation, /网络请求失败/);
});
