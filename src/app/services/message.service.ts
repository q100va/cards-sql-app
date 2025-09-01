// src/app/services/message.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ClientLoggerService } from './client-logger.service';
import { MessageService } from 'primeng/api';
import { sanitizeText } from '../utils/sanitize-text';

type Severity = 'info' | 'warn' | 'error' | 'success';

export interface LogContext {
  source?: string; // откуда вызвали (компонент/сервис)
  stage?: string; // этап (submit, load, etc)
  route?: string; // url/endpoint
  correlationId?: string | null;
  // всё, что хочешь добавлять по месту:
  [k: string]: unknown;
}

const messageParams = {
  info: { summary: 'Информация', sticky: false },
  warn: { summary: 'Предупреждение', sticky: true },
  error: { summary: 'Ошибка', sticky: true },
  success: { summary: 'Выполнено', sticky: false },
};

@Injectable({ providedIn: 'root' })
export class MessageWrapperService {
  constructor(
    private messageService: MessageService,
    private log: ClientLoggerService
  ) {}

  // Публичные шорткаты
  info(msg: string, ctx?: LogContext) {
    this.notify('info', msg, ctx);
  }
  warn(msg: string, ctx?: LogContext) {
    this.notify('warn', msg, ctx);
  }
  error(msg: string, ctx?: LogContext) {
    this.notify('error', msg, ctx);
  }
  success(msg: string) {
    this.notify('success', msg);
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
      // для диагностики без PII
      isHttp: parsed.isHttp,
    };

    // Лог: http 4xx можно писать как warn, 5xx — error; иначе — по hint.
    const severity: Severity = parsed.isHttp
      ? parsed.status && parsed.status < 500
        ? 'warn'
        : 'error'
      : severityHint;

    if (severity === 'warn') this.log.warn(parsed.devMessage, mergedCtx);
    else this.log.error(parsed.devMessage, mergedCtx);

    // Тост: короткое понятное сообщение
    const userMsg = parsed.userMessage || 'Произошла ошибка. Попробуйте позже.';
    this.showToast(severity, userMsg, mergedCtx.correlationId);
  }

  // --- Внутреннее ------------------------------------------------------------

  private notify(severity: Severity, msg: string, ctx?: LogContext) {
    // Пишем в логи (для warn/error), info можно не слать
    if (severity === 'warn') this.log.warn(msg, ctx ?? {});
    if (severity === 'error') this.log.error(msg, ctx ?? {});
    // Тост
    this.showToast(severity, msg, ctx?.correlationId ?? null);
  }

  private parseError(err: unknown): {
    isHttp: boolean;
    status?: number;
    userMessage?: string;
    devMessage: string;
    correlationId?: string | null;
    route?: string;
  } {
    // HTTP-ошибка
    if (err instanceof HttpErrorResponse) {
      const status = err.status;
      const body = (err.error ?? {}) as any;

      // сервер, как мы договорились, присылает:
      // { message, code, correlationId }
      const userMessage = body?.message || this.fallbackUserMessage(status);
      const correlationId =
        body?.correlationId ?? err.headers?.get?.('X-Request-Id') ?? null;

      const route = err.url ?? undefined;

      return {
        isHttp: true,
        status,
        userMessage,
        correlationId,
        route,
        devMessage: `HTTP ${status} ${route ?? ''} — ${userMessage}`,
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
      userMessage: 'Произошла ошибка. Попробуйте позже.',
    };
  }

  private fallbackUserMessage(status?: number): string {
    if (!status) return 'Произошла ошибка при запросе.';
    if (status === 400) return 'Неверный запрос.';
    if (status === 401) return 'Требуется авторизация.';
    if (status === 403) return 'Недостаточно прав.';
    if (status === 404) return 'Не найдено.';
    if (status >= 500) return 'Проблема на сервере. Повторите позже.';
    return 'Произошла ошибка при запросе.';
  }

  private showToast(severity: Severity, msg: string, corrId?: string | null) {
    const safeMsg = sanitizeText(msg);
    const safeTail = corrId ? ` (ID: ${sanitizeText(corrId)})` : '';
    this.messageService.add({
      severity,
      summary: messageParams[severity].summary,
      detail: safeMsg + safeTail,
      sticky: messageParams[severity].sticky,
    });
  }
}
