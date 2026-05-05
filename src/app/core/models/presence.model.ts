export type PresenceStatus = 1 | 2 | 3 | 4;
// 1 = Disponible  (verde)
// 2 = Ausente      (amarillo)
// 3 = No molestar  (rojo)
// 4 = Desconectado (gris)

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  customStatus: string | null;
  lastSeenAt: string;
}

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  1: 'Disponible',
  2: 'Ausente',
  3: 'No molestar',
  4: 'Desconectado',
};

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  1: '#1D9E75',
  2: '#EF9F27',
  3: '#D85A30',
  4: '#888780',
};
