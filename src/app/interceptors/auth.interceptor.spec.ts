import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';

import { AuthInterceptor } from './auth.interceptor';
import { SignInService } from '../services/sign-in.service';
import { environment } from '../../environments/environment';

class SignInServiceStub {
  private token = '';
  getToken() { return this.token; }
  setToken(t: string) { this.token = t; }

  // by default refresh succeeds
  hydrateFromSession = jasmine.createSpy('hydrateFromSession').and.returnValue(of(void 0));

  logout = jasmine.createSpy('logout').and.returnValue(of(void 0));
}

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let signIn: SignInServiceStub;

  const api = environment.apiUrl; // absolute API base; relative '/api/...' also supported

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // HttpClient wired to DI-provided interceptors + testing backend
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),

        // dependencies
        { provide: SignInService, useClass: SignInServiceStub },

        // interceptor under test
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    signIn = TestBed.inject(SignInService) as unknown as SignInServiceStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Authorization header for API requests when a token exists', () => {
    signIn.setToken('tok_123');

    http.get('/api/data').subscribe();
    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok_123');
    req.flush({ ok: true });
  });

  it('does not touch auth routes (/sign-in | /refresh | /sign-out)', () => {
    signIn.setToken('tok_123');

    // sign-in
    http.post(`${api}/api/session/sign-in`, { a: 1 }).subscribe();
    const r1 = httpMock.expectOne(`${api}/api/session/sign-in`);
    expect(r1.request.headers.has('Authorization')).toBeFalse();
    r1.flush({ ok: true });

    // refresh
    http.post('/api/session/refresh', null).subscribe();
    const r2 = httpMock.expectOne('/api/session/refresh');
    expect(r2.request.headers.has('Authorization')).toBeFalse();
    r2.flush({ ok: true });

    // sign-out
    http.post('/api/session/sign-out', null).subscribe();
    const r3 = httpMock.expectOne('/api/session/sign-out');
    expect(r3.request.headers.has('Authorization')).toBeFalse();
    r3.flush({ ok: true });
  });

  it('does not touch non-API requests (different domain/path)', () => {
    signIn.setToken('tok_abc');

    http.get('https://example.com/asset.svg').subscribe();
    const req = httpMock.expectOne('https://example.com/asset.svg');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    // Flush JSON (not Blob) to avoid automatic JSON conversion errors in the testing backend
    req.flush({ ok: true });
  });

  it('on 401 triggers hydrateFromSession and retries the request with the new token', () => {
    // old token for the first attempt
    signIn.setToken('old');

    // simulate successful refresh; set new token during refresh
    (signIn.hydrateFromSession as jasmine.Spy).and.callFake(() => {
      signIn.setToken('new');
      return of(void 0);
    });

    let final: any;
    http.get('/api/protected').subscribe((x) => (final = x));

    // first attempt → 401
    const first = httpMock.expectOne('/api/protected');
    expect(first.request.headers.get('Authorization')).toBe('Bearer old');
    first.flush({ code: 'ERRORS.UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });

    // retry → second attempt with new token
    const second = httpMock.expectOne('/api/protected');
    expect(second.request.headers.get('Authorization')).toBe('Bearer new');
    second.flush({ data: 'ok' });

    expect(signIn.hydrateFromSession).toHaveBeenCalledTimes(1);
    expect(final).toEqual({ data: 'ok' });
  });

  it('for parallel 401s: waits for a single refresh and retries both with the new token', () => {
    signIn.setToken('old');

    // control refresh completion manually
    const gate = new Subject<void>();
    (signIn.hydrateFromSession as jasmine.Spy).and.returnValue(gate.asObservable());

    // fire two parallel requests
    let res1: any, res2: any;
    http.get('/api/x').subscribe((x) => (res1 = x));
    http.get('/api/y').subscribe((x) => (res2 = x));

    // both fail with 401
    const x1 = httpMock.expectOne('/api/x');
    expect(x1.request.headers.get('Authorization')).toBe('Bearer old');
    x1.flush({ code: 'ERR' }, { status: 401, statusText: 'Unauthorized' });

    const y1 = httpMock.expectOne('/api/y');
    expect(y1.request.headers.get('Authorization')).toBe('Bearer old');
    y1.flush({ code: 'ERR' }, { status: 401, statusText: 'Unauthorized' });

    // finish refresh → interceptor should retry both
    signIn.setToken('new');
    gate.next();
    gate.complete();

    const x2 = httpMock.expectOne('/api/x');
    expect(x2.request.headers.get('Authorization')).toBe('Bearer new');
    x2.flush({ ok: 1 });

    const y2 = httpMock.expectOne('/api/y');
    expect(y2.request.headers.get('Authorization')).toBe('Bearer new');
    y2.flush({ ok: 2 });

    expect(res1).toEqual({ ok: 1 });
    expect(res2).toEqual({ ok: 2 });
    expect(signIn.hydrateFromSession).toHaveBeenCalledTimes(1);
  });

  it('if refresh fails — calls logout and rethrows the error', (done) => {
    signIn.setToken('old');
    (signIn.hydrateFromSession as jasmine.Spy).and.returnValue(throwError(() => new Error('refresh-fail')));

    http.get('/api/protected').subscribe({
      next: () => done.fail('should fail'),
      error: (e: HttpErrorResponse | Error) => {
        expect(signIn.logout).toHaveBeenCalled();
        expect(String(e?.toString?.() ?? e)).toContain('refresh-fail'); // error is propagated to subscriber
        done();
      },
    });

    const r1 = httpMock.expectOne('/api/protected');
    r1.flush({ code: 'ERR' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('works the same for 403 (not only 401)', () => {
    signIn.setToken('t1');
    (signIn.hydrateFromSession as jasmine.Spy).and.callFake(() => {
      signIn.setToken('t2');
      return of(void 0);
    });

    http.get('/api/z').subscribe();

    const z1 = httpMock.expectOne('/api/z');
    expect(z1.request.headers.get('Authorization')).toBe('Bearer t1');
    z1.flush({ code: 'ERR' }, { status: 403, statusText: 'Forbidden' });

    const z2 = httpMock.expectOne('/api/z');
    expect(z2.request.headers.get('Authorization')).toBe('Bearer t2');
    z2.flush({ ok: true });
  });
});
