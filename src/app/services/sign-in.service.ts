// src/app/services/sign-in.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, switchMap, catchError, map, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { ClientLoggerService } from './client-logger.service';
//import { IdleService } from './idle.service';

export interface AuthUser {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  roleName: string;
}

@Injectable({ providedIn: 'root' })
export class SignInService {
  private http = inject(HttpClient);
  private rawHttp = new HttpClient(inject(HttpBackend)); // без интерсепторов
  private router = inject(Router);
  private log = inject(ClientLoggerService);
  // readonly idle = inject(IdleService);

  private token = '';
  getToken() {
    return this.token;
  }
  setToken(t: string) {
    this.token = t ?? '';
  }

  private user$ = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this.user$.asObservable();

  logIn(userName: string | null, password: string | null): Observable<void> {
    const url = `${environment.apiUrl}/api/session/sign-in`;
    return this.http
      .post<any>(url, { userName, password }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.setToken(res.data.token);
          this.user$.next(res.data.user);
          //this.idle.start(20 * 60_000, 60_000);
          this.log.setUser(res.data.user.id);
        }),
        map(() => void 0)
      );
  }

  hydrateFromSession(): Observable<void> {
    return this.rawHttp
      .post<{ data: { accessToken: string } }>(
        `${environment.apiUrl}/api/session/refresh`,
        null,
        { withCredentials: true }
      )
      .pipe(
        tap((res) => this.setToken(res.data.accessToken)),
        switchMap(() =>
          this.http.get<{ data: AuthUser }>(
            `${environment.apiUrl}/api/session/me`
          )
        ),
        tap((res) => this.user$.next(res.data)),
        map(() => void 0),
        catchError(() => of(void 0))
      );
  }

  // 🔹 ВЫХОД: дергаем /sign-out, затем локально чистим состояние и редиректим
  logout(): Observable<void> {
    const url = `${environment.apiUrl}/api/session/sign-out`;
    return this.rawHttp.post(url, null, { withCredentials: true }).pipe(
      catchError(() => of(void 0)), // даже если сервер вернул 4xx/5xx — локально всё равно выходим
      finalize(() => {
        this.setToken('');
        this.user$.next(null);
        this.router.navigate(['/session/sign-in']);
      }),
      map(() => void 0)
    );
  }
}
