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
});
