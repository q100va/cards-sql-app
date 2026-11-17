import { requireAny, requireOperation } from './require-permission.js';
import { REPORT_TYPE } from '../../shared/dist/constants/reports.js';

const requireLimitedOrFull = requireAny(
  'VIEW_LIMITED_REPORTS',
  'VIEW_FULL_REPORTS'
);

const requireFull = requireOperation('VIEW_FULL_REPORTS');

function forbidden() {
  return Object.assign(new Error('Forbidden'), {
    status: 403,
    code: 'ERRORS.FORBIDDEN'
  });
}

export function requireReportAccess(req, res, next) {
  const { type, userId } = req.body;

  if (type === REPORT_TYPE.PERSONAL) {
    if (userId !== req.user.id) {
      return next(forbidden());
    }

    return next();
  }

  if (userId !== null) {
    return next(forbidden());
  }

  if (type === REPORT_TYPE.SCHOOL_COORDINATION) {
    return requireLimitedOrFull(req, res, next);
  }

  if (
    type === REPORT_TYPE.GENERAL ||
    type === REPORT_TYPE.BY_OCCASION
  ) {
    return requireFull(req, res, next);
  }

  return next(forbidden());
}
