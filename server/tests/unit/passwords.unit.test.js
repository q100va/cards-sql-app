/* @jest-environment node */
import { jest } from '@jest/globals';
import argon2 from 'argon2';

async function withPepper(pepper, run) {
  const previousPepper = process.env.PASSWORD_PEPPER;

  try {
    await jest.isolateModulesAsync(async () => {
      process.env.PASSWORD_PEPPER = pepper;

      const mod = await import('../../security/passwords.mjs');

      await run(mod);
    });
  } finally {
    if (previousPepper === undefined) {
      delete process.env.PASSWORD_PEPPER;
    } else {
      process.env.PASSWORD_PEPPER = previousPepper;
    }
  }
}

describe('passwords', () => {
  beforeAll(() => {
    jest.setTimeout(30000);
  });

  test('throws when PASSWORD_PEPPER is not configured', async () => {
    const previousPepper = process.env.PASSWORD_PEPPER;

    try {
      delete process.env.PASSWORD_PEPPER;

      await expect(jest.isolateModulesAsync(async () => {
        await import('../../security/passwords.mjs');
      })).rejects.toThrow('PASSWORD_PEPPER is not configured');
    } finally {
      if (previousPepper === undefined) {
        delete process.env.PASSWORD_PEPPER;
      } else {
        process.env.PASSWORD_PEPPER = previousPepper;
      }
    }
  });

  test('hashPassword throws on empty password', async () => {
    await withPepper('pepper-1', async ({ hashPassword }) => {
      await expect(hashPassword('')).rejects.toThrow('Empty password');
    });
  });

  test('hashPassword creates salted Argon2id hashes', async () => {
    await withPepper('pepper-1', async ({ hashPassword }) => {
      const first = await hashPassword('secret-123');

      const second = await hashPassword('secret-123');

      expect(first).toMatch(/^\$argon2id\$/);

      expect(second).toMatch(/^\$argon2id\$/);

      expect(first).not.toBe(second);
    });
  });

  test('hashPassword uses expected Argon2id parameters', async () => {
    await withPepper('pepper-1', async ({ hashPassword }) => {
      const hash = await hashPassword('format-check');

      expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    });
  });

  test('verify returns true for the correct password and pepper', async () => {
    await withPepper('pepper-1', async ({
      hashPassword,
      verify,
    }) => {
      const hash = await hashPassword('s3cr3t!');

      await expect(verify(hash, 's3cr3t!')).resolves.toBe(true);
    });
  });

  test('verify returns false for invalid credentials', async () => {
    let hash;

    await withPepper('pepper-1', async ({ hashPassword }) => {
      hash = await hashPassword('s3cr3t!');
    });

    await withPepper('pepper-1', async ({ verify }) => {
      await expect(verify(hash, 'wrong')).resolves.toBe(false);
    });

    await withPepper('pepper-2', async ({ verify }) => {
      await expect(verify(hash, 's3cr3t!')).resolves.toBe(false);
    });
  });

  test('verify returns false for missing or malformed input', async () => {
    await withPepper('pepper-1', async ({
      hashPassword,
      verify,
    }) => {
      const hash = await hashPassword('abc');

      await expect(verify('', 'abc')).resolves.toBe(false);

      await expect(verify(hash, '')).resolves.toBe(false);

      await expect(verify('not-a-valid-hash', 'abc')).resolves.toBe(false);
    });
  });

  test('DUMMY_ARGON2_HASH is a valid Argon2 hash', async () => {
    await withPepper('pepper-1', async ({ DUMMY_ARGON2_HASH }) => {
      await expect(argon2.verify(DUMMY_ARGON2_HASH, 'dummy-password', {
        secret: Buffer.from('pepper-1'),
      })).resolves.toBe(false);
    });
  });
});
