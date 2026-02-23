/**
 * 搜索控制器类
 * 处理全文搜索和相关功能
 */

class SearchController {
    constructor() {
        this.noteController = noteController;
        this.ankiController = ankiController;
        this.searchHistory = [];
        this.maxHistory = 20;
        this.searchResults = [];
        this.currentQuery = '';
        this.searchOptions = {
            includeNotes: true,
            includeCards: true,
            includeTags: true,
            caseSensitive: false,
            fuzzySearch: true,
            searchInTitle: true,
            searchInContent: true,
            searchInTags: true,
            maxResults: 50
        };
        this.storageKey = 'searchHistory';
        this.loadSearchHistory();
    }

    // 加载搜索历史
    loadSearchHistory() {
        try {
            const history = localStorage.getItem(this.storageKey);
            if (history) {
                this.searchHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            this.searchHistory = [];
        }
    }

    // 保存搜索历史
    saveSearchHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }

    // 添加搜索历史
    addToSearchHistory(query) {
        try {
            // 移除重复
            this.searchHistory = this.searchHistory.filter(item => item !== query);

            // 添加到开头
            this.searchHistory.unshift(query);

            // 限制数量
            if (this.searchHistory.length > this.maxHistory) {
                this.searchHistory = this.searchHistory.slice(0, this.maxHistory);
            }

            this.saveSearchHistory();
        } catch (error) {
            console.error('Error adding to search history:', error);
        }
    }

    // 获取搜索历史
    getSearchHistory() {
        return [...this.searchHistory];
    }

    // 清除搜索历史
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }

    // 搜索笔记
    searchNotes(query, options = {}) {
        try {
            const searchOptions = { ...this.searchOptions, ...options };
            const results = [];

            if (!searchOptions.searchInTitle && !searchOptions.searchInContent && !searchOptions.searchInTags) {
                return results;
            }

            const notes = this.noteController.getAllNotes();
            const searchQuery = searchOptions.caseSensitive ? query : query.toLowerCase();

            notes.forEach(note => {
                let score = 0;
                const matches = [];

                // 搜索标题
                if (searchOptions.searchInTitle) {
                    const title = searchOptions.caseSensitive ? note.title : note.title.toLowerCase();
                    if (searchQuery === '' || title.includes(searchQuery)) {
                        const titleScore = this.calculateRelevance(title, searchQuery);
                        score += titleScore * 3; // 标题权重更高
                        if (titleScore > 0) {
                            matches.push({ type: 'title', text: note.title });
                        }
                    }
                }

                // 搜索内容
                if (searchOptions.searchInContent) {
                    const content = searchOptions.caseSensitive ? note.content : note.content.toLowerCase();
                    if (searchQuery === '' || content.includes(searchQuery)) {
                        const contentScore = this.calculateRelevance(content, searchQuery);
                        score += contentScore; // 内容权重
                        if (contentScore > 0) {
                            // 获取匹配片段
                            const snippet = this.getMatchSnippet(content, searchQuery);
                            matches.push({ type: 'content', text: snippet });
                        }
                    }
                }

                // 搜索标签
                if (searchOptions.searchInTags) {
                    const tagText = note.tags.join(' ').toLowerCase();
                    if (searchQuery === '' || tagText.includes(searchQuery.toLowerCase())) {
                        const tagScore = this.calculateRelevance(tagText, searchQuery.toLowerCase());
                        score += tagScore * 2; // 标签权重中等
                        if (tagScore > 0) {
                            matches.push({ type: 'tags', text: note.tags.join(', ') });
                        }
                    }
                }

                // 如果匹配到任何内容，添加到结果
                if (score > 0 || searchQuery === '') {
                    results.push({
                        id: note.id,
                        type: 'note',
                        title: note.title,
                        score: score,
                        matches: matches,
                        note: note,
                        preview: note.getSummary(150),
                        createdAt: note.createdAt,
                        updatedAt: note.updatedAt
                    });
                }
            });

            // 按分数排序
            results.sort((a, b) => b.score - a.score);

            // 限制结果数量
            return results.slice(0, searchOptions.maxResults);
        } catch (error) {
            console.error('Error searching notes:', error);
            return [];
        }
    }

    // 搜索Anki卡片
    searchCards(query, options = {}) {
        try {
            const searchOptions = { ...this.searchOptions, ...options };
            const results = [];

            const cards = this.ankiController.getAllCards();
            const searchQuery = searchOptions.caseSensitive ? query : query.toLowerCase();

            cards.forEach(card => {
                let score = 0;
                const matches = [];

                // 搜索正面内容
                const front = searchOptions.caseSensitive ? card.front : card.front.toLowerCase();
                if (searchQuery === '' || front.includes(searchQuery)) {
                    const frontScore = this.calculateRelevance(front, searchQuery);
                    score += frontScore * 2; // 正面内容权重更高
                    if (frontScore > 0) {
                        matches.push({ type: 'front', text: card.front.substring(0, 200) });
                    }
                }

                // 搜索背面内容
                const back = searchOptions.caseSensitive ? card.back : card.back.toLowerCase();
                if (searchQuery === '' || back.includes(searchQuery)) {
                    const backScore = this.calculateRelevance(back, searchQuery);
                    score += backScore;
                    if (backScore > 0) {
                        matches.push({ type: 'back', text: card.back.substring(0, 200) });
                    }
                }

                // 搜索标签
                if (searchOptions.searchInTags) {
                    const tagText = card.tags.join(' ').toLowerCase();
                    if (searchQuery === '' || tagText.includes(searchQuery.toLowerCase())) {
                        const tagScore = this.calculateRelevance(tagText, searchQuery.toLowerCase());
                        score += tagScore * 2;
                        if (tagScore > 0) {
                            matches.push({ type: 'tags', text: card.tags.join(', ') });
                        }
                    }
                }

                // 如果匹配到任何内容，添加到结果
                if (score > 0 || searchQuery === '') {
                    results.push({
                        id: card.id,
                        type: 'card',
                        title: card.front.substring(0, 50) + (card.front.length > 50 ? '...' : ''),
                        score: score,
                        matches: matches,
                        card: card,
                        deck: card.deck,
                        type: card.type,
                        createdAt: card.createdAt,
                        lastReviewed: card.lastReviewed
                    });
                }
            });

            // 按分数排序
            results.sort((a, b) => b.score - a.score);

            // 限制结果数量
            return results.slice(0, searchOptions.maxResults);
        } catch (error) {
            console.error('Error searching cards:', error);
            return [];
        }
    }

    // 搜索标签
    searchTags(query, options = {}) {
        try {
            const searchOptions = { ...this.searchOptions, ...options };
            const results = [];

            const tags = this.noteController.getAllTags();
            const searchQuery = searchOptions.caseSensitive ? query : query.toLowerCase();

            tags.forEach(tag => {
                const tagName = searchOptions.caseSensitive ? tag.name : tag.name.toLowerCase();
                if (searchQuery === '' || tagName.includes(searchQuery)) {
                    const score = this.calculateRelevance(tagName, searchQuery);
                    results.push({
                        id: tag.id,
                        type: 'tag',
                        title: tag.name,
                        score: score,
                        tag: tag,
                        usageCount: tag.usageCount,
                        description: tag.description,
                        createdAt: tag.createdAt
                    });
                }
            });

            // 按分数和使用次数排序
            results.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return b.usageCount - a.usageCount;
            });

            // 限制结果数量
            return results.slice(0, searchOptions.maxResults);
        } catch (error) {
            console.error('Error searching tags:', error);
            return [];
        }
    }

    // 综合搜索
    searchAll(query, options = {}) {
        try {
            const searchOptions = { ...this.searchOptions, ...options };
            this.currentQuery = query;

            const results = {
                notes: [],
                cards: [],
                tags: [],
                total: 0,
                query: query,
                timestamp: new Date().toISOString()
            };

            // 搜索笔记
            if (searchOptions.includeNotes) {
                results.notes = this.searchNotes(query, searchOptions);
                results.total += results.notes.length;
            }

            // 搜索卡片
            if (searchOptions.includeCards) {
                results.cards = this.searchCards(query, searchOptions);
                results.total += results.cards.length;
            }

            // 搜索标签
            if (searchOptions.includeTags) {
                results.tags = this.searchTags(query, searchOptions);
                results.total += results.tags.length;
            }

            this.searchResults = results;
            this.addToSearchHistory(query);

            return results;
        } catch (error) {
            console.error('Error in global search:', error);
            return {
                notes: [],
                cards: [],
                tags: [],
                total: 0,
                query: query,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    // 快速搜索（用于搜索框实时搜索）
    quickSearch(query, maxResults = 10) {
        try {
            const options = {
                includeNotes: true,
                includeCards: false,
                includeTags: true,
                searchInTitle: true,
                searchInContent: true,
                searchInTags: true,
                maxResults: maxResults
            };

            return this.searchAll(query, options);
        } catch (error) {
            console.error('Error in quick search:', error);
            return {
                notes: [],
                cards: [],
                tags: [],
                total: 0,
                query: query,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 计算相关性分数
    calculateRelevance(text, query) {
        try {
            if (query === '') return 1;

            // 精确匹配
            if (text.includes(query)) {
                return 100 + (query.length * 10);
            }

            // 模糊搜索
            if (this.searchOptions.fuzzySearch) {
                const fuzzyScore = this.fuzzySearch(text, query);
                if (fuzzyScore > 0) {
                    return fuzzyScore;
                }
            }

            return 0;
        } catch (error) {
            console.error('Error calculating relevance:', error);
            return 0;
        }
    }

    // 模糊搜索
    fuzzySearch(text, query) {
        try {
            const textLower = text.toLowerCase();
            const queryLower = query.toLowerCase();

            // 计算Levenshtein距离
            const distance = this.levenshteinDistance(textLower, queryLower);
            const maxLength = Math.max(textLower.length, queryLower.length);

            if (maxLength === 0) return 0;

            // 返回相似度分数
            return Math.round((1 - distance / maxLength) * 50);
        } catch (error) {
            console.error('Error in fuzzy search:', error);
            return 0;
        }
    }

    // Levenshtein距离算法
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // 获取匹配片段
    getMatchSnippet(text, query, maxLength = 150) {
        try {
            const textLower = text.toLowerCase();
            const queryLower = query.toLowerCase();
            const position = textLower.indexOf(queryLower);

            if (position === -1) {
                return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
            }

            // 计算片段起始位置
            const start = Math.max(0, position - 50);
            const end = Math.min(text.length, position + query.length + 50);

            let snippet = '';
            if (start > 0) snippet += '...';
            snippet += text.substring(start, end);
            if (end < text.length) snippet += '...';

            return snippet;
        } catch (error) {
            console.error('Error getting match snippet:', error);
            return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
        }
    }

    // 高亮匹配文本
    highlightMatch(text, query, className = 'search-highlight') {
        try {
            if (!query || !text) return text;

            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, `<span class="${className}">$1</span>`);
        } catch (error) {
            console.error('Error highlighting match:', error);
            return text;
        }
    }

    // 获取当前搜索结果
    getCurrentResults() {
        return this.searchResults;
    }

    // 获取当前查询
    getCurrentQuery() {
        return this.currentQuery;
    }

    // 清除搜索结果
    clearResults() {
        this.searchResults = [];
        this.currentQuery = '';
    }

    // 保存搜索设置
    saveSearchOptions(options) {
        this.searchOptions = { ...this.searchOptions, ...options };
        localStorage.setItem('searchOptions', JSON.stringify(this.searchOptions));
    }

    // 加载搜索设置
    loadSearchOptions() {
        try {
            const saved = localStorage.getItem('searchOptions');
            if (saved) {
                this.searchOptions = { ...this.searchOptions, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error loading search options:', error);
        }
    }

    // 获取搜索建议
    getSearchSuggestions(query, maxSuggestions = 5) {
        try {
            const suggestions = [];
            const history = this.getSearchHistory();

            // 从历史记录获取建议
            history.forEach(historyQuery => {
                if (historyQuery !== query && historyQuery.startsWith(query)) {
                    suggestions.push({
                        type: 'history',
                        text: historyQuery,
                        relevance: historyQuery.length - query.length
                    });
                }
            });

            // 从标签获取建议
            const tags = this.noteController.getAllTags();
            tags.forEach(tag => {
                if (tag.name.toLowerCase().includes(query.toLowerCase())) {
                    suggestions.push({
                        type: 'tag',
                        text: `#${tag.name}`,
                        relevance: tag.usageCount
                    });
                }
            });

            // 排序并限制数量
            suggestions.sort((a, b) => b.relevance - a.relevance);
            return suggestions.slice(0, maxSuggestions);
        } catch (error) {
            console.error('Error getting search suggestions:', error);
            return [];
        }
    }

    // 导出搜索数据
    exportData() {
        try {
            return {
                searchHistory: this.searchHistory,
                searchOptions: this.searchOptions,
                currentQuery: this.currentQuery,
                exportDate: new Date().toISOString(),
                version: 1
            };
        } catch (error) {
            console.error('Error exporting search data:', error);
            return null;
        }
    }

    // 导入搜索数据
    importData(data) {
        try {
            if (!data.searchHistory || !data.searchOptions) {
                throw new Error('Invalid search data format');
            }

            this.searchHistory = data.searchHistory;
            this.searchOptions = { ...this.searchOptions, ...data.searchOptions };
            this.saveSearchHistory();
            localStorage.setItem('searchOptions', JSON.stringify(this.searchOptions));

            return { success: true };
        } catch (error) {
            console.error('Error importing search data:', error);
            return { success: false, error: error.message };
        }
    }

    // 销毁控制器
    destroy() {
        this.clearResults();
        this.searchHistory = [];
    }
}

// 创建单例
const searchController = new SearchController();