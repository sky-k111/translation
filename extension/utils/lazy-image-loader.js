/**
 * 图片懒加载器 - 高性能延迟加载
 * 使用 IntersectionObserver API 实现
 */
class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.01,
      placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
      ...options
    };
    
    this.imageObserver = null;
    this.loadedImages = new Set();
    this.init();
  }
  
  init() {
    if (!('IntersectionObserver' in window)) {
      this.loadAllImages();
      return;
    }
    
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.imageObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold
    });
  }
  
  loadImage(img) {
    const src = img.dataset.src;
    if (!src || this.loadedImages.has(src)) return;
    
    const preloadImg = new Image();
    
    preloadImg.onload = () => {
      img.src = src;
      img.classList.add('lazy-loaded');
      img.classList.remove('lazy-loading');
      this.loadedImages.add(src);
      img.dispatchEvent(new CustomEvent('lazyLoaded', { detail: { src } }));
    };
    
    preloadImg.onerror = () => {
      img.classList.add('lazy-error');
      img.dispatchEvent(new CustomEvent('lazyError', { detail: { src } }));
    };
    
    preloadImg.src = src;
  }
  
  observe(img) {
    if (!img.dataset.src) return;
    if (!img.src || img.src === window.location.href) {
      img.src = this.options.placeholder;
    }
    img.classList.add('lazy-loading');
    this.imageObserver?.observe(img);
  }
  
  observeAll() {
    document.querySelectorAll('img[data-src]').forEach(img => this.observe(img));
  }
  
  loadAllImages() {
    document.querySelectorAll('img[data-src]').forEach(img => this.loadImage(img));
  }
  
  disconnect() {
    this.imageObserver?.disconnect();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LazyImageLoader;
} else {
  window.LazyImageLoader = LazyImageLoader;
}
