import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ContactOption, volunteersQueryDTOSchema } from '../../../shared/schemas/volunteer.schema';
import { environment } from '../../environments/environment';
import { AllFilterParameters, createEmptyGeneralFilter } from '../interfaces/base-list';
import { ApiResponse } from '../interfaces/api-response';
import { ValidationError } from '../utils/validate-response';
import { MessageWrapperService } from './message.service';
import { VolunteerService } from './volunteer.service';

describe('VolunteerService list search', () => {
  let service: VolunteerService;
  let http: HttpTestingController;
  let filters: AllFilterParameters;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), VolunteerService,
        { provide: MessageWrapperService, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(VolunteerService);
    http = TestBed.inject(HttpTestingController);
    filters = {
      viewOption: 'all', viewHomeOption: 'all', includeOutdated: false,
      searchValue: 'smith', exactMatch: false,
      sortParameters: { active: '', direction: '' },
      filter: {
        ...createEmptyGeneralFilter(),
        categories: [1],
        subscriptions: [{ id: 7, name: 'Subscription coordinator' }],
        cooperations: [{ id: 8, name: 'Order coordinator' }],
        hasInstitute: false,
      },
      addressFilter: { countries: [143], regions: [2], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: false,
    };
  });

  afterEach(() => http.verify());

  function expectListRequest(search: { value: string; exact?: boolean } | undefined): void {
    const request = http.expectOne(environment.apiUrl + '/api/volunteers/get-volunteers');
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON list request');
    const body: Record<string, unknown> = JSON.parse(serialized);
    request.flush({ data: { list: [], length: 0 } });

    expect(body['page']).toEqual({ size: 20, number: 0 });
    expect(body['filters']).toEqual({
      general: { categories: [1], subscriptions: [7], cooperations: [8], hasInstitute: false },
      address: { countries: [143], regions: [2] },
      mode: { strictAddress: false, strictContact: false, strictDetail: false },
    });
    expect(body['search']).toEqual(search);
    if (search === undefined) expect(Object.keys(body)).not.toContain('search');
    const parsed = volunteersQueryDTOSchema.safeParse(body);
    expect(parsed.success).withContext('Serialized request must satisfy volunteersQueryDTOSchema').toBeTrue();
  }

  it('sends an ordinary search with the domain filters and a valid request', () => {
    service.getList(filters, 20, 0).subscribe();
    expectListRequest({ value: 'smith' });
  });

  it('sends an exact search with the domain filters and a valid request', () => {
    filters.exactMatch = true;
    service.getList(filters, 20, 0).subscribe();
    expectListRequest({ value: 'smith', exact: true });
  });

  it('omits the entire search after clearing its value while exact match stays enabled', () => {
    filters.searchValue = '';
    filters.exactMatch = true;
    service.getList(filters, 20, 0).subscribe();
    expectListRequest(undefined);
  });

  it('omits the entire search for whitespace while exact match stays enabled', () => {
    filters.searchValue = '   ';
    filters.exactMatch = true;
    service.getList(filters, 20, 0).subscribe();
    expectListRequest(undefined);
  });

  it('reloads with a schema-valid request after clearing a previous exact search', () => {
    filters.exactMatch = true;
    service.getList(filters, 20, 0).subscribe();
    expectListRequest({ value: 'smith', exact: true });

    filters.searchValue = '';
    service.getList(filters, 20, 0).subscribe();
    expectListRequest(undefined);
    expect(filters.exactMatch).toBeTrue();
  });
});

describe('VolunteerService contact search', () => {
  let service: VolunteerService;
  let http: HttpTestingController;
  const endpoint = environment.apiUrl + '/api/volunteers/search-contacts/';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), VolunteerService,
        { provide: MessageWrapperService, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(VolunteerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function captureContactSearch() {
    // Capture the request before checking its URL so a broken encoding still gets flushed.
    const request = http.expectOne(r => r.url.startsWith(endpoint));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    return request;
  }

  it('keeps unreserved ASCII text on the current endpoint and returns an empty result', () => {
    let received: ApiResponse<ContactOption[]> | undefined;
    service.searchContacts('john').subscribe(response => { received = response; });
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'john');
    request.flush({ data: [] });
    expect(received?.data).toEqual([]);
    expect(received?.code).toBeUndefined();
  });

  it('encodes an ASCII email as one segment and returns validated contact options', () => {
    const contacts: ContactOption[] = [
      { id: 1, volunteerId: 12, type: 'email', content: 'john@example.com' },
    ];
    let received: ApiResponse<ContactOption[]> | undefined;
    service.searchContacts('john@example.com').subscribe(response => { received = response; });
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'john%40example.com');
    request.flush({ data: contacts });
    expect(received?.data).toEqual(contacts);
    expect(received?.code).toBeUndefined();
  });

  it('encodes Cyrillic text as one UTF-8 path segment', () => {
    service.searchContacts('Иван').subscribe();
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + '%D0%98%D0%B2%D0%B0%D0%BD');
    request.flush({ data: [] });
  });

  it('encodes a slash so it cannot create another route segment', () => {
    service.searchContacts('site.com/path').subscribe();
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'site.com%2Fpath');
    request.flush({ data: [] });
  });

  it('encodes a question mark so it cannot start a query string', () => {
    service.searchContacts('name?value').subscribe();
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'name%3Fvalue');
    request.flush({ data: [] });
  });

  it('encodes a hash so it cannot become a URL fragment', () => {
    service.searchContacts('contact#tag').subscribe();
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'contact%23tag');
    request.flush({ data: [] });
  });

  it('encodes a literal percent sign safely within the search segment', () => {
    service.searchContacts('100%').subscribe();
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + '100%25');
    request.flush({ data: [] });
  });

  it('encodes an entire URL-like value as one search segment', () => {
    service.searchContacts('https://example.com/a?b=1#section').subscribe();
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'https%3A%2F%2Fexample.com%2Fa%3Fb%3D1%23section');
    request.flush({ data: [] });
  });

  it('rejects malformed contact options through the existing response validator', () => {
    spyOn(console, 'error');
    let received: unknown;
    let emitted = false;
    service.searchContacts('john').subscribe({
      next: () => { emitted = true; },
      error: (error: unknown) => { received = error; },
    });
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'john');
    request.flush({ data: [{ id: 1, volunteerId: 12, type: 'email', content: 42 }] });
    expect(emitted).toBeFalse();
    expect(received).toBeInstanceOf(ValidationError);
    if (received instanceof ValidationError) expect(received.code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('propagates HTTP errors with their status and backend payload intact', () => {
    const errorBody = { code: 'ERRORS.DATA_FETCH_FAILED' };
    let received: unknown;
    let emitted = false;
    service.searchContacts('john').subscribe({
      next: () => { emitted = true; },
      error: (error: unknown) => { received = error; },
    });
    const request = captureContactSearch();
    expect(request.request.urlWithParams).toBe(endpoint + 'john');
    request.flush(errorBody, { status: 503, statusText: 'Service Unavailable' });
    expect(emitted).toBeFalse();
    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(503);
      expect(received.statusText).toBe('Service Unavailable');
      expect(received.url).toBe(endpoint + 'john');
      expect(received.error).toEqual(errorBody);
    }
  });
});
