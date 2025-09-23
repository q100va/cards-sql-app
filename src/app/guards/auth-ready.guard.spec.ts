// auth-ready.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, filter, firstValueFrom, take } from 'rxjs';
import { waitAuthReady } from './auth-ready.guard';
import { AuthService } from '../services/auth.service';

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
