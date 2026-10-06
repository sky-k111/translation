/**
 * 单词复杂度计算器
 * 基于单词本身的特性计算难度，而非学习表现
 * 
 * 复杂度因素权重：
 * - 单词长度: 30%
 * - 音节数量: 25%
 * - 词频等级: 25%
 * - 词性复杂度: 20%
 */

// 常见词汇表（高频词，复杂度低）
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
]);

// 中等词汇表
const INTERMEDIATE_WORDS = new Set([
  'important', 'different', 'another', 'question', 'government', 'company', 'system', 'program',
  'problem', 'however', 'business', 'development', 'information', 'community', 'experience',
  'education', 'national', 'political', 'economic', 'social', 'international', 'public',
  'research', 'service', 'university', 'management', 'technology', 'environment', 'available'
]);

// 词性复杂度映射
const POS_COMPLEXITY = {
  'noun': 1,
  'verb': 2,
  'adjective': 2,
  'adverb': 3,
  'preposition': 1,
  'conjunction': 1,
  'pronoun': 1,
  'interjection': 1,
  'determiner': 1,
  'unknown': 2
};

/**
 * 估算单词音节数
 * @param {string} word - 单词
 * @returns {number} 音节数
 */
function estimateSyllables(word) {
  if (!word || word.length === 0) return 1;
  
  word = word.toLowerCase().trim();
  
  // 特殊情况处理
  if (word.length <= 3) return 1;
  
  // 计算元音组数量
  const vowelGroups = word.match(/[aeiouy]+/gi);
  let count = vowelGroups ? vowelGroups.length : 1;
  
  // 调整规则
  // 结尾的 e 通常不发音
  if (word.endsWith('e') && !word.endsWith('le')) {
    count = Math.max(1, count - 1);
  }
  
  // 结尾的 ed 通常不增加音节（除非前面是 t 或 d）
  if (word.endsWith('ed') && !word.endsWith('ted') && !word.endsWith('ded')) {
    count = Math.max(1, count - 1);
  }
  
  // 结尾的 es 通常不增加音节
  if (word.endsWith('es') && !word.endsWith('ses') && !word.endsWith('zes')) {
    count = Math.max(1, count - 1);
  }
  
  return Math.max(1, count);
}

/**
 * 获取词频等级
 * @param {string} word - 单词
 * @returns {string} 词频等级: 'common' | 'intermediate' | 'advanced' | 'rare'
 */
function getFrequencyLevel(word) {
  const lowerWord = word.toLowerCase();
  
  if (COMMON_WORDS.has(lowerWord)) {
    return 'common';
  }
  
  if (INTERMEDIATE_WORDS.has(lowerWord)) {
    return 'intermediate';
  }
  
  // 基于单词长度和特征推断
  if (lowerWord.length <= 4) {
    return 'common';
  }
  
  if (lowerWord.length <= 7) {
    return 'intermediate';
  }
  
  if (lowerWord.length <= 10) {
    return 'advanced';
  }
  
  return 'rare';
}

/**
 * 计算单词复杂度
 * @param {Object} wordData - 单词数据对象
 * @returns {Object} 复杂度信息
 */
function calculateComplexity(wordData) {
  const word = (wordData.word || wordData.key || '').toLowerCase();
  const partOfSpeech = wordData.partOfSpeech || 'unknown';
  
  if (!word) {
    return {
      level: 1,
      wordLength: 0,
      syllables: 0,
      frequency: 'unknown',
      score: 0
    };
  }
  
  // 1. 单词长度分数 (0-100)
  const wordLength = word.length;
  let lengthScore;
  if (wordLength <= 4) {
    lengthScore = 20;
  } else if (wordLength <= 6) {
    lengthScore = 40;
  } else if (wordLength <= 8) {
    lengthScore = 60;
  } else if (wordLength <= 10) {
    lengthScore = 80;
  } else {
    lengthScore = 100;
  }
  
  // 2. 音节数分数 (0-100)
  const syllables = estimateSyllables(word);
  let syllableScore;
  if (syllables <= 1) {
    syllableScore = 20;
  } else if (syllables <= 2) {
    syllableScore = 40;
  } else if (syllables <= 3) {
    syllableScore = 60;
  } else if (syllables <= 4) {
    syllableScore = 80;
  } else {
    syllableScore = 100;
  }
  
  // 3. 词频分数 (0-100)
  const frequency = getFrequencyLevel(word);
  const frequencyScores = {
    'common': 20,
    'intermediate': 50,
    'advanced': 75,
    'rare': 100,
    'unknown': 50
  };
  const frequencyScore = frequencyScores[frequency] || 50;
  
  // 4. 词性分数 (0-100)
  const posComplexity = POS_COMPLEXITY[partOfSpeech.toLowerCase()] || 2;
  const posScore = posComplexity * 33.33;
  
  // 计算加权总分
  const totalScore = Math.round(
    lengthScore * 0.30 +
    syllableScore * 0.25 +
    frequencyScore * 0.25 +
    posScore * 0.20
  );
  
  // 转换为 1-5 的等级
  let level;
  if (totalScore <= 30) {
    level = 1;
  } else if (totalScore <= 45) {
    level = 2;
  } else if (totalScore <= 60) {
    level = 3;
  } else if (totalScore <= 75) {
    level = 4;
  } else {
    level = 5;
  }
  
  return {
    level,
    wordLength,
    syllables,
    frequency,
    score: totalScore
  };
}

/**
 * 批量计算单词复杂度
 * @param {Object} wordsData - 单词数据对象集合
 * @returns {Object} 带复杂度的单词数据
 */
function calculateBatchComplexity(wordsData) {
  const result = {};
  
  for (const [key, wordData] of Object.entries(wordsData)) {
    // 如果已有复杂度数据，跳过
    if (wordData.complexity && wordData.complexity.level) {
      result[key] = wordData;
      continue;
    }
    
    result[key] = {
      ...wordData,
      complexity: calculateComplexity(wordData)
    };
  }
  
  return result;
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.ComplexityCalculator = {
    calculateComplexity,
    calculateBatchComplexity,
    estimateSyllables,
    getFrequencyLevel
  };
}

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateComplexity,
    calculateBatchComplexity,
    estimateSyllables,
    getFrequencyLevel
  };
}
