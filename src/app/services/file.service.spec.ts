import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { FileService } from './file.service';
import { environment } from '../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

describe('FileService', () => {
  let service: FileService;
  let httpMock: HttpTestingController;

  const BASE_URL = `${environment.apiUrl}/api/files`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),          // modern HttpClient provider
        provideHttpClientTesting(),   // testing backend
        FileService,
      ],
    });

    service = TestBed.inject(FileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --------------------------------------------------------------------------
  // downloadFile: happy path
  // --------------------------------------------------------------------------
  it('downloadFile: issues GET with responseType=blob and returns Blob', (done) => {
    const fname = 'test.txt';

    service.downloadFile(fname).subscribe({
      next: (blob) => {
        // Should be a Blob with the same content we flushed
        expect(blob instanceof Blob).toBeTrue();
        blob.text().then((t) => {
          expect(t).toBe('Hello World!');
          done();
        });
      },
      error: done.fail,
    });

    // Match by URL without forcing query/encoding string equality
    const req = httpMock.expectOne((r) =>
      r.method === 'GET' &&
      r.url === `${BASE_URL}/download/${encodeURIComponent(fname)}`
    );

    // Ensure responseType is 'blob'
    expect(req.request.responseType).toBe('blob');

    // Respond with a Blob payload
    req.flush(new Blob(['Hello World!'], { type: 'text/plain' }));
  });

  // --------------------------------------------------------------------------
  // downloadFile: error path — server sends Blob(JSON), should parse to object
  // --------------------------------------------------------------------------
  it('downloadFile: when server returns Blob(JSON) error, handleError parses JSON into error.error', (done) => {
    const fname = 'missing.pdf';

    service.downloadFile(fname).subscribe({
      next: () => done.fail('expected error'),
      error: (err: HttpErrorResponse) => {
        // Status is preserved
        expect(err.status).toBe(404);
        // JSON inside Blob should be parsed into a plain object
        expect(err.error).toEqual(jasmine.objectContaining({ code: 'ERRORS.FILE.NOT_FOUND' }));
        done();
      },
    });

    const req = httpMock.expectOne((r) =>
      r.method === 'GET' &&
      r.url === `${BASE_URL}/download/${encodeURIComponent(fname)}`
    );
    expect(req.request.responseType).toBe('blob');

    const jsonBlob = new Blob(
      [JSON.stringify({ code: 'ERRORS.FILE.NOT_FOUND' })],
      { type: 'application/json' }
    );

    // Flush as an error response with Blob body
    req.flush(jsonBlob, { status: 404, statusText: 'Not Found' });
  });

  // --------------------------------------------------------------------------
  // downloadFile: error path — server sends Blob(plain text), should wrap as {message:text}
  // --------------------------------------------------------------------------
  it('downloadFile: when server returns Blob(text) error, handleError wraps text as {message}', (done) => {
    const fname = 'oops.bin';

    service.downloadFile(fname).subscribe({
      next: () => done.fail('expected error'),
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(500);
        // Non-JSON text should be wrapped into { message: text }
        expect(err.error).toEqual({ message: 'unexpected failure' });
        done();
      },
    });

    const req = httpMock.expectOne((r) =>
      r.method === 'GET' &&
      r.url === `${BASE_URL}/download/${encodeURIComponent(fname)}`
    );
    expect(req.request.responseType).toBe('blob');

    const textBlob = new Blob(['unexpected failure'], { type: 'text/plain' });
    req.flush(textBlob, { status: 500, statusText: 'Internal Server Error' });
  });

  // --------------------------------------------------------------------------
  // downloadFile: error path — non-Blob error should pass through unchanged
  // --------------------------------------------------------------------------
it('downloadFile: when a network error occurs (non-Blob), it is passed through unchanged', (done) => {
  const fname = 'any.txt';

  service.downloadFile(fname).subscribe({
    next: () => done.fail('expected error'),
    error: (err: HttpErrorResponse) => {
      // error from HttpClient on network failure:
      expect(err.status).toBe(0);                 // typical for network errors
      expect(err.error).toBeInstanceOf(ProgressEvent); // not a Blob → passthrough branch
      // handleError should not wrap/parse anything here
      done();
    },
  });

  const req = httpMock.expectOne(r =>
    r.method === 'GET' &&
    r.url === `${BASE_URL}/download/${encodeURIComponent(fname)}`
  );
  expect(req.request.responseType).toBe('blob');

  // Simulate a low-level network failure (not an HTTP response)
  req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
});
});
