// auth-ready.guard.spec.ts
import { Component } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter, type CanActivateFn } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, Subscription, filter, firstValueFrom, take } from 'rxjs';
import { waitAuthReady } from './auth-ready.guard';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { ClientLoggerService } from '../services/client-logger.service';
import { environment } from '../../environments/environment';

class AuthServiceMock {
  authReady$ = new BehaviorSubject<boolean>(false);
  get authReadyOnce$() {
    return this.authReady$.pipe(filter(Boolean), take(1));
  }
  setAuthReady(v: boolean) {
    this.authReady$.next(v);
  }
}

describe('waitAuthReady guard', () => {
  let auth: AuthServiceMock;

  // dummy args for CanMatchFn signature
  const route: any = {};
  const segments: any[] = [];

  beforeEach(() => {
    auth = new AuthServiceMock();

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  it('resolves immediately when authReady is already true', async () => {
    auth.setAuthReady(true);

    const result = await TestBed.runInInjectionContext(async () => {
      const out = waitAuthReady(route, segments);
      // the guard returns boolean|UrlTree|Observable<...>; in our case it's Observable<boolean>
      return firstValueFrom(out as any as ReturnType<typeof auth['authReadyOnce$']['pipe']>);
    });

    expect(result).toBeTrue();
  });

  it('waits until authReady becomes true (does not resolve prematurely)', async () => {
    // initial false
    const promise = TestBed.runInInjectionContext(async () => {
      const out = waitAuthReady(route, segments);
      return firstValueFrom(out as any);
    });

    // give the microtask queue a chance — guard should still be pending
    let settled = false;
    promise.then(() => (settled = true));
    await new Promise((r) => setTimeout(r, 10));
    expect(settled).toBeFalse();

    // now flip to ready -> promise should resolve to true
    auth.setAuthReady(true);
    const result = await promise;
    expect(result).toBeTrue();
  });
});

@Component({ standalone: true, template: '' })
class AuthRegressionPage {}

describe('anonymous initialization through the real auth guards', () => {
  let auth: AuthService;
  let router: Router;
  let httpMock: HttpTestingController;
  let subscriptions: Subscription;
  let harness: RouterTestingHarness;
  let authDecision: jasmine.Spy<CanActivateFn>;

  beforeEach(async () => {
    subscriptions = new Subscription();
    authDecision = jasmine.createSpy<CanActivateFn>('authDecision').and.callFake(authGuard);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'session/sign-in', component: AuthRegressionPage },
          {
            path: 'protected',
            component: AuthRegressionPage,
            canMatch: [waitAuthReady],
            canActivate: [authDecision],
          },
        ]),
        {
          provide: ClientLoggerService,
          useValue: jasmine.createSpyObj<ClientLoggerService>('ClientLoggerService', ['setUser']),
        },
      ],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    // The guard must own this navigation; restoration must not cancel it with its own redirect.
    spyOn(router, 'navigate').and.resolveTo(true);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    router.dispose();
    subscriptions.unsubscribe();
    httpMock.verify();
  });

  it('reaches the anonymous auth decision once restoration settles, without an indefinite readiness wait', fakeAsync(() => {
    const navigationErrors: unknown[] = [];
    let navigationSettled = false;
    void harness.navigateByUrl('/protected').then(
      () => (navigationSettled = true),
      (error: unknown) => {
        navigationErrors.push(error);
        navigationSettled = true;
      },
    );
    subscriptions.add(auth.hydrateFromSession().subscribe({ error: () => undefined }));

    flushMicrotasks();
    expect(auth.getCurrentUserSnapshot()).toBeNull();
    expect(authDecision).withContext('initialization is still in progress').not.toHaveBeenCalled();
    expect(navigationSettled).toBeFalse();

    httpMock.expectOne(`${environment.apiUrl}/api/session/refresh`).flush(
      { code: 'ERRORS.UNAUTHORIZED', data: null },
      { status: 401, statusText: 'Unauthorized' },
    );
    flushMicrotasks();

    expect(authDecision).withContext('anonymous initialization must reach authGuard').toHaveBeenCalledTimes(1);
    expect(navigationErrors).toEqual([]);
    expect(navigationSettled).withContext('protected navigation must settle').toBeTrue();
    expect(router.url).toBe('/session/sign-in');
    expect(auth.getCurrentUserSnapshot()).toBeNull();
  }));
});
