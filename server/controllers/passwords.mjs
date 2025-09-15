// server/security/passwords.mjs
import argon2 from 'argon2';
const PEPPER = process.env.PASSWORD_PEPPER ?? '';

/**
 * Генерация нового хэша (Argon2id + pepper).
 * Используй при регистрации/смене пароля.
 */
export async function hashPassword(plain) {
  if (!plain) throw new Error('Empty password');
  return argon2.hash(plain, {
    type: argon2.argon2id,
    // Подбирай под свой сервер. Стартовые параметры:
    memoryCost: 64 * 1024, // 64 MiB
    timeCost: 3,
    parallelism: 1,
    secret: Buffer.from(PEPPER),
  });
}

/**
 * Проверка хэша + ленивая миграция:
 * - Если хэш уже Argon2 — проверяем через argon2 + pepper
 * - Если старый bcrypt — проверяем (plain+pepper), при успехе мигрируем на Argon2id
 *
 * @param {import('../models/user.js').default} userInstance — Sequelize instance с полем password
 * @param {string} plain — введённый пароль
 * @returns {Promise<boolean>}
 */
export async function verify(hash, plain) {
  if (!hash || !plain) return false;
  const ok = argon2.verify(hash, plain, { secret: Buffer.from(PEPPER) });
  return ok;
}


export const DUMMY_ARGON2_HASH ='$argon2id$v=19$m=65536,t=3,p=1$Jf/qggjeV3hTdEIsNYUWBw$VbWco1IUr04/pxpbcjKEnz0EBiJMYSMWQQ2LyuJWFYo';
