/**
 * Anki卡片模型类
 */

// 卡片难度枚举
const CardDifficulty = {
    AGAIN: 'again',
    HARD: 'hard',
    GOOD: 'good',
    EASY: 'easy'
};

// 卡片类型枚举
const CardType = {
    BASIC: 'basic',
    CLOZE: 'cloze',
    REVERSE: 'reverse',
    IMAGE: 'image'
};

class AnkiCard {
    constructor({
        id = null,
        noteId = null,
        noteTitle = '',
        type = CardType.BASIC,
        front = '',
        back = '',
        tags = [],
        deck = '默认',
        interval = 0,
        ease = 2.5,
        reps = 0,
        lapses = 0,
        difficulty = CardDifficulty.GOOD,
        nextReview = new Date(),
        lastReviewed = null,
        createdAt = new Date(),
        updatedAt = new Date(),
        reviewHistory = [],
        metadata = {}
    } = {}) {
        this.id = id || generateId();
        this.noteId = noteId;
        this.noteTitle = noteTitle;
        this.type = Object.values(CardType).includes(type) ? type : CardType.BASIC;
        this.front = front;
        this.back = back;
        this.tags = Array.isArray(tags) ? tags : [];
        this.deck = deck;
        this.interval = interval; // 复习间隔（天）
        this.ease = ease; // 易度因子
        this.reps = reps; // 复习次数
        this.lapses = lapses; // 遗忘次数
        this.difficulty = Object.values(CardDifficulty).includes(difficulty) ? difficulty : CardDifficulty.GOOD;
        this.nextReview = nextReview instanceof Date ? nextReview : new Date(nextReview);
        this.lastReviewed = lastReviewed ? (lastReviewed instanceof Date ? lastReviewed : new Date(lastReviewed)) : null;
        this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
        this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
        this.reviewHistory = Array.isArray(reviewHistory) ? reviewHistory : [];
        this.metadata = metadata;
    }

    // 计算下一次复习间隔
    calculateNextInterval(difficulty) {
        let newInterval = this.interval;

        switch (difficulty) {
            case CardDifficulty.AGAIN:
                if (this.interval > 1) {
                    newInterval = Math.max(1, this.interval * 0.5);
                } else {
                    newInterval = 1;
                }
                this.lapses++;
                break;
            case CardDifficulty.HARD:
                newInterval = this.interval * 1.2;
                break;
            case CardDifficulty.GOOD:
                if (this.interval === 0) {
                    newInterval = 1;
                } else if (this.interval === 1) {
                    newInterval = 3;
                } else {
                    newInterval = this.interval * this.ease;
                }
                break;
            case CardDifficulty.EASY:
                if (this.interval === 0) {
                    newInterval = 1;
                } else if (this.interval === 1) {
                    newInterval = 4;
                } else {
                    newInterval = this.interval * this.ease * 1.3;
                }
                break;
        }

        return Math.round(newInterval);
    }

    // 更新易度因子
    updateEase(difficulty) {
        switch (difficulty) {
            case CardDifficulty.AGAIN:
                this.ease = Math.max(1.3, this.ease - 0.2);
                break;
            case CardDifficulty.HARD:
                this.ease = Math.max(1.3, this.ease - 0.15);
                break;
            case CardDifficulty.GOOD:
                // 保持不变
                break;
            case CardDifficulty.EASY:
                this.ease = Math.min(2.5, this.ease + 0.15);
                break;
        }
    }

    // 记录复习
    recordReview(difficulty, reviewTime = new Date()) {
        const reviewRecord = {
            difficulty: difficulty,
            reviewTime: reviewTime,
            interval: this.interval,
            ease: this.ease,
            reps: this.reps,
            lapses: this.lapses
        };

        this.reviewHistory.push(reviewRecord);

        // 更新卡片信息
        this.updateEase(difficulty);
        this.interval = this.calculateNextInterval(difficulty);
        this.reps++;
        this.difficulty = difficulty;
        this.lastReviewed = reviewTime;
        this.nextReview = new Date(reviewTime.getTime() + this.interval * 24 * 60 * 60 * 1000);
        this.updatedAt = reviewTime;

        return this;
    }

    // 检查是否到期需要复习
    isDue(currentTime = new Date()) {
        return this.nextReview <= currentTime;
    }

    // 检查是否过期
    isOverdue(currentTime = new Date()) {
        const daysOverdue = Math.floor((currentTime - this.nextReview) / (1000 * 60 * 60 * 24));
        return daysOverdue > 0;
    }

    // 获取过期天数
    getDaysOverdue(currentTime = new Date()) {
        if (!this.isOverdue(currentTime)) return 0;
        return Math.floor((currentTime - this.nextReview) / (1000 * 60 * 60 * 24));
    }

    // 检查是否是新卡片
    isNew() {
        return this.reps === 0;
    }

    // 检查是否是复习卡片
    isReview() {
        return this.reps > 0;
    }

    // 检查是否已经学会
    isLearned() {
        return this.reps >= 3 && this.interval >= 7;
    }

    // 检查是否已经遗忘
    isLapsed() {
        return this.lapses > 0;
    }

    // 获取难度等级
    getDifficultyLevel() {
        if (this.ease >= 2.2) return 'easy';
        if (this.ease >= 1.8) return 'medium';
        if (this.ease >= 1.5) return 'hard';
        return 'very-hard';
    }

    // 获取记忆保持率
    getRetentionRate() {
        if (this.reps === 0) return 100;
        if (this.lapses === 0) return 100;
        return Math.max(0, Math.round(100 - (this.lapses / this.reps) * 100));
    }

    // 获取记忆稳定性
    getStability() {
        if (this.reps <= 1) return 'unstable';
        if (this.interval >= 14) return 'stable';
        if (this.interval >= 7) return 'moderately-stable';
        return 'unstable';
    }

    // 添加标签
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.updatedAt = new Date();
        }
    }

    // 移除标签
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.updatedAt = new Date();
        }
    }

    // 更新卡片内容
    updateContent(front, back) {
        this.front = front;
        this.back = back;
        this.updatedAt = new Date();
    }

    // 更新卡片类型
    updateType(type) {
        if (Object.values(CardType).includes(type)) {
            this.type = type;
            this.updatedAt = new Date();
        }
    }

    // 转换为JSON
    toJSON() {
        return {
            id: this.id,
            noteId: this.noteId,
            noteTitle: this.noteTitle,
            type: this.type,
            front: this.front,
            back: this.back,
            tags: this.tags,
            deck: this.deck,
            interval: this.interval,
            ease: this.ease,
            reps: this.reps,
            lapses: this.lapses,
            difficulty: this.difficulty,
            nextReview: this.nextReview.toISOString(),
            lastReviewed: this.lastReviewed ? this.lastReviewed.toISOString() : null,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            reviewHistory: this.reviewHistory,
            metadata: this.metadata
        };
    }

    // 从JSON创建实例
    static fromJSON(json) {
        return new AnkiCard({
            id: json.id,
            noteId: json.noteId,
            noteTitle: json.noteTitle || '',
            type: json.type || CardType.BASIC,
            front: json.front || '',
            back: json.back || '',
            tags: json.tags || [],
            deck: json.deck || '默认',
            interval: json.interval || 0,
            ease: json.ease || 2.5,
            reps: json.reps || 0,
            lapses: json.lapses || 0,
            difficulty: json.difficulty || CardDifficulty.GOOD,
            nextReview: json.nextReview,
            lastReviewed: json.lastReviewed,
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            reviewHistory: json.reviewHistory || [],
            metadata: json.metadata || {}
        });
    }

    // 比较两张卡片是否相等
    equals(other) {
        if (!(other instanceof AnkiCard)) return false;
        return this.id === other.id &&
               this.front === other.front &&
               this.back === other.back &&
               this.type === other.type &&
               this.noteId === other.noteId;
    }

    // 创建一个卡片的副本
    clone() {
        return new AnkiCard({
            ...this.toJSON(),
            id: generateId(),
            front: `${this.front} (副本)`,
            reps: 0,
            lapses: 0,
            interval: 0,
            ease: 2.5,
            difficulty: CardDifficulty.GOOD,
            nextReview: new Date(),
            lastReviewed: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            reviewHistory: []
        });
    }

    // 获取卡片统计信息
    getStats() {
        return {
            type: this.type,
            deck: this.deck,
            interval: this.interval,
            ease: this.ease,
            reps: this.reps,
            lapses: this.lapses,
            difficulty: this.difficulty,
            nextReview: this.nextReview,
            lastReviewed: this.lastReviewed,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            isNew: this.isNew(),
            isReview: this.isReview(),
            isLearned: this.isLearned(),
            isLapsed: this.isLapsed(),
            isDue: this.isDue(),
            isOverdue: this.isOverdue(),
            daysOverdue: this.getDaysOverdue(),
            difficultyLevel: this.getDifficultyLevel(),
            retentionRate: this.getRetentionRate(),
            stability: this.getStability(),
            reviewHistoryLength: this.reviewHistory.length
        };
    }

    // 静态方法：创建空卡片
    static createEmpty() {
        return new AnkiCard({
            front: '',
            back: ''
        });
    }

    // 静态方法：从笔记创建卡片
    static createFromNote(note, options = {}) {
        const { frontTemplate = '{{title}}', backTemplate = '{{content}}', tags = [] } = options;

        const front = frontTemplate
            .replace('{{title}}', note.title)
            .replace('{{content}}', note.content)
            .replace('{{tags}}', note.tags.join(', '));

        const back = backTemplate
            .replace('{{title}}', note.title)
            .replace('{{content}}', note.content)
            .replace('{{tags}}', note.tags.join(', '));

        return new AnkiCard({
            noteId: note.id,
            noteTitle: note.title,
            front: front,
            back: back,
            tags: [...note.tags, ...tags],
            deck: '默认',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // 静态方法：创建填空题卡片
    static createClozeCard(note, text, cloze, tags = []) {
        const front = `以下文本中缺失的部分是什么？\n\n${text}\n\n[...]`;
        const back = `${text}\n\n缺失的部分：${cloze}`;

        return new AnkiCard({
            noteId: note.id,
            noteTitle: note.title,
            type: CardType.CLOZE,
            front: front,
            back: back,
            tags: [...note.tags, ...tags],
            deck: '填空题',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // 静态方法：创建反向卡片
    static createReverseCard(note, front, back, tags = []) {
        return new AnkiCard({
            noteId: note.id,
            noteTitle: note.title,
            type: CardType.REVERSE,
            front: front,
            back: back,
            tags: [...note.tags, ...tags],
            deck: '反向卡片',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}

// Anki统计工具类
class AnkiStats {
    constructor(cards = []) {
        this.cards = cards;
    }

    // 获取总卡片数
    getTotalCount() {
        return this.cards.length;
    }

    // 获取新卡片数
    getNewCount() {
        return this.cards.filter(card => card.isNew()).length;
    }

    // 获取复习卡片数
    getReviewCount() {
        return this.cards.filter(card => card.isReview()).length;
    }

    // 获取已学卡片数
    getLearnedCount() {
        return this.cards.filter(card => card.isLearned()).length;
    }

    // 获取过期卡片数
    getOverdueCount(currentTime = new Date()) {
        return this.cards.filter(card => card.isOverdue(currentTime)).length;
    }

    // 获取今日需要复习的卡片数
    getDueTodayCount(currentTime = new Date()) {
        const today = formatDate(currentTime, 'YYYY-MM-DD');
        return this.cards.filter(card => {
            if (!card.isDue(currentTime)) return false;
            return formatDate(card.nextReview, 'YYYY-MM-DD') === today;
        }).length;
    }

    // 获取记忆保持率
    getRetentionRate() {
        if (this.cards.length === 0) return 100;
        const totalRetention = this.cards.reduce((sum, card) => sum + card.getRetentionRate(), 0);
        return Math.round(totalRetention / this.cards.length);
    }

    // 获取平均复习次数
    getAverageReviews() {
        if (this.cards.length === 0) return 0;
        const totalReviews = this.cards.reduce((sum, card) => sum + card.reps, 0);
        return Math.round((totalReviews / this.cards.length) * 10) / 10;
    }

    // 获取平均间隔
    getAverageInterval() {
        const reviewCards = this.cards.filter(card => card.isReview());
        if (reviewCards.length === 0) return 0;
        const totalInterval = reviewCards.reduce((sum, card) => sum + card.interval, 0);
        return Math.round((totalInterval / reviewCards.length) * 10) / 10;
    }

    // 按卡片类型分组
    getByType() {
        const grouped = {};
        this.cards.forEach(card => {
            if (!grouped[card.type]) {
                grouped[card.type] = [];
            }
            grouped[card.type].push(card);
        });
        return grouped;
    }

    // 按牌组分组
    getByDeck() {
        const grouped = {};
        this.cards.forEach(card => {
            if (!grouped[card.deck]) {
                grouped[card.deck] = [];
            }
            grouped[card.deck].push(card);
        });
        return grouped;
    }

    // 按标签分组
    getByTag() {
        const grouped = {};
        this.cards.forEach(card => {
            card.tags.forEach(tag => {
                if (!grouped[tag]) {
                    grouped[tag] = [];
                }
                grouped[tag].push(card);
            });
        });
        return grouped;
    }

    // 按记忆稳定性分组
    getByStability() {
        const grouped = {
            'stable': [],
            'moderately-stable': [],
            'unstable': []
        };
        this.cards.forEach(card => {
            const stability = card.getStability();
            grouped[stability].push(card);
        });
        return grouped;
    }

    // 按难度等级分组
    getByDifficulty() {
        const grouped = {
            'easy': [],
            'medium': [],
            'hard': [],
            'very-hard': []
        };
        this.cards.forEach(card => {
            const difficulty = card.getDifficultyLevel();
            grouped[difficulty].push(card);
        });
        return grouped;
    }

    // 获取最佳复习时段
    getBestReviewTime() {
        const hourStats = {};
        this.cards.forEach(card => {
            card.reviewHistory.forEach(record => {
                const hour = formatDate(record.reviewTime, 'HH');
                if (!hourStats[hour]) {
                    hourStats[hour] = { count: 0, goodReviews: 0 };
                }
                hourStats[hour].count++;
                if (record.difficulty === CardDifficulty.GOOD || record.difficulty === CardDifficulty.EASY) {
                    hourStats[hour].goodReviews++;
                }
            });
        });

        let bestHour = '';
        let bestRate = 0;

        Object.keys(hourStats).forEach(hour => {
            const rate = (hourStats[hour].goodReviews / hourStats[hour].count) * 100;
            if (rate > bestRate) {
                bestRate = rate;
                bestHour = hour;
            }
        });

        return { hour: bestHour, rate: Math.round(bestRate) };
    }

    // 获取复习历史统计
    getReviewHistoryStats() {
        const allReviews = [];
        this.cards.forEach(card => {
            allReviews.push(...card.reviewHistory);
        });

        if (allReviews.length === 0) {
            return { totalReviews: 0, averagePerDay: 0 };
        }

        // 按日期分组
        const dailyReviews = {};
        allReviews.forEach(review => {
            const date = formatDate(review.reviewTime, 'YYYY-MM-DD');
            if (!dailyReviews[date]) {
                dailyReviews[date] = 0;
            }
            dailyReviews[date]++;
        });

        const dailyCounts = Object.values(dailyReviews);
        const averagePerDay = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;

        return {
            totalReviews: allReviews.length,
            averagePerDay: Math.round(averagePerDay * 10) / 10,
            dailyReviewCounts: dailyCounts.sort((a, b) => b - a).slice(0, 10)
        };
    }

    // 获取难度分布
    getDifficultyDistribution() {
        const distribution = {
            [CardDifficulty.AGAIN]: 0,
            [CardDifficulty.HARD]: 0,
            [CardDifficulty.GOOD]: 0,
            [CardDifficulty.EASY]: 0
        };

        this.cards.forEach(card => {
            distribution[card.difficulty]++;
        });

        return distribution;
    }

    // 获取学习趋势
    getLearningTrend(days = 7) {
        const reviewStats = this.getReviewHistoryStats();
        const dailyCounts = reviewStats.dailyReviewCounts;

        if (dailyCounts.length < days * 2) {
            return { trend: 'stable', percentage: 0 };
        }

        const recentDays = dailyCounts.slice(-days);
        const previousDays = dailyCounts.slice(-days * 2, -days);

        const recentAverage = recentDays.reduce((sum, count) => sum + count, 0) / recentDays.length;
        const previousAverage = previousDays.reduce((sum, count) => sum + count, 0) / previousDays.length;

        if (previousAverage === 0) {
            return recentAverage > 0 ? { trend: 'up', percentage: 100 } : { trend: 'stable', percentage: 0 };
        }

        const percentage = ((recentAverage - previousAverage) / previousAverage) * 100;

        let trend = 'stable';
        if (percentage > 10) trend = 'up';
        else if (percentage < -10) trend = 'down';

        return { trend, percentage: Math.round(percentage) };
    }

    // 导出统计报告
    generateReport() {
        return {
            summary: {
                totalCount: this.getTotalCount(),
                newCount: this.getNewCount(),
                reviewCount: this.getReviewCount(),
                learnedCount: this.getLearnedCount(),
                dueTodayCount: this.getDueTodayCount(),
                overdueCount: this.getOverdueCount(),
                retentionRate: this.getRetentionRate(),
                averageReviews: this.getAverageReviews(),
                averageInterval: this.getAverageInterval(),
                bestReviewTime: this.getBestReviewTime()
            },
            distribution: {
                byType: this.getByType(),
                byDeck: this.getByDeck(),
                byDifficulty: this.getDifficultyDistribution(),
                byStability: this.getByStability(),
                byTag: this.getByTag()
            },
            trend: this.getLearningTrend(),
            reviewHistory: this.getReviewHistoryStats(),
            generatedAt: new Date().toISOString()
        };
    }
}

// 如果环境支持，导出模块
if (typeof module !== 'undefined' && module.exports) {
    const { generateId, formatDate } = require('../utils/helpers');
    module.exports = { AnkiCard, AnkiStats, CardDifficulty, CardType };
}