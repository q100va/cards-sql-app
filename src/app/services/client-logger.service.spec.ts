import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ClientLoggerService } from './client-logger.service';
import { ClientLogBatch } from '../interfaces/client-log';
import { ClientLoggerTestHarness } from '../testing/client-logger-test-harness';

describe('ClientLoggerService', () => {
  let svc: ClientLoggerService;
  let httpCtrl: HttpTestingController;
  let hooks: ClientLoggerTestHarness;

  beforeEach(() => {
    hooks = new ClientLoggerTestHarness();
    TestBed.configureTestingModule({
      providers: [ClientLoggerService, provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(ClientLoggerService);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpCtrl.verify();
    } finally {
      TestBed.resetTestingModule();
      hooks.restore();
    }
  });

  function expectOnePost() {
    const req = httpCtrl.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/client-logs'));
    expect(req.request.method).toBe('POST');
    return req;
  }

  function flushBatch(): ClientLogBatch {
    hooks.flushInterval();
    const req = expectOnePost();
    const batch = req.request.body as ClientLogBatch;
    req.flush(null, { status: 204, statusText: 'No Content' });
    return batch;
  }

  it('buffers warn/error and flushes in one batch', () => {
    svc.warn('hello', { page: '/x' });
    svc.error(new Error('boom'));
    const body = flushBatch();
    expect(Array.isArray(body.items)).toBeTrue();
    expect(body.items.length).toBe(2);
    expect(body.items.map(i => i.level)).toEqual(['warn', 'error']);
  });

  it('applies simple rate limit in the same minute window', () => {
    for (let i = 0; i < 60; i++) svc.warn('msg');
    const requests = httpCtrl.match(r => r.url.endsWith('/api/client-logs'));
    const batches = requests.map(req => req.request.body as ClientLogBatch);
    expect(batches.flatMap(batch => batch.items).length).toBe(60);
    for (const req of requests) req.flush(null, { status: 204, statusText: 'No Content' });

    for (let i = 0; i < 10; i++) svc.warn('extra');
    hooks.flushInterval();
    httpCtrl.expectNone(r => r.url.endsWith('/api/client-logs'));

    const afterWindow = Date.now() + 61_000;
    spyOn(Date, 'now').and.returnValue(afterWindow);
    svc.warn('after-window');
    expect(flushBatch().items.map(item => item.message)).toEqual(['after-window']);
  });

  it('captures window "error" and "unhandledrejection" events', () => {
    // Invoke the registered listeners without sending synthetic uncaught errors to Karma.
    hooks.deliverWindowEvent(new ErrorEvent('error', {
      message: 'Script blew up', filename: 'x.js', lineno: 1, colno: 2,
    }));
    hooks.deliverWindowEvent(new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(), reason: new Error('nope'),
    }));
    const messages = flushBatch().items.map(item => item.message).join(' | ');
    expect(messages).toContain('Script blew up');
    expect(messages).toContain('nope');
  });

  it('masks PII in messages', () => {
    svc.error('reach me at john.doe@example.com or +12345678901');
    const message = flushBatch().items[0].message;
    expect(message).toMatch(/\bj\*\*\*@example\.com\b/i);
    expect(message).toMatch(/\*{3}/);
  });

  it('redacts nested secrets and secrets in arrays without mutating caller context', () => {
    const context = {
      profile: { password: 'private-password', accessToken: 'private-token' },
      contacts: [{ authorization: 'Bearer private-auth', cookie: 'private-cookie', label: 'billing' }],
    };
    svc.warn('Nested context', context);
    expect(flushBatch().items[0].context).toEqual({
      profile: { password: '[REDACTED]', accessToken: '[REDACTED]' },
      contacts: [{ authorization: '[REDACTED]', cookie: '[REDACTED]', label: 'billing' }],
    });
    expect(context.profile.password).toBe('private-password');
    expect(context.contacts[0].authorization).toBe('Bearer private-auth');
  });

  it('serializes circular object context without throwing', () => {
    const node: Record<string, unknown> = { label: 'root' };
    node['self'] = node;
    expect(() => svc.warn('Circular context', { node })).not.toThrow();
    expect(flushBatch().items[0].context).toEqual({ node: { label: 'root', self: '[Circular]' } });
  });

  it('preserves an Error message and stack while masking personal information', () => {
    const error = new Error('Contact alice@example.com');
    error.stack = 'Error: Contact alice@example.com\n    at save (app.ts:1:1)';
    svc.error(error);
    const item = flushBatch().items[0];
    expect(item.message).toBe('Contact a***@example.com');
    expect(item.stack).toContain('at save (app.ts:1:1)');
    expect(item.stack).not.toContain('alice@example.com');
  });

  it('detaches global listeners on destruction before registering one set on recreation', () => {
    for (const type of ['error', 'unhandledrejection', 'visibilitychange'] as const) {
      expect(hooks.activeListeners(type)).withContext('initial ' + type).toBe(1);
    }
    TestBed.resetTestingModule();
    for (const type of ['error', 'unhandledrejection', 'visibilitychange'] as const) {
      expect(hooks.activeListeners(type)).withContext('destroyed ' + type).toBe(0);
    }
    TestBed.configureTestingModule({ providers: [ClientLoggerService, provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ClientLoggerService);
    for (const type of ['error', 'unhandledrejection', 'visibilitychange'] as const) {
      expect(hooks.activeListeners(type)).withContext('recreated ' + type).toBe(1);
    }
  });

  it('stops scheduled flushing when the service is destroyed', () => {
    const post = spyOn(TestBed.inject(HttpClient), 'post').and.callThrough();
    svc.warn('Pending before destruction');
    TestBed.resetTestingModule();
    // A destructor may flush pending logs once, but must not leave recurring work alive.
    for (const req of httpCtrl.match(r => r.url.endsWith('/api/client-logs'))) {
      req.flush(null, { status: 204, statusText: 'No Content' });
    }
    post.calls.reset();
    expect(() => hooks.flushInterval()).not.toThrow();
    expect(post).withContext('scheduled work must be stopped or detached').not.toHaveBeenCalled();
    const requests = httpCtrl.match(r => r.url.endsWith('/api/client-logs'));
    expect(requests.length).withContext('no scheduled transport after destruction').toBe(0);
    for (const req of requests) req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('detaches console capture on destruction and does not stack wrappers across recreation', () => {
    const destroyedError = spyOn(svc, 'error').and.callThrough();
    const destroyedWarn = spyOn(svc, 'warn').and.callThrough();
    TestBed.resetTestingModule();
    console.error('After logger destruction');
    console.warn('After logger destruction');
    expect(destroyedError).not.toHaveBeenCalled();
    expect(destroyedWarn).not.toHaveBeenCalled();
    TestBed.configureTestingModule({ providers: [ClientLoggerService, provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(ClientLoggerService);
    const recreatedHttp = TestBed.inject(HttpTestingController);
    console.error('After logger recreation');
    hooks.flushInterval();
    const oldRequests = httpCtrl.match(r => r.url.endsWith('/api/client-logs'));
    expect(oldRequests.length).withContext('destroyed logger must not record console output').toBe(0);
    for (const req of oldRequests) req.flush(null, { status: 204, statusText: 'No Content' });
    const req = recreatedHttp.expectOne(r => r.url.endsWith('/api/client-logs'));
    expect((req.request.body as ClientLogBatch).items.map(item => item.message)).toEqual(['After logger recreation']);
    req.flush(null, { status: 204, statusText: 'No Content' });
    recreatedHttp.verify();
    expect(destroyedError).withContext('a recreated logger must not forward to the destroyed instance').not.toHaveBeenCalled();
    expect(hooks.error).toHaveBeenCalledTimes(2);
  });
});
