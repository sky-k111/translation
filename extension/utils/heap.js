/**
 * 最小堆实现 - 用于复习队列优先级管理
 */
class MinHeap {
  constructor(compareFn = (a, b) => a - b) {
    this.heap = [];
    this.compare = compareFn;
  }

  /**
   * 插入元素
   * @param {*} element - 要插入的元素
   */
  insert(element) {
    this.heap.push(element);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * 移除并返回最小元素
   * @returns {*} 最小元素
   */
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return min;
  }

  /**
   * 查看最小元素（不移除）
   * @returns {*} 最小元素
   */
  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /**
   * 获取堆大小
   * @returns {number} 堆中元素数量
   */
  size() {
    return this.heap.length;
  }

  /**
   * 检查堆是否为空
   * @returns {boolean} 是否为空
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * 清空堆
   */
  clear() {
    this.heap = [];
  }

  /**
   * 上浮操作
   * @param {number} index - 要上浮的元素索引
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;

      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  /**
   * 下沉操作
   * @param {number} index - 要下沉的元素索引
   */
  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

// 复习队列专用堆（按nextReviewTime排序）
class ReviewQueueHeap extends MinHeap {
  constructor() {
    super((a, b) => {
      const timeA = a.nextReviewTime || 0;
      const timeB = b.nextReviewTime || 0;
      return timeA - timeB;
    });
  }

  /**
   * 添加复习项
   * @param {Object} reviewItem - 复习项 {word, nextReviewTime, ...}
   */
  addReviewItem(reviewItem) {
    this.insert(reviewItem);
  }

  /**
   * 获取下一个需要复习的项
   * @returns {Object|null} 复习项
   */
  getNextReview() {
    const now = Date.now();
    const item = this.peek();
    if (item && (item.nextReviewTime || 0) <= now) {
      return this.extractMin();
    }
    return null;
  }

  /**
   * 更新复习项的时间
   * @param {string} word - 单词
   * @param {number} newTime - 新时间
   */
  updateReviewTime(word, newTime) {
    // 由于堆不支持直接更新，需要重建
    const items = [];
    while (!this.isEmpty()) {
      const item = this.extractMin();
      if (item.word === word) {
        item.nextReviewTime = newTime;
      }
      items.push(item);
    }
    items.forEach(item => this.insert(item));
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MinHeap, ReviewQueueHeap };
} else if (typeof window !== 'undefined') {
  window.MinHeap = MinHeap;
  window.ReviewQueueHeap = ReviewQueueHeap;
} else if (typeof self !== 'undefined') {
  self.MinHeap = MinHeap;
  self.ReviewQueueHeap = ReviewQueueHeap;
}