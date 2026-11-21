import { spawn, execFile } from 'node:child_process';
import { readFileSync, realpathSync, lstatSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { lookup } from 'node:dns/promises';
import { parse } from 'dotenv';
import { loadEnvironment, verifyBackend } from './node.mjs';
import { API_URL, FRONTEND_URL } from './policy.mjs';
import { validateInputs, validateCatalog, validateInventory, validateLocalhost, validateDatabaseListener, sourceDigest } from './live-runner-policy.mjs';

const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '../..'));
const helper = join(root, 'cypress/safety/live-windows.ps1');
const reviewedAdapter = Object.freeze({
  'live-windows.ps1': '3302fbc5fe0dcd96936f27e378846526e91b0ebe7df84e2bb29533714b41c293',
  'live-process-job.cs': '1fc5ece781e2710cb9265ab16c3b1c0d8bd1fa0f68f2a1825a906d6232908112',
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const outside = (file) => { const path = relative(root, file); return isAbsolute(path) || path === '..' || path.startsWith(`..\\`) || path.startsWith('../'); };

export function childEnvironment(system, nodeExecutable, directory) {
  const profile = join(directory, 'profile');
  const base = { SystemRoot: system, WINDIR: system, SystemDrive: system.slice(0, 2),
    ProgramData: join(system.slice(0, 3), 'ProgramData'), ALLUSERSPROFILE: join(system.slice(0, 3), 'ProgramData'), PATHEXT: '.COM;.EXE;.BAT;.CMD',
    ComSpec: join(system, 'System32/cmd.exe'), PATH: `${dirname(nodeExecutable)};${join(system, 'System32')};${system}`,
    USERPROFILE: profile, APPDATA: join(profile, 'AppData/Roaming'), LOCALAPPDATA: join(profile, 'AppData/Local'),
    TEMP: join(directory, 'temp'), TMP: join(directory, 'temp'), CI: '1', NG_CLI_ANALYTICS: 'false',
    NPM_CONFIG_USERCONFIG: join(directory, 'npm-user.ini'), NPM_CONFIG_GLOBALCONFIG: join(directory, 'npm-global.ini') };
  return base;
}

function cleanEnvironment(env, directory) {
  const system = realpathSync(env.SystemRoot ?? env.SYSTEMROOT ?? 'C:\\Windows');
  if (!/^[a-z]:\\Windows$/i.test(system)) throw new Error('Trusted Windows system directory is required.');
  return childEnvironment(system, process.execPath, directory);
}

function rejectPolicyOverrides(environment) {
  if (Object.keys(environment).some((name) => /^(PSExecutionPolicyPreference|PSModulePath|__PSLockdownPolicy|POWERSHELL_.*)$/i.test(name))) {
    throw new Error('Inherited PowerShell policy/module overrides are forbidden.');
  }
}

function helperInvocation(environment, action, value) {
  if (process.platform !== 'win32') throw new Error('The reviewed helper requires Windows.');
  rejectPolicyOverrides(environment);
  if (!/^[a-z]:\\/i.test(helper) || !/^[a-z]:\\Windows$/i.test(environment.SystemRoot ?? '') ||
    !['inspect', 'secure', 'check-private', 'lock', 'run'].includes(action) || typeof value !== 'string' || /[\0\r\n]/.test(value) ||
    (['inspect', 'secure', 'lock'].includes(action) ? value !== '' : !/^[a-z]:\\/i.test(value))) {
    throw new Error('Unexpected Windows helper invocation.');
  }
  const executable = join(environment.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  for (const file of [environment.SystemRoot, executable, ...Object.keys(reviewedAdapter).map((name) => join(dirname(helper), name))]) {
    const stat = lstatSync(file);
    if (stat.isSymbolicLink() || realpathSync(file).toLowerCase() !== file.toLowerCase() ||
      (file === environment.SystemRoot ? !stat.isDirectory() : !stat.isFile())) throw new Error('Canonical local helper paths are required.');
  }
  for (const [name, digest] of Object.entries(reviewedAdapter)) {
    if (sourceDigest(readFileSync(join(dirname(helper), name))) !== digest) throw new Error('Reviewed Windows adapter integrity mismatch.');
  }
  return { executable, args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned',
    '-File', helper, '-Action', action, '-Value', value] };
}

async function powershell(environment, action, value = '') {
  const { executable, args } = helperInvocation(environment, action, value);
  let child;
  const stdout = await new Promise((resolve, reject) => {
    child = execFile(executable, args, {
      env: environment, windowsHide: true, timeout: 30000, maxBuffer: 8 * 1024 * 1024,
    }, (error, output) => error ? reject(error) : resolve(output));
  });
  const result = JSON.parse(stdout.trim());
  if (action === 'inspect') result.inspectorPid = child.pid;
  return result;
}

async function privateFile(environment, file) {
  const path = realpathSync(file);
  if (!outside(path) || !/^[a-z]:\\/i.test(path) || !lstatSync(path).isFile()) throw new Error('Private local files outside the checkout are required.');
  await powershell(environment, 'check-private', path);
  await powershell(environment, 'check-private', dirname(path));
  return path;
}

export async function prepare(env) {
  rejectPolicyOverrides(env);
  if (process.execArgv.length || env.NODE_OPTIONS || env.NODE_PATH) throw new Error('Runner debugger/preload settings are forbidden.');
  if (process.platform !== 'win32') throw new Error('This process-ownership adapter currently supports Windows only.');
  if (!env.E2E_ENV_FILE || !env.E2E_LIVE_APPROVAL_FILE) throw new Error('Both private configuration and operator approval files are required.');
  // No parent environment is passed to helpers, Angular, the API or Cypress.
  const bootstrap = cleanEnvironment(env, dirname(process.execPath));
  const envFile = await privateFile(bootstrap, env.E2E_ENV_FILE);
  const approvalFile = await privateFile(bootstrap, env.E2E_LIVE_APPROVAL_FILE);
  const source = readFileSync(envFile, 'utf8'), approvalSource = readFileSync(approvalFile, 'utf8');
  const values = parse(source), approval = JSON.parse(approvalSource);
  const database = validateInputs(env, values, approval);
  validateLocalhost(await lookup('localhost', { all: true }));
  if (realpathSync(approval.server.executable).toLowerCase() !== approval.server.executable.toLowerCase() ||
    !outside(approval.server.executable) || !lstatSync(approval.server.executable).isFile()) throw new Error('A canonical installed native PostgreSQL executable is required.');
  const binary = realpathSync(approval.cypressBinary);
  if (!outside(binary) || !/^[a-z]:\\/i.test(binary) || !lstatSync(binary).isFile() || !/\\Cypress\.exe$/i.test(binary)) throw new Error('An installed trusted local Cypress executable is required.');
  const installed = JSON.parse(readFileSync(join(root, 'node_modules/cypress/package.json'), 'utf8')).version;
  if (JSON.parse(readFileSync(join(dirname(binary), 'resources/app/package.json'), 'utf8')).version !== installed) throw new Error('Cypress binary/package versions must match.');
  const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
  if (scripts['api:e2e'] !== 'cross-env E2E_MODE=live node cypress/safety/backend.mjs' ||
    scripts['start:e2e'] !== 'ng serve --configuration e2e --port 56379 --host localhost') throw new Error('Approved startup scripts changed.');
  const paths = await powershell(bootstrap, 'secure');
  if (!outside(realpathSync(paths.directory)) || !/^[a-z]:\\/i.test(realpathSync(paths.directory))) throw new Error('Private local artifact storage is required.');
  const environment = cleanEnvironment(env, paths.directory);
  for (const directory of [environment.USERPROFILE, environment.APPDATA, environment.LOCALAPPDATA, environment.TEMP]) mkdirSync(directory, { recursive: true });
  for (const file of [environment.NPM_CONFIG_USERCONFIG, environment.NPM_CONFIG_GLOBALCONFIG]) writeFileSync(file, '');
  const blocked = join(paths.base, 'UNSAFE-REQUIRES-OPERATOR-REVIEW');
  if (existsSync(blocked)) throw new Error('A previous unsafe exit requires manual process review.');
  return { root, directory: paths.directory, environment, envFile, approvalFile, source, values, approval, database, binary, blocked,
    digest: sourceDigest(source + '\0' + approvalSource), jobs: new Set(), pairs: 0 };
}

function bridge(configuration, action, value) {
  const { executable, args } = helperInvocation(configuration.environment, action, value);
  const child = spawn(executable, args, {
    env: configuration.environment, cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const messages = [], pending = [];
  let ended = false, processExited = false, code = null, fault = false;
  const lines = createInterface({ input: child.stdout });
  const receive = (message) => { messages.push(message); for (const notify of pending.splice(0)) notify(); };
  lines.on('line', (line) => { try { const message = JSON.parse(line); if (message.event === 'error') fault = true; receive(message); } catch { fault = true; receive({ event: 'error' }); } });
  child.stderr.on('data', () => { fault = true; }); // No raw helper errors are forwarded.
  child.on('error', () => { fault = true; ended = true; receive({ event: 'error' }); });
  child.on('exit', (exit) => { processExited = true; code = exit; receive({ event: 'helper-exit' }); });
  child.on('close', () => { ended = true; receive({ event: 'helper-closed' }); });
  // A completed helper can close stdin just before its final JSON/exit event.
  // Exit proof, not an EPIPE race, determines whether cleanup succeeded.
  child.stdin.on('error', () => {});
  async function until(predicate, timeout = 30000) {
    const deadline = Date.now() + timeout;
    while (!predicate()) {
      if (fault || ended || Date.now() >= deadline) throw new Error('Owned process control failed.');
      await new Promise((resolve) => { const timer = setTimeout(resolve, 100); pending.push(() => { clearTimeout(timer); resolve(); }); });
    }
  }
  return { child, messages, get ended() { return ended; }, get processExited() { return processExited; }, get code() { return code; }, get fault() { return fault; }, until,
    send(message) { if (ended || !child.stdin.writable) throw new Error('Owned process control channel closed.'); child.stdin.write(`${message}\n`); },
    async exited() { await until(() => ended); if (code !== 0 || fault) throw new Error('Owned helper exit was not clean.'); },
  };
}

export async function acquire(configuration) {
  const lock = bridge(configuration, 'lock', '');
  try {
    await lock.until(() => lock.messages.some((message) => message.event === 'started'));
    if (lock.messages.find((message) => message.event === 'started').pid !== lock.child.pid) throw new Error('Ambiguous lock owner.');
  }
  catch { lock.child.stdin.end(); await lock.exited().catch(() => {}); throw new Error('Exclusive serial live lock is unavailable.'); }
  configuration.lock = lock;
  return lock;
}

export async function release(configuration, lock) {
  try { lock.send('release'); await lock.exited(); }
  catch { await block(configuration); throw new Error('Exclusive lock exit could not be verified.'); }
}
export async function block(configuration) { writeFileSync(configuration.blocked, 'Owned process exit requires independent operator verification.\n', { flag: 'wx' }); }

export async function inspect(configuration, owned) {
  if (configuration.lock.processExited || configuration.lock.ended || configuration.lock.fault) throw new Error('Exclusive serial live lock was lost.');
  if (sourceDigest(readFileSync(configuration.envFile, 'utf8') + '\0' + readFileSync(configuration.approvalFile, 'utf8')) !== configuration.digest) throw new Error('Operator configuration changed during the run.');
  validateInputs({}, configuration.values, configuration.approval);
  if (configuration.activePair && sourceDigest(readFileSync(configuration.activePair.filename, 'utf8')) !== configuration.activePair.digest) throw new Error('Private per-spec configuration changed.');
  for (const job of owned) {
    if (!job.control.ended && !job.control.messages.some((message) => message.event === 'exited')) {
      const count = job.control.messages.filter((message) => message.event === 'state').length;
      job.control.send('status');
      await job.control.until(() => job.control.messages.filter((message) => message.event === 'state').length > count || job.control.messages.some((message) => message.event === 'exited'));
    }
    const end = job.control.messages.find((message) => message.event === 'exited');
    if (job.control.fault || (job.kind !== 'cypress' && (end || job.control.ended))) throw new Error('An owned application process exited unexpectedly.');
    job.pids = [...(job.control.processExited ? [] : [job.control.child.pid]),
      ...(end || job.control.ended ? [] : job.control.messages.filter((message) => message.event === 'state').at(-1)?.pids ?? [job.pid])];
  }
  const snapshot = await powershell(configuration.environment, 'inspect');
  validateDatabaseListener(snapshot, configuration.database, configuration.approval.server);
  const lockPid = configuration.lock.messages.find((message) => message.event === 'started').pid;
  validateInventory(snapshot, [...owned, { kind: 'lock', pids: [lockPid] }, { kind: 'inspect', pids: [snapshot.inspectorPid] }], root, process.pid);
}

export async function verifyDatabase(configuration, createClient = async (options) => { const { Client } = await import('pg'); return new Client(options); }) {
  // Lazy client import occurs only after operator/config validation, lock and OS
  // inspection. C7C tests never load this driver or connect to a database.
  const client = await createClient({ host: configuration.database.host, port: configuration.database.port, database: configuration.database.database,
    user: configuration.database.username, password: configuration.values.DB_PASSWORD, ssl: false, connectionTimeoutMillis: 5000,
    query_timeout: 5000, application_name: 'cards_e2e_readonly_preflight' });
  let connectionFailed = false;
  let verified = false;
  client.on?.('error', () => { connectionFailed = true; });
  try {
    await client.connect(); await client.query('BEGIN READ ONLY');
    const { rows } = await client.query(`SELECT current_database() AS database, current_user AS username,
      pg_get_userbyid(d.datdba) AS owner, host(inet_server_addr()) AS address, inet_server_port() AS port,
      r.rolsuper AS superuser, r.rolcreatedb AS create_db, r.rolcreaterole AS create_role,
      r.rolreplication AS replication, r.rolbypassrls AS bypass_rls,
      (SELECT pg_get_userbyid(n.nspowner) FROM pg_namespace n WHERE n.nspname = 'public') AS schema_owner,
      EXISTS (SELECT 1 FROM pg_roles p WHERE p.rolname NOT IN (current_user, 'pg_database_owner') AND pg_has_role(current_user, p.oid, 'MEMBER')) AS inherited_roles,
      EXISTS (SELECT 1 FROM pg_database other WHERE other.datname <> current_database() AND
        (other.datdba = r.oid OR (NOT other.datistemplate AND other.datname <> 'postgres'
          AND has_database_privilege(current_user, other.oid, 'CONNECT')))) AS other_database_access
      FROM pg_database d JOIN pg_roles r ON r.rolname = current_user WHERE d.datname = current_database()`);
    if (rows.length !== 1) throw new Error('Database identity is ambiguous.');
    if (connectionFailed) throw new Error('Database connection failed during read-only verification.');
    validateCatalog(rows[0], configuration.database, configuration.approval.server);
    await client.query('ROLLBACK'); verified = true;
  } finally { if (!verified) await client.query('ROLLBACK').catch(() => {}); await client.end(); }
}

export const randomIdentity = () => randomBytes(32).toString('hex');

export async function pair(configuration, id, spec) {
  const directory = join(configuration.directory, `spec-${++configuration.pairs}`); mkdirSync(directory);
  const filename = join(directory, 'approved.env');
  // Preserve dotenv's original quoting, with only a final fresh identity override.
  writeFileSync(filename, `${configuration.source}\nE2E_RUN_ID=${id}\n`, { flag: 'wx' });
  const environment = { ...configuration.environment, E2E_MODE: 'live', NODE_ENV: 'test', E2E_ENV_FILE: filename };
  const context = loadEnvironment(environment, true);
  if (context.env.E2E_RUN_ID !== id || context.database.target !== configuration.database.target ||
    Object.entries(configuration.values).some(([key, value]) => key !== 'E2E_RUN_ID' && context.env[key] !== value)) {
    throw new Error('Per-spec environment does not match the approved source and fresh identity.');
  }
  configuration.activePair = { directory, filename, environment, context, spec, digest: sourceDigest(readFileSync(filename, 'utf8')) };
  return configuration.activePair;
}

export async function start(configuration, kind, pair) {
  const directory = pair?.directory ?? configuration.directory;
  const environment = kind === 'frontend' ? configuration.environment : pair.environment;
  const argumentsByKind = {
    frontend: [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'serve', '--configuration', 'e2e', '--port', '56379', '--host', 'localhost'],
    backend: [join(root, 'cypress/safety/backend.mjs')],
    cypress: [join(root, 'node_modules/cypress/bin/cypress'), 'run', '--project', root, '--spec', pair?.spec,
      '--env', 'USE_STUBS=0,API_URL=http://localhost:8080', '--record', 'false', '--config',
      JSON.stringify({ screenshotsFolder: join(directory, 'screenshots'), videosFolder: join(directory, 'videos'), downloadsFolder: join(directory, 'downloads') })],
  };
  const childEnvironment = kind === 'cypress' ? { ...environment, CYPRESS_RUN_BINARY: configuration.binary, CYPRESS_CRASH_REPORTS: '0' } : environment;
  const filename = join(directory, `${kind}-process.json`);
  writeFileSync(filename, JSON.stringify({ executable: process.execPath, arguments: argumentsByKind[kind], directory: root,
    environment: childEnvironment, log: join(directory, `${kind}.log`) }), { flag: 'wx' });
  const control = bridge(configuration, 'run', filename);
  const job = { kind, control, pids: [control.child.pid] }; configuration.jobs.add(job);
  try {
    await control.until(() => control.messages.some((message) => message.event === 'started'));
    job.pid = control.messages.find((message) => message.event === 'started').pid;
    job.pids.push(job.pid); return job;
  } catch {
    control.child.stdin.end();
    try { await control.exited(); configuration.jobs.delete(job); } catch { await block(configuration); }
    throw new Error('Owned process startup failed.');
  }
}

export async function ready(configuration, job, { inspect, signal, request = fetch, pause = delay, clock = Date.now }) {
  const deadline = clock() + 120000;
  const url = job.kind === 'frontend' ? FRONTEND_URL : `${API_URL}/healthz`;
  while (clock() < deadline) {
    if (signal?.aborted) throw new Error('Run cancelled.');
    await inspect();
    try {
      const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      if (response.status === 200) return;
      if (response.status !== 503) throw new Error('Unexpected readiness status.');
    } catch (error) { if (error.cause?.code !== 'ECONNREFUSED' && error.name !== 'TimeoutError') throw error; }
    await pause(200); // Bounded readiness polling, never authentication throttling.
  }
  throw new Error('Owned application readiness timed out.');
}

export async function verifyIdentity(_configuration, pair) { await verifyBackend(pair.context); }

export async function wait(configuration, job, { inspect, signal }) {
  const deadline = Date.now() + 30 * 60 * 1000;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Run cancelled.');
    await inspect();
    const end = job.control.messages.find((message) => message.event === 'exited');
    if (end) { await job.control.exited(); return end.code; }
    await delay(250);
  }
  throw new Error('Selected Cypress process timed out.');
}

export async function stop(configuration, job) {
  if (!job.control.messages.some((message) => message.event === 'exited')) job.control.send('stop');
  await job.control.exited();
  if (!job.control.messages.some((message) => message.event === 'exited' && message.empty === true)) throw new Error('Owned process tree did not exit.');
  job.pids = []; configuration.jobs.delete(job);
}

export async function assertBackendStopped(configuration) {
  const snapshot = await powershell(configuration.environment, 'inspect');
  if (snapshot.listeners.some((listener) => listener.port === 8080)) throw new Error('Backend listener survived cleanup.');
}
export async function assertAllStopped(configuration) {
  if (configuration.jobs.size) throw new Error('Owned jobs remain.');
  // Removal from jobs requires a verified empty kernel Job Object and clean
  // helper exit. A foreign listener must not be mistaken for a surviving child.
}
export async function completed(_configuration, pair) { console.log(`Completed approved live spec: ${pair.spec}`); }
