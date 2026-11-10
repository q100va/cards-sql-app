import { Op } from 'sequelize';
import { RolePermission } from '../models/index.js';

function unauthorized() {
  return Object.assign(
    new Error('Unauthorized'),
    {
      status: 401,
      code: 'ERRORS.UNAUTHORIZED',
    },
  );
}

function forbidden(details) {
  return Object.assign(
    new Error('Forbidden'),
    {
      status: 403,
      code: 'ERRORS.FORBIDDEN',
      details,
    },
  );
}

function getOperationCodes(opCodes) {
  return [
    ...new Set(
      opCodes.filter(
        (code) =>
          typeof code === 'string' &&
          code.trim() !== '',
      ),
    ),
  ];
}

function handleAccessCheckError(
  error,
  next,
) {
  error.status =
    error.status ?? 500;

  error.code =
    error.code ??
    'ERRORS.DATA_FETCH_FAILED';

  return next(error);
}

// Requires at least one of the specified operations.
export function requireAny(
  ...opCodes
) {
  const codes =
    getOperationCodes(opCodes);

  return async (
    req,
    _res,
    next,
  ) => {
    try {
      const roleId =
        req.user?.roleId;

      if (!roleId) {
        return next(
          unauthorized(),
        );
      }

      if (codes.length === 0) {
        return next(
          forbidden({
            requiredAny: [],
          }),
        );
      }

      const count =
        await RolePermission.count({
          where: {
            roleId,
            name: {
              [Op.in]: codes,
            },
            access: true,
          },
        });

      if (count > 0) {
        return next();
      }

      return next(
        forbidden({
          requiredAny: codes,
        }),
      );
    } catch (error) {
      return handleAccessCheckError(
        error,
        next,
      );
    }
  };
}

// Requires all of the specified operations.
export function requireAll(
  ...opCodes
) {
  const codes =
    getOperationCodes(opCodes);

  return async (
    req,
    _res,
    next,
  ) => {
    try {
      const roleId =
        req.user?.roleId;

      if (!roleId) {
        return next(
          unauthorized(),
        );
      }

      if (codes.length === 0) {
        return next(
          forbidden({
            requiredAll: [],
          }),
        );
      }

      const rows =
        await RolePermission.findAll({
          where: {
            roleId,
            name: {
              [Op.in]: codes,
            },
            access: true,
          },
          attributes: ['name'],
          raw: true,
        });

      const available =
        new Set(
          rows.map(
            (row) => row.name,
          ),
        );

      const missing =
        codes.filter(
          (code) =>
            !available.has(code),
        );

      if (missing.length === 0) {
        return next();
      }

      return next(
        forbidden({
          requiredAll: codes,
          missing,
        }),
      );
    } catch (error) {
      return handleAccessCheckError(
        error,
        next,
      );
    }
  };
}

export const requireOperation =
  (opCode) =>
    requireAll(opCode);
