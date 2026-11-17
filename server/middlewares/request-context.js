import { AsyncLocalStorage } from 'async_hooks';

const als = new AsyncLocalStorage();

export function withRequestContext(
  req,
  _res,
  next,
) {
  const context = {
    correlationId:
      req.correlationId ??
      req.id ??
      null,

    userId: null,

    ip:
      req.ip ?? null,

    userAgent:
      req.get('user-agent') ??
      null,
  };

  // Keep request metadata available across asynchronous operations.
  return als.run(
    context,
    next,
  );
}

export function setRequestUserId(userId) {
  const context =
    als.getStore();

  if (context) {
    // Authentication happens after the request context is created.
    context.userId =
      userId ?? null;
  }
}

export function getRequestContext() {
  return als.getStore() ?? {};
}
