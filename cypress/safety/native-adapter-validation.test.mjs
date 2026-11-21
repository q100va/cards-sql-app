import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { createHash } from 'node:crypto';

const filename = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), 'native-adapter-validation.mjs');
const source = readFileSync(filename, 'utf8');
const script = ts.transpileModule(source.replaceAll('import.meta.url', '__moduleUrl'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function evaluate(args, platform = 'win32') {
  const calls = [];
  const child = { stdout: { pipe() {} }, stderr: { pipe() {} }, on() {} };
  const context = {
    exports: {}, __moduleUrl: url.pathToFileURL(filename).href,
    process: { platform, argv: ['synthetic-node', filename, ...args], execPath: 'C:\\Synthetic\\node.exe', pid: 123,
      env: { SystemRoot: 'C:\\Windows', TEMP: 'C:\\Synthetic\\Temp', DB_PASSWORD: 'SYNTHETIC_PRIVATE_PARENT', NODE_OPTIONS: '--forbidden-parent-preload' }, stdout: {}, stderr: {} },
    console: { error() {} },
    require(name) {
      if (name === 'node:path') return path;
      if (name === 'node:url') return url;
      if (name === 'node:child_process') return { spawn: (...values) => { calls.push(values); return child; } };
      throw new Error('Unexpected native-validation import');
    },
  };
  return { calls, run: () => vm.runInNewContext(script, context) };
}

test('C7D native validation requires explicit opt-in and is excluded from the isolated test glob', () => {
  assert.ok(!filename.endsWith('.test.mjs'));
  for (const args of [[], ['--unknown'], ['--synthetic-only', '--extra']]) {
    const h = evaluate(args); assert.throws(h.run, /requires --synthetic-only/); assert.equal(h.calls.length, 0);
  }
  const unix = evaluate(['--synthetic-only'], 'linux'); assert.throws(unix.run); assert.equal(unix.calls.length, 0);
  const helper = path.resolve(path.dirname(filename), 'native-helper-validation.mjs');
  assert.ok(!helper.endsWith('.test.mjs'));
  const file = ts.createSourceFile(helper, readFileSync(helper, 'utf8'), ts.ScriptTarget.Latest, true);
  const guard = file.statements.find((statement) => ts.isIfStatement(statement));
  const printed = ts.createPrinter().printNode(ts.EmitHint.Unspecified, guard, file);
  for (const args of [[], ['--synthetic-only'], ['--approved-process-remotesigned']]) {
    assert.throws(() => vm.runInNewContext(printed, { process: { platform: 'win32', argv: ['node', helper, ...args] } }));
  }
});

test('C7D native harness uses only explicit synthetic inline probes and a sanitized environment', () => {
  const h = evaluate(['--synthetic-only']); h.run(); assert.equal(h.calls.length, 1);
  const [executable, args, options] = h.calls[0];
  assert.ok(executable.endsWith('powershell.exe'));
  assert.ok(args.includes('-Command'));
  assert.ok(!args.includes('-File') && !args.includes('-ExecutionPolicy') && !args.includes('-EncodedCommand'));
  assert.ok(!('DB_PASSWORD' in options.env) && !('NODE_OPTIONS' in options.env));
  assert.equal(options.windowsHide, true);
  assert.doesNotMatch(source, /import[^\n]+(?:live-runner|live-runtime|postgres|['"]pg['"]|cypress\/bin)/);
});

test('C7D helper validation pins the reviewed adapter and uses only its explicitly approved process policy', () => {
  const helper = path.resolve(path.dirname(filename), 'native-helper-validation.mjs');
  const text = readFileSync(helper, 'utf8');
  const file = ts.createSourceFile(helper, text, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.filter(ts.isVariableStatement).flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => item.name.getText(file) === 'pins');
  const pins = vm.runInNewContext(`(${declaration.initializer.getText(file)})`);
  for (const [name, hash] of Object.entries(pins)) {
    assert.equal(createHash('sha256').update(readFileSync(path.join(path.dirname(filename), name))).digest('hex'), hash);
  }
  assert.match(text, /'-ExecutionPolicy', 'RemoteSigned'/);
  assert.doesNotMatch(text, /Set-ExecutionPolicy|Bypass|Unrestricted/);
  assert.doesNotMatch(text, /\b(?:prepare|verifyDatabase|start)\(configuration/);
});
