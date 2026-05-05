import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MessageService } from './message.service';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageService],
    });

    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signals', () => {
    it('should have empty messages by default', () => {
      expect(service.messages()).toEqual([]);
    });

    it('should have loading false by default', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have hasMore true by default', () => {
      expect(service.hasMore()).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('should add message to the list', () => {
      const newMessage = {
        id: 1,
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Hello',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sent' as const,
      };

      service.addMessage(newMessage);

      expect(service.messages().length).toBe(1);
      expect(service.messages()[0].id).toBe(1);
    });

    it('should not add duplicate messages', () => {
      const msg = {
        id: 1,
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Hello',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sent' as const,
      };

      service.addMessage(msg);
      service.addMessage(msg);

      expect(service.messages().length).toBe(1);
    });
  });

  describe('addTempMessage', () => {
    it('should add temporary message with tempId', () => {
      const tempMsg = {
        id: 0,
        tempId: 'temp-123',
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Sending...',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sending' as const,
      };

      service.addTempMessage(tempMsg);

      const found = service.messages().find((m) => m.tempId === 'temp-123');
      expect(found).toBeTruthy();
    });
  });

  describe('updateMessage', () => {
    it('should update message content', () => {
      const msg = {
        id: 1,
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Original',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sent' as const,
      };
      service.addMessage(msg);

      service.updateMessage(1, 'Updated');

      const updated = service.messages().find((m) => m.id === 1);
      expect(updated?.content).toBe('Updated');
      expect(updated?.editedAt).toBeTruthy();
    });
  });

  describe('removeMessage', () => {
    it('should mark message as deleted', () => {
      const msg = {
        id: 1,
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Hello',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sent' as const,
      };
      service.addMessage(msg);

      service.removeMessage(1);

      const deleted = service.messages().find((m) => m.id === 1);
      expect(deleted?.isDeleted).toBe(true);
    });
  });

  describe('updateMessagePinned', () => {
    it('should update isPinned flag', () => {
      const msg = {
        id: 1,
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Hello',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sent' as const,
      };
      service.addMessage(msg);

      service.updateMessagePinned(1, true);

      const pinned = service.messages().find((m) => m.id === 1);
      expect(pinned?.isPinned).toBe(true);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages and reset hasMore', () => {
      const msg = {
        id: 1,
        senderId: 'user-1',
        senderName: 'Test',
        content: 'Hello',
        sentAt: '2024-01-01T00:00:00Z',
        editedAt: null,
        replyToMessageId: null,
        isDeleted: false,
        isPinned: false,
        pinnedAt: null,
        pinnedByUserId: null,
        attachments: [],
        reactions: [],
        status: 'sent' as const,
      };
      service.addMessage(msg);

      service.clearMessages();

      expect(service.messages().length).toBe(0);
      expect(service.hasMore()).toBe(true);
    });
  });
});