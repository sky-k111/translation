/**
 * Background API请求处理组件
 * 5.3.1：迁移Background API请求处理功能
 * 封装网易有道翻译API、AI翻译和智能翻译聚合功能
 */
const BackgroundComponent = require('../utils/BackgroundComponent.js');

class BackgroundAPIRequest extends BackgroundComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      defaultYoudaoAppKey: '',
      defaultYoudaoAppSecret: '',
      youdaoApiUrl: ''
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      isInitialized: false,
      apiConfig: null
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.loadApiConfig();
  }

  /**
   * 加载API配置
   */
  async loadApiConfig() {
    try {
      // 从存储中获取API配置
      const storageData = await this.getStorageData(['userSettings']);
      const userSettings = storageData.userSettings || {};
      
      // 配置API参数
      this.state.apiConfig = {
        youdaoAppKey: userSettings.apiKey || this.props.defaultYoudaoAppKey,
        youdaoAppSecret: userSettings.apiSecret || this.props.defaultYoudaoAppSecret,
        youdaoApiUrl: this.props.youdaoApiUrl || 'https://openapi.youdao.com/api'
      };
      
      this.state.isInitialized = true;
    } catch (error) {
      console.error('加载API配置失败:', error);
      this.state.isInitialized = false;
    }
  }

  /**
   * 生成有道API签名所需的截断函数
   * @param {string} q - 要翻译的文本
   * @returns {string} 处理后的文本
   */
  truncate(q) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
  }

  /**
   * 计算SHA-256哈希值并返回十六进制字符串
   * @param {string} message - 要哈希的消息
   * @returns {Promise<string>} SHA-256哈希值的十六进制表示
   */
  async sha256Hex(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 调用网易有道开放平台进行文本翻译
   * @param {string} text - 要翻译的文本内容
   * @returns {Promise<Object>} 翻译结果对象
   */
  async translateWithYoudao(text) {
    if (!this.state.isInitialized || !this.state.apiConfig) {
      throw new Error('API配置未初始化');
    }
    
    // 检查API密钥是否正确配置
    const { youdaoAppKey, youdaoAppSecret, youdaoApiUrl } = this.state.apiConfig;
    if (!youdaoAppKey || !youdaoAppSecret) {
      throw new Error('Youdao appKey/appSecret 未配置，请在扩展设置中配置您的API密钥');
    }

    // API请求基础配置
    const q = text;
    const from = 'auto';
    const to = 'zh-CHS';
    const salt = Date.now().toString();
    const curtime = Math.floor(Date.now() / 1000).toString();

    // 生成API签名字符串
    const signStr = youdaoAppKey + this.truncate(q) + salt + curtime + youdaoAppSecret;
    const sign = await this.sha256Hex(signStr);

    // 构建请求参数
    const params = new URLSearchParams({
      q,
      from,
      to,
      appKey: youdaoAppKey,
      salt,
      sign,
      signType: 'v3',
      curtime
    });

    // 发送HTTP POST请求到有道API
    const resp = await fetch(youdaoApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    // 解析JSON响应
    const data = await resp.json();

    // 检查API响应是否成功
    if (data.errorCode !== '0') {
      console.error('Youdao API error:', data);
      throw new Error('Youdao error: ' + data.errorCode);
    }

    // 提取翻译结果
    const translation = Array.isArray(data.translation) ? data.translation[0] : '';
    const basic = data.basic || null;

    // 返回结构化的翻译结果
    return {
      translation,
      basic,
      raw: data
    };
  }

  /**
   * 智能翻译聚合函数
   * 优先尝试AI翻译，失败则回退到有道
   * @param {string} text - 待翻译文本
   * @param {string} context - 上下文
   * @param {boolean} skipAI - 是否跳过AI翻译
   * @returns {Promise<Object>} 翻译结果
   */
  async smartTranslate(text, context = '', skipAI = false) {
    const startTime = Date.now();
    
    // 1. 尝试AI翻译 (如果不跳过)
    if (!skipAI) {
      try {
        // 检查全局AI翻译函数是否存在
        if (typeof self.translateWithAI === 'function') {
          const aiResult = await self.translateWithAI(text, context);
          const latency = Date.now() - startTime;
          
          // 记录成功 metrics
          if (typeof self.recordTranslation === 'function') {
            self.recordTranslation('ai', true, latency);
          }
          
          return {
            translation: aiResult.translation,
            basic: null,
            source: 'ai',
            raw: aiResult
          };
        }
      } catch (aiError) {
        console.log('AI translation skipped/failed, falling back to Youdao:', aiError.message);
      }
    }
      
    // 2. 回退到有道翻译
    try {
      const youdaoResult = await this.translateWithYoudao(text);
      const latency = Date.now() - startTime;
      
      // 记录 fallback metrics
      if (typeof self.recordTranslation === 'function') {
        self.recordTranslation('youdao', true, latency);
      }
      
      return {
        ...youdaoResult,
        source: 'youdao'
      };
    } catch (finalError) {
      const latency = Date.now() - startTime;
      // 记录失败
      if (typeof self.recordTranslation === 'function') {
        self.recordTranslation('all', false, latency);
      }
      throw finalError;
    }
  }

  /**
   * 处理翻译请求
   * @param {Object} request - 请求对象
   * @returns {Promise<Object>} 翻译结果
   */
  async handleTranslationRequest(request) {
    try {
      const { text, context, skipAI, type } = request;
      
      let result;
      
      // 根据请求类型处理
      if (type === 'SMART_TRANSLATE' || !type) {
        // 智能翻译
        result = await this.smartTranslate(text, context, skipAI);
      } else if (type === 'YOUDAO_TRANSLATE') {
        // 仅使用有道翻译
        result = await this.translateWithYoudao(text);
        result.source = 'youdao';
      } else if (type === 'AI_TRANSLATE' && typeof self.translateWithAI === 'function') {
        // 仅使用AI翻译
        result = await self.translateWithAI(text, context);
        result.source = 'ai';
      } else {
        throw new Error('不支持的翻译类型');
      }
      
      return {
        ok: true,
        result
      };
    } catch (error) {
      console.error('翻译请求处理失败:', error);
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * 更新API配置
   * @param {Object} config - 新的API配置
   */
  updateApiConfig(config) {
    this.state.apiConfig = { ...this.state.apiConfig, ...config };
  }

  /**
   * 重新加载API配置
   */
  reloadApiConfig() {
    this.loadApiConfig();
  }

  /**
   * 检查组件是否已初始化
   * @returns {boolean} - 是否已初始化
   */
  isInitialized() {
    return this.state.isInitialized;
  }

  /**
   * 获取当前API配置
   * @returns {Object|null} - API配置
   */
  getApiConfig() {
    return this.state.apiConfig;
  }

  /**
   * 销毁组件
   */
  destroy() {
    super.destroy();
  }
}

// 导出组件
module.exports = BackgroundAPIRequest;