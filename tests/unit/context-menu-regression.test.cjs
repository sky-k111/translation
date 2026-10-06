const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const code = fs.readFileSync(path.join(root, 'extension/background/context-menu.js'), 'utf8');

function setup(sendMessage) {
  let click, startup;
  const created = [], badges = [], titles = [];
  const context = vm.createContext({
    console: { warn() {} },
    chrome: {
      runtime: { onStartup: { addListener(handler) { startup = handler; } } },
      contextMenus: {
        removeAll(callback) { created.length = 0; callback(); },
        create(menu, callback) { created.push(menu); callback(); },
        onClicked: { addListener(handler) { click = handler; } }
      },
      tabs: { sendMessage },
      action: {
        async setBadgeText(value) { badges.push(value); },
        async setTitle(value) { titles.push(value); }
      }
    }
  });
  vm.runInContext(code, context);
  return { click, startup, created, badges, titles };
}

test('creates a native selection-only translation item without duplicates', () => {
  const state = setup(async () => ({ ok: true }));
  state.startup();
  state.startup();
  assert.equal(state.created.length, 1);
  assert.match(state.created[0].title, /翻译所选文字/);
  assert.equal(state.created[0].contexts[0], 'selection');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  assert.ok(manifest.permissions.includes('contextMenus'));
  assert.equal(manifest.content_scripts[0].all_frames, true);
});

test('routes selected text to its frame and clears a previous failure badge', async () => {
  const calls = [];
  const state = setup(async (...args) => { calls.push(args); return { ok: true }; });
  await state.click({ menuItemId: 'translation-assistant-selection', selectionText: 'Bonjour', frameId: 7 }, { id: 42 });
  assert.equal(calls[0][0], 42);
  assert.equal(calls[0][1].text, 'Bonjour');
  assert.equal(calls[0][1].type, 'TRANSLATE_SELECTION');
  assert.equal(calls[0][2].frameId, 7);
  assert.equal(state.badges[0].text, '');
  await state.click({ menuItemId: 'another-extension' }, { id: 42 });
  assert.equal(calls.length, 1);
});

test('missing page script gives a visible refresh instruction instead of an unhandled error', async () => {
  const state = setup(async () => { throw new Error('Receiving end does not exist'); });
  await state.click({ menuItemId: 'translation-assistant-selection', selectionText: 'Hello' }, { id: 42 });
  assert.equal(state.badges[0].text, '!');
  assert.match(state.titles[0].title, /刷新网页/);
});
