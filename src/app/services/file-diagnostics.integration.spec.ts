import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { ClientLogBatch } from '../interfaces/client-log';
import { ClientLoggerTestHarness } from '../testing/client-logger-test-harness';
import { ClientLoggerService } from './client-logger.service';
import { FileService } from './file.service';
import { MessageWrapperService } from './message.service';

describe('FileService download diagnostic identity', () => {
  const bodyData = { name: 'SENSITIVE_NAME', address: 'SENSITIVE_ADDRESS', contact: 'SENSITIVE_CONTACT' };
  const cases = [
    { label: 'JSON Blob HTTP error', intercepted: true, json: true },
    { label: 'text Blob HTTP error', intercepted: true, json: false },
    { label: 'unmarked JSON Blob HTTP error', intercepted: false, json: true },
  ];
  let hooks: ClientLoggerTestHarness;
  let http: HttpTestingController;

  beforeEach(() => { hooks = new ClientLoggerTestHarness(); });

  afterEach(() => {
    try { http.verify(); }
    finally {
      TestBed.resetTestingModule();
      hooks.restore();
    }
  });

  for (const scenario of cases) {
    it(`records one minimal operation diagnostic and preserves notification for a ${scenario.label}`, async () => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors(scenario.intercepted ? [httpErrorInterceptor] : [])),
          provideHttpClientTesting(), provideTranslateService(), MessageService,
        ],
      });
      const logger = TestBed.inject(ClientLoggerService);
      const logError = spyOn(logger, 'error').and.callThrough();
      const toast = spyOn(TestBed.inject(MessageService), 'add');
      const wrapper = TestBed.inject(MessageWrapperService);
      http = TestBed.inject(HttpTestingController);
      const filename = 'template-seniors.xlsx';
      const path = `/api/files/download/${filename}`;
      const payload = scenario.json
        ? JSON.stringify({ code: 'ERRORS.FILE.NOT_FOUND', data: bodyData })
        : `SENSITIVE_BLOB_BODY ${Object.values(bodyData).join(' ')}`;
      const failure = firstValueFrom(TestBed.inject(FileService).downloadFile(filename)).then(
        () => { throw new Error('Expected a download failure'); },
        (error: unknown) => {
          wrapper.handle(error, { source: 'SeniorsBulkUpdateComponent', stage: 'onFileDownloadClick' });
          return error;
        },
      );
      const request = http.expectOne(`${environment.apiUrl}${path}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob([payload], { type: scenario.json ? 'application/json' : 'text/plain' }), {
        status: 503, statusText: 'Service Unavailable', headers: { 'X-Request-Id': 'download-request' },
      });
      const error = await failure;
      expect(error).toBeInstanceOf(HttpErrorResponse);
      if (!(error instanceof HttpErrorResponse)) throw new Error('Expected the HTTP error contract');
      expect(error.status).toBe(503);
      expect(error.statusText).toBe('Service Unavailable');
      expect(error.url).toBe(`${environment.apiUrl}${path}`);
      expect(error.headers.get('X-Request-Id')).toBe('download-request');
      expect(error.error).toEqual(scenario.json
        ? { code: 'ERRORS.FILE.NOT_FOUND', data: bodyData } : { message: payload });
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError.calls.mostRecent().args[1]).toEqual(scenario.intercepted ? {
        corrId: 'download-request', code: undefined,
        request: { method: 'GET', url: path }, response: { status: 503 },
      } : {
        source: 'SeniorsBulkUpdateComponent', stage: 'onFileDownloadClick',
        route: path, correlationId: 'download-request', status: 503,
        code: 'ERRORS.FILE.NOT_FOUND', isHttp: true,
      });
      expect(toast).toHaveBeenCalledOnceWith({
        severity: 'error', summary: 'TOAST.ERROR', sticky: true,
        detail: `${scenario.json ? 'ERRORS.FILE.NOT_FOUND' : 'ERRORS.SERVER'} (ID: download-request)`,
      });

      hooks.flushInterval();
      const transport = http.expectOne(`${environment.apiUrl}/api/client-logs`);
      const batch = transport.request.body as ClientLogBatch;
      expect(batch.items.length).toBe(1);
      const item = batch.items[0];
      expect(item.corrId).toBe('download-request');
      expect(item.message).toContain(`HTTP 503`);
      expect(item.message).toContain(path);
      if (scenario.intercepted) {
        expect(item.context).toEqual(jasmine.objectContaining({
          request: { method: 'GET', url: path }, response: { status: 503 },
        }));
      } else {
        expect(item.context).toEqual(jasmine.objectContaining({
          source: 'SeniorsBulkUpdateComponent', stage: 'onFileDownloadClick',
          route: path, status: 503, isHttp: true, code: 'ERRORS.FILE.NOT_FOUND',
        }));
      }
      const emitted = JSON.stringify({ calls: logError.calls.allArgs(), batch });
      for (const value of [...Object.values(bodyData), 'SENSITIVE_BLOB_BODY', payload]) {
        expect(emitted).not.toContain(value);
      }
      transport.flush(null, { status: 204, statusText: 'No Content' });
    });
  }
});
