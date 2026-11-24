import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import pg from 'pg';
import { OPERATIONS, OPERATION_FLAG } from '../../shared/operations.js';
import { userSchema, usersSchema } from '../../../shared/dist/schemas/user.schema.js';

const run = promisify(execFile);
const tools = process.argv[2];
const database = 'test_phase8h1_' + randomBytes(5).toString('hex');
const secret = () => randomBytes(24).toString('hex');
const password = secret();
const login = 'initial-admin';
const pgPassword = secret();
const children = new Set();
const contactInputs = {
  Email: ' ADMIN@EXAMPLE.TEST ',
  'Phone number': '+1 (202) 555-0101',
  'Telegram ID': '#1234567',
  'Telegram phone number': '+1 (202) 555-0102',
};
const expectedContacts = {
  email: 'admin@example.test', phoneNumber: '+12025550101',
  telegramId: '#1234567', telegramPhoneNumber: '+12025550102',
};

function runQuiet(file, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(file, args, { stdio: 'ignore' });
    process.on('error', reject);
    process.on('exit', (status) => {
      if (status === 0) resolve();
      else reject(new Error('PostgreSQL control command failed.'));
    });
  });
}

function launch(args, env) {
  const child = spawn(process.execPath, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
  children.add(child);
  const result = { child, stdout: '', stderr: '', done: false };
  child.stdout.on('data', (chunk) => { result.stdout += chunk; });
  child.stderr.on('data', (chunk) => { result.stderr += chunk; });
  result.exit = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      children.delete(child);
      result.done = true;
      resolve(code);
    });
  });
  return result;
}

async function waitFor(check, description) {
  for (let attempt = 0; attempt < 250; attempt++) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error('Timed out waiting for ' + description);
}

async function prompt(proc, label, answer) {
  await waitFor(() => proc.stdout.includes(label) || proc.done, label);
  assert.equal(proc.stdout.includes(label), true, 'missing ' + label);
  if (answer !== undefined) proc.child.stdin.write(answer);
}

async function availablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) =>
    listener.on('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((err) => err ? reject(err) : resolve()));
  return port;
}

async function main() {
  assert.ok(tools, 'Pass the PostgreSQL 16 binary directory.');
  const root = await mkdtemp(join(tmpdir(), 'cards-8h1-'));
  const data = join(root, 'data');
  const pwfile = join(root, 'pw');
  const pgPort = await availablePort();
  const apiPort = await availablePort();
  const config = {
    host: '127.0.0.1', port: pgPort, user: 'postgres', password: pgPassword,
    connectionTimeoutMillis: 4000,
  };
  const env = {
    SystemRoot: process.env.SystemRoot,
    PATH: process.env.PATH,
    TEMP: root,
    TMP: root,
    NODE_ENV: 'production',
    DATABASE_URL: `postgres://postgres:${pgPassword}@127.0.0.1:${pgPort}/${database}`,
    DOTENV_CONFIG_PATH: join(root, 'no-dotenv'),
    PASSWORD_PEPPER: secret(),
    JWT_ACCESS_SECRET: secret(),
    JWT_REFRESH_SECRET: secret(),
    PORT: String(apiPort),
  };
  let started = false;
  let maintenance;
  let client;
  let step = 'initialize disposable cluster';

  try {
    await writeFile(pwfile, pgPassword, { flag: 'wx', mode: 0o600 });
    await run(join(tools, 'initdb.exe'), [
      '-D', data, '-U', 'postgres', '--auth=scram-sha-256', '--encoding=UTF8', '--pwfile=' + pwfile,
    ]);
    await rm(pwfile);
    await runQuiet(join(tools, 'pg_ctl.exe'), [
      '-D', data, '-l', join(root, 'postgres.log'), '-o',
      `-h 127.0.0.1 -p ${pgPort} -c log_error_verbosity=terse -c log_min_error_statement=panic`,
      '-W', 'start',
    ]);
    started = true;
    await waitFor(async () => {
      const probe = new pg.Client({ ...config, database: 'postgres' });
      try {
        await probe.connect();
        maintenance = probe;
        return true;
      } catch {
        await probe.end();
        return false;
      }
    }, 'disposable PostgreSQL startup');

    async function verifyIdentity(connection, name) {
      const { rows: [identity] } = await connection.query(
        "SELECT current_database() AS db, host(inet_server_addr()) AS host, inet_server_port() AS port, current_setting('data_directory') AS directory",
      );
      assert.equal(identity.db === name, true);
      assert.equal(identity.host === config.host, true);
      assert.equal(identity.port === config.port, true);
      assert.equal(await realpath(identity.directory) === await realpath(data), true);
    }

    await verifyIdentity(maintenance, 'postgres');
    await maintenance.query(`CREATE DATABASE "${database}"`);
    client = new pg.Client({ ...config, database });
    await client.connect();
    await verifyIdentity(client, database);
    const tableCount = async () => (await client.query(
      "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'",
    )).rows[0].count;
    assert.equal(await tableCount(), 0);
    console.log(`Verified disposable database at 127.0.0.1:${pgPort}/${database}, owned cluster ${data}`);

    const base = `http://127.0.0.1:${apiPort}`;
    async function startBackend() {
      const backend = launch(['server/server.js'], env);
      await waitFor(() => backend.stdout.includes('Application started') || backend.done, 'backend startup');
      assert.equal(backend.stdout.includes('[permissions] synchronized on boot'), true);
      assert.equal(backend.stdout.includes('All models synced'), true);
      assert.equal((await fetch(base + '/healthz')).status, 200);
      return backend;
    }

    async function stopBackend(backend) {
      backend.child.kill();
      await backend.exit;
    }

    const counts = async () => Object.values((await client.query(
      'SELECT (SELECT count(*)::int FROM users) a, (SELECT count(*)::int FROM roles) b, (SELECT count(*)::int FROM "role-permissions") c',
    )).rows[0]);
    const relatedCounts = async () => Object.values((await client.query(
      'SELECT (SELECT count(*)::int FROM "user-contacts") contacts, (SELECT count(*)::int FROM "user-searches") searches, (SELECT count(*)::int FROM "user-addresses") addresses',
    )).rows[0]);

    step = 'startup on empty schema';
    const firstBackend = await startBackend();
    assert.ok(await tableCount() > 0);
    assert.deepEqual(await counts(), [0, 0, 0]);
    console.log(`Actual startup created ${await tableCount()} public tables with normal boot synchronization.`);
    await stopBackend(firstBackend);

    const cli = 'server/scripts/bootstrap-admin.mjs';
    const runBootstrap = (overrides = {}, interactive = true, args = []) => launch([
      ...(interactive ? ['--import', './server/tests/bootstrap/terminal-shim.mjs'] : []), cli, ...args,
    ], { ...env, ...overrides });

    async function enterIdentity(proc, username = login, confirmation = 'CREATE ADMIN') {
      await prompt(proc, 'Admin username: ', username + '\r');
      await prompt(proc, 'First name: ', 'Synthetic\r');
      await prompt(proc, 'Last name: ', 'Administrator\r');
      await prompt(proc, 'Type CREATE ADMIN to continue: ', confirmation + '\r');
    }

    async function enterPasswords(proc, repeat = password) {
      await prompt(proc, 'Admin password (hidden', password + '\r');
      await prompt(proc, 'Repeat password (hidden): ', repeat + '\r');
    }

    async function enterContacts(proc, overrides = {}) {
      for (const [label, value] of Object.entries({ ...contactInputs, ...overrides })) {
        await prompt(proc, `${label} (hidden): `, value + '\r');
      }
    }

    async function expectExit(proc, status, message) {
      proc.child.stdin.end();
      await waitFor(() => proc.done, 'bootstrap process exit');
      assert.equal(await proc.exit, status);
      const output = proc.stdout + proc.stderr;
      assert.equal(output.includes(message), true, 'missing expected outcome');
      for (const sensitive of [password, pgPassword, env.PASSWORD_PEPPER, env.JWT_ACCESS_SECRET,
        env.JWT_REFRESH_SECRET, '$argon2id$', ...Object.values(contactInputs).map(value => value.trim()),
        ...Object.values(expectedContacts)]) {
        assert.equal(output.includes(sensitive), false, 'bootstrap output contained a secret');
      }
    }

    step = 'mode, terminal, identity and password rejection';
    await expectExit(runBootstrap({ NODE_ENV: 'development' }, false), 1, 'NODE_ENV must be production');
    await expectExit(runBootstrap({}, false), 1, 'interactive terminal is required');
    let proc = runBootstrap();
    await enterIdentity(proc, login, 'CANCEL');
    await expectExit(proc, 1, 'Cancelled.');
    proc = runBootstrap();
    await enterIdentity(proc, 'short'.repeat(5));
    await expectExit(proc, 1, 'username of 5-20');
    proc = runBootstrap();
    await enterIdentity(proc);
    await enterContacts(proc);
    await prompt(proc, 'Admin password (hidden', 'typed\x03');
    await expectExit(proc, 1, 'Cancelled.');
    proc = runBootstrap();
    await enterIdentity(proc);
    await enterContacts(proc);
    await enterPasswords(proc, secret());
    await expectExit(proc, 1, 'Passwords differ');
    for (const overrides of [{ Email: '' }, { 'Telegram ID': 'malformed' }]) {
      proc = runBootstrap();
      await enterIdentity(proc);
      await enterContacts(proc, overrides);
      await expectExit(proc, 1, 'Required contact input is invalid');
    }
    assert.deepEqual(await counts(), [0, 0, 0]);
    assert.deepEqual(await relatedCounts(), [0, 0, 0]);

    step = 'existing record rejection';
    // The fixture-only session disables FK triggers to isolate the grant check.
    await client.query("INSERT INTO users (\"userName\", password, \"firstName\", \"lastName\", \"dateOfStart\", \"isRestricted\", \"failedLoginCount\", \"bruteStrikeCount\", \"createdAt\", \"updatedAt\") VALUES ('fixture', 'fixture', 'Fixture', 'User', now(), false, 0, 0, now(), now())");
    await expectExit(runBootstrap(), 1, 'already exist');
    assert.deepEqual(await counts(), [1, 0, 0]);
    await client.query('DELETE FROM users');
    await client.query("INSERT INTO roles (name, description, \"createdAt\", \"updatedAt\") VALUES ('Fixture role', 'Fixture description', now(), now())");
    await expectExit(runBootstrap(), 1, 'already exist');
    assert.deepEqual(await counts(), [0, 1, 0]);
    await client.query('DELETE FROM roles');
    await client.query("SET session_replication_role = replica");
    await client.query("INSERT INTO \"role-permissions\" (\"roleId\", name, access, disabled, \"createdAt\", \"updatedAt\") VALUES (-1, 'FIXTURE', true, false, now(), now())");
    await client.query("SET session_replication_role = origin");
    await expectExit(runBootstrap(), 1, 'already exist');
    assert.deepEqual(await counts(), [0, 0, 1]);
    await client.query('DELETE FROM "role-permissions"');

    step = 'transaction rollback';
    await client.query(`
      CREATE FUNCTION test_reject_initial_user() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Forced bootstrap fixture failure';
      END;
      $$;
      CREATE TRIGGER test_reject_initial_user BEFORE INSERT ON "user-searches"
      FOR EACH ROW EXECUTE FUNCTION test_reject_initial_user();
    `);
    proc = runBootstrap();
    await enterIdentity(proc);
    await enterContacts(proc);
    await enterPasswords(proc);
    await expectExit(proc, 1, 'An unexpected error occurred');
    assert.deepEqual(await counts(), [0, 0, 0]);
    assert.deepEqual(await relatedCounts(), [0, 0, 0]);
    await client.query('DROP TRIGGER test_reject_initial_user ON "user-searches"');

    step = 'concurrent bootstrap';
    await client.query('SELECT pg_advisory_lock(42043)');
    const attempts = [runBootstrap(), runBootstrap()];
    await Promise.all(attempts.map(async (candidate) => {
      await enterIdentity(candidate);
      await enterContacts(candidate);
      await enterPasswords(candidate);
      candidate.child.stdin.end();
    }));
    await waitFor(async () => (await client.query(
      "SELECT count(*)::int AS count FROM pg_locks WHERE locktype = 'advisory' AND objid = 42043 AND NOT granted AND database = (SELECT oid FROM pg_database WHERE datname = current_database())",
    )).rows[0].count === 2, 'two blocked bootstrap transactions');
    await client.query('SELECT pg_advisory_unlock(42043)');
    await waitFor(() => attempts.every((attempt) => attempt.done), 'concurrent bootstrap exits');
    const statuses = await Promise.all(attempts.map((attempt) => attempt.exit));
    assert.deepEqual(statuses.toSorted(), [0, 1]);
    await Promise.all(attempts.map((attempt, index) => expectExit(
      attempt, statuses[index], statuses[index] === 0 ? 'Administrator created.' : 'database is no longer empty',
    )));
    assert.deepEqual(await counts(), [1, 1, OPERATIONS.length]);
    assert.deepEqual(await relatedCounts(), [4, 1, 0]);

    const snapshot = async () => (await client.query(
      'SELECT (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM users u) users, (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM roles r) roles, (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM "role-permissions" p) grants',
    )).rows[0];

    step = 'repeat refusal, Argon2id and restart preservation';
    const before = await snapshot();
    const repeat = runBootstrap({
      DATABASE_URL: env.DATABASE_URL.replace('127.0.0.1', 'localhost') + '?host=127.0.0.1',
    });
    await expectExit(repeat, 1, 'already exist');
    assert.equal(repeat.stdout.includes(`Target database: 127.0.0.1:${pgPort}/${database}`), true);
    assert.equal(JSON.stringify(await snapshot()) === JSON.stringify(before), true);
    assert.equal(before.users[0].isRestricted, false);
    assert.equal(before.users[0].roleId, before.roles[0].id);
    assert.equal(before.roles[0].name, 'Administrator');
    process.env.PASSWORD_PEPPER = env.PASSWORD_PEPPER;
    const { verify } = await import('../../security/passwords.mjs');
    assert.equal(before.users[0].password.startsWith('$argon2id$'), true);
    assert.equal(await verify(before.users[0].password, password), true);
    assert.equal(await verify(before.users[0].password, secret()), false);

    const backend = await startBackend();
    assert.equal(JSON.stringify(await snapshot()) === JSON.stringify(before), true);
    step = 'real login, permission delivery and protected requests';
    const signIn = await fetch(base + '/api/session/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userName: login, password }),
    });
    assert.equal(signIn.status, 200);
    const { data: session } = await signIn.json();
    assert.equal(session.user.roleName, 'Administrator');
    assert.equal(typeof session.token, 'string');
    const headers = { authorization: `Bearer ${session.token}` };
    const grants = await fetch(base + '/api/auth/permissions', { headers });
    assert.equal(grants.status, 200);
    const { data: permissions } = await grants.json();
    assert.equal(permissions.length, OPERATIONS.length);
    const byCode = new Map(permissions.map((grant) => [grant.operation, grant]));
    for (const operation of OPERATIONS) {
      const grant = byCode.get(operation.operation);
      assert.equal(grant.roleId, before.roles[0].id);
      assert.equal(grant.access, true);
      assert.equal(grant.disabled, operation.flag === OPERATION_FLAG.LIMITED);
    }
    for (const path of ['/api/roles/get-roles', '/api/users/check-user-name?userName=initial-admin']) {
      assert.equal((await fetch(base + path)).status, 401);
      assert.equal((await fetch(base + path, { headers })).status, 200);
    }
    step = 'Users list, detail and text search';
    const adminId = session.user.id;
    async function checkUserViews() {
      for (const search of [undefined, { value: login, exact: true }]) {
        const response = await fetch(base + '/api/users/get-users', {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ page: { number: 0, size: 20 }, search }),
        });
        assert.equal(response.status, 200);
        const parsed = usersSchema.safeParse((await response.json()).data);
        assert.equal(parsed.success, true);
        assert.equal(parsed.data.list.some(row => row.id === adminId), true);
      }
      const detail = await fetch(base + `/api/users/get-user-by-id/${adminId}`, { headers });
      assert.equal(detail.status, 200);
      const parsed = userSchema.safeParse((await detail.json()).data);
      assert.equal(parsed.success, true);
      const { orderedContacts, address } = parsed.data;
      for (const [type, content] of Object.entries(expectedContacts)) {
        assert.equal(orderedContacts[type].length === 1 && orderedContacts[type][0].content === content, true);
      }
      assert.equal(orderedContacts.telegram.length, 2);
      assert.deepEqual(address, { country: null, region: null, district: null, locality: null });
    }
    await checkUserViews();

    step = 'existing administrator repair and repeat refusal';
    await stopBackend(backend);
    const beforeRepair = await snapshot();
    await client.query('DELETE FROM "user-contacts" WHERE "userId" = $1', [adminId]);
    await client.query('DELETE FROM "user-searches" WHERE "userId" = $1', [adminId]);
    async function runRepair(username = login, confirmation = 'REPAIR ADMIN') {
      const repair = runBootstrap({}, true, ['--repair-existing']);
      await prompt(repair, 'Existing admin user ID: ', adminId + '\r');
      await prompt(repair, 'Admin username: ', username + '\r');
      await prompt(repair, 'Type REPAIR ADMIN to continue: ', confirmation + '\r');
      if (confirmation === 'REPAIR ADMIN') await enterContacts(repair);
      return repair;
    }
    await expectExit(await runRepair(login, 'CANCEL'), 1, 'Cancelled');
    await expectExit(await runRepair('other-admin'), 1, 'do not identify');
    assert.deepEqual(await relatedCounts(), [0, 0, 0]);
    await client.query(`
      CREATE TRIGGER test_reject_initial_user BEFORE INSERT ON "user-searches"
      FOR EACH ROW EXECUTE FUNCTION test_reject_initial_user();
    `);
    await expectExit(await runRepair(), 1, 'An unexpected error occurred');
    assert.deepEqual(await relatedCounts(), [0, 0, 0]);
    await client.query('DROP TRIGGER test_reject_initial_user ON "user-searches"');
    await client.query('DROP FUNCTION test_reject_initial_user()');
    await expectExit(await runRepair(), 0, 'Administrator contacts and search repaired');
    await expectExit(await runRepair(), 1, 'already has contacts or search records');
    assert.deepEqual(await relatedCounts(), [4, 1, 0]);
    assert.equal(JSON.stringify(await snapshot()) === JSON.stringify(beforeRepair), true);
    await startBackend();
    await checkUserViews();
    console.log(`Verified real login, ${permissions.length} grants, Users schemas and search, rollback, concurrency and existing account repair.`);
  } catch {
    throw new Error(`Verification failed during ${step}.`);
  } finally {
    const active = [...children];
    for (const child of active) child.kill();
    await Promise.all(active.map((child) => child.exitCode === null
      ? new Promise((resolve) => child.once('close', resolve))
      : undefined));
    await client?.end();
    await maintenance?.end();
    if (started) await runQuiet(join(tools, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-w', 'stop']);
    const resolvedRoot = await realpath(root);
    assert.equal(dirname(resolvedRoot), await realpath(tmpdir()));
    await rm(resolvedRoot, { recursive: true, force: true });
  }
}

await main();
