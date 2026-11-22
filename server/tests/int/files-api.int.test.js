import fs from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import readXlsxFile from 'read-excel-file/node';

import { createRole } from './factories/role.js';
import { createOperation } from './factories/operation.js';

const templates = [
  ['template-countries.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-regions.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-districts.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-localities.xlsx', 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'],
  ['template-seniors.xlsx', 'DOWNLOAD_TEMPLATE_FOR_SENIOR'],
];
const TEST_FILENAME = templates[0][0];
const templateDirectory = new URL('../../protected-templates/', import.meta.url);

function makeAccessToken(roleId) {
  return jwt.sign(
    { sub: '42', roleId, uname: 'files-integration-user', role: 'FILES_TEST_ROLE' },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m', issuer: 'cards-sql-app', audience: 'web' },
  );
}

async function createAuthorizedToken(operation = 'DOWNLOAD_TEMPLATE_FOR_TOPONYM') {
  const role = await createRole({ name: `Files Test Role ${operation}` });

  await createOperation({ roleId: role.id, name: operation, access: true, disabled: false });

  return makeAccessToken(role.id);
}

function auth(request, token) {
  return request.set('Authorization', `Bearer ${token}`);
}

function parseWorkbook(stream, done) {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  stream.once('end', () => done(null, Buffer.concat(chunks)));
  stream.once('error', done);
}

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

  test('rejects encoded and literal traversal', async () => {
    const token = await createAuthorizedToken();
    const encoded = await auth(global.api.get('/api/files/download/..%2Ftemplate-countries.xlsx'), token);
    expect(encoded.status).toBe(422);
    const literal = await auth(global.api.get('/api/files/download/../template-countries.xlsx'), token);
    expect(literal.status).toBe(404);
  });

  test('returns 404 when the requested file does not exist', async () => {
    const token = await createAuthorizedToken();

    const res = await auth(global.api.get('/api/files/download/missing-file.txt'), token);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'ERRORS.FILE.NOT_FOUND' });
  });

  test.each(templates)('enforces the download contract for %s', async (filename, operation) => {
    const allowed = await createAuthorizedToken(operation);
    const wrong = await createAuthorizedToken(
      operation === 'DOWNLOAD_TEMPLATE_FOR_TOPONYM'
        ? 'DOWNLOAD_TEMPLATE_FOR_SENIOR'
        : 'DOWNLOAD_TEMPLATE_FOR_TOPONYM',
    );
    const url = `/api/files/download/${filename}`;
    const anonymous = await global.api.get(url);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body).toMatchObject({ code: 'ERRORS.UNAUTHORIZED' });
    const denied = await auth(global.api.get(url), wrong);
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ code: 'ERRORS.FORBIDDEN', data: null });
    const delivered = await auth(global.api.get(url), allowed).buffer(true).parse(parseWorkbook);
    expect(delivered.status).toBe(200);
    expect(delivered.headers['cache-control']).toBe('no-store');
    expect(delivered.headers['content-disposition']).toContain('attachment');
    expect(delivered.headers['content-disposition']).toContain(filename);
    expect(delivered.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(delivered.body).toEqual(await fs.readFile(new URL(filename, templateDirectory)));
  });

  test('does not use the client-side homes export permission for server templates', async () => {
    const token = await createAuthorizedToken('DOWNLOAD_HOMES_TABLE');
    const res = await auth(global.api.get(`/api/files/download/${TEST_FILENAME}`), token);
    expect(res.status).toBe(403);
  });

  test('blocks static workbook delivery even when a local public copy exists', async () => {
    const fixtureDir = await fs.mkdtemp(path.resolve('public', 'phase8c-static-'));
    const copy = path.join(fixtureDir, TEST_FILENAME);
    try {
      await fs.copyFile(new URL(TEST_FILENAME, templateDirectory), copy);
      const parentPath = `/${path.basename(fixtureDir)}`;
      expect((await global.api.get(`${parentPath}/${TEST_FILENAME}`)).status).toBe(404);
      expect((await global.api.get(`${parentPath}/template-countries%2exlsx`)).status).toBe(404);
      expect((await global.api.get('/i18n/en.json')).status).toBe(200);
      expect((await global.api.get('/healthz')).status).toBe(200);
    } finally {
      await fs.rm(copy, { force: true });
      await fs.rmdir(fixtureDir);
    }
  });

  test('packages a blank import workbook for every frontend template reference', async () => {
    const pagesDir = new URL('../../../src/app/pages/', import.meta.url);
    const schemaFile = new URL('../../../src/app/shared/upload-file/schemas.ts', import.meta.url);
    const schema = await fs.readFile(schemaFile, 'utf8');
    const templateTypes = {
      'template-countries.xlsx': 'country',
      'template-regions.xlsx': 'region',
      'template-districts.xlsx': 'district',
      'template-localities.xlsx': 'locality',
      'template-seniors.xlsx': 'seniors',
    };
    const references = new Set();
    for (const file of await fs.readdir(pagesDir, { recursive: true })) {
      const sourcePath = file.replaceAll('\\', '/');
      if (!/^(toponyms-lists|seniors-bulk-update)\//.test(sourcePath) ||
          !sourcePath.endsWith('.ts') || sourcePath.endsWith('.spec.ts')) continue;
      const source = await fs.readFile(new URL(sourcePath, pagesDir), 'utf8');
      for (const [, filename] of source.matchAll(/['"]([^'"/]+\.xlsx)['"]/g)) references.add(filename);
    }
    expect([...references].sort()).toEqual(Object.keys(templateTypes).sort());
    expect((await fs.readdir(templateDirectory)).sort()).toEqual([...references].sort());
    for (const filename of references) {
      const type = templateTypes[filename];
      const columns = schema.match(new RegExp(`^  ${type}: \\{([\\s\\S]*?)^  \\},`, 'm'))[1];
      const headers = [...columns.matchAll(/^    (\w+): \{/gm)].map(([, name]) => name);
      const workbook = await fs.readFile(new URL(filename, templateDirectory));
      expect(await readXlsxFile(workbook)).toEqual([headers]);
    }
  });
});
