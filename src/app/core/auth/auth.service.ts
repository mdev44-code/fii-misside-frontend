import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import {
  LoginRequest, RegisterRequest, TokenResponse,
  MeResponse, ApiResponse, ChangePasswordRequest
} from '../../shared/models';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'asso_access_token',
  REFRESH_TOKEN: 'asso_refresh_token',
  USER: 'asso_user',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  // Signals reactifs
  private _user = signal<MeResponse | null>(this.loadUser());
  private _accessToken = signal<string | null>(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken() && !this.isTokenExpired());
  readonly userRole = computed(() => this._user()?.role ?? null);

  // ── Helpers rôles ─────────────────────────────────────────────────────────
  readonly isAdmin      = computed(() => this.userRole() === 'admin');
  readonly isTreasurer  = computed(() => this.userRole() === 'treasurer' || this.userRole() === 'admin');
  readonly isManager    = computed(() => this.userRole() === 'manager'   || this.userRole() === 'admin');

  // ── LOGIN ──────────────────────────────────────────────────────────────────

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http.post<ApiResponse<TokenResponse>>(`${this.base}/login`, payload).pipe(
      map(r => r.data),
      tap(tokens => this.storeTokens(tokens)),
      tap(() => this.fetchMe().subscribe()),
    );
  }

  // ── REGISTER ──────────────────────────────────────────────────────────────

  register(payload: RegisterRequest): Observable<TokenResponse> {
    return this.http.post<ApiResponse<TokenResponse>>(`${this.base}/register`, payload).pipe(
      map(r => r.data),
      tap(tokens => this.storeTokens(tokens)),
      tap(() => this.fetchMe().subscribe()),
    );
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────

  logout(): void {
    const refresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (refresh) {
      this.http.post(`${this.base}/logout`, { refresh_token: refresh }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ── REFRESH ───────────────────────────────────────────────────────────────

  refreshToken(): Observable<TokenResponse> {
    const refresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refresh) return throwError(() => new Error('No refresh token'));

    return this.http.post<ApiResponse<TokenResponse>>(`${this.base}/refresh`, { refresh_token: refresh }).pipe(
      map(r => r.data),
      tap(tokens => this.storeTokens(tokens)),
      catchError(err => {
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => err);
      }),
    );
  }

  // ── ME ────────────────────────────────────────────────────────────────────

  refreshUser(): void {
    this.fetchMe().subscribe();
  }

  fetchMe(): Observable<MeResponse> {
    return this.http.get<ApiResponse<MeResponse>>(`${this.base}/me`).pipe(
      map(r => r.data),
      tap(user => {
        this._user.set(user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }),
    );
  }

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.base}/password`, payload).pipe(
      map(r => r.data)
    );
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.userRole() ?? '');
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  private storeTokens(tokens: TokenResponse): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    this._accessToken.set(tokens.access_token);
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    this._user.set(null);
    this._accessToken.set(null);
  }

  private loadUser(): MeResponse | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  }

  private isTokenExpired(): boolean {
    const token = this._accessToken();
    if (!token) return true;
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
