export interface LoginRequest {
  claveUsuario: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  claveUsuario: string;
  nombreCompleto: string;
  token: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface UserInfo {
  userId: string;
  claveUsuario: string;
  nombreCompleto: string;
}
