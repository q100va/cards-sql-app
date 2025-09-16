/* @jest-environment node */
import { jest } from '@jest/globals';

// Хелпер: изолированно импортируем модуль с нужным PEPPER
async function withPepper(pepper, run) {
  await jest.isolateModulesAsync(async () => {
    process.env.PASSWORD_PEPPER = pepper;
    const mod = await import('../../controllers/passwords.mjs');
    await run(mod);
  });
}

describe('passwords (argon2id + pepper)', () => {
  beforeAll(() => jest.setTimeout(30000));

  test('hashPassword: throws on empty', async () => {
    await withPepper('pepper-1', async ({ hashPassword }) => {
      await expect(hashPassword('')).rejects.toThrow('Empty password');
    });
  });

  test('hashPassword: returns $argon2id$ and is salted (different each time)', async () => {
    await withPepper('pepper-1', async ({ hashPassword }) => {
      const h1 = await hashPassword('secret-123');
      const h2 = await hashPassword('secret-123');
      expect(h1).toMatch(/^\$argon2id\$/);
      expect(h2).toMatch(/^\$argon2id\$/);
      expect(h1).not.toEqual(h2);
    });
  });

  test('verify: true with correct pepper', async () => {
    await withPepper('pepper-1', async ({ hashPassword, verify }) => {
      const hash = await hashPassword('s3cr3t!');
      await expect(verify(hash, 's3cr3t!')).resolves.toBe(true);
    });
  });

  test('verify: false with wrong password', async () => {
    await withPepper('pepper-1', async ({ hashPassword, verify }) => {
      const hash = await hashPassword('s3cr3t!');
      await expect(verify(hash, 'nope')).resolves.toBe(false);
    });
  });

  test('verify: false when pepper differs (secret key mismatch)', async () => {
    let hash;
    await withPepper('pepper-1', async ({ hashPassword }) => {
      hash = await hashPassword('s3cr3t!');
    });
    await withPepper('pepper-2', async ({ verify }) => {
      await expect(verify(hash, 's3cr3t!')).resolves.toBe(false);
    });
  });

  test('verify: false when args are missing', async () => {
    await withPepper('pepper-1', async ({ hashPassword, verify }) => {
      const hash = await hashPassword('abc');
      await expect(verify('', 'abc')).resolves.toBe(false);
      await expect(verify(hash, '')).resolves.toBe(false);
      await expect(verify('', '')).resolves.toBe(false);
    });
  });

  test('hashPassword: argon2id string has expected v/m/t/p and base64 sections', async () => {
    await withPepper('pepper-1', async ({ hashPassword }) => {
      const hash = await hashPassword('format-check');

      // Полный формат: $argon2id$v=19$m=65536,t=3,p=1$<salt_b64>$<hash_b64>
      expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);

      // Проверим, что есть обе base64-секции «соль» и «хэш»
      const parts = hash.split('$');
      // ['', 'argon2id', 'v=19', 'm=65536,t=3,p=1', '<salt>', '<hash>']
      expect(parts.length).toBe(6);
      const saltB64 = parts[4];
      const hashB64 = parts[5];

      // Базовый sanity-check на base64 (argon2 использует стандартный base64)
      const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
      expect(saltB64).toMatch(b64);
      expect(hashB64).toMatch(b64);
      expect(hashB64.length).toBeGreaterThan(20); // просто чтоб не было совсем коротким
    });
  });

  test('hashPassword: hash does NOT leak plain password or pepper', async () => {
    await withPepper('pepper-SECRET', async ({ hashPassword }) => {
      const plain = 'very-strong-password';
      const hash = await hashPassword(plain);

      expect(hash).not.toContain(plain);
      expect(hash).not.toContain('pepper-SECRET'); // секрет не сериализуется в строку
    });
  });

  test('verify: rejects on malformed hash string (not argon2)', async () => {
    await withPepper('pepper-1', async ({ verify }) => {
      // Некорректный хэш: библиотека argon2 должна кинуть исключение
      await expect(verify('not-a-valid-hash', 'abc')).resolves.toBe(false);
      // Можно проверить и «похожий» префикс, но невалидный хвост
      await expect(
        verify('$argon2id$v=19$m=65536,t=3,p=1$bad$parts', 'abc')
      ).resolves.toBe(false);
    });
  });
});
