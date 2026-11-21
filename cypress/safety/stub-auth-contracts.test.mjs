import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { firstValueFrom, of } from 'rxjs';
import * as policy from './policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const minimatchModule = require('minimatch');
const match = typeof minimatchModule === 'function' ? minimatchModule : minimatchModule.minimatch;

function harness({ mode = 'stub', spec = 'cypress/e2e/permissions.cy.ts' } = {}) {
  const routes = [], requests = [], waits = [], tasks = [], roots = [], suites = [], diagnostics = [];
  const commands = {}, overwrites = {}, modules = new Map();
  const scope = { name: 'root', hooks: roots, tests: [] };
  let currentScope = scope, pathname = '/session/sign-in', currentUser, granted = [], networkCalls = 0;
  const fields = {}, aliases = new Map(), consumed = new Map();
  const settings = { baseUrl: policy.FRONTEND_URL, blockHosts: policy.blockedHosts(mode) };
  const environment = { E2E_MODE: mode, USE_STUBS: mode === 'stub' ? '1' : '0', API_URL: policy.API_URL, E2E_RUN_ID: '' };
  const document = { activeElement: null, createElement: () => ({}), head: { appendChild() {} } };

  function matches(route, method, url) {
    const matcher = route.matcher;
    return route.remaining > 0 && (!matcher.method || matcher.method.toUpperCase() === method) &&
      (!matcher.url || match(url.href, matcher.url, { matchBase: true })) &&
      (!matcher.pathname || match(url.pathname, matcher.pathname)) &&
      (!matcher.query || Object.entries(matcher.query).every(([key, value]) => url.searchParams.get(key) === String(value)));
  }
  function normalize(reply) {
    if (reply.fixture) return { statusCode: reply.statusCode ?? 200,
      body: JSON.parse(readFileSync(resolve(root, 'cypress/fixtures', reply.fixture), 'utf8')) };
    return Object.keys(reply).some((key) => ['statusCode', 'body', 'headers', 'delay'].includes(key))
      ? { ...reply, statusCode: reply.statusCode ?? 200 } : { statusCode: 200, body: reply };
  }
  function send(method, rawUrl, body) {
    const url = new URL(rawUrl, policy.API_URL);
    const matching = [...routes.filter((route) => route.matcher.middleware),
      ...routes.filter((route) => !route.matcher.middleware).reverse()];
    let response;
    const seen = [];
    const req = { method, url: url.href, body, query: Object.fromEntries(url.searchParams), headers: {}, resourceType: 'xhr',
      reply(value) { response = normalize(value); },
      destroy() { throw new Error('Request destroyed by C1 safety guard'); },
      continue() { throw new Error('Unexpected real API continuation'); },
    };
    for (const route of matching) {
      if (!matches(route, method, url)) continue;
      route.remaining--;
      if (route.alias) seen.push(route.alias);
      if (typeof route.handler === 'function') route.handler(req);
      else if (route.handler) response = normalize(route.handler);
      if (response) break;
    }
    if (!response) throw new Error(`Unhandled isolated request: ${method} ${url.pathname}`);
    const record = { request: req, response };
    requests.push(record);
    for (const alias of [...seen, ...(req.alias ? [req.alias] : [])]) {
      if (!aliases.has(alias)) aliases.set(alias, []);
      aliases.get(alias).push(record);
    }
    return response;
  }
  const endpoint = (path) => `${policy.API_URL}/api/${path}`;
  function loadUsers() {
    send('GET', endpoint('roles/get-roles-names-list'));
    send('GET', endpoint('toponyms/get-toponyms-list?typeOfToponym=countries'));
    send('POST', endpoint('users/get-users'), {});
  }
  function permissions() {
    const result = send('GET', endpoint('auth/permissions'));
    assert.equal(result.statusCode, 200);
    granted = result.body.data;
  }
  function show(path) {
    pathname = path === '/' ? '/users' : path;
    if (pathname === '/users') {
      assert.ok(granted.some((permission) => permission.access &&
        ['VIEW_FULL_USERS_LIST', 'VIEW_LIMITED_USERS_LIST'].includes(permission.operation)), 'Users landing permission must be explicit');
      loadUsers();
    }
    if (pathname === '/roles') send('GET', endpoint('roles/get-roles'));
    if (pathname === '/regions') {
      send('GET', endpoint('toponyms/get-toponyms-list?typeOfToponym=countries'));
      send('GET', endpoint('toponyms/get-toponyms-list?typeOfToponym=regions&ids=143'));
      send('GET', endpoint('toponyms/toponyms?type=region'));
    }
  }
  function submit() {
    const result = send('POST', endpoint('session/sign-in'), { userName: fields['[data-cy="user-input"]'], password: fields['[data-cy="pass-input"]'] });
    if (result.statusCode === 200) {
      currentUser = result.body.data.user;
      permissions();
      show('/users');
    }
    return result;
  }

  class Chain {
    constructor(value, selector) { this.value = value; this.selector = selector; }
    then(callback) {
      const next = callback(this.value);
      return next instanceof Chain ? next : new Chain(next === undefined ? this.value : next);
    }
    should() { return this; } // DOM checks are not executed or claimed by this harness.
    and() { return this; }
    scrollIntoView() { return this; }
    click() {
      if (this.selector === '[data-cy="submit-btn"]') submit();
      if (this.selector?.includes('nav-roles')) show('/roles');
      if (this.selector?.includes('nav-regions')) show('/regions');
      return this;
    }
    focus() { document.activeElement = this.value?.[0]; return this; }
    type(value) { fields[this.selector] = value === '{selectall}{backspace}' ? '' : value; return this; }
    its(path) { return new Chain(path.split('.').reduce((value, key) => value?.[key], this.value)); }
  }

  const builtins = {
    intercept(...args) {
      const matcher = typeof args[0] === 'object' ? args[0]
        : args.length > 2 ? { method: args[0], url: args[1] } : { url: args[0] };
      const route = { matcher, handler: args.at(-1) === args[0] ? undefined : args.at(-1), remaining: matcher.times ?? Infinity };
      // A two-argument method/path spy has no handler.
      if (args.length === 2 && typeof args[0] === 'string' && /^(GET|POST)$/.test(args[0])) {
        route.matcher = { method: args[0], url: args[1] }; route.handler = undefined;
      }
      routes.push(route);
      return { as: (alias) => { route.alias = alias; return new Chain(undefined); } };
    },
    visit(options) {
      const path = new URL(options.url, policy.FRONTEND_URL).pathname;
      const result = send('POST', endpoint('session/refresh'));
      if (result.statusCode === 200) {
        currentUser = send('GET', endpoint('session/me')).body.data;
        permissions();
      }
      if (path === '/session/sign-in') pathname = path;
      else show(path);
      return new Chain(undefined);
    },
    request() { networkCalls++; throw new Error('Real request forbidden in isolated harness'); },
    wait(alias) {
      const name = alias.slice(1), index = consumed.get(name) ?? 0;
      const record = aliases.get(name)?.[index];
      assert.ok(record, `Expected intercepted request for ${alias}`);
      consumed.set(name, index + 1); waits.push(name); return new Chain(record);
    },
    task(name) { assert.equal(name, 'e2e:assertBackend'); tasks.push(name); return new Chain(true); },
    fixture: (name) => new Chain(JSON.parse(readFileSync(resolve(root, 'cypress/fixtures', name), 'utf8'))),
    get: (selector) => new Chain({ 0: { ownerDocument: document } }, selector),
    wrap: (value) => new Chain(value), document: () => new Chain(document), location: () => new Chain(pathname),
  };
  const cy = new Proxy({}, { get: (_target, name) => (...args) => {
    if (commands[name]) return commands[name](...args);
    if (overwrites[name]) return overwrites[name](builtins[name], ...args);
    assert.equal(typeof builtins[name], 'function', `Unexpected command: ${String(name)}`);
    return builtins[name](...args);
  } });
  const Cypress = {
    env: (key) => environment[key], config: (key) => settings[key], spec: { relative: spec }, on() {},
    Commands: { add: (name, fn) => { commands[name] = fn; }, overwrite: (name, fn) => { overwrites[name] = fn; } },
  };
  function load(filename) {
    filename = resolve(root, filename);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const script = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireModule = (name) => {
      if (name === 'rxjs' || name === 'zod') return require(name);
      const dependency = resolve(dirname(filename), name);
      if (dependency === resolve(root, 'cypress/safety/policy.mjs')) return policy;
      const candidate = dependency.endsWith('.js') ? dependency.slice(0, -3) + '.ts'
        : dependency.endsWith('.ts') ? dependency : dependency + '.ts';
      const local = relative(root, candidate);
      assert.ok(!isAbsolute(local) && !local.startsWith('..') &&
        (local.startsWith('cypress') || local.startsWith('shared') || local.replaceAll('\\', '/') === 'src/app/utils/validate-response.ts'));
      assert.ok(existsSync(candidate), `Unexpected dependency: ${name}`);
      return load(candidate);
    };
    vm.runInNewContext(script, { exports, require: requireModule, Cypress, cy, document,
      console: { log() {}, error: (...args) => diagnostics.push(args) },
      beforeEach: (fn) => currentScope.hooks.push(fn), before() {}, after() {}, afterEach() {},
      describe: (name, fn) => {
        const previous = currentScope;
        const suite = { name, hooks: [], tests: [] }; suites.push(suite); currentScope = suite;
        fn(); currentScope = previous;
      },
      it: (name, callback) => currentScope.tests.push({ name, callback }),
      URL, WeakSet, WeakMap,
    });
    return exports;
  }
  load('cypress/support/e2e.ts');
  return { routes, requests, waits, tasks, diagnostics, cy, send, submit, load, suites, environment, commands,
    start: () => roots.forEach((fn) => fn()),
    runSetup: (name) => suites.find((suite) => suite.name === name).hooks.forEach((fn) => fn()),
    get granted() { return granted; }, get user() { return currentUser; }, get pathname() { return pathname; },
    get networkCalls() { return networkCalls; }, endpoint,
  };
}

const setupCases = [
  ['cypress/e2e/permissions.cy.ts', 'Limited role — navigation & guards'],
  ['cypress/e2e/permissions.cy.ts', 'Admin — navigation & actions'],
  ['cypress/e2e/permissions.cy.ts', 'Auth flows — 401 refresh retry & 403 no logout'],
  ['cypress/e2e/roles.cy.ts', 'Roles — E2E (stubbed or live)'],
  ['cypress/e2e/toponyms/regions.stub.cy.ts', 'Toponyms (stub): Regions list'],
  ['cypress/e2e/toponyms/toponyms-list.stub.cy.ts', 'Toponyms: Regions list'],
];
for (const [spec, suite] of setupCases) {
  test(`${suite}: permissions and startup data precede authentication/navigation`, () => {
    const h = harness({ spec });
    h.load(spec); h.start(); h.runSetup(suite);
    const startup = h.requests.find((record) => record.request.url.endsWith('/session/refresh'));
    assert.equal(startup.response.statusCode, 401);
    const signin = h.requests.findIndex((record) => record.request.url.endsWith('/session/sign-in'));
    const permission = h.requests.findIndex((record) => record.request.url.endsWith('/auth/permissions'));
    assert.ok(signin >= 0 && permission > signin);
    assert.ok(h.waits.indexOf('perms') > h.waits.indexOf('signIn'));
    assert.equal(h.networkCalls, 0);
    assert.ok(h.requests.some((record) => record.request.url.endsWith('/users/get-users')));
  });
}

test('standalone sign-in startup has explicit permissions before successful submission', () => {
  const h = harness({ spec: 'cypress/e2e/sign-in.cy.ts' });
  h.load('cypress/e2e/sign-in.cy.ts'); h.start(); h.runSetup('Sign In page (stub/live aware)');
  h.cy.intercept('POST', '**/api/session/sign-in', { statusCode: 200, body: { data: {
    user: { id: 123, userName: 'alice', firstName: 'Alice', lastName: 'Smith', roleName: 'ADMIN', roleId: 999 },
    token: 'tok_1234567890', expiresIn: 900,
  } } });
  assert.equal(h.submit().statusCode, 200);
  assert.equal(h.pathname, '/users');
  assert.equal(h.networkCalls, 0);
});

test('refresh uses one initial 401, then successful refreshes; later scenario overrides remain authoritative', () => {
  const h = harness(); h.load(setupCases[0][0]); h.start(); h.runSetup(setupCases[0][1]);
  const { refreshRespSchema, signInRespSchema, permissionRespSchema } = h.load('shared/schemas/auth.schema.ts');
  const first = h.requests.find((record) => record.request.url.endsWith('/session/refresh'));
  assert.equal(first.response.statusCode, 401);
  assert.equal(h.cy.wait('@refreshInit').value.response.statusCode, 401);
  for (let n = 0; n < 3; n++) {
    const result = h.send('POST', h.endpoint('session/refresh'));
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.data.accessToken, 'tok_ref_1234567890');
    assert.ok(refreshRespSchema.safeParse(result.body.data).success);
  }
  assert.equal(h.cy.wait('@refreshOk').value.response.statusCode, 200);
  assert.ok(signInRespSchema.safeParse(h.requests.find((record) => record.request.url.endsWith('/session/sign-in')).response.body.data).success);
  assert.ok(permissionRespSchema.safeParse(h.granted).success);
  h.cy.intercept('POST', '**/api/session/refresh', { statusCode: 200,
    body: { data: { accessToken: 'acc_new_token', expiresIn: 900 } } });
  assert.equal(h.send('POST', h.endpoint('session/refresh')).body.data.accessToken, 'acc_new_token');
  assert.equal(h.networkCalls, 0);
});

test('scenario-specific protected 401/retry and 403 responses supersede startup defaults', () => {
  const h = harness(); h.load(setupCases[2][0]); h.start(); h.runSetup(setupCases[2][1]);
  let first = true;
  h.cy.intercept('GET', '**/api/roles/get-roles-names-list', (req) => {
    req.reply(first ? { statusCode: 401, body: { code: 'ERRORS.UNAUTHORIZED' } }
      : { statusCode: 200, body: { data: [] } });
    first = false;
  });
  assert.equal(h.send('GET', h.endpoint('roles/get-roles-names-list')).statusCode, 401);
  assert.equal(h.send('GET', h.endpoint('roles/get-roles-names-list')).statusCode, 200);
  h.cy.intercept('GET', '**/api/roles/get-roles-names-list', { statusCode: 403, body: { code: 'ERRORS.FORBIDDEN' } });
  assert.equal(h.send('GET', h.endpoint('roles/get-roles-names-list')).statusCode, 403);
  assert.equal(h.networkCalls, 0);
});

test('Users landing payload passes the actual strict validator as an empty successful list', async () => {
  const h = harness(); h.load(setupCases[0][0]); h.start(); h.runSetup(setupCases[0][1]);
  const { usersSchema } = h.load('shared/schemas/user.schema.ts');
  const { validateResponse, ValidationError } = h.load('src/app/utils/validate-response.ts');
  const response = h.requests.find((record) => record.request.url.endsWith('/users/get-users')).response;
  const validated = await firstValueFrom(of(response.body).pipe(validateResponse(usersSchema)));
  assert.equal(response.statusCode, 200);
  assert.equal(validated.data.list.length, 0);
  assert.equal(validated.data.length, 0);
  assert.deepEqual(Object.keys(validated.data).sort(), ['length', 'list']);
  assert.equal(h.diagnostics.length, 0, 'Empty list must not be a validation-error fallback');
  await assert.rejects(firstValueFrom(of({ data: { users: [], length: 0 } }).pipe(validateResponse(usersSchema))), ValidationError);
  await assert.rejects(firstValueFrom(of({ data: { list: [], length: 0, extra: true } }).pipe(validateResponse(usersSchema))), ValidationError);
});

test('startup country/role replies use the current endpoint contracts without masking Region fixtures', () => {
  const h = harness(); h.start();
  const { toponymNamesListSchema } = h.load('shared/schemas/toponym.schema.ts');
  const { rolesNamesListSchema } = h.load('shared/schemas/role.schema.ts');
  assert.equal(toponymNamesListSchema.parse(h.send('GET', h.endpoint('toponyms/get-toponyms-list?typeOfToponym=countries')).body.data).length, 0);
  assert.equal(rolesNamesListSchema.parse(h.send('GET', h.endpoint('roles/get-roles-names-list')).body.data).length, 0);
  const regions = harness({ spec: setupCases[4][0] });
  regions.load(setupCases[4][0]); regions.start(); regions.runSetup(setupCases[4][1]);
  const countries = regions.send('GET', regions.endpoint('toponyms/get-toponyms-list?typeOfToponym=countries')).body.data;
  assert.equal(countries[0].id, 143);
  assert.equal(countries.length, 1);
  assert.ok(regions.granted.some((permission) => permission.operation === 'VIEW_LIMITED_USERS_LIST' && permission.access));
  assert.ok(!regions.granted.some((permission) => ['ADD_NEW_USER', 'ALL_OPS_USERS'].includes(permission.operation)));
});

test('Admin role page has explicit fixture data and Limited permissions retain their denials', () => {
  const h = harness(); h.load(setupCases[1][0]); h.start(); h.runSetup(setupCases[1][1]);
  const response = h.send('GET', h.endpoint('roles/get-roles'));
  const { rolesListSchema } = h.load('shared/schemas/role.schema.ts');
  assert.equal(rolesListSchema.parse(response.body.data).roles.length, 2);
  const limited = harness(); limited.load(setupCases[0][0]); limited.start(); limited.runSetup(setupCases[0][1]);
  for (const operation of ['ALL_OPS_ROLES', 'VIEW_FULL_ROLES_LIST', 'ADD_NEW_USER', 'EDIT_USER', 'DELETE_USER', 'DELETE_ROLE']) {
    assert.equal(limited.granted.find((permission) => permission.operation === operation).access, false);
  }
});

test('unhandled, wrong-query, foreign API and direct requests still fail closed under C1', () => {
  const h = harness(); h.start();
  for (const path of ['unrelated/data', 'toponyms/get-toponyms-list?typeOfToponym=regions', 'files/download/template-regions.xlsx']) {
    assert.throws(() => h.send('GET', h.endpoint(path)));
  }
  assert.throws(() => h.send('POST', h.endpoint('users/create-user'), { userName: 'synthetic' }));
  h.cy.intercept('GET', '**/api/auth/permissions', { statusCode: 200, body: { data: [] } });
  assert.throws(() => h.send('GET', 'https://production.onrender.com/api/auth/permissions'));
  assert.throws(() => h.cy.request('POST', h.endpoint('session/sign-in'), {}));
  assert.equal(h.networkCalls, 0);
});

test('stub login without an explicit scenario permission response fails instead of using a real backend', () => {
  const h = harness(); h.start();
  assert.throws(() => h.cy.login({ noVisit: true }));
  assert.equal(h.networkCalls, 0);
});

test('startup defaults add no success stubs in live mode', () => {
  const h = harness({ mode: 'live', spec: 'cypress/e2e/roles.cy.ts' }); h.start();
  assert.equal(h.routes.length, 1, 'Only the existing C1 middleware should be registered');
  assert.equal(h.routes[0].matcher.middleware, true);
  assert.equal(h.networkCalls, 0);
});
