import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync, lstatSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';

// C7D's separately authorized exception only. Never calls prepare/start/ready,
// the live runner, HTTP, Cypress, application initialization or a DB driver.
if (process.platform !== 'win32' || JSON.stringify(process.argv.slice(2)) !== JSON.stringify(['--synthetic-only', '--approved-process-remotesigned'])) {
  throw new Error('C7D synthetic helper validation requires explicit process-only RemoteSigned approval.');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pins = {
  'live-windows.ps1': '3302fbc5fe0dcd96936f27e378846526e91b0ebe7df84e2bb29533714b41c293',
  'live-process-job.cs': '1fc5ece781e2710cb9265ab16c3b1c0d8bd1fa0f68f2a1825a906d6232908112',
  'live-runtime.mjs': '7889148abe4123cdcc41ea24959b746bca3e3c6dae76f0bf1723da604dfaaa67',
};
function verify() {
  for (const [file, expected] of Object.entries(pins)) {
    const path = join(root, 'cypress/safety', file);
    if (lstatSync(path).isSymbolicLink() || realpathSync(path).toLowerCase() !== path.toLowerCase() ||
      createHash('sha256').update(readFileSync(path)).digest('hex') !== expected) throw new Error('Reviewed adapter integrity mismatch.');
  }
}
verify();
const { childEnvironment, acquire, release } = await import(pathToFileURL(join(root, 'cypress/safety/live-runtime.mjs')).href);
const system = realpathSync(process.env.SystemRoot);
const powershell = join(system, 'System32/WindowsPowerShell/v1.0/powershell.exe');
const helper = join(root, 'cypress/safety/live-windows.ps1');
const base = {};
for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) base[key] = process.env[key];
base.PATH = `${dirname(process.execPath)};${join(system, 'System32')}`;
const all = new Set(), results = [];
let directory, lock, lockConfiguration;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

function launch(args, environment = base) {
  const child = spawn(powershell, args, { env: environment, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const messages = [], lines = [], errors = [];
  let closed = false, code, signal;
  const reader = createInterface({ input: child.stdout });
  reader.on('line', (line) => { lines.push(line); try { messages.push(JSON.parse(line)); } catch {} });
  child.stderr.on('data', (data) => errors.push(data.toString()));
  child.stdin.on('error', () => {});
  child.on('error', (error) => { errors.push(error.message); });
  child.on('close', (value, reason) => { closed = true; code = value; signal = reason; });
  const control = { child, messages, lines, errors, get closed() { return closed; }, get code() { return code; }, get signal() { return signal; },
    send(value) { if (closed) throw new Error('Synthetic helper already closed'); child.stdin.write(`${value}\n`); },
    async until(predicate, timeout = 15000) {
      const deadline = Date.now() + timeout;
      while (!predicate()) { if (closed || Date.now() >= deadline) throw new Error('Synthetic helper protocol timeout/exit'); await delay(20); }
    },
    async close() { await this.until(() => closed); all.delete(this); },
  };
  all.add(control); return control;
}
function adapter(action, value = '', environment = base) {
  verify();
  return launch(['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', helper, '-Action', action, '-Value', value], environment);
}
async function once(action, value, expected = 0) {
  const child = adapter(action, value); await child.close();
  if (child.code !== expected) throw new Error('Synthetic one-shot adapter result mismatch'); return child;
}
async function marker(path) {
  const deadline = Date.now() + 10000;
  while (!existsSync(path)) { if (Date.now() >= deadline) throw new Error('Synthetic child marker timeout'); await delay(20); }
  return JSON.parse(readFileSync(path, 'utf8'));
}
async function record(name, evidence) {
  const result = { case: name, result: 'passed', evidence }; results.push(result);
  writeFileSync(join(directory, 'native-helper-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
}
async function gone(pids) {
  const ids = [...new Set(pids)];
  if (!ids.every((pid) => Number.isSafeInteger(pid) && pid > 0)) throw new Error('Ambiguous synthetic PID');
  const command = `@(${ids.map((pid) => `Get-Process -Id ${pid} -ErrorAction SilentlyContinue`).join(';')}).Count`;
  const check = launch(['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command]); await check.close();
  if (check.code !== 0 || check.lines.join('').trim() !== '0') throw new Error('Synthetic process exit not verified');
}

try {
  const secure = await once('secure'); directory = secure.messages[0].directory;
  const environment = childEnvironment(system, process.execPath, directory);
  for (const path of [environment.USERPROFILE, environment.APPDATA, environment.LOCALAPPDATA, environment.TEMP]) mkdirSync(path, { recursive: true });
  const fixture = join(directory, 'synthetic-helper-child.mjs');
  writeFileSync(fixture, `import {writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const [mode,marker,extra]=process.argv.slice(2);
if(!['tree','leaf','exit','hold'].includes(mode))process.exit(90);
let child;if(mode==='tree')child=spawn(process.execPath,[fileURLToPath(import.meta.url),'leaf',extra],{stdio:'ignore',windowsHide:true});
writeFileSync(marker,JSON.stringify({pid:process.pid,parent:process.ppid,child:child?.pid}));
setTimeout(()=>process.exit(mode==='exit'?Number(extra):0),mode==='exit'?250:60000);`);
  await once('check-private', directory); await once('check-private', fixture);
  await record('actual-helper-secure-and-private-acl', { directory, adapterPid: secure.child.pid, privateDirectoryAndFileAccepted: true });
  const aclFixture = join(directory, 'synthetic-acl.txt'); writeFileSync(aclFixture, 'synthetic only');
  async function changeAcl(remove) {
    const path = `'${aclFixture.replaceAll("'", "''")}'`;
    const command = `$p=${path};$a=Get-Acl -LiteralPath $p;$r=[Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'Read','Allow');$a.${remove ? 'RemoveAccessRuleAll' : 'AddAccessRule'}($r);Set-Acl -LiteralPath $p -AclObject $a`;
    const child = launch(['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command]); await child.close();
    if (child.code !== 0) throw new Error('Synthetic ACL probe failed');
  }
  await changeAcl(false);
  try { const rejected = await once('check-private', aclFixture, 1); if (!rejected.messages.some((message) => message.event === 'error')) throw new Error('Unsafe ACL not rejected'); }
  finally { await changeAcl(true); }
  await once('check-private', aclFixture);
  await record('actual-helper-rejects-broad-acl', { broadReadRejected: true, restoredPrivateFileAccepted: true });

  async function start(mode, name, executable = process.execPath, exitCode = '0') {
    const path = join(directory, `${name}.json`), leaf = join(directory, `${name}-leaf.json`), config = join(directory, `${name}-config.json`);
    writeFileSync(config, JSON.stringify({ executable, arguments: [fixture, mode, path, mode === 'exit' ? exitCode : leaf],
      directory, environment, log: join(directory, `${name}.log`) }));
    const control = adapter('run', config, environment);
    if (executable === process.execPath) {
      await control.until(() => control.messages.some((message) => message.event === 'started'));
      const data = await marker(path);
      if (data.pid !== control.messages.find((message) => message.event === 'started').pid) throw new Error('Helper/root identity mismatch');
      control.root = data.pid; control.leaf = mode === 'tree' ? (await marker(leaf)).pid : undefined;
    }
    return control;
  }
  async function ended(control, expectedRootCode) {
    await control.close();
    const result = control.messages.find((message) => message.event === 'exited');
    if (control.code !== 0 || result?.empty !== true || (expectedRootCode !== undefined && result.code !== expectedRootCode)) throw new Error('Native helper did not verify the expected empty exit');
    await gone([control.root, control.leaf].filter(Boolean)); return result;
  }

  const tree = await start('tree', 'stop'); tree.send('status');
  await tree.until(() => tree.messages.some((message) => message.event === 'state'));
  const members = tree.messages.find((message) => message.event === 'state').pids;
  if (!members.includes(tree.root) || !members.includes(tree.leaf)) throw new Error('Helper job containment mismatch');
  tree.send('stop'); await ended(tree, 1);
  await record('actual-helper-cancellation', { helper: tree.child.pid, root: tree.root, leaf: tree.leaf, members, emptyExit: true });

  for (const exitCode of [0, 17]) {
    const natural = await start('exit', `exit-${exitCode}`, process.execPath, String(exitCode));
    while (!natural.closed && !natural.messages.some((message) => message.event === 'exited')) { natural.send('status'); await delay(100); }
    await ended(natural, exitCode);
    await record(`actual-helper-natural-${exitCode}`, { helper: natural.child.pid, root: natural.root, childExitCode: exitCode, emptyExit: true });
  }
  const eof = await start('tree', 'eof'); eof.child.stdin.end(); await ended(eof, 1);
  await record('actual-helper-parent-channel-eof', { helper: eof.child.pid, root: eof.root, leaf: eof.leaf, emptyExit: true });

  const crash = await start('tree', 'crash');
  if (!crash.child.kill()) throw new Error('Owned helper termination failed');
  await crash.close(); await gone([crash.root, crash.leaf]);
  await record('actual-helper-kill-on-close', { terminatedOnlyOwnedHelper: crash.child.pid, root: crash.root, leaf: crash.leaf, descendantsExited: true });

  const failed = await start('hold', 'missing', join(directory, 'missing-owned-fixture.exe')); await failed.close();
  if (failed.code !== 1 || failed.messages.some((message) => message.event === 'started') || !failed.messages.some((message) => message.event === 'error')) throw new Error('Startup failure did not fail closed');
  await record('actual-helper-startup-failure', { helper: failed.child.pid, rejectedBeforeStarted: true });

  const invalid = await start('tree', 'invalid-control'); invalid.send('invalid-control'); await invalid.close(); await gone([invalid.root, invalid.leaf]);
  if (invalid.code !== 1 || !invalid.messages.some((message) => message.event === 'error') || invalid.messages.some((message) => message.event === 'exited')) throw new Error('Protocol failure was falsely reported as clean');
  await record('actual-helper-protocol-failure', { helper: invalid.child.pid, failClosed: true, ownedDescendantsExited: true });

  // Exercise the real C7C bridge/acquire/release functions, not a fake lock.
  verify();
  lockConfiguration = { directory, environment, blocked: join(directory, 'synthetic-unsafe-marker') };
  lock = await acquire(lockConfiguration);
  const lockPid = lock.child.pid;
  let denied = false;
  try { await acquire({ ...lockConfiguration }); } catch { denied = true; }
  if (!denied) throw new Error('Parallel real adapter mutex acquisition succeeded');
  await release(lockConfiguration, lock); lock = null;
  const again = await acquire(lockConfiguration); await release(lockConfiguration, again);
  await record('actual-runtime-mutex-bridge', { firstHelper: lockPid, nextHelper: again.child.pid, parallelRejected: denied, bothReleasedAndClosed: true });
  console.log(JSON.stringify({ summary: 'actual-helper', passed: results.length, directory, processOnlyRemoteSigned: true }));
} finally {
  if (lock) await release(lockConfiguration, lock);
  for (const control of all) {
    if (!control.closed) { control.child.stdin.end(); await control.close(); }
  }
}
