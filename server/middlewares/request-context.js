import { AsyncLocalStorage } from 'async_hooks';

const als = new AsyncLocalStorage();

export function withRequestContext(
  req,
  _res,
  next,
) {
  const ctx = {
    correlationId:
      req.correlationId ??
      req.id ??
      null,
    userId: null,
    ip: req.ip ?? null,
    userAgent:
      req.get('user-agent') ?? null,
  };

  als.run(ctx, () => next());
}

export function setRequestUserId(userId) {
  const ctx = als.getStore();

  if (ctx) {
    ctx.userId = userId ?? null;
  }
}

export function getRequestContext() {
  return als.getStore() ?? {};
}
