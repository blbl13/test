/**
 * 移动端控制器类
 * 处理移动端特定的功能和优化
 */

class MobileController {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.gestureSupport = this.detectGestureSupport();
        this.offlineSupport = this.detectOfflineSupport();
        this.init();
    }

    // 检测是否为移动设备
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && window.innerHeight <= 1024);
    }

    // 检测手势支持
    detectGestureSupport() {
        return {
            touch: 'ontouchstart' in window,
            touchEvents: 'TouchEvent' in window,
            pointerEvents: 'PointerEvent' in window,
            gesture: 'ongesturestart' in window,
            multiTouch: navigator.maxTouchPoints > 1
        };
    }

    // 检测离线支持
    detectOfflineSupport() {
        return {
            serviceWorker: 'serviceWorker' in navigator,
            cache: 'caches' in window,
            indexedDB: typeof IDBDatabase !== 'undefined',
            localStorage: typeof Storage !== 'undefined'
        };
    }

    // 初始化
    init() {
        if (this.isMobile) {
            this.enableMobileOptimizations();
            this.setupTouchGestures();
            this.setupOfflineSupport();
            this.setupResponsiveLayout();
        }
    }

    // 启用移动端优化
    enableMobileOptimizations() {
        // 添加移动端CSS类
        document.body.classList.add('mobile-device');

        if (this.isTouch) {
            document.body.classList.add('touch-device');
        }

        // 优化滚动行为
        if ('scrollBehavior' in document.documentElement.style) {
            document.documentElement.style.scrollBehavior = 'smooth';
        }

        // 禁用双击缩放（对于不需要缩放的应用）
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 500) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // 防止触摸滚动时的弹性效果
        document.addEventListener('touchmove', (event) => {
            if (event.scale !== 1) {
                event.preventDefault();
            }
        }, { passive: false });

        // 优化输入框
        this.optimizeInputs();

        // 优化按钮
        this.optimizeButtons();

        console.log('Mobile optimizations enabled');
    }

    // 优化输入框
    optimizeInputs() {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            // 添加触摸优化类
            input.classList.add('touch-optimized');

            // 设置适当的输入类型
            if (input.type === 'text' && !input.getAttribute('inputmode')) {
                input.setAttribute('inputmode', 'text');
            }

            // 添加自动完成
            if (!input.hasAttribute('autocomplete')) {
                input.setAttribute('autocomplete', 'off');
            }

            // 优化键盘类型
            if (input.classList.contains('number-input')) {
                input.setAttribute('inputmode', 'numeric');
            } else if (input.classList.contains('email-input')) {
                input.setAttribute('inputmode', 'email');
            }
        });
    }

    // 优化按钮
    optimizeButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            // 添加触摸优化类
            button.classList.add('touch-optimized');

            // 确保按钮有最小触摸尺寸
            const computedStyle = window.getComputedStyle(button);
            const height = parseFloat(computedStyle.height);
            const width = parseFloat(computedStyle.width);

            if (height < 44) {
                button.style.minHeight = '44px';
            }
            if (width < 44) {
                button.style.minWidth = '44px';
            }
        });
    }

    // 设置触摸手势
    setupTouchGestures() {
        if (!this.isTouch) return;

        // 滑动手势
        this.setupSwipeGestures();

        // 长按手势
        this.setupLongPressGestures();

        // 双指缩放手势
        this.setupPinchGestures();

        console.log('Touch gestures setup completed');
    }

    // 设置滑动手势
    setupSwipeGestures() {
        let startX, startY, endX, endY;
        const threshold = 50; // 最小滑动距离

        document.addEventListener('touchstart', (event) => {
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (event) => {
            endX = event.changedTouches[0].clientX;
            endY = event.changedTouches[0].clientY;

            const deltaX = endX - startX;
            const deltaY = endY - startY;

            // 判断滑动方向
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // 水平滑动
                if (Math.abs(deltaX) > threshold) {
                    if (deltaX > 0) {
                        this.handleSwipe('right');
                    } else {
                        this.handleSwipe('left');
                    }
                }
            } else {
                // 垂直滑动
                if (Math.abs(deltaY) > threshold) {
                    if (deltaY > 0) {
                        this.handleSwipe('down');
                    } else {
                        this.handleSwipe('up');
                    }
                }
            }
        }, { passive: true });
    }

    // 处理滑动事件
    handleSwipe(direction) {
        console.log(`Swipe ${direction} detected`);
        window.dispatchEvent(new CustomEvent('swipe', { detail: { direction } }));

        // 特定滑动处理
        switch (direction) {
            case 'left':
                // 向左滑动：下一项
                this.handleSwipeLeft();
                break;
            case 'right':
                // 向右滑动：上一项
                this.handleSwipeRight();
                break;
            case 'up':
                // 向上滑动：查看更多
                this.handleSwipeUp();
                break;
            case 'down':
                // 向下滑动：返回或刷新
                this.handleSwipeDown();
                break;
        }
    }

    // 向左滑动处理
    handleSwipeLeft() {
        // 切换到下一个视图
        const navButtons = document.querySelectorAll('.nav-btn');
        const activeButton = document.querySelector('.nav-btn.active');
        if (activeButton && navButtons.length > 0) {
            const currentIndex = Array.from(navButtons).indexOf(activeButton);
            const nextIndex = (currentIndex + 1) % navButtons.length;
            navButtons[nextIndex].click();
        }
    }

    // 向右滑动处理
    handleSwipeRight() {
        // 切换到上一个视图
        const navButtons = document.querySelectorAll('.nav-btn');
        const activeButton = document.querySelector('.nav-btn.active');
        if (activeButton && navButtons.length > 0) {
            const currentIndex = Array.from(navButtons).indexOf(activeButton);
            const prevIndex = (currentIndex - 1 + navButtons.length) % navButtons.length;
            navButtons[prevIndex].click();
        }
    }

    // 向上滑动处理
    handleSwipeUp() {
        // 显示更多选项
        const settingsToggle = document.querySelector('.settings-toggle');
        if (settingsToggle) {
            settingsToggle.click();
        }
    }

    // 向下滑动处理
    handleSwipeDown() {
        // 刷新或返回顶部
        const searchToggle = document.querySelector('.search-toggle');
        if (searchToggle) {
            searchToggle.click();
        }
    }

    // 设置长按手势
    setupLongPressGestures() {
        let longPressTimer = null;
        const longPressDuration = 500; // 长按时间（毫秒）

        document.addEventListener('touchstart', (event) => {
            const target = event.target;
            if (target.classList.contains('long-press-target') || target.tagName === 'BUTTON') {
                longPressTimer = setTimeout(() => {
                    this.handleLongPress(target, event);
                }, longPressDuration);
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });

        document.addEventListener('touchmove', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { passive: true });
    }

    // 处理长按事件
    handleLongPress(element, event) {
        console.log('Long press detected');
        window.dispatchEvent(new CustomEvent('longpress', { detail: { element, event } }));

        // 显示上下文菜单
        this.showContextMenu(element, event);
    }

    // 显示上下文菜单
    showContextMenu(element, event) {
        // 创建上下文菜单
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'absolute';
        menu.style.left = `${event.touches[0].clientX}px`;
        menu.style.top = `${event.touches[0].clientY}px`;

        // 添加菜单项
        const actions = this.getContextMenuActions(element);
        actions.forEach(action => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = action.label;
            item.onclick = () => {
                action.handler();
                document.body.removeChild(menu);
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        document.addEventListener('click', () => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        }, { once: true });
    }

    // 获取上下文菜单操作
    getContextMenuActions(element) {
        const actions = [];

        if (element.classList.contains('note-item')) {
            actions.push(
                { label: '编辑', handler: () => this.editNote(element.dataset.noteId) },
                { label: '置顶', handler: () => this.togglePinNote(element.dataset.noteId) },
                { label: '删除', handler: () => this.deleteNote(element.dataset.noteId) }
            );
        } else if (element.classList.contains('card-item')) {
            actions.push(
                { label: '编辑', handler: () => this.editCard(element.dataset.cardId) },
                { label: '删除', handler: () => this.deleteCard(element.dataset.cardId) }
            );
        }

        return actions;
    }

    // 设置双指缩放手势
    setupPinchGestures() {
        if (!this.gestureSupport.multiTouch) return;

        let initialDistance = null;

        document.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                initialDistance = this.getDistance(event.touches[0], event.touches[1]);
            }
        }, { passive: true });

        document.addEventListener('touchmove', (event) => {
            if (event.touches.length === 2 && initialDistance !== null) {
                event.preventDefault();
                const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
                const scale = currentDistance / initialDistance;

                this.handlePinch(scale);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            initialDistance = null;
        }, { passive: true });
    }

    // 计算两点距离
    getDistance(touch1, touch2) {
        const deltaX = touch2.clientX - touch1.clientX;
        const deltaY = touch2.clientY - touch1.clientY;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    // 处理缩放手势
    handlePinch(scale) {
        console.log(`Pinch scale: ${scale}`);
        window.dispatchEvent(new CustomEvent('pinch', { detail: { scale } }));

        // 调整字体大小或缩放内容
        if (scale > 1.2) {
            this.zoomIn();
        } else if (scale < 0.8) {
            this.zoomOut();
        }
    }

    // 放大
    zoomIn() {
        const currentZoom = parseFloat(document.body.style.zoom || 1);
        document.body.style.zoom = Math.min(currentZoom * 1.1, 2); // 最大放大2倍
    }

    // 缩小
    zoomOut() {
        const currentZoom = parseFloat(document.body.style.zoom || 1);
        document.body.style.zoom = Math.max(currentZoom / 1.1, 0.5); // 最小缩小0.5倍
    }

    // 设置离线支持
    setupOfflineSupport() {
        if (!this.offlineSupport.serviceWorker) return;

        // 注册Service Worker
        this.registerServiceWorker();

        // 设置离线事件监听
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        console.log('Offline support setup completed');
    }

    // 注册Service Worker
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registered:', registration);

            // 监听Service Worker消息
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }

    // 处理在线事件
    handleOnline() {
        console.log('Device is online');
        document.body.classList.remove('offline');
        window.dispatchEvent(new CustomEvent('online'));

        // 同步离线数据
        this.syncOfflineData();
    }

    // 处理离线事件
    handleOffline() {
        console.log('Device is offline');
        document.body.classList.add('offline');
        window.dispatchEvent(new CustomEvent('offline'));

        // 显示离线提示
        this.showOfflineNotification();
    }

    // 同步离线数据
    async syncOfflineData() {
        try {
            // 检查是否有待同步的数据
            const pendingData = localStorage.getItem('pendingSync');
            if (pendingData) {
                const data = JSON.parse(pendingData);
                await this.syncData(data);
                localStorage.removeItem('pendingSync');
            }
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }

    // 显示离线通知
    showOfflineNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📱 离线模式', {
                body: '您当前处于离线状态，数据将保存在本地',
                icon: '/favicon.svg'
            });
        }
    }

    // 处理Service Worker消息
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'sync-complete':
                console.log('Sync completed:', data);
                break;
            case 'cache-updated':
                console.log('Cache updated:', data);
                break;
            case 'offline-ready':
                console.log('Offline mode ready');
                break;
        }
    }

    // 设置响应式布局
    setupResponsiveLayout() {
        // 监听窗口大小变化
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // 初始化布局
        this.handleResize();

        console.log('Responsive layout setup completed');
    }

    // 处理窗口大小变化
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 更新CSS变量
        document.documentElement.style.setProperty('--viewport-width', `${width}px`);
        document.documentElement.style.setProperty('--viewport-height', `${height}px`);

        // 检查方向变化
        if (window.orientation !== undefined) {
            this.handleOrientationChange(window.orientation);
        }

        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('resize', { detail: { width, height } }));

        // 优化布局
        this.optimizeLayout();
    }

    // 处理方向变化
    handleOrientationChange(orientation) {
        console.log(`Orientation changed to: ${orientation}`);
        window.dispatchEvent(new CustomEvent('orientationchange', { detail: { orientation } }));

        // 添加方向类
        document.body.classList.remove('portrait', 'landscape');
        if (Math.abs(orientation) === 90) {
            document.body.classList.add('landscape');
        } else {
            document.body.classList.add('portrait');
        }
    }

    // 优化布局
    optimizeLayout() {
        // 根据屏幕尺寸优化
        const width = window.innerWidth;

        if (width <= 480) {
            // 超小屏幕优化
            document.body.classList.add('extra-small');
            this.optimizeForExtraSmallScreen();
        } else if (width <= 768) {
            // 手机优化
            document.body.classList.add('phone');
            this.optimizeForPhone();
        } else if (width <= 1024) {
            // 平板优化
            document.body.classList.add('tablet');
            this.optimizeForTablet();
        } else {
            // 桌面优化
            document.body.classList.remove('extra-small', 'phone', 'tablet');
            this.optimizeForDesktop();
        }
    }

    // 超小屏幕优化
    optimizeForExtraSmallScreen() {
        // 隐藏非必要元素
        const elementsToHide = document.querySelectorAll('.hide-on-extra-small');
        elementsToHide.forEach(el => el.classList.add('hidden'));

        // 简化界面
        this.simplifyUI();
    }

    // 手机优化
    optimizeForPhone() {
        // 优化导航
        const nav = document.querySelector('.main-nav');
        if (nav) {
            nav.classList.add('phone-nav');
        }
    }

    // 平板优化
    optimizeForTablet() {
        // 调整布局
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.classList.add('tablet-layout');
        }
    }

    // 桌面优化
    optimizeForDesktop() {
        // 恢复完整界面
        const elementsToShow = document.querySelectorAll('.hide-on-extra-small');
        elementsToShow.forEach(el => el.classList.remove('hidden'));

        // 恢复复杂UI
        this.restoreUI();
    }

    // 简化UI
    simplifyUI() {
        // 隐藏侧边栏
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('simplified');
        }

        // 简化编辑器
        const editor = document.querySelector('.editor-container');
        if (editor) {
            editor.classList.add('simplified');
        }

        // 简化按钮
        const buttons = document.querySelectorAll('.btn-secondary');
        buttons.forEach(btn => btn.classList.add('simplified'));
    }

    // 恢复UI
    restoreUI() {
        // 显示侧边栏
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('simplified');
        }

        // 恢复编辑器
        const editor = document.querySelector('.editor-container');
        if (editor) {
            editor.classList.remove('simplified');
        }

        // 恢复按钮
        const buttons = document.querySelectorAll('.btn-secondary');
        buttons.forEach(btn => btn.classList.remove('simplified'));
    }

    // 获取设备信息
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTouch: this.isTouch,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            gestureSupport: this.gestureSupport,
            offlineSupport: this.offlineSupport
        };
    }

    // 检查是否支持离线功能
    isOfflineReady() {
        return this.offlineSupport.serviceWorker && 'serviceWorker' in navigator;
    }

    // 检查网络状态
    checkNetworkStatus() {
        return {
            online: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    // 优化图片
    optimizeImages() {
        if (!this.isMobile) return;

        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // 添加懒加载
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }

            // 添加响应式类
            img.classList.add('responsive-image');
        });
    }

    // 销毁控制器
    destroy() {
        // 清理资源
        document.body.classList.remove('mobile-device', 'touch-device', 'portrait', 'landscape');
    }
}

// 创建单例
const mobileController = new MobileController();