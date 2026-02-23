/**
 * 时间线UI模块
 * 处理时间线视图的渲染和交互
 */

class TimelineUI {
    constructor() {
        this.noteController = noteController;
        this.pomodoroController = pomodoroController;
        this.ankiController = ankiController;
        this.container = null;
        this.content = null;
        this.filterButtons = {};
        this.currentFilter = {
            notes: true,
            pomodoros: true,
            reviews: true,
            startDate: null,
            endDate: null
        };

        this.init();
    }

    // 初始化UI
    init() {
        this.findElements();
        this.bindEvents();
        this.render();
    }

    // 查找DOM元素
    findElements() {
        this.container = document.querySelector('.timeline-container');
        this.content = document.querySelector('.timeline-content');
        this.filterButtons = {
            notes: document.querySelector('.filter-notes-btn'),
            pomodoros: document.querySelector('.filter-pomodoros-btn'),
            reviews: document.querySelector('.filter-reviews-btn')
        };
    }

    // 绑定事件
    bindEvents() {
        // 筛选按钮
        Object.keys(this.filterButtons).forEach(key => {
            const button = this.filterButtons[key];
            if (button) {
                button.addEventListener('click', () => this.toggleFilter(key));
            }
        });

        // 时间范围选择
        const dateInputs = this.container.querySelectorAll('.date-input');
        dateInputs.forEach(input => {
            input.addEventListener('change', (e) => this.updateDateRange(e.target.dataset.type, e.target.value));
        });

        // 刷新按钮
        const refreshBtn = this.container.querySelector('.refresh-timeline-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshTimeline());
        }

        // 导出按钮
        const exportBtn = this.container.querySelector('.export-timeline-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTimeline());
        }

        // 监听数据变化
        window.addEventListener('note-added', () => this.render());
        window.addEventListener('pomodoro-complete', () => this.render());
        window.addEventListener('card-reviewed', () => this.render());

        // 键盘导航
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // 渲染界面
    render() {
        this.renderTimeline();
        this.renderFilters();
    }

    // 渲染时间线
    renderTimeline() {
        if (!this.content) return;

        const timelineData = this.getTimelineData();
        const sortedEvents = this.sortTimelineEvents(timelineData);

        if (sortedEvents.length === 0) {
            this.content.innerHTML = `
                <div class="empty-timeline">
                    <p>时间线还没有数据</p>
                    <p>开始创建笔记、使用番茄钟或复习卡片来生成时间线</p>
                </div>
            `;
            return;
        }

        this.content.innerHTML = `
            <div class="timeline-header">
                <h3>📅 学习时间线</h3>
                <div class="timeline-stats">
                    <span>共 ${sortedEvents.length} 个事件</span>
                </div>
            </div>
            <div class="timeline-filters">
                <div class="filter-group">
                    <button class="filter-btn filter-notes-btn ${this.currentFilter.notes ? 'active' : ''}">
                        📝 笔记 (${this.countNotes()})
                    </button>
                    <button class="filter-btn filter-pomodoros-btn ${this.currentFilter.pomodoros ? 'active' : ''}">
                        🍅 番茄钟 (${this.countPomodoros()})
                    </button>
                    <button class="filter-btn filter-reviews-btn ${this.currentFilter.reviews ? 'active' : ''}">
                        🃏 复习 (${this.countReviews()})
                    </button>
                </div>
                <div class="date-filters">
                    <input type="date" class="date-input" data-type="start" placeholder="开始日期">
                    <input type="date" class="date-input" data-type="end" placeholder="结束日期">
                    <button class="btn-secondary refresh-timeline-btn">刷新</button>
                    <button class="btn-secondary export-timeline-btn">导出</button>
                </div>
            </div>
            <div class="timeline-events">
                ${this.renderTimelineEvents(sortedEvents)}
            </div>
        `;
    }

    // 渲染时间线事件
    renderTimelineEvents(events) {
        let html = '';
        let currentDate = null;

        events.forEach(event => {
            const eventDate = formatDate(event.timestamp, 'YYYY-MM-DD');

            // 添加日期分隔符
            if (eventDate !== currentDate) {
                html += this.renderDateSeparator(eventDate);
                currentDate = eventDate;
            }

            html += this.renderEventItem(event);
        });

        return html;
    }

    // 渲染日期分隔符
    renderDateSeparator(date) {
        const dateObj = new Date(date);
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        let dateText = formatDate(dateObj, 'MM月DD日');
        if (formatDate(dateObj, 'YYYY-MM-DD') === formatDate(today, 'YYYY-MM-DD')) {
            dateText = '📅 今天';
        } else if (formatDate(dateObj, 'YYYY-MM-DD') === formatDate(yesterday, 'YYYY-MM-DD')) {
            dateText = '📅 昨天';
        }

        return `
            <div class="timeline-date-separator">
                <span class="date-text">${dateText}</span>
                <span class="date-line"></span>
            </div>
        `;
    }

    // 渲染事件项
    renderEventItem(event) {
        const icon = this.getEventIcon(event.type);
        const time = formatDate(event.timestamp, 'HH:mm');
        const relativeTime = getRelativeTime(event.timestamp);

        return `
            <div class="timeline-event-item ${event.type}" data-event-id="${event.id}">
                <div class="event-marker">
                    <span class="event-icon">${icon}</span>
                </div>
                <div class="event-content">
                    <div class="event-header">
                        <span class="event-time">${time}</span>
                        <span class="event-relative-time">${relativeTime}</span>
                    </div>
                    <div class="event-body">
                        ${this.renderEventContent(event)}
                    </div>
                    <div class="event-footer">
                        ${this.renderEventFooter(event)}
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染事件内容
    renderEventContent(event) {
        switch (event.type) {
            case 'note':
                return `
                    <div class="event-title">${event.title}</div>
                    <div class="event-preview">${this.truncateText(event.preview, 100)}</div>
                `;
            case 'pomodoro':
                return `
                    <div class="event-title">${event.title}</div>
                    <div class="event-duration">专注 ${event.duration} 分钟</div>
                `;
            case 'review':
                return `
                    <div class="event-title">复习卡片</div>
                    <div class="event-card">${this.truncateText(event.cardFront, 80)}</div>
                    <div class="event-difficulty">难度: ${this.getDifficultyText(event.difficulty)}</div>
                `;
            default:
                return `<div class="event-title">${event.title}</div>`;
        }
    }

    // 渲染事件底部
    renderEventFooter(event) {
        const tags = [];

        // 添加标签
        if (event.tags && event.tags.length > 0) {
            tags.push(...event.tags.map(tag => `<span class="event-tag">${tag}</span>`));
        }

        // 添加类型标签
        tags.push(`<span class="event-type ${event.type}">${this.getTypeText(event.type)}</span>`);

        return tags.join('');
    }

    // 渲染筛选器
    renderFilters() {
        // 筛选器已在时间线中渲染
    }

    // 切换筛选
    toggleFilter(type) {
        this.currentFilter[type] = !this.currentFilter[type];
        this.render();
    }

    // 更新日期范围
    updateDateRange(type, value) {
        if (type === 'start') {
            this.currentFilter.startDate = value ? new Date(value) : null;
        } else if (type === 'end') {
            this.currentFilter.endDate = value ? new Date(value) : null;
        }
        this.render();
    }

    // 刷新时间线
    refreshTimeline() {
        this.render();
        this.showSuccess('时间线已刷新');
    }

    // 导出时间线
    exportTimeline() {
        try {
            const timelineData = this.getTimelineData();
            const sortedEvents = this.sortTimelineEvents(timelineData);

            const exportData = {
                events: sortedEvents,
                filter: this.currentFilter,
                exportDate: new Date().toISOString(),
                summary: {
                    totalEvents: sortedEvents.length,
                    byType: this.countByType(sortedEvents),
                    byDate: this.countByDate(sortedEvents)
                }
            };

            const jsonStr = JSON.stringify(exportData, null, 2);
            downloadFile(`学习时间线_${formatDate(new Date(), 'YYYY-MM-DD')}.json`, jsonStr, 'application/json');
            this.showSuccess('时间线导出成功');

        } catch (error) {
            console.error('Error exporting timeline:', error);
            this.showError('无法导出时间线');
        }
    }

    // 获取时间线数据
    getTimelineData() {
        const events = [];

        // 获取笔记事件
        if (this.currentFilter.notes) {
            const notes = this.noteController.getAllNotes();
            notes.forEach(note => {
                if (this.isInDateRange(note.createdAt)) {
                    events.push({
                        id: note.id,
                        type: 'note',
                        title: note.title,
                        preview: note.getSummary(),
                        timestamp: note.createdAt,
                        tags: note.tags,
                        data: note
                    });
                }

                if (note.updatedAt.getTime() !== note.createdAt.getTime() && this.isInDateRange(note.updatedAt)) {
                    events.push({
                        id: `${note.id}-update`,
                        type: 'note',
                        title: `${note.title} (更新)`,
                        preview: '笔记已更新',
                        timestamp: note.updatedAt,
                        tags: note.tags,
                        data: note
                    });
                }
            });
        }

        // 获取番茄钟事件
        if (this.currentFilter.pomodoros) {
            const pomodoros = this.pomodoroController.getAllPomodoros();
            pomodoros.forEach(pomodoro => {
                if (pomodoro.type === 'work' && pomodoro.status === 'completed' && this.isInDateRange(pomodoro.startTime)) {
                    events.push({
                        id: pomodoro.id,
                        type: 'pomodoro',
                        title: pomodoro.noteTitle || '番茄钟',
                        duration: pomodoro.calculateActualDuration(),
                        timestamp: pomodoro.startTime,
                        tags: pomodoro.noteId ? ['关联笔记'] : [],
                        data: pomodoro
                    });
                }
            });
        }

        // 获取复习事件
        if (this.currentFilter.reviews) {
            const cards = this.ankiController.getAllCards();
            cards.forEach(card => {
                card.reviewHistory.forEach(review => {
                    if (this.isInDateRange(review.reviewTime)) {
                        events.push({
                            id: `${card.id}-${review.reviewTime.getTime()}`,
                            type: 'review',
                            title: `复习: ${card.front.substring(0, 50)}...`,
                            cardFront: card.front,
                            difficulty: review.difficulty,
                            timestamp: review.reviewTime,
                            tags: card.tags,
                            data: { card, review }
                        });
                    }
                });
            });
        }

        return events;
    }

    // 排序时间线事件
    sortTimelineEvents(events) {
        return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    // 检查是否在日期范围内
    isInDateRange(date) {
        if (this.currentFilter.startDate && date < this.currentFilter.startDate) {
            return false;
        }
        if (this.currentFilter.endDate && date > this.currentFilter.endDate) {
            return false;
        }
        return true;
    }

    // 获取事件图标
    getEventIcon(type) {
        const iconMap = {
            'note': '📝',
            'pomodoro': '🍅',
            'review': '🃏'
        };
        return iconMap[type] || '📌';
    }

    // 获取难度文本
    getDifficultyText(difficulty) {
        const difficultyMap = {
            'again': '重来',
            'hard': '困难',
            'good': '良好',
            'easy': '简单'
        };
        return difficultyMap[difficulty] || '未知';
    }

    // 获取类型文本
    getTypeText(type) {
        const typeMap = {
            'note': '笔记',
            'pomodoro': '番茄钟',
            'review': '复习'
        };
        return typeMap[type] || '事件';
    }

    // 计算笔记数量
    countNotes() {
        return this.noteController.getAllNotes().length;
    }

    // 计算番茄钟数量
    countPomodoros() {
        return this.pomodoroController.getAllPomodoros().filter(p => p.type === 'work').length;
    }

    // 计算复习数量
    countReviews() {
        let count = 0;
        const cards = this.ankiController.getAllCards();
        cards.forEach(card => {
            count += card.reviewHistory.length;
        });
        return count;
    }

    // 按类型计数
    countByType(events) {
        const counts = { note: 0, pomodoro: 0, review: 0 };
        events.forEach(event => {
            if (counts[event.type] !== undefined) {
                counts[event.type]++;
            }
        });
        return counts;
    }

    // 按日期计数
    countByDate(events) {
        const counts = {};
        events.forEach(event => {
            const date = formatDate(event.timestamp, 'YYYY-MM-DD');
            if (!counts[date]) {
                counts[date] = 0;
            }
            counts[date]++;
        });
        return counts;
    }

    // 处理键盘事件
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'r':
                e.preventDefault();
                this.refreshTimeline();
                break;
            case 'e':
                e.preventDefault();
                this.exportTimeline();
                break;
        }
    }

    // 截断文本
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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
        this.content = null;
        this.filterButtons = {};
    }
}

// 创建单例
const timelineUI = new TimelineUI();