import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpRequest,
} from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { httpErrorInterceptor } from './http-error.interceptor'; // <-- correct path to your file
import { ClientLoggerService } from '../services/client-logger.service';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<ClientLoggerService>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj<ClientLoggerService>('ClientLoggerService', ['error']);

    TestBed.configureTestingModule({
      providers: [
        // Register the functional interceptor directly
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ClientLoggerService, useValue: loggerSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    loggerSpy.error.calls.reset();
  });

  it('logs HttpErrorResponse: pulls corrId from header, scrubs password/email, and rethrows', (done) => {
    const body = {
      email: 'alice@example.com',
      password: 'secret',
      note: 'keep',
    };

    http.post('/api/thing', body).subscribe({
      next: () => done.fail('should error'),
      error: (err: HttpErrorResponse) => {
        expect(err).toBeTruthy();

        // logger called with expected message + metadata
        expect(loggerSpy.error).toHaveBeenCalledTimes(1);
        const [msg, meta] = loggerSpy.error.calls.mostRecent().args as [string, any];
        expect(msg).toBe('HTTP 400 POST /api/thing');

        // corrId from response header
        expect(meta.corrId).toBe('REQ-123');

        // request body is scrubbed
        expect(meta.request).toEqual({
          method: 'POST',
          url: '/api/thing',
          body: { email: '***', password: '***', note: 'keep' },
        });

        // response body is a safe-serialized copy
        expect(meta.response.status).toBe(400);
        expect(meta.response.body).toEqual({ code: 'ERR.BAD', detail: 'oops' });

        done();
      },
    });

    const req = httpMock.expectOne('/api/thing');
    expect(req.request.method).toBe('POST');

    req.flush(
      { code: 'ERR.BAD', detail: 'oops' },
      {
        status: 400,
        statusText: 'Bad Request',
        headers: new HttpHeaders({ 'X-Request-Id': 'REQ-123' }),
      }
    );
  });

  it('falls back to correlationId from error body when X-Request-Id header is missing', (done) => {
    http.get('/api/foo').subscribe({
      next: () => done.fail('should error'),
      error: () => {
        expect(loggerSpy.error).toHaveBeenCalledTimes(1);
        const [, meta] = loggerSpy.error.calls.mostRecent().args as [string, any];
        expect(meta.corrId).toBe('CID-777'); // from body.correlationId
        done();
      },
    });

    const req = httpMock.expectOne('/api/foo');
    req.flush(
      { code: 'ERR', correlationId: 'CID-777' },
      { status: 500, statusText: 'Internal Server Error' }
    );
  });

  it('for non-HttpErrorResponse: logs as-is and rethrows', (done) => {
    // Call the functional interceptor directly to simulate an arbitrary error
    const fakeReq = new HttpRequest('GET', '/api/direct');
    const err = new Error('non-http boom');

    // Run in DI context so inject(ClientLoggerService) works
    TestBed.runInInjectionContext(() => {
      httpErrorInterceptor(fakeReq, () => throwError(() => err)).subscribe({
        next: () => done.fail('should error'),
        error: (e) => {
          expect(e).toBe(err);
          expect(loggerSpy.error).toHaveBeenCalledTimes(1);
          // first argument is the error itself
          expect(loggerSpy.error.calls.mostRecent().args[0]).toBe(err);
          done();
        },
      });
    });
  });

  it('logs only HTTP metadata without collecting personal request or response payloads', () => {
    const body = {
      name: 'Alice Example',
      birthDate: '1940-05-12',
      comment: 'Private family circumstances',
      credentials: { password: 'private-password', token: 'private-token' },
    };
    const response = {
      code: 'ERRORS.VALIDATION',
      detail: 'Private server explanation',
      data: { address: 'Private Street', name: body.name },
    };
    let received: HttpErrorResponse | undefined;
    http.post('/api/recipients', body).subscribe({ error: (error: HttpErrorResponse) => { received = error; } });
    httpMock.expectOne('/api/recipients').flush(response, {
      status: 422, statusText: 'Unprocessable Entity', headers: { 'X-Request-Id': 'privacy-check' },
    });
    expect(received?.status).toBe(422);
    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    const [message, context] = loggerSpy.error.calls.mostRecent().args;
    expect(message).toBe('HTTP 422 POST /api/recipients');
    expect(context?.['corrId']).toBe('privacy-check');
    expect(context?.['request']).toEqual(jasmine.objectContaining({ method: 'POST', url: '/api/recipients' }));
    expect(context?.['response']).toEqual(jasmine.objectContaining({ status: 422 }));
    const request = context?.['request'] as Record<string, unknown> | undefined;
    const diagnosticResponse = context?.['response'] as Record<string, unknown> | undefined;
    expect(request?.['body']).withContext('request bodies are outside the diagnostic boundary').toBeUndefined();
    expect(diagnosticResponse?.['body']).withContext('response bodies are outside the diagnostic boundary').toBeUndefined();
    const diagnostic = JSON.stringify({ message, context });
    for (const personalValue of [body.name, body.birthDate, body.comment, body.credentials.password,
      body.credentials.token, response.detail, response.data.address]) {
      expect(diagnostic).withContext('must omit ' + personalValue).not.toContain(personalValue);
    }
    expect(body.credentials.password).toBe('private-password');
    expect(body.credentials.token).toBe('private-token');
  });

  it('omits sensitive query values while retaining the failed endpoint path', () => {
    const url = '/api/recipients?name=Alice-Example&token=private-query-token&comment=private-query-comment';
    http.get(url).subscribe({ error: () => {} });
    httpMock.expectOne(url).flush({ code: 'ERRORS.SERVER' }, { status: 500, statusText: 'Internal Server Error' });
    expect(loggerSpy.error).toHaveBeenCalledTimes(1);
    const [message, context] = loggerSpy.error.calls.mostRecent().args;
    const diagnostic = JSON.stringify({ message, context });
    expect(diagnostic).toContain('/api/recipients');
    for (const value of ['Alice-Example', 'private-query-token', 'private-query-comment']) {
      expect(diagnostic).withContext('query data must not enter diagnostics').not.toContain(value);
    }
  });

  it('does not embed a failed client-log batch into another diagnostic event', () => {
    const batch = {
      app: 'cards-sql-app', env: 'development',
      items: [{ level: 'error', message: 'Previous diagnostic must not be nested', context: { source: 'EarlierFailure' } }],
    };
    let received: HttpErrorResponse | undefined;
    http.post('/api/client-logs', batch).subscribe({ error: (error: HttpErrorResponse) => { received = error; } });
    httpMock.expectOne('/api/client-logs').flush({ code: 'ERRORS.SERVER' }, {
      status: 503, statusText: 'Service Unavailable',
    });
    expect(received?.status).toBe(503);
    expect(loggerSpy.error).withContext('logging transport has no diagnostic payload ownership').not.toHaveBeenCalled();
  });
});
