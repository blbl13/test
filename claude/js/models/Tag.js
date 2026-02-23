/**
 * 标签模型类
 */

class Tag {
    constructor({
        id = null,
        name = '',
        color = null,
        description = '',
        usageCount = 0,
        createdAt = new Date(),
        updatedAt = new Date(),
        metadata = {}
    } = {}) {
        this.id = id || generateId();
        this.name = name;
        this.color = color || this.generateColor();
        this.description = description;
        this.usageCount = usageCount;
        this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
        this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
        this.metadata = metadata;
    }

    // 生成标签颜色
    generateColor() {
        return generateColor(this.name);
    }

    // 增加使用次数
    incrementUsage() {
        this.usageCount++;
        this.updatedAt = new Date();
    }

    // 减少使用次数
    decrementUsage() {
        this.usageCount = Math.max(0, this.usageCount - 1);
        this.updatedAt = new Date();
    }

    // 更新描述
    updateDescription(newDescription) {
        this.description = newDescription;
        this.updatedAt = new Date();
    }

    // 更新名称
    updateName(newName) {
        this.name = newName;
        this.color = this.generateColor();
        this.updatedAt = new Date();
    }

    // 获取使用频率等级
    getFrequencyLevel() {
        if (this.usageCount >= 20) return 'very-high';
        if (this.usageCount >= 10) return 'high';
        if (this.usageCount >= 5) return 'medium';
        if (this.usageCount >= 1) return 'low';
        return 'none';
    }

    // 获取CSS类
    getCssClass() {
        const level = this.getFrequencyLevel();
        return `tag-item tag-frequency-${level}`;
    }

    // 检查是否常用标签
    isFrequentlyUsed(threshold = 5) {
        return this.usageCount >= threshold;
    }

    // 检查是否未使用
    isUnused() {
        return this.usageCount === 0;
    }

    // 转换为JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            description: this.description,
            usageCount: this.usageCount,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            metadata: this.metadata
        };
    }

    // 从JSON创建实例
    static fromJSON(json) {
        return new Tag({
            id: json.id,
            name: json.name,
            color: json.color,
            description: json.description,
            usageCount: json.usageCount || 0,
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            metadata: json.metadata || {}
        });
    }

    // 验证标签数据
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('标签名称不能为空');
        }

        if (this.name && this.name.length > 50) {
            errors.push('标签名称不能超过50个字符');
        }

        if (this.description && this.description.length > 200) {
            errors.push('标签描述不能超过200个字符');
        }

        if (this.usageCount && this.usageCount < 0) {
            errors.push('使用次数不能为负数');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // 比较两个标签是否相等
    equals(other) {
        if (!(other instanceof Tag)) return false;
        return this.id === other.id && this.name === other.name;
    }

    // 创建一个标签的副本
    clone() {
        return new Tag({
            ...this.toJSON(),
            id: generateId(),
            name: `${this.name} (副本)`,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    // 获取标签统计信息
    getStats() {
        return {
            name: this.name,
            color: this.color,
            usageCount: this.usageCount,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            frequencyLevel: this.getFrequencyLevel(),
            isFrequentlyUsed: this.isFrequentlyUsed(),
            isUnused: this.isUnused(),
            daysSinceCreation: Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24))
        };
    }

    // 静态方法：创建空标签
    static createEmpty() {
        return new Tag({
            name: '',
            description: ''
        });
    }

    // 静态方法：从字符串数组创建标签
    static createFromArray(tagNames) {
        return tagNames.map(name => {
            if (typeof name === 'string') {
                return new Tag({ name: name.trim() });
            }
            return name;
        }).filter(tag => tag.name.length > 0);
    }

    // 静态方法：合并标签
    static mergeTags(tags) {
        const tagMap = new Map();

        tags.forEach(tag => {
            if (tagMap.has(tag.name)) {
                // 合并相同名称的标签
                const existingTag = tagMap.get(tag.name);
                existingTag.usageCount += tag.usageCount;
            } else {
                tagMap.set(tag.name, tag);
            }
        });

        return Array.from(tagMap.values());
    }

    // 静态方法：排序标签
    static sortTags(tags, sortBy = 'usage', order = 'desc') {
        const sortedTags = [...tags];

        switch (sortBy) {
            case 'name':
                sortedTags.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'usage':
                sortedTags.sort((a, b) => a.usageCount - b.usageCount);
                break;
            case 'created':
                sortedTags.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'updated':
                sortedTags.sort((a, b) => b.updatedAt - a.updatedAt);
                break;
        }

        return order === 'desc' ? sortedTags.reverse() : sortedTags;
    }

    // 静态方法：过滤标签
    static filterTags(tags, filters = {}) {
        return tags.filter(tag => {
            if (filters.minUsage && tag.usageCount < filters.minUsage) return false;
            if (filters.maxUsage && tag.usageCount > filters.maxUsage) return false;
            if (filters.search && !tag.name.includes(filters.search)) return false;
            if (filters.unused && !tag.isUnused()) return false;
            if (filters.frequent && !tag.isFrequentlyUsed()) return false;
            return true;
        });
    }

    // 静态方法：获取常用标签
    static getFrequentTags(tags, limit = 10) {
        return Tag.sortTags(tags.filter(tag => tag.isFrequentlyUsed()), 'usage', 'desc').slice(0, limit);
    }

    // 静态方法：获取未使用标签
    static getUnusedTags(tags) {
        return tags.filter(tag => tag.isUnused());
    }

    // 静态方法：清理未使用标签
    static cleanupUnusedTags(tags) {
        const unusedTags = Tag.getUnusedTags(tags);
        const usedTags = tags.filter(tag => !tag.isUnused());
        return {
            keptTags: usedTags,
            removedTags: unusedTags,
            removedCount: unusedTags.length
        };
    }
}

// 如果环境支持，导出模块
if (typeof module !== 'undefined' && module.exports) {
    const { generateId, generateColor } = require('../utils/helpers');
    module.exports = Tag;
}