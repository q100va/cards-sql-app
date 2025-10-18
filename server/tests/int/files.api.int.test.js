// server/tests/int/files.api.int.test.js
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import jwt from 'jsonwebtoken';
import { beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// NOTE: assuming your jest setup exposes global.api = supertest(app)
// and your app mounts files router at /api/files

describe('Files API (integration): GET /api/files/download/:filename', () => {
  let auth = {};
  let tmpRoot;     // temp dir we control
  let publicDir;   // tmpRoot/../public by route code expectations
  let filePath;

  beforeAll(async () => {
    // Prepare JWT as in other integration tests
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not set (.env.test)');

    const token = jwt.sign(
      { sub: '1', uname: 'superAdmin', role: 'ADMIN', roleId: 1 },
      secret,
      { issuer: 'cards-sql-app', audience: 'web', expiresIn: '15m' }
    );
    auth = { Authorization: `Bearer ${token}` };

    // Create a temp dir and shape __basedir -> ../public
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'files-api-'));
    // The route resolves PUBLIC_DIR = path.resolve(__basedir, '../public')
    // So we set __basedir to tmpRoot/<anything>, and create ../public relative to it.
    const basedir = path.join(tmpRoot, 'srv'); // arbitrary
    publicDir = path.resolve(basedir, '../public');
    await fs.mkdir(publicDir, { recursive: true });

    // Expose __basedir for the route code
    // @ts-ignore
    global.__basedir = basedir;

    // Create a real file with non-ASCII name to test ascii fallback
    filePath = path.join(publicDir, 'тестовый файл.txt');
    await fs.writeFile(filePath, 'Hello World!', 'utf8');
  });

  afterAll(async () => {
    // Cleanup temp tree
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    } catch {}
  });

  beforeEach(() => {
    // Silence noisy logs (optional)
    if (!console.log._isMockFunction) {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    }
  });

  // -------------------- Success path ---------------------------------------
it('downloads an existing file with correct headers and body', async () => {
  const { status, headers, text } = await global.api
    .get('/api/files/download/' + encodeURIComponent('тестовый файл.txt'))
    .set(auth);

  expect(status).toBe(200);

  const cd = headers['content-disposition'];
  expect(cd).toMatch(/attachment;/i);

  // 1) Extract ASCII fallback and validate it's strictly printable ASCII
  const m = cd.match(/filename="([^"]+)"/);
  expect(m).toBeTruthy();
  const asciiFallback = m[1];
  // must be only printable ASCII 0x20..0x7E
  expect(/^[\x20-\x7E]+$/.test(asciiFallback)).toBe(true);
  // should contain at least one replacement char ('_' in our code, '?' on some stacks)
  expect(/[?_]/.test(asciiFallback)).toBe(true);

  // 2) RFC5987 UTF-8 filename*
  expect(cd).toMatch(/filename\*=\s*UTF-8''/i);
  // basic sanity: encoded cyrillic percent-encoding present
  expect(cd).toMatch(/%D1%82%D0%B5%D1%81%D1%82%D0%BE%D0%B2%D1%8B%D0%B9/i);

  // 3) Body equals file contents
  expect(text).toBe('Hello World!');
});
  // -------------------- Not found ------------------------------------------
  it('returns 404 + ERRORS.FILE.NOT_FOUND for missing file', async () => {
    const { status, body } = await global.api
      .get('/api/files/download/' + encodeURIComponent('absent.txt'))
      .set(auth);

    expect(status).toBe(404);
    expect(body.code).toBe('ERRORS.FILE.NOT_FOUND');
  });

  // -------------------- Directory traversal guard --------------------------
it('rejects path traversal by validation (422)', async () => {
  const { status, body } = await global.api
    .get('/api/files/download/' + encodeURIComponent('../secrets.txt'))
    .set(auth);

  expect(status).toBe(422);
  expect(body.code).toBe('ERRORS.VALIDATION');
});

  // -------------------- Not a regular file ---------------------------------
  it('returns 404 when target is a directory, not a file', async () => {
    const dirName = 'sampleDir';
    await fs.mkdir(path.join(publicDir, dirName), { recursive: true });

    const { status, body } = await global.api
      .get('/api/files/download/' + encodeURIComponent(dirName))
      .set(auth);

    expect(status).toBe(404);
    expect(body.code).toBe('ERRORS.FILE.NOT_FOUND');
  });
});
