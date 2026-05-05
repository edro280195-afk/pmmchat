import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, UserInfo } from '../models/user.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'pmmchat_token';
  private readonly REFRESH_KEY = 'pmmchat_refresh';
  private readonly USER_KEY = 'pmmchat_user';

  private readonly tabId = crypto.randomUUID();
  private readonly channel = new BroadcastChannel('pmmchat_session');

  private readonly _user = signal<UserInfo | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly sessionDisplaced = signal(false);

  // Flag para evitar múltiples refresh simultáneos
  private refreshPromise: Promise<AuthResponse> | null = null;

  constructor(private http: HttpClient, private router: Router) {
    this.channel.onmessage = (event) => {
      if (event.data?.type === 'SESSION_CLAIMED' && event.data.tabId !== this.tabId) {
        if (this.isAuthenticated()) {
          this.sessionDisplaced.set(true);
        }
      }
    };
  }

  claimSession(): void {
    this.sessionDisplaced.set(false);
    this.channel.postMessage({ type: 'SESSION_CLAIMED', tabId: this.tabId });
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request),
    );
    this.storeSession(response);
    return response;
  }

  async refresh(): Promise<AuthResponse> {
    // Si ya hay un refresh en vuelo, reutilizarlo para no duplicar llamadas
    if (this.refreshPromise) return this.refreshPromise;

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    this.refreshPromise = firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
    ).then(response => {
      this.storeSession(response);
      this.refreshPromise = null;
      return response;
    }).catch(err => {
      this.refreshPromise = null;
      this.logout();
      throw err;
    });

    return this.refreshPromise;
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      // Fire-and-forget: revocar el refresh token en el servidor
      firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken })
      ).catch(() => { /* ignorar errores de logout */ });
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
    const userInfo: UserInfo = {
      userId: response.userId,
      claveUsuario: response.claveUsuario,
      nombreCompleto: response.nombreCompleto,
    };
    localStorage.setItem(this.USER_KEY, JSON.stringify(userInfo));
    this._user.set(userInfo);
  }

  private loadUser(): UserInfo | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
