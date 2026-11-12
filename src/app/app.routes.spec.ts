import { Component } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { NavigationStart, Router, RouterOutlet, provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subscription, of } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import type { AuthUser } from '../../shared/schemas/auth.schema';

@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
class RoutePolicyPage {}

class RouteSession {
  private readonly allowed = new Set<string>();
  readonly authReadyOnce$ = of(true);
  readonly permsReadyOnce$ = of(true);
  readonly currentUser$ = of<AuthUser>({
    id: 11, userName: 'route-user', firstName: 'Route', lastName: 'User', roleId: 1, roleName: 'TEST_ROLE',
  });

  grant(...operations: string[]): void {
    operations.forEach((operation) => this.allowed.add(operation));
  }

  has(operation: string): boolean {
    return this.allowed.has(operation);
  }
}

// Replace only rendered page bodies; preserve production matching, redirects, and guards.
function routingOnly(definitions: Routes): Routes {
  return definitions.map((route) => ({
    ...route,
    ...(route.component ? { component: RoutePolicyPage } : {}),
    ...(route.children ? { children: routingOnly(route.children) } : {}),
  }));
}

function policyRoutes(paths: string[]): Routes {
  const protectedArea = routes.find((route) => route.path === '' && route.children);
  if (!protectedArea?.children) throw new Error('Production protected routes are missing');
  // Isolate policy from the missing denial route and unrelated prefix guards.
  // Full-configuration tests below cover those boundaries without adding a denial route.
  return routingOnly([
    ...routes.filter((route) => route.path === 'session'),
    { ...protectedArea, children: protectedArea.children.filter((route) => paths.includes(route.path ?? '')) },
    { path: 'forbidden', component: RoutePolicyPage },
  ]);
}

function expectTerminalDenial(router: Router): void {
  expect(router.url).toBe('/forbidden');
  let terminal = router.routerState.snapshot.root;
  while (terminal.firstChild) terminal = terminal.firstChild;
  expect(terminal.routeConfig?.path).withContext('denial must resolve to its own route').toBe('forbidden');
  expect(terminal.routeConfig?.redirectTo).toBeUndefined();
  expect(terminal.component).withContext('denial must render a real page').not.toBeNull();
}

describe('production routing denial destination', () => {
  let auth: RouteSession;
  let router: Router;
  let subscriptions: Subscription;

  beforeEach(async () => {
    auth = new RouteSession();
    subscriptions = new Subscription();
    TestBed.configureTestingModule({
      providers: [provideRouter(routingOnly(routes)), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    await RouterTestingHarness.create();
  });

  afterEach(() => {
    subscriptions.unsubscribe();
    router.dispose();
  });

  it('/forbidden resolves to a terminal page instead of the wildcard/default protected page', async () => {
    // Let the current fallback settle so a missing route produces an assertion failure, not a loop.
    auth.grant('VIEW_FULL_USERS_LIST');
    expect(await router.navigateByUrl('/forbidden')).toBeTrue();
    expectTerminalDenial(router);
  });

  it('a denied production route finishes at the real /forbidden destination', async () => {
    auth.grant('VIEW_FULL_USERS_LIST');
    expect(await router.navigateByUrl('/audit')).toBeTrue();
    expectTerminalDenial(router);
  });

  it('permission denial terminates without cycling through the wildcard and another protected page', fakeAsync(() => {
    let settled = false;
    let escapedLoop = false;
    let forbiddenStarts = 0;
    const errors: unknown[] = [];
    subscriptions.add(router.events.subscribe((event) => {
      if (!(event instanceof NavigationStart) || event.url !== '/forbidden') return;
      forbiddenStarts += 1;
      // Bound an actual redirect cycle by navigation events rather than a timeout.
      if (forbiddenStarts === 2) {
        escapedLoop = true;
        void router.navigateByUrl('/session/sign-in').catch((error: unknown) => errors.push(error));
      }
    }));
    void router.navigateByUrl('/audit').then(
      () => (settled = true),
      (error: unknown) => { errors.push(error); settled = true; },
    );
    flushMicrotasks();

    expect(errors).toEqual([]);
    expect(settled).withContext('denied navigation must finish').toBeTrue();
    expect(escapedLoop).withContext('a second /forbidden attempt exposes a redirect cycle').toBeFalse();
    expect(forbiddenStarts).toBe(1);
    expectTerminalDenial(router);
  }));
});

describe('audit route permission contract', () => {
  let auth: RouteSession;
  let router: Router;

  beforeEach(async () => {
    auth = new RouteSession();
    TestBed.configureTestingModule({
      providers: [provideRouter(policyRoutes(['audit'])), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    await RouterTestingHarness.create();
  });

  afterEach(() => router.dispose());

  it('VIEW_AUDIT_LOG grants navigation to /audit', async () => {
    auth.grant('VIEW_AUDIT_LOG');
    expect(await router.navigateByUrl('/audit')).toBeTrue();
    expect(router.url).toBe('/audit');
    expect(router.routerState.snapshot.root.firstChild?.firstChild?.routeConfig?.path).toBe('audit');
  });

  it('VIEW_FULL_ROLES_LIST alone does not grant audit-page access', async () => {
    auth.grant('VIEW_FULL_ROLES_LIST');
    expect(await router.navigateByUrl('/audit')).toBeTrue();
    expectTerminalDenial(router);
  });
});

const orderRoutes = [
  { url: '/orders/order/42', path: 'orders/order/:orderId' },
  { url: '/orders/order/42/11', path: 'orders/order/:orderId/:userId' },
];

for (const { url, path } of orderRoutes) {
  describe(`order-details route permission contract: ${url}`, () => {
    let auth: RouteSession;
    let router: Router;

    beforeEach(async () => {
      auth = new RouteSession();
      TestBed.configureTestingModule({
        providers: [provideRouter(policyRoutes([path])), { provide: AuthService, useValue: auth }],
      });
      router = TestBed.inject(Router);
      await RouterTestingHarness.create();
    });

    afterEach(() => router.dispose());

    for (const operation of ['VIEW_ORDER', 'EDIT_ORDER']) {
      it(`${operation} grants navigation to ${url}`, async () => {
        auth.grant(operation);
        expect(await router.navigateByUrl(url)).toBeTrue();
        expect(router.url).toBe(url);
        expect(router.routerState.snapshot.root.firstChild?.firstChild?.paramMap.get('orderId')).toBe('42');
      });
    }

    it(`neither VIEW_ORDER nor EDIT_ORDER permits navigation to ${url}`, async () => {
      expect(await router.navigateByUrl(url)).toBeTrue();
      expectTerminalDenial(router);
    });
  });
}

describe('order-details navigation through the full production configuration', () => {
  let auth: RouteSession;
  let router: Router;

  beforeEach(async () => {
    auth = new RouteSession();
    // A missing /forbidden route can settle at /users without hiding a details-policy failure.
    auth.grant('VIEW_FULL_USERS_LIST');
    TestBed.configureTestingModule({
      providers: [provideRouter(routingOnly(routes)), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    await RouterTestingHarness.create();
  });

  afterEach(() => router.dispose());

  for (const { url } of orderRoutes) {
    for (const operation of ['VIEW_ORDER', 'EDIT_ORDER']) {
      it(`${operation} reaches ${url} without an orders-list permission`, async () => {
        auth.grant(operation);
        expect(await router.navigateByUrl(url)).toBeTrue();
        expect(router.url).withContext('an earlier list-route guard must not deny the details URL').toBe(url);
      });
    }
  }
});
