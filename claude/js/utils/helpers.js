/**
 * 辅助工具函数模块
 */

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

// 获取相对时间
function getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return '刚刚';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} 分钟前`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} 小时前`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} 天前`;
    }

    return formatDate(date, 'MM-DD');
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 计算字符串字数
function countWords(text) {
    // 移除空格和换行符后计算字符数
    return text.replace(/\s+/g, '').length;
}

// 提取标签
function extractTags(text) {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
        tags.push(match[1]);
    }
    return [...new Set(tags)]; // 去重
}

// 生成颜色
function generateColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs(((Math.sin(hash) * 10000) % 1) * 16777216));
    return `#${color.toString(16).padStart(6, '0')}`;
}

// 深拷贝
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// 检查对象是否为空
function isEmpty(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

// 验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 验证URL格式
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

// 获取本地存储数据
function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error getting localStorage:', error);
        return defaultValue;
    }
}

// 设置本地存储数据
function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error setting localStorage:', error);
        return false;
    }
}

// 移除本地存储数据
function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing localStorage:', error);
        return false;
    }
}

// 检查浏览器是否支持特性
function isFeatureSupported(feature) {
    const features = {
        'localStorage': typeof Storage !== 'undefined',
        'indexedDB': typeof IDBDatabase !== 'undefined',
        'serviceWorker': 'serviceWorker' in navigator,
        'notifications': 'Notification' in window,
        'pushManager': 'PushManager' in window,
        'clipboard': navigator.clipboard !== undefined,
        'fileReader': typeof FileReader !== 'undefined'
    };
    return features[feature] || false;
}

// 下载文件
function downloadFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// 读取文件
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}

// 检查数组是否包含所有元素
function containsAll(array, elements) {
    return elements.every(element => array.includes(element));
}

// 检查数组是否包含任意元素
function containsAny(array, elements) {
    return elements.some(element => array.includes(element));
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成随机字符串
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// 获取当前时间戳
function getTimestamp() {
    return Date.now();
}

// 延迟执行
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试函数
async function retry(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// 批量处理函数
async function batchProcess(items, processor, batchSize = 10) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(item => processor(item)));
        results.push(...batchResults);
    }
    return results;
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        formatDate,
        getRelativeTime,
        generateId,
        countWords,
        extractTags,
        generateColor,
        deepClone,
        isEmpty,
        isValidEmail,
        isValidUrl,
        getLocalStorage,
        setLocalStorage,
        removeLocalStorage,
        isFeatureSupported,
        downloadFile,
        readFile,
        containsAll,
        containsAny,
        formatFileSize,
        generateRandomString,
        getTimestamp,
        delay,
        retry,
        batchProcess
    };
}