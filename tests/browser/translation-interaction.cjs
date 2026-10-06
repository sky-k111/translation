const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..') + path.sep;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.TRANSLATION_TEST_BROWSER || chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<html><body><h1>Full plugin integration</h1><p id="selection">Our API now includes paper search, better documentation</p></body></html>');
    await page.evaluate(() => {
      window.handlers = [];
      window.store = { translatedWords: {} };
      const get = (keys, callback) => {
        const data = Array.isArray(keys) ? Object.fromEntries(keys.map(key => [key, window.store[key]])) : window.store;
        if (callback) callback(data);
        return Promise.resolve(data);
      };
      window.chrome = {
        runtime: {
          id: 'test-extension', getURL: path => 'https://example.test/' + path,
          onMessage: { addListener(handler) { window.handlers.push(handler); } },
          async sendMessage(message) {
            if (message.type === 'SMART_TRANSLATE') return { ok: true, result: { translation: message.text === 'take on' ? '承担；雇用' : '我们的接口现已支持论文搜索，文档也更完善了。' } };
            if (message.type === 'VOCABULARY_DETAILS') return { ok: true, result: {
              kind: 'phrase', senses: [{ label: '短语动词', partOfSpeech: 'phrasal verb', definitions: [
                { meaning: '承担', example: 'Take on a challenge.', exampleTranslation: '接受挑战。' },
                { meaning: '雇用', example: 'Take on new staff.', exampleTranslation: '雇用新员工。' }
              ] }], relatedPhrases: [], notes: []
            } };
            return { ok: false, error: 'Test provider unavailable' };
          }
        },
        storage: {
          onChanged: { addListener() {} },
          local: { get, set(data, callback) { Object.assign(window.store, data); if (callback) callback(); return Promise.resolve(); }, remove() { return Promise.resolve(); }, getBytesInUse(_, callback) { callback(0); } }
        }
      };
      window.fetch = async () => ({ ok: true, json: async () => [], text: async () => '', status: 200 });
    });
    await page.route('https://example.test/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    const manifest = JSON.parse(fs.readFileSync(root + 'manifest.json'));
    let click;
    let injections = 0;
    const badges = [];
    const sendToPage = (_, message) => page.evaluate(message => new Promise((resolve, reject) => {
      let answered = false, pending = false;
      for (const handler of window.handlers) {
        if (handler(message, { id: 'test-extension' }, response => { answered = true; resolve(response); })) pending = true;
      }
      if (!answered && !pending) reject(new Error('Receiving end does not exist'));
    }), message);
    const context = vm.createContext({
      console: { warn() {} },
      chrome: {
        runtime: { getManifest: () => manifest, onStartup: { addListener() {} } },
        contextMenus: { onClicked: { addListener(handler) { click = handler; } } },
        tabs: { sendMessage: sendToPage },
        scripting: {
          async insertCSS({ files }) { for (const file of files) await page.addStyleTag({ content: fs.readFileSync(root + file, 'utf8') }); },
          async executeScript({ files }) {
            injections++;
            for (const file of files) await page.addScriptTag({ content: fs.readFileSync(root + file, 'utf8') });
          }
        },
        action: { async setBadgeText(value) { badges.push(value); }, async setTitle() {} }
      }
    });
    vm.runInContext(fs.readFileSync(root + 'extension/background/context-menu.js', 'utf8'), context);
    await page.evaluate(() => {
      const range = document.createRange(); range.selectNodeContents(document.getElementById('selection'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    });
    await click({ menuItemId: 'translation-assistant-selection', selectionText: 'Our API now includes paper search, better documentation', frameId: 0 }, { id: 1 });
    await page.waitForSelector('.click-tooltip');
    await page.waitForTimeout(300);
    console.log(JSON.stringify({ popup: await page.locator('.tooltip-translation').textContent(), injections, errors }));
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(injections, 1);
    assert.equal(badges[0].text, '');
    const listeners = await page.evaluate(() => window.handlers.length);
    for (const file of manifest.content_scripts[0].js) await page.addScriptTag({ content: fs.readFileSync(root + file, 'utf8') });
    assert.equal(await page.evaluate(() => window.handlers.length), listeners);
    assert.equal(errors.length, 0, errors.join('\n'));
    await page.evaluate(() => {
      const selection = window.getSelection(); selection.removeAllRanges();
      const range = document.createRange(); range.selectNodeContents(document.getElementById('selection')); selection.addRange(range);
    });
    await page.keyboard.press('Escape');
    await click({ menuItemId: 'translation-assistant-selection', selectionText: 'Our API now includes paper search, better documentation', frameId: 0 }, { id: 1 });
    assert.equal(injections, 1);
    assert.equal(await page.locator('.click-tooltip').count(), 1);
    await click({ menuItemId: 'translation-assistant-selection', selectionText: 'take on', frameId: 0 }, { id: 1 });
    const beforeHover = await page.locator('.click-tooltip').boundingBox();
    await page.locator('.click-tooltip').hover();
    await page.waitForTimeout(500);
    const afterHover = await page.locator('.click-tooltip').boundingBox();
    assert.deepEqual(afterHover, beforeHover, 'Popup must remain still over time and on hover');
    await page.locator('.tooltip-vocabulary-btn').click();
    await page.waitForFunction(() => document.querySelector('.tooltip-vocabulary-btn').textContent === '收起详解');
    assert.equal(await page.locator('.vocabulary-sense').count(), 2);
    assert.equal(await page.locator('.click-tooltip').count(), 1);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: native menu recovers unloaded page, renders translation, tolerates reinjection, and works after selection disappears');
    console.log('PASS: recovered page also expands phrase details using the complete script bundle');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
