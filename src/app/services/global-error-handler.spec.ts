import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { GlobalErrorHandler } from './global-error-handler';
import { ClientLogBatch } from '../interfaces/client-log';
import { ClientLoggerTestHarness } from '../testing/client-logger-test-harness';
import { environment } from '../../environments/environment';

describe('GlobalErrorHandler diagnostic ownership', () => {
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

  for (const development of [true, false]) {
    it(`records one uncaught error with development console output ${development ? 'enabled' : 'disabled'}`, () => {
      const error = new Error('Uncaught application failure');
      const toast = spyOn(TestBed.inject(MessageService), 'add');
      const previousMode: unknown = Reflect.get(globalThis, 'ngDevMode');
      try {
        // Exercise the handler's runtime branch without changing Angular build configuration.
        Reflect.set(globalThis, 'ngDevMode', development);
        expect(() => handler.handleError(error)).not.toThrow();
      } finally {
        Reflect.set(globalThis, 'ngDevMode', previousMode);
      }
      hooks.flushInterval();
      const req = httpMock.expectOne(`${environment.apiUrl}/api/client-logs`);
      const events = (req.request.body as ClientLogBatch).items;
      expect(events.length).withContext('console output must not record the same error again').toBe(1);
      expect(events[0].message).toBe(error.message);
      expect(events[0].context?.['source']).toBe('GlobalErrorHandler');
      expect(toast).toHaveBeenCalledTimes(1);
      if (development) expect(hooks.error).toHaveBeenCalledOnceWith(error);
      else expect(hooks.error).not.toHaveBeenCalled();
      req.flush(null, { status: 204, statusText: 'No Content' });
      hooks.flushInterval();
      httpMock.expectNone(`${environment.apiUrl}/api/client-logs`);
    });
  }
});
