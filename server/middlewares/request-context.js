import { AsyncLocalStorage } from 'async_hooks';

const als = new AsyncLocalStorage();

export function withRequestContext(req, _res, next) {
  const ctx = {
    correlationId: req.correlationId || req.id || null,
   // TODO: userId: req.user?.id ?? null,
    ip: req.ip || null,
    userAgent: req.get('user-agent') || null,
  };
  als.run(ctx, () => next());
}

export function getRequestContext() {
  return als.getStore?.() || {};
}
