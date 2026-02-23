/**
 * 番茄钟模型类
 */

class Pomodoro {
    constructor({
        id = null,
        duration = 25,
        breakDuration = 5,
        startTime = new Date(),
        endTime = null,
        status = 'completed', // completed, interrupted, in-progress
        noteId = null,
        noteTitle = '',
        type = 'work', // work, break
        completedAt = null,
        metadata = {}
    } = {}) {
        this.id = id || generateId();
        this.duration = duration; // 分钟
        this.breakDuration = breakDuration; // 分钟
        this.startTime = startTime instanceof Date ? startTime : new Date(startTime);
        this.endTime = endTime ? (endTime instanceof Date ? endTime : new Date(endTime)) : null;
        this.status = status;
        this.noteId = noteId;
        this.noteTitle = noteTitle;
        this.type = type;
        this.completedAt = completedAt ? (completedAt instanceof Date ? completedAt : new Date(completedAt)) : null;
        this.metadata = metadata;
    }

    // 计算结束时间
    calculateEndTime() {
        if (!this.endTime && this.status === 'completed') {
            const durationMs = this.duration * 60 * 1000;
            this.endTime = new Date(this.startTime.getTime() + durationMs);
        }
        return this.endTime;
    }

    // 计算实际持续时间
    calculateActualDuration() {
        if (this.status === 'in-progress') return 0;

        const endTime = this.calculateEndTime();
        if (!endTime) return this.duration;

        const actualDuration = (endTime - this.startTime) / (1000 * 60); // 转换为分钟
        return Math.max(0, Math.round(actualDuration));
    }

    // 计算休息结束时间
    calculateBreakEndTime() {
        const breakDurationMs = this.breakDuration * 60 * 1000;
        return new Date(this.calculateEndTime().getTime() + breakDurationMs);
    }

    // 检查是否在休息
    isInBreak(currentTime = new Date()) {
        if (this.type !== 'work') return false;
        if (this.status !== 'completed') return false;

        const breakEndTime = this.calculateBreakEndTime();
        return currentTime >= this.calculateEndTime() && currentTime <= breakEndTime;
    }

    // 标记为完成
    complete(endTime = new Date()) {
        this.endTime = endTime;
        this.status = 'completed';
        this.completedAt = endTime;
        return this;
    }

    // 标记为中断
    interrupt(endTime = new Date()) {
        this.endTime = endTime;
        this.status = 'interrupted';
        this.completedAt = endTime;
        return this;
    }

    // 检查是否有效
    isValid() {
        return this.duration > 0 &&
               this.breakDuration > 0 &&
               this.startTime < this.calculateEndTime();
    }

    // 获取日期
    getDate() {
        return formatDate(this.startTime, 'YYYY-MM-DD');
    }

    // 获取小时
    getHour() {
        return this.startTime.getHours();
    }

    // 获取星期
    getDayOfWeek() {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[this.startTime.getDay()];
    }

    // 获取时间段
    getTimePeriod() {
        const hour = this.getHour();
        if (hour >= 5 && hour < 8) return '清晨';
        if (hour >= 8 && hour < 12) return '上午';
        if (hour >= 12 && hour < 14) return '中午';
        if (hour >= 14 && hour < 18) return '下午';
        if (hour >= 18 && hour < 22) return '晚上';
        return '深夜';
    }

    // 转换为JSON
    toJSON() {
        return {
            id: this.id,
            duration: this.duration,
            breakDuration: this.breakDuration,
            startTime: this.startTime.toISOString(),
            endTime: this.endTime ? this.endTime.toISOString() : null,
            status: this.status,
            noteId: this.noteId,
            noteTitle: this.noteTitle,
            type: this.type,
            completedAt: this.completedAt ? this.completedAt.toISOString() : null,
            metadata: this.metadata
        };
    }

    // 从JSON创建实例
    static fromJSON(json) {
        return new Pomodoro({
            id: json.id,
            duration: json.duration,
            breakDuration: json.breakDuration,
            startTime: json.startTime,
            endTime: json.endTime,
            status: json.status || 'completed',
            noteId: json.noteId,
            noteTitle: json.noteTitle || '',
            type: json.type || 'work',
            completedAt: json.completedAt,
            metadata: json.metadata || {}
        });
    }

    // 比较两个番茄钟是否相等
    equals(other) {
        if (!(other instanceof Pomodoro)) return false;
        return this.id === other.id &&
               this.duration === other.duration &&
               this.breakDuration === other.breakDuration &&
               this.startTime.getTime() === other.startTime.getTime() &&
               this.status === other.status;
    }

    // 获取番茄钟统计信息
    getStats() {
        return {
            duration: this.duration,
            actualDuration: this.calculateActualDuration(),
            breakDuration: this.breakDuration,
            status: this.status,
            startTime: this.startTime,
            endTime: this.calculateEndTime(),
            date: this.getDate(),
            dayOfWeek: this.getDayOfWeek(),
            timePeriod: this.getTimePeriod(),
            noteId: this.noteId,
            noteTitle: this.noteTitle,
            type: this.type,
            isValid: this.isValid()
        };
    }

    // 静态方法：创建空番茄钟
    static createEmpty() {
        return new Pomodoro({
            duration: 25,
            breakDuration: 5,
            startTime: new Date()
        });
    }

    // 静态方法：创建番茄钟会话（包含工作和休息）
    static createSession({
        workDuration = 25,
        breakDuration = 5,
        startTime = new Date(),
        noteId = null,
        noteTitle = ''
    } = {}) {
        const workPomodoro = new Pomodoro({
            duration: workDuration,
            breakDuration: breakDuration,
            startTime: startTime,
            noteId: noteId,
            noteTitle: noteTitle,
            type: 'work'
        });

        const breakStartTime = new Date(startTime.getTime() + workDuration * 60 * 1000);
        const breakPomodoro = new Pomodoro({
            duration: breakDuration,
            breakDuration: workDuration,
            startTime: breakStartTime,
            status: 'pending',
            type: 'break'
        });

        return {
            work: workPomodoro,
            break: breakPomodoro,
            totalDuration: workDuration + breakDuration,
            sessionId: generateId()
        };
    }

    // 静态方法：创建番茄钟序列
    static createSequence({
        workDuration = 25,
        breakDuration = 5,
        longBreakDuration = 15,
        sessions = 4,
        startTime = new Date(),
        noteId = null,
        noteTitle = ''
    } = {}) {
        const pomodoros = [];
        let currentTime = new Date(startTime);

        for (let i = 0; i < sessions; i++) {
            // 工作时段
            const work = new Pomodoro({
                duration: workDuration,
                breakDuration: breakDuration,
                startTime: currentTime,
                noteId: noteId,
                noteTitle: noteTitle,
                type: 'work'
            });
            pomodoros.push(work);

            currentTime = new Date(currentTime.getTime() + workDuration * 60 * 1000);

            // 休息时段
            if (i < sessions - 1) {
                const breakPomodoro = new Pomodoro({
                    duration: breakDuration,
                    breakDuration: workDuration,
                    startTime: currentTime,
                    type: 'break'
                });
                pomodoros.push(breakPomodoro);
                currentTime = new Date(currentTime.getTime() + breakDuration * 60 * 1000);
            } else {
                // 长休息
                const longBreak = new Pomodoro({
                    duration: longBreakDuration,
                    breakDuration: workDuration,
                    startTime: currentTime,
                    type: 'break'
                });
                pomodoros.push(longBreak);
            }
        }

        return pomodoros;
    }
}

// 番茄钟统计工具类
class PomodoroStats {
    constructor(pomodoros = []) {
        this.pomodoros = pomodoros;
    }

    // 获取总番茄钟数
    getTotalCount() {
        return this.pomodoros.length;
    }

    // 获取完成的番茄钟数
    getCompletedCount() {
        return this.pomodoros.filter(p => p.status === 'completed').length;
    }

    // 获取中断的番茄钟数
    getInterruptedCount() {
        return this.pomodoros.filter(p => p.status === 'interrupted').length;
    }

    // 获取进行中的番茄钟数
    getInProgressCount() {
        return this.pomodoros.filter(p => p.status === 'in-progress').length;
    }

    // 获取总专注时长（分钟）
    getTotalFocusTime() {
        return this.pomodoros
            .filter(p => p.type === 'work' && p.status === 'completed')
            .reduce((total, p) => total + p.calculateActualDuration(), 0);
    }

    // 获取总休息时长（分钟）
    getTotalBreakTime() {
        return this.pomodoros
            .filter(p => p.type === 'break' && p.status === 'completed')
            .reduce((total, p) => total + p.calculateActualDuration(), 0);
    }

    // 按日期分组
    getByDate() {
        const grouped = {};
        this.pomodoros.forEach(pomodoro => {
            const date = pomodoro.getDate();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(pomodoro);
        });
        return grouped;
    }

    // 获取今日番茄钟
    getTodayPomodoros() {
        const today = new Date().toISOString().split('T')[0];
        return this.pomodoros.filter(p => p.getDate() === today);
    }

    // 获取本周番茄钟
    getWeekPomodoros() {
        const today = new Date();
        const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.pomodoros.filter(p => {
            const date = p.startTime;
            return date >= weekStart && date <= weekEnd;
        });
    }

    // 获取本月番茄钟
    getMonthPomodoros() {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return this.pomodoros.filter(p => {
            const date = p.startTime;
            return date >= monthStart && date <= monthEnd;
        });
    }

    // 获取最佳学习时段
    getBestTimePeriod() {
        const periodStats = {};
        this.pomodoros
            .filter(p => p.type === 'work' && p.status === 'completed')
            .forEach(pomodoro => {
                const period = pomodoro.getTimePeriod();
                if (!periodStats[period]) {
                    periodStats[period] = { count: 0, totalDuration: 0 };
                }
                periodStats[period].count++;
                periodStats[period].totalDuration += pomodoro.calculateActualDuration();
            });

        let bestPeriod = '';
        let maxDuration = 0;

        Object.keys(periodStats).forEach(period => {
            if (periodStats[period].totalDuration > maxDuration) {
                maxDuration = periodStats[period].totalDuration;
                bestPeriod = period;
            }
        });

        return bestPeriod;
    }

    // 获取完成率
    getCompletionRate() {
        const total = this.getTotalCount();
        if (total === 0) return 0;
        return (this.getCompletedCount() / total) * 100;
    }

    // 获取平均每日专注时长
    getAverageDailyFocusTime() {
        const dailyStats = this.getDailyStats();
        if (dailyStats.length === 0) return 0;
        const totalFocusTime = dailyStats.reduce((sum, day) => sum + day.focusTime, 0);
        return Math.round(totalFocusTime / dailyStats.length);
    }

    // 获取每日统计数据
    getDailyStats() {
        const grouped = this.getByDate();
        return Object.keys(grouped).map(date => {
            const pomodoros = grouped[date];
            const workPomodoros = pomodoros.filter(p => p.type === 'work');
            const focusTime = workPomodoros.reduce((total, p) => total + p.calculateActualDuration(), 0);
            const completedCount = workPomodoros.filter(p => p.status === 'completed').length;

            return {
                date: date,
                focusTime: focusTime,
                completedCount: completedCount,
                totalSessions: completedCount,
                averageSessionDuration: completedCount > 0 ? Math.round(focusTime / completedCount) : 0
            };
        }).sort((a, b) => a.date.localeCompare(b.date));
    }

    // 获取趋势数据
    getTrendData(days = 7) {
        const dailyStats = this.getDailyStats();
        const recentStats = dailyStats.slice(-days);
        const previousStats = dailyStats.slice(-days * 2, -days);

        if (recentStats.length === 0) {
            return { trend: 'stable', percentage: 0 };
        }

        if (previousStats.length === 0) {
            return { trend: 'up', percentage: 100 };
        }

        const recentFocusTime = recentStats.reduce((sum, day) => sum + day.focusTime, 0);
        const previousFocusTime = previousStats.reduce((sum, day) => sum + day.focusTime, 0);

        if (previousFocusTime === 0) {
            return recentFocusTime > 0 ? { trend: 'up', percentage: 100 } : { trend: 'stable', percentage: 0 };
        }

        const percentage = ((recentFocusTime - previousFocusTime) / previousFocusTime) * 100;

        let trend = 'stable';
        if (percentage > 10) trend = 'up';
        else if (percentage < -10) trend = 'down';

        return { trend, percentage: Math.round(percentage) };
    }

    // 获取与笔记关联的番茄钟
    getPomodorosByNote(noteId) {
        return this.pomodoros.filter(p => p.noteId === noteId);
    }

    // 获取最受欢迎的笔记（按番茄钟数量）
    getPopularNotes() {
        const noteStats = {};
        this.pomodoros
            .filter(p => p.noteId && p.type === 'work' && p.status === 'completed')
            .forEach(pomodoro => {
                if (!noteStats[pomodoro.noteId]) {
                    noteStats[pomodoro.noteId] = {
                        noteTitle: pomodoro.noteTitle,
                        count: 0,
                        totalDuration: 0
                    };
                }
                noteStats[pomodoro.noteId].count++;
                noteStats[pomodoro.noteId].totalDuration += pomodoro.calculateActualDuration();
            });

        return Object.values(noteStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    // 导出统计报告
    generateReport() {
        return {
            summary: {
                totalCount: this.getTotalCount(),
                completedCount: this.getCompletedCount(),
                totalFocusTime: this.getTotalFocusTime(),
                totalBreakTime: this.getTotalBreakTime(),
                completionRate: this.getCompletionRate(),
                averageDailyFocusTime: this.getAverageDailyFocusTime(),
                bestTimePeriod: this.getBestTimePeriod()
            },
            dailyStats: this.getDailyStats(),
            trend: this.getTrendData(),
            popularNotes: this.getPopularNotes(),
            generatedAt: new Date().toISOString()
        };
    }
}

// 如果环境支持，导出模块
if (typeof module !== 'undefined' && module.exports) {
    const { generateId, formatDate } = require('../utils/helpers');
    module.exports = { Pomodoro, PomodoroStats };
}