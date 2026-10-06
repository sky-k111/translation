/**
 * Service Worker for Translation Plugin
 * 提供离线缓存和后台同步功能
 */

const CACHE_NAME = 'translation-sw-v1';
const API_CACHE_NAME = 'translation-api-sw-v1';

// 需要缓存的静态资源
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/popup/popup.html',
  '/popup/dashboard.html'
];

// 安装事件
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 获取事件 - 实现缓存策略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API请求缓存策略
  if (url.pathname.includes('/api/') || url.hostname.includes('api.groq.com')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // 缓存成功的响应
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });

          // 返回缓存或网络响应
          return response || fetchPromise;
        });
      })
    );
  }
  // 静态资源缓存策略
  else if (STATIC_CACHE_URLS.some(staticUrl => url.pathname.endsWith(staticUrl))) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
  // 其他请求直接网络
  else {
    event.respondWith(fetch(event.request));
  }
});

// 后台同步事件（用于数据同步）
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 后台同步函数
async function doBackgroundSync() {
  console.log('Performing background sync...');
  try {
    // 这里可以实现数据同步逻辑
    // 例如：同步未发送的学习记录到服务器

    // 通知客户端同步完成
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// 消息事件 - 处理来自主线程的消息
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_TRANSLATION':
      // 缓存翻译结果
      event.waitUntil(cacheTranslation(data.text, data.result));
      break;

    case 'CLEAR_CACHE':
      // 清理缓存
      event.waitUntil(clearAllCaches());
      break;

    case 'GET_CACHE_STATS':
      // 获取缓存统计
      event.waitUntil(getCacheStats(event));
      break;
  }
});

// 缓存翻译结果
async function cacheTranslation(text, result) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `translate_${btoa(text).slice(0, 50)}`;
  const response = new Response(JSON.stringify({
    text,
    result,
    timestamp: Date.now()
  }));

  await cache.put(cacheKey, response);
}

// 清理所有缓存
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// 获取缓存统计
async function getCacheStats(event) {
  const [mainCache, apiCache] = await Promise.all([
    caches.open(CACHE_NAME),
    caches.open(API_CACHE_NAME)
  ]);

  const [mainKeys, apiKeys] = await Promise.all([
    mainCache.keys(),
    apiCache.keys()
  ]);

  event.ports[0].postMessage({
    translationCacheSize: mainKeys.length,
    apiCacheSize: apiKeys.length
  });
}