// 定义缓存名称，修改版本号可强制更新缓存
const CACHE_NAME = 'stallhealth-v1';

// 定义需要离线缓存的文件列表
// 注意：Gitee Pages 部署时请确保这些文件真实存在
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// 1. 安装阶段：缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all: app shell and content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // 强制立即激活，不等待
  );
});

// 2. 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管所有页面
  );
});

// 3. 拦截请求：优先使用缓存（Stale-While-Revalidate 策略更适合动态内容，但为了纯静态离线，这里使用 Cache First 策略）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果缓存中有，直接返回缓存
        if (response) {
          return response;
        }
        
        // 如果缓存没有，去网络请求
        return fetch(event.request).then(
          (response) => {
            // 检查是否是有效的响应
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 将新请求到的资源放入缓存（以便下次离线访问）
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // 如果网络也失败了（完全离线且没缓存），可以返回一个自定义的离线页面
          // 这里简单处理，暂不返回 fallback
          console.log('[Service Worker] Fetch failed (Offline)');
        });
      })
  );
});