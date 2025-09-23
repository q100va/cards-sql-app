// src/app/interceptors/auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse,
} from '@angular/common/http';
import { Observable, ReplaySubject, throwError } from 'rxjs';
import { catchError, finalize, switchMap, filter, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly signIn = inject(AuthService);

  private refreshInProgress = false;
  private refresh$ = new ReplaySubject<boolean>(1);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 1) Auth-роуты не трогаем (ни bearer, ни ретраи)
    if (this.isAuthRoute(req.url) || !this.isApiCall(req.url)) {
      return next.handle(req);
    }

    // 2) Подкладываем токен, если есть
    const token = this.signIn.getToken();
    //console.log('token', token)
    const authedReq = token ? this.withAuth(req, token) : req;

    return next.handle(authedReq).pipe(
      catchError((err: unknown) => {
        if (!this.isAuthError(err)) return throwError(() => err);
        // не рефрешим для самих auth-роутов (на всякий случай)
        if (this.isAuthRoute(req.url)) return throwError(() => err);

        return this.handleAuthError(authedReq, next);
      })
    );
  }

  // ==== helpers ====

  private isApiCall(url: string): boolean {
    // поддержка абсолютного и относительного '/api/...'
    return url.startsWith(environment.apiUrl) || url.startsWith('/api/');
  }

  private isAuthRoute(url: string): boolean {
    try {
      const base = environment.apiUrl;
      const u = url.startsWith('http') ? new URL(url) : new URL(url, base);
      const p = u.pathname;
      return p === '/api/session/sign-in'
          || p === '/api/session/refresh'
          || p === '/api/session/sign-out';
    } catch {
      return false;
    }
  }

  private withAuth<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isAuthError(err: unknown): boolean {
  return err instanceof HttpErrorResponse && err.status === 401; // только 401!
}

  private handleAuthError(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Если рефреш уже идёт — ждём результат
    if (this.refreshInProgress) {
      return this.refresh$.pipe(
        filter(Boolean),
        take(1),
        switchMap(() => {
          const t = this.signIn.getToken();
          const retried = t ? this.withAuth(req, t) : req;
          return next.handle(retried);
        })
      );
    }

    // Стартуем единичный refresh
    this.refreshInProgress = true;

    return this.signIn.hydrateFromSession().pipe(
      switchMap(() => {
        this.refresh$.next(true);
        const t = this.signIn.getToken();
        const retried = t ? this.withAuth(req, t) : req;
        return next.handle(retried);
      }),
      catchError((e) => {
        // refresh провалился — выходим из сессии
        this.refresh$.next(false);
        this.refresh$.complete();
        this.signIn.logout().subscribe(); // fire-and-forget
        return throwError(() => e);
      }),
      finalize(() => {
        this.refreshInProgress = false;
        this.refresh$ = new ReplaySubject<boolean>(1); // «чистый» стрим на следующий раз
      })
    );
  }
}
