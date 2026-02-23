/**
 * 统计面板UI模块
 * 处理统计界面的渲染和数据可视化
 */

class StatsUI {
    constructor() {
        this.controller = statsController;
        this.container = null;
        this.updateButton = null;
        this.exportButton = null;

        this.init();
    }

    // 初始化UI
    init() {
        this.findElements();
        this.bindEvents();
        this.render();
        this.startAutoUpdate();
    }

    // 查找DOM元素
    findElements() {
        this.container = document.querySelector('.stats-container');
        this.updateButton = document.querySelector('.update-stats-btn');
        this.exportButton = document.querySelector('.export-stats-btn');
    }

    // 绑定事件
    bindEvents() {
        if (this.updateButton) {
            this.updateButton.addEventListener('click', () => this.updateStats());
        }

        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => this.exportStats());
        }

        // 监听统计数据更新
        window.addEventListener('stats-updated', () => this.render());

        // 监听窗口大小变化
        window.addEventListener('resize', debounce(() => this.renderCharts(), 250));
    }

    // 渲染界面
    render() {
        this.renderOverview();
        this.renderCharts();
        this.renderTrends();
        this.renderDetailedStats();
    }

    // 渲染概览统计
    renderOverview() {
        const stats = this.controller.updateAllStats();
        if (!stats) return;

        const overviewHTML = `
            <div class="stats-overview">
                <div class="overview-header">
                    <h3>📊 学习概览</h3>
                    <div class="overview-actions">
                        <button class="btn-secondary update-stats-btn">刷新</button>
                        <button class="btn-secondary export-stats-btn">导出</button>
                    </div>
                </div>
                <div class="overview-grid">
                    <div class="overview-card">
                        <div class="overview-icon">📝</div>
                        <div class="overview-content">
                            <div class="overview-value">${stats.noteStats.totalNotes}</div>
                            <div class="overview-label">总笔记数</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon">🍅</div>
                        <div class="overview-content">
                            <div class="overview-value">${stats.pomodoroStats.summary.totalFocusTime}</div>
                            <div class="overview-label">专注时长(分钟)</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon">🃏</div>
                        <div class="overview-content">
                            <div class="overview-value">${stats.ankiStats.summary.totalCount}</div>
                            <div class="overview-label">总卡片数</div>
                        </div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-icon">📈</div>
                        <div class="overview-content">
                            <div class="overview-value">${this.controller.calculateProductivityScore()}%</div>
                            <div class="overview-label">生产力分数</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const overviewContainer = document.querySelector('.stats-overview-container');
        if (overviewContainer) {
            overviewContainer.innerHTML = overviewHTML;
        }
    }

    // 渲染图表
    renderCharts() {
        this.renderLearningTrendChart();
        this.renderPomodoroDistributionChart();
        this.renderCardReviewChart();
        this.renderWeeklyProgressChart();
    }

    // 渲染学习趋势图表
    renderLearningTrendChart() {
        const trendData = this.controller.getLearningTrend(30);
        const chartData = this.getTrendChartData(trendData);

        this.controller.renderChart('learning-trend-chart', chartData, {
            type: 'line',
            width: this.getChartWidth(),
            height: 300,
            color: '#2563eb'
        });
    }

    // 渲染番茄钟分布图表
    renderPomodoroDistributionChart() {
        const pomodoros = this.controller.pomodoroController.getAllPomodoros();
        const distribution = this.getPomodoroDistribution(pomodoros);

        this.controller.renderChart('pomodoro-distribution-chart', distribution, {
            type: 'bar',
            width: this.getChartWidth(),
            height: 250,
            color: '#10b981'
        });
    }

    // 渲染卡片复习图表
    renderCardReviewChart() {
        const cards = this.controller.ankiController.getAllCards();
        const reviewData = this.getCardReviewData(cards);

        this.controller.renderChart('card-review-chart', reviewData, {
            type: 'pie',
            width: this.getChartWidth(),
            height: 300,
            colors: ['#ef4444', '#f59e0b', '#10b981', '#2563eb']
        });
    }

    // 渲染周进度图表
    renderWeeklyProgressChart() {
        const dailyStats = this.controller.pomodoroController.getStats().dailyStats;
        const weeklyData = this.getWeeklyProgressData(dailyStats);

        this.controller.renderChart('weekly-progress-chart', weeklyData, {
            type: 'bar',
            width: this.getChartWidth(),
            height: 250,
            color: '#8b5cf6'
        });
    }

    // 渲染趋势分析
    renderTrends() {
        const learningTrend = this.controller.getLearningTrend();
        const memoryTrend = this.controller.getMemoryTrend();

        const trendsHTML = `
            <div class="trends-section">
                <h4>📈 学习趋势分析</h4>
                <div class="trends-grid">
                    <div class="trend-item">
                        <div class="trend-label">学习趋势</div>
                        <div class="trend-value trend-${learningTrend.trend}">
                            ${this.getTrendText(learningTrend.trend)}
                            ${learningTrend.percentage > 0 ? `(+${learningTrend.percentage}%)` : ''}
                        </div>
                        <div class="trend-description">基于过去7天的专注时长</div>
                    </div>
                    <div class="trend-item">
                        <div class="trend-label">记忆趋势</div>
                        <div class="trend-value trend-${memoryTrend.trend}">
                            ${this.getTrendText(memoryTrend.trend)}
                            ${memoryTrend.percentage > 0 ? `(+${memoryTrend.percentage}%)` : ''}
                        </div>
                        <div class="trend-description">基于卡片复习效果</div>
                    </div>
                </div>
            </div>
        `;

        const trendsContainer = document.querySelector('.trends-container');
        if (trendsContainer) {
            trendsContainer.innerHTML = trendsHTML;
        }
    }

    // 渲染详细统计
    renderDetailedStats() {
        const noteStats = this.controller.noteController.getStats();
        const pomodoroStats = this.controller.pomodoroController.getStats();
        const ankiStats = this.controller.ankiController.getStats();

        const detailedStatsHTML = `
            <div class="detailed-stats-section">
                <div class="stats-section">
                    <h4>📝 笔记统计详情</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">总字数</span>
                            <span class="stat-value">${noteStats.totalWords}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均字数</span>
                            <span class="stat-value">${noteStats.averageWordsPerNote}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">标签数量</span>
                            <span class="stat-value">${noteStats.totalTags}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">置顶笔记</span>
                            <span class="stat-value">${noteStats.pinnedNotes}</span>
                        </div>
                    </div>
                </div>
                <div class="stats-section">
                    <h4>🍅 番茄钟统计详情</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">完成率</span>
                            <span class="stat-value">${pomodoroStats.summary.completionRate}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均每日专注</span>
                            <span class="stat-value">${pomodoroStats.summary.averageDailyFocusTime} 分钟</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">最佳时段</span>
                            <span class="stat-value">${pomodoroStats.summary.bestTimePeriod || '未统计'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">连续学习</span>
                            <span class="stat-value">${this.controller.calculateLearningStreak()} 天</span>
                        </div>
                    </div>
                </div>
                <div class="stats-section">
                    <h4>🃏 Anki统计详情</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">记忆保持率</span>
                            <span class="stat-value">${ankiStats.summary.retentionRate}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均复习次数</span>
                            <span class="stat-value">${ankiStats.summary.averageReviews}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">平均间隔</span>
                            <span class="stat-value">${ankiStats.summary.averageInterval} 天</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">新卡片数</span>
                            <span class="stat-value">${ankiStats.summary.newCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const detailedStatsContainer = document.querySelector('.detailed-stats-container');
        if (detailedStatsContainer) {
            detailedStatsContainer.innerHTML = detailedStatsHTML;
        }
    }

    // 更新统计
    async updateStats() {
        try {
            this.showLoading();
            await this.controller.updateAllStats();
            this.render();
            this.showSuccess('统计已更新');
        } catch (error) {
            console.error('Error updating stats:', error);
            this.showError('无法更新统计');
        } finally {
            this.hideLoading();
        }
    }

    // 导出统计
    exportStats() {
        try {
            const stats = this.controller.exportStats();
            if (!stats) {
                throw new Error('无法导出统计数据');
            }

            const jsonStr = JSON.stringify(stats, null, 2);
            downloadFile(`学习统计_${formatDate(new Date(), 'YYYY-MM-DD')}.json`, jsonStr, 'application/json');
            this.showSuccess('统计导出成功');
        } catch (error) {
            console.error('Error exporting stats:', error);
            this.showError('无法导出统计');
        }
    }

    // 开始自动更新
    startAutoUpdate() {
        // 每分钟更新一次
        setInterval(() => this.updateStats(), 60000);
    }

    // 获取图表数据
    getTrendChartData(trendData) {
        // 实现趋势图表数据获取
        return [];
    }

    // 获取番茄钟分布数据
    getPomodoroDistribution(pomodoros) {
        // 实现番茄钟分布数据获取
        return [];
    }

    // 获取卡片复习数据
    getCardReviewData(cards) {
        // 实现卡片复习数据获取
        return [];
    }

    // 获取周进度数据
    getWeeklyProgressData(dailyStats) {
        // 实现周进度数据获取
        return [];
    }

    // 获取图表宽度
    getChartWidth() {
        const container = document.querySelector('.stats-container');
        if (container) {
            return container.clientWidth - 40;
        }
        return 400;
    }

    // 获取趋势文本
    getTrendText(trend) {
        const trendMap = {
            'up': '📈 上升',
            'down': '📉 下降',
            'stable': '➡️ 稳定'
        };
        return trendMap[trend] || '➡️ 未知';
    }

    // 显示加载
    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'stats-loading';
        loading.innerHTML = '<div class="spinner"></div><span>正在更新统计...</span>';
        loading.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            gap: 1rem;
        `;
        this.container.style.position = 'relative';
        this.container.appendChild(loading);
    }

    // 隐藏加载
    hideLoading() {
        const loading = document.querySelector('.stats-loading');
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }
    }

    // 显示成功
    showSuccess(message) {
        // 实现成功提示
    }

    // 显示错误
    showError(message) {
        // 实现错误提示
    }

    // 销毁UI
    destroy() {
        // 清理资源
        this.container = null;
        this.updateButton = null;
        this.exportButton = null;
    }
}

// 创建单例
const statsUI = new StatsUI();