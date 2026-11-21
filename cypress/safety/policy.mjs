export const FRONTEND_URL = 'http://localhost:56379';
export const API_URL = 'http://localhost:8080';

const shared = ['cypress/e2e/sign-in.cy.ts', 'cypress/e2e/roles.cy.ts'];
export const SPECS = Object.freeze({
  stub: Object.freeze([...shared, 'cypress/e2e/permissions.cy.ts',
    'cypress/e2e/toponyms/regions.stub.cy.ts', 'cypress/e2e/toponyms/toponyms-list.stub.cy.ts']),
  live: Object.freeze([...shared, 'cypress/e2e/toponyms/regions.live.cy.ts',
    'cypress/e2e/toponyms/permissions.live.cy.ts', 'cypress/e2e/toponyms/details.live.cy.ts']),
});

export function resolveMode(mode, useStubs) {
  if (!['stub', 'live'].includes(mode) || String(useStubs) !== (mode === 'stub' ? '1' : '0')) {
    throw new Error('E2E_MODE must be stub/live and agree with USE_STUBS. Use an explicit Cypress mode script.');
  }
  return mode;
}

export function assertSpec(mode, filename) {
  if (!SPECS[mode]?.includes(filename.replaceAll('\\', '/'))) {
    throw new Error('Spec is not approved for this E2E mode.');
  }
}

export function assertOrigins(baseUrl, apiUrl) {
  if (baseUrl !== FRONTEND_URL || apiUrl !== API_URL) {
    throw new Error('E2E frontend/API origins must match the dedicated local E2E configuration.');
  }
}

export function assertFrontend(identity) {
  if (!identity || identity.production !== false) throw new Error('A non-production E2E frontend build is required.');
  assertOrigins(identity.frontendUrl, identity.apiUrl);
}

export function assertVisit(rawUrl) {
  const url = new URL(rawUrl, FRONTEND_URL);
  if (url.origin !== FRONTEND_URL || url.username || url.password || url.pathname.startsWith('/api/')) {
    throw new Error('Visiting a non-E2E frontend is forbidden.');
  }
  return url.href;
}

export function assertApiRequest(mode, rawUrl) {
  if (mode !== 'live') throw new Error('Real cy.request calls are forbidden in stub mode.');
  const url = new URL(rawUrl, API_URL);
  if (url.origin !== API_URL || !url.pathname.startsWith('/api/') || url.username || url.password || url.hash) {
    throw new Error('Real E2E requests must target the approved API.');
  }
  return url.href;
}

export function blockedHosts(mode) {
  // Cypress matches blockHosts with minimatch. Negate the exact permitted hosts,
  // so a fall-through/continued stub request cannot reach even the local API.
  return mode === 'stub' ? '!localhost:56379' : '!{localhost:56379,localhost:8080}';
}

function parseDatabaseUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('Invalid E2E database target.'); }
  if (url.protocol !== 'postgresql:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !url.port || url.password || url.search || url.hash ||
      !/^[a-zA-Z0-9_]+$/.test(url.username) || !/^\/[a-zA-Z0-9_]+$/.test(url.pathname) ||
      /prod/i.test(url.pathname) || ['/postgres', '/template0', '/template1'].includes(url.pathname)) {
    throw new Error('Only explicitly approved local disposable PostgreSQL targets are supported; remote/production targets are forbidden.');
  }
  const target = `postgresql://${url.username}@${url.hostname}:${url.port}${url.pathname}`;
  if (raw !== target) throw new Error('E2E database targets must use an unambiguous canonical URL without credentials/options.');
  return { target, host: url.hostname, port: Number(url.port), database: url.pathname.slice(1), username: url.username };
}

export function validateDatabase(env, authorizeReset = false) {
  resolveMode(env.E2E_MODE, env.CYPRESS_USE_STUBS ?? '0');
  if (env.E2E_MODE !== 'live' || env.NODE_ENV !== 'test') throw new Error('Database access requires explicit live E2E mode and NODE_ENV=test.');
  for (const key of ['DATABASE_URL', 'DB_LINK', 'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSERVICE']) {
    if (env[key]) throw new Error(`Conflicting database configuration: ${key} must not be set for E2E.`);
  }
  if (!env.DB_USERNAME || !env.DB_PASSWORD || env.DB_USERNAME.trim() !== env.DB_USERNAME ||
      !env.DB_LINK_TEST || !/^[a-zA-Z0-9_]+$/.test(env.DB_USERNAME)) {
    throw new Error('Explicit E2E database credentials and DB_LINK_TEST are required.');
  }
  const database = parseDatabaseUrl(`postgresql://${env.DB_USERNAME}@${env.DB_LINK_TEST}`);
  let allowlist;
  try { allowlist = JSON.parse(env.E2E_DB_ALLOWLIST); } catch { throw new Error('E2E_DB_ALLOWLIST must be an explicit JSON array of disposable database targets.'); }
  if (!Array.isArray(allowlist) || !allowlist.length || allowlist.some((entry) => typeof entry !== 'string')) {
    throw new Error('E2E_DB_ALLOWLIST must contain explicit disposable database targets.');
  }
  const targets = allowlist.map((entry) => parseDatabaseUrl(entry).target);
  if (new Set(targets).size !== targets.length || !targets.includes(database.target)) {
    throw new Error('Database is not uniquely listed in the disposable E2E allowlist.');
  }
  if (authorizeReset && env.E2E_RESET_AUTHORIZATION !== `RESET ${database.target}`) {
    throw new Error('Destructive reset requires E2E_RESET_AUTHORIZATION=RESET <exact approved database target>.');
  }
  if (!/^[a-f0-9]{32,64}$/.test(env.E2E_RUN_ID ?? '')) throw new Error('An explicit random E2E_RUN_ID (32–64 hex characters) is required.');
  if (env.PORT && env.PORT !== '8080') throw new Error('E2E backend PORT must be 8080.');
  return Object.freeze(database);
}

export function assertDatabaseClient(client, approved, password) {
  const config = client.config;
  if (!config || config.host !== approved.host || Number(config.port) !== approved.port ||
      config.database !== approved.database || config.username !== approved.username || config.password !== password ||
      client.getDialect() !== 'postgres' || client.options?.replication) {
    throw new Error('Loaded database client does not match the approved E2E target.');
  }
}
