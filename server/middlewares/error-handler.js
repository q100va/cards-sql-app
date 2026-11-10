import logger from '../logging/logger.js';

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

// Avoid logging query parameters because they may contain sensitive data.
function getRoute(req) {
  const path =
    req.originalUrl?.split('?')[0] ??
    req.path ??
    '';

  return `${req.method} ${path}`;
}

export function handleError(
  error,
  req,
  res,
  next,
) {
  // Delegate to Express when the response has already started.
  if (res.headersSent) {
    logger.error(
      {
        err: error,
        route: getRoute(req),
      },
      'Headers already sent',
    );

    return next(error);
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
    err: error,
    code,
    status,
    correlationId,
    route: getRoute(req),
    lang: req.lang ?? null,
  };

  // Include structured validation details only for validation errors.
  if (
    status === 422 &&
    error.details
  ) {
    logPayload.validation =
      error.details;
  }

  logger.error(
    logPayload,
    error.message ??
    'Unhandled error',
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
