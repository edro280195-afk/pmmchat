export interface Mention {
  id: number;
  messageId: number;
  chatRoomId: number;
  roomName: string;
  senderName: string;
  /** Primeros 100 caracteres del mensaje */
  messageContent: string;
  isRead: boolean;
  createdAt: string;
}
