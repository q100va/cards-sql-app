import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService, SKIP_AUTH_RECOVERY } from '../services/auth.service';
import { isClientLogTransport } from '../utils/http-diagnostics';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isApiCall(req.url)) return next.handle(req);
    const credentialed = req.clone({ withCredentials: true });
    if (this.isAuthRoute(req.url)) return next.handle(credentialed);

    const generation = this.auth.getAuthGeneration();
    const token = this.auth.getToken();
    const authenticated = token ? this.withAuth(credentialed, token) : credentialed;
    if (req.context.get(SKIP_AUTH_RECOVERY) || isClientLogTransport(req)) return next.handle(authenticated);

    return next.handle(authenticated).pipe(
      catchError((error: unknown) => {
        if (!this.isAuthError(error) || generation !== this.auth.getAuthGeneration()) {
          return throwError(() => error);
        }
        return this.recoverAndRetry(authenticated, next, error, generation);
      }),
    );
  }

  private isApiCall(url: string): boolean {
    return url.startsWith(environment.apiUrl) || url.startsWith('/api/');
  }

  private isAuthRoute(url: string): boolean {
    try {
      const path = new URL(url, environment.apiUrl).pathname;
      return path === '/api/session/sign-in'
        || path === '/api/session/refresh'
        || path === '/api/session/sign-out';
    } catch {
      return false;
    }
  }

  private withAuth<T>(req: HttpRequest<T>, token: string): HttpRequest<T> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isAuthError(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  private recoverAndRetry(
    req: HttpRequest<unknown>, next: HttpHandler, originalError: HttpErrorResponse, generation: number,
  ): Observable<HttpEvent<unknown>> {
    return this.auth.recoverSession().pipe(
      // Keep recovery's error boundary before the retried business request.
      catchError((error: unknown) => {
        this.logoutIfCurrent(generation);
        return throwError(() => error);
      }),
      switchMap(() => {
        const token = this.auth.getToken();
        if (generation !== this.auth.getAuthGeneration() || !token) {
          this.logoutIfCurrent(generation);
          return throwError(() => originalError);
        }
        return next.handle(this.withAuth(req, token)).pipe(
          tap({ error: (error: unknown) => {
            if (this.isAuthError(error)) this.logoutIfCurrent(generation);
          } }),
        );
      }),
    );
  }

  private logoutIfCurrent(generation: number): void {
    if (generation === this.auth.getAuthGeneration()) this.auth.logout().subscribe();
  }
}
