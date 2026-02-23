/**
 * 番茄钟UI模块
 * 处理番茄钟界面的渲染和交互
 */

class PomodoroUI {
    constructor() {
        this.controller = pomodoroController;
        this.container = null;
        this.timerDisplay = null;
        this.startButton = null;
        this.pauseButton = null;
        this.resetButton = null;
        this.workDurationInput = null;
        this.breakDurationInput = null;
        this.statsContainer = null;
        this.noteLink = null;
        this.currentNote = null;

        this.init();
    }

    // 初始化UI
    init() {
        this.findElements();
        this.bindEvents();
        this.render();
        this.updateStats();
    }

    // 查找DOM元素
    findElements() {
        this.container = document.querySelector('.pomodoro-container');
        this.timerDisplay = document.querySelector('.time-left');
        this.startButton = document.querySelector('.start-btn');
        this.pauseButton = document.querySelector('.pause-btn');
        this.resetButton = document.querySelector('.reset-btn');
        this.workDurationInput = document.querySelector('.work-duration');
        this.breakDurationInput = document.querySelector('.break-duration');
        this.statsContainer = document.querySelector('.pomodoro-stats');
        this.noteLink = document.querySelector('.note-link');
    }

    // 绑定事件
    bindEvents() {
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.startPomodoro());
        }

        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => this.pausePomodoro());
        }

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetPomodoro());
        }

        if (this.workDurationInput) {
            this.workDurationInput.addEventListener('change', (e) => this.updateWorkDuration(e.target.value));
        }

        if (this.breakDurationInput) {
            this.breakDurationInput.addEventListener('change', (e) => this.updateBreakDuration(e.target.value));
        }

        // 监听番茄钟状态变化
        window.addEventListener('pomodoro-start', (e) => this.onPomodoroStart(e.detail));
        window.addEventListener('pomodoro-stop', (e) => this.onPomodoroStop(e.detail));
        window.addEventListener('pomodoro-pause', (e) => this.onPomodoroPause(e.detail));
        window.addEventListener('pomodoro-resume', (e) => this.onPomodoroResume(e.detail));
        window.addEventListener('pomodoro-complete', (e) => this.onPomodoroComplete(e.detail));
        window.addEventListener('pomodoro-interrupt', (e) => this.onPomodoroInterrupt(e.detail));

        // 监听时间更新
        setInterval(() => this.updateTimer(), 1000);

        // 监听笔记变化
        window.addEventListener('note-selected', (e) => this.onNoteSelected(e.detail));
    }

    // 渲染番茄钟界面
    render() {
        this.renderTimer();
        this.renderControls();
        this.renderSettings();
        this.renderNoteLink();
        this.updateStats();
    }

    // 渲染计时器
    renderTimer() {
        if (!this.timerDisplay) return;

        const remainingTime = this.controller.getRemainingTime();
        const minutes = Math.floor(remainingTime / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

        this.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // 根据剩余时间改变颜色
        if (remainingTime < 60000) { // 少于1分钟
            this.timerDisplay.style.color = 'var(--danger-color)';
        } else if (remainingTime < 300000) { // 少于5分钟
            this.timerDisplay.style.color = 'var(--warning-color)';
        } else {
            this.timerDisplay.style.color = 'var(--text-color)';
        }

        // 更新进度条
        this.updateProgressBar();
    }

    // 更新进度条
    updateProgressBar() {
        const progressBar = document.querySelector('.timer-progress');
        if (!progressBar) return;

        const currentPomodoro = this.controller.getCurrentPomodoro();
        if (!currentPomodoro) {
            progressBar.style.width = '0%';
            return;
        }

        const remainingTime = this.controller.getRemainingTime();
        const totalDuration = currentPomodoro.duration * 60 * 1000;
        const progress = ((totalDuration - remainingTime) / totalDuration) * 100;

        progressBar.style.width = `${progress}%`;

        // 根据进度改变颜色
        if (progress > 80) {
            progressBar.style.backgroundColor = 'var(--danger-color)';
        } else if (progress > 60) {
            progressBar.style.backgroundColor = 'var(--warning-color)';
        } else {
            progressBar.style.backgroundColor = 'var(--primary-color)';
        }
    }

    // 渲染控制按钮
    renderControls() {
        if (!this.startButton || !this.pauseButton || !this.resetButton) return;

        const isRunning = this.controller.isRunning();
        const currentPomodoro = this.controller.getCurrentPomodoro();

        if (isRunning) {
            this.startButton.classList.add('hidden');
            this.pauseButton.classList.remove('hidden');
            this.resetButton.classList.remove('hidden');
        } else {
            this.startButton.classList.remove('hidden');
            this.pauseButton.classList.add('hidden');
            if (currentPomodoro && currentPomodoro.status === 'paused') {
                this.resetButton.classList.remove('hidden');
            } else {
                this.resetButton.classList.add('hidden');
            }
        }

        // 更新按钮文本
        if (currentPomodoro) {
            if (currentPomodoro.type === 'break') {
                this.startButton.textContent = '开始休息';
            } else {
                this.startButton.textContent = '开始专注';
            }
        } else {
            this.startButton.textContent = '开始专注';
        }
    }

    // 渲染设置
    renderSettings() {
        const settings = this.controller.getSettings();

        if (this.workDurationInput) {
            this.workDurationInput.value = settings.workDuration;
        }

        if (this.breakDurationInput) {
            this.breakDurationInput.value = settings.breakDuration;
        }
    }

    // 渲染笔记链接
    renderNoteLink() {
        if (!this.noteLink) return;

        const currentNote = this.currentNote;
        if (currentNote) {
            this.noteLink.textContent = `关联笔记: ${currentNote.title}`;
            this.noteLink.style.display = 'block';
            this.noteLink.onclick = () => this.openNote(currentNote.id);
        } else {
            this.noteLink.textContent = '没有关联笔记';
            this.noteLink.style.display = 'none';
        }
    }

    // 更新统计
    updateStats() {
        const stats = this.controller.getStats();
        const summary = stats.summary;

        // 更新统计显示
        const pomodoroCount = document.querySelector('.pomodoro-count');
        if (pomodoroCount) {
            pomodoroCount.textContent = summary.totalCount;
        }

        const focusTime = document.querySelector('.focus-time');
        if (focusTime) {
            focusTime.textContent = `${summary.totalFocusTime} 分钟`;
        }

        // 更新今日统计
        const todayStats = this.controller.getTodayPomodoros();
        const todayCount = todayStats.filter(p => p.type === 'work' && p.status === 'completed').length;
        const todayFocusTime = todayStats
            .filter(p => p.type === 'work' && p.status === 'completed')
            .reduce((total, p) => total + p.calculateActualDuration(), 0);

        const todayPomodoroCount = document.querySelector('.today-pomodoro-count');
        if (todayPomodoroCount) {
            todayPomodoroCount.textContent = todayCount;
        }

        const todayFocusTimeElement = document.querySelector('.today-focus-time');
        if (todayFocusTimeElement) {
            todayFocusTimeElement.textContent = `${todayFocusTime} 分钟`;
        }

        // 更新完成率
        const completionRate = document.querySelector('.completion-rate');
        if (completionRate) {
            completionRate.textContent = `${summary.completionRate}%`;
        }
    }

    // 开始番茄钟
    async startPomodoro() {
        try {
            const workDuration = parseInt(this.workDurationInput.value) || 25;
            const breakDuration = parseInt(this.breakDurationInput.value) || 5;

            // 更新设置
            this.controller.updateSettings({
                workDuration: workDuration,
                breakDuration: breakDuration
            });

            // 开始番茄钟
            const noteId = this.currentNote ? this.currentNote.id : null;
            const noteTitle = this.currentNote ? this.currentNote.title : '';

            await this.controller.startPomodoro({
                workDuration: workDuration,
                breakDuration: breakDuration,
                noteId: noteId,
                noteTitle: noteTitle
            });

            this.render();
            this.showNotification('🍅 番茄钟开始', '专注工作即将开始！');

        } catch (error) {
            console.error('Error starting pomodoro:', error);
            this.showError('无法开始番茄钟');
        }
    }

    // 暂停番茄钟
    async pausePomodoro() {
        try {
            await this.controller.pausePomodoro();
            this.render();
            this.showNotification('⏸️ 番茄钟暂停', '休息一下吧！');
        } catch (error) {
            console.error('Error pausing pomodoro:', error);
            this.showError('无法暂停番茄钟');
        }
    }

    // 恢复番茄钟
    async resumePomodoro() {
        try {
            await this.controller.resumePomodoro();
            this.render();
            this.showNotification('▶️ 番茄钟恢复', '继续专注！');
        } catch (error) {
            console.error('Error resuming pomodoro:', error);
            this.showError('无法恢复番茄钟');
        }
    }

    // 重置番茄钟
    async resetPomodoro() {
        try {
            await this.controller.skipPomodoro();
            this.render();
            this.showNotification('🔄 番茄钟重置', '已重置当前番茄钟');
        } catch (error) {
            console.error('Error resetting pomodoro:', error);
            this.showError('无法重置番茄钟');
        }
    }

    // 更新工作时长
    updateWorkDuration(duration) {
        const value = parseInt(duration) || 25;
        this.controller.updateSettings({ workDuration: value });
    }

    // 更新休息时长
    updateBreakDuration(duration) {
        const value = parseInt(duration) || 5;
        this.controller.updateSettings({ breakDuration: value });
    }

    // 处理笔记选择
    onNoteSelected(note) {
        this.currentNote = note;
        this.renderNoteLink();
    }

    // 打开笔记
    openNote(noteId) {
        // 切换到笔记视图
        const notesBtn = document.querySelector('[data-view="notes"]');
        if (notesBtn) {
            notesBtn.click();
            // 选中笔记
            setTimeout(() => {
                const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
                if (noteElement) {
                    noteElement.click();
                }
            }, 100);
        }
    }

    // 更新计时器
    updateTimer() {
        this.renderTimer();
    }

    // 处理番茄钟开始
    onPomodoroStart(pomodoro) {
        this.render();
        this.animateTimerStart();
        this.updateStats();
    }

    // 处理番茄钟停止
    onPomodoroStop(pomodoro) {
        this.render();
        this.animateTimerStop();
        this.updateStats();
    }

    // 处理番茄钟暂停
    onPomodoroPause(pomodoro) {
        this.render();
        this.animateTimerPause();
    }

    // 处理番茄钟恢复
    onPomodoroResume(pomodoro) {
        this.render();
        this.animateTimerResume();
    }

    // 处理番茄钟完成
    onPomodoroComplete(pomodoro) {
        this.render();
        this.animateTimerComplete();
        this.updateStats();
        this.showCompletionNotification(pomodoro);
    }

    // 处理番茄钟中断
    onPomodoroInterrupt(pomodoro) {
        this.render();
        this.animateTimerInterrupt();
        this.updateStats();
    }

    // 动画效果
    animateTimerStart() {
        if (this.timerDisplay) {
            this.timerDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.timerDisplay.style.transform = 'scale(1)';
            }, 200);
        }
    }

    animateTimerStop() {
        if (this.timerDisplay) {
            this.timerDisplay.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.timerDisplay.style.transform = 'scale(1)';
            }, 200);
        }
    }

    animateTimerPause() {
        if (this.timerDisplay) {
            this.timerDisplay.style.opacity = '0.5';
        }
    }

    animateTimerResume() {
        if (this.timerDisplay) {
            this.timerDisplay.style.opacity = '1';
        }
    }

    animateTimerComplete() {
        if (this.timerDisplay) {
            this.timerDisplay.style.color = 'var(--success-color)';
            this.timerDisplay.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.timerDisplay.style.color = 'var(--text-color)';
                this.timerDisplay.style.transform = 'scale(1)';
            }, 500);
        }
    }

    animateTimerInterrupt() {
        if (this.timerDisplay) {
            this.timerDisplay.style.color = 'var(--danger-color)';
            setTimeout(() => {
                this.timerDisplay.style.color = 'var(--text-color)';
            }, 300);
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

        // 显示界面通知
        this.showInlineNotification(message);
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

        // 自动移除
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

    // 显示成功
    showSuccess(message) {
        this.showInlineNotification(message, 'success');
    }

    // 显示完成通知
    showCompletionNotification(pomodoro) {
        const duration = pomodoro.calculateActualDuration();
        const message = `🎉 恭喜完成！专注了 ${duration} 分钟`;

        this.showNotification('🍅 番茄钟完成', message);

        // 显示庆祝动画
        this.showCelebrationAnimation();
    }

    // 显示庆祝动画
    showCelebrationAnimation() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: 50%;
                    left: ${Math.random() * 100}%px;
                    top: 100%;
                    animation: celebrate 2s ease-out forwards;
                `;

                container.appendChild(particle);

                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 2000);
            }, i * 100);
        }

        document.body.appendChild(container);

        setTimeout(() => {
            if (container.parentNode) {
                document.body.removeChild(container);
            }
        }, 2000);
    }

    // 销毁UI
    destroy() {
        // 清理资源
        this.container = null;
        this.timerDisplay = null;
        this.startButton = null;
        this.pauseButton = null;
        this.resetButton = null;
    }
}

// 创建单例
const pomodoroUI = new PomodoroUI();