import { createHash } from 'node:crypto';
import { validateDatabase } from './policy.mjs';

const allowed = new Set(['E2E_MODE', 'NODE_ENV', 'PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_LINK_TEST',
  'E2E_DB_ALLOWLIST', 'E2E_RESET_AUTHORIZATION', 'E2E_RUN_ID', 'PASSWORD_PEPPER', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']);

export function validateInputs(ambient, values, approval, now = Date.now()) {
  for (const [name, value] of Object.entries(ambient)) {
    if (value && name.startsWith('E2E_') && !['E2E_ENV_FILE', 'E2E_LIVE_APPROVAL_FILE', 'E2E_MODE'].includes(name)) throw new Error('Inherited E2E target/authorization overrides are forbidden.');
    if (value && (/^(DB_|DATABASE_|PG|JWT_|PASSWORD_|REDIS|CYPRESS_|DOTENV_|AWS_|AZURE_|GOOGLE_|VERCEL_|RENDER_|NEON_)/i.test(name) ||
      /^(NODE_OPTIONS|NODE_PATH|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY)$/i.test(name))) throw new Error('Inherited service settings or credentials are forbidden.');
  }
  if (ambient.NODE_ENV && ambient.NODE_ENV !== 'test') throw new Error('Conflicting inherited environment.');
  if (ambient.PORT && ambient.PORT !== '8080') throw new Error('Conflicting inherited backend port.');
  if (ambient.E2E_MODE && ambient.E2E_MODE !== 'live') throw new Error('Conflicting inherited E2E mode.');
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key) || typeof value !== 'string' || value.includes('\0')) throw new Error('The private environment file contains unsupported settings.');
  }
  const database = validateDatabase({ ...values, E2E_RUN_ID: '0'.repeat(64) }, true);
  if (database.host !== '127.0.0.1') throw new Error('The serial runner requires a literal IPv4 loopback database address.');
  if ([8080, 56379].includes(database.port)) throw new Error('Database and application ports must be separate.');
  if (JSON.parse(values.E2E_DB_ALLOWLIST).length !== 1) throw new Error('The serial runner requires exactly one approved target.');
  const secrets = ['DB_PASSWORD', 'PASSWORD_PEPPER', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].map((key) => values[key]);
  if (secrets.some((value) => !value || value.length < 32) || new Set(secrets).size !== secrets.length) throw new Error('Fresh distinct E2E-only secrets are required.');
  if (values.E2E_RUN_ID && !/^[a-f0-9]{32,64}$/.test(values.E2E_RUN_ID)) throw new Error('Invalid source run identity.');
  const timestamp = Date.parse(approval?.verifiedAt);
  if (approval?.version !== 1 || approval.target !== database.target ||
    approval.authorization !== `EXECUTE FIVE LIVE SPECS ${database.target}` ||
    !Number.isFinite(timestamp) || timestamp > now || now - timestamp > 24 * 60 * 60 * 1000 ||
    !['disposable', 'separateDevelopment', 'separateIntegration', 'lowPrivilege', 'exclusiveUse', 'localServerVerified',
      'loopbackEgressOnly', 'watchersAndAutomationReviewed', 'syntheticDataOnly'].every((key) => approval.confirmations?.[key] === true)) {
    throw new Error('A recent private operator approval bound to this exact disposable target is required.');
  }
  if (!['127.0.0.1', '::1'].includes(approval.server?.address) || !Number.isInteger(approval.server?.port) ||
    approval.server.port !== database.port || !/^[a-z]:\\.*\\postgres\.exe$/i.test(approval.server?.executable ?? '')) throw new Error('Verified native local PostgreSQL server identity is required.');
  return database;
}

export function validateCatalog(row, database, server) {
  if (!row || row.database !== database.database || row.username !== database.username || row.owner !== database.username ||
    row.address !== server.address || row.port !== server.port || row.superuser !== false || row.create_db !== false ||
    row.create_role !== false || row.replication !== false || row.bypass_rls !== false || row.inherited_roles !== false ||
    row.other_database_access !== false || ![null, database.username, 'pg_database_owner'].includes(row.schema_owner)) {
    throw new Error('Read-only database ownership/privilege verification failed.');
  }
}

export function validateInventory(snapshot, owned, root, runnerPid, ancestors = []) {
  if (!snapshot || !Array.isArray(snapshot.processes) || !Array.isArray(snapshot.listeners)) throw new Error('Process inventory is unavailable.');
  const ownedPids = new Set(owned.flatMap((process) => process.pids));
  const exempt = new Set([runnerPid, ...ancestors]);
  for (const process of snapshot.processes) {
    if (ownedPids.has(process.pid) || exempt.has(process.pid)) continue;
    const command = process.command;
    const node = /^(node|npm|nodemon|pm2|watchman)(\.exe)?$/i.test(process.name);
    const shell = /^(powershell|pwsh|cmd|python\d*|wscript|cscript)(\.exe)?$/i.test(process.name);
    if (node && (!command || !process.executable || !process.created)) throw new Error('Ambiguous Node process ownership.');
    if (command && (/\b(nodemon|watchman|forever|pm2)\b|--watch\b/i.test(command) ||
      ((node || shell) && command.toLowerCase().includes(root.toLowerCase())) ||
      (node && /cypress[\\/]safety[\\/]backend\.mjs|server[\\/]server\.(js|mjs)\b|\brun\s+(dev|server|watch)\b/i.test(command)))) {
      throw new Error('An unexpected backend, project process or watcher is running.');
    }
  }
  for (const listener of snapshot.listeners.filter((entry) => [8080, 56379].includes(entry.port))) {
    const owner = owned.find((process) => process.pids.includes(listener.pid));
    if (!owner || (listener.port === 8080 ? owner.kind !== 'backend' : owner.kind !== 'frontend') ||
      !['127.0.0.1', '::1'].includes(listener.address)) throw new Error('A required application port has unsafe ownership or binding.');
  }
  for (const connection of snapshot.connections ?? []) {
    if ((ownedPids.has(connection.pid) || connection.pid === runnerPid) && !['127.0.0.1', '::1'].includes(connection.remote)) {
      throw new Error('A controlled process has a non-loopback TCP connection.');
    }
  }
}

export const sourceDigest = (value) => createHash('sha256').update(value).digest('hex');

export function validateLocalhost(addresses) {
  if (!Array.isArray(addresses) || !addresses.length || addresses.some((entry) => !['127.0.0.1', '::1'].includes(entry.address))) {
    throw new Error('The fixed application localhost origin must resolve only to loopback.');
  }
}

export function validateDatabaseListener(snapshot, database, server) {
  const listeners = snapshot.listeners.filter((listener) => listener.port === database.port);
  if (!listeners.length) throw new Error('Verified native PostgreSQL listener is unavailable.');
  for (const listener of listeners) {
    const owner = snapshot.processes.find((process) => process.pid === listener.pid);
    if (!['127.0.0.1', '::1'].includes(listener.address) || !owner?.created || owner.name?.toLowerCase() !== 'postgres.exe' ||
      owner.executable?.toLowerCase() !== server.executable.toLowerCase()) throw new Error('Database listener is ambiguous, forwarded or not loopback-only native PostgreSQL.');
  }
}
