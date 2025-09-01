import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ClientLoggerService } from '../services/client-logger.service';

export function httpErrorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const logger = inject(ClientLoggerService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const corrId = err.headers?.get?.('X-Request-Id') || err.error?.correlationId || null;
        logger.error(`HTTP ${err.status} ${req.method} ${req.url}`, {
          corrId,
          request: { method: req.method, url: req.url, body: scrubBody(req.body) },
          response: { status: err.status, body: safeJson(err.error) }
        });
      } else {
        logger.error(err);
      }
      throw err; // пробрасываем дальше
    })
  );
}

function safeJson(x: any) { try { return JSON.parse(JSON.stringify(x)); } catch { return String(x); } }
function scrubBody(b: any) {
  if (!b) return b;
  const clone = typeof b === 'object' ? { ...b } : b;
  if (clone?.password) clone.password = '***';
  if (clone?.email) clone.email = '***';
  return clone;
}
