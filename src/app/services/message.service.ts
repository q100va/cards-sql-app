import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientLoggerService } from './client-logger.service';
import { MessageService } from 'primeng/api';
import { sanitizeText } from '../utils/sanitize-text';
import { TranslateService } from '@ngx-translate/core';
import { MonoTypeOperatorFunction, tap } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';
import { ValidationError } from '../utils/validate-response';
import { CustomError } from '../shared/upload-file/custom-error';
import { errorRecord, hasErrorDiagnostic, markErrorDiagnostic } from '../utils/error-diagnostics';
import { diagnosticPath } from '../utils/http-diagnostics';

type Severity = 'info' | 'warn' | 'error' | 'success';

export interface LogContext {
  source?: string;
  stage?: string;
  route?: string;
  correlationId?: string | null;
  [k: string]: unknown;
}

const messageParams = {
  info: { summary: 'TOAST.INFO', sticky: false },
  warn: { summary: 'TOAST.WARN', sticky: true },
  error: { summary: 'TOAST.ERROR', sticky: true },
  success: { summary: 'TOAST.SUCCESS', sticky: false },
};

@Injectable({ providedIn: 'root' })
export class MessageWrapperService {
  constructor(
    private messageService: MessageService,
    private logService: ClientLoggerService,
    private translateService: TranslateService
  ) {}

  info(code: string, ctx?: LogContext, params?: Record<string, unknown>) {
    this.notify('info', code, ctx, params);
  }
  warn(code: string, ctx?: LogContext, params?: Record<string, unknown>) {
    this.notify('warn', code, ctx, params);
  }
  error(code: string, ctx?: LogContext, params?: Record<string, unknown>) {
    this.notify('error', code, ctx, params);
  }
  success(code: string, ctx?: LogContext, params?: Record<string, unknown>) {
    this.notify('success', code, ctx, params);
  }

  messageTap<T>(
    severity: Severity,
    ctx?: LogContext | ((res: ApiResponse<T>) => LogContext),
    params?:
      | Record<string, unknown>
      | ((res: ApiResponse<T>) => Record<string, unknown>)
  ): MonoTypeOperatorFunction<ApiResponse<T>> {
    return tap((res) => {
      const code = res?.code;
      if (!code) return;
      const c = typeof ctx === 'function' ? ctx(res) : ctx;
      const p = typeof params === 'function' ? params(res) : params;
      this.notify(severity, code, c, p);
    });
  }

  handle(err: unknown, ctx: LogContext = {}, severityHint: Severity = 'error') {
    const parsed = this.parseError(err);
    const mergedCtx: LogContext = {
      ...ctx,
      route: parsed.route ?? ctx.route,
      correlationId: parsed.correlationId ?? ctx.correlationId ?? null,
      status: parsed.status,
      code: parsed.code,
      isHttp: parsed.isHttp,
    };

    const severity: Severity = parsed.isHttp
      ? parsed.status && parsed.status < 500
        ? 'warn'
        : 'error'
      : severityHint;
    const params = parsed.data;
    // Intercepted failures already have a diagnostic; notifications must not record them again.
    if (!hasErrorDiagnostic(err)) {
      if (severity === 'warn') this.logService.warn(parsed.devMessage, mergedCtx);
      else this.logService.error(parsed.devMessage, mergedCtx);
      markErrorDiagnostic(err);
    }

    const msg = parsed.code
      ? this.translateService.instant(parsed.code, params)
      : this.fallbackUserMessage(parsed.status);
    this.showToast(severity, msg, mergedCtx.correlationId);
  }

  private notify(
    severity: Severity,
    code: string,
    ctx?: LogContext,
    params?: Record<string, unknown>
  ) {
    if (!code) return;

    if (severity === 'warn') this.logService.warn(code, ctx ?? {});
    if (severity === 'error') this.logService.error(code, ctx ?? {});
    const text = this.translateService.instant(code, params);
    this.showToast(severity, text, ctx?.correlationId ?? null);
  }

  private parseError(err: unknown): {
    isHttp: boolean;
    status?: number;
    code?: string;
    devMessage: string;
    correlationId?: string | null;
    route?: string;
    data?: Record<string, unknown>;
  } {
    if (err instanceof ValidationError) {
      return {
        isHttp: false,
        code: err.code,
        status: err.status,
        devMessage: err.message ?? err.code,
      };
    }

    if (err instanceof CustomError) {
      const data: unknown = err.data;
      return {
        isHttp: false,
        code: err.code,
        status: err.status,
        devMessage: err.message ?? err.code,
        data: data == null ? undefined : errorRecord(data),
      };
    }
    if (err instanceof HttpErrorResponse) {
      const status = err.status;
      const body = errorRecord(err.error);
      const code = (typeof body['code'] === 'string' && body['code']) || undefined;
      const correlationId = typeof body['correlationId'] === 'string'
        ? body['correlationId'] : err.headers.get('X-Request-Id');
      const route = err.url ? diagnosticPath(err.url) : undefined;
      const data = body['data'];
      const dev = `HTTP ${status} ${route ?? ''}${code ? ` — ${code}` : ''}`;

      return {
        isHttp: true,
        status,
        code,
        correlationId,
        route,
        devMessage: dev,
        data: data == null ? undefined : errorRecord(data),
      };
    }

    const msg = (typeof err === 'string' && err) || errorRecord(err)['message'] || 'Unknown error';
    return {
      isHttp: false,
      devMessage: String(msg),
    };
  }

  private fallbackUserMessage(status?: number): string {
    if (!status) return this.translateService.instant('ERRORS.UNKNOWN');
    if (status === 400)
      return this.translateService.instant('ERRORS.BAD_REQUEST');
    if (status === 401)
      return this.translateService.instant('ERRORS.UNAUTHORIZED');
    if (status === 403)
      return this.translateService.instant('ERRORS.FORBIDDEN');
    if (status === 404)
      return this.translateService.instant('ERRORS.NOT_FOUND');
    if (status >= 500) return this.translateService.instant('ERRORS.SERVER');
    return this.translateService.instant('ERRORS.UNKNOWN');
  }

  private showToast(severity: Severity, msg: string, corrId?: string | null) {
    const safeMsg = sanitizeText(msg);
    const safeTail = corrId ? ` (ID: ${sanitizeText(corrId)})` : '';
    this.messageService.add({
      severity,
      summary: this.translateService.instant(messageParams[severity].summary),
      detail: safeMsg + safeTail,
      sticky: messageParams[severity].sticky,
    });
  }
}
