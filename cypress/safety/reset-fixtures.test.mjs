import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { format } from 'node:util';
import ts from 'typescript';
import { isDirectExecution } from './cli-entry.mjs';
import { loadEnvironment, withApprovedDatabase } from './node.mjs';
import { OPERATIONS } from '../../server/shared/operations.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resetFilename = resolve(root, 'server/scripts/reset-test-db.mjs');
const target = 'postgresql://e2e_runner@127.0.0.1:5432/e2e_fixture';

function syntheticEnvironment(t, changes = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'cards-c2-safety-'));
  const filename = join(directory, 'isolated.env');
  const values = { E2E_MODE: 'live', NODE_ENV: 'test', DB_USERNAME: 'e2e_runner', DB_PASSWORD: 'synthetic-password',
    PASSWORD_PEPPER: 'synthetic-pepper', DB_LINK_TEST: '127.0.0.1:5432/e2e_fixture',
    E2E_DB_ALLOWLIST: JSON.stringify([target]), E2E_RESET_AUTHORIZATION: `RESET ${target}`, E2E_RUN_ID: 'c'.repeat(32),
    ...changes };
  writeFileSync(filename, Object.entries(values).filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}='${value}'`).join('\n'));
  t.after(() => { unlinkSync(filename); rmdirSync(directory); });
  return { E2E_MODE: 'live', E2E_ENV_FILE: filename };
}

// Execute the actual reset source with a closed module loader. Every database,
// model and hash operation is a fake; unknown imports cannot reach real modules.
function resetHarness(t, options = {}) {
  const env = syntheticEnvironment(t, options.environment);
  Object.assign(env, options.ambient);
  const events = [];
  const sql = [];
  const hashCalls = [];
  const users = [];
  const exits = [];
  const diagnostics = [];
  const roles = [
    { id: 1, name: 'Admin' }, { id: 2, name: 'Coordinator' }, { id: 3, name: 'User' }, { id: 4, name: 'Viewer' },
  ];
  let seededRoles, permissions;
  const sequelize = {
    config: { host: '127.0.0.1', port: 5432, database: 'e2e_fixture', username: 'e2e_runner', password: 'synthetic-password' },
    options: {}, getDialect: () => 'postgres',
    authenticate: async () => { events.push('authenticate'); },
    query: async (text) => {
      events.push('sql'); sql.push(text);
      if (options.failedSeed === 'country' && text.includes('INSERT INTO')) throw options.failure;
    },
    sync: async (settings) => { assert.equal(settings.force, true); events.push('sync'); },
    transaction: async () => ({ commit: async () => events.push('commit'), rollback: async () => events.push('rollback') }),
  };
  const models = {
    Role: {
      bulkCreate: async (values) => { seededRoles = values; },
      findAll: async () => roles,
      findOne: async ({ where }) => roles.find((role) => role.name === where.name),
    },
    User: { findOrCreate: async ({ defaults }) => {
      if (options.failedSeed === defaults.userName) throw options.failure;
      users.push(defaults);
      return [{ save: async () => events.push('save-existing-user') }, !options.existingUsers];
    } },
    RolePermission: {
      destroy: async () => {}, bulkCreate: async (values) => { permissions = values; }, update: async () => [3],
    },
    Country: { getTableName: () => 'countries' },
  };
  if (options.missingMethod) {
    const [model, method] = options.missingMethod.split('.');
    delete (model === 'sequelize' ? sequelize : models[model])[method];
  }
  const exports = {};
  const requireFake = (name) => {
    events.push(`import:${name}`);
    if (name === options.missingModule) throw new Error(`Missing isolated dependency: ${name}`);
    switch (name) {
      case 'sequelize': return { Op: { in: Symbol.for('isolated-op-in') } };
      case '../shared/operations.js': return { OPERATIONS };
      case '../../cypress/safety/cli-entry.mjs': return { isDirectExecution };
      case '../../cypress/safety/node.mjs': return {
        loadEnvironment: (input, authorize) => loadEnvironment(input, authorize),
        withApprovedDatabase: (settings) => withApprovedDatabase({ ...settings, env }),
      };
      case '../security/passwords.mjs':
        assert.equal(env.PASSWORD_PEPPER, 'synthetic-pepper');
        assert.equal(env.DOTENV_CONFIG_PATH, env.E2E_ENV_FILE);
        if (options.missingHashExport) return {};
        return { hashPassword: async (plain) => {
          hashCalls.push(plain);
          events.push('hash');
          if (hashCalls.length === options.failingHash) throw options.failure ?? new Error('Isolated native hash failure');
          return options.invalidHash ? undefined : `isolated-hash:${plain}`;
        } };
      case '../database.js': return { default: sequelize };
      case '../models/index.js': return models;
      default: throw new Error(`Unexpected module in isolated reset: ${name}`);
    }
  };
  const source = readFileSync(resetFilename, 'utf8').replaceAll('import.meta.url', '__moduleUrl');
  const script = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const evaluate = () => vm.runInNewContext(script, {
    exports, require: requireFake, __moduleUrl: pathToFileURL(resetFilename).href,
    process: { env, argv: [process.execPath, options.direct ? resetFilename : resolve(root, 'isolated-task-runner.mjs')],
      exit: (code) => exits.push(code) },
    console: { log: (...args) => diagnostics.push(format(...args)), error: (...args) => diagnostics.push(format(...args)) },
  });
  return { env, events, sql, hashCalls, users, exits, diagnostics, exports, evaluate,
    get seededRoles() { return seededRoles; }, get permissions() { return permissions; } };
}

const pathCases = [
  ['Windows absolute', 'file:///C:/E2E/reset.mjs', 'C:\\E2E\\reset.mjs', { windows: true, cwd: 'C:\\E2E' }],
  ['Windows relative', 'file:///C:/E2E/reset.mjs', '.\\reset.mjs', { windows: true, cwd: 'C:\\E2E' }],
  ['Windows casing', 'file:///C:/E2E/reset.mjs', 'c:\\e2e\\RESET.mjs', { windows: true, cwd: 'C:\\' }],
  ['Windows special characters', 'file:///C:/E2E%20files/reset%23%25.mjs', 'C:\\E2E files\\reset#%.mjs', { windows: true, cwd: 'C:\\' }],
  ['Windows UNC', 'file://server/share/reset.mjs', '\\\\server\\share\\reset.mjs', { windows: true, cwd: 'C:\\' }],
  ['Windows Unicode casing', pathToFileURL('C:\\Фикстуры\\Сброс.mjs', { windows: true }).href,
    'c:\\фикстуры\\сброс.mjs', { windows: true, cwd: 'C:\\' }],
  ['Unix absolute', 'file:///tmp/e2e/reset.mjs', '/tmp/e2e/reset.mjs', { windows: false, cwd: '/tmp' }],
  ['Unix relative', 'file:///tmp/e2e/reset.mjs', './reset.mjs', { windows: false, cwd: '/tmp/e2e' }],
  ['Unix normalized', 'file:///tmp/e2e/reset.mjs', './a/../reset.mjs', { windows: false, cwd: '/tmp/e2e' }],
  ['Unix special characters', 'file:///tmp/E2E%20files/reset%23%25.mjs', '/tmp/E2E files/reset#%.mjs', { windows: false, cwd: '/' }],
  ['Unix Unicode', pathToFileURL('/tmp/фикстуры/сброс.mjs', { windows: false }).href,
    '/tmp/фикстуры/сброс.mjs', { windows: false, cwd: '/' }],
];
for (const [name, url, entry, platform] of pathCases) {
  test(`CLI recognizes ${name} using synthetic paths`, () => assert.equal(isDirectExecution(url, entry, platform), true));
}

test('CLI comparison rejects imports, missing argv, URL suffixes, and Unix case mismatches', () => {
  const unix = { windows: false, cwd: '/tmp/e2e' };
  assert.equal(isDirectExecution('file:///tmp/e2e/reset.mjs', '/tmp/task-runner.mjs', unix), false);
  assert.equal(isDirectExecution('file:///tmp/e2e/reset.mjs', undefined, unix), false);
  assert.equal(isDirectExecution('file:///tmp/e2e/reset.mjs?import=1', '/tmp/e2e/reset.mjs', unix), false);
  assert.equal(isDirectExecution('file:///tmp/e2e/reset.mjs#tag', '/tmp/e2e/reset.mjs', unix), false);
  assert.equal(isDirectExecution('file:///tmp/e2e/reset.mjs', '/tmp/e2e/RESET.mjs', unix), false);
  assert.equal(isDirectExecution('https://example.invalid/reset.mjs', '/tmp/e2e/reset.mjs', unix), false);
});

test('importing the actual reset source validates policy without loading a DB or initiating a reset', async (t) => {
  const harness = resetHarness(t);
  harness.evaluate();
  await new Promise((done) => setImmediate(done));
  assert.equal(typeof harness.exports.reset, 'function');
  assert.equal(harness.hashCalls.length, 0);
  assert.equal(harness.sql.length, 0);
  assert.ok(!harness.events.includes('import:../database.js'));
  assert.deepEqual(harness.exits, []);
});

test('reset resolves the current password utility and both hashes before connecting or mutating', async (t) => {
  const harness = resetHarness(t);
  harness.evaluate();
  assert.equal(await harness.exports.reset(), true);
  assert.deepEqual(harness.hashCalls, ['p@ss12345', 'p@ss54321']);
  const auth = harness.events.indexOf('authenticate');
  const sql = harness.events.indexOf('sql');
  assert.ok(harness.events.lastIndexOf('hash') < harness.events.indexOf('import:../database.js'));
  for (const name of ['../security/passwords.mjs', '../database.js', '../models/index.js']) {
    assert.ok(harness.events.indexOf(`import:${name}`) < auth);
  }
  assert.ok(auth < sql);
  assert.equal(harness.sql[0], 'DROP SCHEMA IF EXISTS public CASCADE');
  assert.equal(harness.sql[1], 'CREATE SCHEMA public');
  assert.deepEqual(Array.from(harness.seededRoles, (role) => role.name), ['Admin', 'Coordinator', 'User', 'Viewer']);
  assert.equal(harness.permissions.length, OPERATIONS.length * 4);
  assert.deepEqual(harness.users.map((user) => [user.userName, user.password]),
    [['superAdmin', 'isolated-hash:p@ss12345'], ['viewerUser', 'isolated-hash:p@ss54321']]);
  assert.ok(harness.sql.some((text) => text.includes("VALUES (143, 'Россия', false")));
  assert.ok(existsSync(resolve(root, 'server/security/passwords.mjs')));
  assert.ok(!harness.events.some((event) => event.includes('controllers/passwords')));
});

test('existing seeded users still receive the computed hashes through their existing save path', async (t) => {
  const harness = resetHarness(t, { existingUsers: true });
  harness.evaluate();
  await harness.exports.reset();
  assert.equal(harness.events.filter((event) => event === 'save-existing-user').length, 2);
});

for (const name of ['../security/passwords.mjs', '../database.js', '../models/index.js']) {
  test(`missing dependency ${name} fails before connection or SQL`, async (t) => {
    const harness = resetHarness(t, { missingModule: name });
    harness.evaluate();
    await assert.rejects(harness.exports.reset(), /Missing isolated dependency/);
    assert.ok(!harness.events.includes('authenticate'));
    assert.deepEqual(harness.sql, []);
  });
}

for (const [name, options] of [
  ['missing hash export', { missingHashExport: true }],
  ['first hash failure', { failingHash: 1 }],
  ['second hash failure', { failingHash: 2 }],
  ['invalid hash return', { invalidHash: true }],
  ['missing model method', { missingMethod: 'User.findOrCreate' }],
  ['missing client method', { missingMethod: 'sequelize.transaction' }],
]) {
  test(`${name} fails before connection or SQL`, async (t) => {
    const harness = resetHarness(t, options);
    harness.evaluate();
    await assert.rejects(harness.exports.reset());
    assert.ok(!harness.events.includes('authenticate'));
    assert.deepEqual(harness.sql, []);
  });
}

for (const [name, changes] of [
  ['stub mode', { E2E_MODE: 'stub' }],
  ['production environment', { NODE_ENV: 'production' }],
  ['missing DB password', { DB_PASSWORD: undefined }],
  ['missing authorization', { E2E_RESET_AUTHORIZATION: undefined }],
  ['unapproved database', { E2E_DB_ALLOWLIST: '[]' }],
]) {
  test(`${name} blocks both CLI and task-style module entry before dependency loading`, (t) => {
    for (const direct of [false, true]) {
      const harness = resetHarness(t, { environment: changes, direct });
      assert.throws(harness.evaluate);
      assert.ok(!harness.events.includes('import:../database.js'));
      assert.ok(!harness.events.includes('import:../security/passwords.mjs'));
      assert.deepEqual(harness.sql, []);
    }
  });
}

test('missing pepper fails before password/database imports or mutation', async (t) => {
  const harness = resetHarness(t, { environment: { PASSWORD_PEPPER: undefined } });
  harness.evaluate();
  await assert.rejects(harness.exports.reset(), /PASSWORD_PEPPER/);
  assert.ok(!harness.events.includes('import:../security/passwords.mjs'));
  assert.ok(!harness.events.includes('import:../database.js'));
  assert.deepEqual(harness.sql, []);
});

test('a previously imported module cannot bypass reset authorization after the environment changes', async (t) => {
  for (const change of [{ E2E_MODE: 'stub' }, { E2E_RESET_AUTHORIZATION: 'unauthorized' }]) {
    const harness = resetHarness(t);
    harness.evaluate();
    Object.assign(harness.env, change);
    await assert.rejects(harness.exports.reset());
    assert.equal(harness.hashCalls.length, 0);
    assert.ok(!harness.events.includes('import:../database.js'));
    assert.deepEqual(harness.sql, []);
  }
});

test('conflicting pepper sources fail before loading a seed dependency', (t) => {
  const harness = resetHarness(t, { ambient: { PASSWORD_PEPPER: 'different-synthetic-pepper' } });
  assert.throws(harness.evaluate, /Conflicting E2E environment sources for PASSWORD_PEPPER/);
  assert.ok(!harness.events.includes('import:../security/passwords.mjs'));
  assert.deepEqual(harness.sql, []);
});

test('CLI dispatch invokes only the guarded reset and preserves completion/failure exit handling', async (t) => {
  for (const failingHash of [undefined, 1]) {
    const harness = resetHarness(t, { direct: true, failingHash });
    harness.evaluate();
    await new Promise((done) => setImmediate(done));
    assert.deepEqual(harness.exits, [failingHash ? 1 : 0]);
    if (failingHash) {
      assert.ok(!harness.events.includes('authenticate'));
      assert.deepEqual(harness.sql, []);
    }
  }
});

test('C7B reset status diagnostics retain useful operations without seed credentials or hashes', async (t) => {
  const h = resetHarness(t); h.evaluate(); await h.exports.reset();
  const output = h.diagnostics.join('\n');
  assert.match(output, /seeded admin account/);
  assert.match(output, /seeded viewer account/);
  assert.match(output, /seedCountry/);
  for (const secret of [...h.hashCalls, ...h.users.map((user) => user.password), h.env.DB_PASSWORD, h.env.PASSWORD_PEPPER]) {
    assert.ok(!output.includes(secret), 'Reset diagnostics must not contain synthetic secrets');
  }
});

for (const failedSeed of ['superAdmin', 'viewerUser', 'country']) {
  test(`C7B ${failedSeed} failure logs its operation without dumping an unsafe error`, async (t) => {
    const marker = 'SYNTHETIC_PRIVATE_RESET_ERROR';
    const failure = Object.assign(new Error(marker), { password: marker, sql: marker, headers: { authorization: marker } });
    const h = resetHarness(t, { failedSeed, failure }); h.evaluate();
    await assert.rejects(h.exports.reset(), (error) => error === failure);
    assert.match(h.diagnostics.join('\n'), /failed/);
    assert.ok(!h.diagnostics.join('\n').includes(marker));
    assert.ok(h.events.includes('rollback'));
  });
}

test('C7B guarded CLI keeps failure status but omits raw hashing errors before any database use', async (t) => {
  const marker = 'SYNTHETIC_PRIVATE_HASH_ERROR';
  const h = resetHarness(t, { direct: true, failingHash: 1, failure: new Error(marker) });
  h.evaluate(); await new Promise((done) => setImmediate(done));
  assert.deepEqual(h.exits, [1]);
  assert.ok(!h.events.includes('authenticate'));
  assert.deepEqual(h.sql, []);
  assert.match(h.diagnostics.join('\n'), /\[reset-test-db\] FAILED/);
  assert.ok(!h.diagnostics.join('\n').includes(marker));
});

class Chain {
  constructor(value) { this.value = value; }
  its(path) { return new Chain(path.split('.').reduce((value, key) => value?.[key], this.value)); }
  then(callback) {
    const next = callback(this.value);
    return next instanceof Chain ? next : new Chain(next === undefined ? this.value : next);
  }
  should(assertion, expected) {
    if (assertion === 'be.oneOf') assert.ok(expected.includes(this.value));
    else if (assertion === 'eq') assert.equal(this.value, expected);
    else assert.fail(`Unexpected isolated assertion: ${assertion}`);
    return this;
  }
}

function fixtureHarness({ id = 731, ids = [id], body, status = 201, deleteStatus = 204 } = {}) {
  const region = { id, name: 'Synthetic region', shortName: 'Synthetic', defaultAddressParams: {
    countryId: 143, regionId: id, districtId: null, localityId: null,
  } };
  const requests = [];
  let creations = 0;
  const exports = {};
  const cy = {
    wrap: (value) => new Chain(value), task: () => new Chain('db-reset:done:v1'),
    request: (options) => {
      requests.push(options);
      if (options.method === 'GET') return new Chain({ status: 200, body: { data: [{ id: 143, name: 'Synthetic country' }] } });
      if (options.method === 'DELETE') return new Chain({ status: deleteStatus });
      if (status >= 400) throw new Error('Isolated HTTP creation failure');
      const created = creations++ === 0 ? region : { ...region, id: ids[creations - 1] };
      return new Chain({ status, body: body === undefined ? { code: 'SUCCESS.CREATED', data: created } : body });
    },
  };
  const expectList = (value) => ({ to: { be: { an: (type) => {
    assert.equal(type, 'array'); assert.ok(Array.isArray(value));
    return { and: { not: { get empty() { assert.ok(value.length > 0); return true; } } } };
  } } } });
  const script = ts.transpileModule(readFileSync(resolve(root, 'cypress/e2e/toponyms/_helpers.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(script, { exports, cy, expect: expectList, console: { log() {} },
    Cypress: { env: (key) => ({ API_URL: 'http://localhost:8080', ACCESS_TOKEN: 'isolated-token' })[key] },
  });
  return { exports, requests, region, cy };
}

test('createRegion yields the exact typed response entity and preserves the HTTP fixture payload', () => {
  const harness = fixtureHarness();
  const payload = { name: 'Scenario name', shortName: 'Scenario short', countryId: 55 };
  const result = harness.exports.createRegion(payload);
  assert.equal(result.value, harness.region);
  assert.deepEqual(payload, { name: 'Scenario name', shortName: 'Scenario short', countryId: 55 });
  assert.equal(harness.requests.length, 1);
  const request = harness.requests[0];
  assert.equal(request.method, 'POST');
  assert.equal(request.url, 'http://localhost:8080/api/toponyms/create-toponym');
  assert.equal(request.body.countryId, 55);
  assert.equal(request.body.name, payload.name);
  assert.equal(request.body.shortName, payload.shortName);
  assert.equal(request.body.type, 'region');
  assert.equal(request.headers.Authorization, 'Bearer isolated-token');
});

for (const id of [0, -1, 1.5, '731', null, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
  test(`createRegion rejects invalid created ID ${String(id)} without scheduling a deletion`, () => {
    const harness = fixtureHarness({ id });
    assert.throws(() => harness.exports.createRegion({ name: 'Synthetic', countryId: 143 }), /positive safe-integer ID/);
    assert.ok(!harness.requests.some((request) => request.method === 'DELETE'));
  });
}

test('missing/null response entities and HTTP errors fail closed', () => {
  for (const body of [null, {}, { data: null }, { data: {} }]) {
    const harness = fixtureHarness({ body });
    assert.throws(() => harness.exports.createRegion({ name: 'Synthetic', countryId: 143 }));
  }
  const failed = fixtureHarness({ status: 500 });
  assert.throws(() => failed.exports.createRegion({ name: 'Synthetic', countryId: 143 }), /HTTP creation failure/);
});

test('cleanup accepts only a valid created ID and retains idempotent HTTP statuses', () => {
  for (const id of [undefined, null, 0, -1, 1.5, '731', NaN, Infinity]) {
    const harness = fixtureHarness();
    assert.throws(() => harness.exports.deleteRegion(id), /valid created region ID/);
    assert.equal(harness.requests.length, 0);
  }
  for (const deleteStatus of [200, 204, 404]) {
    const harness = fixtureHarness({ deleteStatus });
    assert.equal(harness.exports.deleteRegion(731).value, deleteStatus);
    const request = harness.requests[0];
    assert.equal(request.method, 'DELETE');
    assert.equal(request.qs.id, 731);
    assert.equal(request.qs.type, 'region');
    assert.equal(request.qs.destroy, true);
    assert.equal(request.failOnStatusCode, false);
  }
});

for (const filename of ['regions.live.cy.ts', 'details.live.cy.ts']) {
  test(`${filename} setup and cleanup pass the exact created ID through existing hooks`, () => {
    const harness = fixtureHarness({ id: 987, ids: [987, 988] });
    const before = [], after = [], beforeEach = [], afterEach = [];
    const source = ts.transpileModule(readFileSync(resolve(root, 'cypress/e2e/toponyms', filename), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports: {}, cy: harness.cy, before: (fn) => before.push(fn), after: (fn) => after.push(fn),
      beforeEach: (fn) => beforeEach.push(fn), afterEach: (fn) => afterEach.push(fn), describe: (_name, fn) => fn(), it() {},
      require: (name) => {
        if (name === './_assertions') return { checkRegionSort: () => assert.fail('Test bodies must not run in fixture-hook isolation') };
        assert.equal(name, './_helpers');
        return { ...harness.exports, apiLogin: () => new Chain('isolated-token') };
      },
    });
    before[0]();
    if (filename === 'details.live.cy.ts') beforeEach[0]();
    const cleanup = (filename === 'details.live.cy.ts' ? afterEach[0] : after[0])();
    assert.equal(cleanup.value, 204);
    const deletions = harness.requests.filter((request) => request.method === 'DELETE');
    assert.equal(deletions.length, filename === 'regions.live.cy.ts' ? 2 : 1);
    assert.equal(deletions[0].qs.id, 987);
    if (filename === 'regions.live.cy.ts') assert.equal(deletions[1].qs.id, 988);
  });
}
