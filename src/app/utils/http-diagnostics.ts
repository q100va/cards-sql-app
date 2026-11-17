import { HttpContextToken, HttpRequest } from '@angular/common/http';

export const CLIENT_LOG_TRANSPORT = new HttpContextToken<boolean>(() => false);

export function diagnosticPath(url: string): string {
  try {
    return new URL(url, location.origin).pathname;
  } catch {
    return url.split(/[?#]/, 1)[0];
  }
}

export function isClientLogTransport(req: HttpRequest<unknown>): boolean {
  // The endpoint fallback also protects callers that send diagnostic batches directly.
  return req.context.get(CLIENT_LOG_TRANSPORT) || diagnosticPath(req.url) === '/api/client-logs';
}
