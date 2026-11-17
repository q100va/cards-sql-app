import { AuditLog } from '../models/index.js';
import logger from '../logging/logger.js';

const MODEL = 'session';

function getIp(req) {
  return req.ip ?? null;
}

function getCorrId(req) {
  return req.correlationId ?? req.id ?? null;
}

/**
 * Writes an authentication event to AuditLog.
 *
 * @param {Request} req
 * @param {{
 *   event: string,
 *   userId?: number | null,
 *   entityId?: string | null,
 *   reason?: string | null,
 *   details?: object | null
 * }} data
 */
export async function auditAuthEvent(
  req,
  {
    event,
    userId = null,
    entityId = null,
    reason = null,
    details = null,
  },
) {
  try {
    const eid =
      entityId ??
      (userId != null
        ? String(userId)
        : req.body?.userName ??
          getIp(req) ??
          'unknown');

    await AuditLog.create({
      action: 'auth',
      model: MODEL,
      entityId: String(eid),
      diff: {
        event,
        ...(reason
          ? { reason }
          : {}),
        ...(details
          ? { details }
          : {}),
      },
      actorUserId: userId,
      correlationId: getCorrId(req),
      ip: getIp(req),
      userAgent:
        req
          .get('user-agent')
          ?.slice(0, 1024) ??
        null,
    });
  } catch (error) {
    logger.error(
      { error },
      'Failed to write authentication audit log',
    );
  }
}
