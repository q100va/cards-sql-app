// server/logging/audit-auth.js
import { AuditLog } from '../models/index.js';

const MODEL = 'session';

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : (fwd || '')).split(',')[0].trim() || req.ip || null;
}

function getCorrId(req) {
  return req.correlationId || req.headers['x-request-id'] || req.id || null;
}

/**
 * Пишет событие аутентификации в AuditLog.
 *
 * @param {Request} req
 * @param {{
 *   event: string,            // 'login_success' | 'login_failed' | 'login_blocked' | 'refresh_success' | 'refresh_failed' | 'sign_out' ...
 *   userId?: number|null,     // если известен
 *   entityId?: string|null,   // чем индексировать событие (userId как строка, userName, ip). Если не передан — подберём автоматически.
 *   reason?: string|null,     // человекочит. причина ('bad_password', 'rate_limited', 'restricted', 'locked', 'invalid_refresh'...)
 *   details?: object|null     // доп. мета: счётчики, timestamps и т.п.
 * }} data
 */
export async function auditAuthFail(req, { event, userId = null, entityId = null, reason = null, details = null }) {
  try {
    const eid =
      entityId ??
      (userId != null ? String(userId) :
       (req.body?.userName ?? getIp(req) ?? 'unknown'));
       console.log('audit.auth.write');

    await AuditLog.create({
      action: 'auth',
      model: MODEL,
      entityId: String(eid),
      diff: {
        event,
        ...(reason ? { reason } : {}),
        ...(details ? { details } : {}),
      },
      actorUserId: userId ?? null,
      correlationId: getCorrId(req),
      ip: getIp(req),
      userAgent: req.get('user-agent')?.slice(0, 1024) ?? null,
    });
  } catch(err) {
      // console.log(err, 'audit.auth.write');
    // аудит НЕ должен ломать основной поток
  }
}
