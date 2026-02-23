/**
 * 番茄钟控制器类
 * 处理番茄钟相关的业务逻辑
 */

class PomodoroController {
    constructor() {
        this.pomodoros = [];
        this.currentPomodoro = null;
        this.timerInterval = null;
        this.startTime = null;
        this.isRunning = false;
        this.settings = {
            workDuration: 25,
            breakDuration: 5,
            autoStartBreak: true,
            soundEnabled: true,
            notificationsEnabled: true
        };
        this.storage = storageManager;
        this.loadData();
    }

    // 加载数据
    async loadData() {
        try {
            // 从存储加载番茄钟
            const storedPomodoros = await this.storage.getAll('pomodoros');
            this.pomodoros = storedPomodoros.map(pomodoroData => Pomodoro.fromJSON(pomodoroData));

            // 加载设置
            const savedSettings = getLocalStorage('pomodoroSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...savedSettings };
            }

            console.log(`Loaded ${this.pomodoros.length} pomodoros`);
        } catch (error) {
            console.error('Error loading pomodoro data:', error);
        }
    }

    // 保存番茄钟到存储
    async savePomodoro(pomodoro) {
        try {
            const pomodoroData = pomodoro.toJSON();
            await this.storage.update('pomodoros', pomodoroData);
            return true;
        } catch (error) {
            console.error('Error saving pomodoro:', error);
            return false;
        }
    }

    // 开始番茄钟
    async startPomodoro({
        workDuration = this.settings.workDuration,
        breakDuration = this.settings.breakDuration,
        noteId = null,
        noteTitle = ''
    } = {}) {
        try {
            // 停止当前番茄钟
            if (this.isRunning) {
                await this.stopPomodoro();
            }

            // 创建新的番茄钟
            const pomodoro = new Pomodoro({
                duration: workDuration,
                breakDuration: breakDuration,
                startTime: new Date(),
                status: 'in-progress',
                noteId: noteId,
                noteTitle: noteTitle,
                type: 'work'
            });

            this.currentPomodoro = pomodoro;
            this.startTime = new Date();
            this.isRunning = true;

            // 保存到存储
            await this.storage.add('pomodoros', pomodoro.toJSON());

            // 添加到列表
            this.pomodoros.push(pomodoro);

            // 启动计时器
            this.startTimer();

            // 播放开始声音
            if (this.settings.soundEnabled) {
                this.playSound('start');
            }

            // 发送通知
            if (this.settings.notificationsEnabled && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    new Notification('🍅 番茄钟开始', {
                        body: `专注工作 ${workDuration} 分钟`,
                        icon: '/favicon.svg'
                    });
                }
            }

            return pomodoro;
        } catch (error) {
            console.error('Error starting pomodoro:', error);
            throw error;
        }
    }

    // 停止番茄钟
    async stopPomodoro() {
        try {
            if (!this.isRunning || !this.currentPomodoro) {
                return null;
            }

            // 清除计时器
            this.stopTimer();

            // 计算实际持续时间
            const endTime = new Date();
            const actualDuration = Math.floor((endTime - this.startTime) / 1000 / 60);

            // 更新番茄钟状态
            this.currentPomodoro.complete(endTime);

            // 保存到存储
            await this.savePomodoro(this.currentPomodoro);

            // 播放结束声音
            if (this.settings.soundEnabled) {
                this.playSound('complete');
            }

            // 发送通知
            if (this.settings.notificationsEnabled && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    new Notification('🍅 番茄钟完成', {
                        body: `专注了 ${actualDuration} 分钟，休息一下吧！`,
                        icon: '/favicon.svg'
                    });
                }
            }

            // 自动开始休息
            if (this.settings.autoStartBreak) {
                setTimeout(() => {
                    this.startBreak();
                }, 1000);
            }

            const completedPomodoro = this.currentPomodoro;
            this.isRunning = false;
            this.currentPomodoro = null;
            this.startTime = null;

            return completedPomodoro;
        } catch (error) {
            console.error('Error stopping pomodoro:', error);
            throw error;
        }
    }

    // 开始休息
    startBreak() {
        if (this.currentPomodoro) {
            // 创建休息番茄钟
            const breakPomodoro = new Pomodoro({
                duration: this.currentPomodoro.breakDuration,
                breakDuration: this.currentPomodoro.duration,
                startTime: new Date(),
                status: 'in-progress',
                type: 'break'
            });

            this.currentPomodoro = breakPomodoro;
            this.startTime = new Date();
            this.isRunning = true;

            // 保存到存储
            this.storage.add('pomodoros', breakPomodoro.toJSON());
            this.pomodoros.push(breakPomodoro);

            this.startTimer();

            // 播放声音
            if (this.settings.soundEnabled) {
                this.playSound('break');
            }

            return breakPomodoro;
        }
        return null;
    }

    // 暂停番茄钟
    async pausePomodoro() {
        try {
            if (!this.isRunning) {
                return false;
            }

            this.stopTimer();
            this.isRunning = false;

            // 保存当前进度
            const pausedTime = new Date();
            const elapsedTime = pausedTime - this.startTime;
            const remainingTime = this.currentPomodoro.duration * 60 * 1000 - elapsedTime;

            // 更新番茄钟
            this.currentPomodoro.status = 'paused';
            await this.savePomodoro(this.currentPomodoro);

            // 播放声音
            if (this.settings.soundEnabled) {
                this.playSound('pause');
            }

            return { remainingTime: remainingTime };
        } catch (error) {
            console.error('Error pausing pomodoro:', error);
            throw error;
        }
    }

    // 恢复番茄钟
    async resumePomodoro() {
        try {
            if (this.isRunning || !this.currentPomodoro) {
                return false;
            }

            this.startTime = new Date();
            this.isRunning = true;
            this.currentPomodoro.status = 'in-progress';

            // 恢复计时器
            this.startTimer();

            // 保存到存储
            await this.savePomodoro(this.currentPomodoro);

            // 播放声音
            if (this.settings.soundEnabled) {
                this.playSound('resume');
            }

            return true;
        } catch (error) {
            console.error('Error resuming pomodoro:', error);
            throw error;
        }
    }

    // 跳过当前番茄钟
    async skipPomodoro() {
        try {
            if (!this.currentPomodoro) {
                return false;
            }

            // 清除计时器
            this.stopTimer();

            // 标记为中断
            const endTime = new Date();
            this.currentPomodoro.interrupt(endTime);

            // 保存到存储
            await this.savePomodoro(this.currentPomodoro);

            const skippedPomodoro = this.currentPomodoro;
            this.isRunning = false;
            this.currentPomodoro = null;
            this.startTime = null;

            return skippedPomodoro;
        } catch (error) {
            console.error('Error skipping pomodoro:', error);
            throw error;
        }
    }

    // 启动计时器
    startTimer() {
        this.stopTimer();

        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();

            // 检查是否完成
            if (this.startTime) {
                const elapsedTime = new Date() - this.startTime;
                const totalDuration = this.currentPomodoro.duration * 60 * 1000;

                if (elapsedTime >= totalDuration) {
                    this.stopPomodoro();
                }
            }
        }, 1000);
    }

    // 停止计时器
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // 更新计时器显示
    updateTimerDisplay() {
        if (!this.startTime || !this.currentPomodoro) {
            return;
        }

        const elapsedTime = new Date() - this.startTime;
        const totalDuration = this.currentPomodoro.duration * 60 * 1000;
        const remainingTime = Math.max(0, totalDuration - elapsedTime);

        const minutes = Math.floor(remainingTime / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

        // 更新显示
        const timeDisplay = document.querySelector('.time-left');
        if (timeDisplay) {
            timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // 更新进度条（如果存在）
        const progressBar = document.querySelector('.timer-progress');
        if (progressBar) {
            const progress = (elapsedTime / totalDuration) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    // 播放声音
    playSound(type) {
        try {
            const audio = new Audio();
            const soundMap = {
                start: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE',
                complete: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE',
                break: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE',
                pause: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE',
                resume: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE'
            };

            if (soundMap[type]) {
                audio.src = soundMap[type];
                audio.volume = 0.5;
                audio.play().catch(e => console.warn('Audio play failed:', e));
            }
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    }

    // 获取所有番茄钟
    getAllPomodoros() {
        return [...this.pomodoros];
    }

    // 根据ID获取番茄钟
    getPomodoroById(id) {
        return this.pomodoros.find(p => p.id === id) || null;
    }

    // 根据笔记ID获取番茄钟
    getPomodorosByNote(noteId) {
        return this.pomodoros.filter(p => p.noteId === noteId);
    }

    // 获取今日番茄钟
    getTodayPomodoros() {
        const stats = new PomodoroStats(this.pomodoros);
        return stats.getTodayPomodoros();
    }

    // 获取本周番茄钟
    getWeekPomodoros() {
        const stats = new PomodoroStats(this.pomodoros);
        return stats.getWeekPomodoros();
    }

    // 获取本月番茄钟
    getMonthPomodoros() {
        const stats = new PomodoroStats(this.pomodoros);
        return stats.getMonthPomodoros();
    }

    // 更新设置
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        setLocalStorage('pomodoroSettings', this.settings);
        return this.settings;
    }

    // 获取设置
    getSettings() {
        return { ...this.settings };
    }

    // 获取统计信息
    getStats() {
        const stats = new PomodoroStats(this.pomodoros);
        return stats.generateReport();
    }

    // 导出数据
    async exportData() {
        try {
            const data = {
                pomodoros: this.pomodoros.map(pomodoro => pomodoro.toJSON()),
                settings: this.settings,
                exportDate: new Date().toISOString(),
                version: 1
            };
            return data;
        } catch (error) {
            console.error('Error exporting pomodoro data:', error);
            return null;
        }
    }

    // 导入数据
    async importData(data) {
        try {
            if (!data.pomodoros) {
                throw new Error('Invalid data format');
            }

            // 清空现有数据
            await this.storage.clearStore('pomodoros');

            // 导入番茄钟
            for (const pomodoroData of data.pomodoros) {
                await this.storage.add('pomodoros', pomodoroData);
            }

            // 导入设置
            if (data.settings) {
                this.updateSettings(data.settings);
            }

            // 重新加载数据
            await this.loadData();

            return { success: true };
        } catch (error) {
            console.error('Error importing pomodoro data:', error);
            return { success: false, error: error.message };
        }
    }

    // 重置所有数据
    async resetData() {
        try {
            await this.storage.clearStore('pomodoros');
            this.pomodoros = [];
            this.currentPomodoro = null;
            this.stopTimer();
            return true;
        } catch (error) {
            console.error('Error resetting pomodoro data:', error);
            return false;
        }
    }

    // 请求通知权限
    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
            return Notification.permission === 'granted';
        }
        return false;
    }

    // 检查是否正在运行
    isRunning() {
        return this.isRunning;
    }

    // 获取当前番茄钟
    getCurrentPomodoro() {
        return this.currentPomodoro;
    }

    // 获取剩余时间
    getRemainingTime() {
        if (!this.startTime || !this.currentPomodoro) {
            return 0;
        }

        const elapsedTime = new Date() - this.startTime;
        const totalDuration = this.currentPomodoro.duration * 60 * 1000;
        const remainingTime = Math.max(0, totalDuration - elapsedTime);

        return remainingTime;
    }
}

// 创建单例
const pomodoroController = new PomodoroController();