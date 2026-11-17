import fs from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';

const TEST_FILENAME = 'integration-download.txt';
const TEST_CONTENT = 'integration file download test';

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'files-integration-user', role: 'FILES_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedToken(operation = 'DOWNLOAD_TEMPLATE_FOR_TOPONYM') {
  const role = await createRole({ name: 'Files Test Role' });

  await createOperation({ roleId: role.id, name: operation, access: true, disabled: false });

  return makeAccessToken(role.id);
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

function getPublicDir() {
  return path.resolve(process.cwd(), 'public');
}

async function removeTestFile() {
  const filePath = path.join(getPublicDir(), TEST_FILENAME);

  await fs.rm(filePath, { force: true });
}

afterEach(async () => {
  await removeTestFile();
});

describe('GET /api/files/download/:filename', () => {
  test('returns 401 when authentication is missing', async () => {
    const res = await global.api.get(`/api/files/download/${TEST_FILENAME}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'ERRORS.UNAUTHORIZED', data: null });
  });

  test('returns 403 when the role lacks download permission', async () => {
    const role = await createRole({ name: 'No Download Access Role' });

    const token = makeAccessToken(role.id);

    const res = await auth(global.api.get(`/api/files/download/${TEST_FILENAME}`), token);

    expect(res.status).toBe(403);
  });

  test('returns 422 when filename contains a path separator', async () => {
    const token = await createAuthorizedToken();

    const res = await auth(global.api.get('/api/files/download/..%5Csecret.txt'), token);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'ERRORS.VALIDATION' });
  });

  test('returns 404 when the requested file does not exist', async () => {
    const token = await createAuthorizedToken();

    const res = await auth(global.api.get('/api/files/download/missing-file.txt'), token);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'ERRORS.FILE.NOT_FOUND' });
  });

  test('downloads an existing file', async () => {
    const token = await createAuthorizedToken();

    const publicDir = getPublicDir();

    await fs.mkdir(publicDir, { recursive: true });

    await fs.writeFile(path.join(publicDir, TEST_FILENAME), TEST_CONTENT, 'utf8');

    const res = await auth(global.api.get(`/api/files/download/${TEST_FILENAME}`), token);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain(TEST_FILENAME);
    expect(res.text).toBe(TEST_CONTENT);
  });

  test('allows DOWNLOAD_HOMES_TABLE permission', async () => {
    const token = await createAuthorizedToken('DOWNLOAD_HOMES_TABLE');

    const publicDir = getPublicDir();

    await fs.mkdir(publicDir, { recursive: true });

    await fs.writeFile(path.join(publicDir, TEST_FILENAME), TEST_CONTENT, 'utf8');

    const res = await auth(global.api.get(`/api/files/download/${TEST_FILENAME}`), token);

    expect(res.status).toBe(200);
  });
});
