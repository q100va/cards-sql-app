import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runLive } from './live-runner.mjs';
import { validateInputs, validateCatalog, validateInventory, validateLocalhost, validateDatabaseListener } from './live-runner-policy.mjs';
import { verifyDatabase, pair, childEnvironment, ready } from './live-runtime.mjs';
import { SPECS } from './policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const target = 'postgresql://e2e_runner@127.0.0.1:5433/e2e_disposable';
const values = () => ({ E2E_MODE: 'live', NODE_ENV: 'test', DB_USERNAME: 'e2e_runner', DB_PASSWORD: 'd'.repeat(40),
  DB_LINK_TEST: '127.0.0.1:5433/e2e_disposable', E2E_DB_ALLOWLIST: JSON.stringify([target]),
  E2E_RESET_AUTHORIZATION: `RESET ${target}`, PASSWORD_PEPPER: 'p'.repeat(40), JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'r'.repeat(40) });
const approval = () => ({ version: 1, target, authorization: `EXECUTE FIVE LIVE SPECS ${target}`, verifiedAt: new Date().toISOString(),
  server: { address: '127.0.0.1', port: 5433, executable: 'C:\\PostgreSQL\\bin\\postgres.exe' }, confirmations: {
    disposable: true, separateDevelopment: true, separateIntegration: true, lowPrivilege: true, exclusiveUse: true,
    localServerVerified: true, loopbackEgressOnly: true, watchersAndAutomationReviewed: true, syntheticDataOnly: true,
  } });

function fakes(options = {}) {
  const events = [], active = [], config = {}, runs = [];
  let identity = 0, locked = false;
  const io = {
    async prepare() { events.push('prepare'); if (options.prepareFails) throw new Error('Unsafe synthetic environment'); return config; },
    async acquire() { events.push('lock'); if (locked) throw new Error('Parallel runner'); locked = true; return 'owned-lock'; },
    async release(_config, lock) { assert.equal(lock, 'owned-lock'); assert.equal(active.length, 0); locked = false; events.push('release'); },
    async block() { events.push('blocked'); },
    async inspect(_config, owned) {
      events.push('inspect');
      assert.deepEqual(owned, active);
      if (options.unexpected || options.lateWatcher && runs.length === 1) throw new Error('Unexpected watcher/port');
    },
    async verifyDatabase() { events.push('catalog'); if (options.catalogFails) throw new Error('Wrong DB owner'); },
    randomIdentity() { return (options.repeatIdentity ? '1' : (++identity).toString(16)).padStart(64, '0'); },
    async pair(_config, id, spec) { events.push(`pair:${spec}`); const pair = { id, spec }; runs.push(pair); return pair; },
    async start(_config, kind, pair) {
      events.push(`start:${kind}`);
      if (options.startFailure === kind) throw new Error('Synthetic start failure');
      if (kind === 'backend') assert.ok(!active.some((process) => process.kind === 'backend'));
      const process = { kind, pair, pid: 100 + events.length }; active.push(process); return process;
    },
    async ready(_config, process, { inspect }) {
      events.push(`ready:${process.kind}`); await inspect();
      if (options.readyFailure === process.kind) throw new Error('Synthetic initialization failure');
    },
    async verifyIdentity(_config, pair) { events.push(`identity:${pair.id}`); if (options.badIdentity) throw new Error('Wrong backend identity'); },
    async wait(_config, process, { inspect, signal }) {
      assert.ok(active.some((current) => current.kind === 'backend' && current.pair === process.pair));
      events.push(`wait:${process.pair.spec}`); await inspect();
      if (options.cancel) { options.cancel.abort(); assert.equal(signal.aborted, true); throw new Error('Cancelled'); }
      if (options.earlyExit) throw new Error('Backend exited during Cypress');
      if (options.hold) await options.hold;
      return options.cypressFailure ? 1 : 0;
    },
    async stop(_config, process) {
      events.push(`stop:${process.kind}`);
      if (options.stopFailure === process.kind) throw new Error('Owned process is still alive');
      active.splice(active.indexOf(process), 1);
      events.push(`exited:${process.kind}`);
    },
    async assertBackendStopped() { events.push('backend-port-free'); assert.ok(!active.some((process) => process.kind === 'backend')); },
    async assertAllStopped() { events.push('all-stopped'); assert.equal(active.length, 0); },
    async completed(_config, pair) { events.push(`completed:${pair.spec}`); },
  };
  return { io, events, active, runs, get locked() { return locked; } };
}
const launch = (fake, signal) => runLive({ argv: ['--authorize-live'], env: {}, dependencies: fake.io, signal });

test('serial runner executes exactly the five approved files in order with fresh stopped backends and identities', async () => {
  const h = fakes(); assert.deepEqual(await launch(h), { specs: 5 });
  assert.deepEqual(h.runs.map((pair) => pair.spec), [...SPECS.live]);
  assert.equal(new Set(h.runs.map((pair) => pair.id)).size, 5);
  assert.equal(h.events.filter((event) => event === 'start:frontend').length, 1);
  assert.equal(h.events.filter((event) => event === 'start:backend').length, 5);
  assert.equal(h.events.filter((event) => event === 'exited:backend').length, 5);
  let previous = -1;
  for (const pair of h.runs) {
    const beginning = h.events.indexOf(`pair:${pair.spec}`);
    if (previous >= 0) assert.ok(h.events.slice(previous, beginning).includes('backend-port-free'));
    const identity = h.events.indexOf(`identity:${pair.id}`);
    const wait = h.events.indexOf(`wait:${pair.spec}`);
    assert.ok(identity > beginning && wait > identity);
    previous = beginning;
  }
  assert.ok(h.events.indexOf('catalog') < h.events.indexOf('start:frontend'));
  assert.deepEqual(h.active, []); assert.equal(h.locked, false);
});

test('no opt-in, extra spec flags and unsafe configuration reject before process or database use', async () => {
  for (const argv of [[], ['--authorize-live', '--spec', 'other.cy.ts'], ['--authorize-live=true']]) {
    const h = fakes(); await assert.rejects(runLive({ argv, dependencies: h.io })); assert.deepEqual(h.events, []);
  }
  const h = fakes({ prepareFails: true }); await assert.rejects(launch(h)); assert.deepEqual(h.events, ['prepare']);
});

test('unexpected watchers/ports stop before any database or application operation', async () => {
  const h = fakes({ unexpected: true }); await assert.rejects(launch(h));
  assert.ok(!h.events.includes('catalog')); assert.ok(!h.events.some((event) => event.startsWith('start:'))); assert.equal(h.locked, false);
});

test('failed catalog verification starts no frontend/backend and releases its exclusive lock', async () => {
  const h = fakes({ catalogFails: true }); await assert.rejects(launch(h));
  assert.ok(!h.events.some((event) => event.startsWith('start:'))); assert.equal(h.locked, false);
});

for (const option of [{ startFailure: 'frontend' }, { startFailure: 'backend' }, { readyFailure: 'backend' },
  { badIdentity: true }, { cypressFailure: true }, { earlyExit: true }, { lateWatcher: true }]) {
  test(`serial launcher stops on ${JSON.stringify(option)} and closes only its own processes`, async () => {
    const h = fakes(option); await assert.rejects(launch(h));
    assert.ok(h.runs.length <= 1); assert.deepEqual(h.active, []); assert.equal(h.locked, false);
    if (option.badIdentity || option.readyFailure) assert.ok(!h.events.includes('start:cypress'));
  });
}

test('cancellation cleans owned Cypress/backend/frontend before releasing the lock', async () => {
  const cancel = new AbortController(), h = fakes({ cancel }); await assert.rejects(launch(h, cancel.signal));
  assert.deepEqual(h.active, []);
  assert.ok(h.events.indexOf('exited:cypress') < h.events.indexOf('exited:backend'));
  assert.ok(h.events.indexOf('exited:backend') < h.events.indexOf('exited:frontend'));
  assert.equal(h.locked, false);
});

test('a backend that cannot exit blocks continuation and retains the exclusive lock for review', async () => {
  const h = fakes({ stopFailure: 'backend' }); await assert.rejects(launch(h), /blocked for operator review/);
  assert.equal(h.runs.length, 1); assert.ok(h.events.includes('blocked')); assert.equal(h.locked, true);
  assert.ok(h.events.includes('exited:frontend')); assert.ok(!h.events.includes('release'));
});

test('a duplicate identity is rejected before starting another backend', async () => {
  const h = fakes({ repeatIdentity: true }); await assert.rejects(launch(h));
  assert.equal(h.events.filter((event) => event === 'start:backend').length, 1); assert.deepEqual(h.active, []);
});

test('parallel runners cannot share the exclusive runtime lock', async () => {
  let release;
  const hold = new Promise((done) => { release = done; });
  const h = fakes({ hold }), first = launch(h);
  while (!h.events.some((event) => event.startsWith('wait:'))) await new Promise((done) => setImmediate(done));
  const starts = h.events.filter((event) => event.startsWith('start:')).length;
  await assert.rejects(launch(h), /Parallel runner/);
  assert.equal(h.events.filter((event) => event.startsWith('start:')).length, starts);
  release(); await first; assert.equal(h.locked, false);
});

test('strict private configuration preserves C1 authorization and rejects inherited production selectors', () => {
  const valid = values(), accepted = validateInputs({}, valid, approval()); assert.equal(accepted.target, target);
  for (const key of ['DATABASE_URL', 'DB_PASSWORD', 'PGHOST', 'JWT_ACCESS_SECRET', 'CYPRESS_BASE_URL', 'DOTENV_CONFIG_PATH', 'NODE_OPTIONS', 'HTTPS_PROXY', 'E2E_DB_ALLOWLIST', 'E2E_RESET_AUTHORIZATION', 'E2E_RUN_ID']) {
    assert.throws(() => validateInputs({ [key]: 'synthetic-private' }, valid, approval()));
  }
  for (const changes of [{ NODE_ENV: 'production' }, { E2E_RESET_AUTHORIZATION: undefined }, { E2E_DB_ALLOWLIST: '[]' },
    { DB_LINK_TEST: 'remote.invalid:5433/e2e_disposable' }, { JWT_ACCESS_SECRET: valid.JWT_REFRESH_SECRET }, { REDIS_URL: 'forbidden' }]) {
    assert.throws(() => validateInputs({}, { ...valid, ...changes }, approval()));
  }
});

test('operator evidence is mandatory, recent, target-bound and cannot be inferred from localhost/test names', () => {
  for (const changed of [{}, { ...approval(), target: 'other' }, { ...approval(), authorization: 'yes' },
    { ...approval(), verifiedAt: new Date(0).toISOString() }, { ...approval(), server: { address: 'remote.invalid', port: 5433 } }]) {
    assert.throws(() => validateInputs({}, values(), changed));
  }
  for (const name of Object.keys(approval().confirmations)) {
    const changed = approval(); changed.confirmations[name] = false;
    assert.throws(() => validateInputs({}, values(), changed));
  }
});

test('application DNS must be loopback-only and database configuration must use numeric loopback', () => {
  validateLocalhost([{ address: '127.0.0.1' }, { address: '::1' }]);
  for (const addresses of [[], [{ address: '203.0.113.1' }], [{ address: '127.0.0.1' }, { address: '192.0.2.1' }]]) assert.throws(() => validateLocalhost(addresses));
  const changed = values(); changed.DB_LINK_TEST = 'localhost:5433/e2e_disposable';
  const localTarget = target.replace('127.0.0.1', 'localhost');
  changed.E2E_DB_ALLOWLIST = JSON.stringify([localTarget]); changed.E2E_RESET_AUTHORIZATION = `RESET ${localTarget}`;
  assert.throws(() => validateInputs({}, changed, { ...approval(), target: localTarget, authorization: `EXECUTE FIVE LIVE SPECS ${localTarget}` }));
});

const snapshot = () => ({ processes: [], listeners: [], connections: [] });
const node = (command) => ({ pid: 9, name: 'node.exe', command, executable: 'C:\\node.exe', created: 'synthetic-start' });
test('inventory rejects nodemon, ordinary/guarded backends, watch mode, missing process identity and foreign port owners', () => {
  for (const command of ['nodemon server/server.js', 'node server/server.js', 'node cypress/safety/backend.mjs', 'node compiler --watch', 'npm run dev', null]) {
    const state = snapshot(); state.processes.push(node(command)); assert.throws(() => validateInventory(state, [], 'C:\\project', 100));
  }
  const shellWatcher = snapshot(); shellWatcher.processes.push({ ...node('powershell C:\\project\\scripts\\watch.ps1'), name: 'powershell.exe' });
  assert.throws(() => validateInventory(shellWatcher, [], 'C:\\project', 100));
  for (const listener of [{ pid: 9, port: 8080, address: '127.0.0.1' }, { pid: 8, port: 56379, address: '0.0.0.0' }]) {
    const state = snapshot(); state.listeners.push(listener); assert.throws(() => validateInventory(state, [], 'C:\\project', 100));
  }
});

test('only contained application PIDs can own the loopback ports; unrelated tool hosts are left alone', () => {
  const state = snapshot(); state.processes.push(node('node unrelated-tool-host.mjs'));
  state.listeners = [{ pid: 11, port: 8080, address: '::1' }, { pid: 12, port: 56379, address: '127.0.0.1' }];
  const owned = [{ kind: 'backend', pids: [11] }, { kind: 'frontend', pids: [12] }];
  validateInventory(state, owned, 'C:\\project', 100);
  state.connections.push({ pid: 11, remote: '203.0.113.1' }); assert.throws(() => validateInventory(state, owned, 'C:\\project', 100));
});

test('database port ownership is checked before connection: tunnels, proxies, remote binding and unreadable identity reject', () => {
  const server = approval().server, database = validateInputs({}, values(), approval());
  const state = snapshot();
  state.listeners.push({ pid: 77, port: 5433, address: '127.0.0.1' });
  state.processes.push({ pid: 77, name: 'postgres.exe', executable: server.executable, created: 'synthetic-start' });
  validateDatabaseListener(state, database, server);
  for (const change of [{ name: 'ssh.exe' }, { name: 'com.docker.backend.exe' }, { executable: 'C:\\Other\\postgres.exe' }, { created: null }]) {
    assert.throws(() => validateDatabaseListener({ ...state, processes: [{ ...state.processes[0], ...change }] }, database, server));
  }
  assert.throws(() => validateDatabaseListener({ ...state, listeners: [{ ...state.listeners[0], address: '0.0.0.0' }] }, database, server));
  assert.throws(() => validateDatabaseListener(snapshot(), database, server));
});

const catalog = () => ({ database: 'e2e_disposable', username: 'e2e_runner', owner: 'e2e_runner', address: '127.0.0.1', port: 5433,
  superuser: false, create_db: false, create_role: false, replication: false, bypass_rls: false, inherited_roles: false, other_database_access: false, schema_owner: 'pg_database_owner' });

test('read-only catalog verification fails for wrong ownership, elevated roles, unrelated DB access and mismatched server identity', () => {
  const database = validateInputs({}, values(), approval()); validateCatalog(catalog(), database, approval().server);
  for (const field of ['superuser', 'create_db', 'create_role', 'replication', 'bypass_rls', 'inherited_roles', 'other_database_access']) {
    assert.throws(() => validateCatalog({ ...catalog(), [field]: true }, database, approval().server));
  }
  for (const changes of [{ owner: 'development_owner' }, { database: 'development' }, { username: 'postgres' }, { address: '203.0.113.1' }, { port: 5432 }, { schema_owner: 'other_owner' }]) {
    assert.throws(() => validateCatalog({ ...catalog(), ...changes }, database, approval().server));
  }
});

test('database adapter performs only a read-only transaction and closes the fake client on success/failure', async () => {
  for (const row of [catalog(), { ...catalog(), superuser: true }]) {
    const queries = []; let ended = false;
    const config = { database: validateInputs({}, values(), approval()), values: values(), approval: approval() };
    const client = { async connect() {}, async query(sql) { queries.push(sql); return { rows: [row] }; }, async end() { ended = true; } };
    const work = verifyDatabase(config, async (options) => { assert.equal(options.host, '127.0.0.1'); assert.equal(options.ssl, false); return client; });
    if (row.superuser) await assert.rejects(work); else await work;
    assert.equal(ended, true); assert.equal(queries[0], 'BEGIN READ ONLY'); assert.equal(queries.at(-1), 'ROLLBACK');
    assert.ok(queries[1].trim().startsWith('SELECT'));
    assert.match(queries[1], /other\.datdba = r\.oid/);
    assert.doesNotMatch(queries.join('\n'), /\b(DROP|CREATE|INSERT|UPDATE|DELETE|TRUNCATE|ALTER)\s/i);
  }
});

test('native ownership code assigns a suspended child before resume and terminates only owned handles/jobs', () => {
  const code = readFileSync(resolve(root, 'cypress/safety/live-process-job.cs'), 'utf8');
  assert.match(code, /0x08000404/); assert.match(code, /Flags = 0x2000/);
  assert.ok(code.indexOf('Require(AssignProcessToJobObject(job, process))') < code.indexOf('Require(ResumeThread(child.Thread)'));
  assert.match(code, /TerminateJobObject\(job/); assert.doesNotMatch(code, /OpenProcess|taskkill|Process\.GetProcessById/);
  assert.match(code, /while \(Pids\(\)\.Length != 0 \|\| !Exited\)/);
  assert.match(code, /public long\[\] Pids\(\) \{\s+RequireOpen\(\)/);
  assert.match(code, /public void Stop\(\) \{\s+RequireOpen\(\)/);
  const runtime = readFileSync(resolve(root, 'cypress/safety/live-runtime.mjs'), 'utf8');
  assert.match(runtime, /windowsHide: true/); assert.match(runtime, /stdio: \['pipe', 'pipe', 'pipe'\]/);
  assert.match(runtime, /child\.on\('close'/);
  assert.match(runtime, /process\.execArgv\.length/);
  assert.doesNotMatch(runtime, /\.kill\(|taskkill|api:test|bootstrap-admin/);
});

test('private synthetic per-spec files preserve dotenv values but replace run identity without exporting secrets', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'cards-c7c-fake-env-'));
  const settings = values(), source = Object.entries({ ...settings, E2E_RUN_ID: 'a'.repeat(64) }).map(([key, value]) => `${key}='${value}'`).join('\n');
  const configuration = { directory, pairs: 0, source, environment: {}, values: settings, database: validateInputs({}, settings, approval()) };
  const created = [];
  t.after(() => {
    for (const fixture of created) { unlinkSync(fixture.filename); rmdirSync(fixture.directory); }
    rmdirSync(directory);
  });
  for (const id of ['b'.repeat(64), 'c'.repeat(64)]) {
    const fixture = await pair(configuration, id, SPECS.live[created.length]); created.push(fixture);
    assert.equal(fixture.context.env.E2E_RUN_ID, id);
    assert.equal(fixture.context.env.DB_PASSWORD, settings.DB_PASSWORD);
    assert.equal(fixture.context.env.PASSWORD_PEPPER, settings.PASSWORD_PEPPER);
    assert.ok(!('DB_PASSWORD' in fixture.environment));
    assert.ok(!('JWT_ACCESS_SECRET' in fixture.environment));
    assert.equal(fixture.context.database.target, target);
  }
  assert.notEqual(created[0].filename, created[1].filename);
});

test('child environments contain only explicit OS/tool paths and private profiles, never parent service settings', () => {
  const environment = childEnvironment('C:\\Windows', 'C:\\Node\\node.exe', 'C:\\Private\\run');
  assert.ok(environment.USERPROFILE.includes('Private'));
  assert.equal(environment.CI, '1'); assert.equal(environment.NG_CLI_ANALYTICS, 'false');
  assert.ok(!Object.keys(environment).some((key) => /^(DB_|DATABASE_|PG|JWT_|PASSWORD_|DOTENV_|AWS_|CYPRESS_)/.test(key)));
  assert.ok(!Object.keys(environment).includes('NODE_OPTIONS'));
});

test('readiness uses owned-process inspection and bounded local probes, never redirect following or authentication delays', async () => {
  let inspections = 0, probes = 0; const pauses = [];
  await ready({}, { kind: 'backend' }, {
    inspect: async () => { inspections++; }, pause: async (ms) => pauses.push(ms),
    request: async (url, options) => {
      assert.equal(url, 'http://localhost:8080/healthz'); assert.equal(options.redirect, 'error');
      return { status: ++probes === 1 ? 503 : 200 };
    },
  });
  assert.equal(inspections, 2); assert.deepEqual(pauses, [200]);
  for (const status of [301, 403, 500]) {
    await assert.rejects(ready({}, { kind: 'backend' }, { inspect: async () => {}, request: async () => ({ status }), pause: () => assert.fail('Unsafe readiness must not retry') }));
  }
  await assert.rejects(ready({}, { kind: 'backend' }, { inspect: async () => { throw new Error('Unexpected process'); }, request: () => assert.fail('No probe before ownership') }));
});
