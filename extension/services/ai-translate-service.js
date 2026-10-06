/**
 * 单词翻译助手 - AI翻译服务模块
 * 负责处理AI翻译相关功能
 */

// AI翻译配置已经在api-config.js中定义

/**
 * 获取AI翻译配置
 * @returns {Object} AI翻译配置
 */
async function getAISettings() {
  const result = await chrome.storage.local.get(['aiSettings']);
  return { ...self.AI_DEFAULTS, ...(result.aiSettings || {}) };
}

/**
 * 调用 AI API 进行翻译
 * @param {string} text - 待翻译文本
 * @param {string} context - 上下文（可选）
 * @returns {Promise<Object>} 翻译结果
 */
async function translateWithAI(text, context) {
  const settings = await getAISettings();
  
  if (!settings.enabled || !settings.apiKey) {
    throw new Error('AI translation not configured');
  }

  const systemPrompt = `你是一个专业的翻译引擎。请将用户提供的文本翻译成简体中文。
要求：
1. 仅返回翻译结果，不要包含任何解释、拼音或额外说明。
2. 准确理解上下文中的专业术语和俚语。
3. 保持原文的语气和风格。`;

  const userContent = context 
    ? `语境："...${context}..."

需翻译文本："${text}"`
    : `需翻译文本："${text}"`;

  try {
    const response = await fetch(settings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: settings.temperature
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content?.trim();
    
    if (!translation) {
      throw new Error('Empty response from AI');
    }

    return {
      translation,
      aiProvider: settings.provider,
      model: settings.model
    };
  } catch (error) {
    console.error('AI Translation failed:', error);
    throw error;
  }
}

/**
 * 详细翻译 - 获取更丰富的翻译内容
 * @param {string} text - 待翻译文本
 * @param {string} context - 上下文
 * @returns {Promise<Object>} 详细翻译结果
 */
async function detailedTranslate(text, context) {
  const settings = await getAISettings();

  if (!settings.enabled || !settings.apiKey) {
    throw new Error('AI translation not configured');
  }

  const systemPrompt = `你是一个专业的翻译专家。请提供详细的翻译信息，包括：
1. 准确的中文翻译
2. 词性（如果适用）
3. 详细释义（多个意思时分别列出）
4. 例句（如果有上下文）
5. 相关同义词或反义词（如果适用）

请返回纯 JSON 格式：
{
  "translation": "主要翻译",
  "partOfSpeech": "词性",
  "definitions": ["释义1", "释义2"],
  "examples": ["例句1", "例句2"],
  "synonyms": ["同义词1", "同义词2"],
  "antonyms": ["反义词1", "反义词2"]
}`;

  const userContent = context
    ? `语境："...${context}..."

需详细翻译文本："${text}"`
    : `需详细翻译文本："${text}"`;

  try {
    const response = await fetch(settings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn('AI detailed translation parse failed:', e);
      // 回退到简单翻译
      return {
        translation: content || '翻译失败',
        partOfSpeech: '',
        definitions: [],
        examples: [],
        synonyms: [],
        antonyms: []
      };
    }
  } catch (error) {
    console.error('Detailed translation failed:', error);
    throw error;
  }
}

/**
 * AI 辅助分析
 * 用于获取词性、详细释义和上下文理解
 * @param {string} text - 待分析文本
 * @param {string} context - 上下文
 * @returns {Promise<Object>} 分析结果
 */
async function aiAnalyze(text, context) {
  const settings = await getAISettings();
  
  if (!settings.enabled || !settings.apiKey) {
    throw new Error('AI not configured');
  }

  const systemPrompt = `你是一个专业的语言学专家。请分析用户提供的单词或短语。
请返回纯 JSON 格式的数据，不要包含 markdown 标记或其他文本。
JSON 格式要求：
{
  "partOfSpeech": "词性(如 noun, verb, adjective)",
  "meanings": ["释义1", "释义2"],
  "bestMeaning": "结合上下文的最合适释义",
  "phonetic": "音标(可选)"
}`;

  const userContent = context 
    ? `语境："...${context}..."

需分析词汇："${text}"`
    : `需分析词汇："${text}"`;

  try {
    const response = await fetch(settings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" } // 如果模型支持 JSON 模式
      })
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    try {
      return JSON.parse(content);
    } catch (e) {
      // 尝试清理 markdown 标记
      const cleanContent = content.replace(/```json\n?|\n?```/g, '');
      return JSON.parse(cleanContent);
    }
  } catch (error) {
    console.error('AI Analysis failed:', error);
    throw error;
  }
}

// 导出到全局作用域，供其他脚本使用
self.getAISettings = getAISettings;
self.translateWithAI = translateWithAI;
self.detailedTranslate = detailedTranslate;
self.aiAnalyze = aiAnalyze;
