/**
 * 笔记控制器类
 * 处理笔记相关的业务逻辑
 */

class NoteController {
    constructor() {
        this.notes = [];
        this.tags = [];
        this.currentNote = null;
        this.currentFilter = {
            search: '',
            tags: [],
            pinned: false
        };
        this.storage = storageManager;
        this.loadData();
    }

    // 加载数据
    async loadData() {
        try {
            // 从存储加载笔记
            const storedNotes = await this.storage.getAll('notes');
            this.notes = storedNotes.map(noteData => Note.fromJSON(noteData));

            // 从存储加载标签
            const storedTags = await this.storage.getAll('tags');
            this.tags = storedTags.map(tagData => Tag.fromJSON(tagData));

            // 如果没有笔记，创建示例笔记
            if (this.notes.length === 0) {
                const sampleNote = Note.createSample();
                await this.addNote(sampleNote);
            }

            console.log(`Loaded ${this.notes.length} notes and ${this.tags.length} tags`);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // 保存笔记到存储
    async saveNote(note) {
        try {
            const noteData = note.toJSON();
            await this.storage.update('notes', noteData);
            return true;
        } catch (error) {
            console.error('Error saving note:', error);
            return false;
        }
    }

    // 保存标签到存储
    async saveTag(tag) {
        try {
            const tagData = tag.toJSON();
            await this.storage.update('tags', tagData);
            return true;
        } catch (error) {
            console.error('Error saving tag:', error);
            return false;
        }
    }

    // 添加笔记
    async addNote(note) {
        try {
            // 验证笔记
            const validation = note.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 添加到数组
            this.notes.unshift(note);

            // 保存到存储
            await this.storage.add('notes', note.toJSON());

            // 更新标签
            await this.updateTagsFromNote(note);

            return note;
        } catch (error) {
            console.error('Error adding note:', error);
            throw error;
        }
    }

    // 更新笔记
    async updateNote(note) {
        try {
            // 验证笔记
            const validation = note.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 找到索引
            const index = this.notes.findIndex(n => n.id === note.id);
            if (index === -1) {
                throw new Error('Note not found');
            }

            // 更新笔记
            this.notes[index] = note;

            // 保存到存储
            await this.saveNote(note);

            // 更新标签
            await this.updateTagsFromNote(note);

            return note;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    }

    // 删除笔记
    async deleteNote(noteId) {
        try {
            // 找到索引
            const index = this.notes.findIndex(n => n.id === noteId);
            if (index === -1) {
                throw new Error('Note not found');
            }

            // 获取笔记
            const note = this.notes[index];

            // 从数组中移除
            this.notes.splice(index, 1);

            // 从存储中删除
            await this.storage.delete('notes', noteId);

            // 更新标签使用次数
            await this.decrementTagUsage(note.tags);

            // 清除当前笔记
            if (this.currentNote && this.currentNote.id === noteId) {
                this.currentNote = null;
            }

            return true;
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }

    // 获取所有笔记
    getAllNotes() {
        return [...this.notes];
    }

    // 根据ID获取笔记
    getNoteById(noteId) {
        return this.notes.find(n => n.id === noteId) || null;
    }

    // 根据标题搜索笔记
    searchNotesByTitle(title) {
        const searchTerm = title.toLowerCase();
        return this.notes.filter(note =>
            note.title.toLowerCase().includes(searchTerm)
        );
    }

    // 根据内容搜索笔记
    searchNotesByContent(content) {
        const searchTerm = content.toLowerCase();
        return this.notes.filter(note =>
            note.content.toLowerCase().includes(searchTerm)
        );
    }

    // 根据标签搜索笔记
    searchNotesByTag(tag) {
        return this.notes.filter(note => note.hasTag(tag));
    }

    // 根据ID列表搜索笔记
    searchNotesByIds(ids) {
        return this.notes.filter(note => ids.includes(note.id));
    }

    // 获取过滤后的笔记
    getFilteredNotes() {
        let filteredNotes = [...this.notes];

        // 按搜索条件过滤
        if (this.currentFilter.search) {
            const searchTerm = this.currentFilter.search.toLowerCase();
            filteredNotes = filteredNotes.filter(note =>
                note.title.toLowerCase().includes(searchTerm) ||
                note.content.toLowerCase().includes(searchTerm) ||
                note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        // 按标签过滤
        if (this.currentFilter.tags.length > 0) {
            filteredNotes = filteredNotes.filter(note =>
                this.currentFilter.tags.every(tag => note.hasTag(tag))
            );
        }

        // 按置顶状态过滤
        if (this.currentFilter.pinned) {
            filteredNotes = filteredNotes.filter(note => note.isPinned);
        }

        return filteredNotes;
    }

    // 设置过滤条件
    setFilter(filter) {
        this.currentFilter = { ...this.currentFilter, ...filter };
        return this.getFilteredNotes();
    }

    // 清除过滤条件
    clearFilter() {
        this.currentFilter = {
            search: '',
            tags: [],
            pinned: false
        };
        return this.getFilteredNotes();
    }

    // 获取置顶笔记
    getPinnedNotes() {
        return this.notes.filter(note => note.isPinned);
    }

    // 获取最近修改的笔记
    getRecentNotes(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return this.notes.filter(note => note.updatedAt >= cutoffDate);
    }

    // 获取字数最多的笔记
    getLongestNotes(limit = 10) {
        return [...this.notes]
            .sort((a, b) => b.wordCount - a.wordCount)
            .slice(0, limit);
    }

    // 获取标签最多的笔记
    getMostTaggedNotes(limit = 10) {
        return [...this.notes]
            .sort((a, b) => b.tags.length - a.tags.length)
            .slice(0, limit);
    }

    // 更新笔记的置顶状态
    async togglePinNote(noteId) {
        try {
            const note = this.getNoteById(noteId);
            if (!note) {
                throw new Error('Note not found');
            }

            note.togglePin();
            await this.saveNote(note);

            return note;
        } catch (error) {
            console.error('Error toggling pin:', error);
            throw error;
        }
    }

    // 更新标签
    async updateTagsFromNote(note) {
        try {
            // 为每个标签增加使用次数
            for (const tagName of note.tags) {
                let tag = this.tags.find(t => t.name === tagName);
                if (!tag) {
                    tag = new Tag({ name: tagName });
                    this.tags.push(tag);
                    await this.storage.add('tags', tag.toJSON());
                } else {
                    tag.incrementUsage();
                    await this.saveTag(tag);
                }
            }

            // 获取数据库中所有标签
            const allTags = await this.storage.getAll('tags');
            const allTagNames = allTags.map(t => t.name);

            // 为不在笔记中的标签减少使用次数
            const unusedTagNames = allTagNames.filter(tagName => !note.tags.includes(tagName));
            for (const tagName of unusedTagNames) {
                const tag = this.tags.find(t => t.name === tagName);
                if (tag && tag.usageCount > 0) {
                    tag.decrementUsage();
                    await this.saveTag(tag);
                }
            }

            return true;
        } catch (error) {
            console.error('Error updating tags:', error);
            return false;
        }
    }

    // 减少标签使用次数
    async decrementTagUsage(tagNames) {
        try {
            for (const tagName of tagNames) {
                const tag = this.tags.find(t => t.name === tagName);
                if (tag && tag.usageCount > 0) {
                    tag.decrementUsage();
                    await this.saveTag(tag);
                }
            }
            return true;
        } catch (error) {
            console.error('Error decrementing tag usage:', error);
            return false;
        }
    }

    // 获取所有标签
    getAllTags() {
        return [...this.tags];
    }

    // 根据名称获取标签
    getTagByName(name) {
        return this.tags.find(t => t.name === name) || null;
    }

    // 根据ID获取标签
    getTagById(id) {
        return this.tags.find(t => t.id === id) || null;
    }

    // 添加标签
    async addTag(tag) {
        try {
            // 验证标签
            const validation = tag.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 检查是否已存在
            const existingTag = this.getTagByName(tag.name);
            if (existingTag) {
                return existingTag;
            }

            // 添加到数组
            this.tags.push(tag);

            // 保存到存储
            await this.storage.add('tags', tag.toJSON());

            return tag;
        } catch (error) {
            console.error('Error adding tag:', error);
            throw error;
        }
    }

    // 更新标签
    async updateTag(tag) {
        try {
            // 验证标签
            const validation = tag.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // 找到索引
            const index = this.tags.findIndex(t => t.id === tag.id);
            if (index === -1) {
                throw new Error('Tag not found');
            }

            // 更新标签
            this.tags[index] = tag;

            // 保存到存储
            await this.saveTag(tag);

            return tag;
        } catch (error) {
            console.error('Error updating tag:', error);
            throw error;
        }
    }

    // 删除标签
    async deleteTag(tagId) {
        try {
            // 找到索引
            const index = this.tags.findIndex(t => t.id === tagId);
            if (index === -1) {
                throw new Error('Tag not found');
            }

            // 获取标签
            const tag = this.tags[index];

            // 检查是否正在使用
            if (tag.usageCount > 0) {
                throw new Error('Cannot delete tag that is in use');
            }

            // 从数组中移除
            this.tags.splice(index, 1);

            // 从存储中删除
            await this.storage.delete('tags', tagId);

            return true;
        } catch (error) {
            console.error('Error deleting tag:', error);
            throw error;
        }
    }

    // 合并标签
    async mergeTags(sourceTagId, targetTagId) {
        try {
            const sourceTag = this.getTagById(sourceTagId);
            const targetTag = this.getTagById(targetTagId);

            if (!sourceTag || !targetTag) {
                throw new Error('Tag not found');
            }

            // 更新所有使用sourceTag的笔记
            for (const note of this.notes) {
                if (note.hasTag(sourceTag.name)) {
                    note.removeTag(sourceTag.name);
                    note.addTag(targetTag.name);
                    await this.saveNote(note);
                }
            }

            // 更新标签使用次数
            targetTag.usageCount += sourceTag.usageCount;
            await this.saveTag(targetTag);

            // 删除源标签
            await this.deleteTag(sourceTagId);

            return true;
        } catch (error) {
            console.error('Error merging tags:', error);
            throw error;
        }
    }

    // 清理未使用的标签
    async cleanupUnusedTags() {
        try {
            const unusedTags = this.tags.filter(tag => tag.isUnused());
            let deletedCount = 0;

            for (const tag of unusedTags) {
                await this.deleteTag(tag.id);
                deletedCount++;
            }

            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up unused tags:', error);
            throw error;
        }
    }

    // 获取常用标签
    getFrequentTags(limit = 10) {
        return Tag.getFrequentTags(this.tags, limit);
    }

    // 获取标签统计信息
    getTagStats() {
        return {
            totalTags: this.tags.length,
            usedTags: this.tags.filter(tag => !tag.isUnused()).length,
            unusedTags: this.tags.filter(tag => tag.isUnused()).length,
            frequentTags: this.getFrequentTags(),
            averageUsage: this.tags.length > 0 ?
                Math.round(this.tags.reduce((sum, tag) => sum + tag.usageCount, 0) / this.tags.length) : 0
        };
    }

    // 导出数据
    async exportData() {
        try {
            const data = {
                notes: this.notes.map(note => note.toJSON()),
                tags: this.tags.map(tag => tag.toJSON()),
                exportDate: new Date().toISOString(),
                version: 1
            };
            return data;
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    // 导入数据
    async importData(data) {
        try {
            if (!data.notes || !data.tags) {
                throw new Error('Invalid data format');
            }

            // 清空现有数据
            await this.storage.clearStore('notes');
            await this.storage.clearStore('tags');

            // 导入笔记
            for (const noteData of data.notes) {
                await this.storage.add('notes', noteData);
            }

            // 导入标签
            for (const tagData of data.tags) {
                await this.storage.add('tags', tagData);
            }

            // 重新加载数据
            await this.loadData();

            return { success: true };
        } catch (error) {
            console.error('Error importing data:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取笔记统计信息
    getStats() {
        const totalWords = this.notes.reduce((sum, note) => sum + note.wordCount, 0);
        const totalTags = this.tags.length;
        const pinnedNotes = this.getPinnedNotes().length;
        const recentNotes = this.getRecentNotes(7).length;

        return {
            totalNotes: this.notes.length,
            totalWords: totalWords,
            totalTags: totalTags,
            pinnedNotes: pinnedNotes,
            recentNotes: recentNotes,
            averageWordsPerNote: this.notes.length > 0 ? Math.round(totalWords / this.notes.length) : 0
        };
    }

    // 设置当前笔记
    setCurrentNote(note) {
        this.currentNote = note;
    }

    // 获取当前笔记
    getCurrentNote() {
        return this.currentNote;
    }
}

// 创建单例
const noteController = new NoteController();