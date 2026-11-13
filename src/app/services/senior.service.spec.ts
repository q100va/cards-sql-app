import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { seniorsQueryDTOSchema } from '../../../shared/schemas/senior.schema';
import { environment } from '../../environments/environment';
import { AllFilterParameters, createEmptyGeneralFilter } from '../interfaces/base-list';
import { MessageWrapperService } from './message.service';
import { SeniorService } from './senior.service';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';
import { Senior, SeniorDraft } from '../interfaces/advanced-model';
import { ValidationError } from '../utils/validate-response';
import {
  bulkUpdateSchema, checkSeniorDataSchema, seniorBlockingSchema, seniorDraftSchema,
  seniorIdSchema, seniorPreSchema, seniorSchema, SeniorRaw, SeniorRow, updateSeniorDataSchema,
} from '../../../shared/schemas/senior.schema';

describe('SeniorService list search', () => {
  let service: SeniorService;
  let http: HttpTestingController;
  let filters: AllFilterParameters;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), SeniorService,
        { provide: MessageWrapperService, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(SeniorService);
    http = TestBed.inject(HttpTestingController);
    filters = {
      viewOption: 'all', viewHomeOption: 'all', includeOutdated: false,
      searchValue: 'smith', exactMatch: false,
      sortParameters: { active: '', direction: '' },
      filter: {
        ...createEmptyGeneralFilter(),
        homes: [{ id: 13, name: 'Test Home' }], gender: 'female',
        birthDate: { dayRange: [1, 31], monthRange: [5, 5], yearRange: [1940, 1950] },
      },
      addressFilter: { countries: [143], regions: [2], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: false,
    };
  });

  afterEach(() => http.verify());

  function expectListRequest(search: { value: string; exact?: boolean } | undefined): void {
    const request = http.expectOne(environment.apiUrl + '/api/seniors/get-seniors');
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON list request');
    const body: Record<string, unknown> = JSON.parse(serialized);
    request.flush({ data: { list: [], length: 0 } });

    expect(body['page']).toEqual({ size: 20, number: 0 });
    expect(body['filters']).toEqual({
      general: {
        homes: [13], gender: 'female',
        dayRange: [1, 31], monthRange: [5, 5], yearRange: [1940, 1950],
      },
      address: { countries: [143], regions: [2] },
      mode: { strictDetail: false },
    });
    expect(body['search']).toEqual(search);
    if (search === undefined) expect(Object.keys(body)).not.toContain('search');
    const parsed = seniorsQueryDTOSchema.safeParse(body);
    expect(parsed.success).withContext('Serialized request must satisfy seniorsQueryDTOSchema').toBeTrue();
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

describe('SeniorService domain contracts', () => {
  let service: SeniorService;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/api/seniors';

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), SeniorService,
      { provide: MessageWrapperService, useValue: messages },
      { provide: TranslateService, useValue: {} },
    ] });
    service = TestBed.inject(SeniorService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function bodyOf(request: TestRequest): unknown {
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected JSON Senior request');
    return JSON.parse(serialized);
  }

  function seniorResponse() {
    return {
      id: 10, firstName: 'Анна', patronymic: null, lastName: 'Иванова', gender: 'female',
      isRestricted: false, dateOfStart: '2026-01-02T10:00:00.000Z', causeOfRestriction: null, dateOfRestriction: null,
      address: {
        country: { id: 143, name: 'Россия' }, region: { id: 2, shortName: 'Тверская обл.' },
        district: { id: 3, shortName: 'Калининский р-н' }, locality: { id: 4, shortName: 'г. Тверь' },
        fullPostalAddress: 'Тверская область, Тверь',
      },
      comment: null, birthDate: '1940-05-12T00:00:00.000Z',
      confirmedFirstName: true, confirmedPatronymic: false, confirmedLastName: true, confirmedBirthDate: false,
      infoNote: null, photoLink: null, dateOfConsent: null, personalNoAddr: false,
      kindergarten: null, teacher: null, veteran: null, childOfWar: null, profession: null,
      honoraryStatus: null, interests: null, orthodoxBeliever: null, dateOfExit: null,
      spouseFullName: null, spouseId: null, homeId: 20,
      home: {
        homeName: 'Дом А', noAddress: false, specialHome: false, acceptableForSchool: true,
        isRestricted: false, dateOfRestriction: null, isClose: false, dateOfClose: null,
      },
      outdatedData: { names: [{ id: 81, firstName: 'Анна', patronymic: null, lastName: 'Петрова' }] },
    };
  }

  function draft(): SeniorDraft {
    return {
      id: null, firstName: 'Анна', patronymic: null, lastName: 'Иванова',
      birthDate: new Date('1940-05-12T00:00:00.000Z'), gender: 'female',
      confirmedFirstName: true, confirmedPatronymic: false, confirmedLastName: true, confirmedBirthDate: false,
      comment: null, isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      infoNote: null, photoLink: null, dateOfConsent: null, personalNoAddr: false,
      kindergarten: null, teacher: null, veteran: null, childOfWar: null, profession: null,
      honoraryStatus: null, interests: null, orthodoxBeliever: null, dateOfExit: null, spouseId: null, homeId: 20,
    };
  }

  function listFilters(): AllFilterParameters {
    return {
      viewOption: 'only-active', viewHomeOption: 'exclude-closed', includeOutdated: false,
      searchValue: ' Анна ', exactMatch: true, sortParameters: { active: 'birthDate', direction: 'asc' },
      filter: createEmptyGeneralFilter(),
      addressFilter: { countries: [143], regions: [2], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: true,
    };
  }

  it('serializes date ranges, selected IDs, false filters, and exact search without mutating callers', () => {
    const filters = listFilters();
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');
    Object.assign(filters.filter, {
      dateBeginningRange: [from, to], dateRestrictionRange: [from, to], dateExitRange: [from, to],
      homes: [{ id: 20, name: 'Дом А' }], details: [{ value: 'photoLink', label: 'Photo' }],
      gender: 'female', noAddress: false, specialHome: false, acceptableForSchool: true,
      hideWithoutYear: true, hideWithoutBirthday: false,
    });
    const original = structuredClone(filters);
    service.getList(filters, 25, 2).subscribe();
    const request = http.expectOne(base + '/get-seniors');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    request.flush({ data: { list: [seniorResponse()], length: 1 } });
    expect(body).toEqual({
      page: { size: 25, number: 2 }, sort: [{ field: 'birthDate', direction: 'asc' }],
      search: { value: ' Анна ', exact: true }, view: { option: 'only-active', homeOption: 'exclude-closed', includeOutdated: false },
      filters: {
        general: {
          dateBeginningRange: ['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'],
          dateRestrictionRange: ['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'],
          dateExitRange: ['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'],
          homes: [20], gender: 'female', details: ['photoLink'], noAddress: false,
          specialHome: false, acceptableForSchool: true, hideWithoutYear: true,
        },
        address: { countries: [143], regions: [2] }, mode: { strictDetail: true },
      },
    });
    expect(seniorsQueryDTOSchema.safeParse(body).success).toBeTrue();
    expect(filters).toEqual(original);
    expect(filters.filter.dateBeginningRange[0]).toBe(from);
  });

  it('omits absent and incomplete date ranges and disabled birthday hiding filters', () => {
    const filters = listFilters();
    filters.filter.dateRestrictionRange = [new Date('2026-01-01T00:00:00.000Z')];
    service.getList(filters, 20, 0).subscribe();
    const request = http.expectOne(base + '/get-seniors');
    const body = bodyOf(request);
    request.flush({ data: { list: [], length: 0 } });
    expect(body).toEqual(jasmine.objectContaining({
      filters: { address: { countries: [143], regions: [2] }, mode: { strictDetail: true } },
    }));
    expect(seniorsQueryDTOSchema.safeParse(body).success).toBeTrue();
    expect(filters.filter.dateRestrictionRange.length).toBe(1);
  });

  it('validates details while retaining false confirmations, nullable data, dates, and name history', () => {
    let received: Senior | undefined;
    service.getById(10).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-senior-by-id/10');
    expect(request.request.method).toBe('GET');
    request.flush({ data: seniorResponse() });
    expect(received?.dateOfStart).toEqual(new Date('2026-01-02T10:00:00.000Z'));
    expect(received?.birthDate).toEqual(new Date('1940-05-12T00:00:00.000Z'));
    expect(received?.confirmedBirthDate).toBeFalse();
    expect(received?.confirmedPatronymic).toBeFalse();
    expect(received?.spouseId).toBeNull();
    expect(received?.outdatedData.names).toEqual(seniorResponse().outdatedData.names);
  });

  it('rejects missing confirmation fields at the type and response-validation boundaries', () => {
    spyOn(console, 'error');
    const { confirmedFirstName, confirmedPatronymic, confirmedLastName, confirmedBirthDate, ...withoutConfirmations } =
      seniorSchema.parse(seniorResponse());
    // @ts-expect-error Intentionally malformed response: required Senior confirmation fields are omitted to verify runtime validation.
    const frontendPermitted: Senior = withoutConfirmations;
    let received: unknown;
    service.getById(10).subscribe({ next: () => fail('Expected schema rejection'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/get-senior-by-id/10').flush({ data: frontendPermitted });
    expect(seniorSchema.safeParse(frontendPermitted).success).toBeFalse();
    expect(received).toBeInstanceOf(ValidationError);
    if (received instanceof ValidationError) expect(received.code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('creates a schema-valid Senior with date-only input semantics and explicit false confirmations', () => {
    const input = draft();
    const original = structuredClone(input);
    let name: string | undefined;
    service.saveOwner(input).subscribe(res => { name = res.data; });
    const request = http.expectOne(base + '/create-senior');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    request.flush({ data: 'Анна Иванова' });
    expect(body).toEqual({ ...original, birthDate: '1940-05-12T00:00:00.000Z' });
    const parsed = seniorDraftSchema.parse(body);
    expect(parsed.birthDate).toBe('1940-05-12');
    expect(parsed.confirmedBirthDate).toBeFalse();
    expect(input).toEqual(original);
    expect(name).toBe('Анна Иванова');
  });

  it('omits a new Senior null ID from duplicate checks so the backend schema accepts the request', () => {
    const input = draft();
    const original = structuredClone(input);
    service.checkOwnerData({ ...input, id: 10 }).subscribe();
    const editing = http.expectOne(base + '/check-senior-data/');
    expect(editing.request.method).toBe('POST');
    expect(bodyOf(editing)).toEqual({ id: 10, firstName: 'Анна', patronymic: null, lastName: 'Иванова', homeId: 20, birthDate: '1940-05-12T00:00:00.000Z' });
    expect(checkSeniorDataSchema.safeParse(bodyOf(editing)).success).toBeTrue();
    editing.flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    service.checkOwnerData(input).subscribe();
    const request = http.expectOne(base + '/check-senior-data/');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    request.flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    expect(body).toEqual({ firstName: 'Анна', patronymic: null, lastName: 'Иванова', homeId: 20, birthDate: '1940-05-12T00:00:00.000Z' });
    expect(checkSeniorDataSchema.safeParse(body).success).toBeTrue();
    expect(input).toEqual(original);
  });

  it('preserves independent name history actions, nullable changes, and false values during updates', () => {
    const update: Parameters<SeniorService['saveUpdatedOwner']>[1] = {
      changingData: { main: { comment: null, confirmedBirthDate: false, spouseId: null, birthDate: null } },
      restoringData: { names: [81] },
      outdatingData: { names: { firstName: 'Анна', patronymic: null, lastName: 'Иванова' } },
      deletingData: { names: [82] },
    };
    const original = structuredClone(update);
    service.saveUpdatedOwner(10, update).subscribe();
    const request = http.expectOne(base + '/update-senior');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    request.flush({ data: seniorResponse() });
    expect(body).toEqual({ id: 10, ...original });
    expect(updateSeniorDataSchema.safeParse(body).success).toBeTrue();
    expect(update).toEqual(original);
  });

  it('keeps an editor-supported homeId change through backend request-schema parsing', () => {
    const update: Parameters<SeniorService['saveUpdatedOwner']>[1] = {
      changingData: { main: { homeId: 21 } }, restoringData: { names: null },
      outdatingData: { names: null }, deletingData: { names: null },
    };
    service.saveUpdatedOwner(10, update).subscribe();
    const request = http.expectOne(base + '/update-senior');
    const body = bodyOf(request);
    request.flush({ data: seniorResponse() });
    expect(body).toEqual({ id: 10, ...update });
    // The middleware replaces req.body with parsed data, so acceptance alone is insufficient.
    const parsed = updateSeniorDataSchema.parse(body);
    const parsedMain: unknown = parsed.changingData.main;
    expect(parsedMain).toEqual({ homeId: 21 });
  });

  it('sends schema-valid restriction and unrestriction PATCH bodies', () => {
    service.blockOwner(10, 'Проверка согласия').subscribe();
    const block = http.expectOne(base + '/block-senior/');
    expect(block.request.method).toBe('PATCH');
    expect(bodyOf(block)).toEqual({ id: 10, causeOfRestriction: 'Проверка согласия' });
    expect(seniorBlockingSchema.safeParse(bodyOf(block)).success).toBeTrue();
    block.flush({ data: null });
    service.unblockOwner(10).subscribe();
    const unblock = http.expectOne(base + '/unblock-senior/');
    expect(unblock.request.method).toBe('PATCH');
    expect(bodyOf(unblock)).toEqual({ id: 10 });
    expect(seniorIdSchema.safeParse(bodyOf(unblock)).success).toBeTrue();
    unblock.flush({ data: null });
  });

  it('checks dependencies and deletes the selected Senior using its path ID', () => {
    let count: number | undefined;
    service.checkPossibilityToDeleteOwner(10).subscribe(res => { count = res.data; });
    const check = http.expectOne(base + '/check-senior-before-delete/10');
    expect(check.request.method).toBe('GET');
    check.flush({ data: 0 });
    expect(count).toBe(0);
    service.deleteOwner(10).subscribe();
    const request = http.expectOne(base + '/delete-senior/10');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush({ data: null });
  });

  it('compares bulk rows with explicit comment/month choices and validates the difference groups', () => {
    const rows: SeniorRow[] = [{
      nursingHome: 'Дом А', firstName: 'Анна', lastName: null, patronymic: null, gender: 'female',
      dateOfConsent: null, dayBirthday: 12, monthBirthday: 5, yearBirthday: 1940, birthDate: '1940-05-12',
    }];
    const original = structuredClone(rows);
    const months = [5, 6];
    let received: unknown;
    service.compareLists(rows, 'Дом А', false, months).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/compare-seniors-lists/');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual({ newList: original, homeName: 'Дом А', commentsMode: false, chosenMonths: [5, 6] });
    expect(seniorPreSchema.safeParse(rows[0]).success).toBeTrue();
    const differences = { newSeniors: [], removedSeniors: [], updatedSeniors: [], possibleDuplicates: [], returnedSeniors: [] };
    request.flush({ data: { differences, homeId: 20 } });
    expect(received).toEqual({ differences, homeId: 20 });
    expect(rows).toEqual(original);
    expect(months).toEqual([5, 6]);
  });

  it('serializes bulk-update dates and accepted changes without mutating the rows or Date', () => {
    const admitted: SeniorRaw[] = [{
      homeId: 20, firstName: 'Анна', lastName: null, patronymic: null, birthDate: '1940-05-12', gender: 'female',
      dateOfConsent: null, dateOfExit: null, comment: null, infoNote: null, photoLink: null, kindergarten: null,
      teacher: null, veteran: null, childOfWar: null, profession: null, honoraryStatus: null, interests: null, orthodoxBeliever: null,
    }];
    const original = structuredClone(admitted);
    const date = new Date('2026-06-01T12:30:00.000Z');
    const updated = [{ seniorId: 11, changes: { comment: null, dateOfExit: '2026-05-31' } }];
    let received: unknown;
    service.updateList(admitted, [], updated, 20, date).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/update-seniors-list/');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    expect(body).toEqual({ admitted: original, removed: [], updated, homeId: 20, dateOfUpdate: '2026-06-01T12:30:00.000Z' });
    expect(bulkUpdateSchema.safeParse(body).success).toBeTrue();
    request.flush({ data: { createdCount: 1, removedCount: 0, updatedCount: 1 } });
    expect(received).toEqual({ createdCount: 1, removedCount: 0, updatedCount: 1 });
    expect(admitted).toEqual(original);
    expect(date.toISOString()).toBe('2026-06-01T12:30:00.000Z');
  });

  it('propagates HTTP errors without fallback values or service-owned console diagnostics', () => {
    const diagnostic = spyOn(console, 'error');
    let received: unknown;
    service.getById(10).subscribe({ next: () => fail('Expected HTTP error'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/get-senior-by-id/10').flush({ code: 'ERRORS.DATA_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(404);
      expect(received.error).toEqual({ code: 'ERRORS.DATA_NOT_FOUND' });
    }
    expect(diagnostic).not.toHaveBeenCalled();
  });
});
