// src/app/services/message.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientLoggerService } from './client-logger.service';
import { MessageService } from 'primeng/api';
import { sanitizeText } from '../utils/sanitize-text';
import { TranslateService } from '@ngx-translate/core';
import { MonoTypeOperatorFunction, of, tap } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';
import { ValidationError } from '../utils/validate-response';

type Severity = 'info' | 'warn' | 'error' | 'success';

export interface LogContext {
  source?: string; // откуда вызвали (компонент/сервис)
  stage?: string; // этап (submit, load, etc)
  route?: string; // url/endpoint
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

  // Публичные шорткаты
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

  private resolve<T, R>(
    val: R | ((resp: ApiResponse<T>) => R),
    resp: ApiResponse<T>
  ): R | undefined {
    return typeof val === 'function' ? (val as any)(resp) : val;
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
      const c = this.resolve(ctx, res);
      const p = this.resolve(params, res);
      this.notify(severity, code, c, p);
    });
  }

  /**
   * Универсальный обработчик ошибок, вызывай из subscribe(error) и catchError().
   * Он:
   *  1) Пытается извлечь user-friendly сообщение;
   *  2) Достаёт correlationId (если есть);
   *  3) Пишет лог (warn|error) с контекстом (без PII);
   *  4) Показывает тост пользователю.
   */
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

    // Лог: http 4xx можно писать как warn, 5xx — error; иначе — по hint.
    const severity: Severity = parsed.isHttp
      ? parsed.status && parsed.status < 500
        ? 'warn'
        : 'error'
      : severityHint;

    if (severity === 'warn') this.logService.warn(parsed.devMessage, mergedCtx);
    else this.logService.error(parsed.devMessage, mergedCtx);

    // Тост: короткое понятное сообщение
    const msg = parsed.code
      ? this.translateService.instant(parsed.code)
      : this.fallbackUserMessage(parsed.status);
    this.showToast(severity, msg, mergedCtx.correlationId);
  }

  // --- Внутреннее ------------------------------------------------------------

  private notify(
    severity: Severity,
    code: string,
    ctx?: LogContext,
    params?: Record<string, unknown>
  ) {
    if (!code) return;

    // Пишем в логи (для warn/error), info можно не слать
    if (severity === 'warn') this.logService.warn(code, ctx ?? {});
    if (severity === 'error') this.logService.error(code, ctx ?? {});
    // Тост
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
  } {
    if (err instanceof ValidationError) {
      return {
        isHttp: false,
        code: err.code,
        status: err.status,
        devMessage: err.message ?? err.code,
      };
    }
    // HTTP-ошибка
    if (err instanceof HttpErrorResponse) {
      const status = err.status;
      const body = (err.error ?? {}) as any;

      // сервер, как мы договорились, присылает:
      // { message, code, correlationId }
      const code = (typeof body?.code === 'string' && body.code) || undefined;
      const correlationId =
        body?.correlationId ?? err.headers?.get?.('X-Request-Id') ?? null;
      const route = err.url ?? undefined;
      const dev = `HTTP ${status} ${route ?? ''}${code ? ` — ${code}` : ''}`;

      return {
        isHttp: true,
        status,
        code,
        correlationId,
        route,
        devMessage: dev,
      };
    }

    // Строка/обычный Error/что-то ещё
    const msg =
      (typeof err === 'string' && err) ||
      ((err as any)?.message as string) ||
      'Unknown error';
    return {
      isHttp: false,
      devMessage: msg,
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
