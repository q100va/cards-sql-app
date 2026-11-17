import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { z } from 'zod';
import { GlobalErrorHandler } from './global-error-handler';
import { ClientLogBatch } from '../interfaces/client-log';
import { ClientLoggerTestHarness } from '../testing/client-logger-test-harness';
import { validateResponse, validateNoSchemaResponse, ValidationError } from '../utils/validate-response';
import { environment } from '../../environments/environment';

describe('Console privacy through real client logging', () => {
  const payload = {
    name: 'Private Person', birthDate: '1940-05-12', comment: 'Private family circumstances',
    credentials: { password: 'private-password', token: 'private-token' },
  };
  let hooks: ClientLoggerTestHarness;
  let handler: GlobalErrorHandler;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    hooks = new ClientLoggerTestHarness();
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler, provideHttpClient(), provideHttpClientTesting(),
        provideTranslateService(), MessageService,
      ],
    });
    handler = TestBed.inject(GlobalErrorHandler);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      TestBed.resetTestingModule();
      hooks.restore();
    }
  });

  function expectSafeDiagnostics(code: string): void {
    hooks.flushInterval();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/client-logs`);
    const batch = req.request.body as ClientLogBatch;
    expect(batch.items.length).toBe(1);
    const emitted = JSON.stringify({ console: [...hooks.error.calls.allArgs(), ...hooks.warn.calls.allArgs()], batch });
    for (const value of [payload.name, payload.birthDate, payload.comment,
      payload.credentials.password, payload.credentials.token]) {
      expect(emitted).not.toContain(value);
    }
    expect(emitted).toContain(code);
    req.flush(null, { status: 204, statusText: 'No Content' });
  }

  function handleInDevelopment(error: unknown): void {
    const previous: unknown = Reflect.get(globalThis, 'ngDevMode');
    try {
      Reflect.set(globalThis, 'ngDevMode', true);
      handler.handleError(error);
    } finally {
      Reflect.set(globalThis, 'ngDevMode', previous);
    }
  }

  it('captures schema diagnostics without sending sensitive input to the console or log batch', () => {
    let received: unknown;
    of({ data: payload }).pipe(validateResponse(z.object({ id: z.number() })))
      .subscribe({ error: (error: unknown) => { received = error; } });
    expect(received).toBeInstanceOf(ValidationError);
    expectSafeDiagnostics('ERRORS.INVALID_SCHEMA');
  });

  it('captures type diagnostics without sending sensitive input to the console or log batch', () => {
    let received: unknown;
    of({ data: payload }).pipe(validateNoSchemaResponse<boolean>('isBoolean'))
      .subscribe({ error: (error: unknown) => { received = error; } });
    expect(received).toBeInstanceOf(ValidationError);
    expectSafeDiagnostics('ERRORS.INVALID_TYPE');
  });

  it('prints HTTP failure metadata without exposing its response body or query values', () => {
    handleInDevelopment(new HttpErrorResponse({
      status: 422, url: '/api/recipients?token=private-token',
      error: { code: 'ERRORS.INVALID_TYPE', data: payload },
    }));
    expect(hooks.error).toHaveBeenCalledTimes(1);
    expectSafeDiagnostics('ERRORS.INVALID_TYPE');
  });

  it('does not print an arbitrary uncaught object as development console output', () => {
    handleInDevelopment({ data: payload });
    expect(hooks.error).toHaveBeenCalledTimes(1);
    expectSafeDiagnostics('GlobalErrorHandler');
  });
});
