// tests/db.js
// Utilities for integration tests: connect once, wrap each test in a TX and rollback.

import pkg from 'pg';
const { Client } = pkg;

/** @type {Client | null} */
let client = null;

/**
 * Connect a singleton pg Client using env (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)
 * or DATABASE_URL.
 */
export async function dbConnect() {
  if (client) return client;
  client = new Client({
  });
  await client.connect();
  // Optional: stricter defaults for tests
  await client.query(`SET client_min_messages TO WARNING`);
  return client;
}

/** Disconnect and drop the client. */
export async function dbDisconnect() {
  if (!client) return;
  try {
    await client.end();
  } finally {
    client = null;
  }
}

/** Begin a transaction (used in beforeEach). */
export async function begin() {
  const c = await dbConnect();
  await c.query('BEGIN');
}

/** Roll back the current transaction (used in afterEach). */
export async function rollback() {
  if (!client) return;
  try {
    await client.query('ROLLBACK');
  } catch (_) {
    // ignore if no tx is open
  }
}

/**
 * Run a parametrized query with safety checks.
 * @param {string} text SQL text with $1..$n placeholders
 * @param {any[]=} params Optional parameter array
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function q(text, params=[]) {
  if (!client) throw new Error('DB client not connected');
  return client.query(text, params);
}

/**
 * Convenience helper if нужно выполнить блок в отдельной транзакции:
 * откатывает при исключении, коммитит при успехе.
 * В обычных интеграционных тестах тебе хватает begin/rollback в хуках.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function inTx(fn) {
  const c = await dbConnect();
  await c.query('BEGIN');
  try {
    const res = await fn();
    await c.query('COMMIT');
    return res;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch {}
    throw e;
  }
}
