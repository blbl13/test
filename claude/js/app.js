/**
 * 主应用模块
 * 初始化所有组件并处理全局逻辑
 */

class App {
    constructor() {
        this.initialized = false;
        this.components = [];
        this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    // 初始化应用
    async init() {
        try {
            console.log('🚀 正在启动学习笔记工具...');

            // 初始化组件
            await this.initComponents();

            // 绑定全局事件
            this.bindGlobalEvents();

            // 注册Service Worker
            await this.registerServiceWorker();

            // 检查更新
            await this.checkForUpdates();

            // 性能监控
            this.setupPerformanceMonitoring();

            // 错误处理
            this.setupErrorHandling();

            // 初始化完成
            this.initialized = true;
            console.log('✅ 应用初始化完成');

            // 触发初始化完成事件
            window.dispatchEvent(new CustomEvent('app-initialized', {
                detail: { timestamp: new Date() }
            }));

            // 显示欢迎消息
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.showError('应用启动失败，请刷新页面重试');
        }
    }

    // 初始化组件
    async initComponents() {
        const components = [
            { name: 'NoteController', instance: noteController },
            { name: 'PomodoroController', instance: pomodoroController },
            { name: 'AnkiController', instance: ankiController },
            { name: 'StatsController', instance: statsController },
            { name: 'ThemeController', instance: themeController },
            { name: 'SearchController', instance: searchController },
            { name: 'MobileController', instance: mobileController }
        ];

        for (const component of components) {
            try {
                console.log(`📦 初始化 ${component.name}...`);
                this.components.push(component);
            } catch (error) {
                console.error(`❌ ${component.name} 初始化失败:`, error);
                throw error;
            }
        }

        console.log(`✅ 成功初始化 ${components.length} 个组件`);
    }

    // 绑定全局事件
    bindGlobalEvents() {
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // 视图切换
        document.addEventListener('click', (e) => this.handleViewSwitch(e));

        // 搜索
        document.addEventListener('click', (e) => this.handleSearch(e));

        // 模态框关闭
        document.addEventListener('click', (e) => this.handleModalClose(e));

        // 设置
        document.addEventListener('click', (e) => this.handleSettings(e));

        // 应用状态变化
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

        // 错误处理
        window.addEventListener('error', (e) => this.handleWindowError(e));
        window.addEventListener('unhandledrejection', (e) => this.handlePromiseRejection(e));

        // 自定义事件
        window.addEventListener('note-selected', (e) => this.handleNoteSelected(e.detail));
        window.addEventListener('themeChange', (e) => this.handleThemeChange(e.detail));

        console.log('✅ 全局事件绑定完成');
    }

    // 处理键盘快捷键
    handleKeyboard(e) {
        // 忽略输入框中的快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case '/':
                e.preventDefault();
                this.focusSearch();
                break;
            case 'Escape':
                e.preventDefault();
                this.closeAllModals();
                break;
            case 'Tab':
                e.preventDefault();
                this.toggleNavigation();
                break;
        }
    }

    // 处理视图切换
    handleViewSwitch(e) {
        const navBtn = e.target.closest('.nav-btn');
        if (!navBtn) return;

        const view = navBtn.dataset.view;
        if (!view) return;

        e.preventDefault();

        // 更新活动状态
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        navBtn.classList.add('active');

        // 切换视图
        document.querySelectorAll('.view-container').forEach(view => view.classList.remove('active'));
        const targetView = document.querySelector(`.${view}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // 更新页面标题
        this.updatePageTitle(view);

        // 触发视图切换事件
        window.dispatchEvent(new CustomEvent('view-changed', {
            detail: { view }
        }));
    }

    // 处理搜索
    handleSearch(e) {
        const searchToggle = e.target.closest('.search-toggle');
        if (!searchToggle) return;

        e.preventDefault();

        const searchBar = document.querySelector('.search-bar');
        const searchInput = document.getElementById('search-input');

        if (searchBar.classList.contains('hidden')) {
            searchBar.classList.remove('hidden');
            searchInput.focus();
        } else {
            searchBar.classList.add('hidden');
            searchInput.value = '';
            searchController.clearResults();
        }
    }

    // 处理模态框关闭
    handleModalClose(e) {
        if (e.target.classList.contains('close-modal')) {
            e.preventDefault();
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        if (e.target.classList.contains('modal')) {
            e.preventDefault();
            e.target.classList.add('hidden');
        }
    }

    // 处理设置
    handleSettings(e) {
        const settingsToggle = e.target.closest('.settings-toggle');
        if (!settingsToggle) return;

        e.preventDefault();

        const modal = document.querySelector('.settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // 注册Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('🔧 正在注册Service Worker...');
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker注册成功:', registration);

                // 监听Service Worker更新
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Service Worker更新可用');
                    this.showUpdateNotification();
                });

                // 监听消息
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event);
                });

            } catch (error) {
                console.error('❌ Service Worker注册失败:', error);
            }
        } else {
            console.warn('⚠️ 当前浏览器不支持Service Worker');
        }
    }

    // 检查更新
    async checkForUpdates() {
        if (!this.isDevelopment) {
            // 检查应用版本
            const currentVersion = '1.0.0';
            const cachedVersion = localStorage.getItem('appVersion');

            if (cachedVersion && cachedVersion !== currentVersion) {
                console.log('🔄 检测到新版本:', currentVersion);
                this.showUpdateNotification();
            }

            localStorage.setItem('appVersion', currentVersion);
        }
    }

    // 性能监控
    setupPerformanceMonitoring() {
        // 监控页面加载性能
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log(`📊 页面加载时间: ${pageLoadTime}ms`);

                // 监控FPS
                this.monitorFPS();
            }, 0);
        });

        // 监控资源加载
        this.monitorResourceLoading();

        console.log('✅ 性能监控已启用');
    }

    // 监控FPS
    monitorFPS() {
        let frames = 0;
        let lastTime = performance.now();

        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();

            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                console.log(`📊 FPS: ${fps}`);

                if (fps < 30) {
                    console.warn('⚠️ 帧率较低，可能需要优化');
                }

                frames = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(measureFPS);
        };

        requestAnimationFrame(measureFPS);
    }

    // 监控资源加载
    monitorResourceLoading() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    const duration = entry.duration;
                    if (duration > 1000) {
                        console.warn(`⚠️ 资源加载缓慢: ${entry.name}, 耗时: ${duration}ms`);
                    }
                }
            }
        });

        observer.observe({ entryTypes: ['resource'] });
    }

    // 错误处理
    setupErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (e) => {
            console.error('❌ 全局错误:', e.error);
            this.logError(e.error);
        });

        // Promise拒绝处理
        window.addEventListener('unhandledrejection', (e) => {
            console.error('❌ 未处理的Promise拒绝:', e.reason);
            this.logError(e.reason);
        });

        console.log('✅ 错误处理已配置');
    }

    // 处理窗口错误
    handleWindowError(e) {
        console.error('❌ 窗口错误:', e);
        this.logError(e.error || e);
    }

    // 处理Promise拒绝
    handlePromiseRejection(e) {
        console.error('❌ Promise拒绝:', e.reason);
        this.logError(e.reason);
    }

    // 记录错误
    logError(error) {
        const errorLog = {
            message: error.message || error.toString(),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            device: mobileController.getDeviceInfo()
        };

        // 保存到localStorage
        const errors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        errors.push(errorLog);
        localStorage.setItem('errorLogs', JSON.stringify(errors));

        // 如果超过100条，清理旧错误
        if (errors.length > 100) {
            localStorage.setItem('errorLogs', JSON.stringify(errors.slice(-100)));
        }
    }

    // 处理在线事件
    handleOnline() {
        console.log('🌐 已连接到网络');
        document.body.classList.remove('offline');

        // 同步数据
        this.syncData();

        // 显示通知
        this.showNotification('🌐 已连接到网络', '数据将自动同步');

        // 触发在线事件
        window.dispatchEvent(new CustomEvent('app-online'));
    }

    // 处理离线事件
    handleOffline() {
        console.log('📴 已断开网络连接');
        document.body.classList.add('offline');

        // 显示通知
        this.showNotification('📴 离线模式', '您已切换到离线模式');

        // 触发离线事件
        window.dispatchEvent(new CustomEvent('app-offline'));
    }

    // 同步数据
    async syncData() {
        try {
            // 获取所有需要同步的数据
            const syncData = {
                notes: noteController.getAllNotes(),
                pomodoros: pomodoroController.getAllPomodoros(),
                ankiCards: ankiController.getAllCards(),
                tags: noteController.getAllTags(),
                stats: statsController.exportStats(),
                timestamp: new Date().toISOString()
            };

            // 发送同步消息到Service Worker
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'sync-data',
                    data: syncData
                });
            }

            // 更新最后同步时间
            localStorage.setItem('lastSyncTime', new Date().toISOString());

            console.log('✅ 数据同步完成');
        } catch (error) {
            console.error('❌ 数据同步失败:', error);
        }
    }

    // 处理可见性变化
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('📴 页面不可见，暂停定时器');
            this.pauseTimers();
        } else {
            console.log('👁️ 页面可见，恢复定时器');
            this.resumeTimers();
        }
    }

    // 暂停定时器
    pauseTimers() {
        statsController.stopAutoUpdate();
        // 暂停其他定时器...
    }

    // 恢复定时器
    resumeTimers() {
        statsController.startAutoUpdate();
        // 恢复其他定时器...
    }

    // 处理笔记选择
    handleNoteSelected(note) {
        // 关联番茄钟
        if (pomodoroController.isRunning()) {
            pomodoroController.getCurrentPomodoro().noteId = note.id;
            pomodoroController.getCurrentPomodoro().noteTitle = note.title;
        }

        // 更新UI
        this.updateRelatedUI();
    }

    // 处理主题变化
    handleThemeChange({ themeName, theme }) {
        // 更新页面主题
        document.documentElement.setAttribute('data-theme', themeName);

        // 更新页面样式
        this.updatePageTheme(theme);
    }

    // 更新页面标题
    updatePageTitle(view) {
        const titles = {
            notes: '笔记 - 学习笔记工具',
            pomodoro: '番茄钟 - 学习笔记工具',
            anki: 'Anki卡片 - 学习笔记工具',
            stats: '统计 - 学习笔记工具',
            timeline: '时间线 - 学习笔记工具'
        };

        document.title = titles[view] || '学习笔记工具';
    }

    // 更新页面主题
    updatePageTheme(theme) {
        // 更新meta主题颜色
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme.primaryColor || '#2563eb';
        }

        // 更新页面背景
        document.body.style.backgroundColor = theme.bgColor;
    }

    // 更新相关UI
    updateRelatedUI() {
        // 更新笔记列表
        // 更新番茄钟笔记链接
        // 更新统计面板
        // ...
    }

    // 处理Service Worker消息
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'sync-complete':
                console.log('🔄 数据同步完成:', data);
                this.showNotification('✅ 数据同步成功', '您的学习数据已同步到云端');
                break;
            case 'update-available':
                console.log('🔄 新版本可用:', data);
                this.showUpdateNotification();
                break;
            case 'offline-ready':
                console.log('📱 离线模式就绪');
                this.showNotification('📱 离线模式就绪', '您可以在离线状态下继续使用');
                break;
        }
    }

    // 显示更新通知
    showUpdateNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔄 更新可用', {
                body: '新版本已就绪，请刷新页面更新',
                icon: '/favicon.svg'
            });
        }

        // 显示界面通知
        this.showInlineNotification('🔄 新版本可用，请刷新页面更新', 'info');
    }

    // 显示欢迎消息
    showWelcomeMessage() {
        // 检查是否是首次访问
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            this.showNotification('🎉 欢迎使用', '感谢使用学习笔记工具！开始您的学习之旅吧！');
            localStorage.setItem('hasVisited', 'true');
        }
    }

    // 显示通知
    showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/favicon.svg'
            });
        }
    }

    // 显示内联通知
    showInlineNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `inline-notification ${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background-color: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 1rem;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    // 显示错误
    showError(message) {
        this.showInlineNotification(message, 'error');
    }

    // 聚焦搜索框
    focusSearch() {
        const searchToggle = document.querySelector('.search-toggle');
        if (searchToggle) {
            searchToggle.click();
            setTimeout(() => {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }, 100);
        }
    }

    // 关闭所有模态框
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // 切换导航
    toggleNavigation() {
        const nav = document.querySelector('.main-nav');
        if (nav) {
            nav.classList.toggle('hidden');
        }
    }

    // 导出应用数据
    exportData() {
        try {
            const data = {
                notes: noteController.exportData(),
                pomodoros: pomodoroController.exportData(),
                ankiCards: ankiController.exportAnkiData(),
                tags: noteController.getAllTags(),
                stats: statsController.exportStats(),
                settings: {
                    pomodoro: pomodoroController.getSettings(),
                    anki: ankiController.getDecks(),
                    theme: themeController.exportThemes()
                },
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                device: mobileController.getDeviceInfo()
            };

            const jsonStr = JSON.stringify(data, null, 2);
            downloadFile(`学习笔记备份_${formatDate(new Date(), 'YYYY-MM-DD')}.json`, jsonStr, 'application/json');

            return { success: true };
        } catch (error) {
            console.error('Error exporting app data:', error);
            return { success: false, error: error.message };
        }
    }

    // 导入应用数据
    async importData(data) {
        try {
            // 导入笔记
            if (data.notes) {
                await noteController.importData(data.notes);
            }

            // 导入番茄钟
            if (data.pomodoros) {
                await pomodoroController.importData(data.pomodoros);
            }

            // 导入Anki卡片
            if (data.ankiCards) {
                await ankiController.importAnkiData(data.ankiCards);
            }

            // 导入标签
            if (data.tags) {
                // 标签处理...
            }

            // 导入设置
            if (data.settings) {
                if (data.settings.pomodoro) {
                    pomodoroController.updateSettings(data.settings.pomodoro);
                }
                if (data.settings.theme) {
                    themeController.importThemes(data.settings.theme);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error importing app data:', error);
            return { success: false, error: error.message };
        }
    }

    // 重置应用
    async resetApp() {
        try {
            // 显示确认对话框
            const confirmReset = confirm('⚠️ 警告：此操作将删除所有数据并重置应用！\n\n请确认是否继续？');
            if (!confirmReset) return false;

            // 清理所有数据
            await noteController.storage.clearStore('notes');
            await noteController.storage.clearStore('tags');
            await pomodoroController.storage.clearStore('pomodoros');
            await ankiController.storage.clearStore('ankiCards');
            await noteController.storage.clearStore('stats');

            // 清理localStorage
            localStorage.clear();

            // 清理缓存
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            // 重置Service Worker
            if (navigator.serviceWorker) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 重新加载页面
            window.location.reload();

            return true;
        } catch (error) {
            console.error('Error resetting app:', error);
            return false;
        }
    }

    // 销毁应用
    destroy() {
        try {
            // 停止所有定时器
            statsController.stopAutoUpdate();

            // 清理资源
            this.components.forEach(component => {
                if (component.instance.destroy) {
                    component.instance.destroy();
                }
            });

            // 清理事件监听器
            // ...

            console.log('✅ 应用已销毁');
        } catch (error) {
            console.error('Error destroying app:', error);
        }
    }
}

// 创建应用实例
const app = new App();

// 导出工具函数
function downloadFile(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// 应用启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// 导出全局对象
window.learningApp = app;