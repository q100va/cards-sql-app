/* @jest-environment node */
import sequelize from '../../database.js';
import { QueryTypes } from 'sequelize';

// Если модель экспортируется из индексного файла моделей:
import { User } from '../../models/index.js';

// Если у тебя есть фабрики — можно ими; иначе создадим напрямую через модель
import { createRole } from './factories/role.js';

// Хелпер: подчистить таблицу users между тестами (и зависящие объекты)
async function truncateAll() {
  // Если у тебя есть общий truncate-хелпер — используй его
  await sequelize.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;', { type: QueryTypes.RAW });
}

describe('User lock/restrict (model integration on Postgres)', () => {
  const now = new Date('2025-09-15T12:00:00Z');

  beforeEach(async () => {
    await truncateAll();
  });

  // утилита: создать валидного пользователя (через модель или фабрику)
  async function makeUser(fields = {}) {
    // если в схеме users есть NOT NULL на roleId — создадим роль фабрикой
    const role = await createRole({ name: `user_role_${Date.now()}`, description: 'description' });
    try {
      const user = await User.create({
        userName: fields.userName ?? `user_${Date.now()}`,
        firstName: fields.firstName ?? 'Test',
        patronymic: null,
        lastName: fields.lastName ?? 'User',
        password: fields.password ?? 'HASH',                  // тестовый хэш (не используется тут)
        roleId: fields.roleId ?? role.id,
        comment: null,
        // поля для локов — по умолчанию нули/NULL, модель сама подставит defaultValue
        failedLoginCount: fields.failedLoginCount ?? 0,
        lockedUntil: fields.lockedUntil ?? null,
        bruteWindowStart: fields.bruteWindowStart ?? null,
        bruteStrikeCount: fields.bruteStrikeCount ?? 0,
        isRestricted: fields.isRestricted ?? false,
        causeOfRestriction: fields.causeOfRestriction ?? null,
        dateOfRestriction: fields.dateOfRestriction ?? null,
      });
      return user;
    } catch (e) {
      // postgres подробности тут:
      // e.parent?.detail (NOT NULL violation / FK violation),
      // e.parent?.constraint, e.parent?.table, e.parent?.column
      // eslint-disable-next-line no-console
      console.error('Create user failed:', e.parent?.detail || e.message);
      throw e;
    }
  }

  it('7-й провал ⇒ lock: failedLoginCount сбрасывается, lockedUntil = now+15m, strike=1', async () => {
    const u = await makeUser({ userName: 'alice' });

    // 6 неудач — только счётчик растёт
    for (let i = 0; i < 6; i++) {
      await u.registerFailedLogin(now); // ← метод модели (как мы добавляли)
    }
    await u.reload();
    expect(u.failedLoginCount).toBe(6);
    expect(u.lockedUntil).toBeNull();

    // 7-я неудача — происходит lock
    const { events, state } = await u.registerFailedLogin(now);
    expect(events).toContain('locked');

    await u.reload();
    expect(u.failedLoginCount).toBe(0);
    expect(u.lockedUntil).not.toBeNull();
    expect(u.lockedUntil.getTime()).toBe(now.getTime() + 15 * 60_000); // 15 минут
    expect(u.bruteStrikeCount).toBe(1);
    expect(u.isRestricted).toBe(false);

    // доп. проверка: state из метода соответствует персисту
    expect(state.bruteStrikeCount).toBe(1);
  });

  it('3 лока в пределах 24ч ⇒ isRestricted=true, causeOfRestriction=daily_lockout', async () => {
    const u = await makeUser({ userName: 'bob' });

    // Лок #1 (7-й фейл в момент now)
    for (let i = 0; i < 6; i++) await u.registerFailedLogin(now);
    await u.registerFailedLogin(now);
    await u.reload();
    expect(u.bruteStrikeCount).toBe(1);
    expect(u.isRestricted).toBe(false);

    // Лок #2 через 1 час (внутри 24h окна)
    const t2 = new Date(now.getTime() + 60 * 60_000);
    for (let i = 0; i < 6; i++) await u.registerFailedLogin(t2);
    await u.registerFailedLogin(t2);
    await u.reload();
    expect(u.bruteStrikeCount).toBe(2);
    expect(u.isRestricted).toBe(false);

    // Лок #3 через ещё 1 час → restricted
    const t3 = new Date(now.getTime() + 2 * 60 * 60_000);
    for (let i = 0; i < 6; i++) await u.registerFailedLogin(t3);
    const res3 = await u.registerFailedLogin(t3);
    expect(res3.events).toContain('restricted');

    await u.reload();
    expect(u.isRestricted).toBe(true);
    expect(u.causeOfRestriction).toBe('daily_lockout');
    expect(u.dateOfRestriction.getTime()).toBe(t3.getTime());
  });

  it('успешный вход ⇒ resetAfterSuccess: failedLoginCount=0, lockedUntil=NULL', async () => {
    const u = await makeUser({
      userName: 'charlie',
      failedLoginCount: 4,
      lockedUntil: new Date(now.getTime() + 10_000),
      bruteWindowStart: now,
      bruteStrikeCount: 1,
    });

    const { touched } = await u.resetAfterSuccess();
    expect(touched).toBe(true);

    await u.reload();
    expect(u.failedLoginCount).toBe(0);
    expect(u.lockedUntil).toBeNull();

    // Страйки/окно по нашей логике не трогаем — если хочешь иначе, скорректируй в методе и тесте
    expect(u.bruteStrikeCount).toBe(1);
    expect(u.bruteWindowStart.getTime()).toBe(now.getTime());
  });
});
