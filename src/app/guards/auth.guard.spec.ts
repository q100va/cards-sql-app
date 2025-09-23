// auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom, from, isObservable, of } from 'rxjs';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

// ---- AuthService mock ----
class AuthServiceMock {
  currentUser$ = new BehaviorSubject<any | null>(null);
}

// ---- helper to run a CanActivateFn and normalize its result ----
async function runGuard<T = boolean | UrlTree>(guard: CanActivateFn): Promise<T> {
  const route: any = {};
  const state: any = {};
  return await TestBed.runInInjectionContext(async () => {
    const res = guard(route, state) as any; // MaybeAsync<GuardResult>
    const obs = isObservable(res) ? res : res instanceof Promise ? from(res) : of(res);
    return firstValueFrom(obs) as Promise<T>;
  });
}

describe('authGuard', () => {
  let auth: AuthServiceMock;
  let router: jasmine.SpyObj<Router>;
  let signInTree: UrlTree;

  beforeEach(() => {
    auth = new AuthServiceMock();
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    signInTree = {} as UrlTree;
    router.parseUrl.and.returnValue(signInTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows when user is present', async () => {
    auth.currentUser$.next({ id: 1, userName: 'alice' });

    const result = await runGuard(authGuard);
    expect(result).toBeTrue();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects to /session/sign-in when user is null', async () => {
    auth.currentUser$.next(null); // default anyway

    const result = await runGuard(authGuard);
    expect(result).toBe(signInTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/session/sign-in');
  });
});
