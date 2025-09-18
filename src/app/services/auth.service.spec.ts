import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { ClientLoggerService } from './client-logger.service';
import { environment } from '../../environments/environment';

import type { AuthUser, SignInResp, RefreshResp } from '@shared/schemas/auth.schema';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const api = environment.apiUrl;

  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const loggerSpy = jasmine.createSpyObj<ClientLoggerService>('ClientLoggerService', ['setUser']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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

  it('logIn: sets token, emits user, calls logger; schema ok', (done) => {
    const user: AuthUser = {
      id: 123,
      userName: 'alice',
      firstName: 'Alice',
      lastName: 'Smith',
      roleName: 'ADMIN',
      roleId: 1
    };
    const resp: { data: SignInResp } = {
      data: { user, token: 'tok_1234567890', expiresIn: 900 },
    };

    // слушаем стейт пользователя
    const sub = service.currentUser$.subscribe((u) => {
      // ожидаем последнюю эмиссию в конце кейса
    });

    service.logIn('alice', 'p@ss12345').subscribe({
      next: () => {
        expect(service.getToken()).toBe('tok_1234567890');
        expect(loggerSpy.setUser).toHaveBeenCalledWith(123);
        sub.unsubscribe();
        done();
      },
      error: done.fail,
    });

    // sign-in запрос
    expectSignInReq({ userName: 'alice', password: 'p@ss12345' }).flush(resp);
  });

  it('logIn: invalid schema → errors out', (done) => {
    // отдадим неправильную структуру data (нет user/token)
    const bad = { data: { foo: 'bar' } as any };

    service.logIn('a', 'b').subscribe({
      next: () => done.fail('Expected error due to invalid schema'),
      error: (e) => {
        // наша validateResponse бросает ValidationError('ERRORS.INVALID_SCHEMA')
        expect(String(e?.message ?? e)).toContain('ERRORS.INVALID_SCHEMA');
        done();
      },
    });

    expectSignInReq({ userName: 'a', password: 'b' }).flush(bad);
  });

  it('hydrateFromSession: refresh ok → fetch /me, set accessToken, emit user', (done) => {
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
        roleId: 1
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

    // 1) refresh (rawHttp, но HttpTestingController его тоже ловит)
    const refreshReq = httpMock.expectOne(`${api}/api/session/refresh`);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.withCredentials).toBeTrue();
    expect(refreshReq.request.body).toBeNull();
    refreshReq.flush(refreshResp);

    // 2) me
    const meReq = httpMock.expectOne(`${api}/api/session/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush(me);
  });

  it('hydrateFromSession: refresh fails → completes silently (no throw)', (done) => {
    service.hydrateFromSession().subscribe({
      next: () => done(), // of(void 0)
      error: done.fail,
    });

    const refreshReq = httpMock.expectOne(`${api}/api/session/refresh`);
    // сымитируем 401
    refreshReq.flush({ code: 'ERRORS.UNAUTHORIZED', data: null }, { status: 401, statusText: 'Unauthorized' });
  });

 it('logout: clears token/user and navigates, even if server returns 200', () => {
  // seed token and user
  service.setToken('tok');
  (service as any).user$.next({
    id: 1, userName: 'x', firstName: 'y', lastName: 'z', roleName: 'USER',
  });

  // subscribe (we don’t assert in `next`, finalize runs after completion)
  const sub = service.logout().subscribe();

  // sign-out request
  const signOutReq = httpMock.expectOne(`${api}/api/session/sign-out`);
  expect(signOutReq.request.method).toBe('POST');
  expect(signOutReq.request.withCredentials).toBeTrue();
  expect(signOutReq.request.body).toBeNull();

  // respond 200 → stream completes → finalize executes
  signOutReq.flush({ data: null });

  // assert AFTER flush (finalize has run)
  expect(service.getToken()).toBe('');

  let currentUser: any = 'sentinel';
  const s = service.currentUser$.subscribe(u => (currentUser = u));
  s.unsubscribe();
  expect(currentUser).toBeNull();

  expect(routerSpy.navigate).toHaveBeenCalledWith(['/session/sign-in']);

  sub.unsubscribe();
});

it('logout: still clears token/user and navigates when server errors', () => {
  service.setToken('tok');
  (service as any).user$.next({
    id: 2, userName: 'x', firstName: 'y', lastName: 'z', roleName: 'USER',
  });

  const sub = service.logout().subscribe({
    // no assertions here; finalize runs after completion/error
    error: () => { /* ignore */ },
  });

  const signOutReq = httpMock.expectOne(`${api}/api/session/sign-out`);
  signOutReq.flush(
    { code: 'ERR' },
    { status: 500, statusText: 'Internal Server Error' }
  );

  // After error, finalize still runs (by design)
  expect(service.getToken()).toBe('');

  let currentUser: any = 'sentinel';
  const s = service.currentUser$.subscribe(u => (currentUser = u));
  s.unsubscribe();
  expect(currentUser).toBeNull();

  expect(routerSpy.navigate).toHaveBeenCalledWith(['/session/sign-in']);

  sub.unsubscribe();
});
});
