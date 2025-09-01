import { MessageWrapperService } from './message.service';
import { ClientLoggerService } from './client-logger.service';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

describe('MessageWrapperService', () => {
 let svc: MessageWrapperService;
  let messageSpy: jasmine.SpyObj<MessageService>;
  let loggerSpy: jasmine.SpyObj<ClientLoggerService>;

  beforeEach(() => {
    messageSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add', 'clear']);
    loggerSpy = jasmine.createSpyObj<ClientLoggerService>('ClientLoggerService', ['warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        MessageWrapperService,
        { provide: MessageService, useValue: messageSpy },
        { provide: ClientLoggerService, useValue: loggerSpy },
      ],
    });

    svc = TestBed.inject(MessageWrapperService);
  });


  // --------------------------------------------------------------------------
  // notify(): direct user calls (info/warn/error/success)
  // --------------------------------------------------------------------------

  it('info(): shows toast, does NOT log to backend', () => {
    svc.info('Hello');

    expect(loggerSpy.warn).not.toHaveBeenCalled();
    expect(loggerSpy.error).not.toHaveBeenCalled();

    expect(messageSpy.add).toHaveBeenCalledTimes(1);
    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('info');
    expect(payload.summary).toBe('Информация');
    expect(payload.sticky).toBe(false);
    expect(String(payload.detail)).toContain('Hello');
  });

  it('warn(): logs warn + shows sticky toast', () => {
    svc.warn('Be careful', { source: 'CompA' });

    expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
    expect(loggerSpy.warn.calls.mostRecent().args[0]).toBe('Be careful');
    expect(loggerSpy.warn.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ source: 'CompA' }));

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('warn');
    expect(payload.summary).toBe('Предупреждение');
    expect(payload.sticky).toBe(true);
    expect(String(payload.detail)).toContain('Be careful');
  });

  it('error(): logs error + shows sticky toast', () => {
    svc.error('Boom!', { stage: 'submit' });

    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    expect(loggerSpy.error.calls.mostRecent().args[0]).toBe('Boom!');
    expect(loggerSpy.error.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ stage: 'submit' }));

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    expect(payload.summary).toBe('Ошибка');
    expect(payload.sticky).toBe(true);
    expect(String(payload.detail)).toContain('Boom!');
  });

  it('success(): shows non-sticky toast, no backend log', () => {
    svc.success('Saved');

    expect(loggerSpy.warn).not.toHaveBeenCalled();
    expect(loggerSpy.error).not.toHaveBeenCalled();

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('success');
    expect(payload.summary).toBe('Выполнено');
    expect(payload.sticky).toBe(false);
    expect(String(payload.detail)).toContain('Saved');
  });

  // --------------------------------------------------------------------------
  // handle(): HTTP errors -> warn for 4xx, error for 5xx, toast message + corrId
  // --------------------------------------------------------------------------

  it('handle(): HTTP 404 -> warn log, shows server message and corrId from body', () => {
    const err = new HttpErrorResponse({
      status: 404,
      url: '/api/roles/1',
      error: { message: 'Не найдено', correlationId: 'cid-body-1' },
    });

    svc.handle(err, { source: 'RoleView' });

    // backend log level
    expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
    const [devMsg, ctx] = loggerSpy.warn.calls.mostRecent().args;
    expect(devMsg).toContain('HTTP 404');       // dev-oriented message
    expect(devMsg).toContain('/api/roles/1');   // includes route
    expect((ctx as any).correlationId).toBe('cid-body-1');

    // toast
    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('warn');
    expect(String(payload.detail)).toContain('Не найдено');
    expect(String(payload.detail)).toContain('cid-body-1'); // appended as (ID: ...)
  });

  it('handle(): HTTP 500 -> error log, fallback message, corrId from header', () => {
    const headers = new HttpHeaders({ 'X-Request-Id': 'hdr-xyz' });
    const err = new HttpErrorResponse({
      status: 500,
      url: '/api/roles',
      error: {}, // no message from server -> fallback
      headers,
    });

    svc.handle(err, { stage: 'load' });

    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    const [devMsg, ctx] = loggerSpy.error.calls.mostRecent().args;
    expect(devMsg).toContain('HTTP 500');
    expect((ctx as any).correlationId).toBe('hdr-xyz');

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    // generic fallback for 5xx
    expect(String(payload.detail)).toContain('Проблема на сервере');
    expect(String(payload.detail)).toContain('hdr-xyz');
  });

  it('handle(): non-HTTP error -> error log + generic user message', () => {
    svc.handle(new Error('Oops'), { source: 'CompB' });

    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    expect(loggerSpy.warn).not.toHaveBeenCalled();

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(payload.severity).toBe('error');
    expect(String(payload.detail)).toContain('Произошла ошибка. Попробуйте позже.');
  });

  it('handle(): takes corrId from ctx if not present in error', () => {
    const err = new HttpErrorResponse({
      status: 400,
      url: '/api/x',
      error: { message: 'Неверный запрос' },
    });

    svc.handle(err, { correlationId: 'ctx-123' });

    const payload = messageSpy.add.calls.mostRecent().args[0];
    expect(String(payload.detail)).toContain('ctx-123');

    // and warn log because 4xx
    expect(loggerSpy.warn).toHaveBeenCalled();
  });
});
