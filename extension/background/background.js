/**
 * 单词翻译助手 - 后台服务工作进程 (优化版)
 *
 * 主要功能：
 * 1. 调用第三方翻译/词典API（网易有道开放平台）
 * 2. 处理扩展安装事件
 * 3. 与内容脚本(content script)进行消息通信
 * 4. 管理翻译请求和响应
 * 
 * 翻译配置和服务在启动时同步加载，供消息处理器使用。
 */

importScripts('../../config/api-config.js', '../services/ai-translate-service.js');

const startTime = performance.now();

// 延迟初始化非关键模块
let moduleManager = null;
let qualityService = null;
let aiTranslateService = null;
let posIntegrationService = null;
let posIntegrationServiceV2 = null;
let posPerformanceMonitor = null;

/**
 * 延迟加载模块（通过动态 import）
 */
async function initializeModules() {
  try {
    // 注意：这些模块需要转换为 ES6 模块才能使用 import()
    // 当前使用全局变量访问，如果模块已通过其他方式加载
    
    // 检查全局作用域中的模块
    moduleManager = self.ModuleManager ? new self.ModuleManager() : null;
    qualityService = self.qualityService || null;
    aiTranslateService = self.translateWithAI ? self : null;
    posIntegrationService = self.posIntegrationService || null;
    posIntegrationServiceV2 = self.posIntegrationServiceV2 || null;
    posPerformanceMonitor = self.posPerformanceMonitor || null;
    
    console.log('📦 Modules initialized:', {
      moduleManager: !!moduleManager,
      qualityService: !!qualityService,
      aiTranslateService: !!aiTranslateService,
      posIntegrationService: !!posIntegrationService,
      posIntegrationServiceV2: !!posIntegrationServiceV2,
      posPerformanceMonitor: !!posPerformanceMonitor
    });
    
    const loadTime = performance.now() - startTime;
    console.log(`⚡ Service Worker initialized in ${loadTime.toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ Module initialization failed:', error);
  }
}

// 启动模块初始化
initializeModules();

/**
 * Ollama 服务实例
 */
let ollamaService = null;

/**
 * 初始化 Ollama 服务
 */
async function initializeOllamaService() {
  try {
    // 尝试多个可能的 Ollama 地址
    const ollamaUrls = [
      'http://localhost:11434',
      'http://127.0.0.1:11434',
      'http://ollama:11434'
    ];

    for (const baseUrl of ollamaUrls) {
      try {
        console.log(`Checking Ollama at ${baseUrl}...`);
        const response = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Ollama service is available at', baseUrl);
          console.log('Available models:', data.models?.map((m) => m.name) || []);
          
          ollamaService = {
            available: true,
            baseUrl: baseUrl,
            models: data.models || []
          };
          return;
        }
      } catch (error) {
        console.warn(`Ollama not available at ${baseUrl}:`, error.message);
      }
    }

    // 所有地址都不可用
    console.warn('⚠️ Ollama service not available at any known address');
    ollamaService = { available: false };
  } catch (error) {
    console.error('❌ Ollama initialization error:', error);
    ollamaService = { available: false };
  }
}

// 使用模块管理器注册和初始化模块（如果可用）
setTimeout(() => {
  try {
    if (moduleManager) {
      // 注册模块
      moduleManager.registerModule('apiConfig', self);
      moduleManager.registerModule('aiTranslateService', aiTranslateService);
      moduleManager.registerModule('qualityService', qualityService);
      
      // 初始化所有模块
      moduleManager.initAll().then(result => {
        console.log('✅ 模块初始化完成:', result);
      }).catch(error => {
        console.error('❌ 模块初始化失败:', error);
      });
    } else {
      console.warn('⚠️ ModuleManager not available, skipping module registration');
    }
  } catch (e) {
    console.error('❌ 模块管理初始化失败:', e);
  }
}, 100);

// 监听扩展安装事件 - 当用户首次安装或更新扩展时触发
chrome.runtime.onInstalled.addListener(() => {
  console.log('单词翻译助手已安装');
  
  // 清理无效的 detailedInfo 数据
  cleanInvalidDetailedInfo();
  
  // 初始化 POS Integration Service V2
  initializePOSServiceV2();
});

// Service Worker 启动时也执行一次清理（处理已安装用户）
cleanInvalidDetailedInfo();

// 初始化 POS Service V2
initializePOSServiceV2();

// 初始化 Ollama 服务
initializeOllamaService();

/**
 * 初始化 POS Integration Service V2
 * Requirements: 10.1-10.5, 11.1
 */
async function initializePOSServiceV2() {
  try {
    const service = posIntegrationServiceV2 || self.posIntegrationServiceV2;
    if (service) {
      console.log('Initializing POS Integration Service V2...');
      await service.initialize();
      console.log('✅ POS Integration Service V2 initialized successfully');
    } else {
      console.warn('⚠️ POS Integration Service V2 not loaded');
    }
  } catch (error) {
    console.error('❌ Failed to initialize POS Integration Service V2:', error);
  }
}

/**
 * 清理无效的 detailedInfo 数据
 * 删除 basic 为 null 或 definitions 为空的 detailedInfo
 * 这样下次打开抽屉时会重新从有道 API 获取完整数据
 */
async function cleanInvalidDetailedInfo() {
  try {
    const result = await chrome.storage.local.get(['translatedWords']);
    const words = result.translatedWords || {};
    let cleanedCount = 0;
    
    Object.keys(words).forEach(key => {
      const word = words[key];
      if (word.detailedInfo) {
        // 检查 detailedInfo 是否有效
        const info = word.detailedInfo;
        const hasValidBasic = info.basic && (info.basic.phonetic || (info.basic.explains && info.basic.explains.length > 0));
        const hasValidDefinitions = info.definitions && info.definitions.length > 0;
        
        // 如果没有有效数据，删除 detailedInfo
        if (!hasValidBasic && !hasValidDefinitions) {
          delete words[key].detailedInfo;
          cleanedCount++;
        }
      }
    });
    
    if (cleanedCount > 0) {
      await chrome.storage.local.set({ translatedWords: words });
      console.log(`已清理 ${cleanedCount} 个无效的 detailedInfo 数据`);
    } else {
      console.log('没有需要清理的无效 detailedInfo 数据');
    }
  } catch (error) {
    console.error('清理 detailedInfo 失败:', error);
  }
}

// =========================
// 网易有道翻译/词典 API 集成模块
// =========================

// 获取用户配置的API密钥
async function getYoudaoCredentials() {
  try {
    const result = await chrome.storage.local.get(['userSettings']);
    const settings = result.userSettings || {};
    
    // 优先使用用户配置的API密钥
    const appKey = settings.apiKey || self.DEFAULT_YOUDAO_APP_KEY;
    const appSecret = settings.apiSecret || self.DEFAULT_YOUDAO_APP_SECRET;
    
    return { appKey, appSecret };
  } catch (error) {
    console.error('获取API配置失败:', error);
    // 回退到默认密钥
    return { 
      appKey: self.DEFAULT_YOUDAO_APP_KEY, 
      appSecret: self.DEFAULT_YOUDAO_APP_SECRET 
    };
  }
}

/**
 * 生成有道API签名所需的截断函数
 * 根据有道官方文档算法，对查询文本进行长度处理
 *
 * @param {string} q - 要翻译的文本
 * @returns {string} 处理后的文本
 */
function truncate(q) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

/**
 * 计算SHA-256哈希值并返回十六进制字符串
 * 用于有道API的v3签名算法
 *
 * @param {string} message - 要哈希的消息
 * @returns {Promise<string>} SHA-256哈希值的十六进制表示
 */
async function sha256Hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 调用网易有道开放平台进行文本翻译
 * 支持自动语言检测和中英文互译
 *
 * @param {string} text - 要翻译的文本内容
 * @returns {Promise<Object>} 翻译结果对象，包含译文、词典信息等
 * @throws {Error} 当API配置错误或翻译失败时抛出异常
 */
async function translateWithYoudao(text) {
  // 获取用户配置的API密钥
  const credentials = await getYoudaoCredentials();
  
  // 检查API密钥是否正确配置（允许使用默认密钥进行试用）
  if (!credentials.appKey || !credentials.appSecret) {
    throw new Error('Youdao appKey/appSecret 未配置，请在扩展设置中配置您的API密钥');
  }

  // API请求基础配置
  const url = self.YOUDAO_API_URL;
  const q = text;                    // 查询文本
  const from = 'auto';               // 源语言自动检测
  const to = 'zh-CHS';               // 非中文默认翻译成简体中文
  const salt = Date.now().toString(); // 随机盐值，防止重放攻击
  const curtime = Math.floor(Date.now() / 1000).toString(); // 当前时间戳

  // 生成API签名字符串
  const signStr = credentials.appKey + truncate(q) + salt + curtime + credentials.appSecret;
  const sign = await sha256Hex(signStr); // 计算SHA-256签名

  // 构建请求参数
  const params = new URLSearchParams({
    q,                    // 查询文本
    from,                 // 源语言
    to,                   // 目标语言
    appKey: credentials.appKey, // 应用密钥
    salt,                 // 盐值
    sign,                 // 签名
    signType: 'v3',       // 签名类型
    strict: 'false',      // 允许有道自动中译英、英译中
    curtime               // 时间戳
  });

  // 发送HTTP POST请求到有道API，带超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时
  
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 解析JSON响应
    const data = await resp.json();

    // 检查API响应是否成功
    if (data.errorCode !== '0') {
      console.error('Youdao API error:', data);
      throw new Error('Youdao error: ' + data.errorCode);
    }

    // 提取翻译结果
    const translation = Array.isArray(data.translation) ? data.translation[0] : ''; // 主译文
    const basic = data.basic || null; // 词典信息（单词音标、词性等）

    // 返回结构化的翻译结果
    return {
      translation,    // 翻译文本
      basic,         // 词典详细信息
      raw: data      // 原始API响应数据
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Youdao API request timeout (2s)');
    }
    throw error;
  }
}

// =========================
// AI 大模型翻译集成模块
// =========================


/**
 * 智能翻译聚合函数（优化版）
 * 使用并行请求和超时控制，提升响应速度
 * 
 * 优化点：
 * 1. 并行尝试AI和有道翻译
 * 2. 为每个服务设置独立超时
 * 3. 返回第一个成功的结果
 * 4. 失败缓存和请求去重
 * 
 * @param {string} text - 待翻译文本
 * @param {string} context - 上下文
 * @param {boolean} skipAI - 是否跳过AI翻译（仅使用普通翻译API）
 * @param {boolean} useParallel - 是否使用并行模式（默认true）
 */
async function smartTranslate(text, context, skipAI = false, useParallel = true) {
  // 如果使用并行模式且不跳过AI
  if (useParallel && !skipAI && typeof self.translateWithParallelFallback === 'function') {
    try {
      // 配置服务列表
      const services = [
        {
          name: 'ai',
          fn: self.translateWithAI,
          timeout: self.API_TIMEOUTS?.ai || 5000
        },
        {
          name: 'youdao',
          fn: translateWithYoudao,
          timeout: self.API_TIMEOUTS?.youdao || 3000
        }
      ];
      
      // 并行尝试所有服务
      const result = await self.translateWithParallelFallback(text, context, services);
      
      // 处理结果
      return await processTranslationResult(result, text, context);
    } catch (error) {
      console.error('Parallel translation failed:', error);
      // 降级到串行模式
      return smartTranslate(text, context, skipAI, false);
    }
  }
  
  // 串行模式（原有逻辑）
  const startTime = Date.now();
  
  // 1. 尝试 AI 翻译 (如果不跳过)
  if (!skipAI) {
    try {
      const aiResult = await Promise.race([
        self.translateWithAI(text, context),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000))
      ]);
      const latency = Date.now() - startTime;
      
      if (typeof recordTranslation === 'function') {
        recordTranslation('ai', true, latency);
      }
      
      return {
        translation: aiResult.translation,
        basic: null,
        source: 'ai',
        raw: aiResult
      };
    } catch (aiError) {
      console.log('AI translation failed, falling back to Youdao:', aiError.message);
    }
  }
    
  // 2. 回退到有道翻译
  try {
    const youdaoResult = await translateWithYoudao(text);
    const latency = Date.now() - startTime;
    
    if (typeof recordTranslation === 'function') {
      recordTranslation('youdao', true, latency);
    }
    
    return await processTranslationResult({
      ...youdaoResult,
      source: 'youdao'
    }, text, context);
  } catch (finalError) {
    const latency = Date.now() - startTime;
    if (typeof recordTranslation === 'function') {
      recordTranslation('all', false, latency);
    }
    throw finalError;
  }
}

/**
 * 处理翻译结果，提取和增强数据
 * @param {Object} result - 原始翻译结果
 * @param {string} text - 原始文本
 * @param {string} context - 上下文
 * @returns {Promise<Object>} 处理后的结果
 */
async function processTranslationResult(result, text, context) {
  // 增强返回数据：从 raw 中提取更多信息
  const processedResult = {
    translation: result.translation,
    basic: result.basic || (result.raw ? result.raw.basic : null),
    source: result.source,
    raw: result.raw
  };
  
  // 如果有 raw 数据，提取额外信息
  if (result.raw) {
    // 提取音标
    if (result.raw.basic) {
      processedResult.phonetic = result.raw.basic.phonetic || 
                       result.raw.basic['uk-phonetic'] || 
                       result.raw.basic['us-phonetic'] || '';
      processedResult.partOfSpeech = result.raw.basic.explains && result.raw.basic.explains[0] 
        ? result.raw.basic.explains[0].split('.')[0] + '.' 
        : '';
    }
    
    // 提取释义
    if (result.raw.basic && result.raw.basic.explains) {
      processedResult.definitions = result.raw.basic.explains.map(explain => ({
        text: explain,
        translation: explain
      }));
    }
    
    // 提取例句
    if (result.raw.web) {
      processedResult.examples = result.raw.web.slice(0, 3).map(item => ({
        source: item.key,
        target: Array.isArray(item.value) ? item.value.join('；') : item.value
      }));
    }
    
    // 提取网络释义
    processedResult.web = result.raw.web || null;
  }
  
  // 添加词性分析
  const posService = self.posIntegrationServiceV2 || self.posIntegrationService;
  
  if (posService && context) {
    try {
      const posAnalysis = await posService.analyzeWord(text, context);
      processedResult.posAnalysis = {
        pos: posAnalysis.pos,
        color: posAnalysis.color,
        confidence: posAnalysis.confidence,
        approach: posAnalysis.approach || 'frontend',
        cached: posAnalysis.cached
      };
      
      console.log('POS analysis added:', processedResult.posAnalysis);
    } catch (posError) {
      console.warn('POS analysis failed:', posError);
    }
  }
  
  // 调试日志
  console.log('Translation result processed:', {
    source: processedResult.source,
    hasBasic: !!processedResult.basic,
    hasDefinitions: !!processedResult.definitions,
    hasPOS: !!processedResult.posAnalysis
  });
  
  return processedResult;
}


/**
 * Ollama API 调用函数 - 改进版本
 * 支持多种 Ollama API 端点和响应格式
 */
async function fetchOllama(data) {
  const OLLAMA_CONFIG = {
    baseUrl: 'http://127.0.0.1:11434',
    timeout: 60000,
    retries: 2
  };

  let lastError = null;

  // 尝试多个可能的 API 端点
  const endpoints = [
    `${OLLAMA_CONFIG.baseUrl}/api/generate`,
    `${OLLAMA_CONFIG.baseUrl}/api/chat`,
    `${OLLAMA_CONFIG.baseUrl}/generate`
  ];

  for (let attempt = 0; attempt < OLLAMA_CONFIG.retries; attempt++) {
    for (const endpoint of endpoints) {
      try {
        console.log(`🔮 Attempt ${attempt + 1}: Connecting to Ollama at ${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_CONFIG.timeout);

        // 准备请求数据
        const requestData = {
          ...data,
          stream: false
        };

        // 如果是 chat 端点，需要转换格式
        if (endpoint.includes('/chat')) {
          requestData.messages = requestData.messages || [
            { role: 'user', content: requestData.prompt }
          ];
          delete requestData.prompt;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Endpoint ${endpoint} returned ${response.status}: ${errorText}`);
          lastError = new Error(`Ollama API error: ${response.status}`);
          continue; // 尝试下一个端点
        }

        const result = await response.json();
        console.log('✅ Ollama response received from:', endpoint);
        
        // 处理不同的响应格式
        if (result.response) {
          return result.response;
        } else if (result.message?.content) {
          return result.message.content;
        } else if (result.choices?.[0]?.message?.content) {
          return result.choices[0].message.content;
        } else if (typeof result === 'string') {
          return result;
        } else {
          console.warn('Unexpected Ollama response format:', result);
          return JSON.stringify(result);
        }
      } catch (error) {
        console.warn(`Error with endpoint ${endpoint}:`, error.message);
        lastError = error;
        // 继续尝试下一个端点
      }
    }
  }

  // 所有尝试都失败了
  console.error('❌ All Ollama endpoints failed');
  throw lastError || new Error('Ollama request failed - no endpoints available');
}

/**
 * 使用 Ollama 进行 POS 分析 - 改进版本
 */
async function analyzeWithOllama(text, sentence) {
  if (!ollamaService?.available) {
    throw new Error('Ollama service not available');
  }

  // 创建更清晰的提示词
  const prompt = `You are a part-of-speech (POS) tagger. Analyze the word "${text}" in the sentence: "${sentence}"

Return ONLY a valid JSON object (no markdown, no extra text, no code blocks):
{
  "word": "${text}",
  "pos": "noun|verb|adjective|adverb|unknown",
  "confidence": 0.85,
  "explanation": "brief explanation"
}

Rules:
- Participles (broken, written, etc.) should be tagged as "adjective" if used as adjective, "verb" if used as verb
- -ing words should be tagged as "verb" if used as verb, "noun" if used as noun, "adjective" if used as adjective
- Be precise and concise`;

  try {
    console.log(`Analyzing "${text}" with Ollama...`);
    
    const response = await fetchOllama({
      model: 'mistral',
      prompt: prompt,
      temperature: 0.3
    });

    if (!response) {
      throw new Error('Empty response from Ollama');
    }

    console.log('Ollama raw response:', response);

    // 尝试解析 JSON 响应
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in response, attempting to extract...');
      // 尝试清理响应
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    }

    if (!jsonMatch) {
      throw new Error('No valid JSON found in Ollama response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // 验证响应格式
    if (!result.word || !result.pos) {
      throw new Error('Invalid response format from Ollama');
    }
    
    return {
      word: result.word || text,
      pos: result.pos || 'unknown',
      confidence: result.confidence || 0.85,
      explanation: result.explanation || '',
      approach: 'ollama'
    };
  } catch (error) {
    console.error('Ollama POS analysis failed:', error);
    throw error;
  }
}

/**
 * 消息监听器 - 处理来自内容脚本的翻译请求
 * 使用Chrome扩展消息传递API进行跨脚本通信
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 运行测试套件
  if (msg && msg.type === 'RUN_TESTS') {
    if (typeof runTestSuite === 'function') {
      runTestSuite(msg.iterations || 10)
        .then(report => sendResponse({ ok: true, report }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
    } else {
      sendResponse({ ok: false, error: 'Test suite not loaded' });
    }
    return true;
  }

  // 获取质量报告
  if (msg && msg.type === 'GET_QUALITY_REPORT') {
    if (typeof getQualityReport === 'function') {
      sendResponse({ ok: true, report: getQualityReport() });
    } else {
      sendResponse({ ok: false, error: 'Quality service not loaded' });
    }
    return false;
  }

  // POS 分析请求 (新增)
  if (msg && msg.type === 'POS_ANALYZE' && msg.text) {
    const posService = self.posIntegrationServiceV2 || self.posIntegrationService;
    
    if (posService) {
      (async () => {
        try {
          const result = msg.sentence 
            ? await posService.analyzeWord(msg.text, msg.sentence, msg.position)
            : await posService.analyzeSentence(msg.text);
          sendResponse({ ok: true, result });
        } catch (error) {
          console.error('POS analysis failed:', error);
          sendResponse({ ok: false, error: error.message });
        }
      })();
    } else {
      sendResponse({ ok: false, error: 'POS service not loaded' });
    }
    return true; // Async response
  }

  // 获取 POS 统计信息 (新增)
  if (msg && msg.type === 'GET_POS_STATS') {
    const posService = self.posIntegrationServiceV2 || self.posIntegrationService;
    
    if (posService) {
      try {
        const stats = posService.getStats();
        sendResponse({ ok: true, stats });
      } catch (error) {
        console.error('Failed to get POS stats:', error);
        sendResponse({ ok: false, error: error.message });
      }
    } else {
      sendResponse({ ok: false, error: 'POS service not loaded' });
    }
    return false;
  }
  
  // 获取用户配置 (新增 - Requirement 10.1, 10.2)
  if (msg && msg.type === 'GET_USER_CONFIG') {
    if (self.posIntegrationServiceV2) {
      (async () => {
        try {
          const config = await self.posIntegrationServiceV2.getUserConfig();
          sendResponse({ ok: true, config });
        } catch (error) {
          console.error('Failed to get user config:', error);
          sendResponse({ ok: false, error: error.message });
        }
      })();
    } else {
      sendResponse({ ok: false, error: 'POS service V2 not loaded' });
    }
    return true; // Async response
  }
  
  // 更新用户配置 (新增 - Requirement 10.1, 10.2)
  if (msg && msg.type === 'UPDATE_USER_CONFIG' && msg.config) {
    if (self.posIntegrationServiceV2) {
      (async () => {
        try {
          await self.posIntegrationServiceV2.updateUserConfig(msg.config);
          sendResponse({ ok: true });
        } catch (error) {
          console.error('Failed to update user config:', error);
          sendResponse({ ok: false, error: error.message });
        }
      })();
    } else {
      sendResponse({ ok: false, error: 'POS service V2 not loaded' });
    }
    return true; // Async response
  }
  
  // 刷新服务可用性 (新增 - Requirement 10.3, 10.4)
  if (msg && msg.type === 'REFRESH_SERVICE_AVAILABILITY') {
    if (self.posIntegrationServiceV2) {
      (async () => {
        try {
          const availability = await self.posIntegrationServiceV2.refreshServiceAvailability();
          sendResponse({ ok: true, availability });
        } catch (error) {
          console.error('Failed to refresh service availability:', error);
          sendResponse({ ok: false, error: error.message });
        }
      })();
    } else {
      sendResponse({ ok: false, error: 'POS service V2 not loaded' });
    }
    return true; // Async response
  }
  
  // 导出统计数据 (新增 - Requirement 9.5)
  if (msg && msg.type === 'EXPORT_POS_STATS') {
    if (self.posIntegrationServiceV2) {
      try {
        const stats = self.posIntegrationServiceV2.exportStats();
        sendResponse({ ok: true, stats });
      } catch (error) {
        console.error('Failed to export stats:', error);
        sendResponse({ ok: false, error: error.message });
      }
    } else {
      sendResponse({ ok: false, error: 'POS service V2 not loaded' });
    }
    return false;
  }
  
  // 获取性能指标 (新增 - Requirement 9.1, 9.5)
  if (msg && msg.type === 'GET_PERFORMANCE_METRICS') {
    if (self.posPerformanceMonitor) {
      try {
        const metrics = self.posPerformanceMonitor.getMetrics();
        sendResponse({ ok: true, metrics });
      } catch (error) {
        console.error('Failed to get performance metrics:', error);
        sendResponse({ ok: false, error: error.message });
      }
    } else {
      sendResponse({ ok: false, error: 'Performance monitor not loaded' });
    }
    return false;
  }
  
  // 获取性能摘要 (新增)
  if (msg && msg.type === 'GET_PERFORMANCE_SUMMARY') {
    if (self.posPerformanceMonitor) {
      try {
        const summary = self.posPerformanceMonitor.getSummary();
        sendResponse({ ok: true, summary });
      } catch (error) {
        console.error('Failed to get performance summary:', error);
        sendResponse({ ok: false, error: error.message });
      }
    } else {
      sendResponse({ ok: false, error: 'Performance monitor not loaded' });
    }
    return false;
  }
  
  // 重置统计数据 (新增)
  if (msg && msg.type === 'RESET_POS_STATS') {
    if (self.posIntegrationServiceV2) {
      try {
        self.posIntegrationServiceV2.resetStats();
        sendResponse({ ok: true });
      } catch (error) {
        console.error('Failed to reset stats:', error);
        sendResponse({ ok: false, error: error.message });
      }
    } else {
      sendResponse({ ok: false, error: 'POS service V2 not loaded' });
    }
    return false;
  }

  // 智能翻译请求
  if (msg && msg.type === 'SMART_TRANSLATE' && msg.text) {
    smartTranslate(msg.text, msg.context, msg.skipAI)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => {
        console.error('Smart translate failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  // AI 分析请求
  if (msg && msg.type === 'AI_ANALYZE' && msg.text) {
    self.aiAnalyze(msg.text, msg.context)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => {
        console.error('AI analyze failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  // Ollama 生成请求
  if (msg && msg.action === 'ollama-generate' && msg.data) {
    fetchOllama(msg.data)
      .then(result => sendResponse({ response: result }))
      .catch(err => {
        console.error('Ollama generate failed:', err);
        sendResponse({ error: err.message });
      });
    return true;
  }

  // 获取 Ollama 服务状态 (新增)
  if (msg && msg.type === 'GET_OLLAMA_STATUS') {
    sendResponse({ 
      ok: true, 
      available: ollamaService?.available || false,
      baseUrl: ollamaService?.baseUrl || null
    });
    return false;
  }

  // 使用 Ollama 进行 POS 分析 (新增)
  if (msg && msg.type === 'OLLAMA_POS_ANALYZE' && msg.text) {
    if (!ollamaService?.available) {
      sendResponse({ ok: false, error: 'Ollama service not available' });
      return false;
    }

    analyzeWithOllama(msg.text, msg.sentence)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => {
        console.error('Ollama POS analysis failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }


  // 检查消息类型是否为翻译请求 (Legacy Support)
  if (msg && msg.type === 'YOUDAO_TRANSLATE' && msg.text) {
    // 异步调用翻译函数
    translateWithYoudao(msg.text)
      .then(result => {
        // 翻译成功，返回结果
        sendResponse({ ok: true, result });
      })
      .catch(err => {
        // 翻译失败，记录错误并返回错误信息
        console.error('Youdao translate failed:', err);
        sendResponse({ ok: false, error: err.message });
      });
    // 返回true表示将异步发送响应
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'REHIGHLIGHT' }).catch(() => {});
  }
});

// 监听导航提交事件（用于常规页面加载和 iframe 加载）
chrome.webNavigation?.onCommitted.addListener((details) => {
  if (details && typeof details.tabId === 'number') {
    // 定向发送消息给特定的 frame，避免触发整个页面的所有 frame 重绘
    const options = typeof details.frameId === 'number' ? { frameId: details.frameId } : {};
    
    chrome.tabs.sendMessage(details.tabId, { type: 'REHIGHLIGHT' }, options).catch(() => {
      // 忽略因标签页关闭或内容脚本尚未准备好而导致的错误
    });
  }
});

// 监听 History API 更新（用于 SPA 单页应用）
chrome.webNavigation?.onHistoryStateUpdated.addListener((details) => {
  if (details && typeof details.tabId === 'number') {
    // 定向发送消息给特定的 frame
    const options = typeof details.frameId === 'number' ? { frameId: details.frameId } : {};
    
    chrome.tabs.sendMessage(details.tabId, { type: 'REHIGHLIGHT' }, options).catch(() => {});
  }
});
