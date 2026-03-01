/**
 * MessagesService - Conversations and Messaging
 *
 * Provides real-time messaging, conversations, channels,
 * attachments, reactions, and read receipts.
 *
 * Tables:
 * - conversation: Chat rooms, DMs, channels
 * - message: Individual messages
 * - messageAttachment: File attachments
 * - messageReaction: Emoji reactions
 *
 * @example
 * const messagesService = new MessagesService();
 * ServiceRegistry.register('messages', messagesService);
 *
 * // Create a conversation
 * const conv = messagesService.createConversation({
 *     name: 'Project Chat',
 *     type: 'group'
 * }, 1);
 *
 * // Send a message
 * messagesService.sendMessage(conv.idx, 'Hello team!', 1);
 */

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const MessagesServiceSchema = {
    name: 'messages',
    prefix: 'msg',
    alias: 'Messages Service',
    version: '2.0.0',

    tables: [
        // ─────────────────────────────────────────────────────────────────────
        // Conversation - Chat rooms, DMs, channels
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'conversation',
            alias: 'Conversations',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'name', label: 'Name', type: 'string' },
                { name: 'description', label: 'Description', type: 'text' },
                { name: 'type', label: 'Type', type: 'string', default: 'direct',
                    options: ['direct', 'group', 'channel', 'support', 'email'] },
                { name: 'visibility', label: 'Visibility', type: 'string', default: 'private',
                    options: ['private', 'team', 'public'] },
                { name: 'icon', label: 'Icon', type: 'string' },
                { name: 'color', label: 'Color', type: 'string' },
                { name: 'isArchived', label: 'Archived', type: 'boolean', default: false },
                { name: 'isMuted', label: 'Muted', type: 'boolean', default: false },
                { name: 'isPinned', label: 'Pinned', type: 'boolean', default: false },
                // Participants stored as JSON array of member IDs
                { name: 'participants', label: 'Participants', type: 'json' },
                { name: 'participantCount', label: 'Participant Count', type: 'integer', default: 0 },
                // Stats
                { name: 'messageCount', label: 'Messages', type: 'integer', default: 0 },
                { name: 'lastMessageAt', label: 'Last Message', type: 'datetime' },
                { name: 'lastMessagePreview', label: 'Last Message Preview', type: 'string' },
                // Relations
                { name: 'groupId', label: 'Group', type: 'integer',
                    ref: { service: 'group', table: 'group', field: 'idx' } },
                { name: 'projectId', label: 'Project', type: 'integer',
                    ref: { service: 'project', table: 'project', field: 'idx' } },
                // Metadata
                { name: 'settings', label: 'Settings', type: 'json' },
                { name: 'metadata', label: 'Metadata', type: 'json' },
                // Ownership
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'modifiedAt', label: 'Modified', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // Message - Individual messages
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'message',
            alias: 'Messages',
            primaryKey: 'idx',
            labeller: '{content}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'conversationId', label: 'Conversation', type: 'integer', required: true,
                    ref: { table: 'conversation', field: 'idx' } },
                { name: 'parentId', label: 'Reply To', type: 'integer',
                    ref: { table: 'message', field: 'idx' } },
                { name: 'content', label: 'Content', type: 'text' },
                { name: 'contentType', label: 'Content Type', type: 'string', default: 'text',
                    options: ['text', 'html', 'markdown', 'system'] },
                { name: 'messageType', label: 'Message Type', type: 'string', default: 'message',
                    options: ['message', 'system', 'notification', 'action'] },
                { name: 'isEdited', label: 'Edited', type: 'boolean', default: false },
                { name: 'editedAt', label: 'Edited At', type: 'datetime' },
                { name: 'isDeleted', label: 'Deleted', type: 'boolean', default: false },
                { name: 'deletedAt', label: 'Deleted At', type: 'datetime' },
                { name: 'isPinned', label: 'Pinned', type: 'boolean', default: false },
                { name: 'pinnedAt', label: 'Pinned At', type: 'datetime' },
                { name: 'pinnedBy', label: 'Pinned By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                // Read tracking
                { name: 'readBy', label: 'Read By', type: 'json' },  // Array of {memberId, readAt}
                // Stats
                { name: 'reactionCount', label: 'Reactions', type: 'integer', default: 0 },
                { name: 'replyCount', label: 'Replies', type: 'integer', default: 0 },
                { name: 'attachmentCount', label: 'Attachments', type: 'integer', default: 0 },
                // Mentions
                { name: 'mentions', label: 'Mentions', type: 'json' },  // Array of member IDs
                // Metadata (email fields, etc.)
                { name: 'metadata', label: 'Metadata', type: 'json' },
                // Sender
                { name: 'senderId', label: 'Sender', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // MessageAttachment - File attachments
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'messageAttachment',
            alias: 'Attachments',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'messageId', label: 'Message', type: 'integer', required: true,
                    ref: { table: 'message', field: 'idx' } },
                { name: 'name', label: 'Name', type: 'string', required: true },
                { name: 'mimeType', label: 'MIME Type', type: 'string' },
                { name: 'size', label: 'Size', type: 'integer' },
                { name: 'url', label: 'URL', type: 'string' },
                { name: 'storagePath', label: 'Storage Path', type: 'string' },
                { name: 'thumbnailUrl', label: 'Thumbnail', type: 'string' },
                { name: 'metadata', label: 'Metadata', type: 'json' },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // MessageReaction - Emoji reactions
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'messageReaction',
            alias: 'Reactions',
            primaryKey: 'idx',
            labeller: '{emoji}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'messageId', label: 'Message', type: 'integer', required: true,
                    ref: { table: 'message', field: 'idx' } },
                { name: 'memberId', label: 'Member', type: 'integer', required: true,
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'emoji', label: 'Emoji', type: 'string', required: true },
                { name: 'createdAt', label: 'Created', type: 'datetime' }
            ]
        },

        // ─────────────────────────────────────────────────────────────────────
        // MessageTemplate - Reusable message/email templates
        // ─────────────────────────────────────────────────────────────────────
        {
            name: 'messageTemplate',
            alias: 'Message Templates',
            primaryKey: 'idx',
            labeller: '{name}',
            columns: [
                { name: 'idx', label: 'ID', type: 'integer', auto: true },
                { name: 'name', label: 'Name', type: 'string', required: true },
                { name: 'key', label: 'Key', type: 'string' },
                { name: 'category', label: 'Category', type: 'string' },
                { name: 'subject', label: 'Subject', type: 'string' },
                { name: 'body', label: 'Body', type: 'text', required: true },
                { name: 'contentType', label: 'Content Type', type: 'string', default: 'text',
                    options: ['text', 'html', 'markdown'] },
                { name: 'variables', label: 'Variables', type: 'json' },
                { name: 'isActive', label: 'Active', type: 'boolean', default: true },
                { name: 'createdBy', label: 'Created By', type: 'integer',
                    ref: { service: 'member', table: 'member', field: 'idx' } },
                { name: 'createdAt', label: 'Created', type: 'datetime' },
                { name: 'modifiedAt', label: 'Modified', type: 'datetime' }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Class
// ─────────────────────────────────────────────────────────────────────────────

class MessagesService extends Publome {
    constructor(config = {}) {
        super(MessagesServiceSchema, config);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONVERSATION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create a conversation
     * @param {Object} data - Conversation data
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon}
     */
    createConversation(data, createdBy = null) {
        const now = new Date().toISOString();
        
        // Initialize participants with creator
        let participants = data.participants || [];
        if (createdBy && !participants.includes(createdBy)) {
            participants = [createdBy, ...participants];
        }

        const conversation = this.table('conversation').create({
            ...data,
            participants,
            participantCount: participants.length,
            createdBy,
            createdAt: now,
            modifiedAt: now
        });

        return conversation;
    }

    /**
     * Create a direct message conversation
     * @param {number} memberId1 - First member
     * @param {number} memberId2 - Second member
     * @returns {Publon}
     */
    createDirectConversation(memberId1, memberId2) {
        // Check if DM already exists
        const existing = this.getDirectConversation(memberId1, memberId2);
        if (existing) return existing;

        // Resolve display names via ServiceRegistry if available
        let name = `DM: ${memberId1} & ${memberId2}`;
        if (typeof ServiceRegistry !== 'undefined' && ServiceRegistry.has('member')) {
            const memberTable = ServiceRegistry.get('member').table('member');
            const m1 = memberTable.read(memberId1);
            const m2 = memberTable.read(memberId2);
            const n1 = m1 ? (m1.get('displayName') || m1.get('firstName') || m1.get('username') || memberId1) : memberId1;
            const n2 = m2 ? (m2.get('displayName') || m2.get('firstName') || m2.get('username') || memberId2) : memberId2;
            name = `${n1} & ${n2}`;
        }

        return this.createConversation({
            name,
            type: 'direct',
            participants: [memberId1, memberId2]
        }, memberId1);
    }

    /**
     * Get direct conversation between two members
     * @param {number} memberId1 - First member
     * @param {number} memberId2 - Second member
     * @returns {Publon|null}
     */
    getDirectConversation(memberId1, memberId2) {
        return this.table('conversation').all().find(c => {
            if (c.get('type') !== 'direct') return false;
            const participants = c.get('participants') || [];
            return participants.includes(memberId1) && 
                   participants.includes(memberId2) &&
                   participants.length === 2;
        }) || null;
    }

    /**
     * Get conversation by ID
     * @param {number} conversationId - Conversation idx
     * @returns {Publon|null}
     */
    getConversation(conversationId) {
        return this.table('conversation').read(conversationId);
    }

    /**
     * Get conversations for a member
     * @param {number} memberId - Member idx
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    getMemberConversations(memberId, options = {}) {
        let conversations = this.table('conversation').all().filter(c => {
            const participants = c.get('participants') || [];
            return participants.includes(memberId);
        });

        if (!options.includeArchived) {
            conversations = conversations.filter(c => !c.get('isArchived'));
        }

        if (options.type) {
            conversations = conversations.filter(c => c.get('type') === options.type);
        }

        // Sort by last message time
        return conversations.sort((a, b) => {
            const aTime = a.get('lastMessageAt') || a.get('createdAt');
            const bTime = b.get('lastMessageAt') || b.get('createdAt');
            return new Date(bTime) - new Date(aTime);
        });
    }

    /**
     * Add participant to conversation
     * @param {number} conversationId - Conversation idx
     * @param {number} memberId - Member to add
     */
    addParticipant(conversationId, memberId) {
        const conv = this.table('conversation').read(conversationId);
        if (!conv) throw new Error('Conversation not found');

        const participants = conv.get('participants') || [];
        if (!participants.includes(memberId)) {
            participants.push(memberId);
            conv.set('participants', participants);
            conv.set('participantCount', participants.length);

            // Add system message
            this.sendSystemMessage(conversationId, `Member #${memberId} joined the conversation`);
        }
    }

    /**
     * Remove participant from conversation
     * @param {number} conversationId - Conversation idx
     * @param {number} memberId - Member to remove
     */
    removeParticipant(conversationId, memberId) {
        const conv = this.table('conversation').read(conversationId);
        if (!conv) throw new Error('Conversation not found');

        const participants = conv.get('participants') || [];
        const index = participants.indexOf(memberId);
        if (index > -1) {
            participants.splice(index, 1);
            conv.set('participants', participants);
            conv.set('participantCount', participants.length);

            // Add system message
            this.sendSystemMessage(conversationId, `Member #${memberId} left the conversation`);
        }
    }

    /**
     * Check if member is participant
     * @param {number} conversationId - Conversation idx
     * @param {number} memberId - Member idx
     * @returns {boolean}
     */
    isParticipant(conversationId, memberId) {
        const conv = this.table('conversation').read(conversationId);
        if (!conv) return false;
        const participants = conv.get('participants') || [];
        return participants.includes(memberId);
    }

    /**
     * Archive conversation
     * @param {number} conversationId - Conversation idx
     */
    archiveConversation(conversationId) {
        const conv = this.table('conversation').read(conversationId);
        if (conv) conv.set('isArchived', true);
    }

    /**
     * Unarchive conversation
     * @param {number} conversationId - Conversation idx
     */
    unarchiveConversation(conversationId) {
        const conv = this.table('conversation').read(conversationId);
        if (conv) conv.set('isArchived', false);
    }

    /**
     * Delete conversation and all messages
     * @param {number} conversationId - Conversation idx
     */
    deleteConversation(conversationId) {
        // Delete all messages
        const messages = this.getConversationMessages(conversationId);
        messages.forEach(m => this._deleteMessageData(m.idx));

        // Delete conversation
        this.table('conversation').delete(conversationId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MESSAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a message
     * @param {number} conversationId - Conversation idx
     * @param {string} content - Message content
     * @param {number} senderId - Sender member idx
     * @param {Object} [options] - Additional options
     * @returns {Publon}
     */
    sendMessage(conversationId, content, senderId, options = {}) {
        const conv = this.table('conversation').read(conversationId);
        if (!conv) throw new Error('Conversation not found');

        const now = new Date().toISOString();

        // Extract mentions from content
        const mentions = this._extractMentions(content);

        const message = this.table('message').create({
            conversationId,
            content,
            contentType: options.contentType || 'text',
            messageType: options.messageType || 'message',
            parentId: options.parentId,
            mentions,
            senderId,
            readBy: [{ memberId: senderId, readAt: now }],
            createdAt: now
        });

        // Update conversation
        conv.set('lastMessageAt', now);
        conv.set('lastMessagePreview', content.substring(0, 100));
        conv.set('messageCount', (conv.get('messageCount') || 0) + 1);
        conv.set('modifiedAt', now);

        // Update parent reply count
        if (options.parentId) {
            const parent = this.table('message').read(options.parentId);
            if (parent) {
                parent.set('replyCount', (parent.get('replyCount') || 0) + 1);
            }
        }

        return message;
    }

    /**
     * Send a system message
     * @param {number} conversationId - Conversation idx
     * @param {string} content - Message content
     * @returns {Publon}
     */
    sendSystemMessage(conversationId, content) {
        const now = new Date().toISOString();

        const message = this.table('message').create({
            conversationId,
            content,
            contentType: 'text',
            messageType: 'system',
            createdAt: now
        });

        // Update conversation
        const conv = this.table('conversation').read(conversationId);
        if (conv) {
            conv.set('lastMessageAt', now);
            conv.set('messageCount', (conv.get('messageCount') || 0) + 1);
        }

        return message;
    }

    /**
     * Get message by ID
     * @param {number} messageId - Message idx
     * @returns {Publon|null}
     */
    getMessage(messageId) {
        return this.table('message').read(messageId);
    }

    /**
     * Get messages for a conversation
     * @param {number} conversationId - Conversation idx
     * @param {Object} [options] - Query options
     * @returns {Array<Publon>}
     */
    getConversationMessages(conversationId, options = {}) {
        let messages = this.table('message').all()
            .filter(m => m.get('conversationId') === conversationId);

        if (!options.includeDeleted) {
            messages = messages.filter(m => !m.get('isDeleted'));
        }

        if (options.parentId !== undefined) {
            messages = messages.filter(m => m.get('parentId') === options.parentId);
        }

        // Sort by created time
        messages.sort((a, b) => 
            new Date(a.get('createdAt')) - new Date(b.get('createdAt'))
        );

        // Apply limit and offset
        if (options.offset) {
            messages = messages.slice(options.offset);
        }
        if (options.limit) {
            messages = messages.slice(0, options.limit);
        }

        return messages;
    }

    /**
     * Get thread (replies to a message)
     * @param {number} messageId - Parent message idx
     * @returns {Array<Publon>}
     */
    getThread(messageId) {
        return this.table('message').all()
            .filter(m => m.get('parentId') === messageId && !m.get('isDeleted'))
            .sort((a, b) => new Date(a.get('createdAt')) - new Date(b.get('createdAt')));
    }

    /**
     * Edit a message
     * @param {number} messageId - Message idx
     * @param {string} newContent - New content
     * @param {number} editorId - Editor member idx
     */
    editMessage(messageId, newContent, editorId) {
        const message = this.table('message').read(messageId);
        if (!message) throw new Error('Message not found');
        if (message.get('senderId') !== editorId) {
            throw new Error('Cannot edit message from another user');
        }

        message.set('content', newContent);
        message.set('isEdited', true);
        message.set('editedAt', new Date().toISOString());

        // Update mentions
        message.set('mentions', this._extractMentions(newContent));
    }

    /**
     * Delete a message (soft delete)
     * @param {number} messageId - Message idx
     * @param {number} deleterId - Deleter member idx
     */
    deleteMessage(messageId, deleterId) {
        const message = this.table('message').read(messageId);
        if (!message) throw new Error('Message not found');

        message.set('isDeleted', true);
        message.set('deletedAt', new Date().toISOString());
        message.set('content', '[Message deleted]');
    }

    /**
     * Delete message data (hard delete)
     * @private
     */
    _deleteMessageData(messageId) {
        // Delete attachments
        this.table('messageAttachment').all()
            .filter(a => a.get('messageId') === messageId)
            .forEach(a => this.table('messageAttachment').delete(a.idx));

        // Delete reactions
        this.table('messageReaction').all()
            .filter(r => r.get('messageId') === messageId)
            .forEach(r => this.table('messageReaction').delete(r.idx));

        // Delete replies recursively
        this.getThread(messageId)
            .forEach(m => this._deleteMessageData(m.idx));

        // Delete message
        this.table('message').delete(messageId);
    }

    /**
     * Pin a message
     * @param {number} messageId - Message idx
     * @param {number} memberId - Member pinning
     */
    pinMessage(messageId, memberId) {
        const message = this.table('message').read(messageId);
        if (message) {
            message.set('isPinned', true);
            message.set('pinnedAt', new Date().toISOString());
            message.set('pinnedBy', memberId);
        }
    }

    /**
     * Unpin a message
     * @param {number} messageId - Message idx
     */
    unpinMessage(messageId) {
        const message = this.table('message').read(messageId);
        if (message) {
            message.set('isPinned', false);
            message.set('pinnedAt', null);
            message.set('pinnedBy', null);
        }
    }

    /**
     * Get pinned messages
     * @param {number} conversationId - Conversation idx
     * @returns {Array<Publon>}
     */
    getPinnedMessages(conversationId) {
        return this.table('message').all()
            .filter(m => 
                m.get('conversationId') === conversationId && 
                m.get('isPinned') &&
                !m.get('isDeleted')
            );
    }

    /**
     * Extract @mentions from content
     * @private
     */
    _extractMentions(content) {
        const mentions = [];
        const regex = /@(\d+)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const memberId = parseInt(match[1]);
            if (!mentions.includes(memberId)) {
                mentions.push(memberId);
            }
        }
        return mentions;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ RECEIPTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Mark message as read
     * @param {number} messageId - Message idx
     * @param {number} memberId - Member idx
     */
    markAsRead(messageId, memberId) {
        const message = this.table('message').read(messageId);
        if (!message) return;

        const readBy = message.get('readBy') || [];
        if (!readBy.some(r => r.memberId === memberId)) {
            readBy.push({ memberId, readAt: new Date().toISOString() });
            message.set('readBy', readBy);
        }
    }

    /**
     * Mark all messages in conversation as read
     * @param {number} conversationId - Conversation idx
     * @param {number} memberId - Member idx
     */
    markConversationAsRead(conversationId, memberId) {
        const messages = this.getConversationMessages(conversationId);
        messages.forEach(m => this.markAsRead(m.idx, memberId));
    }

    /**
     * Get unread count for a conversation
     * @param {number} conversationId - Conversation idx
     * @param {number} memberId - Member idx
     * @returns {number}
     */
    getUnreadCount(conversationId, memberId) {
        const messages = this.getConversationMessages(conversationId);
        return messages.filter(m => {
            if (m.get('senderId') === memberId) return false;
            const readBy = m.get('readBy') || [];
            return !readBy.some(r => r.memberId === memberId);
        }).length;
    }

    /**
     * Get total unread count for a member
     * @param {number} memberId - Member idx
     * @returns {number}
     */
    getTotalUnreadCount(memberId) {
        const conversations = this.getMemberConversations(memberId);
        return conversations.reduce((total, c) => 
            total + this.getUnreadCount(c.idx, memberId), 0
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add attachment to message
     * @param {number} messageId - Message idx
     * @param {Object} data - Attachment data
     * @returns {Publon}
     */
    addAttachment(messageId, data) {
        const message = this.table('message').read(messageId);
        if (!message) throw new Error('Message not found');

        const attachment = this.table('messageAttachment').create({
            messageId,
            ...data,
            createdAt: new Date().toISOString()
        });

        // Update attachment count
        message.set('attachmentCount', (message.get('attachmentCount') || 0) + 1);

        return attachment;
    }

    /**
     * Get attachments for message
     * @param {number} messageId - Message idx
     * @returns {Array<Publon>}
     */
    getMessageAttachments(messageId) {
        return this.table('messageAttachment').all()
            .filter(a => a.get('messageId') === messageId);
    }

    /**
     * Get all attachments in conversation
     * @param {number} conversationId - Conversation idx
     * @returns {Array<Publon>}
     */
    getConversationAttachments(conversationId) {
        const messageIds = this.getConversationMessages(conversationId)
            .map(m => m.idx);
        
        return this.table('messageAttachment').all()
            .filter(a => messageIds.includes(a.get('messageId')));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add reaction to message
     * @param {number} messageId - Message idx
     * @param {number} memberId - Member idx
     * @param {string} emoji - Emoji
     * @returns {Publon}
     */
    addReaction(messageId, memberId, emoji) {
        const message = this.table('message').read(messageId);
        if (!message) throw new Error('Message not found');

        // Check if already reacted with same emoji
        const existing = this.table('messageReaction').all().find(r =>
            r.get('messageId') === messageId &&
            r.get('memberId') === memberId &&
            r.get('emoji') === emoji
        );

        if (existing) return existing;

        const reaction = this.table('messageReaction').create({
            messageId,
            memberId,
            emoji,
            createdAt: new Date().toISOString()
        });

        // Update reaction count
        message.set('reactionCount', (message.get('reactionCount') || 0) + 1);

        return reaction;
    }

    /**
     * Remove reaction from message
     * @param {number} messageId - Message idx
     * @param {number} memberId - Member idx
     * @param {string} emoji - Emoji
     */
    removeReaction(messageId, memberId, emoji) {
        const reaction = this.table('messageReaction').all().find(r =>
            r.get('messageId') === messageId &&
            r.get('memberId') === memberId &&
            r.get('emoji') === emoji
        );

        if (reaction) {
            this.table('messageReaction').delete(reaction.idx);

            // Update reaction count
            const message = this.table('message').read(messageId);
            if (message) {
                message.set('reactionCount', Math.max(0, (message.get('reactionCount') || 0) - 1));
            }
        }
    }

    /**
     * Toggle reaction on message
     * @param {number} messageId - Message idx
     * @param {number} memberId - Member idx
     * @param {string} emoji - Emoji
     * @returns {boolean} Whether reaction was added (true) or removed (false)
     */
    toggleReaction(messageId, memberId, emoji) {
        const existing = this.table('messageReaction').all().find(r =>
            r.get('messageId') === messageId &&
            r.get('memberId') === memberId &&
            r.get('emoji') === emoji
        );

        if (existing) {
            this.removeReaction(messageId, memberId, emoji);
            return false;
        } else {
            this.addReaction(messageId, memberId, emoji);
            return true;
        }
    }

    /**
     * Get reactions for message
     * @param {number} messageId - Message idx
     * @returns {Array<Publon>}
     */
    getMessageReactions(messageId) {
        return this.table('messageReaction').all()
            .filter(r => r.get('messageId') === messageId);
    }

    /**
     * Get reaction summary for message
     * @param {number} messageId - Message idx
     * @returns {Object} Emoji counts
     */
    getReactionSummary(messageId) {
        const reactions = this.getMessageReactions(messageId);
        const summary = {};
        
        reactions.forEach(r => {
            const emoji = r.get('emoji');
            if (!summary[emoji]) {
                summary[emoji] = { count: 0, members: [] };
            }
            summary[emoji].count++;
            summary[emoji].members.push(r.get('memberId'));
        });

        return summary;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Search messages
     * @param {string} query - Search query
     * @param {Object} [options] - Filter options
     * @returns {Array<Publon>}
     */
    searchMessages(query, options = {}) {
        const q = query.toLowerCase();

        let messages = this.table('message').all().filter(m => {
            if (m.get('isDeleted')) return false;
            const content = (m.get('content') || '').toLowerCase();
            return content.includes(q);
        });

        if (options.conversationId) {
            messages = messages.filter(m => m.get('conversationId') === options.conversationId);
        }

        if (options.senderId) {
            messages = messages.filter(m => m.get('senderId') === options.senderId);
        }

        return messages.sort((a, b) => 
            new Date(b.get('createdAt')) - new Date(a.get('createdAt'))
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Create a message template
     * @param {Object} data - Template data (name, category, subject, body, contentType, variables)
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon}
     */
    createTemplate(data, createdBy = null) {
        const now = new Date().toISOString();
        return this.table('messageTemplate').create({
            ...data,
            createdBy,
            createdAt: now,
            modifiedAt: now
        });
    }

    /**
     * Seed a template (upsert by key + category).
     * If a template with the same key+category exists, it is updated.
     * This is the override mechanism — institutions call seedTemplate
     * with the same keys to replace default templates.
     * @param {Object} data - Template data (must include key and category)
     * @param {number} [createdBy] - Creator member idx
     * @returns {Publon}
     */
    seedTemplate(data, createdBy = null) {
        if (!data.key || !data.category) {
            throw new Error('seedTemplate requires both key and category');
        }

        const existing = this.getTemplateByKey(data.key, data.category);
        if (existing) {
            return this.updateTemplate(existing.idx, data);
        }
        return this.createTemplate(data, createdBy);
    }

    /**
     * Find a template by its machine key within a category
     * @param {string} key - Template key (e.g. 'at-risk')
     * @param {string} category - Category scope (e.g. 'autoscholar')
     * @returns {Publon|null}
     */
    getTemplateByKey(key, category) {
        return this.table('messageTemplate').all().find(t =>
            t.get('key') === key &&
            t.get('category') === category &&
            t.get('isActive') !== false
        ) || null;
    }

    /**
     * Get templates, optionally filtered by category
     * @param {string} [category] - Filter by category
     * @returns {Array<Publon>}
     */
    getTemplates(category = null) {
        let templates = this.table('messageTemplate').all()
            .filter(t => t.get('isActive') !== false);

        if (category) {
            templates = templates.filter(t => t.get('category') === category);
        }

        return templates;
    }

    /**
     * Get a single template by idx
     * @param {number} idx - Template idx
     * @returns {Publon|null}
     */
    getTemplate(idx) {
        return this.table('messageTemplate').read(idx);
    }

    /**
     * Update a template
     * @param {number} idx - Template idx
     * @param {Object} data - Fields to update
     * @returns {Publon|null}
     */
    updateTemplate(idx, data) {
        const template = this.table('messageTemplate').read(idx);
        if (!template) return null;

        Object.entries(data).forEach(([key, value]) => template.set(key, value));
        template.set('modifiedAt', new Date().toISOString());
        return template;
    }

    /**
     * Render a template with variable substitution
     * @param {number} idx - Template idx
     * @param {Object} variables - Map of variable names to values
     * @returns {{ subject: string, body: string, contentType: string }|null}
     */
    renderTemplate(idx, variables = {}) {
        const template = this.table('messageTemplate').read(idx);
        if (!template) return null;

        const substitute = (text) =>
            (text || '').replace(/\{(\w+)\}/g, (_, field) => variables[field] ?? '');

        return {
            subject: substitute(template.get('subject')),
            body: substitute(template.get('body')),
            contentType: template.get('contentType') || 'text'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MESSAGING PANEL
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Render a messaging panel with accordion:
     *   1. Message single entity  2. Edit templates  3. Message all (batch)
     *
     * @param {HTMLElement} container
     * @param {Object} config
     * @param {string}   config.category        - Template category (e.g. 'autoscholar')
     * @param {Function} config.variableBuilder  - (entity) => { var: value }
     * @param {Function} config.sendFn           - async (to, subject, body) => void
     * @param {Function} config.emailResolver    - (entity) => email string
     * @param {Function} [config.labelResolver]  - (entity) => display name
     * @param {string}   [config.entityLabel]    - Label for entities (default 'Entity')
     * @param {Object}   [config.categoryColors] - { categoryKey: badgeColor } for batch summary
     * @returns {{ setEntity: Function, setEntities: Function }}
     */
    renderMessagingPanel(container, config) {
        const service = this;
        const entityLabel = config.entityLabel || 'Entity';
        const state = { entity: null, entities: [] };

        const accordion = new uiAccordion({
            template: 'styled',
            exclusive: true,
            size: 'sm',
            content: {
                single:    { label: `<i class="fas fa-envelope" style="margin-right:0.4rem;"></i>Message ${entityLabel}`, open: true },
                templates: { label: '<i class="fas fa-file-alt" style="margin-right:0.4rem;"></i>Edit Templates' },
                batch:     { label: '<i class="fas fa-paper-plane" style="margin-right:0.4rem;"></i>Message All' }
            },
            parent: container
        });
        accordion.el.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0;overflow-y:auto;box-shadow:none;';
        // Compact headers
        accordion.el.querySelectorAll('.ui-accordion-trigger').forEach(t => {
            t.style.padding = '0.4rem 0.75rem';
            t.style.fontSize = '0.8rem';
        });

        const getPane = (key) =>
            accordion.el.querySelector(`.ui-accordion-item[data-key="${key}"] .ui-accordion-content`);

        const singleCtrl    = this._renderMsgSinglePane(getPane('single'), config, state);
        const batchCtrl     = this._renderMsgBatchPane(getPane('batch'), config, state);
        /* templates pane has no external controller */
        this._renderMsgTemplatesPane(getPane('templates'), config);

        return {
            setEntity(entity) {
                state.entity = entity;
                singleCtrl.update();
            },
            setEntities(entities) {
                state.entities = entities;
                batchCtrl.update();
            }
        };
    }

    /** @private — Pane 1: Message single entity */
    _renderMsgSinglePane(pane, config, state) {
        const service = this;
        const { category, variableBuilder, sendFn, emailResolver, labelResolver } = config;
        const inner = document.createElement('div');
        inner.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;padding:0.75rem;';
        pane.appendChild(inner);

        const toInput = new uiInput({
            template: 'inline-label', label: 'To', size: 'sm',
            placeholder: 'Select a card...', parent: inner
        });

        const subjectInput = new uiInput({
            template: 'inline-label', label: 'Subject', size: 'sm',
            placeholder: 'Subject line', parent: inner
        });

        // Template selector
        const tplWrap = document.createElement('div');
        inner.appendChild(tplWrap);

        const tplLabel = document.createElement('label');
        tplLabel.style.cssText = 'font-size:0.75rem;font-weight:500;display:block;margin-bottom:2px;';
        tplLabel.textContent = 'Template';
        tplWrap.appendChild(tplLabel);

        const tplSelect = document.createElement('select');
        tplSelect.className = 'ui-input';
        tplSelect.style.cssText = 'width:100%;font-size:0.8rem;padding:5px 6px;';
        tplWrap.appendChild(tplSelect);

        function rebuildOptions() {
            tplSelect.innerHTML = '';
            const customOpt = document.createElement('option');
            customOpt.value = '';
            customOpt.textContent = 'Custom';
            tplSelect.appendChild(customOpt);

            service.getTemplates(category).forEach(tpl => {
                const o = document.createElement('option');
                o.value = tpl.idx;
                o.textContent = tpl.get('name');
                tplSelect.appendChild(o);
            });
        }
        rebuildOptions();

        // Body
        const bodyWrap = document.createElement('div');
        bodyWrap.style.cssText = 'flex:1;display:flex;flex-direction:column;';
        inner.appendChild(bodyWrap);

        const bodyLabel = document.createElement('label');
        bodyLabel.style.cssText = 'font-size:0.75rem;font-weight:500;display:block;margin-bottom:2px;';
        bodyLabel.textContent = 'Body';
        bodyWrap.appendChild(bodyLabel);

        const bodyArea = document.createElement('textarea');
        bodyArea.className = 'ui-input';
        bodyArea.style.cssText = 'width:100%;flex:1;min-height:120px;resize:vertical;font-size:0.8rem;';
        bodyArea.placeholder = 'Select a card to compose...';
        bodyWrap.appendChild(bodyArea);

        // Send row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
        inner.appendChild(btnRow);

        new uiButton({
            label: 'Send', variant: 'primary', size: 'sm', parent: btnRow,
            onClick: async () => {
                const to = (toInput.el.querySelector('input') || toInput.el).value.trim();
                const subject = (subjectInput.el.querySelector('input') || subjectInput.el).value.trim();
                const body = bodyArea.value.trim();

                if (!to || !subject) {
                    statusBadge.update({ label: 'Fill in To and Subject', color: 'warning' });
                    return;
                }
                try {
                    statusBadge.update({ label: 'Sending...', color: 'warning' });
                    await sendFn(to, subject, body);
                    statusBadge.update({ label: `Sent to ${to}`, color: 'success' });
                } catch (e) {
                    statusBadge.update({ label: `Failed: ${e.message}`, color: 'danger' });
                }
            }
        });

        const statusBadge = new uiBadge({ label: 'No selection', color: 'gray', size: 'sm', parent: btnRow });

        // Apply selected template
        function applyTemplate() {
            if (!state.entity) return;
            const idx = parseInt(tplSelect.value);
            if (!idx) { bodyArea.value = ''; return; }

            const variables = variableBuilder(state.entity);
            const rendered = service.renderTemplate(idx, variables);
            if (rendered) {
                bodyArea.value = rendered.body;
                if (rendered.subject) {
                    (subjectInput.el.querySelector('input') || subjectInput.el).value = rendered.subject;
                }
            }
        }
        tplSelect.addEventListener('change', applyTemplate);

        return {
            update() {
                rebuildOptions();
                const entity = state.entity;
                if (!entity) return;

                (toInput.el.querySelector('input') || toInput.el).value = emailResolver(entity);
                const label = labelResolver ? labelResolver(entity) : '';
                statusBadge.update({ label: label ? `Selected: ${label}` : 'Selected', color: 'primary' });

                // Auto-select template matching entity category
                const matched = service.getTemplateByKey(entity.category, category);
                tplSelect.value = matched ? matched.idx : '';
                applyTemplate();
            }
        };
    }

    /** @private — Pane 2: Edit templates */
    _renderMsgTemplatesPane(pane, config) {
        const service = this;
        const { category } = config;
        const inner = document.createElement('div');
        inner.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;padding:0.75rem;';
        pane.appendChild(inner);

        // Template selector
        const selectWrap = document.createElement('div');
        inner.appendChild(selectWrap);

        const selectLabel = document.createElement('label');
        selectLabel.style.cssText = 'font-size:0.75rem;font-weight:500;display:block;margin-bottom:2px;';
        selectLabel.textContent = 'Template';
        selectWrap.appendChild(selectLabel);

        const tplSelect = document.createElement('select');
        tplSelect.className = 'ui-input';
        tplSelect.style.cssText = 'width:100%;font-size:0.8rem;padding:5px 6px;';
        selectWrap.appendChild(tplSelect);

        function rebuildOptions() {
            tplSelect.innerHTML = '';
            const def = document.createElement('option');
            def.value = '';
            def.textContent = '— Select —';
            tplSelect.appendChild(def);

            service.getTemplates(category).forEach(tpl => {
                const o = document.createElement('option');
                o.value = tpl.idx;
                o.textContent = tpl.get('name');
                tplSelect.appendChild(o);
            });
        }
        rebuildOptions();

        // Edit fields
        const nameInput = new uiInput({ template: 'inline-label', label: 'Name', size: 'sm', parent: inner });
        const keyInput  = new uiInput({ template: 'inline-label', label: 'Key', size: 'sm', parent: inner });
        const subInput  = new uiInput({ template: 'inline-label', label: 'Subject', size: 'sm', parent: inner });

        const bodyWrap = document.createElement('div');
        inner.appendChild(bodyWrap);

        const bodyLabel = document.createElement('label');
        bodyLabel.style.cssText = 'font-size:0.75rem;font-weight:500;display:block;margin-bottom:2px;';
        bodyLabel.textContent = 'Body';
        bodyWrap.appendChild(bodyLabel);

        const bodyArea = document.createElement('textarea');
        bodyArea.className = 'ui-input';
        bodyArea.style.cssText = 'width:100%;min-height:100px;resize:vertical;font-size:0.8rem;';
        bodyWrap.appendChild(bodyArea);

        // Variables reference
        const varsRef = document.createElement('div');
        varsRef.style.cssText = 'font-size:0.65rem;color:var(--ui-gray-400);margin-top:0.15rem;';
        bodyWrap.appendChild(varsRef);

        // Save row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
        inner.appendChild(btnRow);

        new uiButton({
            label: 'Save', variant: 'primary', size: 'sm', parent: btnRow,
            onClick: () => {
                const idx = parseInt(tplSelect.value);
                if (!idx) {
                    statusBadge.update({ label: 'Select a template first', color: 'warning' });
                    return;
                }

                service.updateTemplate(idx, {
                    name:    (nameInput.el.querySelector('input') || nameInput.el).value.trim(),
                    key:     (keyInput.el.querySelector('input') || keyInput.el).value.trim(),
                    subject: (subInput.el.querySelector('input') || subInput.el).value.trim(),
                    body:    bodyArea.value
                });

                statusBadge.update({ label: 'Saved', color: 'success' });
                rebuildOptions();
                tplSelect.value = idx;
            }
        });

        const statusEl = document.createElement('span');
        statusEl.style.cssText = 'font-size:0.75rem;color:var(--ui-gray-400);';
        btnRow.appendChild(statusEl);
        const statusBadge = {
            update({ label, color }) {
                statusEl.textContent = label || '';
                const colors = { success: 'var(--ui-green-600)', warning: 'var(--ui-yellow-600)', danger: 'var(--ui-red-600)' };
                statusEl.style.color = colors[color] || 'var(--ui-gray-400)';
            }
        };

        // Load template on select
        tplSelect.addEventListener('change', () => {
            const idx = parseInt(tplSelect.value);
            if (!idx) return;

            const tpl = service.getTemplate(idx);
            if (!tpl) return;

            (nameInput.el.querySelector('input') || nameInput.el).value = tpl.get('name') || '';
            (keyInput.el.querySelector('input') || keyInput.el).value  = tpl.get('key') || '';
            (subInput.el.querySelector('input') || subInput.el).value  = tpl.get('subject') || '';
            bodyArea.value = tpl.get('body') || '';

            const vars = tpl.get('variables');
            varsRef.textContent = vars && vars.length
                ? 'Variables: ' + vars.map(v => `{${v}}`).join(', ')
                : '';

            statusBadge.update({ label: '', color: 'gray' });
        });
    }

    /** @private — Pane 3: Batch message all entities */
    _renderMsgBatchPane(pane, config, state) {
        const service = this;
        const { category, variableBuilder, sendFn, emailResolver } = config;
        const inner = document.createElement('div');
        inner.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;padding:0.75rem;';
        pane.appendChild(inner);

        const summaryEl = document.createElement('div');
        inner.appendChild(summaryEl);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
        inner.appendChild(btnRow);

        let confirmPending = false;

        const sendBtn = new uiButton({
            label: 'Send All', variant: 'primary', size: 'sm', parent: btnRow,
            onClick: async () => {
                if (!state.entities.length) return;

                if (!confirmPending) {
                    // First click: ask for confirmation
                    const matchCount = state.entities.filter(e =>
                        service.getTemplateByKey(e.category, category)
                    ).length;
                    sendBtn.update({ label: `Confirm Send ${matchCount}?`, variant: 'danger' });
                    confirmPending = true;
                    return;
                }

                // Second click: execute
                confirmPending = false;
                sendBtn.update({ label: 'Send All', variant: 'primary' });

                let sent = 0, skipped = 0, failed = 0;
                const total = state.entities.length;

                for (const entity of state.entities) {
                    const tpl = service.getTemplateByKey(entity.category, category);
                    if (!tpl) { skipped++; continue; }

                    const variables = variableBuilder(entity);
                    const rendered = service.renderTemplate(tpl.idx, variables);
                    if (!rendered) { skipped++; continue; }

                    const email = emailResolver(entity);
                    try {
                        await sendFn(email, rendered.subject, rendered.body);
                        sent++;
                    } catch (e) {
                        failed++;
                    }
                    statusBadge.update({
                        label: `${sent + failed + skipped}/${total}...`,
                        color: 'warning'
                    });
                }

                statusBadge.update({
                    label: `Done: ${sent} sent, ${skipped} skipped, ${failed} failed`,
                    color: failed > 0 ? 'warning' : 'success'
                });
            }
        });

        const statusBadge = new uiBadge({ label: 'No data', color: 'gray', size: 'sm', parent: btnRow });

        function update() {
            summaryEl.innerHTML = '';
            confirmPending = false;
            sendBtn.update({ label: 'Send All', variant: 'primary' });

            const entities = state.entities;
            if (!entities.length) {
                statusBadge.update({ label: 'No data', color: 'gray' });
                return;
            }

            // Group by category
            const groups = {};
            entities.forEach(e => {
                const cat = e.category || 'uncategorized';
                if (!groups[cat]) groups[cat] = { count: 0, template: null };
                groups[cat].count++;
                if (!groups[cat].template) {
                    groups[cat].template = service.getTemplateByKey(cat, category);
                }
            });

            let matchedCount = 0;
            const catColors = config.categoryColors || {};

            Object.entries(groups).forEach(([cat, info]) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:0.3rem;margin-bottom:0.25rem;';
                summaryEl.appendChild(row);

                new uiBadge({ label: cat, color: catColors[cat] || 'gray', size: 'xs', parent: row });

                const detail = document.createElement('span');
                detail.style.cssText = 'font-size:0.75rem;color:var(--ui-gray-500);';
                if (info.template) {
                    detail.textContent = `${info.count} → "${info.template.get('name')}"`;
                    matchedCount += info.count;
                } else {
                    detail.textContent = `${info.count} — no matching template`;
                }
                row.appendChild(detail);
            });

            statusBadge.update({
                label: `${matchedCount} of ${entities.length} will be messaged`,
                color: 'primary'
            });
        }

        return { update };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMAIL INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Configure email transport
     * @param {Object} config
     * @param {Function} config.transport - async (action, params) => result
     * @param {string} [config.defaultFrom] - Default from address
     */
    configureEmail(config) {
        this._emailTransport = config.transport;
        this._emailFrom = config.defaultFrom || null;
    }

    /**
     * Get or create an email conversation for a recipient address
     * @param {string} address - Email address
     * @returns {Publon}
     */
    getEmailConversation(address) {
        const existing = this.table('conversation').all().find(c =>
            c.get('type') === 'email' && c.get('name') === address
        );
        if (existing) return existing;

        return this.createConversation({
            name: address,
            type: 'email',
            visibility: 'private',
            metadata: { emailAddress: address }
        });
    }

    /**
     * Send an email via the configured transport
     * Records the message in the service regardless of transport success.
     * @param {Object} params
     * @param {string} params.to - Recipient address
     * @param {string} params.subject - Subject line
     * @param {string} params.html - Body (HTML)
     * @param {string} [params.from] - From address override
     * @param {number} [senderId] - Sender member idx
     * @returns {Object} { message, transportResult }
     */
    async sendEmail({ to, subject, html, from }, senderId) {
        const conv = this.getEmailConversation(to);
        const content = `**${subject}**\n\n${html}`;

        const message = this.sendMessage(conv.idx, content, senderId, {
            contentType: 'html',
            messageType: 'message'
        });

        // Store email metadata on the message
        message.set('metadata', { to, subject, from: from || this._emailFrom });

        let transportResult = null;
        if (this._emailTransport) {
            transportResult = await this._emailTransport('sendMail', {
                to, subject, html,
                from: from || this._emailFrom
            });
        }

        return { message, transportResult };
    }

    /**
     * Load sent email log from transport into the service
     * @returns {Array<Object>} parsed entries
     */
    async loadEmailLog() {
        if (!this._emailTransport) return [];

        const res = await this._emailTransport('readSentMail', {});

        // Parse transport response into entries
        let entries = [];
        if (Array.isArray(res)) entries = res;
        else if (res && Array.isArray(res.data)) entries = res.data;
        else if (res && Array.isArray(res.entries)) entries = res.entries;

        // Import entries that aren't already in the service
        const imported = [];
        entries.forEach(entry => {
            let msg = entry;
            if (typeof entry.message === 'string') {
                try { msg = JSON.parse(entry.message); } catch (_) { msg = entry; }
            } else if (typeof entry.message === 'object' && entry.message) {
                msg = entry.message;
            }

            const to = msg.to || entry.to || '';
            const subject = msg.subject || entry.subject || '';
            const time = entry.timestamp || entry.time || entry.createdAt || '';

            if (to) {
                imported.push({ time, to, subject });
            }
        });

        return imported;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SEED DATA
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Load default seed data
     */

    // ─────────────────────────────────────────────────────────────────────────
    // API Binding
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Connect to a REST API for data synchronization.
     * Wires ApiBinding on all tables so CRUD operations sync to the server.
     *
     * @param {Object} config - API configuration
     * @param {string} config.apiUrl - Base API URL (e.g. 'https://api.example.com')
     * @param {string} [config.apiToken] - Authentication token
     * @param {string} [config.apiEndpoint='/api/v1/messages'] - Base endpoint path
     * @returns {Object} Map of table name → ApiBinding instance
     */
    connectApi(config = {}) {
        if (!config.apiUrl) throw new Error('apiUrl is required');
        const baseEndpoint = config.apiEndpoint || '/api/v1/messages';
        const bindings = {};

        ['conversation', 'message', 'messageAttachment', 'messageReaction', 'messageTemplate'].forEach(tableName => {
            bindings[tableName] = new ApiBinding(this.table(tableName), {
                apiUrl: config.apiUrl,
                endpoint: `${baseEndpoint}/${tableName}`,
                apiToken: config.apiToken
            });
        });

        return bindings;
    }

    seedDefaults() {
        const conversations = this.table('conversation');

        if (conversations.all().length === 0) {
            // Create a general channel
            const general = this.createConversation({
                name: 'General',
                type: 'channel',
                visibility: 'team',
                participants: [1, 2, 3]
            }, 1);

            // Add some messages
            this.sendMessage(general.idx, 'Welcome to the general channel! 👋', 1);
            this.sendMessage(general.idx, 'Thanks! Excited to be here.', 2);
            this.sendMessage(general.idx, 'Let\'s get started on the project.', 1);

            // Create a DM
            const dm = this.createDirectConversation(1, 2);
            this.sendMessage(dm.idx, 'Hey, do you have a minute?', 1);
            this.sendMessage(dm.idx, 'Sure, what\'s up?', 2);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Binding Registry & Capability Discovery
    // ─────────────────────────────────────────────────────────────────────────

    getBindingRegistry() {
        const svc = this;
        return [
            {
                key: 'chat',
                label: 'Chat',
                description: 'Interactive chat interface showing messages in a conversation with send input.',
                type: 'specialized',
                tables: ['conversation', 'message'],
                methods: ['getConversationMessages'],
                tags: ['messaging', 'chat', 'real-time'],
                intent: 'Send and view messages in a conversation',
                builder: (svc, container) => {
                    const members = {};
                    if (typeof ServiceRegistry !== 'undefined' && ServiceRegistry.has('member')) {
                        ServiceRegistry.get('member').table('member').all().forEach(m => { members[m.idx] = m.get('firstName') || m.get('username') || m.get('displayName'); });
                    }
                    const msgs = svc.getConversationMessages(1);
                    const messages = msgs.map(m => ({ content: m.get('content'), sender: members[m.get('senderId')] || 'User ' + m.get('senderId'), time: m.get('createdAt') ? new Date(m.get('createdAt')).toLocaleTimeString() : '', isOwn: m.get('senderId') === 1 }));
                    new uiChat({ parent: container, messages, showInput: true });
                }
            },
            {
                key: 'conversations',
                label: 'Conversations',
                description: 'Browsable collection of all conversations with selection and CRUD.',
                type: 'collection',
                tables: ['conversation'],
                methods: ['bindSelectEditor'],
                tags: ['browse', 'conversations', 'crud'],
                intent: 'Browse, create, and manage conversations',
                builder: null
            }
        ];
    }

    getCapabilities() {
        return {
            name: 'messages',
            alias: 'Messages Service',
            icon: 'fa-comments',
            intent: 'Real-time messaging, conversations, channels, templates, and email integration.',
            keywords: ['messages', 'chat', 'conversations', 'channels', 'email', 'templates', 'notifications'],
            capabilities: ['messaging', 'conversations', 'threads', 'reactions', 'attachments', 'read-receipts', 'search', 'templates', 'email-integration', 'messaging-panel'],
            useCases: [
                'Send and receive messages in conversations',
                'Create group channels and direct messages',
                'Manage message templates with variable substitution',
                'Send batch emails via configured transport',
                'Track read receipts and unread counts',
                'Render messaging panel with template selection'
            ],
            consumers: [],
            domainMethods: [
                { name: 'createConversation', signature: '(data, createdBy)', description: 'Create a conversation (direct, group, channel, support, email)' },
                { name: 'createDirectConversation', signature: '(memberId1, memberId2)', description: 'Create or retrieve a DM between two members' },
                { name: 'getDirectConversation', signature: '(memberId1, memberId2)', description: 'Get existing DM between two members' },
                { name: 'getConversation', signature: '(conversationId)', description: 'Get conversation by ID' },
                { name: 'getMemberConversations', signature: '(memberId, options)', description: 'Get conversations for a member, sorted by last activity' },
                { name: 'addParticipant', signature: '(conversationId, memberId)', description: 'Add member to a conversation' },
                { name: 'removeParticipant', signature: '(conversationId, memberId)', description: 'Remove member from a conversation' },
                { name: 'isParticipant', signature: '(conversationId, memberId)', description: 'Check if member is in a conversation' },
                { name: 'archiveConversation', signature: '(conversationId)', description: 'Archive a conversation' },
                { name: 'unarchiveConversation', signature: '(conversationId)', description: 'Unarchive a conversation' },
                { name: 'deleteConversation', signature: '(conversationId)', description: 'Delete conversation and all messages' },
                { name: 'sendMessage', signature: '(conversationId, content, senderId, options)', description: 'Send a message with mention extraction' },
                { name: 'sendSystemMessage', signature: '(conversationId, content)', description: 'Send a system message' },
                { name: 'getMessage', signature: '(messageId)', description: 'Get message by ID' },
                { name: 'getConversationMessages', signature: '(conversationId, options)', description: 'Get messages for a conversation with pagination' },
                { name: 'getThread', signature: '(messageId)', description: 'Get replies to a message' },
                { name: 'editMessage', signature: '(messageId, newContent, editorId)', description: 'Edit a message (owner only)' },
                { name: 'deleteMessage', signature: '(messageId, deleterId)', description: 'Soft-delete a message' },
                { name: 'pinMessage', signature: '(messageId, memberId)', description: 'Pin a message' },
                { name: 'unpinMessage', signature: '(messageId)', description: 'Unpin a message' },
                { name: 'getPinnedMessages', signature: '(conversationId)', description: 'Get pinned messages in a conversation' },
                { name: 'markAsRead', signature: '(messageId, memberId)', description: 'Mark message as read' },
                { name: 'markConversationAsRead', signature: '(conversationId, memberId)', description: 'Mark all messages in conversation as read' },
                { name: 'getUnreadCount', signature: '(conversationId, memberId)', description: 'Get unread count for a conversation' },
                { name: 'getTotalUnreadCount', signature: '(memberId)', description: 'Get total unread count across all conversations' },
                { name: 'addAttachment', signature: '(messageId, data)', description: 'Add file attachment to a message' },
                { name: 'getMessageAttachments', signature: '(messageId)', description: 'Get attachments for a message' },
                { name: 'getConversationAttachments', signature: '(conversationId)', description: 'Get all attachments in a conversation' },
                { name: 'addReaction', signature: '(messageId, memberId, emoji)', description: 'Add emoji reaction to a message' },
                { name: 'removeReaction', signature: '(messageId, memberId, emoji)', description: 'Remove emoji reaction from a message' },
                { name: 'toggleReaction', signature: '(messageId, memberId, emoji)', description: 'Toggle emoji reaction on a message' },
                { name: 'getMessageReactions', signature: '(messageId)', description: 'Get reactions for a message' },
                { name: 'getReactionSummary', signature: '(messageId)', description: 'Get reaction summary with counts and members' },
                { name: 'searchMessages', signature: '(query, options)', description: 'Search messages by content with optional filters' },
                { name: 'createTemplate', signature: '(data, createdBy)', description: 'Create a message template' },
                { name: 'seedTemplate', signature: '(data, createdBy)', description: 'Upsert template by key+category' },
                { name: 'getTemplateByKey', signature: '(key, category)', description: 'Find template by key within a category' },
                { name: 'getTemplates', signature: '(category)', description: 'Get active templates, optionally by category' },
                { name: 'getTemplate', signature: '(idx)', description: 'Get a single template by idx' },
                { name: 'updateTemplate', signature: '(idx, data)', description: 'Update a template' },
                { name: 'renderTemplate', signature: '(idx, variables)', description: 'Render template with variable substitution' },
                { name: 'renderMessagingPanel', signature: '(container, config)', description: 'Render messaging panel with single/batch/template panes' },
                { name: 'configureEmail', signature: '(config)', description: 'Configure email transport and default from address' },
                { name: 'getEmailConversation', signature: '(address)', description: 'Get or create an email conversation for a recipient' },
                { name: 'sendEmail', signature: '({to, subject, html, from}, senderId)', description: 'Send email via configured transport' },
                { name: 'loadEmailLog', signature: '()', description: 'Load sent email log from transport' }
            ],
            bindings: this.getBindingRegistry()
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessagesService, MessagesServiceSchema };
}
