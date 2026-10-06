/**
 * Test Data Generators
 * Generates realistic test data for benchmarking
 */

/**
 * Common English words for realistic testing
 */
const COMMON_WORDS = [
  'hello', 'world', 'help', 'time', 'person', 'year', 'way', 'day', 'thing', 'man',
  'work', 'life', 'child', 'world', 'school', 'state', 'family', 'student', 'group', 'country',
  'problem', 'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question',
  'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money',
  'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word',
  'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power',
  'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name',
  'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face',
  'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party',
  'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher'
];

const POS_TAGS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'];

const CHINESE_TRANSLATIONS = [
  '你好', '世界', '帮助', '时间', '人', '年', '方式', '天', '事情', '男人',
  '工作', '生活', '孩子', '世界', '学校', '状态', '家庭', '学生', '组', '国家',
  '问题', '手', '部分', '地方', '案例', '周', '公司', '系统', '程序', '问题',
  '政府', '数字', '夜晚', '点', '家', '水', '房间', '母亲', '区域', '钱',
  '故事', '事实', '月', '很多', '权利', '研究', '书', '眼睛', '工作', '词',
  '商业', '问题', '侧面', '种类', '头', '房子', '服务', '朋友', '父亲', '力量',
  '小时', '游戏', '线', '结束', '成员', '法律', '汽车', '城市', '社区', '名字',
  '总统', '团队', '分钟', '想法', '孩子', '身体', '信息', '背部', '父母', '脸',
  '其他', '水平', '办公室', '门', '健康', '人', '艺术', '战争', '历史', '派对',
  '结果', '改变', '早晨', '原因', '研究', '女孩', '家伙', '时刻', '空气', '教师'
];

/**
 * Generate random words for testing
 * @param {number} count - Number of words to generate
 * @param {Object} options - Generation options
 * @returns {Array<Object>} Array of word objects
 */
function generateWords(count, options = {}) {
  const {
    useCommonWords = true,
    includeMetadata = true,
    randomUsageCount = true
  } = options;

  const words = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    let word;
    if (useCommonWords && i < COMMON_WORDS.length) {
      word = COMMON_WORDS[i];
    } else {
      // Generate random word
      word = useCommonWords 
        ? COMMON_WORDS[i % COMMON_WORDS.length] + (Math.floor(i / COMMON_WORDS.length) || '')
        : `word${i}`;
    }

    const wordData = {
      word,
      translation: useCommonWords && i < CHINESE_TRANSLATIONS.length
        ? CHINESE_TRANSLATIONS[i]
        : `翻译${i}`,
      pos: [POS_TAGS[Math.floor(Math.random() * POS_TAGS.length)]],
      usageCount: randomUsageCount ? Math.floor(Math.random() * 100) : i,
      lastUsed: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Random within 30 days
      difficulty: 1.0 + Math.random(), // 1.0 - 2.0
    };

    if (includeMetadata) {
      wordData.metadata = {
        addedDate: now - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000), // Random within 90 days
        source: 'test',
        context: [`Example sentence with ${word}.`]
      };
    }

    words.push(wordData);
  }

  return words;
}

/**
 * Generate review queue items
 * @param {number} count - Number of items to generate
 * @param {Object} options - Generation options
 * @returns {Array<Object>} Array of review items
 */
function generateReviewItems(count, options = {}) {
  const {
    useCommonWords = true,
    varyDifficulty = true,
    varyReviewCount = true
  } = options;

  const items = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const word = useCommonWords && i < COMMON_WORDS.length
      ? COMMON_WORDS[i]
      : `word${i}`;

    const reviewCount = varyReviewCount 
      ? Math.floor(Math.random() * 10)
      : 0;

    const difficulty = varyDifficulty
      ? 1.0 + Math.random() // 1.0 - 2.0
      : 1.0;

    // Random last review time within past 30 days
    const lastReviewTime = now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);

    items.push({
      word,
      lastReviewTime,
      reviewCount,
      difficulty,
      mastered: Math.random() < 0.1, // 10% mastered
      metadata: {
        correctCount: Math.floor(reviewCount * 0.7),
        incorrectCount: Math.floor(reviewCount * 0.3)
      }
    });
  }

  return items;
}

/**
 * Generate POS analysis results
 * @param {number} sentenceCount - Number of sentences to generate
 * @param {Object} options - Generation options
 * @returns {Array<Object>} Array of POS results
 */
function generatePOSResults(sentenceCount, options = {}) {
  const {
    wordsPerSentence = 8,
    useCommonWords = true,
    includeConfidence = true
  } = options;

  const results = [];
  const now = Date.now();

  for (let i = 0; i < sentenceCount; i++) {
    const words = [];
    const sentenceWords = [];

    for (let j = 0; j < wordsPerSentence; j++) {
      const word = useCommonWords && j < COMMON_WORDS.length
        ? COMMON_WORDS[(i * wordsPerSentence + j) % COMMON_WORDS.length]
        : `word${j}`;

      sentenceWords.push(word);

      const wordData = {
        word,
        pos: POS_TAGS[Math.floor(Math.random() * POS_TAGS.length)],
        lemma: word, // Simplified: lemma = word
      };

      if (includeConfidence) {
        wordData.confidence = 0.7 + Math.random() * 0.3; // 0.7 - 1.0
      }

      words.push(wordData);
    }

    const sentence = sentenceWords.join(' ') + '.';

    results.push({
      sentence,
      posResult: {
        sentence,
        words,
        source: 'test',
        timestamp: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    });
  }

  return results;
}

/**
 * Generate search queries for prefix testing
 * @param {Array<Object>} words - Word array to generate queries from
 * @param {number} queryCount - Number of queries to generate
 * @returns {Array<string>} Array of search prefixes
 */
function generateSearchQueries(words, queryCount) {
  const queries = [];
  const uniqueWords = [...new Set(words.map(w => w.word))];

  for (let i = 0; i < queryCount; i++) {
    const word = uniqueWords[Math.floor(Math.random() * uniqueWords.length)];
    // Generate prefix of random length (1-4 characters)
    const prefixLength = 1 + Math.floor(Math.random() * Math.min(4, word.length));
    const prefix = word.substring(0, prefixLength);
    queries.push(prefix);
  }

  return queries;
}

/**
 * Generate batch operations for testing
 * @param {number} batchSize - Size of each batch
 * @param {number} batchCount - Number of batches
 * @returns {Array<Array<Object>>} Array of batches
 */
function generateBatches(batchSize, batchCount) {
  const batches = [];

  for (let i = 0; i < batchCount; i++) {
    const batch = generateWords(batchSize, {
      useCommonWords: false,
      includeMetadata: false
    });
    batches.push(batch);
  }

  return batches;
}

/**
 * Generate dataset with specific characteristics for edge case testing
 * @param {string} type - Dataset type ('small', 'medium', 'large', 'huge')
 * @returns {Object} Dataset with words, reviews, and POS results
 */
function generateDataset(type) {
  const configs = {
    small: { words: 100, reviews: 50, sentences: 50 },
    medium: { words: 1000, reviews: 500, sentences: 500 },
    large: { words: 10000, reviews: 1000, sentences: 1000 },
    huge: { words: 50000, reviews: 5000, sentences: 5000 }
  };

  const config = configs[type] || configs.medium;

  return {
    type,
    words: generateWords(config.words),
    reviewItems: generateReviewItems(config.reviews),
    posResults: generatePOSResults(config.sentences),
    searchQueries: generateSearchQueries(
      generateWords(config.words),
      Math.min(100, config.words / 10)
    )
  };
}

/**
 * Create a word lookup function for testing
 * @param {Array<Object>} words - Word array
 * @returns {Function} Lookup function
 */
function createWordLookup(words) {
  return (target) => {
    return words.find(w => w.word.toLowerCase() === target.toLowerCase());
  };
}

/**
 * Create a prefix filter function for testing
 * @param {Array<Object>} words - Word array
 * @returns {Function} Filter function
 */
function createPrefixFilter(words) {
  return (prefix) => {
    const lowerPrefix = prefix.toLowerCase();
    return words.filter(w => w.word.toLowerCase().startsWith(lowerPrefix));
  };
}

// Export for ES modules and CommonJS
module.exports = {
  generateWords,
  generateReviewItems,
  generatePOSResults,
  generateSearchQueries,
  generateBatches,
  generateDataset,
  createWordLookup,
  createPrefixFilter,
  COMMON_WORDS,
  POS_TAGS
};

