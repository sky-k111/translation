const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const service = fs.readFileSync(path.join(root, 'extension/services/ai-translate-service.js'), 'utf8');

function setup(content, inspect = () => {}) {
  const context = vm.createContext({
    self: {}, console: { error() {} },
    chrome: { storage: { local: { async get() { return { aiSettings: {
      enabled: true, apiKey: 'test-credential', provider: 'deepseek', model: 'test-model', apiUrl: 'https://example.test'
    } }; } } } },
    async fetch(_, request) {
      inspect(JSON.parse(request.body));
      return { ok: true, async json() { return { choices: [{ message: { content } }] }; } };
    }
  });
  vm.runInContext(service, context);
  return context;
}

test('word and phrase translations return IPA without requesting rich details', async () => {
  for (const text of ['take', 'take on']) {
    const context = setup(JSON.stringify({ translation: '承担', phonetic: '/teɪk ɒn/', partOfSpeech: 'phrasal verb' }), body => {
      assert.equal(body.response_format.type, 'json_object');
      assert.equal(body.thinking.type, 'disabled');
      assert.match(body.messages[0].content, /原文的国际音标/);
    });
    const result = await context.translateWithAI(text, '');
    assert.equal(result.phonetic, '/teɪk ɒn/');
    assert.equal(result.translation, '承担');
    assert.equal(result.partOfSpeech, 'phrasal verb');
  }
});

test('sentences and Chinese keep their original automatic plain translation flow', async () => {
  for (const text of ['This is a sentence.', '我正在准备六级考试。']) {
    const context = setup('译文', body => assert.equal(body.response_format, undefined));
    assert.equal((await context.translateWithAI(text, '')).translation, '译文');
  }
});

test('malformed structured replies are rejected instead of displaying JSON as a translation', async () => {
  const context = setup('{malformed');
  await assert.rejects(context.translateWithAI('take', ''), /格式不正确/);
});

test('background preserves IPA when converting the AI result into a translation response', async () => {
  const background = fs.readFileSync(path.join(root, 'extension/background/background.js'), 'utf8').replace(/\r\n/g, '\n');
  const start = background.indexOf('async function smartTranslate(');
  const end = background.indexOf('/**\n * 处理翻译结果', start);
  const context = vm.createContext({
    console: { log() {} },
    self: { async translateWithAI() { return { translation: '拿', phonetic: '/teɪk/', partOfSpeech: 'verb' }; } },
    setTimeout() { return 0; }
  });
  vm.runInContext(background.slice(start, end), context);
  const result = await context.smartTranslate('take', '', false, false);
  assert.equal(result.phonetic, '/teɪk/');
  assert.equal(result.partOfSpeech, 'verb');
});
