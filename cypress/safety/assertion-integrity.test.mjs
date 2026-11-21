import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const read = (name) => readFileSync(resolve(root, name), 'utf8');
const fixture = (name) => JSON.parse(read(`cypress/fixtures/${name}`));
const plain = (value) => value !== undefined && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;

// Only assertion vocabulary used by the callbacks under test is supported.
// Unknown assertions fail rather than becoming no-op expectations.
function expect(value, message) {
  let negate = false, deep = false;
  const verify = (condition) => assert.equal(Boolean(condition), !negate, message);
  const proxy = new Proxy({}, { get(_target, key) {
    if (['to', 'be', 'have', 'been', 'and', 'at'].includes(key)) return proxy;
    if (key === 'not') { negate = !negate; return proxy; }
    if (key === 'deep') { deep = true; return proxy; }
    if (key === 'calledOnce') { verify(value.callCount === 1); return proxy; }
    if (key === 'eq') return (expected) => {
      verify(deep ? JSON.stringify(plain(value)) === JSON.stringify(plain(expected)) : Object.is(value, expected));
      return proxy;
    };
    if (key === 'include') return (expected) => {
      verify(Object.entries(expected).every(([name, expectedValue]) => JSON.stringify(plain(value?.[name])) === JSON.stringify(plain(expectedValue))));
      return proxy;
    };
    if (key === 'property') return (name, ...expected) => {
      verify(value != null && name in value && (!expected.length || Object.is(value[name], expected[0])));
      return proxy;
    };
    if (key === 'length') return (length) => { verify(value.length === length); return proxy; };
    if (key === 'most') return (max) => { verify(value <= max); return proxy; };
    if (key === 'greaterThan') return (min) => { verify(value > min); return proxy; };
    if (key === 'a') return (type) => { verify(typeof value === type); return proxy; };
    if (key === 'match') return (pattern) => { verify(pattern.test(value)); return proxy; };
    if (key === 'oneOf') return (values) => { verify(values.includes(value)); return proxy; };
    throw new Error(`Unsupported isolated expectation: ${String(key)}`);
  } });
  return proxy;
}

function harness(spec, mode = 'stub') {
  const cases = [], hooks = [], fixtureHooks = [], fixtureCreations = [], routes = [], commands = [], callbacks = [], spies = [], cache = new Map();
  const win = { URL: { createObjectURL: () => 'blob:synthetic-download' },
    HTMLAnchorElement: { prototype: { dispatchEvent: () => true } } };
  let scope = '';
  class Chain {
    constructor(label, value, immediate = false) { this.label = label; this.value = value; this.immediate = immediate; }
    then(fn) {
      callbacks.push({ label: this.label, kind: 'then', fn });
      if (this.immediate) fn(this.value);
      return new Chain(`${this.label}.then`);
    }
  }
  const chain = (label, value, immediate) => new Proxy(new Chain(label, value, immediate), {
    get(target, method) {
      if (method === 'then') return (fn) => {
        const result = target.then(fn);
        return chain(result.label, result.value, result.immediate);
      };
      return (...args) => {
        commands.push({ label, method, args });
        if (method === 'as') {
          const route = routes.findLast((item) => item.label === label);
          if (route) route.alias = args[0];
        }
        if (['should', 'and'].includes(method) && typeof args[0] === 'function') callbacks.push({ label, kind: method, fn: args[0] });
        return chain(label, value, immediate);
      };
    },
  });
  const cy = new Proxy({}, { get(_target, method) { return (...args) => {
    const label = `${String(method)}:${String(args[0] ?? '')}`;
    commands.push({ label, method, args });
    if (method === 'then') {
      callbacks.push({ label: 'then:', kind: 'then', fn: args[0] });
      return chain('then:.then');
    }
    if (method === 'intercept') routes.push({ label, args, handler: args.at(-1) });
    if (method === 'fixture') return chain(label, fixture(args[0]), true);
    if (method === 'window') return chain(label, win, true);
    if (method === 'spy') {
      const [object, key] = args, calls = [];
      const original = object[key];
      function spy(...values) {
        const call = { args: values, thisValue: this, returnValue: original.apply(this, values) };
        calls.push(call); return call.returnValue;
      }
      Object.defineProperties(spy, { callCount: { get: () => calls.length }, firstCall: { get: () => calls[0] } });
      spy.getCalls = () => calls;
      object[key] = spy; spies.push(spy); return spy;
    }
    return chain(label, args[0]);
  }; } });
  function load(name) {
    const path = resolve(root, name);
    assert.ok(!relative(root, path).startsWith('..'));
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const script = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(script, { exports, cy, expect, URL, console: { log() {} },
      Cypress: { env: (key) => key === 'USE_STUBS' ? (mode === 'stub' ? '1' : '0') : undefined,
        config: (key) => { assert.equal(key, 'pageLoadTimeout'); return 60000; }, Buffer },
      structuredClone,
      require: (dependency) => {
        if (dependency === './_helpers' && spec.endsWith('details.live.cy.ts')) return {
          apiLogin: () => chain('fixtureLogin', 'synthetic-token', true),
          createRegion: (payload) => { fixtureCreations.push(payload); return chain('fixtureRegion', { id: 987 }, true); },
          deleteRegion: () => { throw new Error('Cleanup must not run in callback characterization'); },
        };
        if (dependency === 'zod') return require('zod');
        let target = resolve(dirname(path), dependency);
        if (!existsSync(target)) target = target.endsWith('.js') ? target.slice(0, -3) + '.ts' : target + '.ts';
        return load(relative(root, target));
      },
      before: (fn) => fixtureHooks.push(fn), after() {}, afterEach() {}, beforeEach: (fn) => hooks.push({ scope, fn }),
      describe: (name, fn) => { const previous = scope; scope = name; fn(); scope = previous; },
      it: (name, fn) => cases.push({ scope, name, fn }),
    });
    return exports;
  }
  load(spec);
  return { cases, routes, commands, callbacks, spies, win, load, fixtureCreations,
    seed: () => {
      fixtureHooks.forEach((fn) => fn());
      hooks.forEach((hook) => hook.fn());
    },
    run(prefix, setup = false) {
      const selected = cases.find((item) => item.name.startsWith(prefix));
      assert.ok(selected, `Missing scenario: ${prefix}`);
      if (setup) hooks.filter((item) => item.scope === selected.scope).forEach((item) => item.fn());
      selected.fn();
    },
    route(alias) { const route = routes.findLast((item) => item.alias === alias); assert.ok(route, alias); return route.handler; },
    callback(label, kind = 'then') {
      const callback = callbacks.findLast((item) => item.label === label && item.kind === kind);
      assert.ok(callback, `${label} ${kind}`); return callback.fn;
    },
  };
}

const permissions = 'cypress/e2e/permissions.cy.ts';
const roles = 'cypress/e2e/roles.cy.ts';
const toponyms = 'cypress/e2e/toponyms/toponyms-list.stub.cy.ts';
const request = (authorization = 'Bearer tok_ref_1234567890', direction = 'asc') => ({
  body: { page: { number: 0 }, sort: [{ field: 'userName', direction }] }, headers: { authorization },
  reply(response) { this.response = response; },
});

test('E08: real scenario callbacks require 401 -> refresh -> authenticated retry, not hydration or stale tokens', () => {
  const h = harness(permissions); h.run('401');
  const protectedRequest = h.route('protected'), refresh = h.route('refresh');
  assert.throws(() => refresh(request()), 'Hydration/early refresh cannot satisfy the scenario');
  const first = request(); protectedRequest(first); assert.equal(first.response.statusCode, 401);
  const recovery = request(); refresh(recovery); assert.equal(recovery.response.statusCode, 200);
  const retry = request('Bearer acc_new_token'); protectedRequest(retry); assert.equal(retry.response.statusCode, 200);
  h.callback('wrap:')();
  assert.throws(() => protectedRequest(request('Bearer acc_new_token')), 'Extra retry is rejected');
  const stale = harness(permissions); stale.run('401');
  stale.route('protected')(request()); stale.route('refresh')(request());
  assert.throws(() => stale.route('protected')(request()), 'Retry with the old token fails');
  const assertion = h.callback('wait:@protected');
  assertion({ request: retry, response: retry.response });
  assert.throws(() => assertion({ request: retry, response: { ...retry.response, statusCode: 401 } }));
  assert.throws(() => assertion({ request: request(), response: retry.response }));
  const click = h.commands.findIndex((item) => item.method === 'click');
  const recoveryRoute = h.commands.findIndex((item) => item.method === 'intercept' && String(item.args[1]).endsWith('/session/refresh'));
  assert.ok(recoveryRoute < click);
  assert.ok(h.commands.findIndex((item) => item.method === 'visitApp') < recoveryRoute);
});

test('E08: 403 rejects recovery, checks the error response, and requires a later usable authenticated request', () => {
  const h = harness(permissions); h.run('403');
  const handler = h.route('protected403');
  const denied = request(); handler(denied); assert.equal(denied.response.statusCode, 403);
  const check = h.callback('wait:@protected403');
  check({ response: denied.response });
  assert.throws(() => check({ response: { statusCode: 200, body: { code: 'ERRORS.FORBIDDEN' } } }));
  const recovery = h.routes.find((item) => String(item.args[1]).endsWith('/session/refresh')).handler;
  assert.throws(() => recovery(request()), /must not refresh/);
  const usable = request('Bearer tok_ref_1234567890', 'desc'); handler(usable);
  assert.equal(usable.response.statusCode, 200);
  assert.equal(usable.response.body.data.list[0].id, 71);
  assert.ok(h.commands.some((item) => item.method === 'should' && item.label === 'location:pathname' && item.args[1] === '/users'));
  assert.ok(h.commands.some((item) => item.method === 'contains' && item.args[0] === 'p-toast .ui-toast-warn' && item.args.includes('Not enough permissions.')));
  assert.match(read('src/app/shared/base-layout/base-layout.component.html'), /'ui-toast-' \+ msg\.severity/);
  assert.throws(() => h.callback('wrap:')(), 'A forbidden recovery cannot pass the final zero-refresh assertion');
  const clean = harness(permissions); clean.run('403');
  clean.route('protected403')(request());
  clean.route('protected403')(request('Bearer tok_ref_1234567890', 'desc'));
  clean.callback('wrap:')();
});

test('E08: denied Create is checked only after authorization, exact route and allowed table readiness', () => {
  const h = harness(permissions); h.run('Users list:');
  const denied = h.commands.findIndex((item) => item.method === 'get' && String(item.args[0]).includes('btn-create-item'));
  for (const alias of ['@perms', '@usersList']) assert.ok(h.commands.findIndex((item) => item.method === 'wait' && item.args[0] === alias) < denied);
  assert.ok(h.commands.findIndex((item) => item.label === 'location:pathname' && item.method === 'should' && item.args[1] === '/users') < denied);
  assert.ok(h.commands.findIndex((item) => item.method === 'get' && item.args[0] === 'app-users-list table[mat-table]') < denied);
  assert.ok(h.commands.some((item) => item.method === 'should' && item.label.includes('btn-create-item') && item.args[0] === 'not.exist'));
});

test('E08: Admin scenarios assert Create, actual editable Role input/Delete, and User Edit/Delete controls', () => {
  const h = harness(permissions); h.run('Roles page'); h.run('Users page:');
  for (const selector of ['button[data-cy="add-role-btn"]', 'button[data-cy="delete-role-1"]', 'input[data-cy="role-name-1"]',
    'button[data-cy="btn-create-item"]', '.mat-mdc-dialog-container button[title="Edit"]']) {
    assert.ok(h.commands.some((item) => item.method === 'get' && item.args[0] === selector), selector);
  }
  assert.ok(h.commands.some((item) => item.method === 'contains' && String(item.args[1]) === '/^delete$/'));
  const payload = fixture('users-permissions.json').data;
  const { usersSchema, userSchema } = h.load('shared/schemas/user.schema.ts');
  assert.ok(usersSchema.safeParse(payload).success);
  assert.ok(userSchema.safeParse(payload.list[0]).success);
  assert.ok(!usersSchema.safeParse({ users: payload.list, length: 1 }).success);
});

for (const [prefix, text] of [
  ['401', 'Invalid password or username.'],
  ['423', 'Temporary lock after multiple failed attempts. Please try later.'],
  ['429', 'Too many attempts. Try again in 75 sec.'],
]) {
  test(`E08: ${prefix} requires the exact translated message, not just visible error text`, () => {
    const h = harness('cypress/e2e/sign-in.cy.ts'); h.run(prefix);
    const assertion = h.commands.find((item) => item.label === 'get:[data-cy="error"]' && item.method === 'and' && item.args[0] === 'have.text');
    assert.equal(assertion.args[1], text);
    const checkText = (actual) => assert.equal(actual, assertion.args[1]);
    checkText(text);
    assert.throws(() => checkText('Unexpected server error.'));
    if (prefix === '429') {
      assert.throws(() => checkText('Too many attempts. Try again in 120 sec.'));
      for (const name of ['retry-after', 'Retry-After']) {
        h.callback('wait:@signIn429')({ response: { statusCode: 429, body: { data: { retryAfterSec: 75 } }, headers: { [name]: '120' } } });
      }
      assert.throws(() => h.callback('wait:@signIn429')({ response: { statusCode: 429, body: { data: { retryAfterSec: 75 } }, headers: {} } }));
      assert.throws(() => h.callback('wait:@signIn429')({ response: { statusCode: 429, body: { data: { retryAfterSec: 75 } }, headers: { 'Retry-After': '999' } } }));
      assert.match(read('src/app/pages/sign-in/sign-in.component.ts'), /retryAfterSec\s*\?\?\s*Number\(err\?\.headers\?\.get\?\.\('Retry-After'\)\)/);
    }
  });
}

test('E09: duplicate Role rename rejects every PATCH/POST; busy create checks status, duplicate result and code', () => {
  const h = harness(roles); h.run('inline rename: name is busy');
  for (const method of ['PATCH', 'POST']) {
    assert.throws(() => h.routes.find((route) => route.args[0] === method).handler(request()), /must not/);
  }
  const check = h.callback('wait:@checkBusy');
  const good = { statusCode: 200, body: { data: true, code: 'ERRORS.ROLE.ALREADY_EXISTS' } };
  check({ response: good });
  for (const response of [{ ...good, statusCode: 500 }, { ...good, body: { data: false, code: good.body.code } },
    { ...good, body: { data: true, code: 'ERRORS.UNKNOWN' } }]) assert.throws(() => check({ response }));
  const create = harness(roles); create.run('create: busy');
  for (const method of ['POST', 'PATCH']) assert.throws(() => create.routes.find((route) => route.args[0] === method).handler(request()));
  create.callback('wait:@checkBusy')({ response: good });
  assert.ok(create.commands.some((item) => item.method === 'contains' && item.args[0] === 'p-toast .ui-toast-warn' && item.args.includes('A role with this name already exists.')));
});

test('E09: description single-PATCH assertion covers the completed Enter/output transition and rejects duplicates', () => {
  const h = harness(roles); h.run('inline description');
  const patch = h.route('updateDesc');
  patch({ body: { id: 2, name: 'User', description: 'Helper' }, reply() {} });
  h.callback('wrap:')();
  assert.throws(() => patch({ body: { id: 2, name: 'User', description: 'Helper' }, reply() {} }));
  const exit = h.commands.findIndex((item) => item.method === 'type' && item.args[0] === '{enter}');
  const finalCount = h.commands.findLastIndex((item) => item.method === 'wrap');
  assert.ok(finalCount > exit);
});

test('E09: live duplicate/free Role checks reject 304 ambiguity and inspect uncached semantic responses', () => {
  for (const [prefix, expected] of [['LIVE: checkRoleName', true], ['LIVE: create a unique', false]]) {
    const h = harness(roles, 'live'); h.run(prefix);
    const headers = { 'if-none-match': 'synthetic-etag', 'if-modified-since': 'synthetic-date', authorization: 'Bearer fake' };
    h.route('check')({ headers });
    assert.deepEqual(headers, { authorization: 'Bearer fake' });
    const check = h.callback('wait:@check');
    const response = { statusCode: 200, body: { data: expected, ...(expected ? { code: 'ERRORS.ROLE.ALREADY_EXISTS' } : {}) } };
    check({ response });
    assert.throws(() => check({ response: { statusCode: 304 } }));
    assert.throws(() => check({ response: { ...response, body: { ...response.body, data: !expected } } }));
    if (expected) {
      for (const method of ['POST', 'PATCH']) assert.throws(() => h.routes.find((route) => route.args[0] === method).handler(request()), /must not/);
    }
  }
});

test('E09: Role delete reload retains the unrelated role and only its permission cells', () => {
  const h = harness(roles); h.run('delete:');
  const payload = h.route('reload').body;
  assert.deepEqual(payload.data.roles.map((role) => role.id), [2]);
  assert.ok(payload.data.operations.every((operation) => operation.rolesAccesses.every((access) => access.roleId === 2)));
  assert.ok(h.load('shared/schemas/role.schema.ts').rolesListSchema.safeParse(payload.data).success);
  const check = h.callback('wait:@deleteRole');
  const result = { request: { method: 'DELETE', url: 'http://localhost:8080/api/roles/delete-role/1' }, response: { statusCode: 200 } };
  check(result);
  assert.throws(() => check({ ...result, request: { ...result.request, url: 'http://localhost:8080/api/roles/delete-role/2' } }));
  assert.throws(() => check({ ...result, response: { statusCode: 500 } }));
});

test('E09: search checks the exact normalized term, type and page without conditional acceptance', () => {
  const h = harness(toponyms); h.run('search normalizes');
  assert.ok(h.commands.some((item) => item.method === 'find' && item.args[0] === 'label'));
  const focused = h.commands.findIndex((item) => item.method === 'should' && item.args[0] === 'be.focused');
  assert.ok(focused >= 0 && focused < h.commands.findIndex((item) => item.method === 'type'));
  assert.ok(!h.commands.some((item) => item.method === 'click' && item.args[0]?.force));
  const handler = h.route('searchToponyms');
  const query = { type: 'region', search: 'елка', exact: 'false', page: '0', countries: '143' };
  handler({ query, reply() {} });
  for (const search of ['ёлка', 'ЕЛКА', ' елка ', 'елка suffix', '']) assert.throws(() => handler({ query: { ...query, search }, reply() {} }));
  assert.throws(() => handler({ query: { ...query, type: 'country' }, reply() {} }));
  assert.throws(() => handler({ query: { ...query, page: '1' }, reply() {} }));
});

test('E09: both stub sort fixtures return contrasting orders and shared assertions reject wrong column, direction, page or order', () => {
  for (const spec of [toponyms, 'cypress/e2e/toponyms/regions.stub.cy.ts']) {
    const h = harness(spec); h.run(spec === toponyms ? 'sort toggles' : 'sort triggers', true);
    if (spec === toponyms) {
      const page = h.commands.findIndex((item) => item.method === 'get' && item.args[0] === 'app-users-list table[mat-table]');
      const permission = h.commands.findIndex((item) => item.method === 'wait' && item.args[0] === '@perms');
      assert.ok(page >= 0 && page < permission, 'Render the allowed page before consuming hydration permissions');
      assert.equal(h.commands[page].args[1].timeout, 60000);
    }
    const handler = h.route('list');
    for (const [sortDir, expected] of [['asc', [101, 102]], ['desc', [102, 101]]]) {
      let response;
      handler({ query: { sortDir }, reply(value) { response = value; } });
      assert.deepEqual(Array.from(response.data.toponyms, (item) => item.id), expected);
    }
    const desc = h.callbacks.find((item) => item.label === 'wait:@list' && String(item.fn).includes("sortDir: 'desc'")).fn;
    const good = { request: { method: 'GET', query: { type: 'region', search: '', sortBy: 'name', sortDir: 'desc', page: '0', pageSize: '10', countries: '143' } }, response: { statusCode: 200 } };
    desc(good);
    for (const [key, value] of [['sortBy', 'country'], ['sortDir', 'asc'], ['page', '1'], ['countries', '99']]) {
      assert.throws(() => desc({ ...good, request: { ...good.request, query: { ...good.request.query, [key]: value } } }));
    }
    const order = h.callbacks.filter((item) => item.kind === 'should' && item.label.includes('td.mat-column-name'));
    const cells = (names) => names.map((textContent) => ({ textContent }));
    order[0].fn(cells(['Тверская', 'Тульская']));
    assert.throws(() => order[0].fn(cells(['Тульская', 'Тверская'])));
    order[2].fn(cells(['Тульская', 'Тверская']));
    assert.throws(() => order[2].fn(cells(['Тверская', 'Тульская'])));
    assert.ok(h.commands.some((item) => item.method === 'should' && item.args[1] === 'aria-sort' && item.args[2] === 'descending'));
  }
});

test('E09: Toponym delete rejects the wrong ID/reason and reload removes only the requested entity', () => {
  const h = harness(toponyms); h.run('delete flow', true);
  const remove = h.route('deleteToponym');
  const query = { type: 'region', id: '101', destroy: 'true' };
  assert.throws(() => remove({ query: { ...query, id: '102' }, reply() {} }));
  assert.throws(() => remove({ query: { ...query, destroy: 'false' }, reply() {} }));
  remove({ query, reply() {} });
  let body;
  h.route('list')({ query: {}, reply(value) { body = value; } });
  assert.deepEqual(Array.from(body.data.toponyms, (item) => item.id), [102]);
  const reloaded = h.callback('wait:@list');
  reloaded({ response: { statusCode: 200, body } });
  assert.throws(() => reloaded({ response: { statusCode: 200, body: fixture('toponyms.json').regions.list } }));
  assert.ok(h.commands.some((item) => item.label === 'contains:[data-cy="row"]' && item.method === 'should' && item.args[0] === 'not.exist'));
});

test('E09: live save assertions require the created ID/name/parent, success and a persisted reread after reload', () => {
  const h = harness('cypress/e2e/toponyms/details.live.cy.ts'); h.seed(); h.run('justSave');
  const save = h.callback('wait:@saveRegion');
  const name = h.commands.find((item) => item.method === 'type').args[0];
  const shortName = h.fixtureCreations[0].shortName;
  const observation = { request: { method: 'POST', body: { id: 987, name, shortName, countryId: 143, type: 'region' } },
    response: { statusCode: 200, body: { data: { id: 987, name, shortName, defaultAddressParams: { countryId: 143 } } } } };
  save(observation);
  for (const [key, value] of [['id', 999], ['name', 'wrong'], ['countryId', 1], ['shortName', 'changed']]) {
    assert.throws(() => save({ ...observation, request: { ...observation.request, body: { ...observation.request.body, [key]: value } } }));
  }
  assert.throws(() => save({ ...observation, response: { ...observation.response, statusCode: 500 } }));
  const rereadCheck = h.callback('wait:@regionById');
  const persisted = { request: { url: 'http://localhost:8080/api/toponyms/get-region-by-id/987' }, response: observation.response };
  rereadCheck(persisted);
  assert.throws(() => rereadCheck({ ...persisted, response: { statusCode: 200, body: { data: { id: 987, name: 'old name' } } } }));
  assert.throws(() => rereadCheck({ ...persisted, response: { statusCode: 200, body: { data: { id: 999, name } } } }));
  const reload = h.commands.findIndex((item) => item.method === 'reload');
  const reread = h.commands.findLastIndex((item) => item.method === 'intercept' && String(item.args[1]).includes('get-region-by-id'));
  assert.ok(reload >= 0 && reread > reload);
  assert.ok(h.commands.some((item) => item.method === 'should' && item.args[0] === 'have.value' && String(item.args[1]).endsWith('-edited')));
});

test('E10: download assertions reject missing saveAs, missing anchor, wrong filename/URL/status and changed bytes', async () => {
  const h = harness(toponyms); h.run('download template');
  const file = fixture('template-regions-download.json');
  const route = h.routes.find((item) => item.alias === 'downloadTemplate');
  assert.equal(route.args[0], 'GET');
  assert.equal(route.args[1], '**/api/files/download/template-regions.xlsx');
  assert.equal(route.handler.statusCode, 200);
  assert.equal(Buffer.compare(Buffer.from(route.handler.body), Buffer.from(file.contentBase64, 'base64')), 0);
  assert.equal(Object.prototype.toString.call(route.handler.body), '[object ArrayBuffer]');
  const effect = h.callback('wrap:', 'should');
  assert.throws(effect, 'No saveAs must fail');
  const blob = new Blob([route.handler.body], { type: file.contentType });
  const url = h.win.URL.createObjectURL(blob);
  assert.throws(effect, 'A Blob URL alone is not a download');
  const anchor = { download: 'wrong.xlsx', href: url };
  h.win.HTMLAnchorElement.prototype.dispatchEvent.call(anchor, { type: 'click' });
  assert.throws(effect, 'Wrong download filename must fail');
  anchor.download = file.filename; anchor.href = 'blob:wrong';
  assert.throws(effect, 'Wrong Blob URL must fail');
  anchor.href = url; effect();
  const checkRequest = h.callback('wait:@downloadTemplate');
  const observation = { request: { method: 'GET', url: 'http://localhost:8080/api/files/download/template-regions.xlsx' },
    response: { statusCode: 200, headers: { 'content-type': file.contentType } } };
  checkRequest(observation);
  assert.throws(() => checkRequest({ ...observation, response: { ...observation.response, statusCode: 404 } }));
  assert.throws(() => checkRequest({ ...observation, request: { ...observation.request, url: 'http://localhost:8080/api/files/download/wrong.xlsx' } }));
  const bytes = await h.callback('then:')();
  const checkBytes = h.callback('then:.then');
  checkBytes(bytes);
  assert.throws(() => checkBytes(new Uint8Array([0, 1, 2]).buffer));
});

test('C5: card hierarchy stub answers only districts of region 101 and requires a completed valid response', () => {
  const h = harness(toponyms); h.run('opens details');
  const route = h.routes.find((item) => item.alias === 'cardDistricts');
  assert.deepEqual(plain(route.args[0]), { method: 'GET', pathname: '/api/toponyms/get-toponyms-list', query: { typeOfToponym: 'districts', ids: '101' } });
  assert.equal(route.handler.statusCode, 200);
  assert.ok(h.load('shared/schemas/toponym.schema.ts').toponymNamesListSchema.safeParse(route.handler.body.data).success);
  const check = h.callback('get:@cardDistricts.all', 'should');
  const completed = { request: { query: { typeOfToponym: 'districts', ids: '101' } }, response: route.handler };
  const cancelled = { request: completed.request };
  check([cancelled, completed]);
  assert.throws(() => check([cancelled]));
  assert.throws(() => check([{ ...completed, request: { query: { typeOfToponym: 'districts', ids: '999' } } }]));
  assert.throws(() => check([{ ...completed, response: { statusCode: 200, body: { data: {} } } }]));
});

test('E10: the synthetic response is a readable XLSX containing only a synthetic header row', async () => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(fixture('template-regions-download.json').contentBase64, 'base64'));
  assert.equal(workbook.worksheets.length, 1);
  assert.equal(workbook.worksheets[0].rowCount, 1);
  assert.deepEqual(workbook.worksheets[0].getRow(1).values.slice(1), ['name', 'shortName']);
});

test('E11: clear/reselect asserts absent filters, exact country ID, returned regions and disabled/enabled controls', () => {
  const h = harness(toponyms); h.run('clearing country');
  const lists = h.callbacks.filter((item) => item.label === 'wait:@list');
  lists[0].fn({ request: { query: { type: 'region' } }, response: { statusCode: 200 } });
  assert.throws(() => lists[0].fn({ request: { query: { type: 'region', countries: '143' } }, response: { statusCode: 200 } }));
  const regions = h.callback('wait:@regionsOfCountry');
  const good = { request: { query: { typeOfToponym: 'regions', ids: '143' } }, response: { statusCode: 200, body: { data: [{ id: 101 }, { id: 102 }] } } };
  regions(good);
  assert.throws(() => regions({ ...good, request: { query: { typeOfToponym: 'regions', ids: '999' } } }));
  assert.throws(() => regions({ ...good, response: { statusCode: 200, body: { data: [] } } }));
  lists[1].fn({ request: { query: { type: 'region', countries: '143' } }, response: { statusCode: 200 } });
  assert.throws(() => lists[1].fn({ request: { query: { type: 'region' } }, response: { statusCode: 200 } }));
  const controls = h.commands.filter((item) => item.label === 'get:mat-select[formcontrolname="region"]');
  assert.ok(controls.some((item) => item.method === 'and' && item.args[1] === 'aria-disabled' && item.args[2] === 'true'));
  assert.equal(controls.filter((item) => item.method === 'and' && item.args[1] === 'aria-disabled' && item.args[2] === 'false').length, 2);
  const options = h.callbacks.find((item) => item.kind === 'should' && item.label.includes('primary-text')).fn;
  options(['', 'Тверская', 'Тульская'].map((textContent) => ({ textContent })));
  assert.throws(() => options(['', 'wrong region'].map((textContent) => ({ textContent }))));
});

test('C4 preserves every existing E2E scenario; only the misleading download/country labels are corrected', () => {
  function names(source) {
    const file = ts.createSourceFile('spec.ts', source, ts.ScriptTarget.Latest, true), result = [];
    function visit(node) {
      if (ts.isCallExpression(node) && (node.expression.getText(file) === 'it' || node.expression.getText(file).startsWith('maybe('))) {
        if (ts.isStringLiteral(node.arguments[0])) result.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(file); return result;
  }
  const renamed = {
    'download template navigates to correct URL (prefers window.open)': 'download template saves the HTTP Blob with the expected filename and bytes',
    'changing country triggers reload and enables Region': 'clearing country disables Region; reselecting Russia reloads and enables it',
  };
  for (const file of [permissions, roles, 'cypress/e2e/sign-in.cy.ts', toponyms,
    'cypress/e2e/toponyms/regions.stub.cy.ts', 'cypress/e2e/toponyms/regions.live.cy.ts', 'cypress/e2e/toponyms/details.live.cy.ts']) {
    const before = execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' });
    assert.deepEqual(names(read(file)), names(before).map((name) => renamed[name] ?? name));
    const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
    assert.equal(parsed.parseDiagnostics.length, 0);
    assert.doesNotMatch(read(file), /\bit\.(skip|only)\s*\(/);
  }
});
