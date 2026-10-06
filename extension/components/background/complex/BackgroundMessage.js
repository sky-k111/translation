/**
 * Background消息传递组件
 * 5.3.2：迁移Background消息传递功能
 * 封装Chrome扩展的消息传递功能，包括消息监听和处理
 */
const BackgroundComponent = require('../utils/BackgroundComponent.js');

class BackgroundMessage extends BackgroundComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props = {}) {
    super(props);
    
    // 默认属性
    this.defaultProps = {
      apiRequestComponent: null, // API请求组件实例
      qualityService: null,      // 质量服务实例
      testSuite: null           // 测试套件实例
    };
    
    this.props = { ...this.defaultProps, ...props };
    
    // 内部状态
    this.state = {
      messageHandlers: {},
      isInitialized: false
    };
    
    // 初始化组件
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    super.init();
    this.registerMessageHandlers();
    this.setupMessageListener();
    this.state.isInitialized = true;
  }

  /**
   * 注册消息处理器
   */
  registerMessageHandlers() {
    // 测试套件处理器
    this.state.messageHandlers['RUN_TESTS'] = this.handleRunTests.bind(this);
    
    // 质量报告处理器
    this.state.messageHandlers['GET_QUALITY_REPORT'] = this.handleGetQualityReport.bind(this);
    
    // 智能翻译处理器
    this.state.messageHandlers['SMART_TRANSLATE'] = this.handleSmartTranslate.bind(this);
    
    // AI分析处理器
    this.state.messageHandlers['AI_ANALYZE'] = this.handleAIAnalyze.bind(this);
    
    // 有道翻译处理器（遗留支持）
    this.state.messageHandlers['YOUDAO_TRANSLATE'] = this.handleYoudaoTranslate.bind(this);
  }

  /**
   * 设置消息监听器
   */
  setupMessageListener() {
    this.registerChromeListener('runtime.onMessage', this.handleMessage.bind(this));
  }

  /**
   * 处理消息
   * @param {Object} msg - 消息内容
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 响应函数
   * @returns {boolean} - 是否需要异步响应
   */
  handleMessage(msg, sender, sendResponse) {
    if (!msg || !msg.type) {
      sendResponse({ ok: false, error: 'Invalid message format' });
      return false;
    }
    
    const messageType = msg.type;
    const handler = this.state.messageHandlers[messageType];
    
    if (!handler) {
      sendResponse({ ok: false, error: `Unknown message type: ${messageType}` });
      return false;
    }
    
    // 调用对应的处理器，支持异步操作
    handler(msg, sender).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ ok: false, error: error.message });
    });
    
    // 返回true表示需要异步响应
    return true;
  }

  /**
   * 处理运行测试请求
   * @param {Object} msg - 消息内容
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} - 响应结果
   */
  async handleRunTests(msg, sender) {
    try {
      // 检查测试套件是否可用
      const runTestSuite = this.props.testSuite || (typeof self.runTestSuite === 'function' ? self.runTestSuite : null);
      
      if (!runTestSuite) {
        return { ok: false, error: 'Test suite not loaded' };
      }
      
      // 运行测试套件
      const report = await runTestSuite(msg.iterations || 10);
      return { ok: true, report };
    } catch (error) {
      console.error('Test execution failed:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 处理获取质量报告请求
   * @param {Object} msg - 消息内容
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} - 响应结果
   */
  async handleGetQualityReport(msg, sender) {
    try {
      // 检查质量服务是否可用
      const qualityService = this.props.qualityService || (typeof self.qualityService === 'object' ? self.qualityService : null);
      const getQualityReport = qualityService ? qualityService.getQualityReport : (typeof self.getQualityReport === 'function' ? self.getQualityReport : null);
      
      if (!getQualityReport) {
        return { ok: false, error: 'Quality service not loaded' };
      }
      
      // 获取质量报告
      const report = getQualityReport();
      return { ok: true, report };
    } catch (error) {
      console.error('Failed to get quality report:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 处理智能翻译请求
   * @param {Object} msg - 消息内容
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} - 响应结果
   */
  async handleSmartTranslate(msg, sender) {
    try {
      // 检查API请求组件是否可用
      if (!this.props.apiRequestComponent) {
        return { ok: false, error: 'API request component not initialized' };
      }
      
      // 处理翻译请求
      const response = await this.props.apiRequestComponent.handleTranslationRequest({
        text: msg.text,
        context: msg.context,
        skipAI: msg.skipAI,
        type: 'SMART_TRANSLATE'
      });
      
      return response;
    } catch (error) {
      console.error('Smart translate failed:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 处理AI分析请求
   * @param {Object} msg - 消息内容
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} - 响应结果
   */
  async handleAIAnalyze(msg, sender) {
    try {
      // 检查全局AI分析函数是否存在
      if (typeof self.aiAnalyze !== 'function') {
        return { ok: false, error: 'AI analyze function not available' };
      }
      
      // 调用AI分析函数
      const result = await self.aiAnalyze(msg.text, msg.context);
      return { ok: true, result };
    } catch (error) {
      console.error('AI analyze failed:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 处理有道翻译请求（遗留支持）
   * @param {Object} msg - 消息内容
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} - 响应结果
   */
  async handleYoudaoTranslate(msg, sender) {
    try {
      // 检查API请求组件是否可用
      if (!this.props.apiRequestComponent) {
        return { ok: false, error: 'API request component not initialized' };
      }
      
      // 处理翻译请求
      const response = await this.props.apiRequestComponent.handleTranslationRequest({
        text: msg.text,
        type: 'YOUDAO_TRANSLATE'
      });
      
      return response;
    } catch (error) {
      console.error('Youdao translate failed:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * 设置API请求组件
   * @param {Object} apiRequestComponent - API请求组件实例
   */
  setApiRequestComponent(apiRequestComponent) {
    this.props.apiRequestComponent = apiRequestComponent;
  }

  /**
   * 设置质量服务实例
   * @param {Object} qualityService - 质量服务实例
   */
  setQualityService(qualityService) {
    this.props.qualityService = qualityService;
  }

  /**
   * 设置测试套件实例
   * @param {Object} testSuite - 测试套件实例
   */
  setTestSuite(testSuite) {
    this.props.testSuite = testSuite;
  }

  /**
   * 注册自定义消息处理器
   * @param {string} messageType - 消息类型
   * @param {Function} handler - 消息处理器函数
   */
  registerCustomHandler(messageType, handler) {
    if (typeof handler === 'function') {
      this.state.messageHandlers[messageType] = handler;
    }
  }

  /**
   * 移除自定义消息处理器
   * @param {string} messageType - 消息类型
   */
  removeCustomHandler(messageType) {
    if (this.state.messageHandlers[messageType]) {
      delete this.state.messageHandlers[messageType];
    }
  }

  /**
   * 获取所有注册的消息处理器
   * @returns {Object} - 消息处理器映射
   */
  getMessageHandlers() {
    return { ...this.state.messageHandlers };
  }

  /**
   * 发送消息到指定标签页
   * @param {number} tabId - 标签页ID
   * @param {Object} message - 消息内容
   * @param {Object} options - 选项
   * @returns {Promise<Object>} - 响应结果
   */
  async sendMessageToTab(tabId, message, options = {}) {
    return super.sendMessageToTab(tabId, message, options);
  }

  /**
   * 发送消息到所有标签页
   * @param {Object} message - 消息内容
   */
  async sendMessageToAllTabs(message) {
    return super.sendMessageToAllTabs(message);
  }

  /**
   * 检查组件是否已初始化
   * @returns {boolean} - 是否已初始化
   */
  isInitialized() {
    return this.state.isInitialized;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 清空消息处理器
    this.state.messageHandlers = {};
    this.state.isInitialized = false;
    
    super.destroy();
  }
}

// 导出组件
module.exports = BackgroundMessage;