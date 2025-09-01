import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ClientLoggerService } from './client-logger.service';

describe('ClientLoggerService', () => {
  let svc: ClientLoggerService;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClientLoggerService, provideHttpClient(), provideHttpClientTesting()],
    });

    svc = TestBed.inject(ClientLoggerService);
    httpCtrl = TestBed.inject(HttpTestingController);

    // отключаем sendBeacon, чтобы пошёл обычный POST
    (navigator as any).sendBeacon = undefined;

    // фиксируем состояние, чтобы не мешали интервалы/буферы
    (svc as any).sessionId = 'sess-123';
    (svc as any).maxBuffer = 1000;         // не автосбрасывать по размеру
    (svc as any).buf = [];
    (svc as any).sentInWindow = 0;
    (svc as any).windowStart = Date.now();
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  function expectOnePost() {
    const req = httpCtrl.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/client-logs'));
    expect(req.request.method).toBe('POST');
    return req;
  }

  it('buffers warn/error and flushes in one batch', () => {
    svc.warn('hello', { page: '/x' });
    svc.error(new Error('boom'));

    (svc as any).flush();

    const req = expectOnePost();
    const body = req.request.body;
    expect(Array.isArray(body.items)).toBeTrue();
    expect(body.items.length).toBe(2);
    expect(body.items.map((i: any) => i.level)).toEqual(['warn', 'error']);

    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('applies simple rate limit in the same minute window', () => {
    // 1) отправили ~60 и подтвердили
    for (let i = 0; i < 60; i++) svc.warn('msg');
    (svc as any).flush();

    const req1 = expectOnePost();
    req1.flush(null, { status: 204, statusText: 'No Content' });

    // 2) в том же окне — должно дропнуть и не слать
    for (let i = 0; i < 10; i++) svc.warn('extra');
    (svc as any).flush();

    httpCtrl.expectNone(r => r.method === 'POST' && r.url.endsWith('/api/client-logs'));

    // 3) сдвигаем окно и снова шлём
    (svc as any).windowStart = Date.now() - 61_000;
    svc.warn('after-window');
    (svc as any).flush();

    const req2 = expectOnePost();
    req2.flush(null, { status: 204, statusText: 'No Content' });
  });

it('captures window "error" and "unhandledrejection" events', () => {
  // 0) Ensure we POST via HttpClient (no beacon)
  (navigator as any).sendBeacon = undefined;

  // 1) Swallow global errors so Karma/Zone won’t mark the test as failed
  const stop = (e: any) => e.preventDefault?.();
  window.addEventListener('error', stop, { capture: true });
  window.addEventListener('unhandledrejection', stop as any, { capture: true });

  const origOnError = window.onerror;
  const origOnUR = (window as any).onunhandledrejection;
  window.onerror = () => true;                       // returning true prevents default
  (window as any).onunhandledrejection = () => true; // same for unhandled rejections

  // 2) Dispatch cancelable events AFTER service is constructed
  // (svc создан в beforeEach через TestBed.inject)
  const errEv = new ErrorEvent('error', {
    message: 'Script blew up',
    filename: 'x.js',
    lineno: 1,
    colno: 2,
    cancelable: true,
  });
  window.dispatchEvent(errEv);

  let urEv: Event;
  try {
    // In some runners PromiseRejectionEvent exists
    // @ts-ignore
    urEv = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('nope'),
      cancelable: true,
    });
  } catch {
    const e: any = new Event('unhandledrejection', { cancelable: true });
    e.reason = new Error('nope');
    urEv = e;
  }
  window.dispatchEvent(urEv);

  // 3) Force send
  (svc as any).flush();

  // 4) Expect exactly one POST
  const req = httpCtrl.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/client-logs'));
  const body = req.request.body;
  const msgs = body.items.map((i: any) => i.message).join(' | ');
  expect(msgs).toContain('Script blew up');
  expect(msgs).toContain('nope');
  req.flush(null, { status: 204, statusText: 'No Content' });

  // 5) Cleanup listeners so other tests aren’t affected
  window.removeEventListener('error', stop, { capture: true } as any);
  window.removeEventListener('unhandledrejection', stop as any, { capture: true } as any);
  window.onerror = origOnError;
  (window as any).onunhandledrejection = origOnUR;
});

  it('masks PII in messages', () => {
    svc.error('reach me at john.doe@example.com or +12345678901');
    (svc as any).flush();

    const req = expectOnePost();
    const msg: string = req.request.body.items[0].message;
    expect(msg).toMatch(/\bj\*\*\*@example\.com\b/i);
    expect(msg).toMatch(/\*{3}/);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
