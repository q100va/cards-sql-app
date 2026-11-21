import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const compile = (file) => ts.transpileModule(read(file), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const plain = (value) => JSON.parse(JSON.stringify(value));

function expect(value, message) {
  let deep = false, negate = false;
  const check = (condition) => assert.equal(Boolean(condition), !negate, message);
  const proxy = new Proxy({}, { get(_target, key) {
    if (['to', 'be', 'have', 'and'].includes(key)) return proxy;
    if (key === 'deep') { deep = true; return proxy; }
    if (key === 'not') { negate = !negate; return proxy; }
    if (key === 'empty') { check(value.length === 0); return proxy; }
    if (key === 'eq') return (expected) => {
      check(deep ? JSON.stringify(value) === JSON.stringify(expected) : Object.is(value, expected)); return proxy;
    };
    if (key === 'include') return (expected) => {
      check(Object.entries(expected).every(([name, item]) => JSON.stringify(value?.[name]) === JSON.stringify(item))); return proxy;
    };
    if (key === 'a') return (type) => { check(typeof value === type); return proxy; };
    if (key === 'greaterThan') return (minimum) => { check(value > minimum); return proxy; };
    if (key === 'match') return (pattern) => { check(pattern.test(value)); return proxy; };
    if (key === 'oneOf') return (values) => { check(values.includes(value)); return proxy; };
    throw new Error(`Unsupported isolated assertion: ${String(key)}`);
  } });
  return proxy;
}

// Closed source-evaluation harness. Every HTTP operation is an in-memory fake;
// unexpected imports/requests fail rather than loading application infrastructure.
function harness(spec, { ids = [987, 988], deleteStatus = 200, creationStatus = 201, mode = 'live' } = {}) {
  const hooks = { before: [], beforeEach: [], afterEach: [], after: [] };
  const cases = [], calls = [], requests = [], waits = new Map(), aliases = new Map(), registry = {}, regions = new Map();
  const elements = new Map(), appDocument = { activeElement: null }, runnerDocument = { activeElement: null };
  const env = { USE_STUBS: mode === 'stub' ? '1' : '0', API_URL: 'http://localhost:8080' };
  const seededRoles = ['Admin', 'Coordinator', 'User', 'Viewer'].map((name, index) => ({ id: index + 1, name }));
  let nextId = 0;

  class Chain {
    constructor(label, value, immediate = true) { this.label = label; this.value = value; this.immediate = immediate; }
    then(fn) {
      if (!this.immediate) { waits.set(this.label, fn); return this; }
      const result = fn(this.value);
      return result instanceof Chain ? result : new Chain(this.label, result === undefined ? this.value : result);
    }
    its(path) { return new Chain(this.label, path.split('.').reduce((value, key) => value?.[key], this.value)); }
    as(alias) { aliases.set(alias, this.value); return this; }
    should(...args) {
      calls.push({ method: 'should', label: this.label, args });
      if (this.label === 'HTTP') {
        if (args[0] === 'eq') assert.equal(this.value, args[1]);
        else if (args[0] === 'be.oneOf') assert.ok(args[1].includes(this.value));
        else assert.fail(`Unexpected HTTP assertion: ${args[0]}`);
      }
      if (args[0] === 'be.focused') assert.equal(this.value[0].ownerDocument.activeElement, this.value[0]);
      return this;
    }
    and(...args) { return this.should(...args); }
    find(...args) { calls.push({ method: 'find', label: this.label, args }); return new Chain(`find:${args[0]}`, this.value); }
    filter() { return this; }
    first() { calls.push({ method: 'first', label: this.label, args: [] }); return this; }
    scrollIntoView() { return this; }
    focus() {
      calls.push({ method: 'focus', label: this.label, args: [] });
      this.value[0].ownerDocument.activeElement = this.value[0]; return this;
    }
    click(...args) { calls.push({ method: 'click', label: this.label, args }); return this; }
    clear(...args) { calls.push({ method: 'clear', label: this.label, args }); return this; }
    type(...args) { calls.push({ method: 'type', label: this.label, args }); return this; }
  }
  function element(label) {
    if (!elements.has(label)) elements.set(label, { ownerDocument: appDocument });
    return new Chain(label, { 0: elements.get(label) });
  }
  function request(options) {
    requests.push(plain(options));
    const url = new URL(options.url);
    assert.equal(url.origin, env.API_URL);
    if (options.method === 'POST' && url.pathname === '/api/session/sign-in') {
      return new Chain('HTTP', { status: 200, body: { data: { token: 'setup-admin-token' } } });
    }
    if (options.method === 'POST' && url.pathname === '/api/toponyms/create-toponym') {
      if (creationStatus >= 400) throw new Error('Synthetic creation failure');
      const region = { id: ids[nextId++], ...options.body };
      regions.set(region.id, region);
      return new Chain('HTTP', { status: creationStatus, body: { data: region } });
    }
    if (options.method === 'GET' && url.pathname.startsWith('/api/toponyms/get-region-by-id/')) {
      const region = regions.get(Number(url.pathname.split('/').at(-1)));
      assert.ok(region, 'Only a fixture-owned region may be read');
      return new Chain('HTTP', { status: 200, body: { data: { ...region } } });
    }
    if (options.method === 'DELETE' && url.pathname === '/api/toponyms/delete-toponym') {
      if ([200, 204].includes(deleteStatus)) regions.delete(options.qs.id);
      return new Chain('HTTP', { status: deleteStatus });
    }
    if (options.method === 'DELETE' && /^\/api\/roles\/delete-role\/\d+$/.test(url.pathname)) {
      return new Chain('HTTP', { status: deleteStatus });
    }
    throw new Error(`Unexpected isolated request: ${options.method} ${url.pathname}`);
  }
  const cy = {
    task(name) { assert.equal(name, 'db:reset'); calls.push({ method: 'task', args: [name] }); return new Chain('HTTP', 'db-reset:done:v1'); },
    request, wrap: (value) => new Chain('wrap', value),
    then: (fn) => new Chain('then', undefined).then(fn),
    get: (selector, options) => { calls.push({ method: 'get', args: [selector, options] }); return element(selector); },
    contains: (selector, text) => { calls.push({ method: 'contains', args: [selector, text] }); return element(`contains:${selector}`); },
    intercept: (...args) => { calls.push({ method: 'intercept', args }); return new Chain('intercept', args); },
    wait(alias) {
      if (alias === '@liveSignIn') return new Chain(alias, { response: { statusCode: 200, body: { data: { token: 'ui-admin-token' } } } });
      if (alias === '@getRoles') return new Chain(alias, { response: { statusCode: 200, body: { data: { roles: seededRoles } } } });
      if (alias === '@getPerms') return new Chain(alias, { response: { statusCode: 200, body: { data: [] } } });
      return new Chain(alias, undefined, false);
    },
    login: (...args) => { calls.push({ method: 'login', args }); },
    visit: (...args) => { calls.push({ method: 'visit', args }); return new Chain('visit'); },
    visitApp: (...args) => { calls.push({ method: 'visitApp', args }); return new Chain('visitApp'); },
    location: (...args) => element(`location:${args[0]}`),
    reload: () => { calls.push({ method: 'reload', args: [] }); return new Chain('reload'); },
  };
  const Cypress = {
    env(key, ...value) { if (value.length) env[key] = value[0]; return env[key]; },
    config(key) { assert.equal(key, 'pageLoadTimeout'); return 60000; },
    Commands: { add(name, fn) { registry[name] = fn; cy[name] = fn; } },
  };
  function load(file) {
    const exports = {};
    vm.runInNewContext(compile(file), { exports, cy, Cypress, expect, URL, document: runnerDocument,
      console: { log() {} },
      ...Object.fromEntries(Object.keys(hooks).map((name) => [name, (fn) => hooks[name].push(fn)])),
      describe: (_name, fn) => fn(), it: (name, fn) => cases.push({ name, fn }),
      require(name) {
        if (name === './_helpers') return load('cypress/e2e/toponyms/_helpers.ts');
        if (name === './_assertions') return load('cypress/e2e/toponyms/_assertions.ts');
        throw new Error(`Unexpected isolated import: ${name}`);
      },
    });
    return exports;
  }
  load(spec);
  return { calls, requests, cases, regions, seededRoles, registry, elements, appDocument, runnerDocument, env,
    start: () => hooks.before.forEach((fn) => fn()), setup: () => hooks.beforeEach.forEach((fn) => fn()),
    finish: () => hooks.afterEach.forEach((fn) => fn()), end: () => hooks.after.forEach((fn) => fn()),
    run(prefix) { const scenario = cases.find((item) => item.name.startsWith(prefix)); assert.ok(scenario); scenario.fn(); },
    deliver(alias, observation) { assert.ok(waits.has(alias), `Missing callback ${alias}`); return waits.get(alias)(observation); },
  };
}

const permissions = 'cypress/e2e/toponyms/permissions.live.cy.ts';
const details = 'cypress/e2e/toponyms/details.live.cy.ts';
const roles = 'cypress/e2e/roles.cy.ts';

test('Permissions captures the real entity ID, binds its searched row and cleans up only that region as Admin', () => {
  const h = harness(permissions); h.start();
  const region = h.regions.get(987);
  assert.equal(region.countryId, 143);
  for (const role of ['Viewer', 'Admin']) {
    h.run(role);
    const observation = { request: { query: { type: 'region', search: region.name, countries: '143' } },
      response: { statusCode: 200, body: { data: { toponyms: [{ id: 987 }] } } } };
    h.deliver('@ownedPermissionRegion', observation);
    for (const ids of [[1], [987, 1], []]) assert.throws(() => h.deliver('@ownedPermissionRegion', {
      ...observation, response: { statusCode: 200, body: { data: { toponyms: ids.map((id) => ({ id })) } } },
    }));
    assert.throws(() => h.deliver('@ownedPermissionRegion', { ...observation, response: { statusCode: 500 } }));
  }
  assert.ok(h.calls.some((call) => call.method === 'contains' && call.args[0] === '[data-cy="row"]' && call.args[1] === region.name));
  assert.ok(h.calls.some((call) => call.method === 'find' && call.label === 'contains:[data-cy="row"]' && call.args[0].includes('open-menu-actions')));
  assert.doesNotMatch(read(permissions), /\.first\(\)/);
  h.end(); h.end();
  const deletes = h.requests.filter((request) => request.method === 'DELETE');
  assert.equal(deletes.length, 1);
  assert.deepEqual(deletes[0].qs, { id: 987, type: 'region', destroy: true });
  assert.equal(deletes[0].headers.Authorization, 'Bearer setup-admin-token');
});

test('Permissions creation failure or invalid returned ID never schedules cleanup of another record', () => {
  for (const options of [{ creationStatus: 500 }, { ids: [0] }, { ids: ['987'] }, { ids: [1.5] }]) {
    const h = harness(permissions, options);
    assert.throws(() => h.start()); h.end();
    assert.ok(!h.requests.some((request) => request.method === 'DELETE'));
  }
});

test('Details scenarios get separate named region fixtures even in reverse order and after an earlier edit', () => {
  const h = harness(details); h.start();
  const owned = [];
  for (const prefix of ['saveAndExit', 'justSave']) {
    h.setup();
    const creation = h.requests.filter((request) => request.method === 'POST' && request.body.type === 'region').at(-1);
    const [id, region] = [...h.regions.entries()].at(-1);
    owned.push({ id, name: region.name });
    assert.equal(creation.body.countryId, 143);
    assert.ok(region.name.endsWith(`-${owned.length}`));
    assert.ok(h.requests.some((request) => request.method === 'GET' && request.url.endsWith(`/get-region-by-id/${id}`)));
    h.run(prefix);
    region.name = 'Synthetic prior edit';
    h.finish();
    assert.equal(h.regions.size, 0);
    h.finish(); // Completed cleanup clears the tracked ID.
  }
  assert.notEqual(owned[0].id, owned[1].id);
  assert.notEqual(owned[0].name, owned[1].name);
  assert.deepEqual(h.requests.filter((request) => request.method === 'DELETE').map((request) => request.qs.id), owned.map((region) => region.id));
});

test('Each Details case also has complete fixture setup when selected alone', () => {
  for (const prefix of ['justSave', 'saveAndExit']) {
    const h = harness(details); h.start(); h.setup(); h.run(prefix); h.finish();
    assert.equal(h.requests.filter((request) => request.method === 'DELETE').length, 1);
    assert.equal(h.regions.size, 0);
  }
});

test('A failed Details creation cannot reuse a previous ID, and cleanup errors remain failures', () => {
  const failed = harness(details, { creationStatus: 500 }); failed.start();
  assert.throws(() => failed.setup()); failed.finish();
  assert.ok(!failed.requests.some((request) => request.method === 'DELETE'));
  const denied = harness(details, { deleteStatus: 403 }); denied.start(); denied.setup();
  assert.throws(() => denied.finish());
  assert.equal(denied.requests.at(-1).qs.id, 987);
});

function captureRole(h, id = 77) {
  h.start(); h.setup(); h.run('LIVE: create a unique');
  const name = h.calls.find((call) => call.method === 'type' && String(call.args[0]).startsWith('Role_')).args[0];
  const role = { id, name, description: 'Live created' };
  h.deliver('@create', { request: { body: { name, description: 'Live created' } }, response: { statusCode: 200, body: { data: name } } });
  return { role, observe: (overrides = {}) => h.deliver('@reload', {
    response: { statusCode: 200, body: { data: { roles: [...h.seededRoles, { ...role, ...overrides }] } } },
  }) };
}

test('Role ID comes from its verified real list response, with the current UI Admin identity for exact-ID cleanup', () => {
  const h = harness(roles), created = captureRole(h); created.observe(); h.finish(); h.finish();
  const deletes = h.requests.filter((request) => request.method === 'DELETE');
  assert.equal(deletes.length, 1);
  assert.equal(deletes[0].url, 'http://localhost:8080/api/roles/delete-role/77');
  assert.equal(deletes[0].headers.Authorization, 'Bearer ui-admin-token');
  assert.equal(deletes[0].failOnStatusCode, false);
});

test('Role cleanup rejects seeded, noninteger and malformed IDs before any DELETE', () => {
  for (const id of [1, 2, 3, 4, 0, -1, 1.5, '77', Number.MAX_SAFE_INTEGER + 1]) {
    const h = harness(roles), created = captureRole(h, id);
    assert.throws(created.observe); h.finish();
    assert.ok(!h.requests.some((request) => request.method === 'DELETE'));
  }
});

test('Role cleanup survives a persisted-value assertion failure, accepts missing owned records and propagates authorization failures', () => {
  for (const status of [200, 204, 404, 401, 403, 500]) {
    const h = harness(roles, { deleteStatus: status }), created = captureRole(h);
    assert.throws(() => created.observe({ description: 'Wrong persisted value' }));
    if ([200, 204, 404].includes(status)) h.finish();
    else assert.throws(() => h.finish());
    assert.equal(h.requests.at(-1).url, 'http://localhost:8080/api/roles/delete-role/77');
  }
});

test('Read-only Role scenarios and stub execution never schedule real cleanup', () => {
  for (const prefix of ['renders page', 'LIVE: checkRoleName']) {
    const h = harness(roles); h.start(); h.setup(); h.run(prefix); h.finish();
    assert.ok(!h.requests.some((request) => request.method === 'DELETE'));
  }
  const stub = harness(roles, { mode: 'stub' }); stub.start(); stub.finish();
  assert.equal(stub.requests.length, 0);
});

test('Live duplicate-role notification uses the actual custom warning template and retains its message/visibility assertion', () => {
  const h = harness(roles); h.run('LIVE: checkRoleName');
  assert.ok(h.calls.some((call) => call.method === 'contains' && call.args[0] === 'p-toast .ui-toast-warn' && call.args[1] === 'A role with this name already exists.'));
  assert.ok(h.calls.some((call) => call.method === 'should' && call.label === 'contains:p-toast .ui-toast-warn' && call.args[0] === 'be.visible'));
  assert.match(read('src/app/shared/base-layout/base-layout.component.html'), /'ui-toast-' \+ msg\.severity/);
});

test('Live login observes sign-in rendering before credentials, uses normal actions and waits for an enabled submit', () => {
  const h = harness('cypress/support/commands.ts'); h.registry.login();
  const ready = h.calls.findIndex((call) => call.method === 'should' && call.label === '[data-cy="sign-in-page"]' && call.args[0] === 'be.visible');
  const firstType = h.calls.findIndex((call) => call.method === 'type');
  assert.ok(ready >= 0 && firstType > ready);
  const enabled = h.calls.findIndex((call) => call.method === 'should' && call.label === '[data-cy="submit-btn"]' && call.args[0] === 'not.be.disabled');
  assert.ok(h.calls.findIndex((call) => call.method === 'click' && call.label === '[data-cy="submit-btn"]') > enabled);
  assert.ok(h.calls.filter((call) => ['type', 'click', 'clear'].includes(call.method)).every((call) => !call.args.some((arg) => arg?.force)));
  assert.equal(h.requests.length, 0);
});

test('Input focus belongs to the AUT document, regardless of the runner document focus', () => {
  const h = harness('cypress/support/commands.ts');
  h.registry.fillMatInput('[data-cy="synthetic-input"]', 'one');
  const element = h.elements.get('[data-cy="synthetic-input"]');
  h.appDocument.activeElement = null; h.runnerDocument.activeElement = element;
  const prior = h.calls.filter((call) => call.method === 'focus').length;
  h.registry.fillMatInput('[data-cy="synthetic-input"]', 'two');
  assert.equal(h.calls.filter((call) => call.method === 'focus').length, prior + 1);
  assert.equal(h.appDocument.activeElement, element);
  h.runnerDocument.activeElement = null;
  h.registry.fillMatInput('[data-cy="synthetic-input"]', 'three');
  assert.equal(h.calls.filter((call) => call.method === 'focus').length, prior + 1);
});

test('Explicit Russia fixtures do not request the first available country, and list search identifies the owned IDs', () => {
  const h = harness('cypress/e2e/toponyms/regions.live.cy.ts'); h.start(); h.setup(); h.run('loads and shows');
  const created = h.requests.filter((request) => request.method === 'POST' && request.body.type === 'region');
  assert.equal(created.length, 2);
  assert.ok(created.every((request) => request.body.countryId === 143));
  assert.ok(!h.requests.some((request) => request.url.includes('get-toponyms-list')));
  const observation = { request: { query: { type: 'region', search: created[0].body.name, countries: '143' } },
    response: { statusCode: 200, body: { data: { toponyms: [{ id: 987 }, { id: 988 }] } } } };
  h.deliver('@ownedRegions', observation);
  assert.throws(() => h.deliver('@ownedRegions', { ...observation, response: { statusCode: 200, body: { data: { toponyms: [{ id: 1 }] } } } }));
  assert.doesNotMatch(read('cypress/e2e/toponyms/regions.live.cy.ts'), /\.first\(\)/);
  h.end();
  assert.deepEqual(h.requests.filter((request) => request.method === 'DELETE').map((request) => request.qs.id), [987, 988]);
});
