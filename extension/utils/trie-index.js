/**
 * Trie树实现 - 用于单词搜索索引
 */
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.wordData = null; // 存储单词的完整数据
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * 插入单词到Trie树
   * @param {string} word - 要插入的单词
   * @param {Object} data - 单词相关数据
   */
  insert(word, data) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.wordData = data;
  }

  /**
   * 搜索单词
   * @param {string} word - 要搜索的单词
   * @returns {Object|null} 单词数据或null
   */
  search(word) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children[char]) {
        return null;
      }
      node = node.children[char];
    }
    return node.isEndOfWord ? node.wordData : null;
  }

  /**
   * 前缀搜索
   * @param {string} prefix - 前缀
   * @returns {Array} 匹配的单词数据数组
   */
  startsWith(prefix) {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    return this._collectAllWords(node, prefix);
  }

  /**
   * 收集节点下的所有单词
   * @param {TrieNode} node - 起始节点
   * @param {string} currentPrefix - 当前前缀
   * @returns {Array} 单词数据数组
   */
  _collectAllWords(node, currentPrefix) {
    const results = [];
    if (node.isEndOfWord) {
      results.push(node.wordData);
    }
    for (const char in node.children) {
      results.push(...this._collectAllWords(node.children[char], currentPrefix + char));
    }
    return results;
  }

  /**
   * 获取Trie树大小
   * @returns {number} 节点数量
   */
  size() {
    return this._countNodes(this.root);
  }

  /**
   * 递归计数节点
   * @param {TrieNode} node - 节点
   * @returns {number} 节点数量
   */
  _countNodes(node) {
    let count = 1; // 当前节点
    for (const child in node.children) {
      count += this._countNodes(node.children[child]);
    }
    return count;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Trie };
} else if (typeof window !== 'undefined') {
  window.Trie = Trie;
} else if (typeof self !== 'undefined') {
  self.Trie = Trie;
}
