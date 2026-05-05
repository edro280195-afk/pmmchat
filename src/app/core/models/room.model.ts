export interface SidebarRoom {
  id: number;
  name: string | null;
  type: number; // 1=Directo, 2=Grupo
  lastMessageAt: string | null;
  role: number; // 1=Admin, 2=Miembro
  lastViewedAt: string | null;
  directChatPartnerName: string | null;
  directChatPartnerId: string | null;
  unreadCount: number;
  lastMessagePreview?: string | null;
  lastSenderName?: string | null;
  lastSenderId?: string | null;
}

export interface CreateRoomRequest {
  name?: string;
  type: number;
  participantIds: string[];
}

export interface Participant {
  userId: string;
  claveUsuario: string;
  nombreCompleto: string;
  email: string | null;
  oficina: string | null;
  role: number;
  joinedAt: string;
  lastViewedAt: string | null;
}
