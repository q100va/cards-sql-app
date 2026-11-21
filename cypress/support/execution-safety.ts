import { API_URL, FRONTEND_URL, assertApiRequest, assertFrontend, assertOrigins,
  assertSpec, assertVisit, blockedHosts, resolveMode } from '../safety/policy.mjs';

const mode = resolveMode(Cypress.env('E2E_MODE'), Cypress.env('USE_STUBS'));
assertOrigins(Cypress.config('baseUrl'), Cypress.env('API_URL'));
assertSpec(mode, Cypress.spec.relative);

const approvedWindows = new WeakSet<Window>();
const approvers = new WeakMap<Window, (identity: unknown) => void>();
Cypress.on('window:before:load', (win) => {
  if (win.location.href === 'about:blank') return;
  approvedWindows.delete(win);
  assertVisit(win.location.href);
  let approve = approvers.get(win);
  if (!approve) {
    approve = (identity: unknown) => {
      assertFrontend(identity);
      approvedWindows.add(win);
    };
    approvers.set(win, approve);
  }
  if (Object.getOwnPropertyDescriptor(win, '__approveE2EFrontend')?.value !== approve) {
    Object.defineProperty(win, '__approveE2EFrontend', { value: approve });
  }
});
Cypress.on('window:load', (win) => {
  if (win.location.href !== 'about:blank' && !approvedWindows.has(win)) {
    throw new Error('Use npm run start:e2e: the served frontend did not complete the compiled-environment handshake.');
  }
});

Cypress.Commands.overwrite('visit', (originalFn, ...args: unknown[]) => {
  const options = typeof args[0] === 'string'
    ? { ...(args[1] as Partial<Cypress.VisitOptions> | undefined), url: args[0] }
    : args[0] as Partial<Cypress.VisitOptions> & { url: string };
  if (!options || typeof options.url !== 'string') throw new Error('An explicit E2E visit URL is required.');
  if (options.method && options.method !== 'GET') throw new Error('E2E visits must be non-mutating GET requests.');
  return originalFn({ ...options, url: assertVisit(options.url) });
});

Cypress.Commands.overwrite('request', (originalFn, ...args: unknown[]) => {
  let options: Partial<Cypress.RequestOptions>;
  if (typeof args[0] === 'string') {
    options = typeof args[1] === 'string' && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i.test(args[0])
      ? { method: args[0] as Cypress.HttpMethod, url: args[1], body: args[2] as Cypress.RequestBody }
      : { url: args[0], body: args[1] as Cypress.RequestBody };
  } else {
    options = args[0] as Partial<Cypress.RequestOptions>;
  }
  if (!options || typeof options.url !== 'string') throw new Error('An explicit E2E API request URL is required.');
  const url = assertApiRequest(mode, options.url);
  return cy.task('e2e:assertBackend', null, { log: false }).then(() => originalFn({
    ...options, url, followRedirect: false,
    headers: { ...options.headers, 'x-e2e-run-id': Cypress.env('E2E_RUN_ID') },
  }));
});

beforeEach(() => {
  resolveMode(Cypress.env('E2E_MODE'), Cypress.env('USE_STUBS'));
  assertOrigins(Cypress.config('baseUrl'), Cypress.env('API_URL'));
  if (Cypress.env('E2E_MODE') !== mode || Cypress.config('blockHosts') !== blockedHosts(mode)) {
    throw new Error('E2E execution safety configuration cannot be overridden by a suite.');
  }
  cy.task('e2e:assertBackend', null, { log: false });
  if (mode === 'stub') {
    // Registered before scenario routes, so it runs only if no stub replies.
    cy.intercept('**', (req) => {
      const url = new URL(req.url);
      if (url.origin === API_URL || url.pathname.startsWith('/api/')) {
        req.destroy();
        throw new Error('Unhandled API request in stub mode. Add an explicit scenario stub.');
      }
    });
  }
  cy.intercept({ url: '**', middleware: true }, (req) => {
    const url = new URL(req.url);
    if (url.origin === FRONTEND_URL && !url.pathname.startsWith('/api/')) return;
    if (url.origin !== API_URL || !url.pathname.startsWith('/api/')) {
      if (url.pathname.startsWith('/api/') || ['xhr', 'fetch'].includes(req.resourceType)) {
        req.destroy();
        throw new Error('Application request targets a non-approved E2E API origin.');
      }
      return; // Other foreign assets are denied by the proxy's blockHosts policy.
    }
    if (mode === 'live') req.headers['x-e2e-run-id'] = Cypress.env('E2E_RUN_ID');
  });
});
