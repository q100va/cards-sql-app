import logger from '../logging/logger.js';
import { isContactSearchRequest, requestLogPath } from '../logging/request-path.js';

// Maps common HTTP statuses to stable API error codes.
function statusToDefaultCode(status) {
  if (status === 400) {
    return 'ERRORS.BAD_REQUEST';
  }

  if (status === 401) {
    return 'ERRORS.UNAUTHORIZED';
  }

  if (status === 403) {
    return 'ERRORS.FORBIDDEN';
  }

  if (status === 404) {
    return 'ERRORS.NOT_FOUND';
  }

  if (status === 409) {
    return 'ERRORS.CONFLICT';
  }

  if (status === 422) {
    return 'ERRORS.VALIDATION';
  }

  return 'ERRORS.UNKNOWN';
}

// Accept only valid HTTP error statuses; fall back to 500 otherwise.
function normalizeStatus(error) {
  const status =
    error?.status ??
    error?.statusCode;

  return Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
    ? status
    : 500;
}

function getRoute(req) {
  return `${req.method} ${requestLogPath(req)}`;
}

export function handleError(
  error,
  req,
  res,
  next,
) {
  const privateLookup = isContactSearchRequest(req);
  // Delegate to Express when the response has already started.
  if (res.headersSent) {
    logger.error(
      {
        ...(privateLookup ? {} : { err: error }),
        route: getRoute(req),
      },
      'Headers already sent',
    );

    return next(privateLookup ? new Error('Contact search request failed') : error);
  }

  const status =
    normalizeStatus(error);

  const correlationId =
    req.correlationId ??
    req.id ??
    null;

  const code =
    error.code ??
    statusToDefaultCode(status);

  const data =
    error.data ?? null;

  const logPayload = {
    ...(privateLookup ? {} : { err: error }),
    code,
    status,
    correlationId,
    route: getRoute(req),
    lang: req.lang ?? null,
  };

  // Include structured validation details only for validation errors.
  if (
    !privateLookup &&
    status === 422 &&
    error.details
  ) {
    logPayload.validation =
      error.details;
  }

  logger.error(
    logPayload,
    privateLookup ? 'Contact search request failed' : (error.message ?? 'Unhandled error'),
  );

  return res
    .status(status)
    .json({
      code,
      data,
      correlationId,
    });
}

export function notFound(
  req,
  _res,
  next,
) {
  const error =
    new Error('Not Found');

  error.status = 404;
  error.code =
    'ERRORS.NOT_FOUND';

  return next(error);
}
