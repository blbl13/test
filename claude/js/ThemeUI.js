/**
 * 主题UI模块
 * 处理主题切换界面的渲染和交互
 */

class ThemeUI {
    constructor() {
        this.controller = themeController;
        this.container = null;
        this.themeToggle = null;
        this.themeSelector = null;
        this.customThemePanel = null;
        this.currentTheme = null;

        this.init();
    }

    // 初始化UI
    init() {
        this.findElements();
        this.bindEvents();
        this.render();
        this.setupSystemThemeListener();
    }

    // 查找DOM元素
    findElements() {
        this.container = document.querySelector('.theme-container');
        this.themeToggle = document.querySelector('.theme-toggle');
        this.themeSelector = document.querySelector('.theme-selector');
        this.customThemePanel = document.querySelector('.custom-theme-panel');
    }

    // 绑定事件
    bindEvents() {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        if (this.themeSelector) {
            this.themeSelector.addEventListener('change', (e) => this.selectTheme(e.target.value));
        }

        // 监听主题变化
        window.addEventListener('themeChange', (e) => this.onThemeChange(e.detail));
        window.addEventListener('themeAdded', (e) => this.onThemeAdded(e.detail));
        window.addEventListener('themeUpdated', (e) => this.onThemeUpdated(e.detail));
        window.addEventListener('themeDeleted', (e) => this.onThemeDeleted(e.detail));
        window.addEventListener('systemThemeChange', (e) => this.onSystemThemeChange(e.detail));
    }

    // 渲染界面
    render() {
        this.renderThemeSelector();
        this.renderCustomThemePanel();
        this.updateCurrentThemeDisplay();
    }

    // 渲染主题选择器
    renderThemeSelector() {
        if (!this.themeSelector) return;

        const themes = this.controller.getAllThemes();
        const currentTheme = this.controller.getCurrentTheme();

        this.themeSelector.innerHTML = themes.map(theme => `
            <option value="${theme.name}" ${theme.name === currentTheme.name ? 'selected' : ''}>
                ${theme.name} - ${theme.description}
            </option>
        `).join('');

        // 设置当前主题
        this.themeSelector.value = currentTheme.name;
    }

    // 渲染自定义主题面板
    renderCustomThemePanel() {
        if (!this.customThemePanel) return;

        const customThemes = Object.keys(this.controller.customThemes);
        const currentTheme = this.controller.getCurrentTheme();
        const isCustom = customThemes.includes(currentTheme.name);

        if (customThemes.length === 0) {
            this.customThemePanel.innerHTML = `
                <div class="no-custom-themes">
                    <p>还没有自定义主题</p>
                    <button class="btn-primary create-custom-theme-btn">创建自定义主题</button>
                </div>
            `;

            const createBtn = this.customThemePanel.querySelector('.create-custom-theme-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.createCustomTheme());
            }
        } else {
            this.customThemePanel.innerHTML = `
                <div class="custom-themes-header">
                    <h4>自定义主题</h4>
                    <button class="btn-primary create-custom-theme-btn">新建主题</button>
                </div>
                <div class="custom-themes-list">
                    ${customThemes.map(themeName => `
                        <div class="custom-theme-item ${themeName === currentTheme.name ? 'active' : ''}"
                             data-theme="${themeName}">
                            <div class="theme-preview">
                                <div class="preview-color" style="background-color: ${this.controller.getThemeConfig(themeName).primaryColor}"></div>
                                <div class="preview-color" style="background-color: ${this.controller.getThemeConfig(themeName).bgColor}"></div>
                            </div>
                            <div class="theme-info">
                                <span class="theme-name">${themeName}</span>
                                <span class="theme-description">${this.controller.getThemeConfig(themeName).description}</span>
                            </div>
                            <div class="theme-actions">
                                <button class="icon-btn edit-theme-btn" title="编辑">✏️</button>
                                <button class="icon-btn delete-theme-btn" title="删除">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${isCustom ? '<button class="btn-secondary reset-theme-btn">重置为默认</button>' : ''}
            `;

            // 绑定事件
            this.bindCustomThemeEvents();
        }
    }

    // 绑定自定义主题事件
    bindCustomThemeEvents() {
        // 创建主题按钮
        const createBtn = this.customThemePanel.querySelector('.create-custom-theme-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createCustomTheme());
        }

        // 主题项点击事件
        const themeItems = this.customThemePanel.querySelectorAll('.custom-theme-item');
        themeItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是操作按钮，不切换主题
                if (e.target.closest('.theme-actions')) return;

                const themeName = item.dataset.theme;
                this.controller.setTheme(themeName);
            });
        });

        // 编辑按钮
        const editButtons = this.customThemePanel.querySelectorAll('.edit-theme-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeName = btn.closest('.custom-theme-item').dataset.theme;
                this.editCustomTheme(themeName);
            });
        });

        // 删除按钮
        const deleteButtons = this.customThemePanel.querySelectorAll('.delete-theme-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const themeName = btn.closest('.custom-theme-item').dataset.theme;
                this.deleteCustomTheme(themeName);
            });
        });

        // 重置按钮
        const resetBtn = this.customThemePanel.querySelector('.reset-theme-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTheme());
        }
    }

    // 切换主题
    toggleTheme() {
        const themes = this.controller.getAllThemes();
        const currentTheme = this.controller.getCurrentTheme();
        const currentIndex = themes.findIndex(t => t.name === currentTheme.name);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];

        this.controller.setTheme(nextTheme.name);
    }

    // 选择主题
    selectTheme(themeName) {
        this.controller.setTheme(themeName);
    }

    // 创建自定义主题
    async createCustomTheme() {
        try {
            const themeName = await this.promptThemeName();
            if (!themeName) return;

            const baseTheme = this.controller.getCurrentTheme();
            const customTheme = {
                primaryColor: baseTheme.primaryColor,
                secondaryColor: baseTheme.secondaryColor,
                bgColor: baseTheme.bgColor,
                textColor: baseTheme.textColor,
                borderColor: baseTheme.borderColor,
                description: '自定义主题'
            };

            await this.controller.addCustomTheme(themeName, customTheme);
            this.showSuccess(`主题 "${themeName}" 创建成功`);

        } catch (error) {
            console.error('Error creating custom theme:', error);
            this.showError('无法创建主题');
        }
    }

    // 编辑自定义主题
    async editCustomTheme(themeName) {
        try {
            const themeConfig = this.controller.getThemeConfig(themeName);
            if (!themeConfig) {
                throw new Error(`主题 "${themeName}" 不存在`);
            }

            // 显示颜色编辑器
            const newConfig = await this.showColorEditor(themeConfig);
            if (!newConfig) return;

            await this.controller.updateCustomTheme(themeName, newConfig);
            this.showSuccess(`主题 "${themeName}" 更新成功`);

        } catch (error) {
            console.error('Error editing custom theme:', error);
            this.showError('无法更新主题');
        }
    }

    // 删除自定义主题
    async deleteCustomTheme(themeName) {
        try {
            const confirmMessage = `确定要删除主题 "${themeName}" 吗？`;
            if (!confirm(confirmMessage)) return;

            await this.controller.deleteCustomTheme(themeName);
            this.showSuccess(`主题 "${themeName}" 已删除`);

        } catch (error) {
            console.error('Error deleting custom theme:', error);
            this.showError('无法删除主题');
        }
    }

    // 重置主题
    resetTheme() {
        try {
            const currentTheme = this.controller.getCurrentTheme();
            if (!currentTheme.isCustom) {
                this.showError('当前主题不是自定义主题');
                return;
            }

            const confirmMessage = `确定要重置主题 "${currentTheme.name}" 为默认设置吗？`;
            if (!confirm(confirmMessage)) return;

            this.controller.resetTheme(currentTheme.name);
            this.showSuccess(`主题 "${currentTheme.name}" 已重置`);

        } catch (error) {
            console.error('Error resetting theme:', error);
            this.showError('无法重置主题');
        }
    }

    // 应用系统主题
    applySystemTheme() {
        const systemTheme = this.controller.getSystemPreferredTheme();
        this.controller.setTheme(systemTheme);
        this.showSuccess(`已应用系统主题: ${systemTheme}`);
    }

    // 设置系统主题监听
    setupSystemThemeListener() {
        this.controller.watchSystemTheme();
    }

    // 处理主题变化
    onThemeChange({ themeName, theme }) {
        this.renderThemeSelector();
        this.renderCustomThemePanel();
        this.updateCurrentThemeDisplay();
        this.animateThemeChange();
    }

    // 处理主题添加
    onThemeAdded({ themeName, theme }) {
        this.renderCustomThemePanel();
        this.showSuccess(`主题 "${themeName}" 已添加`);
    }

    // 处理主题更新
    onThemeUpdated({ themeName, theme }) {
        this.renderCustomThemePanel();
        this.showSuccess(`主题 "${themeName}" 已更新`);
    }

    // 处理主题删除
    onThemeDeleted({ themeName }) {
        this.renderCustomThemePanel();
        this.showSuccess(`主题 "${themeName}" 已删除`);
    }

    // 处理系统主题变化
    onSystemThemeChange({ theme }) {
        const autoApply = getLocalStorage('autoApplySystemTheme', true);
        if (autoApply) {
            this.controller.setTheme(theme);
        }
    }

    // 更新当前主题显示
    updateCurrentThemeDisplay() {
        const currentTheme = this.controller.getCurrentTheme();
        this.currentTheme = currentTheme;

        // 更新主题切换按钮图标
        if (this.themeToggle) {
            const icon = this.getThemeIcon(currentTheme.name);
            this.themeToggle.innerHTML = `<span class="icon">${icon}</span>`;
        }

        // 更新主题预览
        this.updateThemePreview(currentTheme);
    }

    // 更新主题预览
    updateThemePreview(theme) {
        const preview = document.querySelector('.theme-preview');
        if (!preview) return;

        preview.innerHTML = `
            <div class="theme-preview-colors">
                <div class="preview-color" style="background-color: ${theme.primaryColor}"></div>
                <div class="preview-color" style="background-color: ${theme.secondaryColor}"></div>
                <div class="preview-color" style="background-color: ${theme.bgColor}"></div>
                <div class="preview-color" style="background-color: ${theme.textColor}"></div>
            </div>
            <div class="theme-preview-info">
                <span class="theme-name">${theme.name}</span>
                <span class="theme-description">${theme.description}</span>
            </div>
        `;
    }

    // 获取主题图标
    getThemeIcon(themeName) {
        const iconMap = {
            'light': '☀️',
            'dark': '🌙',
            'professional': '👔',
            'blue': '🔵',
            'green': '🟢'
        };

        // 自定义主题使用调色板图标
        if (!iconMap[themeName]) {
            return '🎨';
        }

        return iconMap[themeName];
    }

    // 提示输入主题名称
    async promptThemeName() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'theme-name-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h3>创建新主题</h3>
                    <div class="dialog-body">
                        <div class="form-group">
                            <label>主题名称</label>
                            <input type="text" class="theme-name-input" placeholder="输入主题名称..." maxlength="50">
                        </div>
                        <div class="form-group">
                            <label>主题描述</label>
                            <input type="text" class="theme-description-input" placeholder="输入主题描述..." maxlength="100">
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="btn-secondary cancel-btn">取消</button>
                        <button class="btn-primary create-btn">创建</button>
                    </div>
                </div>
            `;

            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const content = dialog.querySelector('.dialog-content');
            content.style.cssText = `
                background-color: var(--bg-color);
                border-radius: var(--border-radius);
                padding: 2rem;
                max-width: 500px;
                width: 90%;
            `;

            // 事件处理
            const nameInput = dialog.querySelector('.theme-name-input');
            const descriptionInput = dialog.querySelector('.theme-description-input');
            const cancelBtn = dialog.querySelector('.cancel-btn');
            const createBtn = dialog.querySelector('.create-btn');

            cancelBtn.onclick = () => {
                document.body.removeChild(dialog);
                resolve(null);
            };

            createBtn.onclick = () => {
                const name = nameInput.value.trim();
                const description = descriptionInput.value.trim();
                document.body.removeChild(dialog);
                resolve({ name, description });
            };

            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                } else if (e.key === 'Enter') {
                    createBtn.click();
                }
            });

            document.body.appendChild(dialog);
            nameInput.focus();
        });
    }

    // 显示颜色编辑器
    async showColorEditor(themeConfig) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'color-editor-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h3>编辑主题颜色</h3>
                    <div class="dialog-body">
                        <div class="color-inputs">
                            <div class="color-group">
                                <label>主色</label>
                                <input type="color" class="color-input" data-key="primaryColor" value="${themeConfig.primaryColor}">
                            </div>
                            <div class="color-group">
                                <label>次要色</label>
                                <input type="color" class="color-input" data-key="secondaryColor" value="${themeConfig.secondaryColor}">
                            </div>
                            <div class="color-group">
                                <label>背景色</label>
                                <input type="color" class="color-input" data-key="bgColor" value="${themeConfig.bgColor}">
                            </div>
                            <div class="color-group">
                                <label>文字色</label>
                                <input type="color" class="color-input" data-key="textColor" value="${themeConfig.textColor}">
                            </div>
                            <div class="color-group">
                                <label>边框色</label>
                                <input type="color" class="color-input" data-key="borderColor" value="${themeConfig.borderColor}">
                            </div>
                        </div>
                        <div class="color-preview">
                            <h4>预览</h4>
                            <div class="preview-box">
                                <div class="preview-header" style="background-color: ${themeConfig.bgColor}; color: ${themeConfig.textColor}">
                                    标题
                                </div>
                                <div class="preview-content" style="background-color: ${themeConfig.bgColor}; color: ${themeConfig.textColor}">
                                    内容文本
                                    <button style="background-color: ${themeConfig.primaryColor}; color: white">按钮</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="btn-secondary cancel-btn">取消</button>
                        <button class="btn-primary save-btn">保存</button>
                    </div>
                </div>
            `;

            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const content = dialog.querySelector('.dialog-content');
            content.style.cssText = `
                background-color: var(--bg-color);
                border-radius: var(--border-radius);
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            `;

            // 事件处理
            const colorInputs = dialog.querySelectorAll('.color-input');
            const cancelBtn = dialog.querySelector('.cancel-btn');
            const saveBtn = dialog.querySelector('.save-btn');

            // 实时预览
            colorInputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    const key = e.target.dataset.key;
                    const value = e.target.value;
                    themeConfig[key] = value;

                    // 更新预览
                    this.updateColorPreview(dialog, themeConfig);
                });
            });

            cancelBtn.onclick = () => {
                document.body.removeChild(dialog);
                resolve(null);
            };

            saveBtn.onclick = () => {
                document.body.removeChild(dialog);
                resolve(themeConfig);
            };

            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                } else if (e.key === 'Enter') {
                    saveBtn.click();
                }
            });

            document.body.appendChild(dialog);
        });
    }

    // 更新颜色预览
    updateColorPreview(dialog, themeConfig) {
        const previewBox = dialog.querySelector('.preview-box');
        if (!previewBox) return;

        previewBox.innerHTML = `
            <div class="preview-header" style="background-color: ${themeConfig.bgColor}; color: ${themeConfig.textColor}">
                标题
            </div>
            <div class="preview-content" style="background-color: ${themeConfig.bgColor}; color: ${themeConfig.textColor}">
                内容文本
                <button style="background-color: ${themeConfig.primaryColor}; color: white">按钮</button>
            </div>
        `;
    }

    // 主题切换动画
    animateThemeChange() {
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    // 显示成功消息
    showSuccess(message) {
        // 实现成功提示
    }

    // 显示错误消息
    showError(message) {
        // 实现错误提示
    }

    // 销毁UI
    destroy() {
        // 清理资源
        this.container = null;
        this.themeToggle = null;
        this.themeSelector = null;
        this.customThemePanel = null;
        this.currentTheme = null;
    }
}

// 创建单例
const themeUI = new ThemeUI();