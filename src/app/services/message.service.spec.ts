import { MessageWrapperService } from './message.service';
import { ClientLoggerService } from './client-logger.service';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ValidationError } from '../utils/validate-response';

class EmptyLoader implements TranslateLoader {
  getTranslation(_: string) { return of({}); }
}

describe('MessageWrapperService', () => {
  let svc: MessageWrapperService;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let loggerSpy: jasmine.SpyObj<ClientLoggerService>;

  beforeEach(() => {
    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add', 'clear']);
    loggerSpy = jasmine.createSpyObj<ClientLoggerService>('ClientLoggerService', ['warn', 'error']);

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        MessageWrapperService,
        { provide: MessageService, useValue: messageSpy },
        { provide: ClientLoggerService, useValue: loggerSpy },
      ],
    });

    svc = TestBed.inject(MessageWrapperService);
  });

  // notify(): прямые вызовы
  it('info(): shows toast, does NOT log to backend', () => {
    svc.info('Hello');

    expect(loggerSpy.warn).not.toHaveBeenCalled();
    expect(loggerSpy.error).not.toHaveBeenCalled();

    expect(messageSpy.add).toHaveBeenCalledTimes(1);
    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('info');
    expect(payload.summary).toBe('TOAST.INFO'); // ключ остаётся ключом
    expect(payload.sticky).toBe(false);
    expect(String(payload.detail)).toContain('Hello'); // т.к. нет перевода, вернётся сам ключ/строка
  });

  it('warn(): logs warn + shows sticky toast', () => {
    svc.warn('Be careful', { source: 'CompA' });

    expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
    expect(loggerSpy.warn.calls.mostRecent().args[0]).toBe('Be careful');
    expect(loggerSpy.warn.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ source: 'CompA' }),
    );

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('warn');
    expect(payload.summary).toBe('TOAST.WARN');
    expect(payload.sticky).toBe(true);
    expect(String(payload.detail)).toContain('Be careful');
  });

  it('error(): logs error + shows sticky toast', () => {
    svc.error('Boom!', { stage: 'submit' });

    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    expect(loggerSpy.error.calls.mostRecent().args[0]).toBe('Boom!');
    expect(loggerSpy.error.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ stage: 'submit' }),
    );

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    expect(payload.summary).toBe('TOAST.ERROR');
    expect(payload.sticky).toBe(true);
    expect(String(payload.detail)).toContain('Boom!');
  });

  it('success(): shows non-sticky toast, no backend log', () => {
    svc.success('Saved');

    expect(loggerSpy.warn).not.toHaveBeenCalled();
    expect(loggerSpy.error).not.toHaveBeenCalled();

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('success');
    expect(payload.summary).toBe('TOAST.SUCCESS');
    expect(payload.sticky).toBe(false);
    expect(String(payload.detail)).toContain('Saved');
  });

  // handle(): HTTP ошибки
  it('handle(): HTTP 404 -> warn log, uses server code and corrId from body', () => {
    const err = new HttpErrorResponse({
      status: 404,
      url: '/api/roles/1',
      error: { code: 'ERRORS.NOT_FOUND', correlationId: 'cid-body-1' },
    });

    svc.handle(err, { source: 'RoleView' });

    expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
    const [devMsg, ctx] = loggerSpy.warn.calls.mostRecent().args;
    expect(devMsg).toContain('HTTP 404');
    expect(devMsg).toContain('/api/roles/1');
    expect((ctx as any).correlationId).toBe('cid-body-1');

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('warn');
    expect(String(payload.detail)).toContain('ERRORS.NOT_FOUND'); // ключ как текст
    expect(String(payload.detail)).toContain('cid-body-1');
  });

  it('handle(): HTTP 500 -> error log, fallback key, corrId from header', () => {
    const headers = new HttpHeaders({ 'X-Request-Id': 'hdr-xyz' });
    const err = new HttpErrorResponse({
      status: 500,
      url: '/api/roles',
      error: {},
      headers,
    });

    svc.handle(err, { stage: 'load' });

    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    const [devMsg, ctx] = loggerSpy.error.calls.mostRecent().args;
    expect(devMsg).toContain('HTTP 500');
    expect((ctx as any).correlationId).toBe('hdr-xyz');

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    expect(String(payload.detail)).toContain('ERRORS.SERVER');
    expect(String(payload.detail)).toContain('hdr-xyz');
  });

  it('handle(): non-HTTP generic Error -> error log + generic i18n key', () => {
    svc.handle(new Error('Oops'), { source: 'CompB' });

    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    expect(loggerSpy.warn).not.toHaveBeenCalled();

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    expect(String(payload.detail)).toContain('ERRORS.UNKNOWN');
  });

  it('handle(): takes corrId from ctx if not present in error', () => {
    const err = new HttpErrorResponse({
      status: 400,
      url: '/api/x',
      error: { code: 'ERRORS.BAD_REQUEST' },
    });

    svc.handle(err, { correlationId: 'ctx-123' });

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(String(payload.detail)).toContain('ctx-123');
    expect(loggerSpy.warn).toHaveBeenCalled();
  });

  // NEW: ValidationError → используем код ошибки, non-HTTP ветка
  it('handle(): ValidationError -> error log (by default) + toast with code', () => {
    const err = new ValidationError('ERRORS.INVALID_SCHEMA');

    svc.handle(err, { source: 'Validator' });

    // non-HTTP → по умолчанию error (т.к. severityHint по умолчанию 'error')
    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    const [devMsg] = loggerSpy.error.calls.mostRecent().args;
    expect(devMsg).toContain('ERRORS.INVALID_SCHEMA');

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    expect(String(payload.detail)).toContain('ERRORS.INVALID_SCHEMA');
  });
});
