/**
 * 统计控制器类
 * 处理统计数据和可视化
 */

class StatsController {
    constructor() {
        this.noteController = noteController;
        this.pomodoroController = pomodoroController;
        this.ankiController = ankiController;
        this.updateInterval = null;
        this.startAutoUpdate();
    }

    // 自动更新统计数据
    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateAllStats();
        }, 60000); // 每分钟更新一次
    }

    // 停止自动更新
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // 更新所有统计数据
    updateAllStats() {
        try {
            // 笔记统计
            this.updateNoteStats();

            // 番茄钟统计
            this.updatePomodoroStats();

            // Anki统计
            this.updateAnkiStats();

            // 综合统计
            this.updateCombinedStats();
        } catch (error) {
            console.error('Error updating all stats:', error);
        }
    }

    // 更新笔记统计
    updateNoteStats() {
        try {
            const stats = this.noteController.getStats();
            this.updateStatDisplay('.total-notes', stats.totalNotes);
            this.updateStatDisplay('.total-words', stats.totalWords);
            this.updateStatDisplay('.tag-count', stats.totalTags);
            this.updateStatDisplay('.pinned-notes', stats.pinnedNotes);
            this.updateStatDisplay('.recent-notes', stats.recentNotes);
            this.updateStatDisplay('.average-words-per-note', stats.averageWordsPerNote);
        } catch (error) {
            console.error('Error updating note stats:', error);
        }
    }

    // 更新番茄钟统计
    updatePomodoroStats() {
        try {
            const stats = this.pomodoroController.getStats();
            const summary = stats.summary;

            this.updateStatDisplay('.today-focus', `${summary.totalFocusTime} 分钟`);
            this.updateStatDisplay('.week-focus', `${summary.totalFocusTime * 7} 分钟`);
            this.updateStatDisplay('.pomodoro-count', summary.totalCount);
            this.updateStatDisplay('.focus-time', `${summary.totalFocusTime} 分钟`);
        } catch (error) {
            console.error('Error updating pomodoro stats:', error);
        }
    }

    // 更新Anki统计
    updateAnkiStats() {
        try {
            const stats = this.ankiController.getStats();
            const summary = stats.summary;

            this.updateStatDisplay('.total-cards', summary.totalCount);
            this.updateStatDisplay('.today-reviews', summary.dueTodayCount);
            this.updateStatDisplay('.retention-rate', `${summary.retentionRate}%`);
            this.updateStatDisplay('.average-reviews', summary.averageReviews);
            this.updateStatDisplay('.average-interval', `${summary.averageInterval} 天`);
        } catch (error) {
            console.error('Error updating anki stats:', error);
        }
    }

    // 更新综合统计
    updateCombinedStats() {
        try {
            const noteStats = this.noteController.getStats();
            const pomodoroStats = this.pomodoroController.getStats();
            const ankiStats = this.ankiController.getStats();

            // 计算综合指标
            const totalStudyTime = pomodoroStats.summary.totalFocusTime;
            const totalReviews = ankiStats.summary.totalReviews || 0;
            const learningStreak = this.calculateLearningStreak();
            const productivityScore = this.calculateProductivityScore();

            this.updateStatDisplay('.total-study-time', `${totalStudyTime} 分钟`);
            this.updateStatDisplay('.total-reviews', totalReviews);
            this.updateStatDisplay('.learning-streak', `${learningStreak} 天`);
            this.updateStatDisplay('.productivity-score', `${productivityScore}%`);
        } catch (error) {
            console.error('Error updating combined stats:', error);
        }
    }

    // 更新统计显示
    updateStatDisplay(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    // 计算学习连续天数
    calculateLearningStreak() {
        try {
            const pomodoros = this.pomodoroController.getAllPomodoros();
            if (pomodoros.length === 0) return 0;

            // 按日期分组
            const dateMap = new Map();
            pomodoros.forEach(pomodoro => {
                const date = formatDate(pomodoro.startTime, 'YYYY-MM-DD');
                if (!dateMap.has(date)) {
                    dateMap.set(date, []);
                }
                dateMap.get(date).push(pomodoro);
            });

            const dates = Array.from(dateMap.keys()).sort();
            const today = formatDate(new Date(), 'YYYY-MM-DD');
            let streak = 0;

            // 从今天开始往前计算连续天数
            let currentDate = new Date();
            for (let i = 0; i < 365; i++) { // 最多检查一年
                const dateStr = formatDate(currentDate, 'YYYY-MM-DD');
                if (dateMap.has(dateStr) && dateMap.get(dateStr).some(p => p.type === 'work' && p.status === 'completed')) {
                    streak++;
                } else {
                    break;
                }
                currentDate.setDate(currentDate.getDate() - 1);
            }

            return streak;
        } catch (error) {
            console.error('Error calculating learning streak:', error);
            return 0;
        }
    }

    // 计算生产力分数
    calculateProductivityScore() {
        try {
            const noteStats = this.noteController.getStats();
            const pomodoroStats = this.pomodoroController.getStats();
            const ankiStats = this.ankiController.getStats();

            let score = 0;
            let maxScore = 100;

            // 笔记贡献 (30分)
            if (noteStats.totalNotes > 0) {
                const noteScore = Math.min(30, (noteStats.totalNotes / 50) * 30);
                score += noteScore;
            }

            // 番茄钟贡献 (40分)
            const totalFocusTime = pomodoroStats.summary.totalFocusTime;
            if (totalFocusTime > 0) {
                const pomodoroScore = Math.min(40, (totalFocusTime / 600) * 40); // 10小时=满分
                score += pomodoroScore;
            }

            // Anki贡献 (30分)
            const totalReviews = ankiStats.summary.totalReviews || 0;
            if (totalReviews > 0) {
                const ankiScore = Math.min(30, (totalReviews / 200) * 30); // 200次复习=满分
                score += ankiScore;
            }

            return Math.round(score);
        } catch (error) {
            console.error('Error calculating productivity score:', error);
            return 0;
        }
    }

    // 获取学习趋势数据
    getLearningTrend(days = 7) {
        try {
            const pomodoros = this.pomodoroController.getAllPomodoros();
            const stats = new PomodoroStats(pomodoros);
            return stats.getTrendData(days);
        } catch (error) {
            console.error('Error getting learning trend:', error);
            return { trend: 'stable', percentage: 0 };
        }
    }

    // 获取记忆趋势数据
    getMemoryTrend(days = 7) {
        try {
            const cards = this.ankiController.getAllCards();
            const stats = new AnkiStats(cards);
            return stats.getLearningTrend(days);
        } catch (error) {
            console.error('Error getting memory trend:', error);
            return { trend: 'stable', percentage: 0 };
        }
    }

    // 生成每日学习报告
    generateDailyReport(date = new Date()) {
        try {
            const dateStr = formatDate(date, 'YYYY-MM-DD');
            const pomodoros = this.pomodoroController.getTodayPomodoros();
            const pomodoroStats = new PomodoroStats(pomodoros);

            const dueCards = this.ankiController.getDueCards();
            const newCards = this.ankiController.getNewCards();

            const notes = this.noteController.getAllNotes();
            const notesCreated = notes.filter(note => formatDate(note.createdAt, 'YYYY-MM-DD') === dateStr);
            const notesUpdated = notes.filter(note => formatDate(note.updatedAt, 'YYYY-MM-DD') === dateStr);

            return {
                date: dateStr,
                summary: {
                    focusTime: pomodoroStats.getTotalFocusTime(),
                    completedPomodoros: pomodoroStats.getCompletedCount(),
                    cardsReviewed: dueCards.length,
                    newCardsCreated: newCards.length,
                    notesCreated: notesCreated.length,
                    notesUpdated: notesUpdated.length,
                    learningStreak: this.calculateLearningStreak(),
                    productivityScore: this.calculateProductivityScore()
                },
                details: {
                    pomodoros: pomodoros.map(p => p.toJSON()),
                    dueCards: dueCards.map(c => c.toJSON()),
                    newCards: newCards.map(c => c.toJSON()),
                    createdNotes: notesCreated.map(n => n.toJSON()),
                    updatedNotes: notesUpdated.map(n => n.toJSON())
                },
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating daily report:', error);
            return null;
        }
    }

    // 生成周报
    generateWeeklyReport() {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

            const pomodoros = this.pomodoroController.getWeekPomodoros();
            const pomodoroStats = new PomodoroStats(pomodoros);

            const cards = this.ankiController.getAllCards();
            const ankiStats = new AnkiStats(cards);

            const notes = this.noteController.getAllNotes();
            const weekNotes = notes.filter(note => note.createdAt >= startDate);

            return {
                period: {
                    start: formatDate(startDate, 'YYYY-MM-DD'),
                    end: formatDate(endDate, 'YYYY-MM-DD')
                },
                summary: {
                    totalFocusTime: pomodoroStats.getTotalFocusTime(),
                    averageDailyFocusTime: pomodoroStats.getAverageDailyFocusTime(),
                    completionRate: pomodoroStats.getCompletionRate(),
                    totalReviews: ankiStats.summary.totalReviews,
                    retentionRate: ankiStats.summary.retentionRate,
                    totalNotes: weekNotes.length,
                    learningTrend: this.getLearningTrend(7),
                    memoryTrend: this.getMemoryTrend(7)
                },
                dailyData: pomodoroStats.getDailyStats(),
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error generating weekly report:', error);
            return null;
        }
    }

    // 导出统计数据
    exportStats() {
        try {
            return {
                noteStats: this.noteController.getStats(),
                pomodoroStats: this.pomodoroController.getStats(),
                ankiStats: this.ankiController.getStats(),
                combinedStats: {
                    learningStreak: this.calculateLearningStreak(),
                    productivityScore: this.calculateProductivityScore(),
                    learningTrend: this.getLearningTrend(),
                    memoryTrend: this.getMemoryTrend()
                },
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting stats:', error);
            return null;
        }
    }

    // 渲染图表
    renderChart(containerId, data, options = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Chart container ${containerId} not found`);
                return;
            }

            // 简单的SVG图表渲染
            const defaultOptions = {
                width: 400,
                height: 200,
                margin: 20,
                type: 'bar',
                color: '#2563eb'
            };

            const config = { ...defaultOptions, ...options };

            // 创建SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', config.width);
            svg.setAttribute('height', config.height);

            // 根据数据类型渲染不同图表
            if (config.type === 'bar') {
                this.renderBarChart(svg, data, config);
            } else if (config.type === 'line') {
                this.renderLineChart(svg, data, config);
            } else if (config.type === 'pie') {
                this.renderPieChart(svg, data, config);
            }

            // 清空容器并添加图表
            container.innerHTML = '';
            container.appendChild(svg);

        } catch (error) {
            console.error('Error rendering chart:', error);
        }
    }

    // 渲染柱状图
    renderBarChart(svg, data, config) {
        const { width, height, margin, color } = config;
        const chartWidth = width - margin * 2;
        const chartHeight = height - margin * 2;

        const maxValue = Math.max(...data.map(d => d.value));
        const barWidth = chartWidth / data.length * 0.8;
        const barSpacing = chartWidth / data.length;

        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = margin + index * barSpacing + (barSpacing - barWidth) / 2;
            const y = height - margin - barHeight;

            // 创建柱子
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', color);

            // 添加动画
            rect.setAttribute('opacity', '0');
            rect.setAttribute('transform', 'translate(0, 20)');

            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animate.setAttribute('attributeName', 'opacity');
            animate.setAttribute('values', '0;1');
            animate.setAttribute('dur', '0.5s');
            animate.setAttribute('fill', 'freeze');
            rect.appendChild(animate);

            const animateTransform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
            animateTransform.setAttribute('attributeName', 'transform');
            animateTransform.setAttribute('type', 'translate');
            animateTransform.setAttribute('values', '0,20; 0,0');
            animateTransform.setAttribute('dur', '0.5s');
            animateTransform.setAttribute('fill', 'freeze');
            rect.appendChild(animateTransform);

            svg.appendChild(rect);
        });
    }

    // 渲染折线图
    renderLineChart(svg, data, config) {
        const { width, height, margin } = config;
        const chartWidth = width - margin * 2;
        const chartHeight = height - margin * 2;

        const maxValue = Math.max(...data.map(d => d.value));
        const points = data.map((item, index) => {
            const x = margin + (index / (data.length - 1)) * chartWidth;
            const y = height - margin - (item.value / maxValue) * chartHeight;
            return `${x},${y}`;
        });

        // 创建折线
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points.join(' '));
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', config.color);
        polyline.setAttribute('stroke-width', '2');

        svg.appendChild(polyline);
    }

    // 渲染饼图
    renderPieChart(svg, data, config) {
        const { width, height } = config;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - config.margin;

        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = 0;

        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 360;
            const startAngle = currentAngle * Math.PI / 180;
            const endAngle = (currentAngle + sliceAngle) * Math.PI / 180;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArcFlag = sliceAngle > 180 ? 1 : 0;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`);
            path.setAttribute('fill', config.colors[index % config.colors.length]);

            svg.appendChild(path);

            currentAngle += sliceAngle;
        });
    }

    // 销毁控制器
    destroy() {
        this.stopAutoUpdate();
    }
}

// 创建单例
const statsController = new StatsController();