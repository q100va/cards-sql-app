import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { homesQueryDTOSchema } from '../../../shared/schemas/home.schema';
import { environment } from '../../environments/environment';
import { AllFilterParameters, createEmptyGeneralFilter } from '../interfaces/base-list';
import { MessageWrapperService } from './message.service';
import { HomeService } from './home.service';

describe('HomeService list search', () => {
  let service: HomeService;
  let http: HttpTestingController;
  let filters: AllFilterParameters;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), HomeService,
        { provide: MessageWrapperService, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(HomeService);
    http = TestBed.inject(HttpTestingController);
    filters = {
      viewOption: 'all', viewHomeOption: 'all', includeOutdated: false,
      searchValue: 'smith', exactMatch: false,
      sortParameters: { active: '', direction: '' },
      filter: {
        ...createEmptyGeneralFilter(),
        partners: [{ id: 11, name: 'Home coordinator' }],
        noAddress: false, hasCoordination: true,
      },
      addressFilter: { countries: [143], regions: [2], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: false,
    };
  });

  afterEach(() => http.verify());

  function expectListRequest(search: { value: string; exact?: boolean } | undefined): void {
    const request = http.expectOne(environment.apiUrl + '/api/homes/get-homes');
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON list request');
    const body: Record<string, unknown> = JSON.parse(serialized);
    request.flush({ data: { list: [], length: 0 } });

    expect(body['page']).toEqual({ size: 20, number: 0 });
    expect(body['filters']).toEqual({
      general: { partners: [11], noAddress: false, hasCoordination: true },
      address: { countries: [143], regions: [2] },
      mode: { strictAddress: false, strictContact: false, strictDetail: false },
    });
    expect(body['search']).toEqual(search);
    if (search === undefined) expect(Object.keys(body)).not.toContain('search');
    const parsed = homesQueryDTOSchema.safeParse(body);
    expect(parsed.success).withContext('Serialized request must satisfy homesQueryDTOSchema').toBeTrue();
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
