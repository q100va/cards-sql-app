import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, EMPTY, Observable, Subject, Subscription, defer, of, throwError } from 'rxjs';
import { catchError, filter, finalize, map, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ClientLoggerService } from './client-logger.service';
import {
  signInRespSchema, refreshRespSchema, userSchema, permissionRespSchema,
  type AuthUser, type Permission,
} from '../../../shared/schemas/auth.schema';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { validateResponse } from '../utils/validate-response';

export type OperationCode = string;
export const SKIP_AUTH_RECOVERY = new HttpContextToken<boolean>(() => false);
type ReadonlyState<T> = Observable<T> & Pick<BehaviorSubject<T>, 'getValue'>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly router = inject(Router);
  private readonly log = inject(ClientLoggerService);

  private token = '';
  private generation = 0;
  private readonly generationChanged$ = new Subject<void>();
  private recovery$?: Observable<void>;

  private readonly user$ = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this.user$.asObservable();
  private readonly permissionsState = signal<ReadonlyMap<OperationCode, Permission>>(new Map());
  readonly permissions$ = this.permissionsState.asReadonly();
  private readonly authReadyState = new BehaviorSubject(false);
  private readonly permsReadyState = new BehaviorSubject(false);
  readonly authReady$: ReadonlyState<boolean> = this.authReadyState;
  readonly permsReady$: ReadonlyState<boolean> = this.permsReadyState;

  getToken(): string {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token ?? '';
  }

  getAuthGeneration(): number {
    return this.generation;
  }

  get authReadyOnce$(): Observable<boolean> {
    return this.authReady$.pipe(filter(Boolean), take(1));
  }

  get permsReadyOnce$(): Observable<boolean> {
    return this.permsReady$.pipe(filter(Boolean), take(1));
  }

  logIn(userName: string, password: string): Observable<void> {
    return defer(() => {
      const generation = this.beginGeneration(false);
      let succeeded = false;
      return this.http.post<RawApiResponse>(
        `${environment.apiUrl}/api/session/sign-in`,
        { userName, password },
        { withCredentials: true },
      ).pipe(
        validateResponse(signInRespSchema),
        tap(({ data }) => {
          this.setToken(data.token);
          this.log.setUser(data.user.id);
          this.user$.next(data.user);
        }),
        switchMap(() => this.loadPermissions$(generation)),
        tap(() => {
          succeeded = true;
          this.authReadyState.next(true);
        }),
        takeUntil(this.generationChanged$),
        finalize(() => {
          if (!succeeded && generation === this.generation) this.beginGeneration(true);
        }),
      );
    });
  }

  hydrateFromSession(): Observable<void> {
    return defer(() => {
      const generation = this.generation;
      return this.recoverSession().pipe(
        catchError(() => {
          if (generation === this.generation) {
            this.beginGeneration(true);
            void this.router.navigate(['/session/sign-in']);
          }
          return of(void 0);
        }),
      );
    });
  }

  recoverSession(): Observable<void> {
    return defer(() => {
      if (this.recovery$) return this.recovery$;
      const generation = this.generation;
      let succeeded = false;
      this.authReadyState.next(false);
      this.permsReadyState.next(false);

      const recovery$: Observable<void> = this.rawHttp.post<RawApiResponse>(
        `${environment.apiUrl}/api/session/refresh`, null, { withCredentials: true },
      ).pipe(
        validateResponse(refreshRespSchema),
        tap(({ data }) => this.setToken(data.accessToken)),
        // /me needs the bearer token but must not join the recovery waiting for it.
        switchMap(() => this.http.get<RawApiResponse>(
          `${environment.apiUrl}/api/session/me`,
          { withCredentials: true, context: new HttpContext().set(SKIP_AUTH_RECOVERY, true) },
        )),
        validateResponse(userSchema),
        tap(({ data }) => {
          this.log.setUser(data.id);
          this.user$.next(data);
        }),
        switchMap(() => this.loadPermissions$(generation)),
        tap(() => {
          succeeded = true;
          this.authReadyState.next(true);
        }),
        // Invalidation must error recovery waiters, not silently complete their requests.
        takeUntil(this.generationChanged$.pipe(
          switchMap(() => throwError(() => new Error('Authentication session changed'))),
        )),
      ).pipe(
        finalize(() => {
          if (this.recovery$ === recovery$) this.recovery$ = undefined;
          if (!succeeded && generation === this.generation) this.beginGeneration(true);
        }),
        // Share the operation itself so one caller leaving cannot strand the others.
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.recovery$ = recovery$;
      return recovery$;
    });
  }

  fetchPermissions(): Subscription {
    return this.loadPermissions$(this.generation).subscribe();
  }

  has(op: OperationCode): boolean {
    return !!this.permissions$().get(op)?.access;
  }

  getCurrentUserSnapshot(): AuthUser | null {
    return this.user$.getValue();
  }

  logout(): Observable<void> {
    return defer(() => {
      this.beginGeneration(true);
      void this.router.navigate(['/session/sign-in']);
      return this.rawHttp.post<ApiResponse<null>>(
        `${environment.apiUrl}/api/session/sign-out`, null, { withCredentials: true },
      ).pipe(
        takeUntil(this.generationChanged$),
        catchError(() => of(void 0)),
        map(() => void 0),
      );
    });
  }

  private beginGeneration(ready: boolean): number {
    // Older auth work must not restore state after logout or a newer login starts.
    this.generation += 1;
    this.recovery$ = undefined;
    this.generationChanged$.next();
    this.setToken('');
    this.permissionsState.set(new Map());
    this.log.setUser(null);
    this.user$.next(null);
    this.permsReadyState.next(ready);
    this.authReadyState.next(ready);
    return this.generation;
  }

  private loadPermissions$(generation: number): Observable<void> {
    return defer(() => {
      if (generation !== this.generation) return EMPTY;
      return this.http.get<RawApiResponse>(
        `${environment.apiUrl}/api/auth/permissions`,
        { withCredentials: true, context: new HttpContext().set(SKIP_AUTH_RECOVERY, true) },
      ).pipe(
        validateResponse(permissionRespSchema),
        tap(({ data }) => {
          if (generation !== this.generation) return;
          this.permissionsState.set(new Map(data.map((permission) => [permission.operation, permission])));
          this.permsReadyState.next(true);
        }),
        map(() => void 0),
        catchError(() => {
          if (generation !== this.generation) return EMPTY;
          this.permissionsState.set(new Map());
          this.permsReadyState.next(true);
          return of(void 0);
        }),
        takeUntil(this.generationChanged$),
      );
    });
  }
}
