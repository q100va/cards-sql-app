import argon2 from 'argon2';

const PEPPER =
  process.env.PASSWORD_PEPPER;

if (!PEPPER) {
  throw new Error(
    'PASSWORD_PEPPER is not configured',
  );
}

const PEPPER_BUFFER =
  Buffer.from(PEPPER);

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
  secret: PEPPER_BUFFER,
};

export async function hashPassword(
  plain,
) {
  if (!plain) {
    throw new Error(
      'Empty password',
    );
  }

  return argon2.hash(
    plain,
    HASH_OPTIONS,
  );
}

/**
 * Verifies a password against an Argon2id hash.
 */
export async function verify(
  hash,
  plain,
) {
  if (!hash || !plain) {
    return false;
  }

  try {
    return await argon2.verify(
      hash,
      plain,
      {
        secret: PEPPER_BUFFER,
      },
    );
  } catch {
    return false;
  }
}

export const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$Jf/qggjeV3hTdEIsNYUWBw$VbWco1IUr04/pxpbcjKEnz0EBiJMYSMWQQ2LyuJWFYo';
