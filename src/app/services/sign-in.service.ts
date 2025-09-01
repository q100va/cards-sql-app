import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ClientLoggerService } from './client-logger.service';

@Injectable({
  providedIn: 'root',
})
export class SignInService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cookieService = inject(CookieService);
  private log = inject(ClientLoggerService);

  private token = '';
  private tokenTimer: any;

  result: any;
  signInResult!: string;

  constructor() {}

  getToken() {
    return this.token;
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();
    if (!authInformation) {
      return;
    }
    const now = new Date();
    const expiresIn = authInformation.expirationDate.getTime() - now.getTime();
    if (expiresIn > 0) {
      this.token = authInformation.token;

      this.setAuthTimer(expiresIn / 1000);
    }
  }

  private getAuthData() {
    const token = localStorage.getItem('token');
    const expirationDate = localStorage.getItem('expiration');
    if (!token || !expirationDate) {
      return;
    }
    return {
      token: token,
      expirationDate: new Date(expirationDate),
    };
  }

  private setAuthTimer(duration: number) {
    //console.log('Setting timer: ' + duration);
    this.tokenTimer = setTimeout(() => {
      //TODO: added dialog for login without loosing data
      this.logout();
    }, duration * 1000);
  }

  logIn(userName: string | null, password: string | null): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http
      .post(BACKEND_URL + '/api/session/sign-in', {
        userName: userName,
        password: password,
      })
      .pipe(
        map((res) => {
          this.result = res;
          this.cookieService.set(
            'session_user',
            'okskust', //this.result.data.user.userName,
            1
          );
          sessionStorage.setItem(
            'name',
            'Оксана Кустова' //`${this.result.data.user.firstName} ${this.result.data.user.lastName}`
          );

          this.log.setUser(777); // TODO: add real user id
          /*  this.token = this.result.data.token;
          const expiresInDuration = this.result.data.expiresIn;
          this.setAuthTimer(expiresInDuration);
          const now = new Date();
          const expirationDate = new Date(
            now.getTime() + expiresInDuration * 1000
          );
          this.saveAuthData(this.token, expirationDate); */
          //console.log("logIn");
          this.router.navigate(['/']);
          return 'Success';
        })
      );
  }

  private saveAuthData(token: string, expirationDate: Date) {
    localStorage.setItem('token', token);
    localStorage.setItem('expiration', expirationDate.toISOString());
  }

  logout() {
    this.token = '';
    clearTimeout(this.tokenTimer);
    this.clearAuthData();
    this.router.navigate(['/session/sign-in']);
  }

  private clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('expiration');
  }
}
