/**
 * Service Worker for Learning Notes App
 * 处理离线缓存、数据同步和推送通知
 */

const CACHE_NAME = 'learning-notes-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/themes.css',
    '/css/mobile.css',
    '/js/lib/marked.min.js',
    '/js/utils/storage.js',
    '/js/utils/helpers.js',
    '/js/models/Note.js',
    '/js/models/Tag.js',
    '/js/models/Pomodoro.js',
    '/js/models/AnkiCard.js',
    '/js/controllers/NoteController.js',
    '/js/controllers/PomodoroController.js',
    '/js/controllers/AnkiController.js',
    '/js/controllers/StatsController.js',
    '/js/controllers/ThemeController.js',
    '/js/controllers/SearchController.js',
    '/js/controllers/MobileController.js',
    '/js/PomodoroUI.js',
    '/js/AnkiUI.js',
    '/js/StatsUI.js',
    '/js/ThemeUI.js',
    '/js/TimelineUI.js',
    '/js/app.js',
    '/favicon.svg',
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/manifest.json'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // 立即激活
                return self.skipWaiting();
            })
    );
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        // 清理旧缓存
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    // 立即控制所有客户端
    event.waitUntil(self.clients.claim());
});

// 处理fetch事件
self.addEventListener('fetch', (event) => {
    // 跳过非GET请求
    if (event.request.method !== 'GET') {
        return;
    }

    // 跳过chrome-extension://请求
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 如果缓存中有，返回缓存版本
                if (response) {
                    return response;
                }

                // 否则从网络获取
                return fetch(event.request).then((response) => {
                    // 检查响应是否有效
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // 克隆响应，因为响应只能被读取一次
                    const responseToCache = response.clone();

                    // 将响应添加到缓存
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                }).catch((error) => {
                    console.error('Fetch error:', error);
                    // 如果网络请求失败，返回离线页面
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                });
            })
    );
});

// 处理消息事件
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'sync-data':
            event.waitUntil(syncData(data));
            break;
        case 'cache-resource':
            event.waitUntil(cacheResource(data));
            break;
        case 'clear-cache':
            event.waitUntil(clearCache());
            break;
        case 'push-notification':
            event.waitUntil(showNotification(data));
            break;
        case 'schedule-review':
            event.waitUntil(scheduleReview(data));
            break;
        case 'backup-data':
            event.waitUntil(backupData(data));
            break;
        default:
            console.log('Unknown message type:', type);
    }
});

// 同步数据
async function syncData(data) {
    try {
        // 检查网络连接
        const response = await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            // 通知客户端同步成功
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'sync-complete',
                        data: result
                    });
                });
            });
        } else {
            throw new Error('Sync failed');
        }
    } catch (error) {
        console.error('Sync error:', error);
        // 将数据保存到本地待同步队列
        const pendingSync = self.registration.sync;
        if (pendingSync) {
            await pendingSync.register('sync-queue');
        }
    }
}

// 缓存资源
async function cacheResource(data) {
    const { url, response } = data;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, response);
}

// 清理缓存
async function clearCache() {
    await caches.delete(CACHE_NAME);
    // 重新缓存核心资源
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urlsToCache);
}

// 显示通知
async function showNotification(data) {
    const { title, options } = data;
    await self.registration.showNotification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options
    });
}

// 安排复习提醒
async function scheduleReview(data) {
    const { cardId, timestamp } = data;
    const delay = timestamp - Date.now();

    if (delay > 0) {
        setTimeout(() => {
            self.registration.showNotification('🃏 复习提醒', {
                body: '有卡片需要复习了！',
                data: { cardId },
                actions: [
                    { action: 'review', title: '开始复习' },
                    { action: 'snooze', title: '稍后提醒' }
                ]
            });
        }, delay);
    }
}

// 备份数据
async function backupData(data) {
    const { userId, data: backupData } = data;
    const timestamp = new Date().toISOString();
    const filename = `backup_${userId}_${timestamp}.json`;

    // 将备份保存到IndexedDB
    const db = await openDatabase('BackupsDB', 1);
    await db.put('backups', {
        filename,
        data: backupData,
        timestamp,
        userId
    });

    // 如果超过7天，清理旧备份
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldBackups = await db.getAllFromIndex('backups', 'timestamp', IDBKeyRange.upperBound(sevenDaysAgo.toISOString()));
    for (const backup of oldBackups) {
        await db.delete('backups', backup.filename);
    }
}

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const { action, data } = event;
    const url = self.location.origin;

    event.waitUntil(
        clients.matchAll({
            type: 'window'
        }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// 处理推送事件
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || '您有新的学习提醒',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: data,
        actions: [
            { action: 'open', title: '打开应用' },
            { action: 'dismiss', title: '忽略' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '学习笔记提醒', options)
    );
});

// 处理后台同步
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-queue') {
        event.waitUntil(syncPendingData());
    }
});

// 同步待处理数据
async function syncPendingData() {
    try {
        // 从IndexedDB获取待同步数据
        const db = await openDatabase('SyncQueueDB', 1);
        const pendingData = await db.getAll('sync-queue');

        for (const item of pendingData) {
            try {
                await syncData(item);
                // 同步成功后删除
                await db.delete('sync-queue', item.id);
            } catch (error) {
                console.error('Sync item failed:', error);
                // 增加重试次数
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount >= 3) {
                    // 超过3次重试，删除数据
                    await db.delete('sync-queue', item.id);
                } else {
                    await db.put('sync-queue', item);
                }
            }
        }
    } catch (error) {
        console.error('Background sync error:', error);
    }
}

// IndexedDB操作
function openDatabase(name, version) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('backups')) {
                db.createObjectStore('backups', { keyPath: 'filename' });
            }

            if (!db.objectStoreNames.contains('sync-queue')) {
                db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// 定期清理缓存
self.addEventListener('periodic-sync', (event) => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(cleanupOldCache());
    }
});

async function cleanupOldCache() {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
            const date = response.headers.get('date');
            if (date) {
                const cacheDate = new Date(date);
                const now = new Date();
                const age = now - cacheDate;

                // 清理超过7天的缓存
                if (age > 7 * 24 * 60 * 60 * 1000) {
                    await cache.delete(request);
                }
            }
        }
    }
}

// 处理客户端生命周期
self.addEventListener('clientchange', (event) => {
    console.log('Client changed:', event.clientId);
});

// 错误处理
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

// 未处理的Promise拒绝
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});