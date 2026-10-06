(() => {
  const memory = new Map();
  const pending = new Map();
  const CACHE_NAME = 'vocabularyDetailsCacheV1';
  const TTL = 7 * 24 * 60 * 60 * 1000;
  const LIMIT = 50;
  let panelId = 0;

  function isCandidate(text) {
    const value = text.trim();
    return value.length > 0 && value.length <= 80 && value.split(/\s+/).length <= 6 &&
      /^[\p{L}\p{N}\s'’\-]+$/u.test(value);
  }

  async function load(text, context = '') {
    const key = JSON.stringify([text.trim().toLowerCase(), context.trim()]);
    const valid = entry => entry?.version === 1 && Date.now() - entry.timestamp < TTL && entry.data?.senses?.length;
    if (valid(memory.get(key))) return memory.get(key).data;
    if (pending.has(key)) return pending.get(key);
    const request = (async () => {
      let stored = {};
      try {
        stored = (await chrome.storage.local.get([CACHE_NAME]))[CACHE_NAME] || {};
        if (valid(stored[key])) {
          memory.set(key, stored[key]);
          return stored[key].data;
        }
      } catch (error) { console.warn('Unable to read vocabulary cache:', error.message); }
      let timer;
      let response;
      try {
        response = await Promise.race([
          chrome.runtime.sendMessage({ type: 'VOCABULARY_DETAILS', text, context }),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('详解加载超时，请重试')), 45000); })
        ]);
      } finally { clearTimeout(timer); }
      if (!response?.ok || !response.result?.senses?.length) {
        throw new Error(response?.error || '没有获得有效详解，请检查 AI 设置后重试');
      }
      const entry = { version: 1, timestamp: Date.now(), data: response.result };
      memory.set(key, entry);
      if (memory.size > LIMIT) memory.delete(memory.keys().next().value);
      try {
        // Re-read after the request to preserve other details fetched meanwhile.
        stored = (await chrome.storage.local.get([CACHE_NAME]))[CACHE_NAME] || {};
        stored[key] = entry;
        const trimmed = Object.fromEntries(Object.entries(stored).filter(([, value]) => valid(value))
          .sort((a, b) => b[1].timestamp - a[1].timestamp).slice(0, LIMIT));
        await chrome.storage.local.set({ [CACHE_NAME]: trimmed });
      } catch (error) { console.warn('Unable to save vocabulary cache:', error.message); }
      return response.result;
    })();
    pending.set(key, request);
    try { return await request; }
    finally { pending.delete(key); }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function render(panel, data) {
    panel.replaceChildren();
    panel.removeAttribute('role');
    panel.append(element('p', 'vocabulary-source', 'AI 学习详解 · 常见词性与义项'));
    if (data.phonetic) panel.append(element('p', 'vocabulary-phonetic', data.phonetic));
    if (data.contextNote) panel.append(element('p', 'vocabulary-context', '当前语境：' + data.contextNote));
    const example = (parent, item) => {
      if (item.example) parent.append(element('p', 'vocabulary-example', item.example));
      if (item.exampleTranslation) parent.append(element('p', 'vocabulary-example-translation', item.exampleTranslation));
    };
    for (const group of data.senses) {
      const section = element('section', 'vocabulary-group');
      const label = group.label || group.partOfSpeech || '释义';
      const title = group.partOfSpeech && !label.toLowerCase().includes(group.partOfSpeech.toLowerCase())
        ? label + ' · ' + group.partOfSpeech : label;
      section.append(element('h3', 'vocabulary-pos', title));
      const list = element('ol', 'vocabulary-senses');
      for (const item of group.definitions) {
        const row = element('li', 'vocabulary-sense');
        row.append(element('p', 'vocabulary-meaning', item.meaning));
        if (item.usage) row.append(element('p', 'vocabulary-usage', '用法：' + item.usage));
        example(row, item);
        list.append(row);
      }
      section.append(list);
      panel.append(section);
    }
    if (data.relatedPhrases?.length) {
      const section = element('section', 'vocabulary-group');
      section.append(element('h3', 'vocabulary-pos', '相关词组与搭配'));
      for (const item of data.relatedPhrases) {
        const row = element('div', 'vocabulary-phrase');
        row.append(element('p', 'vocabulary-phrase-name', item.phrase));
        row.append(element('p', 'vocabulary-meaning', item.meaning));
        example(row, item);
        section.append(row);
      }
      panel.append(section);
    }
    for (const note of data.notes || []) panel.append(element('p', 'vocabulary-note', '提示：' + note));
  }

  function bind(popup, params, reposition) {
    const button = popup.querySelector('.tooltip-vocabulary-btn');
    const panel = popup.querySelector('.tooltip-vocabulary-panel');
    if (!button || !panel) return;
    panel.id = 'translation-vocabulary-panel-' + (++panelId);
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-expanded', 'false');
    let details = null;
    button.addEventListener('click', async event => {
      event.stopPropagation();
      if (button.disabled) return;
      if (!panel.hidden) {
        panel.hidden = true;
        popup._vocabularyExpanded = false;
        popup.classList.remove('vocabulary-expanded');
        popup.scrollTop = 0;
        button.textContent = '展开详解';
        button.setAttribute('aria-expanded', 'false');
        reposition();
        return;
      }
      panel.hidden = false;
      popup._vocabularyExpanded = true;
      popup.classList.add('vocabulary-expanded');
      button.setAttribute('aria-expanded', 'true');
      if (details) {
        render(panel, details);
        button.textContent = '收起详解';
        reposition();
        return;
      }
      button.disabled = true;
      button.textContent = '正在加载详解…';
      panel.setAttribute('role', 'status');
      panel.textContent = '正在整理词性、不同意思和例句…';
      reposition();
      try {
        details = await load(params.text, params.context || '');
        if (!popup.isConnected) return;
        render(panel, details);
        button.textContent = '收起详解';
      } catch (error) {
        if (!popup.isConnected) return;
        panel.setAttribute('role', 'alert');
        panel.textContent = '详解加载失败：' + error.message;
        button.textContent = '重试详解';
        // The next click retries without discarding the main translation.
        panel.hidden = true;
        popup._vocabularyExpanded = false;
        button.setAttribute('aria-expanded', 'false');
        popup.classList.remove('vocabulary-expanded');
        const status = element('p', 'vocabulary-error', panel.textContent);
        const previous = popup.querySelector('.vocabulary-error');
        if (previous) previous.remove();
        status.setAttribute('role', 'alert');
        button.parentElement.append(status);
      } finally {
        button.disabled = false;
        const status = popup.querySelector('.vocabulary-error');
        if (details && status) status.remove();
        if (popup.isConnected) reposition();
      }
    });
  }

  window.TranslationVocabulary = { isCandidate, load, render, bind };
})();
