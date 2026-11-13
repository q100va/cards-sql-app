import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { volunteersQueryDTOSchema } from '../../../shared/schemas/volunteer.schema';
import { environment } from '../../environments/environment';
import { AllFilterParameters, createEmptyGeneralFilter } from '../interfaces/base-list';
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
