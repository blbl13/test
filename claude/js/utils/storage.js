/**
 * 存储管理模块
 * 使用localStorage和IndexedDB进行数据持久化
 */

class StorageManager {
    constructor() {
        this.localStorage = window.localStorage;
        this.dbName = 'NoteDB';
        this.dbVersion = 1;
        this.db = null;
        this.initIndexedDB();
    }

    // 初始化IndexedDB
    initIndexedDB() {
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported, falling back to localStorage');
            return;
        }

        const request = window.indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('Database opened successfully');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 创建笔记存储对象
            if (!db.objectStoreNames.contains('notes')) {
                const notesStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('title', 'title', { unique: false });
                notesStore.createIndex('tags', 'tags', { unique: false });
                notesStore.createIndex('createdAt', 'createdAt', { unique: false });
                notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            // 创建标签存储对象
            if (!db.objectStoreNames.contains('tags')) {
                const tagsStore = db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true });
                tagsStore.createIndex('name', 'name', { unique: true });
            }

            // 创建番茄钟存储对象
            if (!db.objectStoreNames.contains('pomodoros')) {
                const pomodoroStore = db.createObjectStore('pomodoros', { keyPath: 'id', autoIncrement: true });
                pomodoroStore.createIndex('date', 'date', { unique: false });
                pomodoroStore.createIndex('duration', 'duration', { unique: false });
            }

            // 创建Anki卡片存储对象
            if (!db.objectStoreNames.contains('ankiCards')) {
                const ankiStore = db.createObjectStore('ankiCards', { keyPath: 'id', autoIncrement: true });
                ankiStore.createIndex('noteId', 'noteId', { unique: false });
                ankiStore.createIndex('nextReview', 'nextReview', { unique: false });
                ankiStore.createIndex('lastReviewed', 'lastReviewed', { unique: false });
            }

            // 创建统计数据存储对象
            if (!db.objectStoreNames.contains('stats')) {
                const statsStore = db.createObjectStore('stats', { keyPath: 'id', autoIncrement: true });
                statsStore.createIndex('type', 'type', { unique: false });
                statsStore.createIndex('date', 'date', { unique: false });
            }
        };
    }

    // 通用CRUD操作
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                const key = `${storeName}_${Date.now()}`;
                this.localStorage.setItem(key, JSON.stringify(data));
                resolve(key);
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                const data = this.localStorage.getItem(`${storeName}_${id}`);
                resolve(data ? JSON.parse(data) : null);
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                const items = [];
                for (let i = 0; i < this.localStorage.length; i++) {
                    const key = this.localStorage.key(i);
                    if (key.startsWith(`${storeName}_`)) {
                        items.push(JSON.parse(this.localStorage.getItem(key)));
                    }
                }
                resolve(items);
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                const key = `${storeName}_${data.id}`;
                this.localStorage.setItem(key, JSON.stringify(data));
                resolve();
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = (event) => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                this.localStorage.removeItem(`${storeName}_${id}`);
                resolve();
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = (event) => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 搜索功能
    async search(storeName, indexName, query) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                this.getAll(storeName).then(items => {
                    const results = items.filter(item => {
                        const fieldValue = item[indexName];
                        return fieldValue && fieldValue.toString().toLowerCase().includes(query.toLowerCase());
                    });
                    resolve(results);
                });
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(query);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 按范围查询
    async getByRange(storeName, indexName, lowerBound, upperBound) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB not available'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const range = IDBKeyRange.bound(lowerBound, upperBound);
            const request = index.getAll(range);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 批量操作
    async bulkAdd(storeName, items) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                items.forEach(item => {
                    const key = `${storeName}_${Date.now()}_${Math.random()}`;
                    this.localStorage.setItem(key, JSON.stringify(item));
                });
                resolve();
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            let completed = 0;
            let errors = [];

            items.forEach(item => {
                const request = store.add(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === items.length) {
                        resolve({ completed, errors });
                    }
                };
                request.onerror = (event) => {
                    errors.push(event.target.error);
                    completed++;
                    if (completed === items.length) {
                        resolve({ completed, errors });
                    }
                };
            });
        });
    }

    // 数据备份
    async exportData() {
        const data = {
            notes: await this.getAll('notes'),
            tags: await this.getAll('tags'),
            pomodoros: await this.getAll('pomodoros'),
            ankiCards: await this.getAll('ankiCards'),
            stats: await this.getAll('stats'),
            exportDate: new Date().toISOString(),
            version: this.dbVersion
        };
        return data;
    }

    // 数据导入
    async importData(data) {
        try {
            // 清空现有数据
            await this.clearStore('notes');
            await this.clearStore('tags');
            await this.clearStore('pomodoros');
            await this.clearStore('ankiCards');
            await this.clearStore('stats');

            // 导入新数据
            if (data.notes) await this.bulkAdd('notes', data.notes);
            if (data.tags) await this.bulkAdd('tags', data.tags);
            if (data.pomodoros) await this.bulkAdd('pomodoros', data.pomodoros);
            if (data.ankiCards) await this.bulkAdd('ankiCards', data.ankiCards);
            if (data.stats) await this.bulkAdd('stats', data.stats);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 清空存储
    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                Object.keys(this.localStorage)
                    .filter(key => key.startsWith(`${storeName}_`))
                    .forEach(key => this.localStorage.removeItem(key));
                resolve();
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = (event) => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 获取存储大小
    async getStoreSize(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // 降级到localStorage
                let size = 0;
                Object.keys(this.localStorage)
                    .filter(key => key.startsWith(`${storeName}_`))
                    .forEach(key => {
                        size += this.localStorage.getItem(key).length;
                    });
                resolve(size);
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}

// 创建单例
const storageManager = new StorageManager();