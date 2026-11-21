import { SPECS } from './policy.mjs';
import { isDirectExecution } from './cli-entry.mjs';

// Imports are inert. The real adapter is loaded only after an explicit opt-in;
// isolated tests supply every filesystem, process, HTTP and database dependency.
export async function runLive({ argv = [], env = process.env, dependencies, signal } = {}) {
  if (argv.length !== 1 || argv[0] !== '--authorize-live') throw new Error('Explicit serial-live operator authorization is required.');
  const io = dependencies ?? await import('./live-runtime.mjs');
  const configuration = await io.prepare(env);
  const lock = await io.acquire(configuration);
  const owned = [];
  const identities = new Set();
  let failed = false;
  async function inspect() {
    if (signal?.aborted) throw new Error('Serial live run cancelled.');
    await io.inspect(configuration, owned);
  }
  async function stop(process) {
    if (!process) return;
    await io.stop(configuration, process);
    owned.splice(owned.indexOf(process), 1);
  }
  try {
    await inspect();
    await io.verifyDatabase(configuration);
    await inspect();
    const frontend = await io.start(configuration, 'frontend');
    owned.push(frontend);
    await io.ready(configuration, frontend, { inspect, signal });
    for (const spec of SPECS.live) {
      await inspect();
      const id = io.randomIdentity();
      if (!/^[a-f0-9]{32,64}$/.test(id) || identities.has(id)) throw new Error('A fresh E2E run identity is required for every spec.');
      identities.add(id);
      const pair = await io.pair(configuration, id, spec);
      const backend = await io.start(configuration, 'backend', pair);
      owned.push(backend);
      await io.ready(configuration, backend, { inspect, signal, pair });
      await io.verifyIdentity(configuration, pair);
      await inspect();
      const cypress = await io.start(configuration, 'cypress', pair);
      owned.push(cypress);
      const result = await io.wait(configuration, cypress, { inspect, signal });
      if (result !== 0) throw new Error('Selected live Cypress spec failed.');
      await stop(cypress);
      await stop(backend);
      await io.assertBackendStopped(configuration);
      await io.completed(configuration, pair);
    }
    await inspect();
  } finally {
    // Attempt every owned cleanup, even when one fails. Never release an unsafe
    // run for continuation merely because the primary assertion already failed.
    for (const process of [...owned].reverse()) {
      try { await stop(process); } catch { failed = true; }
    }
    try { await io.assertAllStopped(configuration); } catch { failed = true; }
    if (failed) {
      await io.block(configuration);
      throw new Error('Owned process exit could not be verified; serial live execution is blocked for operator review.');
    }
    await io.release(configuration, lock);
  }
  return { specs: SPECS.live.length };
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  runLive({ argv: process.argv.slice(2), signal: controller.signal })
    .then(() => console.log('Serial live E2E completed. Review private browser results.'))
    .catch(() => { console.error('Serial live E2E refused or failed. Review the private diagnostics and safety prerequisites.'); process.exitCode = 1; })
    .finally(() => { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); });
}
