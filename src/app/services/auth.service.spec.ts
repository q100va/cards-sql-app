// src/app/services/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
  TestRequest,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from './auth.service';
import { ClientLoggerService } from './client-logger.service';
import { environment } from '../../environments/environment';

import type {
  AuthUser,
  SignInResp,
  RefreshResp,
  Permission,
} from '../../../shared/schemas/auth.schema';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const api = environment.apiUrl;

  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const loggerSpy = jasmine.createSpyObj<ClientLoggerService>(
    'ClientLoggerService',
    ['setUser']
  );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),

        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: ClientLoggerService, useValue: loggerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy.navigate.calls.reset();
    loggerSpy.setUser.calls.reset();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function expectSignInReq(payload: { userName: string | null; password: string | null }) {
    const req = httpMock.expectOne(`${api}/api/session/sign-in`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual(payload);
    return req;
  }

  function expectPermsReq(perms: Permission[] = []) {
    const req = httpMock.expectOne(`${api}/api/auth/permissions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ data: perms });
  }

  it('logIn: sets token, emits user, calls logger; waits for permissions', (done) => {
    const user: AuthUser = {
      id: 123,
      userName: 'alice',
      firstName: 'Alice',
      lastName: 'Smith',
      roleName: 'ADMIN',
      roleId: 1,
    };
    const resp: { data: SignInResp } = {
      data: { user, token: 'tok_1234567890', expiresIn: 900 },
    };

    const sub = service.currentUser$.subscribe(() => {});

    service.logIn('alice', 'p@ss12345').subscribe({
      next: () => {
        expect(service.getToken()).toBe('tok_1234567890');
        expect(loggerSpy.setUser).toHaveBeenCalledWith(123);
        sub.unsubscribe();
        done();
      },
      error: done.fail,
    });

    // 1) /sign-in
    expectSignInReq({ userName: 'alice', password: 'p@ss12345' }).flush(resp);
    // 2) /permissions — обязательный флеш
    expectPermsReq([]);
  });

  it('logIn: invalid schema → errors out (no permissions request)', (done) => {
    const bad = { data: { foo: 'bar' } as any };

    service.logIn('a', 'b').subscribe({
      next: () => done.fail('Expected error due to invalid schema'),
      error: (e) => {
        expect(String(e?.message ?? e)).toContain('ERRORS.INVALID_SCHEMA');
        done();
      },
    });

    expectSignInReq({ userName: 'a', password: 'b' }).flush(bad);
  });

  it('hydrateFromSession: refresh ok → fetch /me, set token, emit user; also requests permissions', (done) => {
    const refreshResp: { data: RefreshResp } = {
      data: { accessToken: 'acc_abcdef123456', expiresIn: 900 },
    };
    const me: { data: AuthUser } = {
      data: {
        id: 7,
        userName: 'zoe',
        firstName: 'Zoe',
        lastName: 'Lee',
        roleName: 'USER',
        roleId: 1,
      },
    };

    const emissions: Array<AuthUser | null> = [];
    const sub = service.currentUser$.subscribe((u) => emissions.push(u));

    service.hydrateFromSession().subscribe({
      next: () => {
        expect(service.getToken()).toBe('acc_abcdef123456');
        expect(emissions[emissions.length - 1]).toEqual(me.data);
        sub.unsubscribe();
        done();
      },
      error: done.fail,
    });

    // 1) /refresh (идёт через rawHttp — тестовый бекенд его тоже ловит)
    const refreshReq = httpMock.expectOne(`${api}/api/session/refresh`);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.withCredentials).toBeTrue();
    expect(refreshReq.request.body).toBeNull();
    refreshReq.flush(refreshResp);

    // 2) /me
    const meReq = httpMock.expectOne(`${api}/api/session/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush(me);

    // 3) /permissions — сервис не ждёт, но verify потребует флеш
    expectPermsReq([]);
  });

  it('hydrateFromSession: refresh fails → completes silently (no throw, no /me, no permissions)', (done) => {
    service.hydrateFromSession().subscribe({
      next: () => done(),
      error: done.fail,
    });

    const refreshReq = httpMock.expectOne(`${api}/api/session/refresh`);
    refreshReq.flush(
      { code: 'ERRORS.UNAUTHORIZED', data: null },
      { status: 401, statusText: 'Unauthorized' }
    );
  });

  it('logout: clears token/user and navigates on 200', () => {
    service.setToken('tok');
    (service as any).user$.next({
      id: 1, userName: 'x', firstName: 'y', lastName: 'z', roleName: 'USER', roleId: 1,
    });

    const sub = service.logout().subscribe();

    const signOutReq = httpMock.expectOne(`${api}/api/session/sign-out`);
    expect(signOutReq.request.method).toBe('POST');
    expect(signOutReq.request.withCredentials).toBeTrue();
    expect(signOutReq.request.body).toBeNull();

    signOutReq.flush({ data: null });

    expect(service.getToken()).toBe('');
    let currentUser: any = 'sentinel';
    const s = service.currentUser$.subscribe(u => (currentUser = u));
    s.unsubscribe();
    expect(currentUser).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/session/sign-in']);

    sub.unsubscribe();
  });

  it('logout: still clears token/user and navigates on server error', () => {
    service.setToken('tok');
    (service as any).user$.next({
      id: 2, userName: 'x', firstName: 'y', lastName: 'z', roleName: 'USER', roleId: 1,
    });

    const sub = service.logout().subscribe({ error: () => {/* ignore */} });

    const signOutReq = httpMock.expectOne(`${api}/api/session/sign-out`);
    signOutReq.flush({ code: 'ERR' }, { status: 500, statusText: 'Internal Server Error' });

    expect(service.getToken()).toBe('');
    let currentUser: any = 'sentinel';
    const s = service.currentUser$.subscribe(u => (currentUser = u));
    s.unsubscribe();
    expect(currentUser).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/session/sign-in']);

    sub.unsubscribe();
  });
  describe('session lifecycle regressions', () => {
    let subscriptions: Subscription;

    const sessionA: AuthUser = {
      id: 11,
      userName: 'session-a',
      firstName: 'Session',
      lastName: 'Alpha',
      roleName: 'ROLE_A',
      roleId: 1,
    };
    const sessionB: AuthUser = {
      id: 22,
      userName: 'session-b',
      firstName: 'Session',
      lastName: 'Beta',
      roleName: 'ROLE_B',
      roleId: 2,
    };
    const permissionA: Permission = {
      id: 1, roleId: 1, operation: 'SESSION_A_PERMISSION', access: true, disabled: false,
    };
    const permissionB: Permission = {
      id: 2, roleId: 2, operation: 'SESSION_B_PERMISSION', access: true, disabled: false,
    };

    beforeEach(() => {
      subscriptions = new Subscription();
    });

    afterEach(() => {
      subscriptions.unsubscribe();
    });

    function startLogin(user: AuthUser, token: string): TestRequest {
      subscriptions.add(service.logIn(user.userName, 'Password123').subscribe({
        error: (error: unknown) => fail(error),
      }));
      expectSignInReq({ userName: user.userName, password: 'Password123' }).flush({
        data: { user, token, expiresIn: 900 },
      });
      return httpMock.expectOne(`${api}/api/auth/permissions`);
    }

    it('finishes anonymous initialization instead of leaving auth readiness pending', () => {
      const ready: boolean[] = [];
      subscriptions.add(service.authReadyOnce$.subscribe((value) => ready.push(value)));
      expect(service.authReady$.getValue()).toBeFalse();
      expect(service.getCurrentUserSnapshot()).toBeNull();

      let settled = false;
      subscriptions.add(service.hydrateFromSession().subscribe({
        error: () => (settled = true),
        complete: () => (settled = true),
      }));
      expect(ready).toEqual([]);
      httpMock.expectOne(`${api}/api/session/refresh`).flush(
        { code: 'ERRORS.UNAUTHORIZED', data: null },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(settled).toBeTrue();
      expect(service.getToken()).toBe('');
      expect(service.getCurrentUserSnapshot()).toBeNull();
      expect(service.authReady$.getValue()).withContext('anonymous initialization is complete').toBeTrue();
      expect(ready).toEqual([true]);
    });

    for (const stage of ['refresh', 'me'] as const) {
      it(`ignores session A's late ${stage} response after logout`, () => {
        startLogin(sessionA, 'session_a_access_token').flush({ data: [permissionA] });

        subscriptions.add(service.hydrateFromSession().subscribe({ error: () => undefined }));
        let late = httpMock.expectOne(`${api}/api/session/refresh`);
        if (stage === 'me') {
          late.flush({ data: { accessToken: 'renewed_session_a_token', expiresIn: 900 } });
          late = httpMock.expectOne(`${api}/api/session/me`);
        }

        const visibleAfterLogout: Array<AuthUser | null> = [];
        subscriptions.add(service.currentUser$.subscribe((user) => visibleAfterLogout.push(user)));
        visibleAfterLogout.length = 0;
        subscriptions.add(service.logout().subscribe());
        httpMock.expectOne(`${api}/api/session/sign-out`).flush({ data: null });
        expect(service.getCurrentUserSnapshot()).toBeNull();
        expect(service.getToken()).toBe('');

        // A future implementation may cancel the obsolete request or ignore its response.
        if (!late.cancelled) {
          late.flush(stage === 'refresh'
            ? { data: { accessToken: 'obsolete_session_a_token', expiresIn: 900 } }
            : { data: sessionA });
        }
        for (const me of httpMock.match(`${api}/api/session/me`)) {
          if (!me.cancelled) me.flush({ data: sessionA });
        }
        for (const permissions of httpMock.match(`${api}/api/auth/permissions`)) {
          if (!permissions.cancelled) permissions.flush({ data: [permissionA] });
        }

        expect(service.getCurrentUserSnapshot()).withContext('session A must stay logged out').toBeNull();
        expect(service.getToken()).toBe('');
        expect(visibleAfterLogout.some((user) => user !== null)).toBeFalse();
        expect(service.permissions$().size).toBe(0);
        expect(service.authReady$.getValue()).withContext('logout is a settled anonymous state').toBeTrue();
        expect(loggerSpy.setUser.calls.mostRecent().args).toEqual([null]);
      });
    }

    it('does not let session A permissions overwrite the newer authenticated session B', () => {
      // Hold A's response while B completes a separate public login flow.
      const delayedPermissionsA = startLogin(sessionA, 'session_a_access_token');
      subscriptions.add(service.logout().subscribe());
      httpMock.expectOne(`${api}/api/session/sign-out`).flush({ data: null });

      startLogin(sessionB, 'session_b_access_token').flush({ data: [permissionB] });
      expect(service.getCurrentUserSnapshot()).toEqual(sessionB);
      expect(service.has(permissionB.operation)).toBeTrue();

      if (!delayedPermissionsA.cancelled) delayedPermissionsA.flush({ data: [permissionA] });

      expect(service.getCurrentUserSnapshot()).toEqual(sessionB);
      expect(service.getToken()).toBe('session_b_access_token');
      expect(service.has(permissionA.operation)).withContext('A must not replace B permissions').toBeFalse();
      expect(service.has(permissionB.operation)).toBeTrue();
      expect([...service.permissions$().values()].map((permission) => permission.roleId)).toEqual([sessionB.roleId]);
      expect(service.authReady$.getValue()).toBeTrue();
      expect(service.permsReady$.getValue()).toBeTrue();
    });
  });
});
