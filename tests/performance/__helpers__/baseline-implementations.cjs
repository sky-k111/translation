/**
 * Baseline Implementations
 * Simple, unoptimized algorithms for performance comparison
 */

/**
 * Linear Search - O(n) word lookup
 * Baseline for Trie comparison
 */
class LinearSearchIndex {
  constructor() {
    this.words = [];
  }

  buildIndex(words) {
    this.words = [...words];
  }

  find(target) {
    const lowerTarget = target.toLowerCase();
    for (const word of this.words) {
      if (word.word.toLowerCase() === lowerTarget) {
        return word;
      }
    }
    return null;
  }

  search(prefix) {
    const lowerPrefix = prefix.toLowerCase();
    const results = [];
    for (const word of this.words) {
      if (word.word.toLowerCase().startsWith(lowerPrefix)) {
        results.push(word);
      }
    }
    return results;
  }

  add(wordData) {
    this.words.push(wordData);
  }

  remove(target) {
    const index = this.words.findIndex(w => w.word.toLowerCase() === target.toLowerCase());
    if (index !== -1) {
      this.words.splice(index, 1);
      return true;
    }
    return false;
  }

  getStats() {
    return {
      wordCount: this.words.length,
      implementation: 'linear-search'
    };
  }
}

/**
 * Array Sort Queue - O(n log n) priority queue
 * Baseline for MinHeap comparison
 */
class ArraySortQueue {
  constructor() {
    this.items = [];
  }

  addWord(wordData) {
    const priority = this.calculatePriority(wordData);
    const item = {
      ...wordData,
      priority,
      nextReviewTime: this._calculateNextReviewTime(wordData)
    };
    this.items.push(item);
  }

  batchAdd(words) {
    words.forEach(word => this.addWord(word));
  }

  getNextReview() {
    if (this.items.length === 0) {
      return null;
    }

    // Sort by priority (expensive O(n log n) operation)
    this.items.sort((a, b) => a.priority - b.priority);

    const now = Date.now();
    const top = this.items[0];

    if (top && top.nextReviewTime <= now && !top.mastered) {
      return this.items.shift();
    }

    return null;
  }

  updateAfterReview(word, correct) {
    // Remove old item
    const index = this.items.findIndex(item => item.word === word);
    let oldItem = null;
    if (index !== -1) {
      oldItem = this.items.splice(index, 1)[0];
    }

    // Calculate new values
    const now = Date.now();
    let reviewCount = oldItem ? oldItem.reviewCount : 0;
    let difficulty = oldItem ? oldItem.difficulty : 1.0;

    if (correct) {
      reviewCount++;
      difficulty = Math.max(1.0, difficulty - 0.1);
    } else {
      difficulty = Math.min(2.0, difficulty + 0.2);
    }

    // Add back with updated values
    this.addWord({
      word,
      lastReviewTime: now,
      reviewCount,
      difficulty
    });
  }

  calculatePriority(wordData) {
    const now = Date.now();
    const lastReviewTime = wordData.lastReviewTime || now;
    const reviewCount = wordData.reviewCount || 0;
    const difficulty = wordData.difficulty || 1.0;
    const mastered = wordData.mastered || false;

    if (mastered) {
      return Infinity;
    }

    if (reviewCount === 0) {
      return 1.0;
    }

    const daysSinceReview = (now - lastReviewTime) / (24 * 60 * 60 * 1000);
    return -daysSinceReview / (Math.pow(2, reviewCount) * difficulty);
  }

  _calculateNextReviewTime(wordData) {
    const now = Date.now();
    const reviewCount = wordData.reviewCount || 0;
    const difficulty = wordData.difficulty || 1.0;
    const mastered = wordData.mastered || false;

    if (mastered) {
      return now + 365 * 24 * 60 * 60 * 1000;
    }

    if (reviewCount === 0) {
      return now;
    }

    const intervalDays = Math.pow(2, reviewCount) / difficulty;
    return now + intervalDays * 24 * 60 * 60 * 1000;
  }

  getStats() {
    return {
      totalWords: this.items.length,
      implementation: 'array-sort'
    };
  }

  reset() {
    this.items = [];
  }
}

/**
 * Iteration Search - O(n) POS lookup
 * Baseline for hash index comparison
 */
class IterationPOSIndex {
  constructor() {
    this.results = [];
  }

  addResult(sentence, posResult) {
    const normalizedSentence = sentence.trim().toLowerCase();
    
    // Remove old entry if exists
    const index = this.results.findIndex(r => r.sentence === normalizedSentence);
    if (index !== -1) {
      this.results.splice(index, 1);
    }

    // Add new entry
    this.results.push({
      sentence: normalizedSentence,
      posResult,
      timestamp: Date.now(),
      words: (posResult.words || []).map(w => w.word.toLowerCase())
    });
  }

  getPOSForWord(word) {
    const normalizedWord = word.toLowerCase();
    const matches = [];

    // Iterate through all results (expensive O(n) operation)
    for (const result of this.results) {
      if (result.words.includes(normalizedWord)) {
        matches.push({
          sentence: result.sentence,
          posResult: result.posResult,
          timestamp: result.timestamp
        });
      }
    }

    return matches;
  }

  getPOSForSentence(sentence) {
    const normalizedSentence = sentence.trim().toLowerCase();
    
    // Linear search through results
    for (const result of this.results) {
      if (result.sentence === normalizedSentence) {
        return result.posResult;
      }
    }

    return null;
  }

  getWordPOSStats(word) {
    const normalizedWord = word.toLowerCase();
    const stats = {};
    let total = 0;

    // Iterate through all results and count POS tags
    for (const result of this.results) {
      const words = result.posResult.words || [];
      for (const wordData of words) {
        if (wordData.word.toLowerCase() === normalizedWord) {
          const pos = wordData.pos;
          stats[pos] = (stats[pos] || 0) + 1;
          total++;
        }
      }
    }

    // Find most common
    let mostCommon = null;
    let maxCount = 0;
    for (const [pos, count] of Object.entries(stats)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = pos;
      }
    }

    return {
      counts: stats,
      mostCommon,
      total
    };
  }

  cleanup(maxAge) {
    const now = Date.now();
    const cutoffTime = now - maxAge;
    
    const before = this.results.length;
    this.results = this.results.filter(r => r.timestamp >= cutoffTime);
    const after = this.results.length;
    
    return before - after;
  }

  getStats() {
    return {
      sentenceCount: this.results.length,
      implementation: 'iteration'
    };
  }

  reset() {
    this.results = [];
  }
}

/**
 * Simple Map-based index (better than iteration but worse than optimized)
 * Useful for showing incremental improvements
 */
class SimpleMapIndex {
  constructor() {
    this.wordMap = new Map();
  }

  buildIndex(words) {
    this.wordMap.clear();
    for (const word of words) {
      this.wordMap.set(word.word.toLowerCase(), word);
    }
  }

  find(target) {
    return this.wordMap.get(target.toLowerCase()) || null;
  }

  search(prefix) {
    const lowerPrefix = prefix.toLowerCase();
    const results = [];
    
    // Still O(n) but with faster iteration
    for (const [word, data] of this.wordMap.entries()) {
      if (word.startsWith(lowerPrefix)) {
        results.push(data);
      }
    }
    
    return results;
  }

  add(wordData) {
    this.wordMap.set(wordData.word.toLowerCase(), wordData);
  }

  remove(target) {
    return this.wordMap.delete(target.toLowerCase());
  }

  getStats() {
    return {
      wordCount: this.wordMap.size,
      implementation: 'simple-map'
    };
  }
}

// Export for ES modules and CommonJS
module.exports = {
  LinearSearchIndex,
  ArraySortQueue,
  IterationPOSIndex,
  SimpleMapIndex
};

