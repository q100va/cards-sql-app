// route-perms.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom, from, isObservable, of } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { CanMatchFn, Router, UrlTree, provideRouter } from '@angular/router';

import { requireOp, requireAnyOp, requireAllOps } from './route-perms.guard';
import { AuthService } from '../services/auth.service';

// ---- AuthService mock ----
class AuthServiceMock {
  private allowed = new Set<string>();
  permsReady$ = new BehaviorSubject<boolean>(false);

  get permsReadyOnce$() {
    return this.permsReady$.pipe(filter(Boolean), take(1));
  }

  has = (op: string) => this.allowed.has(op);

  grant(...ops: string[]) { ops.forEach(o => this.allowed.add(o)); }
  revoke(...ops: string[]) { ops.forEach(o => this.allowed.delete(o)); }
  setReady(v: boolean) { this.permsReady$.next(v); }
}

// ---- Helper to run a CanMatchFn in DI context and normalize its result ----
async function runGuard<T = boolean | UrlTree>(guard: CanMatchFn): Promise<T> {
  const route: any = {};
  const segments: any[] = [];

  return await TestBed.runInInjectionContext(async () => {
    const res = guard(route, segments); // MaybeAsync<GuardResult>
    const obs = isObservable(res) ? res : res instanceof Promise ? from(res) : of(res);
    return firstValueFrom(obs) as Promise<T>;
  });
}

describe('route-perms guards', () => {
  let auth: AuthServiceMock;
  let router: jasmine.SpyObj<Router>;
  let forbiddenTree: UrlTree;

  beforeEach(() => {
    auth = new AuthServiceMock();

    // Router spy: parseUrl returns a stable UrlTree sentinel we can assert against
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    forbiddenTree = {} as UrlTree;
    router.parseUrl.and.returnValue(forbiddenTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  // ---------- requireOp ----------
  it('requireOp: allows when perms ready and op is granted', async () => {
    auth.grant('X');
    auth.setReady(true);

    const result = await runGuard(requireOp('X'));
    expect(result).toBeTrue();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('requireOp: denies (UrlTree) when op is missing', async () => {
    auth.setReady(true);

    const result = await runGuard(requireOp('X'));
    expect(result).toBe(forbiddenTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/forbidden');
  });

  // ---------- requireAnyOp ----------
  it('requireAnyOp: allows when at least one op is granted', async () => {
    auth.grant('B');
    auth.setReady(true);

    const result = await runGuard(requireAnyOp('A', 'B', 'C'));
    expect(result).toBeTrue();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('requireAnyOp: denies when none of the ops is granted', async () => {
    auth.setReady(true);

    const result = await runGuard(requireAnyOp('A', 'B'));
    expect(result).toBe(forbiddenTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/forbidden');
  });

  // ---------- requireAllOps ----------
  it('requireAllOps: allows when all ops are granted', async () => {
    auth.grant('A', 'B');
    auth.setReady(true);

    const result = await runGuard(requireAllOps('A', 'B'));
    expect(result).toBeTrue();
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('requireAllOps: denies when any required op is missing', async () => {
    auth.grant('A'); // B is missing
    auth.setReady(true);

    const result = await runGuard(requireAllOps('A', 'B'));
    expect(result).toBe(forbiddenTree);
    expect(router.parseUrl).toHaveBeenCalledWith('/forbidden');
  });

  // ---------- readiness behavior ----------
  it('guards wait for permsReadyOnce$ before deciding', async () => {
    const p = runGuard(requireOp('X')); // start before ready flips

    // give the microtask queue a tick; guard should still be pending
    let settled = false;
    p.then(() => (settled = true));
    await new Promise(r => setTimeout(r, 10));
    expect(settled).toBeFalse();

    auth.grant('X');
    auth.setReady(true);

    const result = await p;
    expect(result).toBeTrue();
  });
});

describe('permission guard readiness and terminal results', () => {
  let auth: AuthServiceMock;
  let router: Router;

  const cases = [
    { name: 'requireOp', guard: () => requireOp('VIEW_ORDER'), grants: ['VIEW_ORDER'] },
    { name: 'requireAnyOp', guard: () => requireAnyOp('VIEW_ORDER', 'EDIT_ORDER'), grants: ['EDIT_ORDER'] },
    { name: 'requireAllOps', guard: () => requireAllOps('VIEW_ORDER', 'EDIT_ORDER'), grants: ['VIEW_ORDER', 'EDIT_ORDER'] },
  ];

  beforeEach(() => {
    auth = new AuthServiceMock();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => router.dispose());

  for (const { name, guard, grants } of cases) {
    for (const allowed of [true, false]) {
      it(`${name}: waits only for permission readiness, emits ${allowed ? 'allow' : '/forbidden'}, and completes`, () => {
        const result = TestBed.runInInjectionContext(() => guard()({ path: 'protected' }, []));
        const result$ = isObservable(result) ? result : from(Promise.resolve(result));
        const values: unknown[] = [];
        const errors: unknown[] = [];
        let completions = 0;
        const subscription = result$.subscribe({
          next: (value) => values.push(value),
          error: (error: unknown) => errors.push(error),
          complete: () => completions += 1,
        });
        try {
          expect(values).toEqual([]);
          expect(completions).toBe(0);
          if (allowed) auth.grant(...grants);
          auth.setReady(true);

          expect(errors).toEqual([]);
          expect(values.length).toBe(1);
          if (allowed) {
            expect(values).toEqual([true]);
          } else {
            expect(values[0]).toEqual(jasmine.any(UrlTree));
            if (values[0] instanceof UrlTree) expect(router.serializeUrl(values[0])).toBe('/forbidden');
          }
          expect(completions).toBe(1);
          expect(subscription.closed).toBeTrue();

          auth.revoke(...grants);
          auth.setReady(false);
          auth.grant(...grants);
          auth.setReady(true);
          expect(values.length).withContext('completed guards must not emit new decisions').toBe(1);
          expect(completions).toBe(1);
        } finally {
          subscription.unsubscribe();
        }
      });
    }
  }
});
