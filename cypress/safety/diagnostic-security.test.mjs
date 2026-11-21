import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { format } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const secrets = { password: 'SYNTHETIC_PRIVATE_PASSWORD', token: 'SYNTHETIC_PRIVATE_TOKEN', cookie: 'SYNTHETIC_PRIVATE_COOKIE', permission: 'SYNTHETIC_PRIVATE_PERMISSION' };

// Logs are modeled separately from transport/command arguments. A command with
// log:false still performs the same fake operation and returns the same value.
function harness({ mode = 'live', token = secrets.token } = {}) {
  const visible = [], calls = [], registry = {}, callbacks = {}, cases = [], elements = new Map();
  const document = { activeElement: null };
  const env = { USE_STUBS: mode === 'stub' ? '1' : '0', API_URL: 'http://localhost:8080', ACCESS_TOKEN: secrets.token };
  let search = '';
  function record(method, args, options, result) {
    calls.push({ method, args, options });
    if (options?.log !== false) visible.push(format('%s %o %o', method, args, result));
  }
  function expect(value) {
    let negate = false;
    const proxy = new Proxy({}, { get(_target, key) {
      if (['to', 'be', 'and'].includes(key)) return proxy;
      if (key === 'not') { negate = true; return proxy; }
      if (key === 'eq') return (expected) => { record('assert', [value, expected]); assert.equal(value, expected); return proxy; };
      if (key === 'a' || key === 'an') return (type) => {
        record('assert', [value, type]);
        assert.equal(type === 'array' ? Array.isArray(value) : typeof value === type, !negate); return proxy;
      };
      if (key === 'empty') { record('assert', [value]); assert.equal(value.length === 0, !negate); return proxy; }
      throw new Error(`Unsupported isolated assertion: ${String(key)}`);
    } });
    return proxy;
  }
  class Chain {
    constructor(value, label = '') { this.value = value; this.label = label; }
    then(fn) { const next = fn(this.value); return next instanceof Chain ? next : new Chain(next === undefined ? this.value : next, this.label); }
    its(path, options) {
      const value = path.split('.').reduce((current, key) => current?.[key], this.value);
      record('its', [path], options, value); return new Chain(value);
    }
    should(...args) { record('should', args); return this; }
    and(...args) { return this.should(...args); }
    scrollIntoView() { return this; }
    focus() { document.activeElement = this.value[0]; return this; }
    blur() { return this; }
    type(value, options) {
      record('type', [value], options);
      calls.at(-1).label = this.label;
      if (this.label === '[data-cy="search-input"]') search = value.replace('{enter}', '');
      return this;
    }
    clear() { return this; }
    click() { return this; }
    find() { return this; }
    filter() { return this; }
    as() { return this; }
  }
  const auth = { status: 200, body: { data: { token } }, headers: { 'set-cookie': secrets.cookie } };
  const cy = {
    get(selector) {
      if (!elements.has(selector)) elements.set(selector, { ownerDocument: document });
      return new Chain({ 0: elements.get(selector) }, selector);
    },
    wrap: (value) => new Chain(value),
    visit: () => new Chain(undefined), visitApp: () => new Chain(undefined),
    location: () => new Chain('/users'), login() {},
    contains: () => new Chain({ 0: {} }),
    intercept: () => new Chain(undefined),
    wait(alias, options) {
      const result = { response: alias.includes('Perms') || alias === '@perms'
        ? { statusCode: 200, body: { data: [secrets.permission] } } : auth };
      record('wait', [alias], options, result); return new Chain(result);
    },
    request(options) {
      assert.equal(new URL(options.url).origin, 'http://localhost:8080');
      let result;
      if (options.url.endsWith('/api/session/sign-in')) result = auth;
      else if (options.method === 'DELETE') result = { status: 204 };
      else if (options.method === 'POST') result = { body: { data: { id: 987, ...options.body } } };
      else result = { body: { data: [{ id: 143, name: 'Synthetic country' }] } };
      record('request', [options], options, result); return new Chain(result);
    },
  };
  const Cypress = {
    env(key, ...value) { if (value.length) env[key] = value[0]; return env[key]; },
    config: () => 60000,
    Commands: { add(name, fn) { registry[name] = fn; cy[name] = fn; } },
  };
  function load(file, suffix = '') {
    const exports = {};
    const script = ts.transpileModule(read(file) + suffix, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(script, { exports, cy, Cypress, document, expect,
      console: { log: (...args) => visible.push(format(...args)) },
      before() {}, after() {}, afterEach() {},
      beforeEach: (fn) => { callbacks.beforeEach = fn; },
      describe: (_name, fn) => fn(), it: (name, fn) => cases.push({ name, fn }),
      require(name) {
        assert.equal(name, './_helpers');
        return { apiLogin: () => new Chain(secrets.token), createRegion: () => new Chain({ id: 987 }), deleteRegion: () => new Chain(204) };
      },
    });
    return exports;
  }
  return { load, registry, calls, visible, cy, callbacks, cases,
    assertPrivate() {
      const output = visible.join('\n');
      for (const marker of Object.values(secrets)) assert.ok(!output.includes(marker), 'Synthetic private marker reached visible diagnostics');
    },
  };
}

test('Password typing and replacement are hidden in live/stub login while original credential values still reach the fake input', () => {
  for (const mode of ['live', 'stub']) {
    const h = harness({ mode }); h.load('cypress/support/commands.ts');
    h.registry.login({ user: 'synthetic-user', pass: secrets.password });
    const typed = h.calls.filter((call) => call.method === 'type');
    const password = typed.find((call) => call.args[0] === secrets.password);
    assert.equal(password.options.log, false);
    assert.equal(typed[typed.indexOf(password) - 1].options.log, false);
    assert.ok(typed.some((call) => call.args[0] === 'synthetic-user' && call.options.log !== false));
    h.assertPrivate();
  }
});

test('API login suppresses credential request and sensitive response logs but preserves the exact request and status check', () => {
  const h = harness(); h.load('cypress/support/commands.ts');
  h.registry.login({ user: 'synthetic-user', pass: secrets.password, viaApi: true });
  const request = h.calls.find((call) => call.method === 'request');
  assert.equal(request.options.log, false);
  assert.deepEqual(JSON.parse(JSON.stringify(request.args[0].body)), { userName: 'synthetic-user', password: secrets.password });
  assert.ok(h.calls.some((call) => call.method === 'should' && call.args[0] === 'be.oneOf' && JSON.stringify(call.args[1]) === '[200,201]'));
  h.assertPrivate();
});

test('Standalone Sign In password path and authentication waits remain private', () => {
  const h = harness({ mode: 'stub' }); h.load('cypress/support/commands.ts');
  h.load('cypress/e2e/sign-in.cy.ts');
  h.callbacks.beforeEach();
  // Its shared render case uses the same typeCreds helper as every auth case.
  h.cases.find((scenario) => scenario.name.startsWith('renders and keeps')).fn();
  const passwords = h.calls.filter((call) => call.method === 'type' && call.label === '[data-cy="pass-input"]');
  assert.equal(passwords.length, 2);
  assert.ok(passwords.every((call) => call.options?.log === false));
  assert.ok(!h.visible.join('\n').includes(passwords.at(-1).args[0]));
  h.assertPrivate();
});

test('HTTP fixture login hides token extraction and validates malformed tokens without printing their values', () => {
  for (const token of [secrets.token, { private: secrets.token }, '', null]) {
    const h = harness({ token }); const helpers = h.load('cypress/e2e/toponyms/_helpers.ts');
    if (token === secrets.token) assert.equal(helpers.apiLogin({ user: 'synthetic-user', pass: secrets.password }).value, token);
    else assert.throws(() => helpers.apiLogin({ user: 'synthetic-user', pass: secrets.password }));
    assert.equal(h.calls.find((call) => call.method === 'request').options.log, false);
    assert.equal(h.calls.find((call) => call.method === 'its' && call.args[0] === 'body').options.log, false);
    h.assertPrivate();
  }
});

test('Country discovery and region create/delete suppress bearer request details without altering fixture operations', () => {
  const h = harness(), helpers = h.load('cypress/e2e/toponyms/_helpers.ts');
  helpers.resolveCountryId();
  helpers.createRegion({ name: 'Synthetic region', countryId: 143 });
  helpers.deleteRegion(987);
  const requests = h.calls.filter((call) => call.method === 'request');
  assert.equal(requests.length, 3);
  for (const call of requests) {
    assert.equal(call.options.log, false);
    assert.equal(call.args[0].headers.Authorization, `Bearer ${secrets.token}`);
  }
  assert.equal(requests[1].args[0].body.countryId, 143);
  assert.equal(requests[2].args[0].qs.id, 987);
  h.assertPrivate();
});

test('Permission readiness still asserts the response status but no longer dumps the private response', () => {
  const h = harness();
  const spec = h.load('cypress/e2e/toponyms/permissions.live.cy.ts', '\nexports.__visit = visitRegionsAs;');
  // Stop at the owned-region assertion: only its independent response/focus path
  // is outside this diagnostic check and is already covered by C7A.
  const wait = h.cy.wait;
  h.cy.wait = (alias, options) => {
    if (alias === '@ownedPermissionRegion') throw new Error('owned-region boundary');
    return wait(alias, options);
  };
  assert.throws(() => spec.__visit('Viewer', 987), /owned-region boundary/);
  assert.ok(h.calls.some((call) => call.method === 'assert' && call.args[0] === 200 && call.args[1] === 200));
  assert.equal(h.calls.find((call) => call.method === 'wait' && call.args[0] === '@getPerms').options.log, false);
  h.assertPrivate();
});

function parsed(file) { return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true); }
function walk(node, visit) { visit(node); ts.forEachChild(node, (child) => walk(child, visit)); }
function falseLog(node) {
  return node && ts.isObjectLiteralExpression(node) && node.properties.some((property) =>
    ts.isPropertyAssignment(property) && property.name.getText().replaceAll("'", '') === 'log' && property.initializer.kind === ts.SyntaxKind.FalseKeyword);
}

test('Every active direct credential/bearer request uses object-form log:false, including exact-ID role cleanup and Details reread', () => {
  let count = 0;
  for (const file of ['cypress/support/commands.ts', 'cypress/e2e/toponyms/_helpers.ts', 'cypress/e2e/toponyms/details.live.cy.ts', 'cypress/e2e/roles.cy.ts']) {
    walk(parsed(file), (node) => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'request') return;
      assert.ok(falseLog(node.arguments[0]), `${file}: direct request must suppress its log`); count++;
    });
  }
  assert.equal(count, 7);
});

test('Active authentication/permission waits and standalone password calls explicitly suppress logs', () => {
  const aliases = new Set(['@signIn', '@signIn401', '@signIn423', '@signIn429', '@signInSlow', '@refresh', '@perms', '@getPerms', '@liveSignIn']);
  let waits = 0, passwords = 0;
  for (const file of ['cypress/support/commands.ts', 'cypress/e2e/sign-in.cy.ts', 'cypress/e2e/roles.cy.ts',
    'cypress/e2e/toponyms/permissions.live.cy.ts', 'cypress/e2e/toponyms/regions.live.cy.ts']) {
    walk(parsed(file), (node) => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      const first = node.arguments[0];
      if (!first || !ts.isStringLiteral(first)) return;
      if (node.expression.name.text === 'wait' && aliases.has(first.text)) {
        assert.ok(falseLog(node.arguments[1]), `${file}: sensitive wait ${first.text}`); waits++;
      }
      if (node.expression.name.text === 'fillMatInput' && first.text === '[data-cy="pass-input"]') {
        assert.ok(falseLog(node.arguments[2]), `${file}: password input`); passwords++;
      }
    });
  }
  assert.ok(waits >= 10); assert.equal(passwords, 3);
});

test('Cypress artifact folders are ignored, source fixtures remain eligible, and useful screenshot/video settings are unchanged', () => {
  for (const folder of ['screenshots', 'videos', 'downloads', 'logs', 'results', 'reports']) {
    const path = `cypress/${folder}/synthetic-private-artifact.json`;
    const ignored = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], { cwd: root, input: `${path}\n`, encoding: 'utf8' });
    assert.equal(ignored.trim(), path);
  }
  assert.throws(() => execFileSync('git', ['check-ignore', '--no-index', '--stdin'], {
    cwd: root, input: 'cypress/fixtures/toponyms.json\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }), (error) => error.status === 1);
  assert.match(read('cypress.config.ts'), /video: false/);
  assert.doesNotMatch(read('cypress.config.ts'), /screenshotOnRunFailure:\s*false/);
});
