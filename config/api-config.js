/**
 * 单词翻译助手 - API配置文件
 * 集中管理所有第三方API的配置信息
 * 使用全局变量格式，适用于importScripts导入
 */

// =========================
// 网易有道翻译/词典 API 配置
// =========================

// API 凭据保持为空，由用户在扩展设置中配置。
// 请勿将真实密钥提交到公开仓库。
self.DEFAULT_YOUDAO_APP_KEY = '';
self.DEFAULT_YOUDAO_APP_SECRET = '';

// 有道API请求URL
self.YOUDAO_API_URL = 'https://openapi.youdao.com/api';

// =========================
// AI 翻译 API 配置
// =========================

self.AI_DEFAULTS = {
  enabled: true, // 默认开启，但在没有 Key 时会自动回退
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '', // 用户需自行配置
  model: 'gpt-3.5-turbo',
  temperature: 0.3
};
