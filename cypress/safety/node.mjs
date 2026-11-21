import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'dotenv';
import { API_URL, FRONTEND_URL, SPECS, assertDatabaseClient, assertOrigins, assertSpec, blockedHosts, resolveMode, validateDatabase } from './policy.mjs';

const protectedKeys = ['NODE_ENV', 'DB_USERNAME', 'DB_PASSWORD', 'PASSWORD_PEPPER', 'DB_LINK_TEST', 'DB_LINK', 'DATABASE_URL',
  'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSERVICE', 'PORT', 'E2E_MODE',
  'E2E_DB_ALLOWLIST', 'E2E_RESET_AUTHORIZATION', 'E2E_RUN_ID', 'E2E_ENV_FILE',
  'CYPRESS_USE_STUBS', 'CYPRESS_BASE_URL', 'CYPRESS_API_URL'];

export function loadEnvironment(env = process.env, authorizeReset = false) {
  if (env.E2E_MODE !== 'live') throw new Error('Database infrastructure is forbidden outside live E2E mode.');
  if (!env.E2E_ENV_FILE) throw new Error('E2E_ENV_FILE must explicitly select an isolated E2E environment file.');
  const filename = realpathSync(resolve(env.E2E_ENV_FILE));
  if (env.DOTENV_CONFIG_PATH && realpathSync(resolve(env.DOTENV_CONFIG_PATH)) !== filename) {
    throw new Error('DOTENV_CONFIG_PATH conflicts with E2E_ENV_FILE.');
  }
  const fileEnv = parse(readFileSync(filename));
  if (fileEnv.DOTENV_CONFIG_PATH && realpathSync(resolve(fileEnv.DOTENV_CONFIG_PATH)) !== filename) {
    throw new Error('Environment file selects a conflicting dotenv file.');
  }
  for (const key of protectedKeys) {
    if (env[key] !== undefined && fileEnv[key] !== undefined && env[key] !== fileEnv[key]) {
      throw new Error(`Conflicting E2E environment sources for ${key}.`);
    }
  }
  const effective = { ...env, ...fileEnv, DOTENV_CONFIG_PATH: filename };
  const database = validateDatabase(effective, authorizeReset);
  assertOrigins(effective.CYPRESS_BASE_URL ?? FRONTEND_URL, effective.CYPRESS_API_URL ?? API_URL);
  return Object.freeze({ env: Object.freeze(effective), database, filename });
}

export function installEnvironment(context, env = process.env) {
  for (const [key, value] of Object.entries(context.env)) {
    if (value !== undefined) env[key] = value;
  }
}

export function identity(context) {
  return {
    version: 1, mode: 'live', frontendUrl: FRONTEND_URL, apiUrl: API_URL,
    databaseFingerprint: createHash('sha256').update(context.database.target).digest('hex'),
  };
}

export async function verifyBackend(context, request = fetch) {
  const response = await request(`${API_URL}/__e2e/identity`, {
    headers: { 'x-e2e-run-id': context.env.E2E_RUN_ID }, redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  if (response.status !== 200) throw new Error('Approved E2E backend identity is unavailable.');
  const actual = await response.json();
  const expected = identity(context);
  if (!actual || Object.keys(actual).length !== Object.keys(expected).length ||
      Object.entries(expected).some(([key, value]) => actual[key] !== value)) {
    throw new Error('Backend identity does not match the approved E2E environment.');
  }
}

export async function withApprovedDatabase({ env = process.env, authorizeReset = false, load, run }) {
  const context = loadEnvironment(env, authorizeReset);
  installEnvironment(context, env);
  const dependencies = await load();
  assertDatabaseClient(dependencies.sequelize, context.database, context.env.DB_PASSWORD);
  return run(dependencies, context);
}

export async function configureCypress(on, config, env = process.env, request = fetch) {
  const mode = resolveMode(env.E2E_MODE, config.env.USE_STUBS);
  assertOrigins(config.baseUrl, config.env.API_URL);
  if (config.supportFile !== resolve(config.projectRoot, 'cypress/support/e2e.ts') || config.testIsolation !== true) {
    throw new Error('The E2E safety support file and test isolation are required.');
  }
  const context = mode === 'live' ? loadEnvironment(env, true) : null;
  const verify = async () => {
    if (!context) return true;
    const current = loadEnvironment(env, true);
    if (current.database.target !== context.database.target || current.env.E2E_RUN_ID !== context.env.E2E_RUN_ID) {
      throw new Error('E2E target configuration changed during the run.');
    }
    await verifyBackend(current, request);
    return true;
  };
  // Verify identity before Cypress is permitted to run any live setup/request.
  await verify();
  config.specPattern = [...SPECS[mode]];
  config.excludeSpecPattern = [];
  config.blockHosts = blockedHosts(mode);
  config.experimentalInteractiveRunEvents = true;
  config.env = { ...config.env, E2E_MODE: mode, E2E_RUN_ID: context?.env.E2E_RUN_ID ?? '' };
  on('before:run', (details) => {
    for (const spec of details.specs ?? []) assertSpec(mode, spec.relative);
  });
  on('before:spec', async (spec) => {
    assertSpec(mode, spec.relative);
    await verify();
  });
  on('task', {
    'e2e:assertBackend': verify,
    async 'db:reset'() {
      if (mode !== 'live') throw new Error('Database reset is forbidden in stub mode.');
      await verify();
      const { reset } = await import('../../server/scripts/reset-test-db.mjs');
      await reset();
      return 'db-reset:done:v1';
    },
  });
  return config;
}
