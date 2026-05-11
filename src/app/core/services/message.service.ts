import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ChatMessage, SendMessageRequest, EditMessageRequest, AttachmentInfo, MessageSearchResponse } from '../models/message.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _loading = signal(false);
  private readonly _hasMore = signal(true);

  readonly messages = this._messages.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();

  constructor(private http: HttpClient) {}

  async loadMessages(roomId: number, before?: string): Promise<void> {
    this._loading.set(true);
    try {
      const params: Record<string, string> = {};
      if (before) params['before'] = before;

      const messages = await firstValueFrom(
        this.http.get<ChatMessage[]>(`${environment.apiUrl}/rooms/${roomId}/messages`, { params }),
      );

      if (!before) {
        // Initial load — merge with any messages received via SignalR in the meantime
        const newMsgs = [...messages].reverse();
        this._messages.update(current => {
          const existingIds = new Set(current.map(m => m.id));
          const filteredNew = newMsgs.filter(m => !existingIds.has(m.id));
          return [...current, ...filteredNew].sort((a, b) => 
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
        });
      } else {
        // Pagination — prepend older messages
        const olderMsgs = [...messages].reverse();
        this._messages.update((current) => {
          const existingIds = new Set(current.map(m => m.id));
          const filteredOlder = olderMsgs.filter(m => !existingIds.has(m.id));
          return [...filteredOlder, ...current];
        });
      }

      this._hasMore.set(messages.length === 50);
    } finally {
      this._loading.set(false);
    }
  }

  async sendMessage(roomId: number, request: SendMessageRequest): Promise<ChatMessage> {
    const message = await firstValueFrom(
      this.http.post<ChatMessage>(`${environment.apiUrl}/rooms/${roomId}/messages`, request),
    );
    return message;
  }

  async editMessage(messageId: number, request: EditMessageRequest): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/messages/${messageId}`, request),
    );
  }

  addAttachmentToMessage(messageId: number, attachment: AttachmentInfo): void {
    this._messages.update((msgs) => {
      return msgs.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            attachments: [...(msg.attachments || []), attachment]
          };
        }
        return msg;
      });
    });
  }

  async deleteMessage(messageId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/messages/${messageId}`),
    );
  }

  async addReaction(roomId: number, messageId: number, emoji: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/rooms/${roomId}/messages/${messageId}/reactions`, JSON.stringify(emoji), {
        headers: { 'Content-Type': 'application/json' }
      }),
    );
  }

  async removeReaction(roomId: number, messageId: number, emoji: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/rooms/${roomId}/messages/${messageId}/reactions/${emoji}`),
    );
  }

  async markAsRead(roomId: number, messageId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/rooms/${roomId}/messages/${messageId}/read`, {}),
    );
  }

  async searchMessages(roomId: number, query: string): Promise<ChatMessage[]> {
    return firstValueFrom(
      this.http.get<ChatMessage[]>(`${environment.apiUrl}/rooms/${roomId}/messages/search`, {
        params: { q: query },
      }),
    );
  }

  async getAttachments(roomId: number, type?: string, cursor?: number): Promise<AttachmentInfo[]> {
    const params: Record<string, string> = {};
    if (type) params['type'] = type;
    if (cursor) params['cursor'] = cursor.toString();

    return firstValueFrom(
      this.http.get<AttachmentInfo[]>(`${environment.apiUrl}/rooms/${roomId}/attachments`, { params }),
    );
  }

  async pinMessage(roomId: number, messageId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/rooms/${roomId}/messages/${messageId}/pin`, {}),
    );
  }

  async unpinMessage(roomId: number, messageId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/rooms/${roomId}/messages/${messageId}/pin`),
    );
  }

  async getPinnedMessages(roomId: number): Promise<ChatMessage[]> {
    return firstValueFrom(
      this.http.get<ChatMessage[]>(`${environment.apiUrl}/rooms/${roomId}/pinned`),
    );
  }

  async globalSearchMessages(query: string): Promise<MessageSearchResponse[]> {
    return firstValueFrom(
      this.http.get<MessageSearchResponse[]>(`${environment.apiUrl}/messages/search`, {
        params: { q: query },
      }),
    );
  }

  globalSearchMessages$(query: string) {
    return this.http.get<MessageSearchResponse[]>(`${environment.apiUrl}/messages/search`, {
      params: { q: query },
    });
  }

  addMessage(message: ChatMessage): void {
    this._messages.update((msgs) => {
      if (msgs.some((m) => m.id === message.id)) return msgs;
      return [...msgs, message];
    });
  }

  /** Agrega un mensaje optimista (status='sending') sin verificar ID duplicado. */
  addTempMessage(message: ChatMessage): void {
    this._messages.update((msgs) => [...msgs, message]);
  }

  /** Reemplaza el mensaje temporal por el mensaje real del servidor. */
  replaceTempMessage(tempId: string, real: ChatMessage): void {
    this._messages.update((msgs) => {
      // Si el mensaje real ya llegó por SignalR, solo eliminar el temp
      const hasReal = msgs.some((m) => m.id === real.id && !m.tempId);
      return msgs
        .filter((m) => m.tempId !== tempId)
        .concat(hasReal ? [] : [real]);
    });
  }

  /** Marca un mensaje temporal como fallido para mostrar el botón de reintento. */
  markMessageFailed(tempId: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.tempId === tempId ? { ...m, status: 'failed' as const } : m)),
    );
  }

  /** Cambia el estado de un mensaje temporal a 'sending' (para reintento). */
  markMessageRetrying(tempId: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.tempId === tempId ? { ...m, status: 'sending' as const } : m)),
    );
  }

  updateMessage(messageId: number, content: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) =>
        m.id === messageId ? { ...m, content, editedAt: new Date().toISOString() } : m,
      ),
    );
  }

  removeMessage(messageId: number): void {
    this._messages.update((msgs) =>
      msgs.map((m) =>
        m.id === messageId ? { ...m, isDeleted: true, content: null } : m,
      ),
    );
  }

  updateMessagePinned(messageId: number, isPinned: boolean): void {
    this._messages.update((msgs) =>
      msgs.map((m) =>
        m.id === messageId ? { ...m, isPinned } : m,
      ),
    );
  }

  updateMessageReactions(messageId: number, action: 'add' | 'remove', reaction: { userId: string; userName?: string; emoji: string }): void {
    this._messages.update((msgs) =>
      msgs.map((m) => {
        if (m.id !== messageId) return m;
        const current = m.reactions || [];
        let next;
        if (action === 'add') {
          if (current.some(r => r.emoji === reaction.emoji && r.userId === reaction.userId)) return m;
          next = [...current, { emoji: reaction.emoji, userId: reaction.userId, userName: reaction.userName || 'Usuario' }];
        } else {
          next = current.filter(r => !(r.emoji === reaction.emoji && r.userId === reaction.userId));
        }
        return { ...m, reactions: next };
      })
    );
  }

  clearMessages(): void {
    this._messages.set([]);
    this._hasMore.set(true);
  }
}
