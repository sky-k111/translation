/**
 * 网易翻译API服务模块
 * 负责处理与网易翻译API的通信
 */
class NeteaseTranslateService {
  constructor() {
    // 默认配置，实际使用时从用户设置中获取
    this.apiConfig = {
      appKey: '',
      secretKey: '',
      apiUrl: 'https://openapi.youdao.com/api'
    };
    
    // 签名缓存，避免重复计算
    this.signatureCache = new Map();
    this.maxCacheSize = 100;
    
    // 移除构造函数中对init方法的直接调用，改为由模块管理器统一调用
  }
  
  /**
   * 初始化网易翻译服务
   */
  async init() {
    // 从Chrome存储中获取API配置
    const result = await chrome.storage.local.get(['userSettings']);
    const settings = result.userSettings || {};
    
    // 优先使用通用字段名 apiKey/apiSecret，同时兼容 neteaseAppKey/neteaseSecretKey
    const appKey = settings.apiKey || settings.neteaseAppKey;
    const secretKey = settings.apiSecret || settings.neteaseSecretKey;

    if (appKey && secretKey) {
      this.apiConfig.appKey = appKey;
      this.apiConfig.secretKey = secretKey;
    }
  }
  
  /**
   * 更新API配置
   */
  updateConfig(config) {
    this.apiConfig = {
      ...this.apiConfig,
      ...config
    };
  }
  
  /**
   * 检查配置是否有效
   * @returns {boolean}
   */
  hasValidConfig() {
    return !!(this.apiConfig.appKey && this.apiConfig.secretKey);
  }

  /**
   * 生成随机字符串
   */
  generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * 计算签名（带缓存）
   */
  calculateSign(q, salt, curtime) {
    const { appKey, secretKey } = this.apiConfig;
    const cacheKey = `${appKey}:${q}:${salt}:${curtime}:${secretKey}`;
    
    // 检查缓存
    if (this.signatureCache.has(cacheKey)) {
      return this.signatureCache.get(cacheKey);
    }
    
    const signStr = appKey + q + salt + curtime + secretKey;
    const sign = this.md5(signStr);
    
    // 保存到缓存
    if (this.signatureCache.size >= this.maxCacheSize) {
      // 移除最旧的缓存项
      const firstKey = this.signatureCache.keys().next().value;
      this.signatureCache.delete(firstKey);
    }
    this.signatureCache.set(cacheKey, sign);
    
    return sign;
  }
  
  /**
   * MD5加密 (纯JS实现，替代不支持的 crypto.subtle.digest('MD5'))
   * 注意：Chrome Web Crypto API 不再支持 MD5，必须使用 JS 实现
   */
  md5(string) {
    function RotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }

    function AddUnsigned(lX, lY) {
      var lX4, lY4, lX8, lY8, lResult;
      lX8 = (lX & 0x80000000);
      lY8 = (lY & 0x80000000);
      lX4 = (lX & 0x40000000);
      lY4 = (lY & 0x40000000);
      lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) {
        return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      }
      if (lX4 | lY4) {
        if (lResult & 0x40000000) {
          return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        } else {
          return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        }
      } else {
        return (lResult ^ lX8 ^ lY8);
      }
    }

    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }

    function FF(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }

    function GG(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }

    function HH(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }

    function II(a, b, c, d, x, s, ac) {
      a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
      return AddUnsigned(RotateLeft(a, s), b);
    }

    function ConvertToWordArray(string) {
      var lWordCount;
      var lMessageLength = string.length;
      var lNumberOfWords_temp1 = lMessageLength + 8;
      var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      var lWordArray = Array(lNumberOfWords - 1);
      var lBytePosition = 0;
      var lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }

    function WordToHex(lValue) {
      var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        WordToHexValue_temp = "0" + lByte.toString(16);
        WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
      }
      return WordToHexValue;
    }

    var x = ConvertToWordArray(string);
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
      AA = a; BB = b; CC = c; DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = AddUnsigned(a, AA);
      b = AddUnsigned(b, BB);
      c = AddUnsigned(c, CC);
      d = AddUnsigned(d, DD);
    }

    var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
    return temp.toLowerCase();
  }
  
  /**
   * 翻译文本
   * @param {string} text - 要翻译的文本
   * @param {string} from - 源语言
   * @param {string} to - 目标语言
   * @param {number} maxRetries - 最大重试次数
   * @param {number} retryDelay - 重试延迟（毫秒）
   * @returns {Promise<Object>} 翻译结果
   */
  async translate(text, from = 'auto', to = 'zh-CHS', maxRetries = 3, retryDelay = 1000) {
    // ✓ 修复：通过 Background Script 调用 API，避免 CORS 错误
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'YOUDAO_TRANSLATE',
        text: text,
        from: from,
        to: to
      });
      
      if (response && response.ok && response.result) {
        return this.parseTranslationResult(response.result.raw || response.result);
      } else {
        throw new Error(response.error || '翻译失败');
      }
    } catch (error) {
      console.error('网易翻译失败:', error);
      throw error;
    }
  }
  
  /**
   * 翻译文本（旧版本，直接调用 API - 已废弃，保留用于 Background Script）
   * @param {string} text - 要翻译的文本
   * @param {string} from - 源语言
   * @param {string} to - 目标语言
   * @param {number} maxRetries - 最大重试次数
   * @param {number} retryDelay - 重试延迟（毫秒）
   * @returns {Promise<Object>} 翻译结果
   * @deprecated 此方法仅供 Background Script 使用
   */
  async _translateDirect(text, from = 'auto', to = 'zh-CHS', maxRetries = 3, retryDelay = 1000) {
    let retries = 0;
    let lastError = null;
    let lastErrorCode = null;
    
    while (retries <= maxRetries) {
      try {
        if (!this.apiConfig.appKey || !this.apiConfig.secretKey) {
          const error = new Error('网易翻译API配置不完整');
          error.type = 'CONFIG_ERROR';
          throw error;
        }
        
        const salt = this.generateRandomString();
        const curtime = Math.floor(Date.now() / 1000);
        const sign = await this.calculateSign(text, salt, curtime);
        
        const params = new URLSearchParams({
          q: text,
          from: from,
          to: to,
          appKey: this.apiConfig.appKey,
          salt: salt,
          sign: sign,
          signType: 'v3',
          curtime: curtime.toString()
        });
        
        // 动态调整超时时间，随着重试次数增加而增加
        const timeout = 5000 + (retries * 2000);
        
        const startTime = performance.now();
        const response = await fetch(this.apiConfig.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString(),
          signal: AbortSignal.timeout(timeout)
        });
        const responseTime = performance.now() - startTime;
        
        if (!response.ok) {
          // 只有特定状态码才重试
          const retryableStatusCodes = [500, 502, 503, 504, 429, 520, 521, 522, 524];
          if (retryableStatusCodes.includes(response.status)) {
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.type = 'NETWORK_ERROR';
            error.statusCode = response.status;
            error.responseTime = responseTime;
            lastError = error;
            retries++;
            if (retries > maxRetries) break;
            
            // 记录重试日志
            this._logRetry(retries, error, text.length);
            
            // 指数退避，增加重试延迟
            await this._exponentialBackoff(retries, retryDelay);
            continue;
          }
          
          // 非重试状态码，直接抛出错误
          const error = new Error(`HTTP error! status: ${response.status}`);
          error.type = 'HTTP_ERROR';
          error.statusCode = response.status;
          error.responseTime = responseTime;
          throw error;
        }
        
        const data = await response.json();
        
        if (data.errorCode !== '0') {
          // 详细分类API错误
          const errorType = this._getErrorType(data.errorCode);
          const errorMessage = this.getErrorCodeMessage(data.errorCode);
          
          // 只有特定错误码才重试
          const retryableErrorCodes = ['110', '113', '206', '208', '209'];
          if (retryableErrorCodes.includes(data.errorCode)) {
            const error = new Error(`网易API错误: ${data.errorCode} - ${errorMessage}`);
            error.type = errorType;
            error.errorCode = data.errorCode;
            error.responseTime = responseTime;
            lastError = error;
            lastErrorCode = data.errorCode;
            retries++;
            if (retries > maxRetries) break;
            
            // 记录重试日志
            this._logRetry(retries, error, text.length);
            
            // 指数退避，增加重试延迟
            await this._exponentialBackoff(retries, retryDelay);
            continue;
          }
          
          // 非重试错误码，直接抛出错误
          const error = new Error(`网易API错误: ${data.errorCode} - ${errorMessage}`);
          error.type = errorType;
          error.errorCode = data.errorCode;
          error.responseTime = responseTime;
          throw error;
        }
        
        // 记录成功请求
        this._logSuccess(responseTime, text.length);
        
        return this.parseTranslationResult(data);
      } catch (error) {
        lastError = error;
        retries++;
        
        // 分类捕获到的错误
        if (!error.type) {
          if (error.name === 'AbortError') {
            error.type = 'TIMEOUT_ERROR';
          } else if (error.message.includes('NetworkError') || 
                     error.message.includes('fetch failed') ||
                     error.message.includes('Connection') ||
                     error.message.includes('timeout')) {
            error.type = 'NETWORK_ERROR';
          } else {
            error.type = 'UNKNOWN_ERROR';
          }
        }
        
        // 只对网络错误、超时错误或特定API错误进行重试
        const retryableErrorTypes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_ERROR', 'SERVER_ERROR'];
        if (!retryableErrorTypes.includes(error.type)) {
          break; // 非重试错误类型，不重试
        }
        
        if (retries > maxRetries) break;
        
        // 记录重试日志
        this._logRetry(retries, error, text.length);
        
        // 指数退避，增加重试延迟
        await this._exponentialBackoff(retries, retryDelay);
      }
    }
    
    // 记录最终失败日志
    this._logFinalError(lastError, lastErrorCode, text.length, retries - 1);
    
    // 包装最终错误，添加重试信息
    const finalError = new Error(`网易翻译API请求失败，已重试${retries - 1}次: ${lastError.message}`);
    finalError.originalError = lastError;
    finalError.retries = retries - 1;
    finalError.type = lastError.type;
    
    throw finalError;
  }
  
  /**
   * 获取错误类型
   * @param {string} errorCode - 错误码
   * @returns {string} 错误类型
   * @private
   */
  _getErrorType(errorCode) {
    const errorCodeNum = parseInt(errorCode, 10);
    
    if (errorCodeNum >= 101 && errorCodeNum <= 108) {
      return 'INVALID_REQUEST_ERROR';
    } else if (errorCodeNum === 109 || errorCodeNum === 110 || errorCodeNum === 112) {
      return 'RATE_LIMIT_ERROR';
    } else if (errorCodeNum === 111) {
      return 'ACCOUNT_ERROR';
    } else if (errorCodeNum === 113) {
      return 'SERVER_ERROR';
    } else if (errorCodeNum >= 114 && errorCodeNum <= 115) {
      return 'AUTH_ERROR';
    } else if (errorCodeNum >= 201 && errorCodeNum <= 220) {
      return 'REQUEST_ERROR';
    } else {
      return 'UNKNOWN_API_ERROR';
    }
  }
  
  /**
   * 指数退避
   * @param {number} retryCount - 当前重试次数
   * @param {number} baseDelay - 基础延迟（毫秒）
   * @returns {Promise<void>}
   * @private
   */
  async _exponentialBackoff(retryCount, baseDelay) {
    // 指数退避公式：baseDelay * (2 ^ (retryCount - 1)) + 随机延迟(0-1000ms)
    const delay = baseDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * 记录重试日志
   * @param {number} retryCount - 当前重试次数
   * @param {Error} error - 错误对象
   * @param {number} textLength - 文本长度
   * @private
   */
  _logRetry(retryCount, error, textLength) {
    console.warn(`网易翻译API重试 ${retryCount}:`, {
      errorType: error.type,
      errorCode: error.errorCode || 'N/A',
      message: error.message,
      textLength: textLength,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 记录成功日志
   * @param {number} responseTime - 响应时间
   * @param {number} textLength - 文本长度
   * @private
   */
  _logSuccess(responseTime, textLength) {
    console.debug('网易翻译API请求成功:', {
      responseTime: responseTime.toFixed(2),
      textLength: textLength,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 记录最终错误日志
   * @param {Error} error - 错误对象
   * @param {string} errorCode - 错误码
   * @param {number} textLength - 文本长度
   * @param {number} retryCount - 重试次数
   * @private
   */
  _logFinalError(error, errorCode, textLength, retryCount) {
    console.error(`网易翻译API最终失败，重试${retryCount}次:`, {
      errorType: error.type,
      errorCode: errorCode || error.errorCode || 'N/A',
      message: error.message,
      textLength: textLength,
      retries: retryCount,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 解析翻译结果
   */
  parseTranslationResult(data) {
    // 提取翻译结果
    const translation = data.translation && data.translation[0] ? data.translation[0] : '';
    
    // 提取词性信息
    let partOfSpeech = '';
    let phonetic = '';
    let definitions = [];
    let examples = [];
    
    // 从dict字段提取详细信息
    if (data.dict) {
      const ec = data.dict.ec;
      if (ec && ec.word && ec.word[0]) {
        const wordData = ec.word[0];
        
        // 获取音标
        if (wordData.usphone) {
          phonetic = `/usphone/`;
        } else if (wordData.ukphone) {
          phonetic = `/ukphone/`;
        }
        
        // 获取词性和释义
        if (wordData.trs) {
          definitions = wordData.trs.map(tr => {
            const pos = tr.pos ? tr.pos : '';
            const tran = tr.tran ? tr.tran : '';
            return { pos, tran };
          });
          
          // 获取第一个词性作为主要词性
          if (definitions.length > 0 && definitions[0].pos) {
            partOfSpeech = definitions[0].pos;
          }
        }
      }
    }
    
    // 从web字段提取例句
    if (data.web) {
      examples = data.web.map(item => {
        return {
          key: item.key,
          value: item.value.join('; ')
        };
      });
    }
    
    return {
      translation,
      partOfSpeech,
      phonetic,
      definitions,
      examples,
      originalData: data
    };
  }
  
  /**
   * 获取错误码对应的中文解释
   */
  getErrorCodeMessage(errorCode) {
    const errorMessages = {
      '101': '缺少必填的参数',
      '102': '不支持的语言类型',
      '103': '翻译文本过长',
      '104': '不支持的API类型',
      '105': '不支持的签名类型',
      '106': '不支持的响应格式',
      '107': '不支持的加密类型',
      '108': '应用ID无效',
      '109': '签名无效',
      '110': '访问频率受限',
      '111': '账户余额不足',
      '112': '长请求频率受限',
      '113': '服务端异常',
      '114': '客户端IP非法',
      '115': '无效的access token',
      '201': '解密失败',
      '202': '签名校验失败',
      '203': '访问IP数超过限制',
      '204': '无效的appKey',
      '205': '无效的请求',
      '206': '无效的签名',
      '207': '无效的salt',
      '208': '无效的签名类型',
      '209': '无效的curtime',
      '210': '无效的加密类型',
      '211': '无效的响应格式',
      '212': '无效的API类型',
      '213': '无效的语言类型',
      '214': '无效的文本长度',
      '215': '无效的请求频率',
      '216': '无效的账户余额',
      '217': '无效的长请求频率',
      '218': '无效的服务端状态',
      '219': '无效的客户端IP',
      '220': '无效的access token'
    };
    
    return errorMessages[errorCode] || `未知错误: ${errorCode}`;
  }
}

// 创建单例实例
const neteaseTranslateService = new NeteaseTranslateService();
window.neteaseTranslateService = neteaseTranslateService;