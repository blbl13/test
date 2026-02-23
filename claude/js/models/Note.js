/**
 * 笔记模型类
 */

class Note {
    constructor({
        id = null,
        title = '',
        content = '',
        tags = [],
        createdAt = new Date(),
        updatedAt = new Date(),
        wordCount = 0,
        isPinned = false,
        metadata = {}
    } = {}) {
        this.id = id || generateId();
        this.title = title;
        this.content = content;
        this.tags = Array.isArray(tags) ? tags : [];
        this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
        this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
        this.wordCount = wordCount || this.calculateWordCount();
        this.isPinned = isPinned;
        this.metadata = metadata;
    }

    // 计算字数
    calculateWordCount() {
        return countWords(this.content);
    }

    // 更新内容
    updateContent(newContent) {
        this.content = newContent;
        this.wordCount = this.calculateWordCount();
        this.updatedAt = new Date();
        this.tags = extractTags(newContent);
    }

    // 更新标题
    updateTitle(newTitle) {
        this.title = newTitle;
        this.updatedAt = new Date();
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

    // 检查是否有特定标签
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    // 置顶/取消置顶
    togglePin() {
        this.isPinned = !this.isPinned;
        this.updatedAt = new Date();
    }

    // 获取摘要
    getSummary(maxLength = 200) {
        const strippedContent = this.content.replace(/[#*`>\-\[\]]/g, '').trim();
        if (strippedContent.length <= maxLength) {
            return strippedContent;
        }
        return strippedContent.substring(0, maxLength) + '...';
    }

    // 转换为纯文本
    toPlainText() {
        return `# ${this.title}\n\n${this.content.replace(/[#*`>\-\[\]]/g, '')}`;
    }

    // 导出为Markdown
    toMarkdown() {
        return `# ${this.title}\n\n${this.content}\n\n---\n*标签: ${this.tags.join(', ')}*\n*字数: ${this.wordCount}*\n*创建时间: ${formatDate(this.createdAt)}*\n*更新时间: ${formatDate(this.updatedAt)}*`;
    }

    // 导出为JSON
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            tags: this.tags,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            wordCount: this.wordCount,
            isPinned: this.isPinned,
            metadata: this.metadata
        };
    }

    // 从JSON创建实例
    static fromJSON(json) {
        return new Note({
            id: json.id,
            title: json.title,
            content: json.content,
            tags: json.tags || [],
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            wordCount: json.wordCount || 0,
            isPinned: json.isPinned || false,
            metadata: json.metadata || {}
        });
    }

    // 比较两个笔记是否相等
    equals(other) {
        if (!(other instanceof Note)) return false;
        return this.id === other.id &&
               this.title === other.title &&
               this.content === other.content &&
               JSON.stringify(this.tags.sort()) === JSON.stringify(other.tags.sort()) &&
               this.isPinned === other.isPinned;
    }

    // 创建一个新笔记的副本
    clone() {
        return new Note({
            ...this.toJSON(),
            id: generateId(),
            title: `${this.title} (副本)`,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // 验证笔记数据
    validate() {
        const errors = [];

        if (!this.title || this.title.trim().length === 0) {
            errors.push('标题不能为空');
        }

        if (this.title && this.title.length > 100) {
            errors.push('标题不能超过100个字符');
        }

        if (!this.content || this.content.trim().length === 0) {
            errors.push('内容不能为空');
        }

        if (this.tags && !Array.isArray(this.tags)) {
            errors.push('标签必须是数组');
        }

        if (this.tags && this.tags.length > 10) {
            errors.push('标签数量不能超过10个');
        }

        if (this.wordCount && (this.wordCount < 0 || this.wordCount > 1000000)) {
            errors.push('字数超出合理范围');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // 获取笔记统计信息
    getStats() {
        return {
            wordCount: this.wordCount,
            tagCount: this.tags.length,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            daysSinceCreation: Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24)),
            daysSinceUpdate: Math.floor((new Date() - this.updatedAt) / (1000 * 60 * 60 * 24))
        };
    }

    // 检查笔记是否最近修改
    isRecentlyModified(days = 7) {
        const daysSinceUpdate = Math.floor((new Date() - this.updatedAt) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate <= days;
    }

    // 检查笔记是否为旧笔记
    isOldNote(days = 30) {
        const daysSinceUpdate = Math.floor((new Date() - this.updatedAt) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate >= days;
    }

    // 获取笔记类型
    getType() {
        if (this.content.includes('```')) return 'code';
        if (this.content.includes('![')) return 'image';
        if (this.content.includes('[ ]') || this.content.includes('[x]')) return 'todo';
        return 'text';
    }

    // 静态方法：创建空笔记
    static createEmpty() {
        return new Note({
            title: '未命名笔记',
            content: ''
        });
    }

    // 静态方法：创建示例笔记
    static createSample() {
        return new Note({
            title: '欢迎使用学习笔记工具',
            content: `# 欢迎使用 🎉

这是一个功能强大的学习笔记工具，支持：

## 📝 核心功能
- **Markdown编辑**：支持完整的Markdown语法
- **标签系统**：使用 #标签 来组织内容
- **全文搜索**：快速找到需要的笔记
- **自动保存**：每30秒自动保存，不用担心丢失

## 🍅 番茄钟
- **专注学习**：25分钟专注 + 5分钟休息
- **学习统计**：记录你的学习时长
- **任务关联**：可以将番茄钟与特定笔记关联

## 🃏 Anki卡片
- **智能复习**：基于艾宾浩斯遗忘曲线
- **多种卡片类型**：问答卡、填空卡等
- **快速创建**：从笔记中快速创建卡片

## 💡 使用技巧

1. **快速搜索**：使用搜索功能快速定位笔记
2. **标签组织**：合理使用标签管理笔记
3. **主题切换**：选择适合的主题，保护眼睛
4. **数据统计**：定期查看学习统计，了解进度

> 提示：开始书写你的第一份笔记吧！

#学习笔记 #Markdown #番茄钟 #Anki`,
            tags: ['示例', '帮助', 'Markdown']
        });
    }
}

// 如果环境支持，导出模块
if (typeof module !== 'undefined' && module.exports) {
    const { generateId, countWords, extractTags, formatDate } = require('../utils/helpers');
    module.exports = Note;
}