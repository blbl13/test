/**
 * 主题控制器类
 * 处理主题切换和样式管理
 */

class ThemeController {
    constructor() {
        this.themes = {
            light: {
                name: '浅色模式',
                primaryColor: '#2563eb',
                secondaryColor: '#64748b',
                bgColor: '#ffffff',
                textColor: '#1f2937',
                borderColor: '#e5e7eb',
                description: '适合日间使用，眼睛舒适'
            },
            dark: {
                name: '深色模式',
                primaryColor: '#3b82f6',
                secondaryColor: '#94a3b8',
                bgColor: '#0f172a',
                textColor: '#f1f5f9',
                borderColor: '#1e293b',
                description: '适合夜间使用，保护眼睛'
            },
            professional: {
                name: '专业模式',
                primaryColor: '#1e40af',
                secondaryColor: '#475569',
                bgColor: '#f8fafc',
                textColor: '#1e293b',
                borderColor: '#cbd5e1',
                description: '适合长时间阅读，减少眼疲劳'
            },
            blue: {
                name: '蓝色主题',
                primaryColor: '#0ea5e9',
                secondaryColor: '#64748b',
                bgColor: '#f0f9ff',
                textColor: '#0c4a6e',
                borderColor: '#bae6fd',
                description: '清新蓝色，适合学习'
            },
            green: {
                name: '绿色主题',
                primaryColor: '#10b981',
                secondaryColor: '#6b7280',
                bgColor: '#f0fdf4',
                textColor: '#166534',
                borderColor: '#bbf7d0',
                description: '自然绿色，清新护眼'
            }
        };
        this.currentTheme = 'light';
        this.customThemes = {};
        this.storageKey = 'currentTheme';
        this.loadTheme();
    }

    // 加载主题
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme) {
                this.setTheme(savedTheme);
            } else {
                this.setTheme('light');
            }

            // 加载自定义主题
            const customThemes = localStorage.getItem('customThemes');
            if (customThemes) {
                this.customThemes = JSON.parse(customThemes);
            }
        } catch (error) {
            console.error('Error loading theme:', error);
            this.setTheme('light');
        }
    }

    // 设置主题
    setTheme(themeName) {
        try {
            // 验证主题
            if (!this.themes[themeName] && !this.customThemes[themeName]) {
                console.warn(`Theme ${themeName} not found, using light theme`);
                themeName = 'light';
            }

            const theme = this.themes[themeName] || this.customThemes[themeName];

            // 更新data-theme属性
            document.documentElement.setAttribute('data-theme', themeName);

            // 更新CSS变量
            this.updateCSSVariables(theme);

            // 保存当前主题
            this.currentTheme = themeName;
            localStorage.setItem(this.storageKey, themeName);

            // 触发主题变更事件
            window.dispatchEvent(new CustomEvent('themeChange', {
                detail: { themeName, theme }
            }));

            return true;
        } catch (error) {
            console.error('Error setting theme:', error);
            return false;
        }
    }

    // 更新CSS变量
    updateCSSVariables(theme) {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        root.style.setProperty('--bg-color', theme.bgColor);
        root.style.setProperty('--text-color', theme.textColor);
        root.style.setProperty('--border-color', theme.borderColor);
    }

    // 获取当前主题
    getCurrentTheme() {
        const theme = this.themes[this.currentTheme] || this.customThemes[this.currentTheme];
        return {
            name: this.currentTheme,
            ...theme
        };
    }

    // 获取所有主题
    getAllThemes() {
        const themes = Object.keys(this.themes).map(key => ({
            name: key,
            ...this.themes[key],
            isCustom: false
        }));

        // 添加自定义主题
        Object.keys(this.customThemes).forEach(key => {
            themes.push({
                name: key,
                ...this.customThemes[key],
                isCustom: true
            });
        });

        return themes;
    }

    // 添加自定义主题
    addCustomTheme(themeName, themeConfig) {
        try {
            // 验证主题配置
            const requiredFields = ['primaryColor', 'secondaryColor', 'bgColor', 'textColor', 'borderColor'];
            const missingFields = requiredFields.filter(field => !themeConfig[field]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // 添加主题
            this.customThemes[themeName] = {
                ...themeConfig,
                name: themeName,
                description: themeConfig.description || '自定义主题'
            };

            // 保存到localStorage
            localStorage.setItem('customThemes', JSON.stringify(this.customThemes));

            // 触发主题添加事件
            window.dispatchEvent(new CustomEvent('themeAdded', {
                detail: { themeName, theme: this.customThemes[themeName] }
            }));

            return true;
        } catch (error) {
            console.error('Error adding custom theme:', error);
            throw error;
        }
    }

    // 删除自定义主题
    deleteCustomTheme(themeName) {
        try {
            if (!this.customThemes[themeName]) {
                throw new Error(`Theme ${themeName} not found`);
            }

            // 不能删除当前主题
            if (this.currentTheme === themeName) {
                throw new Error('Cannot delete current theme');
            }

            // 删除主题
            delete this.customThemes[themeName];

            // 更新localStorage
            localStorage.setItem('customThemes', JSON.stringify(this.customThemes));

            // 触发主题删除事件
            window.dispatchEvent(new CustomEvent('themeDeleted', {
                detail: { themeName }
            }));

            return true;
        } catch (error) {
            console.error('Error deleting custom theme:', error);
            throw error;
        }
    }

    // 更新自定义主题
    updateCustomTheme(themeName, themeConfig) {
        try {
            if (!this.customThemes[themeName]) {
                throw new Error(`Theme ${themeName} not found`);
            }

            // 更新主题
            this.customThemes[themeName] = {
                ...this.customThemes[themeName],
                ...themeConfig,
                name: themeName
            };

            // 更新localStorage
            localStorage.setItem('customThemes', JSON.stringify(this.customThemes));

            // 如果当前主题被更新，重新应用
            if (this.currentTheme === themeName) {
                this.setTheme(themeName);
            }

            // 触发主题更新事件
            window.dispatchEvent(new CustomEvent('themeUpdated', {
                detail: { themeName, theme: this.customThemes[themeName] }
            }));

            return true;
        } catch (error) {
            console.error('Error updating custom theme:', error);
            throw error;
        }
    }

    // 重置为主题默认设置
    resetTheme(themeName = this.currentTheme) {
        try {
            if (this.themes[themeName]) {
                // 重置为默认主题
                this.setTheme(themeName);
                return true;
            } else if (this.customThemes[themeName]) {
                // 删除自定义主题并切换到light
                this.deleteCustomTheme(themeName);
                this.setTheme('light');
                return true;
            } else {
                throw new Error(`Theme ${themeName} not found`);
            }
        } catch (error) {
            console.error('Error resetting theme:', error);
            throw error;
        }
    }

    // 获取主题配置
    getThemeConfig(themeName) {
        return this.themes[themeName] || this.customThemes[themeName] || null;
    }

    // 导出主题配置
    exportThemes() {
        try {
            return {
                currentTheme: this.currentTheme,
                customThemes: this.customThemes,
                exportDate: new Date().toISOString(),
                version: 1
            };
        } catch (error) {
            console.error('Error exporting themes:', error);
            return null;
        }
    }

    // 导入主题配置
    importThemes(themeData) {
        try {
            if (!themeData.customThemes) {
                throw new Error('Invalid theme data format');
            }

            // 导入自定义主题
            this.customThemes = { ...this.customThemes, ...themeData.customThemes };

            // 更新localStorage
            localStorage.setItem('customThemes', JSON.stringify(this.customThemes));

            // 如果导入数据中包含当前主题，切换到该主题
            if (themeData.currentTheme) {
                this.setTheme(themeData.currentTheme);
            }

            return { success: true };
        } catch (error) {
            console.error('Error importing themes:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取系统偏好主题
    getSystemPreferredTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // 监听系统主题变化
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                const systemTheme = e.matches ? 'dark' : 'light';
                window.dispatchEvent(new CustomEvent('systemThemeChange', {
                    detail: { theme: systemTheme }
                }));
            });
        }
    }

    // 应用系统主题
    applySystemTheme() {
        const systemTheme = this.getSystemPreferredTheme();
        this.setTheme(systemTheme);
        return systemTheme;
    }

    // 获取主题统计
    getThemeStats() {
        const allThemes = this.getAllThemes();
        const customThemes = Object.keys(this.customThemes);
        const defaultThemes = Object.keys(this.themes);

        return {
            totalThemes: allThemes.length,
            defaultThemes: defaultThemes.length,
            customThemes: customThemes.length,
            currentTheme: this.currentTheme,
            isCustom: customThemes.includes(this.currentTheme),
            allThemes: allThemes
        };
    }
}

// 创建单例
const themeController = new ThemeController();