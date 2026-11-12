import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { ClientLoggerService } from '../services/client-logger.service';
import { environment } from '../../environments/environment';
import type { AuthUser, Permission } from '../../../shared/schemas/auth.schema';

interface Outcome<T> {
  values: T[];
  errors: unknown[];
  completed: boolean;
  subscription: Subscription;
}

// Distinguish caller requests from restoration's own /me request without changing URLs.
const CALLER = new HttpContextToken<string>(() => '');
const USER: AuthUser = {
  id: 11,
  userName: 'session-a',
  firstName: 'Session',
  lastName: 'Alpha',
  roleName: 'ROLE_A',
  roleId: 1,
};
const PERMISSIONS: Permission[] = [
  { id: 1, roleId: 1, operation: 'SESSION_A_PERMISSION', access: true, disabled: false },
];
const OLD_TOKEN = 'session_a_access_token';
const NEW_TOKEN = 'renewed_session_a_token';
const UNAUTHORIZED = { code: 'ERRORS.UNAUTHORIZED', data: null };

describe('AuthService + AuthInterceptor regression coverage', () => {
  let auth: AuthService;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let subscriptions: Subscription;

  const refreshUrl = `${environment.apiUrl}/api/session/refresh`;
  const meUrl = `${environment.apiUrl}/api/session/me`;
  const permissionsUrl = `${environment.apiUrl}/api/auth/permissions`;
  const signOutUrl = `${environment.apiUrl}/api/session/sign-out`;

  beforeEach(() => {
    subscriptions = new Subscription();
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: Router, useValue: router },
        {
          provide: ClientLoggerService,
          useValue: jasmine.createSpyObj<ClientLoggerService>('ClientLoggerService', ['setUser']),
        },
      ],
    });

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);

    const login = observe(auth.logIn(USER.userName, 'Password123'));
    httpMock.expectOne(`${environment.apiUrl}/api/session/sign-in`).flush({
      data: { user: USER, token: OLD_TOKEN, expiresIn: 900 },
    });
    httpMock.expectOne(permissionsUrl).flush({ data: PERMISSIONS });
    expect(login.errors).toEqual([]);
    expect(login.subscription.closed).toBeTrue();
  });

  afterEach(() => {
    subscriptions.unsubscribe();
    httpMock.verify();
  });

  function observe<T>(source: Observable<T>): Outcome<T> {
    const outcome: Outcome<T> = {
      values: [],
      errors: [],
      completed: false,
      subscription: Subscription.EMPTY,
    };
    outcome.subscription = source.subscribe({
      next: (value) => outcome.values.push(value),
      error: (error: unknown) => outcome.errors.push(error),
      complete: () => (outcome.completed = true),
    });
    subscriptions.add(outcome.subscription);
    return outcome;
  }

  function requestUser(caller: string): Outcome<{ data: AuthUser }> {
    return observe(http.get<{ data: AuthUser }>(meUrl, {
      context: new HttpContext().set(CALLER, caller),
    }));
  }

  function callerRequest(caller: string): TestRequest {
    return httpMock.expectOne((req) => req.context.get(CALLER) === caller);
  }

  function reject(request: TestRequest): void {
    request.flush(UNAUTHORIZED, { status: 401, statusText: 'Unauthorized' });
  }

  function completeRecovery(refresh: TestRequest): void {
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush({ data: { accessToken: NEW_TOKEN, expiresIn: 900 } });

    const me = httpMock.expectOne((req) => req.url === meUrl && !req.context.get(CALLER));
    expect(me.request.headers.get('Authorization')).toBe(`Bearer ${NEW_TOKEN}`);
    me.flush({ data: USER });
    httpMock.expectOne(permissionsUrl).flush({ data: PERMISSIONS });
  }

  function finishRequestedSignOuts(): number {
    const requests = httpMock.match(signOutUrl);
    for (const request of requests) {
      if (!request.cancelled) request.flush({ data: null });
    }
    return requests.length;
  }

  function expectUnauthorized(outcome: Outcome<unknown>, label: string): void {
    expect(outcome.values).withContext(`${label}: no successful response`).toEqual([]);
    expect(outcome.errors.length).withContext(`${label}: auth failure must propagate`).toBe(1);
    const error = outcome.errors[0];
    expect(error).withContext(`${label}: preserve the HTTP failure`).toEqual(jasmine.any(HttpErrorResponse));
    if (error instanceof HttpErrorResponse) {
      expect(error.status).toBe(401);
      expect(error.error).toEqual(UNAUTHORIZED);
    }
    expect(outcome.completed).withContext(`${label}: failure is not silent completion`).toBeFalse();
    expect(outcome.subscription.closed).withContext(`${label}: no pending waiter`).toBeTrue();
  }

  it('propagates failed refresh without retrying the caller with its old bearer token', () => {
    const outcome = requestUser('original');
    const first = callerRequest('original');
    expect(first.request.headers.get('Authorization')).toBe(`Bearer ${OLD_TOKEN}`);
    reject(first);

    reject(httpMock.expectOne(refreshUrl));
    finishRequestedSignOuts();

    // Matching exposes forbidden retries while allowing deterministic teardown of failing code.
    const retries = httpMock.match((req) => req.context.get(CALLER) === 'original');
    expect(retries.length).withContext('a failed refresh must not release a retry').toBe(0);
    expect(retries.map((req) => req.request.headers.get('Authorization')))
      .not.toContain(`Bearer ${OLD_TOKEN}`);
    expectUnauthorized(outcome, 'original');
    expect(auth.getToken()).toBe('');
    expect(auth.getCurrentUserSnapshot()).toBeNull();
  });

  it('terminates recovery when restoration /me returns 401 instead of waiting on itself', () => {
    const outcome = requestUser('original');
    reject(callerRequest('original'));

    httpMock.expectOne(refreshUrl).flush({
      data: { accessToken: NEW_TOKEN, expiresIn: 900 },
    });
    const me = httpMock.expectOne((req) => req.url === meUrl && !req.context.get(CALLER));
    reject(me);
    finishRequestedSignOuts();

    httpMock.expectNone(refreshUrl);
    const retries = httpMock.match((req) => req.context.get(CALLER) === 'original');
    expect(retries.length).toBe(0);
    // Every server response has been delivered: completion is checked now, never by awaiting a timeout.
    expectUnauthorized(outcome, 'original');
    expect(auth.getToken()).toBe('');
    expect(auth.getCurrentUserSnapshot()).toBeNull();
  });

  it('shares one successful recovery between parallel 401 responses and completes both callers', () => {
    const first = requestUser('first');
    const second = requestUser('second');
    reject(callerRequest('first'));
    reject(callerRequest('second'));

    completeRecovery(httpMock.expectOne(refreshUrl));
    httpMock.expectNone(refreshUrl);

    for (const caller of ['first', 'second']) {
      const retry = callerRequest(caller);
      expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${NEW_TOKEN}`);
      retry.flush({ data: USER });
    }

    for (const outcome of [first, second]) {
      expect(outcome.values).toEqual([{ data: USER }]);
      expect(outcome.errors).toEqual([]);
      expect(outcome.completed).toBeTrue();
      expect(outcome.subscription.closed).toBeTrue();
    }
    httpMock.expectNone(signOutUrl);
  });

  it('propagates one failed recovery to every parallel waiter without retrying either caller', () => {
    const first = requestUser('first');
    const second = requestUser('second');
    reject(callerRequest('first'));
    reject(callerRequest('second'));

    reject(httpMock.expectOne(refreshUrl));
    finishRequestedSignOuts();
    httpMock.expectNone(refreshUrl);

    const retries = httpMock.match((req) => ['first', 'second'].includes(req.context.get(CALLER)));
    expect(retries.length).withContext('failed recovery must not release queued callers').toBe(0);
    expectUnauthorized(first, 'first');
    expectUnauthorized(second, 'second');
    expect(auth.getToken()).toBe('');
    expect(auth.getCurrentUserSnapshot()).toBeNull();
  });

  for (const status of [403, 422, 500]) {
    it(`propagates retry status ${status} without logging out after successful refresh`, () => {
      const logout = spyOn(auth, 'logout').and.callThrough();
      const outcome = requestUser('original');
      reject(callerRequest('original'));
      completeRecovery(httpMock.expectOne(refreshUrl));

      callerRequest('original').flush(
        { code: 'ERRORS.APPLICATION_ERROR', data: null },
        { status, statusText: 'Application error' },
      );

      expect(outcome.errors.length).toBe(1);
      const error = outcome.errors[0];
      expect(error).toEqual(jasmine.any(HttpErrorResponse));
      if (error instanceof HttpErrorResponse) expect(error.status).toBe(status);
      expect(outcome.values).toEqual([]);
      expect(outcome.subscription.closed).toBeTrue();
      expect(logout).not.toHaveBeenCalled();
      expect(auth.getToken()).toBe(NEW_TOKEN);
      expect(auth.getCurrentUserSnapshot()).toEqual(USER);
      expect(finishRequestedSignOuts()).withContext('no sign-out request after an application error').toBe(0);
      httpMock.expectNone(refreshUrl);
    });
  }
});
