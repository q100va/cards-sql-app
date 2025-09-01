import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ClientLogBatch, ClientLogItem, ClientLogLevel } from '../interfaces/client-log';

function uuid(): string {
  const c = crypto?.getRandomValues?.(new Uint8Array(16));
  if (!c) return Math.random().toString(36).slice(2) + Date.now();
  c[6] = (c[6] & 0x0f) | 0x40;
  c[8] = (c[8] & 0x3f) | 0x80;
  const h = Array.from(c, b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

@Injectable({ providedIn: 'root' })
export class ClientLoggerService {
  private http = inject(HttpClient);

  private readonly endpoint = `${environment.apiUrl}/api/client-logs`;
  private readonly app = 'cards-sql-app';
  private readonly env = environment.production ? 'production' : 'development';

  private readonly sessionId = this.restoreSessionId();
  private userId: string | number | null = null;

  private buf: ClientLogItem[] = [];
  private readonly maxBuffer = 20;
  private readonly flushIntervalMs = 10_000;
  private readonly maxPerMinute = 60;
  private sentInWindow = 0;
  private windowStart = Date.now();

  constructor() {
    this.patchConsole();
    this.patchGlobalHandlers();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });
    setInterval(() => this.flush(), this.flushIntervalMs);
  }

  setUser(id: string | number | null) {
    this.userId = id ?? null;
  }

  warn(message: any, context?: Record<string, unknown>) {
    this.push('warn', message, context);
  }

  error(err: any, context?: Record<string, unknown>) {
    // err: Error | string | unknown
    const message = typeof err === 'string' ? err : (err?.error?.message ?? err?.message ?? 'Client error');
    const stack = typeof err?.stack === 'string' ? err.stack : undefined;
    this.push('error', message, { ...context, stack });
  }

  attachCorrId(id?: string | null) {
    // Можно подмешивать corrId в следующий элемент через context — но лучше указывать при отправке события
    // Оставим метод на случай ручной привязки
  }

  // ---- internals ------------------------------------------------------------

  private push(level: ClientLogLevel, message: any, extra?: Record<string, unknown>) {
    if (!message) return;

    // rate-limit
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.sentInWindow = 0;
    }
    if (this.sentInWindow >= this.maxPerMinute) return;

    const item: ClientLogItem = {
      ts: new Date().toISOString(),
      level,
      message: this.maskPII(String(message)),
      stack: typeof extra?.['stack'] === 'string' ? this.maskPII(extra['stack'] as string) : undefined,
      pageUrl: location?.href,
      route: location?.pathname,
      userId: this.userId ?? null,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      context: extra ? this.maskCtx(extra) : undefined,
    };
    this.buf.push(item);
    if (this.buf.length >= this.maxBuffer) this.flush();
  }

  private flush(useBeacon = false) {
    if (this.buf.length === 0) return;

    const batch: ClientLogBatch = {
      app: this.app,
      env: this.env,
      items: this.buf.splice(0, this.maxBuffer),
    };
    // sendBeacon
    if (useBeacon && navigator.sendBeacon) {
      try {
        const ok = navigator.sendBeacon(this.endpoint, new Blob([JSON.stringify(batch)], { type: 'application/json' }));
        if (ok) { this.sentInWindow += batch.items.length; return; }
      } catch { /* fallback ниже */ }
    }
    this.http.post(this.endpoint, batch).subscribe({
      next: () => { this.sentInWindow += batch.items.length; },
      error: () => { /* в проде можно положить обратно и попробовать позже */ }
    });
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

  // --- hooks -----------------------------------------------------------------

  private patchConsole() {
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    console.warn = (...args: any[]) => {
      origWarn(...args);
      this.warn(this.joinArgs(args));
    };
    console.error = (...args: any[]) => {
      origError(...args);
      const [first] = args;
      if (first instanceof Error) this.error(first);
      else this.error(this.joinArgs(args));
    };
  }

  private patchGlobalHandlers() {
    window.addEventListener('error', (e) => {
      this.error(e.error || e.message || 'window.onerror', {
        lineno: (e as ErrorEvent).lineno,
        colno: (e as ErrorEvent).colno,
        filename: (e as ErrorEvent).filename,
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      const r: any = e.reason;
      if (r instanceof Error) this.error(r, { from: 'unhandledrejection' });
      else this.error(String(r ?? 'unhandledrejection'), { from: 'unhandledrejection' });
    });
  }

  // --- helpers ---------------------------------------------------------------

  private joinArgs(args: any[]): string {
    return args.map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(this.maskCtx(a)); } catch { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  private maskPII(s: string): string {
    const email = /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
    const phone = /\b(\+?\d{1,3}[-.\s]?)?(\d{2,3}[-.\s]?){2,4}\d\b/g;
    return s
      .replace(email, (_, a, domain) => `${a}***@${domain}`)
      .replace(phone, (m) => m.length <= 6 ? '***' : m.slice(0, 3) + '***' + m.slice(-2));
  }
  private maskCtx(obj: Record<string, unknown>): Record<string, unknown> {
    const clone: Record<string, unknown> = Array.isArray(obj) ? { arr: obj } : { ...obj };
    const redactKeys = ['email','phone','password','token','authorization','cookie'];
    for (const k of Object.keys(clone)) {
      const v = clone[k];
      if (typeof v === 'string' && redactKeys.some(key => k.toLowerCase().includes(key))) {
        clone[k] = this.maskPII(v);
      }
    }
    return clone;
  }
}
