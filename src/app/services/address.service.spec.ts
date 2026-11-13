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
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';
import {
  ToponymCreate,
  ToponymUpdate,
  toponymCreateSchema,
  toponymUpdateSchema,
} from '../../../shared/schemas/toponym.schema';

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

describe('AddressService type-specific save contracts', () => {
  let service: AddressService;
  let http: HttpTestingController;

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), AddressService,
        { provide: MessageWrapperService, useValue: messages },
      ],
    });
    service = TestBed.inject(AddressService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function captureSave(endpoint: 'create-toponym' | 'update-toponym'): unknown {
    const request = http.expectOne(environment.apiUrl + '/api/toponyms/' + endpoint);
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON toponym request');
    const body: unknown = JSON.parse(serialized);
    request.flush({ data: { id: 900, name: 'Сохранённый топоним' } });
    return body;
  }

  describe('Country', () => {
    it('creates a Country using only its required name and discriminator', () => {
      const form: ToponymFormControlsValues = { name: 'Беларусь' };
      const parents: AddressFilter = { countries: [], regions: [], districts: [], localities: [] };
      const expected: Extract<ToponymCreate, { type: 'country' }> = { type: 'country', name: 'Беларусь' };
      service.saveToponym('country', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('updates a Country with its entity ID and no parent IDs', () => {
      const form: ToponymFormControlsValues = { name: 'Республика Беларусь' };
      const parents: AddressFilter = { countries: [], regions: [], districts: [], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'country' }> = { type: 'country', id: 17, name: 'Республика Беларусь' };
      service.saveToponym('country', 17, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('excludes cross-type form fields and selected hierarchy IDs from Country creation', () => {
      // Deliberately broad form state: only name belongs to a Country request.
      const form: ToponymFormControlsValues = {
        name: 'Россия', shortName: 'РФ', postName: 'Россия', shortPostName: 'РФ',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymCreate, { type: 'country' }> = { type: 'country', name: 'Россия' };
      service.saveToponym('country', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('excludes cross-type form fields and selected hierarchy IDs from Country updates', () => {
      const form: ToponymFormControlsValues = {
        name: 'Россия', shortName: 'РФ', postName: 'Россия', shortPostName: 'РФ',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymUpdate, { type: 'country' }> = { type: 'country', id: 143, name: 'Россия' };
      service.saveToponym('country', 143, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('does not treat the selected Country entity as its own parent during editing', () => {
      const form: ToponymFormControlsValues = { name: 'Россия' };
      const parents: AddressFilter = { countries: [143], regions: [], districts: [], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'country' }> = { type: 'country', id: 143, name: 'Россия' };
      service.saveToponym('country', 143, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });
  });

  describe('Region', () => {
    it('creates a Region with name, shortName, and its Country parent', () => {
      const form: ToponymFormControlsValues = { name: 'Тверская область', shortName: 'Тверская обл.' };
      const parents: AddressFilter = { countries: [143], regions: [], districts: [], localities: [] };
      const expected: Extract<ToponymCreate, { type: 'region' }> = {
        type: 'region', name: 'Тверская область', shortName: 'Тверская обл.', countryId: 143,
      };
      service.saveToponym('region', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('updates a Region while preserving its Country parent and own fields', () => {
      const form: ToponymFormControlsValues = { name: 'Тверская область', shortName: 'Тверская обл.' };
      const parents: AddressFilter = { countries: [143], regions: [], districts: [], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'region' }> = {
        type: 'region', id: 20, name: 'Тверская область', shortName: 'Тверская обл.', countryId: 143,
      };
      service.saveToponym('region', 20, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('drops District postal names, Locality flags, and non-parent IDs when creating a Region', () => {
      const form: ToponymFormControlsValues = {
        name: 'Тверская область', shortName: 'Тверская обл.', postName: 'Калининский район', shortPostName: 'Калининский р-н',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymCreate, { type: 'region' }> = {
        type: 'region', name: 'Тверская область', shortName: 'Тверская обл.', countryId: 143,
      };
      service.saveToponym('region', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('drops District postal names, Locality flags, and non-parent IDs when updating a Region', () => {
      const form: ToponymFormControlsValues = {
        name: 'Тверская область', shortName: 'Тверская обл.', postName: 'Калининский район', shortPostName: 'Калининский р-н',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymUpdate, { type: 'region' }> = {
        type: 'region', id: 20, name: 'Тверская область', shortName: 'Тверская обл.', countryId: 143,
      };
      service.saveToponym('region', 20, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('does not treat the selected Region entity as another parent during editing', () => {
      const form: ToponymFormControlsValues = { name: 'Тверская область', shortName: 'Тверская обл.' };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'region' }> = {
        type: 'region', id: 20, name: 'Тверская область', shortName: 'Тверская обл.', countryId: 143,
      };
      service.saveToponym('region', 20, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });
  });

  describe('District', () => {
    it('creates a District with its postal names and Country/Region parents', () => {
      const form: ToponymFormControlsValues = {
        name: 'Калининский район', shortName: 'Калининский р-н', postName: 'Калининский район', shortPostName: 'Калининский р-н',
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [], localities: [] };
      const expected: Extract<ToponymCreate, { type: 'district' }> = {
        type: 'district', name: 'Калининский район', shortName: 'Калининский р-н',
        postName: 'Калининский район', shortPostName: 'Калининский р-н', countryId: 143, regionId: 20,
      };
      service.saveToponym('district', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('updates a District with its postal names and Country/Region parents', () => {
      const form: ToponymFormControlsValues = {
        name: 'Калининский район', shortName: 'Калининский р-н', postName: 'Калининский район', shortPostName: 'Калининский р-н',
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'district' }> = {
        type: 'district', id: 30, name: 'Калининский район', shortName: 'Калининский р-н',
        postName: 'Калининский район', shortPostName: 'Калининский р-н', countryId: 143, regionId: 20,
      };
      service.saveToponym('district', 30, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('drops Locality flags and non-parent IDs when creating a District', () => {
      const form: ToponymFormControlsValues = {
        name: 'Калининский район', shortName: 'Калининский р-н', postName: 'Калининский район', shortPostName: 'Калининский р-н',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymCreate, { type: 'district' }> = {
        type: 'district', name: 'Калининский район', shortName: 'Калининский р-н',
        postName: 'Калининский район', shortPostName: 'Калининский р-н', countryId: 143, regionId: 20,
      };
      service.saveToponym('district', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('drops Locality flags and non-parent IDs when updating a District', () => {
      const form: ToponymFormControlsValues = {
        name: 'Калининский район', shortName: 'Калининский р-н', postName: 'Калининский район', shortPostName: 'Калининский р-н',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymUpdate, { type: 'district' }> = {
        type: 'district', id: 30, name: 'Калининский район', shortName: 'Калининский р-н',
        postName: 'Калининский район', shortPostName: 'Калининский р-н', countryId: 143, regionId: 20,
      };
      service.saveToponym('district', 30, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('does not treat the selected District entity as another parent during editing', () => {
      const form: ToponymFormControlsValues = {
        name: 'Калининский район', shortName: 'Калининский р-н', postName: 'Калининский район', shortPostName: 'Калининский р-н',
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'district' }> = {
        type: 'district', id: 30, name: 'Калининский район', shortName: 'Калининский р-н',
        postName: 'Калининский район', shortPostName: 'Калининский р-н', countryId: 143, regionId: 20,
      };
      service.saveToponym('district', 30, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });
  });

  describe('Locality', () => {
    it('creates a Locality with three required flags and its complete parent hierarchy', () => {
      const form: ToponymFormControlsValues = {
        name: 'город Тверь', shortName: 'г. Тверь',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [] };
      const expected: Extract<ToponymCreate, { type: 'locality' }> = {
        type: 'locality', name: 'город Тверь', shortName: 'г. Тверь', countryId: 143, regionId: 20, districtId: 30,
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      service.saveToponym('locality', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('updates a Locality while retaining all three false flags', () => {
      const form: ToponymFormControlsValues = {
        name: 'деревня Берёзово', shortName: 'д. Берёзово',
        isFederalCity: false, isCapitalOfRegion: false, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [] };
      const expected: Extract<ToponymUpdate, { type: 'locality' }> = {
        type: 'locality', id: 40, name: 'деревня Берёзово', shortName: 'д. Берёзово', countryId: 143, regionId: 20, districtId: 30,
        isFederalCity: false, isCapitalOfRegion: false, isCapitalOfDistrict: false,
      };
      service.saveToponym('locality', 40, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('drops District postal names when creating a Locality and retains its own flags', () => {
      const form: ToponymFormControlsValues = {
        name: 'город Тверь', shortName: 'г. Тверь', postName: 'Калининский район', shortPostName: 'Калининский р-н',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymCreate, { type: 'locality' }> = {
        type: 'locality', name: 'город Тверь', shortName: 'г. Тверь', countryId: 143, regionId: 20, districtId: 30,
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      service.saveToponym('locality', null, form, parents, 'create').subscribe();
      const body = captureSave('create-toponym');
      expect(body).toEqual(expected);
      expect(toponymCreateSchema.safeParse(body).success).toBeTrue();
    });

    it('drops District postal names when updating a Locality and retains its own flags', () => {
      const form: ToponymFormControlsValues = {
        name: 'город Тверь', shortName: 'г. Тверь', postName: 'Калининский район', shortPostName: 'Калининский р-н',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymUpdate, { type: 'locality' }> = {
        type: 'locality', id: 40, name: 'город Тверь', shortName: 'г. Тверь', countryId: 143, regionId: 20, districtId: 30,
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      service.saveToponym('locality', 40, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });

    it('keeps only Country/Region/District parent IDs when the edited Locality is selected', () => {
      const form: ToponymFormControlsValues = {
        name: 'город Тверь', shortName: 'г. Тверь',
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
      const expected: Extract<ToponymUpdate, { type: 'locality' }> = {
        type: 'locality', id: 40, name: 'город Тверь', shortName: 'г. Тверь', countryId: 143, regionId: 20, districtId: 30,
        isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
      };
      service.saveToponym('locality', 40, form, parents, 'view-edit').subscribe();
      const body = captureSave('update-toponym');
      expect(body).toEqual(expected);
      expect(toponymUpdateSchema.safeParse(body).success).toBeTrue();
    });
  });

  it('does not mutate a broad form or hierarchy selection while composing a create request', () => {
    const form: ToponymFormControlsValues = Object.freeze({
      name: 'Тверская область', shortName: 'Тверская обл.', postName: 'Калининский район', shortPostName: 'Калининский р-н',
      isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
    });
    const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
    const originalForm = { ...form };
    const originalParents = structuredClone(parents);
    service.saveToponym('region', null, form, parents, 'create').subscribe();
    captureSave('create-toponym');
    expect(form).toEqual(originalForm);
    expect(Object.keys(form)).toEqual(Object.keys(originalForm));
    expect(parents).toEqual(originalParents);
  });

  it('does not mutate a broad form or hierarchy selection while composing an update request', () => {
    const form: ToponymFormControlsValues = Object.freeze({
      name: 'город Тверь', shortName: 'г. Тверь', postName: 'Калининский район', shortPostName: 'Калининский р-н',
      isFederalCity: false, isCapitalOfRegion: true, isCapitalOfDistrict: false,
    });
    const parents: AddressFilter = { countries: [143], regions: [20], districts: [30], localities: [40] };
    const originalForm = { ...form };
    const originalParents = structuredClone(parents);
    service.saveToponym('locality', 40, form, parents, 'view-edit').subscribe();
    captureSave('update-toponym');
    expect(form).toEqual(originalForm);
    expect(Object.keys(form)).toEqual(Object.keys(originalForm));
    expect(parents).toEqual(originalParents);
  });
});
