import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import * as path from 'node:path';
import * as url from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const filename = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), 'live-runtime.mjs');
const source = readFileSync(filename, 'utf8');
const helperSource = readFileSync(path.join(path.dirname(filename), 'live-windows.ps1'), 'utf8');
const nativeSource = readFileSync(path.join(path.dirname(filename), 'live-process-job.cs'));
const root = 'C:\\Synthetic Checkout';
const helper = path.win32.join(root, 'cypress/safety/live-windows.ps1');
const native = path.win32.join(root, 'cypress/safety/live-process-job.cs');
const environment = () => ({ SystemRoot: 'C:\\Windows', TEMP: 'C:\\Private\\temp' });
const script = ts.transpileModule(`${source}\nexport { helperInvocation, powershell, bridge };`.replaceAll('import.meta.url', '__moduleUrl'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

// Real runtime, fake filesystem/process/OS modules. No child, HTTP or DB call
// can escape this VM; importing a new dependency fails the test closed.
function harness(options = {}) {
  const calls = [], children = [];
  const fakeFs = {
    realpathSync(file) { return file === path.win32.join(root, '../..') ? root : options.redirect === file ? 'C:\\Unexpected\\adapter' : file; },
    lstatSync(file) { return { isSymbolicLink: () => options.reparse === file, isFile: () => file !== 'C:\\Windows' && options.directory !== file,
      isDirectory: () => file === 'C:\\Windows' }; },
    readFileSync(file) {
      if (file === helper) return options.changed === file ? 'changed script' : Buffer.from(helperSource);
      if (file === native) return options.changed === file ? Buffer.from('changed native') : nativeSource;
      throw new Error('Unexpected isolated filesystem read');
    },
    mkdirSync() { throw new Error('Unexpected directory creation'); }, writeFileSync() { throw new Error('Unexpected write'); }, existsSync() { return false; },
  };
  const fakeProcess = { platform: options.platform ?? 'win32', execArgv: [], execPath: 'C:\\Node\\node.exe', pid: 500, env: {} };
  const fakeProcesses = {
    execFile(executable, args, settings, callback) {
      calls.push({ method: 'execFile', executable, args, settings });
      const child = { pid: 700 };
      queueMicrotask(() => callback(options.failure ? new Error('Synthetic helper refusal') : null, options.output ?? '{"ok":true}'));
      return child;
    },
    spawn(executable, args, settings) {
      calls.push({ method: 'spawn', executable, args, settings });
      const child = new EventEmitter();
      Object.assign(child, { pid: 701, stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough() });
      children.push(child); return child;
    },
  };
  const context = { exports: {}, process: fakeProcess, __moduleUrl: 'file:///C:/Synthetic%20Checkout/cypress/safety/live-runtime.mjs',
    setTimeout, clearTimeout, AbortSignal, console: { log() {} }, require(name) {
      if (name === 'node:path') return path.win32;
      if (name === 'node:url') return { fileURLToPath: () => path.win32.join(options.root ?? root, 'cypress/safety/live-runtime.mjs') };
      if (name === 'node:fs') return fakeFs;
      if (name === 'node:child_process') return fakeProcesses;
      if (name === 'node:crypto') return { randomBytes() { throw new Error('Unexpected identity generation'); } };
      if (name === 'node:readline') return { createInterface: () => new EventEmitter() };
      if (name === 'node:dns/promises') return { lookup() { throw new Error('Unexpected DNS'); } };
      if (name === 'dotenv') return { parse() { throw new Error('Unexpected configuration read'); } };
      if (name === './node.mjs') return {};
      if (name === './policy.mjs') return {};
      if (name === './live-runner-policy.mjs') return { sourceDigest: (value) => createHash('sha256').update(value).digest('hex') };
      throw new Error('Unexpected isolated dependency');
    } };
  vm.runInNewContext(script, context);
  return { api: context.exports, calls, children, fakeProcess };
}

function assertInvocation(call, action, value = '') {
  assert.equal(call.executable, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual([...call.args], ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', helper, '-Action', action, '-Value', value]);
}

test('C7E both one-shot and bridge paths use only the pinned local helper with process-only RemoteSigned', async () => {
  const h = harness(), env = environment(), original = { ...env };
  const result = await h.api.powershell(env, 'inspect');
  assert.equal(result.inspectorPid, 700);
  const control = h.api.bridge({ environment: env }, 'lock', '');
  assert.equal(control.child.pid, 701);
  assert.equal(h.calls.length, 2);
  for (const [index, action] of ['inspect', 'lock'].entries()) {
    assertInvocation(h.calls[index], action);
    assert.equal(h.calls[index].settings.windowsHide, true);
    assert.strictEqual(h.calls[index].settings.env, env);
  }
  assert.deepEqual([...h.calls[1].settings.stdio], ['pipe', 'pipe', 'pipe']);
  assert.deepEqual(env, original);
  assert.deepEqual(h.fakeProcess.env, {});
  for (const child of h.children) { child.stdin.end(); child.stdout.end(); child.stderr.end(); child.emit('exit', 0); child.emit('close'); }
});

test('C7E every approved helper action retains separate literal argv values without a command shell', () => {
  const h = harness();
  for (const [action, value] of [['secure', ''], ['inspect', ''], ['lock', ''], ['check-private', 'C:\\Private\\config.env'],
    ['run', "C:\\Private Folder\\quote';literal-process.json"]]) {
    assertInvocation(h.api.helperInvocation(environment(), action, value), action, value);
  }
  assert.equal(h.calls.length, 0);
});

for (const change of [{ changed: helper }, { changed: native }, { reparse: helper }, { reparse: native }, { redirect: helper },
  { directory: helper }, { redirect: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }]) {
  test(`C7E changed or unexpected adapter identity rejects before process creation: ${JSON.stringify(change)}`, async () => {
    const h = harness(change);
    await assert.rejects(h.api.powershell(environment(), 'secure'));
    assert.throws(() => h.api.bridge({ environment: environment() }, 'lock', ''));
    assert.equal(h.calls.length, 0);
  });
}

test('C7E unsupported hosts, actions and path arguments reject without starting a child', () => {
  for (const [env, action, value] of [[{ SystemRoot: '\\\\host\\Windows' }, 'secure', ''], [{ SystemRoot: 'C:\\Other' }, 'secure', ''],
    [environment(), 'other.ps1', ''], [environment(), 'secure', 'C:\\Other.ps1'], [environment(), 'run', '..\\other.ps1'],
    [environment(), 'run', '\\\\host\\config.json'], [environment(), 'run', 'C:\\private\nconfig'], [environment(), 'inspect', '\0']]) {
    const h = harness(); assert.throws(() => h.api.helperInvocation(env, action, value)); assert.equal(h.calls.length, 0);
  }
  const h = harness({ platform: 'linux' }); assert.throws(() => h.api.helperInvocation(environment(), 'secure', '')); assert.equal(h.calls.length, 0);
  const unc = harness({ root: '\\\\host\\checkout' }); assert.throws(() => unc.api.helperInvocation(environment(), 'secure', '')); assert.equal(unc.calls.length, 0);
});

test('C7E inherited policy/module overrides reject in prepare and both launch paths, including Windows case variants', async () => {
  for (const key of ['PSExecutionPolicyPreference', 'psexecutionpolicypreference', 'PSModulePath', '__PSLockdownPolicy', 'POWERSHELL_TELEMETRY_OPTOUT']) {
    for (const value of ['RemoteSigned', 'Restricted', 'Bypass', 'Unrestricted', '']) {
      const h = harness(), env = { ...environment(), [key]: value };
      await assert.rejects(h.api.prepare(env), /policy\/module overrides/);
      await assert.rejects(h.api.powershell(env, 'secure'), /policy\/module overrides/);
      assert.throws(() => h.api.bridge({ environment: env }, 'lock', ''), /policy\/module overrides/);
      assert.equal(h.calls.length, 0);
    }
  }
});

test('C7E policy refusals and failed helper execution cannot produce successful one-shot or lock results', async () => {
  const oneShot = harness({ failure: true }); await assert.rejects(oneShot.api.powershell(environment(), 'secure'));
  const lock = harness(), acquisition = lock.api.acquire({ environment: environment() });
  const child = lock.children[0];
  child.stderr.emit('data', Buffer.from('Synthetic execution policy conflict'));
  child.emit('exit', 1); child.emit('close');
  await assert.rejects(acquisition, /Exclusive serial live lock is unavailable/);
  assert.equal(lock.calls.length, 1);
});

test('C7E no policy variable reaches frontend/backend/Cypress environments or parent state', () => {
  const h = harness(), env = h.api.childEnvironment('C:\\Windows', 'C:\\Node\\node.exe', 'C:\\Private');
  assert.ok(!Object.keys(env).some((key) => /powershell|policy|psmodule/i.test(key)));
  assert.deepEqual(h.fakeProcess.env, {});
  assert.doesNotMatch(source, /Set-ExecutionPolicy|['"](?:Bypass|Unrestricted)['"]|process\.env\s*(?:\[.*\]|\.[\w]+)\s*=/);
});

test('C7E helper policy guard precedes every action and retains strict scope/effective-policy checks', () => {
  const start = helperSource.indexOf('  $policies = @('), end = helperSource.indexOf("  if ($Action -eq 'check-private')");
  assert.ok(start > helperSource.indexOf('try {') && end > start);
  const guard = helperSource.slice(start, end);
  assert.match(guard, /Microsoft\.PowerShell\.Security\\Get-ExecutionPolicy -List/);
  assert.match(guard, /\$policies\.Count -ne 5/);
  assert.match(guard, /\$_.Scope -in @\('MachinePolicy', 'UserPolicy'\) -and \$_.ExecutionPolicy -ne 'Undefined'/);
  assert.match(guard, /\$_.Scope -in @\('CurrentUser', 'LocalMachine'\) -and \$_.ExecutionPolicy -notin @\('Undefined', 'Restricted', 'RemoteSigned'\)/);
  assert.match(guard, /\(Microsoft\.PowerShell\.Security\\Get-ExecutionPolicy -Scope Process\) -ne 'RemoteSigned'/);
  assert.match(guard, /\(Microsoft\.PowerShell\.Security\\Get-ExecutionPolicy\) -ne 'RemoteSigned'/);
  assert.match(guard, /throw 'Unexpected helper execution policy'/);
  assert.doesNotMatch(helperSource, /Set-ExecutionPolicy|Unblock-File|['"](?:Bypass|Unrestricted)['"]/);
});

test('C7E actual guard accepts only approved policy combinations using a fake policy cmdlet', () => {
  const start = helperSource.indexOf('  $policies = @('), end = helperSource.indexOf("  if ($Action -eq 'check-private')");
  const guard = helperSource.slice(start, end).replaceAll('Microsoft.PowerShell.Security\\Get-ExecutionPolicy', 'C7eFakePolicy');
  assert.ok(start > 0 && end > start && !guard.includes("'@"));
  // Only the guard text runs, with its policy reads replaced in memory. No
  // -File, -ExecutionPolicy, helper actions, native APIs or real policy writes.
  const command = String.raw`
$ErrorActionPreference = 'Stop'
function C7eFakePolicy {
  param([switch]$List, [string]$Scope)
  if ($List) { return $script:policies }
  if ($Scope) { return ($script:policies | Where-Object { $_.Scope -eq $Scope }).ExecutionPolicy }
  return $script:effective
}
$guard = [ScriptBlock]::Create(@'
${guard}
'@)
$base = @{ MachinePolicy = 'Undefined'; UserPolicy = 'Undefined'; Process = 'RemoteSigned'; CurrentUser = 'Undefined'; LocalMachine = 'Undefined' }
$cases = @(@{ Scope = ''; Value = ''; Accepted = $true })
$values = @('Undefined', 'Restricted', 'RemoteSigned', 'AllSigned', 'Bypass', 'Unrestricted')
foreach ($scope in $base.Keys) {
  foreach ($value in $values) {
    $accepted = if ($scope -in @('MachinePolicy', 'UserPolicy')) { $value -eq 'Undefined' }
      elseif ($scope -eq 'Process') { $value -eq 'RemoteSigned' }
      else { $value -in @('Undefined', 'Restricted', 'RemoteSigned') }
    $cases += @{ Scope = $scope; Value = $value; Accepted = $accepted }
  }
}
foreach ($value in $values) { $cases += @{ Scope = 'Effective'; Value = $value; Accepted = ($value -eq 'RemoteSigned') } }
$cases += @{ Scope = 'Count'; Value = 4; Accepted = $false }, @{ Scope = 'Count'; Value = 6; Accepted = $false }
foreach ($case in $cases) {
  $settings = $base.Clone()
  if ($settings.ContainsKey($case.Scope)) { $settings[$case.Scope] = $case.Value }
  $script:policies = @($settings.Keys | ForEach-Object { [PSCustomObject]@{ Scope = $_; ExecutionPolicy = $settings[$_] } })
  $script:effective = if ($case.Scope -eq 'Effective') { $case.Value } else { 'RemoteSigned' }
  if ($case.Scope -eq 'Count') {
    $script:policies = if ($case.Value -eq 4) { @($script:policies | Select-Object -First 4) } else { @($script:policies) + @([PSCustomObject]@{ Scope = 'Unexpected'; ExecutionPolicy = 'Undefined' }) }
  }
  $accepted = $false
  try { & $guard; $accepted = $true } catch { if ($_.Exception.Message -ne 'Unexpected helper execution policy') { throw } }
  if ($accepted -ne $case.Accepted) { throw 'Mocked policy guard case failed' }
}
[Console]::WriteLine("mocked-policy-cases=$($cases.Count)")
`;
  const system = process.env.SystemRoot ?? 'C:\\Windows';
  assert.match(system, /^[a-z]:\\Windows$/i);
  const output = execFileSync(path.win32.join(system, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], {
      env: { SystemRoot: system, WINDIR: system, PATH: path.win32.join(system, 'System32') },
      windowsHide: true, encoding: 'utf8', timeout: 30000,
    });
  assert.equal(output.trim(), 'mocked-policy-cases=39');
});
