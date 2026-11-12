import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ClientLogBatch, ClientLogItem, ClientLogLevel } from '../interfaces/client-log';
import { environment } from '../../environments/environment';
import { CLIENT_LOG_TRANSPORT, diagnosticPath } from '../utils/http-diagnostics';
import { errorRecord } from '../utils/error-diagnostics';

function uuid(): string {
  const c = crypto?.getRandomValues?.(new Uint8Array(16));
  if (!c) return Math.random().toString(36).slice(2) + Date.now();
  c[6] = (c[6] & 0x0f) | 0x40;
  c[8] = (c[8] & 0x3f) | 0x80;
  const h = Array.from(c, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

@Injectable({ providedIn: 'root' })
export class ClientLoggerService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly originalWarn = console.warn;
  private readonly originalError = console.error;
  private readonly transportSubscriptions = new Subscription();
  private readonly flushTimer: ReturnType<typeof setInterval>;
  private destroyed = false;

  private readonly endpoint = `${environment.apiUrl}/api/client-logs`;
  private readonly app = 'cards-sql-app';
  private readonly env = environment.production ? 'production' : 'development';

  private readonly sessionId = this.restoreSessionId();
  private userId: string | number | null = null;

  private buf: ClientLogItem[] = [];
  private readonly maxBuffer = 20;
  private readonly flushIntervalMs = 10_000;
  private readonly maxPerMinute = 60;
  private acceptedInWindow = 0;
  private windowStart = Date.now();

  constructor() {
    console.warn = this.consoleWarn;
    console.error = this.consoleError;
    window.addEventListener('error', this.onWindowError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  ngOnDestroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // Release owned hooks so TestBed and app reinitialization cannot stack logger instances.
    clearInterval(this.flushTimer);
    window.removeEventListener('error', this.onWindowError);
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (console.warn === this.consoleWarn) console.warn = this.originalWarn;
    if (console.error === this.consoleError) console.error = this.originalError;
    this.transportSubscriptions.unsubscribe();
    this.buf = [];
  }

  setUser(id: string | number | null): void {
    this.userId = id ?? null;
  }

  writeErrorToConsole(error: unknown): void {
    // Output-only diagnostics still need a privacy boundary for HTTP bodies and arbitrary objects.
    if (error instanceof HttpErrorResponse) {
      const body = errorRecord(error.error);
      this.originalError.call(console, 'HTTP request failed.', {
        stage: 'global-error', status: error.status,
        endpoint: error.url ? diagnosticPath(error.url) : undefined,
        code: typeof body['code'] === 'string' ? body['code'] : undefined,
        correlationId: error.headers.get('X-Request-Id')
          || (typeof body['correlationId'] === 'string' ? body['correlationId'] : null),
      });
    } else if (error instanceof Error) {
      this.originalError.call(console, error);
    } else {
      this.originalError.call(console, 'Uncaught application error.', { code: 'ERRORS.UNKNOWN', stage: 'global-error' });
    }
  }

  warn(message: unknown, context?: Record<string, unknown>): void {
    this.push('warn', message, context);
  }

  error(err: unknown, context?: Record<string, unknown>): void {
    const details = errorRecord(err);
    const message =
      typeof err === 'string'
        ? err
        : (errorRecord(details['error'])['message'] ?? details['message'] ?? 'Client error');
    const stack = typeof details['stack'] === 'string' ? details['stack'] : undefined;
    this.push('error', message, context, stack);
  }

  private push(
    level: ClientLogLevel,
    message: unknown,
    context?: Record<string, unknown>,
    stack?: string,
  ): void {
    if (this.destroyed || !message) return;

    const now = Date.now();

    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.acceptedInWindow = 0;
    }

    if (this.acceptedInWindow >= this.maxPerMinute) {
      return;
    }

    const contextCopy = context ? { ...context } : undefined;

    const corrIdValue = contextCopy?.['correlationId'] ?? contextCopy?.['corrId'];
    const corrId = typeof corrIdValue === 'string' && corrIdValue.trim() ? corrIdValue : null;

    if (contextCopy) {
      delete contextCopy['correlationId'];
      delete contextCopy['corrId'];
    }

    const item: ClientLogItem = {
      ts: new Date().toISOString(),
      level,
      message: this.maskPII(String(message)),
      stack: stack ? this.maskPII(stack) : undefined,
      pageUrl: `${location.origin}${location.pathname}`,
      route: location.pathname,
      userId: this.userId ?? null,
      sessionId: this.sessionId,
      corrId,
      userAgent: navigator.userAgent,
      context:
        contextCopy && Object.keys(contextCopy).length > 0
          ? this.maskCtx(contextCopy)
          : undefined,
    };

    this.buf.push(item);
    this.acceptedInWindow += 1;

    if (this.buf.length >= this.maxBuffer) {
      this.flush();
    }
  }

  private flush(useBeacon = false): void {
    if (this.destroyed || this.buf.length === 0) return;

    const batch: ClientLogBatch = {
      app: this.app,
      env: this.env,
      items: this.buf.splice(0, this.maxBuffer),
    };

    if (useBeacon && navigator.sendBeacon) {
      try {
        const ok = navigator.sendBeacon(
          this.endpoint,
          new Blob([JSON.stringify(batch)], { type: 'application/json' }),
        );

        if (ok) return;
      } catch {
        // Fall back to HttpClient below.
      }
    }

    // Log transport bypasses HTTP diagnostics and auth recovery to prevent recursive logging.
    this.transportSubscriptions.add(this.http.post(this.endpoint, batch, {
      context: new HttpContext().set(CLIENT_LOG_TRANSPORT, true),
    }).subscribe({
      error: () => {
        // Logging failures must not affect the application.
      },
    }));
  }

  private restoreSessionId(): string {
    const key = 'client_session_id';
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id = uuid();
      localStorage.setItem(key, id);
      return id;
    } catch {
      return uuid();
    }
  }

  private readonly consoleWarn = (...args: unknown[]): void => {
    this.originalWarn.apply(console, args);
    if (!this.destroyed) this.warn(this.joinArgs(args));
  };

  private readonly consoleError = (...args: unknown[]): void => {
    this.originalError.apply(console, args);
    if (this.destroyed) return;
    const [first] = args;
    this.error(first instanceof Error ? first : this.joinArgs(args));
  };

  private readonly onWindowError = (event: ErrorEvent): void => {
    this.error(event.error || event.message || 'window.onerror', {
      lineno: event.lineno, colno: event.colno, filename: event.filename,
    });
  };

  private readonly onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const reason: unknown = event.reason;
    this.error(reason instanceof Error ? reason : String(reason ?? 'unhandledrejection'), {
      from: 'unhandledrejection',
    });
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') this.flush(true);
  };

  private joinArgs(args: unknown[]): string {
    return args
      .map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === 'object') {
          try {
            return JSON.stringify(this.maskCtx(a));
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');
  }

  private maskPII(s: string): string {
    const email =
      /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
    const phone = /\b(\+?\d{1,3}[-.\s]?)?(\d{2,3}[-.\s]?){2,4}\d\b/g;
    return s
      .replace(email, (_: string, a: string, domain: string) => `${a}***@${domain}`)
      .replace(phone, (m: string) =>
        m.length <= 6 ? '***' : m.slice(0, 3) + '***' + m.slice(-2),
      );
  }

  private maskCtx(obj: unknown): Record<string, unknown> {
    const secretKeys = ['password', 'token', 'authorization', 'cookie'];

    const seen = new WeakSet<object>();

    const maskValue = (value: unknown, key = ''): unknown => {
      const normalizedKey = key.toLowerCase();

      if (secretKeys.some((secretKey) => normalizedKey.includes(secretKey))) {
        return '[REDACTED]';
      }

      if (typeof value === 'string') {
        return this.maskPII(value);
      }

      if (Array.isArray(value)) {
        return value.map((item) => maskValue(item));
      }

      if (value !== null && typeof value === 'object') {
        if (seen.has(value)) {
          return '[Circular]';
        }

        seen.add(value);

        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(
            ([nestedKey, nestedValue]) => [
              nestedKey,
              maskValue(nestedValue, nestedKey),
            ],
          ),
        );
      }

      return value;
    };

    return maskValue(obj) as Record<string, unknown>;
  }
}
