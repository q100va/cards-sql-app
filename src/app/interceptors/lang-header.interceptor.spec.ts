import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpHeaders,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { langHeaderInterceptor } from './lang-header.interceptor';

describe('langHeaderInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const LS_KEY = 'app.lang';
  let originalDocLang: string;

  beforeEach(() => {
    // preserve the original document lang
    originalDocLang = document.documentElement.lang;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([langHeaderInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);

    // clean localStorage before each test
    localStorage.removeItem(LS_KEY);
    document.documentElement.lang = '';
  });

  afterEach(() => {
    httpMock.verify();
    // restore original document lang
    document.documentElement.lang = originalDocLang;
  });

  it('sets x-lang from localStorage if present', () => {
    localStorage.setItem(LS_KEY, 'ru');

    http.get('/api/foo').subscribe();
    const req = httpMock.expectOne('/api/foo');
    expect(req.request.headers.get('x-lang')).toBe('ru');
    req.flush({ ok: true });
  });

  it('uses document.documentElement.lang when localStorage is empty', () => {
    document.documentElement.lang = 'uk';

    http.get('/api/bar').subscribe();
    const req = httpMock.expectOne('/api/bar');
    expect(req.request.headers.get('x-lang')).toBe('uk');
    req.flush({ ok: true });
  });

  it("falls back to 'en' when both localStorage and document.lang are empty", () => {
    // neither LS nor document.lang
    http.get('/api/baz').subscribe();
    const req = httpMock.expectOne('/api/baz');
    expect(req.request.headers.get('x-lang')).toBe('en');
    req.flush({ ok: true });
  });

  it('does not touch /i18n/* requests', () => {
    http.get('/assets/i18n/ru.json').subscribe();
    const req = httpMock.expectOne('/assets/i18n/ru.json');
    expect(req.request.headers.has('x-lang')).toBeFalse();
    req.flush({ any: 'thing' });
  });

  it("does not overwrite an already set x-lang (if you decide to keep this behavior)", () => {
    // NOTE: the current interceptor implementation always overwrites the header.
    // This test will pass ONLY if you add a guard to keep existing headers (see previous note).
    const headers = new HttpHeaders({ 'x-lang': 'de' });
    http.get('/api/pre', { headers }).subscribe();
    const req = httpMock.expectOne('/api/pre');
    // expecting it stays 'de' (assuming interceptor is updated accordingly)
    // with current implementation you'll see 'en'/'ru'/'uk' — remove this test or change the interceptor.
    expect(req.request.headers.get('x-lang')).toBe('de');
    req.flush({ ok: true });
  });
});
