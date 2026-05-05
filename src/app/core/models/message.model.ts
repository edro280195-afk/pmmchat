export interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  content: string | null;
  sentAt: string;
  editedAt: string | null;
  replyToMessageId: number | null;
  isDeleted: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
  pinnedByUserId: string | null;
  attachments: AttachmentInfo[];
  reactions?: MessageReaction[];
  /** Solo en mensajes optimistas del cliente, nunca viene del servidor */
  tempId?: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface MessageSearchResponse extends ChatMessage {
  chatRoomId: number;
  roomName: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface SendMessageRequest {
  content: string;
  replyToMessageId?: number | null;
  attachmentIds?: number[];
}

export interface EditMessageRequest {
  content: string;
}

export interface AttachmentInfo {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
}
