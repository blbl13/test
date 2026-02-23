/**
 * Anki卡片控制器类
 * 处理Anki卡片相关的业务逻辑
 */

class AnkiController {
    constructor() {
        this.cards = [];
        this.decks = ['默认', '填空题', '反向卡片', '图片卡'];
        this.currentCard = null;
        this.currentDeck = '默认';
        this.reviewSession = null;
        this.storage = storageManager;
        this.loadData();
    }

    // 加载数据
    async loadData() {
        try {
            // 从存储加载卡片
            const storedCards = await this.storage.getAll('ankiCards');
            this.cards = storedCards.map(cardData => AnkiCard.fromJSON(cardData));

            // 加载设置
            const savedSettings = getLocalStorage('ankiSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...savedSettings };
            }

            console.log(`Loaded ${this.cards.length} anki cards`);
        } catch (error) {
            console.error('Error loading anki data:', error);
        }
    }

    // 保存卡片到存储
    async saveCard(card) {
        try {
            const cardData = card.toJSON();
            await this.storage.update('ankiCards', cardData);
            return true;
        } catch (error) {
            console.error('Error saving card:', error);
            return false;
        }
    }

    // 添加卡片
    async addCard(card) {
        try {
            // 验证卡片
            const validation = card.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 添加到数组
            this.cards.push(card);

            // 保存到存储
            await this.storage.add('ankiCards', card.toJSON());

            return card;
        } catch (error) {
            console.error('Error adding card:', error);
            throw error;
        }
    }

    // 更新卡片
    async updateCard(card) {
        try {
            // 验证卡片
            const validation = card.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 找到索引
            const index = this.cards.findIndex(c => c.id === card.id);
            if (index === -1) {
                throw new Error('Card not found');
            }

            // 更新卡片
            this.cards[index] = card;

            // 保存到存储
            await this.saveCard(card);

            return card;
        } catch (error) {
            console.error('Error updating card:', error);
            throw error;
        }
    }

    // 删除卡片
    async deleteCard(cardId) {
        try {
            // 找到索引
            const index = this.cards.findIndex(c => c.id === cardId);
            if (index === -1) {
                throw new Error('Card not found');
            }

            // 从数组中移除
            this.cards.splice(index, 1);

            // 从存储中删除
            await this.storage.delete('ankiCards', cardId);

            // 清除当前卡片
            if (this.currentCard && this.currentCard.id === cardId) {
                this.currentCard = null;
            }

            return true;
        } catch (error) {
            console.error('Error deleting card:', error);
            throw error;
        }
    }

    // 获取所有卡片
    getAllCards() {
        return [...this.cards];
    }

    // 根据ID获取卡片
    getCardById(cardId) {
        return this.cards.find(c => c.id === cardId) || null;
    }

    // 根据笔记ID获取卡片
    getCardsByNote(noteId) {
        return this.cards.filter(card => card.noteId === noteId);
    }

    // 根据牌组获取卡片
    getCardsByDeck(deck) {
        return this.cards.filter(card => card.deck === deck);
    }

    // 根据标签获取卡片
    getCardsByTag(tag) {
        return this.cards.filter(card => card.tags.includes(tag));
    }

    // 创建复习会话
    createReviewSession(deck = this.currentDeck, limit = 50) {
        const dueCards = this.getDueCards(deck).slice(0, limit);
        this.reviewSession = {
            cards: dueCards,
            currentIndex: 0,
            startTime: new Date(),
            completedCards: [],
            skippedCards: []
        };
        return this.reviewSession;
    }

    // 获取待复习的卡片
    getDueCards(deck = this.currentDeck, currentTime = new Date()) {
        return this.cards.filter(card => {
            if (deck && card.deck !== deck) return false;
            return card.isDue(currentTime);
        });
    }

    // 获取过期的卡片
    getOverdueCards(deck = this.currentDeck, currentTime = new Date()) {
        return this.cards.filter(card => {
            if (deck && card.deck !== deck) return false;
            return card.isOverdue(currentTime);
        });
    }

    // 获取新卡片
    getNewCards(deck = this.currentDeck, limit = 20) {
        return this.cards.filter(card => {
            if (deck && card.deck !== deck) return false;
            return card.isNew();
        }).slice(0, limit);
    }

    // 获取已学卡片
    getLearnedCards(deck = this.currentDeck) {
        return this.cards.filter(card => {
            if (deck && card.deck !== deck) return false;
            return card.isLearned();
        });
    }

    // 开始复习
    async startReview(cardId, difficulty, reviewTime = new Date()) {
        try {
            const card = this.getCardById(cardId);
            if (!card) {
                throw new Error('Card not found');
            }

            // 记录复习
            card.recordReview(difficulty, reviewTime);

            // 保存到存储
            await this.saveCard(card);

            // 更新复习会话
            if (this.reviewSession) {
                this.reviewSession.completedCards.push({
                    cardId: cardId,
                    difficulty: difficulty,
                    reviewTime: reviewTime
                });
            }

            return card;
        } catch (error) {
            console.error('Error recording review:', error);
            throw error;
        }
    }

    // 跳过卡片
    skipCard(cardId) {
        if (this.reviewSession) {
            this.reviewSession.skippedCards.push(cardId);
        }
    }

    // 获取下一张卡片
    getNextCard() {
        if (!this.reviewSession || this.reviewSession.currentIndex >= this.reviewSession.cards.length) {
            return null;
        }

        const card = this.reviewSession.cards[this.reviewSession.currentIndex];
        this.currentCard = card;
        return card;
    }

    // 结束复习会话
    endReviewSession() {
        if (!this.reviewSession) {
            return null;
        }

        const session = {
            ...this.reviewSession,
            endTime: new Date(),
            totalTime: new Date() - this.reviewSession.startTime
        };

        this.reviewSession = null;
        this.currentCard = null;

        return session;
    }

    // 从笔记创建卡片
    async createCardsFromNote(note, options = {}) {
        try {
            const cards = [];
            const templates = options.templates || [
                { front: '{{title}}', back: '{{content}}' },
                { front: '什么是 {{title}}？', back: '{{content}}' }
            ];

            for (const template of templates) {
                const card = AnkiCard.createFromNote(note, {
                    frontTemplate: template.front,
                    backTemplate: template.back,
                    tags: options.tags || []
                });
                await this.addCard(card);
                cards.push(card);
            }

            return cards;
        } catch (error) {
            console.error('Error creating cards from note:', error);
            throw error;
        }
    }

    // 创建填空题卡片
    async createClozeCard(note, text, cloze, tags = []) {
        try {
            const card = AnkiCard.createClozeCard(note, text, cloze, tags);
            await this.addCard(card);
            return card;
        } catch (error) {
            console.error('Error creating cloze card:', error);
            throw error;
        }
    }

    // 创建反向卡片
    async createReverseCard(note, front, back, tags = []) {
        try {
            const card = AnkiCard.createReverseCard(note, front, back, tags);
            await this.addCard(card);
            return card;
        } catch (error) {
            console.error('Error creating reverse card:', error);
            throw error;
        }
    }

    // 导入Anki数据
    async importAnkiData(ankiData) {
        try {
            if (!ankiData.cards || !ankiData.decks) {
                throw new Error('Invalid Anki data format');
            }

            // 清空现有数据
            await this.storage.clearStore('ankiCards');

            // 导入卡片
            for (const cardData of ankiData.cards) {
                await this.storage.add('ankiCards', cardData);
            }

            // 导入牌组
            if (ankiData.decks) {
                this.decks = [...new Set([...this.decks, ...ankiData.decks])];
            }

            // 重新加载数据
            await this.loadData();

            return { success: true, importedCount: ankiData.cards.length };
        } catch (error) {
            console.error('Error importing Anki data:', error);
            return { success: false, error: error.message };
        }
    }

    // 导出Anki数据
    async exportAnkiData() {
        try {
            const data = {
                cards: this.cards.map(card => card.toJSON()),
                decks: this.decks,
                exportDate: new Date().toISOString(),
                version: 1
            };
            return data;
        } catch (error) {
            console.error('Error exporting Anki data:', error);
            return null;
        }
    }

    // 获取牌组列表
    getDecks() {
        return [...this.decks];
    }

    // 添加牌组
    addDeck(deckName) {
        if (!this.decks.includes(deckName)) {
            this.decks.push(deckName);
        }
    }

    // 删除牌组
    deleteDeck(deckName) {
        const index = this.decks.indexOf(deckName);
        if (index > -1) {
            this.decks.splice(index, 1);
        }
    }

    // 设置当前牌组
    setCurrentDeck(deck) {
        if (this.decks.includes(deck)) {
            this.currentDeck = deck;
        }
    }

    // 获取当前牌组
    getCurrentDeck() {
        return this.currentDeck;
    }

    // 获取牌组统计
    getDeckStats(deck = this.currentDeck) {
        const deckCards = this.getCardsByDeck(deck);
        const stats = new AnkiStats(deckCards);
        return stats.generateReport();
    }

    // 获取全局统计
    getStats() {
        const stats = new AnkiStats(this.cards);
        return stats.generateReport();
    }

    // 清理重复卡片
    async cleanupDuplicateCards() {
        try {
            const duplicates = [];
            const uniqueCards = [];

            for (const card of this.cards) {
                const isDuplicate = uniqueCards.some(uniqueCard => {
                    if (card.noteId && uniqueCard.noteId) {
                        return card.noteId === uniqueCard.noteId &&
                               card.front === uniqueCard.front &&
                               card.back === uniqueCard.back;
                    }
                    return false;
                });

                if (isDuplicate) {
                    duplicates.push(card);
                } else {
                    uniqueCards.push(card);
                }
            }

            // 删除重复卡片
            for (const card of duplicates) {
                await this.deleteCard(card.id);
            }

            return {
                totalCards: this.cards.length,
                duplicatesFound: duplicates.length,
                cardsRemoved: duplicates.length,
                remainingCards: uniqueCards.length
            };
        } catch (error) {
            console.error('Error cleaning up duplicate cards:', error);
            throw error;
        }
    }

    // 重新调度卡片
    async rescheduleCards(deck = this.currentDeck, newInterval = 1) {
        try {
            const deckCards = this.getCardsByDeck(deck);
            let rescheduledCount = 0;

            for (const card of deckCards) {
                card.interval = newInterval;
                card.nextReview = new Date();
                await this.saveCard(card);
                rescheduledCount++;
            }

            return {
                rescheduledCount: rescheduledCount,
                deck: deck
            };
        } catch (error) {
            console.error('Error rescheduling cards:', error);
            throw error;
        }
    }

    // 批量操作卡片
    async batchUpdateCards(cardIds, updates) {
        try {
            let updatedCount = 0;

            for (const cardId of cardIds) {
                const card = this.getCardById(cardId);
                if (card) {
                    Object.keys(updates).forEach(key => {
                        if (key in card) {
                            card[key] = updates[key];
                        }
                    });
                    await this.saveCard(card);
                    updatedCount++;
                }
            }

            return {
                totalIds: cardIds.length,
                updatedCount: updatedCount
            };
        } catch (error) {
            console.error('Error batch updating cards:', error);
            throw error;
        }
    }

    // 获取当前卡片
    getCurrentCard() {
        return this.currentCard;
    }

    // 检查是否正在复习
    isReviewing() {
        return this.reviewSession !== null;
    }

    // 获取复习会话信息
    getReviewSession() {
        return this.reviewSession;
    }

    // 重置所有卡片
    async resetAllCards() {
        try {
            for (const card of this.cards) {
                card.interval = 0;
                card.ease = 2.5;
                card.reps = 0;
                card.lapses = 0;
                card.difficulty = CardDifficulty.GOOD;
                card.nextReview = new Date();
                card.lastReviewed = null;
                card.reviewHistory = [];
                await this.saveCard(card);
            }

            return {
                resetCount: this.cards.length,
                message: 'All cards have been reset'
            };
        } catch (error) {
            console.error('Error resetting cards:', error);
            throw error;
        }
    }
}

// 创建单例
const ankiController = new AnkiController();