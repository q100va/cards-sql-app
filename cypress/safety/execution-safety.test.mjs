import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { API_URL, FRONTEND_URL, SPECS, assertApiRequest, assertDatabaseClient, assertFrontend,
  assertOrigins, assertSpec, assertVisit, blockedHosts, resolveMode, validateDatabase } from './policy.mjs';
import * as policy from './policy.mjs';
import { configureCypress, identity, loadEnvironment, verifyBackend, withApprovedDatabase } from './node.mjs';
import { backendHandler, startBackend } from './backend.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const target = 'postgresql://e2e_runner@127.0.0.1:5432/e2e_fixture';
const fixture = () => ({
  E2E_MODE: 'live', NODE_ENV: 'test', DB_USERNAME: 'e2e_runner', DB_PASSWORD: 'synthetic-test-value',
  DB_LINK_TEST: '127.0.0.1:5432/e2e_fixture', E2E_DB_ALLOWLIST: JSON.stringify([target]),
  E2E_RESET_AUTHORIZATION: `RESET ${target}`, E2E_RUN_ID: 'a'.repeat(32),
});

function environment(t, changes = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'cards-e2e-safety-'));
  const filename = join(directory, 'isolated.env');
  const values = { ...fixture(), ...changes };
  writeFileSync(filename, Object.entries(values).filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}='${value}'`).join('\n'));
  t.after(() => { unlinkSync(filename); rmdirSync(directory); });
  return { E2E_MODE: 'live', E2E_ENV_FILE: filename };
}

function client(context) {
  return {
    config: { ...context.database, username: context.database.username, password: context.env.DB_PASSWORD },
    options: {}, getDialect: () => 'postgres',
  };
}

function config(mode) {
  return { projectRoot: root, baseUrl: FRONTEND_URL, supportFile: resolve(root, 'cypress/support/e2e.ts'),
    testIsolation: true, env: { USE_STUBS: mode === 'stub' ? '1' : '0', API_URL },
    specPattern: ['cypress/e2e/**/*.cy.ts'], excludeSpecPattern: [], blockHosts: null };
}

test('mode selection is explicit and conflicting flags fail closed', () => {
  assert.equal(resolveMode('stub', 1), 'stub');
  assert.equal(resolveMode('live', '0'), 'live');
  for (const args of [[undefined, '1'], ['stub', '0'], ['live', '1'], ['production', '0'], ['live', true]]) {
    assert.throws(() => resolveMode(...args));
  }
});

test('stub/live collections contain all existing specs with no cross-mode files', () => {
  assert.equal(SPECS.stub.length, 5);
  assert.equal(SPECS.live.length, 5);
  assert.equal(new Set([...SPECS.stub, ...SPECS.live]).size, 8);
  for (const file of SPECS.stub) { assertSpec('stub', file); assert.ok(!file.includes('.live.')); }
  for (const file of SPECS.live) { assertSpec('live', file); assert.ok(!file.includes('.stub.')); }
  assert.throws(() => assertSpec('live', 'cypress/e2e/permissions.cy.ts'));
  assert.throws(() => assertSpec('stub', SPECS.live[2]));
  assert.throws(() => assertSpec('stub', 'cypress/e2e/new-unclassified.cy.ts'));
  assertSpec('stub', SPECS.stub[0].replaceAll('/', '\\'));
});

const unsafe = [
  ['stub database operation', { E2E_MODE: 'stub' }],
  ['production environment', { NODE_ENV: 'production' }],
  ['missing test environment', { NODE_ENV: undefined }],
  ['missing authorization', { E2E_RESET_AUTHORIZATION: undefined }],
  ['wrong target authorization', { E2E_RESET_AUTHORIZATION: 'RESET another-database' }],
  ['missing allowlist', { E2E_DB_ALLOWLIST: undefined }],
  ['empty allowlist', { E2E_DB_ALLOWLIST: '[]' }],
  ['malformed allowlist', { E2E_DB_ALLOWLIST: '{' }],
  ['wildcard allowlist', { E2E_DB_ALLOWLIST: '["*"]' }],
  ['unapproved database', { E2E_DB_ALLOWLIST: JSON.stringify([target.replace('e2e_fixture', 'other')]) }],
  ['duplicate allowlist', { E2E_DB_ALLOWLIST: JSON.stringify([target, target]) }],
  ['Neon even if allowlisted', { DB_LINK_TEST: 'ep-production.neon.tech:5432/e2e_fixture',
    E2E_DB_ALLOWLIST: '["postgresql://e2e_runner@ep-production.neon.tech:5432/e2e_fixture"]' }],
  ['Render database', { DB_LINK_TEST: 'production.onrender.com:5432/e2e_fixture' }],
  ['Vercel database', { DB_LINK_TEST: 'production.vercel.app:5432/e2e_fixture' }],
  ['unapproved remote IP', { DB_LINK_TEST: '192.0.2.1:5432/e2e_fixture' }],
  ['ambiguous IPv4', { DB_LINK_TEST: '127.1:5432/e2e_fixture' }],
  ['missing port', { DB_LINK_TEST: 'localhost/e2e_fixture' }],
  ['connection options', { DB_LINK_TEST: '127.0.0.1:5432/e2e_fixture?host=production.neon.tech' }],
  ['system database', { DB_LINK_TEST: '127.0.0.1:5432/postgres' }],
  ['production-named database', { DB_LINK_TEST: '127.0.0.1:5432/production' }],
  ['conflicting production URL', { DATABASE_URL: 'postgresql://synthetic.invalid/db' }],
  ['conflicting non-test database', { DB_LINK: 'production.neon.tech/db' }],
  ['conflicting libpq host', { PGHOST: 'production.neon.tech' }],
  ['missing password', { DB_PASSWORD: undefined }],
  ['missing username', { DB_USERNAME: undefined }],
  ['missing run identity', { E2E_RUN_ID: undefined }],
  ['conflicting stub flag', { CYPRESS_USE_STUBS: '1' }],
  ['wrong backend port', { PORT: '8081' }],
  ['production frontend', { CYPRESS_BASE_URL: 'https://production.vercel.app' }],
  ['production API', { CYPRESS_API_URL: 'https://production.onrender.com' }],
];
for (const [name, changes] of unsafe) {
  test(`rejects ${name} before loading or connecting any database`, async (t) => {
    const env = environment(t, changes);
    let imports = 0;
    let connects = 0;
    await assert.rejects(withApprovedDatabase({ env, authorizeReset: true,
      load: async () => { imports++; return { sequelize: {} }; },
      run: async () => { connects++; },
    }));
    assert.equal(imports, 0);
    assert.equal(connects, 0);
  });
}

test('missing/contradictory environment sources are rejected without a loader call', async (t) => {
  const env = environment(t);
  const other = environment(t);
  const cases = [
    { E2E_MODE: 'live' },
    { ...env, NODE_ENV: 'production' },
    { ...env, DB_LINK_TEST: 'production.neon.tech:5432/db' },
    { ...env, DOTENV_CONFIG_PATH: other.E2E_ENV_FILE },
  ];
  for (const bad of cases) {
    let loaded = false;
    await assert.rejects(withApprovedDatabase({ env: bad, authorizeReset: true,
      load: async () => { loaded = true; return {}; }, run: async () => {},
    }));
    assert.equal(loaded, false);
  }
});

test('approved environment is installed before load and exact client identity is checked before use', async (t) => {
  const env = environment(t);
  const expected = loadEnvironment(env, true);
  const order = [];
  const result = await withApprovedDatabase({ env, authorizeReset: true,
    load: async () => {
      assert.equal(env.NODE_ENV, 'test');
      assert.equal(env.DOTENV_CONFIG_PATH, expected.filename);
      order.push('load');
      return { sequelize: client(expected) };
    },
    run: async () => { order.push('use'); return 'fake-success'; },
  });
  assert.equal(result, 'fake-success');
  assert.deepEqual(order, ['load', 'use']);
  for (const change of [{ host: 'production.neon.tech' }, { port: 5433 }, { database: 'other' }, { username: 'other' }, { password: 'other' }]) {
    const wrong = client(expected);
    Object.assign(wrong.config, change);
    assert.throws(() => assertDatabaseClient(wrong, expected.database, expected.env.DB_PASSWORD));
  }
  const replicated = client(expected);
  replicated.options.replication = { read: [] };
  assert.throws(() => assertDatabaseClient(replicated, expected.database, expected.env.DB_PASSWORD));
});

test('a cached/wrong database client is never used', async (t) => {
  const env = environment(t);
  const loaded = client(loadEnvironment(env, true));
  loaded.config.database = 'wrong';
  let used = false;
  await assert.rejects(withApprovedDatabase({ env, authorizeReset: true,
    load: async () => ({ sequelize: loaded }), run: async () => { used = true; },
  }));
  assert.equal(used, false);
});

test('reset module rejects unsafe CLI/task entry without importing a database singleton', async () => {
  const savedMode = process.env.E2E_MODE;
  process.env.E2E_MODE = 'stub';
  try {
    await assert.rejects(import('../../server/scripts/reset-test-db.mjs'), /forbidden outside live E2E/);
  } finally {
    if (savedMode === undefined) delete process.env.E2E_MODE;
    else process.env.E2E_MODE = savedMode;
  }
});

test('stub configuration overrides broad CLI collection and rejects reset without network activity', async () => {
  const events = {};
  let network = 0;
  const actual = await configureCypress((name, handler) => { events[name] = handler; }, config('stub'),
    { E2E_MODE: 'stub' }, async () => { network++; throw new Error('Network forbidden'); });
  assert.deepEqual(actual.specPattern, [...SPECS.stub]);
  assert.equal(actual.blockHosts, blockedHosts('stub'));
  await assert.rejects(events.task['db:reset'](), /forbidden in stub/);
  assert.throws(() => events['before:run']({ specs: [{ relative: SPECS.live[2] }] }));
  await assert.rejects(events['before:spec']({ relative: SPECS.live[2] }));
  assert.equal(network, 0);
});

test('unsafe live config fails before network verification', async () => {
  let network = 0;
  await assert.rejects(configureCypress(() => {}, config('live'), { E2E_MODE: 'live' }, async () => { network++; }));
  assert.equal(network, 0);
  for (const changes of [{ baseUrl: 'https://production.vercel.app' }, { supportFile: false }, { testIsolation: false },
    { env: { USE_STUBS: '0', API_URL: 'https://production.onrender.com' } }]) {
    await assert.rejects(configureCypress(() => {}, { ...config('stub'), ...changes }, { E2E_MODE: 'stub' }));
  }
});

test('live configuration requires an exact backend identity, with redirects disabled', async (t) => {
  const env = environment(t);
  const context = loadEnvironment(env, true);
  const expected = identity(context);
  let requests = 0;
  const request = async (url, options) => {
    assert.equal(url, `${API_URL}/__e2e/identity`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['x-e2e-run-id'], context.env.E2E_RUN_ID);
    requests++;
    return { status: 200, json: async () => expected };
  };
  const events = {};
  const actual = await configureCypress((name, fn) => { events[name] = fn; }, config('live'), env, request);
  assert.deepEqual(actual.specPattern, [...SPECS.live]);
  assert.equal(actual.env.E2E_RUN_ID, context.env.E2E_RUN_ID);
  assert.equal(actual.env.DB_PASSWORD, undefined);
  await events['before:spec']({ relative: SPECS.live[2] });
  assert.equal(requests, 2);
  for (const bad of [{ ...expected, mode: 'stub' }, { ...expected, databaseFingerprint: 'wrong' },
    { ...expected, apiUrl: 'https://production.onrender.com' }, { ...expected, extra: true }]) {
    await assert.rejects(verifyBackend(context, async () => ({ status: 200, json: async () => bad })));
  }
  await assert.rejects(verifyBackend(context, async () => ({ status: 302 })));
  await assert.rejects(verifyBackend(context, async () => ({ status: 403 })));
});

test('database and run identity changes invalidate an already configured live run', async (t) => {
  const env = environment(t);
  const context = loadEnvironment(env, true);
  const events = {};
  await configureCypress((name, fn) => { events[name] = fn; }, config('live'), env,
    async () => ({ status: 200, json: async () => identity(context) }));
  env.E2E_RUN_ID = 'b'.repeat(32);
  await assert.rejects(events.task['e2e:assertBackend']());
  await assert.rejects(events.task['db:reset']());
});

test('proxy host policy blocks stub API and all foreign/production hosts', () => {
  const require = createRequire(import.meta.url);
  const module = require('minimatch');
  const match = typeof module === 'function' ? module : module.minimatch;
  for (const mode of ['stub', 'live']) {
    const rule = blockedHosts(mode);
    assert.equal(match('localhost:56379', rule), false);
    assert.equal(match('localhost:8080', rule), mode === 'stub');
    for (const host of ['127.0.0.1:8080', 'production.onrender.com', 'production.vercel.app', 'ep-prod.neon.tech', 'example.com']) {
      assert.equal(match(host, rule), true);
    }
  }
});

test('frontend/helper URL policies reject mismatches and production origins', () => {
  assertOrigins(FRONTEND_URL, API_URL);
  assertFrontend({ production: false, frontendUrl: FRONTEND_URL, apiUrl: API_URL });
  assert.equal(assertVisit('/regions'), `${FRONTEND_URL}/regions`);
  assert.equal(assertApiRequest('live', `${API_URL}/api/session/me`), `${API_URL}/api/session/me`);
  assert.throws(() => assertFrontend({ production: true, frontendUrl: FRONTEND_URL, apiUrl: API_URL }));
  for (const origin of ['https://production.onrender.com', 'https://production.vercel.app', 'https://ep-prod.neon.tech', 'http://localhost:8081']) {
    assert.throws(() => assertOrigins(FRONTEND_URL, origin));
    assert.throws(() => assertVisit(origin));
    assert.throws(() => assertApiRequest('live', `${origin}/api/session/me`));
  }
  assert.throws(() => assertApiRequest('stub', `${API_URL}/api/session/me`));
  assert.throws(() => assertApiRequest('live', 'http://user:pass@localhost:8080/api/session/me'));
  assert.throws(() => assertApiRequest('live', `${API_URL}/healthz`));
  assert.throws(() => assertVisit('/api/users/create-user'));
});

test('guarded backend startup rejects unsafe targets before imports/listening/init', async (t) => {
  let imported = 0;
  let listening = 0;
  await assert.rejects(startBackend({ env: environment(t, { DATABASE_URL: 'forbidden' }),
    load: async () => { imported++; }, listen: async () => { listening++; },
  }));
  assert.equal(imported, 0);
  assert.equal(listening, 0);
});

test('guarded backend uses approved client and preserves initialization order with fake dependencies', async (t) => {
  const env = environment(t);
  const context = loadEnvironment(env, true);
  const order = [];
  const server = { close: () => order.push('close') };
  const result = await startBackend({ env,
    load: async () => ({ sequelize: client(context), app: () => {},
      initInfrastructure: async () => order.push('init'), syncAllRolesPermissions: async () => order.push('permissions'),
    }),
    listen: async () => { order.push('listen'); return server; },
  });
  assert.equal(result, server);
  assert.deepEqual(order, ['listen', 'init', 'permissions']);
});

test('backend identity wrapper rejects unauthenticated requests before reaching application routes', (t) => {
  const context = loadEnvironment(environment(t), true);
  let appCalls = 0;
  const handler = backendHandler(() => { appCalls++; }, context);
  const response = () => ({ status: 0, body: '', setHeader() {},
    writeHead(status) { this.status = status; }, end(body) { this.body = body; },
  });
  const denied = response();
  handler({ method: 'POST', url: '/api/users/create-user', headers: {} }, denied);
  assert.equal(denied.status, 403);
  assert.equal(appCalls, 0);
  const accepted = response();
  handler({ method: 'GET', url: '/__e2e/identity', headers: { 'x-e2e-run-id': context.env.E2E_RUN_ID } }, accepted);
  assert.equal(accepted.status, 200);
  assert.deepEqual(JSON.parse(accepted.body), identity(context));
  handler({ method: 'POST', url: '/api/users/create-user', headers: { 'x-e2e-run-id': context.env.E2E_RUN_ID } }, response());
  assert.equal(appCalls, 1);
});

function browserHarness(mode) {
  const callbacks = {};
  const overwrites = {};
  const routes = [];
  const hooks = [];
  const env = { E2E_MODE: mode, USE_STUBS: mode === 'stub' ? '1' : '0', API_URL, E2E_RUN_ID: 'a'.repeat(32) };
  const settings = { baseUrl: FRONTEND_URL, blockHosts: blockedHosts(mode) };
  let verifications = 0;
  const sandbox = { URL, WeakSet, exports: {}, require: () => policy,
    beforeEach: (fn) => hooks.push(fn),
    Cypress: { env: (key) => env[key], config: (key) => settings[key], spec: { relative: SPECS[mode][0] },
      on: (name, fn) => { callbacks[name] = fn; }, Commands: { overwrite: (name, fn) => { overwrites[name] = fn; } },
    },
    cy: { intercept: (matcher, fn) => routes.push({ matcher, fn }),
      task: () => { verifications++; return { then: (fn) => fn() }; },
    },
  };
  const source = readFileSync(resolve(root, 'cypress/support/execution-safety.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return { callbacks, overwrites, routes, hooks, env, settings, verifications: () => verifications };
}

test('browser support blocks real stub requests and foreign visits before original commands', () => {
  const harness = browserHarness('stub');
  let calls = 0;
  const original = () => { calls++; };
  for (const args of [[`${API_URL}/api/session/me`], ['POST', `${API_URL}/api/session/sign-in`, {}], [{ url: `${API_URL}/api/session/me` }]]) {
    assert.throws(() => harness.overwrites.request(original, ...args));
  }
  assert.throws(() => harness.overwrites.visit(original, 'https://production.vercel.app'));
  assert.equal(calls, 0);
  assert.equal(harness.verifications(), 0);
  assert.throws(() => harness.overwrites.visit(original, { url: '/', method: 'POST', body: {} }));
});

test('live request overloads verify backend, preserve payloads, add run identity, and refuse redirects', () => {
  const harness = browserHarness('live');
  const payload = { name: 'synthetic' };
  const seen = [];
  const original = (options) => seen.push(options);
  harness.overwrites.request(original, 'POST', `${API_URL}/api/toponyms/create-toponym`, payload);
  harness.overwrites.request(original, { url: `${API_URL}/api/session/me`, headers: { Authorization: 'fake' }, followRedirect: true, log: false });
  assert.equal(harness.verifications(), 2);
  assert.equal(seen[0].body, payload);
  assert.equal(seen[0].method, 'POST');
  assert.equal(seen[1].headers.Authorization, 'fake');
  assert.equal(seen[1].log, false);
  for (const options of seen) {
    assert.equal(options.followRedirect, false);
    assert.equal(options.headers['x-e2e-run-id'], harness.env.E2E_RUN_ID);
  }
  assert.throws(() => harness.overwrites.request(original, 'https://production.onrender.com/api/session/me'));
});

test('browser middleware rejects foreign APIs before scenario handlers and unmatched stubs fail', () => {
  const harness = browserHarness('stub');
  harness.hooks[0]();
  const middleware = harness.routes.find((route) => route.matcher.middleware).fn;
  const fallback = harness.routes.find((route) => route.matcher === '**').fn;
  let destroyed = 0;
  const request = (url, resourceType = 'xhr') => ({ url, resourceType, headers: {}, destroy: () => destroyed++ });
  assert.throws(() => middleware(request('https://production.onrender.com/api/users/get-users')));
  assert.throws(() => middleware(request(`${FRONTEND_URL}/api/users/get-users`)));
  assert.doesNotThrow(() => middleware(request(`${FRONTEND_URL}/i18n/en.json`)));
  assert.doesNotThrow(() => middleware(request(`${API_URL}/api/session/me`)));
  assert.throws(() => fallback(request(`${API_URL}/api/session/me`)));
  assert.equal(destroyed, 3);
});

test('actual compiled frontend environment is approved before application import', async () => {
  const source = ts.transpileModule(readFileSync(resolve(root, 'cypress/frontend/main.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const production of [false, true]) {
    const harness = browserHarness('stub');
    const win = { location: { href: `${FRONTEND_URL}/`, origin: FRONTEND_URL } };
    harness.callbacks['window:before:load'](win);
    let imported = 0;
    const run = () => vm.runInNewContext(source, { window: win, exports: {},
      require: (name) => {
        if (name.includes('environment')) return { environment: { production, apiUrl: API_URL } };
        imported++; return {};
      },
    });
    if (production) assert.throws(run); else run();
    await new Promise((done) => setImmediate(done));
    assert.equal(imported, production ? 0 : 1);
    if (production) assert.throws(() => harness.callbacks['window:load'](win));
    else assert.doesNotThrow(() => harness.callbacks['window:load'](win));
  }
});

test('reload requires a fresh frontend handshake and suite overrides fail before verification', () => {
  const harness = browserHarness('stub');
  const win = { location: { href: `${FRONTEND_URL}/`, origin: FRONTEND_URL } };
  harness.callbacks['window:before:load'](win);
  win.__approveE2EFrontend({ production: false, frontendUrl: FRONTEND_URL, apiUrl: API_URL });
  harness.callbacks['window:load'](win);
  harness.callbacks['window:before:load'](win);
  assert.throws(() => harness.callbacks['window:load'](win));
  harness.settings.blockHosts = [];
  assert.throws(() => harness.hooks[0]());
  assert.equal(harness.verifications(), 0);
});

test('live middleware adds backend run identity before forwarding without bypassing scenario handlers', () => {
  const harness = browserHarness('live');
  harness.hooks[0]();
  const middleware = harness.routes.find((route) => route.matcher.middleware).fn;
  const req = { url: `${API_URL}/api/session/me`, resourceType: 'xhr', headers: { Authorization: 'fake' },
    destroy: () => assert.fail('Approved API request must not be destroyed'),
    continue: () => assert.fail('Safety middleware must not bypass scenario handlers'),
    reply: () => assert.fail('Safety middleware must not blanket-stub a successful response'),
  };
  middleware(req);
  assert.equal(req.headers['x-e2e-run-id'], harness.env.E2E_RUN_ID);
  assert.equal(req.headers.Authorization, 'fake');
});

function declaredCases(source, mode) {
  const names = [];
  const file = ts.createSourceFile('spec.ts', source, ts.ScriptTarget.Latest, true);
  const withoutImports = source.split(/\r?\n/);
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      const begin = file.getLineAndCharacterOfPosition(statement.getStart()).line;
      const end = file.getLineAndCharacterOfPosition(statement.end).line;
      for (let line = begin; line <= end; line++) withoutImports[line] = '';
    }
  }
  const script = ts.transpileModule(withoutImports.join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const it = (name) => names.push(name);
  it.skip = (name) => { throw new Error(`Unexpected skipped registration: ${name}`); };
  vm.runInNewContext(script, { exports: {}, it, describe: (_name, fn) => fn(),
    before() {}, beforeEach() {}, after() {}, afterEach() {},
    Cypress: { env: (key) => key === 'USE_STUBS' ? (mode === 'stub' ? '1' : '0') : undefined },
  });
  return names;
}

test('mode-specific registration preserves all 39 unique existing cases without pending cases', () => {
  const counts = {};
  for (const mode of ['stub', 'live']) {
    counts[mode] = SPECS[mode].flatMap((name) => declaredCases(readFileSync(resolve(root, name), 'utf8'), mode));
  }
  assert.equal(counts.stub.length, 31);
  assert.equal(counts.live.length, 11);
  assert.equal(new Set([...counts.stub, ...counts.live]).size, 39);
  const permissionFile = 'cypress/e2e/toponyms/permissions.live.cy.ts';
  const originalPermissions = execFileSync('git', ['show', `HEAD:${permissionFile}`], { cwd: root, encoding: 'utf8' });
  assert.deepEqual(declaredCases(readFileSync(resolve(root, permissionFile), 'utf8'), 'live'), declaredCases(originalPermissions, 'live'));
});

test('existing Sign In and Roles cases retain their meaningful assertions when C4 strengthens workflows', () => {
  function cases(source) {
    const file = ts.createSourceFile('spec.ts', source, ts.ScriptTarget.Latest, true);
    const result = [];
    const printer = ts.createPrinter({ removeComments: true });
    const visit = (node) => {
      if (ts.isCallExpression(node) && (node.expression.getText(file) === 'it' || node.expression.getText(file).startsWith('maybe('))) {
        const callback = node.arguments.at(-1);
        if (callback && (ts.isFunctionExpression(callback) || ts.isArrowFunction(callback)) && ts.isBlock(callback.body)) {
          const checks = [];
          const findChecks = (child) => {
            if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression)) {
              const method = child.expression.name.text;
              // C7B changes only diagnostic visibility on these commands; their
              // asserted values/statuses and every other option remain checked.
              const text = printer.printNode(ts.EmitHint.Unspecified, child, file)
                .replace(/(cy\.wait\('[^']+'|\.its\('[^']+'), \{ log: false \}/g, '$1');
              if (['should', 'and'].includes(method) || text.startsWith('expect(')) checks.push(text);
            }
            ts.forEachChild(child, findChecks);
          };
          findChecks(callback.body);
          result.push({ name: node.arguments[0].getText(file), checks, body: callback.body.statements
            .filter((statement) => !statement.getText(file).startsWith('cy.skipIf('))
            .map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, file)).join('\n') });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return result;
  }
  for (const name of ['cypress/e2e/sign-in.cy.ts', 'cypress/e2e/roles.cy.ts']) {
    const original = execFileSync('git', ['show', `HEAD:${name}`], { cwd: root, encoding: 'utf8' });
    const before = cases(original), current = cases(readFileSync(resolve(root, name), 'utf8'));
    assert.deepEqual(current.map((item) => item.name), before.map((item) => item.name));
    for (let index = 0; index < before.length; index++) {
      const previous = before[index], now = current[index];
      for (const check of previous.checks) {
        // A body-less 304 is deliberately replaced by an unconditional 200/data check.
        if (check === 'expect([200, 304]).to.include(response?.statusCode)' || check === 'expect([200, 304])') {
          assert.ok(now.checks.includes('expect(response?.statusCode).to.eq(200)'));
          continue;
        }
        // The same success-status check moved into the callback that also verifies the write payload.
        if (check.startsWith("cy.wait('@create')") && check.includes(".should('be.oneOf', [200, 201])")) {
          assert.ok(now.checks.includes('expect(response?.statusCode).to.be.oneOf([200, 201])'));
          continue;
        }
        // C7A retains the exact visibility/value checks while replacing these
        // two live input chains' forced actions with focus and normal typing.
        if (previous.name === "'LIVE: create a unique role, dialog closes and appears in list'" &&
          /\.type\((unique|'Live created'), \{ delay: 0, force: true \}\)/.test(check)) {
          const normalInput = check.replace('.click({ force: true })', '.focus()')
            .replace('.clear({ force: true })', '.clear()')
            .replace(/, \{ delay: 0, force: true \}/g, '');
          assert.ok(now.checks.includes(normalInput), `${name}: lost live input assertion: ${normalInput}`);
          continue;
        }
        assert.ok(now.checks.includes(check), `${name}: ${previous.name} lost assertion: ${check}`);
      }
    }
  }
});
