import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { MessageWrapperService } from './message.service';
import { LanguageService } from '../services/language.service';
import { AddressService } from './address.service';
import {
  AddressFilter,
  ToponymFormControlsValues,
  ToponymType,
} from '../interfaces/toponym';

@Injectable()
class LangHeaderInterceptor implements HttpInterceptor {
  constructor(private lang: LanguageService) {}
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const code = this.lang?.current ?? 'en';
    return next.handle(req.clone({ setHeaders: { 'x-lang': code } }));
  }
}

describe('AddressService', () => {
  let service: AddressService;
  let httpMock: HttpTestingController;
  const BASE_URL = `${environment.apiUrl}/api/toponyms`;

  const msgStub = {
    handle: jasmine.createSpy('handle'),
    warn: jasmine.createSpy('warn'),
    messageTap:
      () =>
      (src$: any): any =>
        src$,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        AddressService,
        { provide: LanguageService, useValue: { current: 'uk' } },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: LangHeaderInterceptor,
          multi: true,
        },
        { provide: MessageWrapperService, useValue: msgStub },
      ],
    });
    service = TestBed.inject(AddressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // --------------------------------------------------------------------------
  // checkToponymName
  // --------------------------------------------------------------------------
  it('checkToponymName: builds correct query params and returns boolean ApiResponse', () => {
    const filter: AddressFilter = {
      countries: [1],
      regions: [2],
      districts: [3],
      localities: [],
    };

    let received: boolean | undefined;
    service
      .checkToponymName('region', 'Москва', 10, filter)
      .subscribe((res) => (received = res.data));

    const req = httpMock.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === `${BASE_URL}/check-toponym-name` &&
        r.params.get('type') === 'region' &&
        r.params.get('name') === 'Москва' &&
        r.params.get('id') === '10' &&
        r.params.get('countryId') === '1' &&
        r.params.get('regionId') === '2' &&
        r.params.get('districtId') === '3'
    );

    // Respond with a RawApiResponse that matches the expected schema (boolean data)
    req.flush({ data: true });
    expect(received).toBeTrue();
  });

 it('checkToponymName: omits optional params when not provided', () => {
  const filter: AddressFilter = { countries: [], regions: [], districts: [], localities: [] };

  service.checkToponymName('country', 'Эстония', null, filter).subscribe();

  // ✅ Use a predicate so query string doesn't have to match literally
  const req = httpMock.expectOne(r =>
    r.method === 'GET' &&
    r.url === `${BASE_URL}/check-toponym-name`
  );

 expect(req.request.headers.get('x-lang')).toBe('uk');

  const p = req.request.params;
  expect(p.get('type')).toBe('country');
  expect(p.get('name')).toBe('Эстония');
  expect(p.get('id')).toBeNull();
  expect(p.get('countryId')).toBeNull();
  expect(p.get('regionId')).toBeNull();
  expect(p.get('districtId')).toBeNull();

  req.flush({ data: false });
});

  // --------------------------------------------------------------------------
  // saveToponym
  // --------------------------------------------------------------------------
  it('saveToponym: uses create endpoint and sends merged payload', () => {
    const mainValues: ToponymFormControlsValues = {
      name: 'Тверская',
      shortName: 'Твер.',
      postName: 'Тверская',
      shortPostName: 'Твер.',
      isFederalCity: false,
      isCapitalOfRegion: false,
      isCapitalOfDistrict: false,
    };
    const filter: AddressFilter = {
      countries: [1],
      regions: [7],
      districts: [9],
      localities: [],
    };

    let payloadName: string | undefined;

    service
      .saveToponym('region', null, mainValues, filter, 'create')
      .subscribe((res) => (payloadName = res.data.name));

    const req = httpMock.expectOne(`${BASE_URL}/create-toponym`);
    expect(req.request.method).toBe('POST');

    // POST body should include type + mainValues + parent ids from addressFilter
    const body = req.request.body;
    expect(body.type).toBe('region' as ToponymType);
    expect(body.name).toBe('Тверская');
    expect(body.shortName).toBe('Твер.');
    expect(body.countryId).toBe(1);
    expect(body.regionId).toBe(7);
    expect(body.districtId).toBe(9);
    expect(body.id).toBeUndefined();

    // Respond with a RawApiResponse matching the toponymSchema (simplified)
    req.flush({ data: { id: 100, name: 'Тверская', shortName: 'Твер.' } });
    expect(payloadName).toBe('Тверская');
  });

  it('saveToponym: uses update endpoint when operation="view-edit" and includes id', () => {
    const mainValues: ToponymFormControlsValues = {
      name: 'Обновлена',
      shortName: 'Обн.',
      postName: 'Обн.',
      shortPostName: 'Обн.',
      isFederalCity: false,
      isCapitalOfRegion: false,
      isCapitalOfDistrict: false,
    };
    const filter: AddressFilter = {
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    };

    service
      .saveToponym('region', 55, mainValues, filter, 'view-edit')
      .subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/update-toponym`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.id).toBe(55);
    expect(req.request.body.type).toBe('region');
    expect(req.request.body.name).toBe('Обновлена');

    req.flush({ data: { id: 55, name: 'Обновлена', shortName: 'Обн.' } });
  });

  // --------------------------------------------------------------------------
  // getToponym
  // --------------------------------------------------------------------------
  it('getToponym: builds the correct URL and returns parsed toponym', () => {
    let got: any;
    service.getToponym(5, 'region').subscribe((res) => (got = res.data));

    const req = httpMock.expectOne(`${BASE_URL}/get-region-by-id/5`);
    expect(req.request.method).toBe('GET');

    req.flush({ data: { id: 5, name: 'Карелия', shortName: 'Кар.' } });
    expect(got).toEqual(jasmine.objectContaining({ id: 5, name: 'Карелия' }));
  });

  // --------------------------------------------------------------------------
  // getListOfToponyms
  // --------------------------------------------------------------------------
  it('getListOfToponyms: appends multiple ids and sets typeOfToponym', () => {
    let names: any[] | undefined;
    service
      .getListOfToponyms([1, 2, 3], 'regions')
      .subscribe((res) => (names = res.data));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url === `${BASE_URL}/get-toponyms-list`
    );
    const params = req.request.params;

    // Ensure that ids are appended, not overwritten
    expect(params.getAll('ids')).toEqual(['1', '2', '3']);
    expect(params.get('typeOfToponym')).toBe('regions');

    req.flush({ data: [{ id: 10, name: 'Москва' }] });
    expect(names!.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // getToponyms (table list)
  // --------------------------------------------------------------------------
  it('getToponyms: passes search, exact, sort, pagination and address filters as query params', () => {
    const filter = {
      searchValue: 'моск',
      exactMatch: false,
      addressFilter: {
        countries: [1, 2],
        regions: [3],
        districts: [4, 5],
        localities: [],
      },
      sortParameters: { active: 'name', direction: 'asc' as const },
    };

    let length: number | undefined;
    service
      .getToponyms('region', filter, 20, 0)
      .subscribe((res) => (length = res.data.length));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url === `${BASE_URL}/toponyms`
    );
    const p = req.request.params;

    // Basic params
    expect(p.get('type')).toBe('region');
    expect(p.get('search')).toBe('моск');
    expect(p.get('exact')).toBe('false');
    expect(p.get('sortBy')).toBe('name');
    expect(p.get('sortDir')).toBe('asc');
    expect(p.get('page')).toBe('0');
    expect(p.get('pageSize')).toBe('20');

    // Arrays appended
    expect(p.getAll('countries')).toEqual(['1', '2']);
    expect(p.getAll('regions')).toEqual(['3']);
    expect(p.getAll('districts')).toEqual(['4', '5']);
    expect(p.getAll('localities')).toEqual(null);

    req.flush({
      data: {
        toponyms: [{ id: 1, name: 'Москва', shortName: 'Мск' }],
        length: 42,
      },
    });
    expect(length).toBe(42);
  });

  // --------------------------------------------------------------------------
  // checkPossibilityToDeleteToponym
  // --------------------------------------------------------------------------
  it('checkPossibilityToDeleteToponym: builds params and returns count', () => {
    let count: number | undefined;
    service
      .checkPossibilityToDeleteToponym('region', 9, true)
      .subscribe((res) => (count = res.data));

    const req = httpMock.expectOne(
      (r) =>
        r.method === 'GET' &&
        r.url === `${BASE_URL}/check-toponym-before-delete`
    );
    const p = req.request.params;

    expect(p.get('type')).toBe('region');
    expect(p.get('id')).toBe('9');
    expect(p.get('destroy')).toBe('true');

    req.flush({ data: 0 });
    expect(count).toBe(0);
  });

  // --------------------------------------------------------------------------
  // deleteToponym
  // --------------------------------------------------------------------------
  it('deleteToponym: sends DELETE with params and returns null data', () => {
    let payload: null | undefined;
    service
      .deleteToponym('country', 1, false)
      .subscribe((res) => (payload = res.data));

    const req = httpMock.expectOne(
      (r) => r.method === 'DELETE' && r.url === `${BASE_URL}/delete-toponym`
    );
    const p = req.request.params;

    expect(p.get('type')).toBe('country');
    expect(p.get('id')).toBe('1');
    expect(p.get('destroy')).toBe('false');

    req.flush({ data: null });
    expect(payload).toBeNull();
  });

  // --------------------------------------------------------------------------
  // createListOfToponyms (bulk populate)
  // --------------------------------------------------------------------------
  it('createListOfToponyms: posts type + data and returns created count', () => {
    let created: number | undefined;
    service
      .createListOfToponyms([{ name: 'Estonia', shortName: 'EE' }], 'country')
      .subscribe((res) => (created = res.data));

    const req = httpMock.expectOne(`${BASE_URL}/populate-toponyms`);
    expect(req.request.method).toBe('POST');

    // Body should include both 'type' and 'data'
    expect(req.request.body).toEqual({
      type: 'country',
      data: [{ name: 'Estonia', shortName: 'EE' }],
    });

    req.flush({ data: 2 });
    expect(created).toBe(2);
  });

  // --------------------------------------------------------------------------
  // error handling (catchError -> rethrow HttpErrorResponse)
  // --------------------------------------------------------------------------
  it('propagates HttpErrorResponse via handleError', () => {
    let errorStatus: number | undefined;

    service.getToponym(123, 'region').subscribe({
      next: () => fail('expected error'),
      error: (err) => (errorStatus = err.status),
    });

    const req = httpMock.expectOne(`${BASE_URL}/get-region-by-id/123`);
    // Simulate server error
    req.flush(
      { code: 'ERRORS.TOPONYM.NOT_FOUND' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(errorStatus).toBe(404);
  });
});
