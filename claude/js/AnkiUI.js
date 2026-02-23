/**
 * Anki卡片UI模块
 * 处理Anki卡片界面的渲染和交互
 */

class AnkiUI {
    constructor() {
        this.controller = ankiController;
        this.container = null;
        this.cardList = null;
        this.reviewContainer = null;
        this.cardDisplay = null;
        this.cardFront = null;
        this.cardBack = null;
        this.difficultyButtons = [];
        this.newCardButton = null;
        this.reviewButton = null;
        this.currentCard = null;
        this.isReviewing = false;
        this.showingBack = false;

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
        this.container = document.querySelector('.anki-container');
        this.cardList = document.querySelector('.card-list');
        this.reviewContainer = document.querySelector('.review-container');
        this.cardDisplay = document.querySelector('.card-display');
        this.cardFront = document.querySelector('.card-front');
        this.cardBack = document.querySelector('.card-back');
        this.newCardButton = document.querySelector('.new-card-btn');
        this.reviewButton = document.querySelector('.review-btn');

        // 难度按钮
        this.difficultyButtons = {
            again: document.querySelector('[data-difficulty="again"]'),
            hard: document.querySelector('[data-difficulty="hard"]'),
            good: document.querySelector('[data-difficulty="good"]'),
            easy: document.querySelector('[data-difficulty="easy"]')
        };
    }

    // 绑定事件
    bindEvents() {
        // 卡片点击事件
        if (this.cardDisplay) {
            this.cardDisplay.addEventListener('click', () => this.flipCard());
        }

        // 难度按钮点击事件
        Object.keys(this.difficultyButtons).forEach(difficulty => {
            const button = this.difficultyButtons[difficulty];
            if (button) {
                button.addEventListener('click', () => this.reviewCard(difficulty));
            }
        });

        // 新卡片按钮
        if (this.newCardButton) {
            this.newCardButton.addEventListener('click', () => this.createNewCard());
        }

        // 开始复习按钮
        if (this.reviewButton) {
            this.reviewButton.addEventListener('click', () => this.startReviewSession());
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // 监听控制器事件
        window.addEventListener('card-added', (e) => this.onCardAdded(e.detail));
        window.addEventListener('card-updated', (e) => this.onCardUpdated(e.detail));
        window.addEventListener('card-deleted', (e) => this.onCardDeleted(e.detail));

        // 监听笔记选择
        window.addEventListener('note-selected', (e) => this.onNoteSelected(e.detail));
    }

    // 渲染界面
    render() {
        this.renderCardList();
        this.renderReviewInterface();
        this.updateStats();
    }

    // 渲染卡片列表
    renderCardList() {
        if (!this.cardList) return;

        const cards = this.controller.getAllCards();
        const dueCards = this.controller.getDueCards();
        const newCards = this.controller.getNewCards();
        const learnedCards = this.controller.getLearnedCards();

        this.cardList.innerHTML = `
            <div class="card-stats">
                <div class="stat-item">
                    <span class="stat-label">总卡片数</span>
                    <span class="stat-value">${cards.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">待复习</span>
                    <span class="stat-value due-cards">${dueCards.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">新卡片</span>
                    <span class="stat-value new-cards">${newCards.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">已学会</span>
                    <span class="stat-value learned-cards">${learnedCards.length}</span>
                </div>
            </div>
            <div class="card-list-items">
                ${cards.slice(0, 20).map(card => this.renderCardItem(card)).join('')}
            </div>
        `;

        // 绑定卡片项点击事件
        this.cardList.querySelectorAll('.card-item').forEach(item => {
            item.addEventListener('click', (e) => this.selectCard(e.currentTarget.dataset.cardId));
        });
    }

    // 渲染单个卡片项
    renderCardItem(card) {
        const typeIcons = {
            [CardType.BASIC]: '📝',
            [CardType.CLOZE]: '🔍',
            [CardType.REVERSE]: '🔄',
            [CardType.IMAGE]: '🖼️'
        };

        const nextReview = formatDate(card.nextReview, 'MM-DD');
        const isDue = card.isDue();
        const isOverdue = card.isOverdue();

        return `
            <div class="card-item ${isDue ? 'due' : ''} ${isOverdue ? 'overdue' : ''}"
                 data-card-id="${card.id}">
                <div class="card-item-header">
                    <span class="card-type">${typeIcons[card.type] || '📝'}</span>
                    <span class="card-deck">${card.deck}</span>
                </div>
                <div class="card-item-content">
                    <div class="card-item-front">${this.truncateText(card.front, 50)}</div>
                </div>
                <div class="card-item-footer">
                    <span class="card-interval">${card.interval}天</span>
                    <span class="card-next-review">${nextReview}</span>
                </div>
            </div>
        `;
    }

    // 渲染复习界面
    renderReviewInterface() {
        if (!this.reviewContainer) return;

        const session = this.controller.getReviewSession();
        const currentCard = this.controller.getCurrentCard();

        if (session && currentCard) {
            this.reviewContainer.classList.remove('hidden');
            this.renderCard(currentCard);
        } else {
            this.reviewContainer.classList.add('hidden');
            this.currentCard = null;
            this.showingBack = false;
        }
    }

    // 渲染卡片
    renderCard(card) {
        if (!this.cardFront || !this.cardBack) return;

        this.currentCard = card;
        this.showingBack = false;

        // 使用marked渲染Markdown
        const frontHtml = marked.parse(card.front);
        const backHtml = marked.parse(card.back);

        this.cardFront.innerHTML = frontHtml;
        this.cardBack.innerHTML = backHtml;

        // 高亮搜索匹配
        const currentQuery = searchController.getCurrentQuery();
        if (currentQuery) {
            this.cardFront.innerHTML = searchController.highlightMatch(this.cardFront.innerHTML, currentQuery);
            this.cardBack.innerHTML = searchController.highlightMatch(this.cardBack.innerHTML, currentQuery);
        }

        // 显示正面，隐藏背面
        this.cardFront.classList.remove('hidden');
        this.cardBack.classList.add('hidden');

        // 更新卡片计数
        this.updateCardCounter();
    }

    // 翻转卡片
    flipCard() {
        if (!this.currentCard || !this.cardFront || !this.cardBack) return;

        if (this.showingBack) {
            this.cardFront.classList.remove('hidden');
            this.cardBack.classList.add('hidden');
            this.showingBack = false;
        } else {
            this.cardFront.classList.add('hidden');
            this.cardBack.classList.remove('hidden');
            this.showingBack = true;
        }

        // 添加翻转动画
        this.cardDisplay.style.transform = 'rotateY(90deg)';
        setTimeout(() => {
            this.cardDisplay.style.transform = 'rotateY(0deg)';
        }, 150);
    }

    // 创建新卡片
    async createNewCard() {
        try {
            // 获取当前选中的笔记
            const currentNote = noteController.getCurrentNote();
            if (!currentNote) {
                this.showError('请先选择要创建卡片的笔记');
                return;
            }

            // 显示创建卡片对话框
            const { front, back } = await this.showCreateCardDialog(currentNote);
            if (!front || !back) return;

            // 创建卡片
            const card = new AnkiCard({
                noteId: currentNote.id,
                noteTitle: currentNote.title,
                front: front,
                back: back,
                tags: [...currentNote.tags, '新卡片'],
                deck: '默认',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await this.controller.addCard(card);

            this.showSuccess('卡片创建成功！');
            this.renderCardList();

        } catch (error) {
            console.error('Error creating card:', error);
            this.showError('无法创建卡片');
        }
    }

    // 显示创建卡片对话框
    async showCreateCardDialog(note) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'create-card-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <h3>创建新卡片</h3>
                    <div class="dialog-body">
                        <div class="form-group">
                            <label>正面内容</label>
                            <textarea class="card-front-input" placeholder="输入卡片正面内容..." rows="4">${note.title}</textarea>
                        </div>
                        <div class="form-group">
                            <label>背面内容</label>
                            <textarea class="card-back-input" placeholder="输入卡片背面内容..." rows="4">${note.getSummary(200)}</textarea>
                        </div>
                        <div class="form-group">
                            <label>牌组</label>
                            <select class="card-deck-select">
                                ${this.controller.getDecks().map(deck => `<option value="${deck}">${deck}</option>`).join('')}
                            </select>
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
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            `;

            // 事件处理
            const cancelBtn = dialog.querySelector('.cancel-btn');
            const createBtn = dialog.querySelector('.create-btn');
            const frontInput = dialog.querySelector('.card-front-input');
            const backInput = dialog.querySelector('.card-back-input');

            cancelBtn.onclick = () => {
                document.body.removeChild(dialog);
                resolve({ front: null, back: null });
            };

            createBtn.onclick = () => {
                const front = frontInput.value.trim();
                const back = backInput.value.trim();
                document.body.removeChild(dialog);
                resolve({ front, back });
            };

            // 键盘快捷键
            dialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                } else if (e.key === 'Enter' && e.ctrlKey) {
                    createBtn.click();
                }
            });

            document.body.appendChild(dialog);

            // 聚焦到正面输入框
            frontInput.focus();
        });
    }

    // 开始复习会话
    startReviewSession() {
        try {
            const session = this.controller.createReviewSession();
            if (!session || session.cards.length === 0) {
                this.showError('没有需要复习的卡片');
                return;
            }

            this.isReviewing = true;
            this.renderReviewInterface();
            this.showSuccess(`开始复习，共 ${session.cards.length} 张卡片`);
        } catch (error) {
            console.error('Error starting review session:', error);
            this.showError('无法开始复习');
        }
    }

    // 复习卡片
    async reviewCard(difficulty) {
        try {
            if (!this.currentCard) return;

            // 记录复习
            await this.controller.startReview(this.currentCard.id, difficulty);

            // 显示反馈
            this.showDifficultyFeedback(difficulty);

            // 获取下一张卡片
            setTimeout(() => {
                const nextCard = this.controller.getNextCard();
                if (nextCard) {
                    this.renderCard(nextCard);
                } else {
                    this.endReviewSession();
                }
            }, 500);

        } catch (error) {
            console.error('Error reviewing card:', error);
            this.showError('无法记录复习');
        }
    }

    // 显示难度反馈
    showDifficultyFeedback(difficulty) {
        const feedback = {
            [CardDifficulty.AGAIN]: { text: '需要再次复习', color: 'var(--danger-color)' },
            [CardDifficulty.HARD]: { text: '有点困难', color: 'var(--warning-color)' },
            [CardDifficulty.GOOD]: { text: '刚刚好', color: 'var(--success-color)' },
            [CardDifficulty.EASY]: { text: '太简单了', color: 'var(--primary-color)' }
        };

        const feedbackInfo = feedback[difficulty] || feedback[CardDifficulty.GOOD];

        // 显示反馈动画
        const feedbackElement = document.createElement('div');
        feedbackElement.textContent = feedbackInfo.text;
        feedbackElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-weight: bold;
            color: ${feedbackInfo.color};
            animation: feedbackPulse 0.5s ease;
            z-index: 10;
        `;

        this.cardDisplay.appendChild(feedbackElement);

        setTimeout(() => {
            if (feedbackElement.parentNode) {
                this.cardDisplay.removeChild(feedbackElement);
            }
        }, 500);
    }

    // 结束复习会话
    endReviewSession() {
        const session = this.controller.endReviewSession();
        if (session) {
            const completedCount = session.completedCards.length;
            const duration = Math.floor((session.endTime - session.startTime) / 1000 / 60);

            this.showSuccess(`复习完成！共复习 ${completedCount} 张卡片，用时 ${duration} 分钟`);
            this.renderReviewInterface();
            this.renderCardList();
            this.updateStats();
        }
        this.isReviewing = false;
    }

    // 选择卡片
    selectCard(cardId) {
        const card = this.controller.getCardById(cardId);
        if (card) {
            this.renderCard(card);
            this.cardList.querySelectorAll('.card-item').forEach(item => {
                item.classList.remove('selected');
                if (item.dataset.cardId === cardId) {
                    item.classList.add('selected');
                }
            });
        }
    }

    // 处理键盘事件
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ': // 空格键翻转卡片
                if (this.currentCard) {
                    e.preventDefault();
                    this.flipCard();
                }
                break;
            case '1':
                if (this.isReviewing && this.currentCard) {
                    e.preventDefault();
                    this.difficultyButtons.again.click();
                }
                break;
            case '2':
                if (this.isReviewing && this.currentCard) {
                    e.preventDefault();
                    this.difficultyButtons.hard.click();
                }
                break;
            case '3':
                if (this.isReviewing && this.currentCard) {
                    e.preventDefault();
                    this.difficultyButtons.good.click();
                }
                break;
            case '4':
                if (this.isReviewing && this.currentCard) {
                    e.preventDefault();
                    this.difficultyButtons.easy.click();
                }
                break;
            case 'r':
                if (!this.isReviewing) {
                    e.preventDefault();
                    this.startReviewSession();
                }
                break;
            case 'n':
                e.preventDefault();
                this.createNewCard();
                break;
        }
    }

    // 更新统计
    updateStats() {
        const stats = this.controller.getStats();
        const summary = stats.summary;

        // 更新统计显示
        const elements = {
            '.total-cards': summary.totalCount,
            '.due-today-cards': summary.dueTodayCount,
            '.new-cards': summary.newCount,
            '.learned-cards': summary.learnedCount,
            '.retention-rate': `${summary.retentionRate}%`,
            '.average-interval': `${summary.averageInterval}天`,
            '.total-reviews': summary.totalReviews,
            '.average-reviews': summary.averageReviews
        };

        Object.keys(elements).forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = elements[selector];
            }
        });
    }

    // 更新卡片计数
    updateCardCounter() {
        const counter = document.querySelector('.card-counter');
        if (!counter) return;

        const session = this.controller.getReviewSession();
        if (session) {
            counter.textContent = `${session.currentIndex + 1} / ${session.cards.length}`;
        } else {
            counter.textContent = '';
        }
    }

    // 处理卡片添加
    onCardAdded(card) {
        this.renderCardList();
        this.showSuccess('卡片添加成功');
    }

    // 处理卡片更新
    onCardUpdated(card) {
        this.renderCardList();
        if (this.currentCard && this.currentCard.id === card.id) {
            this.renderCard(card);
        }
        this.showSuccess('卡片更新成功');
    }

    // 处理卡片删除
    onCardDeleted(cardId) {
        this.renderCardList();
        if (this.currentCard && this.currentCard.id === cardId) {
            this.currentCard = null;
            this.renderReviewInterface();
        }
        this.showSuccess('卡片删除成功');
    }

    // 处理笔记选择
    onNoteSelected(note) {
        // 更新按钮状态
        if (this.newCardButton) {
            this.newCardButton.disabled = false;
            this.newCardButton.title = `从"${note.title}"创建卡片`;
        }
    }

    // 截断文本
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // 显示错误
    showError(message) {
        this.showInlineNotification(message, 'error');
    }

    // 显示成功
    showSuccess(message) {
        this.showInlineNotification(message, 'success');
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

    // 销毁UI
    destroy() {
        // 清理资源
        this.container = null;
        this.cardList = null;
        this.reviewContainer = null;
        this.cardDisplay = null;
        this.cardFront = null;
        this.cardBack = null;
        this.currentCard = null;
    }
}

// 创建单例
const ankiUI = new AnkiUI();