import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptors, withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { httpErrorInterceptor } from './http-error.interceptor';
import { AuthService } from '../services/auth.service';
import { ClientLoggerService } from '../services/client-logger.service';
import { MessageWrapperService } from '../services/message.service';
import { ClientLogBatch } from '../interfaces/client-log';
import { ClientLoggerTestHarness } from '../testing/client-logger-test-harness';
import { environment } from '../../environments/environment';

describe('Client logging through application interceptors', () => {
  const logUrl = `${environment.apiUrl}/api/client-logs`;
  const refreshUrl = `${environment.apiUrl}/api/session/refresh`;
  const signOutUrl = `${environment.apiUrl}/api/session/sign-out`;
  let hooks: ClientLoggerTestHarness;
  let logger: ClientLoggerService;
  let auth: AuthService;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let recover: jasmine.Spy<AuthService['recoverSession']>;
  let logout: jasmine.Spy<AuthService['logout']>;
  let subscriptions: Subscription;

  beforeEach(() => {
    hooks = new ClientLoggerTestHarness();
    subscriptions = new Subscription();
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor]), withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: Router, useValue: router },
        provideTranslateService(),
        MessageService,
      ],
    });
    logger = TestBed.inject(ClientLoggerService);
    auth = TestBed.inject(AuthService);
    auth.setToken('existing-access-token');
    recover = spyOn(auth, 'recoverSession').and.callThrough();
    logout = spyOn(auth, 'logout').and.callThrough();
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      subscriptions.unsubscribe();
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
      hooks.restore();
    }
  });

  function sendDiagnostic() {
    logger.warn('Original application diagnostic', { source: 'RegressionTest' });
    hooks.flushInterval();
    const req = httpMock.expectOne(logUrl);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as ClientLogBatch).items.map(item => item.message))
      .toEqual(['Original application diagnostic']);
    return req;
  }

  it('does not enqueue repeated diagnostic batches when client-log transport fails', () => {
    const req = sendDiagnostic();
    expect(() => req.flush({ code: 'ERRORS.SERVER' }, {
      status: 503, statusText: 'Service Unavailable',
    })).not.toThrow();

    for (let cycle = 1; cycle <= 2; cycle++) {
      hooks.flushInterval();
      const recursive = httpMock.match(logUrl);
      expect(recursive.length).withContext(`flush cycle ${cycle} must stay idle`).toBe(0);
      for (const transport of recursive) {
        transport.flush({ code: 'ERRORS.SERVER' }, { status: 503, statusText: 'Service Unavailable' });
      }
    }
    const success = jasmine.createSpy('unrelated application success');
    http.get(`${environment.apiUrl}/api/health-check`).subscribe(success);
    httpMock.expectOne(`${environment.apiUrl}/api/health-check`).flush({ ok: true });
    expect(success).toHaveBeenCalledOnceWith({ ok: true });
    expect(recover).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it('treats a client-log 401 as best-effort without refreshing or logging out', () => {
    const req = sendDiagnostic();
    expect(() => req.flush({ code: 'ERRORS.UNAUTHORIZED' }, {
      status: 401, statusText: 'Unauthorized',
    })).not.toThrow();
    expect(recover).not.toHaveBeenCalled();
    const refreshes = httpMock.match(refreshUrl);
    expect(refreshes.length).withContext('diagnostic requests must not initiate refresh').toBe(0);
    // Settle an unintended recovery too, so its logout side effect is visible and nothing leaks.
    for (const refresh of refreshes) {
      refresh.flush({ code: 'ERRORS.UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });
    }
    expect(logout).not.toHaveBeenCalled();
    const signOuts = httpMock.match(signOutUrl);
    expect(signOuts.length).toBe(0);
    for (const signOut of signOuts) signOut.flush(null, { status: 204, statusText: 'No Content' });
    expect(hooks.error).not.toHaveBeenCalled();
  });

  it('does not join an existing session recovery when client-log transport returns 401', () => {
    subscriptions.add(auth.recoverSession().subscribe({ error: () => {} }));
    const refresh = httpMock.expectOne(refreshUrl);
    expect(recover).toHaveBeenCalledTimes(1);
    const req = sendDiagnostic();
    expect(() => req.flush({ code: 'ERRORS.UNAUTHORIZED' }, {
      status: 401, statusText: 'Unauthorized',
    })).not.toThrow();
    expect(recover).withContext('only the original recovery caller may join').toHaveBeenCalledTimes(1);
    httpMock.expectNone(refreshUrl);
    expect(logout).not.toHaveBeenCalled();

    // Finish the independent recovery after checking the logger's behavior while it is pending.
    refresh.flush({ code: 'ERRORS.UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });
    for (const signOut of httpMock.match(signOutUrl)) {
      signOut.flush(null, { status: 204, statusText: 'No Content' });
    }
  });

  it('records one diagnostic when an intercepted HTTP failure is presented by the message wrapper', () => {
    const wrapper = TestBed.inject(MessageWrapperService);
    const toast = spyOn(TestBed.inject(MessageService), 'add');
    http.get(`${environment.apiUrl}/api/homes`).subscribe({
      error: (error: unknown) => wrapper.handle(error, { source: 'HomesListComponent' }),
    });
    httpMock.expectOne(`${environment.apiUrl}/api/homes`).flush({ code: 'ERRORS.SERVER' }, {
      status: 500, statusText: 'Internal Server Error', headers: { 'X-Request-Id': 'duplicate-check' },
    });
    hooks.flushInterval();
    const req = httpMock.expectOne(logUrl);
    const events = (req.request.body as ClientLogBatch).items;
    expect(events.length).withContext('one failed request must have one diagnostic owner').toBe(1);
    expect(events.every(item => item.corrId === 'duplicate-check')).toBeTrue();
    expect(toast).toHaveBeenCalledTimes(1);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
