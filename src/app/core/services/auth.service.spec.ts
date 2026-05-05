import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        AuthService,
        { provide: Router, useValue: { navigate: () => {} } },
      ],
    });

    service = TestBed.inject(AuthService);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getToken', () => {
    it('should return null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return stored token', () => {
      sessionStorage.setItem('pmmchat_token', 'stored-token');
      expect(service.getToken()).toBe('stored-token');
    });
  });

  describe('getRefreshToken', () => {
    it('should return null when no refresh token is stored', () => {
      expect(service.getRefreshToken()).toBeNull();
    });

    it('should return stored refresh token', () => {
      sessionStorage.setItem('pmmchat_refresh', 'stored-refresh-token');
      expect(service.getRefreshToken()).toBe('stored-refresh-token');
    });
  });

  describe('user', () => {
    it('should return null user when no session exists', () => {
      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return user when session exists', () => {
      const storedUser = {
        userId: 'stored-user',
        claveUsuario: 'PMM999',
        nombreCompleto: 'Usuario Guardado',
      };
      sessionStorage.setItem('pmmchat_user', JSON.stringify(storedUser));
      sessionStorage.setItem('pmmchat_token', 'some-token');

      const newService = new AuthService(
        TestBed.inject(HttpClient),
        TestBed.inject(Router)
      );
      expect(newService.user()?.userId).toBe('stored-user');
      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should handle invalid JSON in sessionStorage', () => {
      sessionStorage.setItem('pmmchat_user', 'invalid-json');
      sessionStorage.setItem('pmmchat_token', 'some-token');

      const newService = new AuthService(
        TestBed.inject(HttpClient),
        TestBed.inject(Router)
      );
      expect(newService.user()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear session storage', () => {
      sessionStorage.setItem('pmmchat_token', 'some-token');
      sessionStorage.setItem('pmmchat_refresh', 'some-refresh');
      sessionStorage.setItem('pmmchat_user', JSON.stringify({ userId: '123' }));

      service.logout();

      expect(sessionStorage.getItem('pmmchat_token')).toBeNull();
      expect(sessionStorage.getItem('pmmchat_refresh')).toBeNull();
      expect(service.user()).toBeNull();
    });
  });
});