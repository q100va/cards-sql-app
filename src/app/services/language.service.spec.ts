import { ApplicationInitStatus } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DateAdapter } from '@angular/material/core';
import { TranslateLoader, TranslateService, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { PRIME_NG_CONFIG, PrimeNG, providePrimeNG } from 'primeng/config';
import { Subject, Subscription, of } from 'rxjs';
import { appConfig } from '../app.config';
import { langHeaderInterceptor } from '../interceptors/lang-header.interceptor';
import { AuthService } from './auth.service';
import { DateUtilsService } from './date-utils.service';
import { LanguageService, ruPrime, type Lang } from './language.service';

class ControlledLanguageLoader implements TranslateLoader {
  readonly requested: string[] = [];
  private readonly pending = new Map<string, Subject<TranslationObject>>();

  getTranslation(lang: string) {
    this.requested.push(lang);
    const response = new Subject<TranslationObject>();
    this.pending.set(lang, response);
    return response.asObservable();
  }

  completeAll(): void {
    for (const [lang, response] of [...this.pending]) {
      this.pending.delete(lang);
      response.next({ GREETING: lang === 'en' ? 'Hello' : 'Привет' });
      response.complete();
    }
  }

  fail(lang: string): void {
    const response = this.pending.get(lang);
    if (!response) throw new Error(`No pending translation load for ${lang}`);
    this.pending.delete(lang);
    response.error(new Error('Translation load failed'));
  }
}

function isolateLanguageGlobals(): () => void {
  const keys = ['lang', 'app.lang'];
  const saved = keys.map(key => [key, localStorage.getItem(key)] as const);
  const htmlLang = document.documentElement.getAttribute('lang');
  keys.forEach(key => localStorage.removeItem(key));
  document.documentElement.removeAttribute('lang');
  return () => {
    for (const [key, value] of saved) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    if (htmlLang === null) document.documentElement.removeAttribute('lang');
    else document.documentElement.setAttribute('lang', htmlLang);
  };
}

describe('LanguageService runtime consistency', () => {
  let loader: ControlledLanguageLoader;
  let restoreGlobals: () => void;
  let dateLocale: string | undefined;
  let dateAdapter: jasmine.SpyObj<Pick<DateAdapter<unknown>, 'setLocale'>>;
  let language: LanguageService;
  let httpMock: HttpTestingController;
  let subscriptions: Subscription;

  beforeEach(() => {
    restoreGlobals = isolateLanguageGlobals();
    loader = new ControlledLanguageLoader();
    subscriptions = new Subscription();
    dateLocale = undefined;
    dateAdapter = jasmine.createSpyObj<Pick<DateAdapter<unknown>, 'setLocale'>>('DateAdapter', ['setLocale']);
    dateAdapter.setLocale.and.callFake((locale: string) => { dateLocale = locale; });
    spyOn(TranslateService, 'getBrowserLang').and.returnValue('en');
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService({ loader: { provide: TranslateLoader, useValue: loader } }),
        providePrimeNG({ translation: ruPrime }),
        provideHttpClient(withInterceptors([langHeaderInterceptor])), provideHttpClientTesting(),
        { provide: DateAdapter, useValue: dateAdapter },
      ],
    });
  });

  afterEach(() => {
    try {
      httpMock?.verify();
    } finally {
      subscriptions.unsubscribe();
      loader.completeAll();
      TestBed.resetTestingModule();
      restoreGlobals();
    }
  });

  function createLanguage(saved = 'ru'): void {
    localStorage.setItem('app.lang', saved);
    language = TestBed.inject(LanguageService);
    httpMock = TestBed.inject(HttpTestingController);
    loader.completeAll();
  }

  function expectHeader(lang: Lang): void {
    TestBed.inject(HttpClient).get('/api/language-regression').subscribe();
    const req = httpMock.expectOne('/api/language-regression');
    expect(req.request.headers.get('x-lang')).toBe(lang);
    req.flush({ ok: true });
  }

  function expectCoherentLanguage(lang: Lang): void {
    const translate = TestBed.inject(TranslateService);
    expect(language.current).toBe(lang);
    expect(language.locale).toBe(lang);
    expect(localStorage.getItem('app.lang')).toBe(lang);
    expect(document.documentElement.lang).toBe(lang);
    expect(dateLocale).toBe(lang);
    expect(translate.getCurrentLang()).toBe(lang);
    expect(translate.instant('GREETING')).toBe(lang === 'en' ? 'Hello' : 'Привет');
    expect(TestBed.inject(DateUtilsService).transformDate(new Date(2027, 0, 2)))
      .toBe(lang === 'en' ? '01/02/2027' : '02.01.2027');
    expectHeader(lang);
  }

  it('rejects an unsupported stored language and keeps Russian state and API headers consistent', () => {
    createLanguage('de');
    expect(loader.requested).not.toContain('de');
    expectCoherentLanguage('ru');
  });

  it('retains the last successfully loaded Russian state when English loading fails', () => {
    createLanguage();
    expectCoherentLanguage('ru');
    language.set('en');
    loader.fail('en');
    expectCoherentLanguage('ru');
  });

  it('updates live PrimeNG translations and required nested labels with the loaded language', () => {
    createLanguage();
    const prime = TestBed.inject(PrimeNG);
    const changed = jasmine.createSpy('runtime PrimeNG translation update');
    subscriptions.add(prime.translationObserver.subscribe(changed));
    expect(prime.getTranslation('accept')).toBe('Да');
    language.set('en');
    loader.completeAll();
    expectCoherentLanguage('en');
    expect(prime.getTranslation('accept')).toBe('Yes');
    expect(prime.getTranslation('today')).toBe('Today');
    expect(prime.translation.aria?.pageLabel).toBe('Page {page}');
    expect(prime.translation.aria?.rowsPerPageLabel).toBe('Rows per page');
    expect(prime.translation.aria?.close).toBe('Close');
    expect(prime.translation.aria?.unselectAll).toBe('Unselect all');
    expect(prime.translation.dayNames?.length).toBe(7);
    expect(prime.translation.monthNames?.length).toBe(12);
    expect(changed).toHaveBeenCalled();
  });

  it('reflects a successful runtime language change in subsequent API requests', () => {
    createLanguage();
    expectHeader('ru');
    language.set('en');
    loader.completeAll();
    expectHeader('en');
    expect(language.current).toBe('en');
    expect(TestBed.inject(TranslateService).getCurrentLang()).toBe('en');
  });

  it('keeps Russian when a pending English switch is superseded by selecting Russian again', () => {
    createLanguage();
    language.set('en');
    language.set('ru');
    loader.completeAll();
    expectCoherentLanguage('ru');
    expect(TestBed.inject(PrimeNG).getTranslation('accept')).toBe('Да');
  });

  it('switches PrimeNG filter labels from Russian to English with the runtime language', () => {
    createLanguage();
    const prime = TestBed.inject(PrimeNG);
    expect(prime.getTranslation('contains')).toBe('Содержит');
    language.set('en');
    loader.completeAll();
    expect(prime.getTranslation('contains')).toBe('Contains');
    expect(prime.getTranslation('dateIs')).toBe('Date is');
    expect(prime.getTranslation('apply')).toBe('Apply');
  });
});

describe('Language initialization through the production app configuration', () => {
  let loader: ControlledLanguageLoader;
  let restoreGlobals: () => void;
  let dateLocale: string | undefined;
  let auth: jasmine.SpyObj<Pick<AuthService, 'hydrateFromSession'>>;

  beforeEach(() => {
    restoreGlobals = isolateLanguageGlobals();
    loader = new ControlledLanguageLoader();
    dateLocale = undefined;
    auth = jasmine.createSpyObj<Pick<AuthService, 'hydrateFromSession'>>('AuthService', ['hydrateFromSession']);
    auth.hydrateFromSession.and.returnValue(of(void 0));
    spyOn(TranslateService, 'getBrowserLang').and.returnValue('en');
    const dateAdapter = jasmine.createSpyObj<Pick<DateAdapter<unknown>, 'setLocale'>>('DateAdapter', ['setLocale']);
    dateAdapter.setLocale.and.callFake((locale: string) => { dateLocale = locale; });
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        { provide: TranslateLoader, useValue: loader },
        { provide: DateAdapter, useValue: dateAdapter },
        { provide: AuthService, useValue: auth },
        // Isolate the mutable configuration token; use the real PrimeNG initializer/runtime.
        { provide: PRIME_NG_CONFIG, useValue: { translation: ruPrime } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    restoreGlobals();
  });

  function completeInitialization(): void {
    let ready = false;
    TestBed.inject(ApplicationInitStatus).donePromise.then(() => { ready = true; });
    loader.completeAll();
    flushMicrotasks();
    expect(ready).toBeTrue();
    expect(auth.hydrateFromSession).toHaveBeenCalledTimes(1);
  }

  it('keeps persisted English as the sole active startup choice instead of reverting to Russian', fakeAsync(() => {
    localStorage.setItem('app.lang', 'en');
    const use = spyOn(TranslateService.prototype, 'use').and.callThrough();
    try {
      const language = TestBed.inject(LanguageService);
      const selected: Lang[] = [];
      const subscription = language.lang$.subscribe(lang => selected.push(lang));
      try {
        completeInitialization();
        expect(language.current).toBe('en');
        expect(localStorage.getItem('app.lang')).toBe('en');
        expect(document.documentElement.lang).toBe('en');
        expect(dateLocale).toBe('en');
        expect(TestBed.inject(TranslateService).getCurrentLang()).toBe('en');
        expect(selected.every(lang => lang === 'en')).toBeTrue();
        // Loading a Russian fallback dictionary is allowed; selecting it over saved English is not.
        expect([...new Set(use.calls.allArgs().map(([lang]) => lang))]).toEqual(['en']);
      } finally { subscription.unsubscribe(); }
    } finally {
      loader.completeAll();
      flushMicrotasks();
    }
  }));

  it('retains the documented Russian default when no language preference exists', fakeAsync(() => {
    try {
      const language = TestBed.inject(LanguageService);
      completeInitialization();
      expect(language.current).toBe('ru');
      expect(language.locale).toBe('ru');
      expect(localStorage.getItem('app.lang')).toBe('ru');
      expect(document.documentElement.lang).toBe('ru');
      expect(dateLocale).toBe('ru');
      expect(TestBed.inject(TranslateService).getCurrentLang()).toBe('ru');
    } finally {
      loader.completeAll();
      flushMicrotasks();
    }
  }));
});
