// src/app/services/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  tap,
  switchMap,
  catchError,
  map,
  finalize,
  filter,
  take,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { ClientLoggerService } from './client-logger.service';
import {
  signInRespSchema,
  refreshRespSchema,
  userSchema,
  AuthUser,
  Permission,
  permissionRespSchema,
} from '@shared/schemas/auth.schema';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { validateResponse } from '../utils/validate-response';

export type OperationCode = string;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private rawHttp = new HttpClient(inject(HttpBackend)); // без интерсепторов
  private router = inject(Router);
  private log = inject(ClientLoggerService);

  private token = '';
  getToken() {
    return this.token;
  }
  setToken(t: string) {
    this.token = t ?? '';
  }

  private user$ = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this.user$.asObservable();
  permissions$ = signal<ReadonlyMap<OperationCode, Permission>>(new Map());

  //ready$ = new BehaviorSubject<boolean>(false);
  authReady$ = new BehaviorSubject<boolean>(false); // токен + /me готовы
  permsReady$ = new BehaviorSubject<boolean>(false); // разрешения загружены
  /*   get readyOnce$() {
    return this.ready$.pipe(filter(Boolean), take(1));
  } */
  get authReadyOnce$() {
    return this.authReady$.pipe(filter(Boolean), take(1));
  }
  get permsReadyOnce$() {
    return this.permsReady$.pipe(filter(Boolean), take(1));
  }

  private resetAuthState() {
    this.setToken('');
    this.user$.next(null);
    this.setPermissions([]);
    this.permsReady$.next(false); // прав нет
    this.authReady$.next(false); // не готов
  }

  private setPermissions(list: Permission[]) {
    console.log('setPermissions');
    const map = new Map<OperationCode, Permission>();
    for (const p of list) map.set(p.operation, p);
    this.permissions$.set(map);
      console.log(this.permissions$());
  }

  private loadPermissions$() {
    console.log('loadPermissions$');
    return this.http
      .get<RawApiResponse>(`${environment.apiUrl}/api/auth/permissions`, {
        withCredentials: true,
      })
      .pipe(
        validateResponse(permissionRespSchema),
        tap((res) => this.setPermissions(res.data)),
        tap(() => this.permsReady$.next(true)),
        map(() => void 0),
        catchError(() => {
          this.setPermissions([]);
          this.permsReady$.next(true); // даже при ошибке считаем «готовы» (просто пусто)
          return of(void 0);
        })
      );
  }

  logIn(userName: string, password: string): Observable<void> {
    const url = `${environment.apiUrl}/api/session/sign-in`;
    return this.http
      .post<RawApiResponse>(
        url,
        { userName, password },
        { withCredentials: true }
      )
      .pipe(
        validateResponse(signInRespSchema),
        tap((res) => {
          this.setToken(res.data.token);
          this.user$.next(res.data.user);
          this.log.setUser(res.data.user.id);
          this.authReady$.next(true);
        }),
        switchMap(() => this.loadPermissions$()),
        map(() => void 0)
      );
  }

  hydrateFromSession(): Observable<void> {
    return this.rawHttp
      .post<RawApiResponse>(`${environment.apiUrl}/api/session/refresh`, null, {
        withCredentials: true,
      })
      .pipe(
        validateResponse(refreshRespSchema),
        tap((res) => this.setToken(res.data.accessToken)),
        switchMap(() =>
          this.http.get<RawApiResponse>(
            `${environment.apiUrl}/api/session/me`,
            { withCredentials: true }
          )
        ),
        validateResponse(userSchema),
        tap((res) => {
          this.user$.next(res.data);
          this.authReady$.next(true); // ✅ можно рендерить Shell
        }),
        tap(() => this.loadPermissions$().subscribe()),
        map(() => void 0),
        catchError(() => {
          this.resetAuthState();
          // всё равно разрешаем загрузиться (гостевой режим)
          this.authReady$.next(true);
          this.permsReady$.next(true);
          return of(void 0);
        })
      );
  }

  fetchPermissions() {
    return this.loadPermissions$().subscribe();
  }

  has(op: OperationCode) {
    console.log(this.permissions$());
    return !!this.permissions$().get(op)?.access;
  }

  getCurrentUserSnapshot(): AuthUser | null {
    return this.user$.getValue?.() ?? null;
  }

  // 🔹 ВЫХОД: дергаем /sign-out, затем локально чистим состояние и редиректим
  logout(): Observable<void> {
    const url = `${environment.apiUrl}/api/session/sign-out`;
    return this.rawHttp
      .post<ApiResponse<null>>(url, null, { withCredentials: true })
      .pipe(
        catchError(() => of(void 0)), // даже если сервер вернул 4xx/5xx — локально всё равно выходим
        finalize(() => {
          this.resetAuthState();
          this.router.navigate(['/session/sign-in']);
        }),
        map(() => void 0)
      );
  }
}
