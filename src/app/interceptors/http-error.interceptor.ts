import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { ClientLoggerService } from '../services/client-logger.service';
import { diagnosticPath, isClientLogTransport } from '../utils/http-diagnostics';
import { errorRecord, hasErrorDiagnostic, markErrorDiagnostic } from '../utils/error-diagnostics';

export function httpErrorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  if (isClientLogTransport(req)) return next(req);
  const logger = inject(ClientLoggerService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (hasErrorDiagnostic(err)) throw err;
      if (err instanceof HttpErrorResponse) {
        const body = errorRecord(err.error);
        const corrId = err.headers.get('X-Request-Id')
          || (typeof body['correlationId'] === 'string' ? body['correlationId'] : null);
        const code = typeof body['code'] === 'string' ? body['code'] : undefined;
        const path = diagnosticPath(req.url);
        // HTTP diagnostics omit bodies and query values, which can contain personal data.
        logger.error(`HTTP ${err.status} ${req.method} ${path}`, {
          corrId,
          code,
          request: { method: req.method, url: path },
          response: { status: err.status },
        });
      } else {
        logger.error(err);
      }
      markErrorDiagnostic(err);
      throw err;
    }),
  );
}
