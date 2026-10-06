const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const code = fs.readFileSync(path.join(root, 'extension/content/vocabulary-details.js'), 'utf8');
const serviceCode = fs.readFileSync(path.join(root, 'extension/services/ai-translate-service.js'), 'utf8');
const fixture = {
  kind: 'word', translation: '拿', senses: [
    { label: '动词', partOfSpeech: 'verb', definitions: [{ meaning: '拿', example: 'Take it.', exampleTranslation: '拿着它。' }, { meaning: '需要（时间）' }] },
    { label: '名词', partOfSpeech: 'noun', definitions: [{ meaning: '看法' }] }
  ], relatedPhrases: [{ phrase: 'take in', meaning: '理解；欺骗' }], notes: []
};

function setup(sendMessage, initial = {}) {
  const storage = { ...initial };
  const context = vm.createContext({
    window: {}, console: { warn() {} }, setTimeout, clearTimeout,
    chrome: {
      runtime: { sendMessage },
      storage: { local: {
        async get(keys) { return Object.fromEntries(keys.map(key => [key, storage[key]])); },
        async set(data) { Object.assign(storage, data); }
      } }
    }
  });
  vm.runInContext(code, context);
  return { api: context.window.TranslationVocabulary, storage };
}

test('offers expansion for words and phrases but excludes long sentences', () => {
  const { api } = setup(async () => {});
  for (const value of ['take', 'take on', 'take in', 'take two', 'well-known', 'don’t', '研究']) assert.equal(api.isCandidate(value), true);
  for (const value of ['', 'This is a complete sentence.', 'one two three four five six seven']) assert.equal(api.isCandidate(value), false);
});

test('fetches only on demand, merges repeated requests, and reuses persistent details', async () => {
  let calls = 0;
  const state = setup(async message => {
    calls++;
    assert.equal(message.type, 'VOCABULARY_DETAILS');
    await new Promise(resolve => setTimeout(resolve, 20));
    return { ok: true, result: fixture };
  });
  assert.equal(calls, 0);
  const [first, second] = await Promise.all([state.api.load('take', ''), state.api.load('take', '')]);
  assert.equal(first.senses.length, 2);
  assert.equal(first, second);
  assert.equal(calls, 1);
  const nextPage = setup(async () => { throw new Error('Should use cache'); }, state.storage);
  assert.equal((await nextPage.api.load('take')).senses[1].label, '名词');
  await state.api.load('take', 'It takes time.');
  assert.equal(calls, 2);
});

test('failures are retryable and never saved as successful details', async () => {
  let calls = 0;
  const { api, storage } = setup(async () => ++calls === 1 ? { ok: false, error: '余额不足' } : { ok: true, result: fixture });
  await assert.rejects(api.load('take in'), /余额不足/);
  assert.equal(storage.vocabularyDetailsCacheV1, undefined);
  assert.equal((await api.load('take in')).senses.length, 2);
  assert.equal(calls, 2);
});

test('AI details preserve all supplied POS groups and reject malformed results', () => {
  const context = vm.createContext({ self: {} });
  vm.runInContext(serviceCode, context);
  const result = context.normalizeVocabularyDetails(fixture);
  assert.equal(result.senses.length, 2);
  assert.equal(result.senses[0].definitions.length, 2);
  assert.equal(result.relatedPhrases[0].phrase, 'take in');
  assert.throws(() => context.normalizeVocabularyDetails({ senses: [{ definitions: ['not structured'] }] }), /有效/);
  assert.throws(() => context.normalizeVocabularyDetails(null), /有效/);
});

test('manifest loads the details module before popup code and includes its stylesheet', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  assert.ok(manifest.content_scripts[0].js.indexOf('extension/content/vocabulary-details.js') <
    manifest.content_scripts[0].js.indexOf('extension/content/content-bundle.js'));
  assert.ok(manifest.content_scripts[0].css.includes('extension/content/vocabulary-details.css'));
});

test('background forwards details and reports provider failures to the popup', async () => {
  const background = fs.readFileSync(path.join(root, 'extension/background/background.js'), 'utf8').replace(/\r\n/g, '\n');
  const start = background.indexOf("  if (msg?.type === 'VOCABULARY_DETAILS'");
  const end = background.indexOf("  if (msg && msg.type === 'AI_ANALYZE'", start);
  const context = vm.createContext({ self: { async detailedTranslate(text, context) {
    assert.equal(text, 'take on');
    assert.equal(context, 'context');
    return fixture;
  } } });
  vm.runInContext('function handler(msg, sendResponse) {\n' + background.slice(start, end) + '\n}', context);
  const response = await new Promise(resolve => {
    assert.equal(context.handler({ type: 'VOCABULARY_DETAILS', text: ' take on ', context: 'context' }, resolve), true);
  });
  assert.equal(response.ok, true);
  assert.equal(response.result.senses.length, 2);
  context.self.detailedTranslate = async () => { throw new Error('AI 服务不可用'); };
  const failure = await new Promise(resolve => context.handler({ type: 'VOCABULARY_DETAILS', text: 'take on' }, resolve));
  assert.equal(failure.ok, false);
  assert.match(failure.error, /AI 服务不可用/);
});
