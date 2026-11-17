import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { partnersQueryDTOSchema } from '../../../shared/schemas/partner.schema';
import { environment } from '../../environments/environment';
import { AllFilterParameters, createEmptyGeneralFilter } from '../interfaces/base-list';
import { MessageWrapperService } from './message.service';
import { PartnerService } from './partner.service';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';
import { Partner, PartnerDraft, RelationPick } from '../interfaces/advanced-model';
import { ValidationError } from '../utils/validate-response';
import {
  checkPartnerDataSchema, partnerBlockingSchema, partnerDraftSchema, partnerIdSchema, updatePartnerDataSchema,
} from '../../../shared/schemas/partner.schema';

describe('PartnerService list search', () => {
  let service: PartnerService;
  let http: HttpTestingController;
  let filters: AllFilterParameters;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), PartnerService,
        { provide: MessageWrapperService, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(PartnerService);
    http = TestBed.inject(HttpTestingController);
    filters = {
      viewOption: 'all', viewHomeOption: 'all', includeOutdated: false,
      searchValue: 'smith', exactMatch: false,
      sortParameters: { active: '', direction: '' },
      filter: {
        ...createEmptyGeneralFilter(),
        affiliations: [1],
        homes: [{ id: 13, name: 'Test Home' }],
        homeRegions: [{ id: 2, name: 'Test Region' }],
      },
      addressFilter: { countries: [143], regions: [2], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: false,
    };
  });

  afterEach(() => http.verify());

  function expectListRequest(search: { value: string; exact?: boolean } | undefined): void {
    const request = http.expectOne(environment.apiUrl + '/api/partners/get-partners');
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON list request');
    const body: Record<string, unknown> = JSON.parse(serialized);
    request.flush({ data: { list: [], length: 0 } });

    expect(body['page']).toEqual({ size: 20, number: 0 });
    expect(body['filters']).toEqual({
      general: { affiliations: [1], homes: [13], homeRegions: [2] },
      address: { countries: [143], regions: [2] },
      mode: { strictAddress: false, strictContact: false, strictDetail: false },
    });
    expect(body['search']).toEqual(search);
    if (search === undefined) expect(Object.keys(body)).not.toContain('search');
    const parsed = partnersQueryDTOSchema.safeParse(body);
    expect(parsed.success).withContext('Serialized request must satisfy partnersQueryDTOSchema').toBeTrue();
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

describe('PartnerService domain contracts', () => {
  let service: PartnerService;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/api/partners';

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), PartnerService,
      { provide: MessageWrapperService, useValue: messages },
      { provide: TranslateService, useValue: {} },
    ] });
    service = TestBed.inject(PartnerService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function bodyOf(request: TestRequest): unknown {
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected JSON Partner request');
    return JSON.parse(serialized);
  }

  function partnerResponse() {
    return {
      id: 10, firstName: 'Иван', patronymic: null, lastName: 'Петров', affiliation: 1, position: null,
      isRestricted: false, dateOfStart: '2026-01-02T10:00:00.000Z', causeOfRestriction: null, dateOfRestriction: null,
      address: { country: { id: 143, name: 'Россия' }, region: null, district: null, locality: null }, comment: null,
      orderedContacts: { email: [{ id: 51, content: 'ivan@example.com' }] },
      outdatedData: {
        contacts: { email: [{ id: 52, content: 'old@example.com' }] },
        addresses: [{ id: 61, country: { id: 143, name: 'Россия' }, region: null, district: null, locality: null, isRecoverable: true }],
        names: [{ id: 62, firstName: 'Иван', patronymic: null, lastName: 'Иванов' }],
        coordinations: [{ id: 63, partnerId: 10, homeId: 20, homeName: 'Прежний дом', isRecoverable: true, homeStatus: 'blocked' }],
      },
      coordinations: [{ id: 64, partnerId: 10, homeId: 21, homeName: 'Текущий дом', isRecoverable: false, homeStatus: 'active' }],
    };
  }

  function draft(): PartnerDraft {
    return {
      id: null, firstName: 'Иван', patronymic: null, lastName: 'Петров', affiliation: 1, position: null,
      comment: null, isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      draftAddress: { countryId: 143, regionId: null, districtId: null, localityId: null },
      draftContacts: {
        email: ['ivan@example.com'], phoneNumber: [], whatsApp: [], telegramNickname: [], telegramId: [],
        telegramPhoneNumber: [], vKontakte: [], instagram: [], facebook: [], website: [], otherContact: [],
      },
      draftCoordinations: [20, 21],
    };
  }

  it('serializes coordination/contact filters and ISO date ranges while preserving false values and caller Dates', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');
    const filters: AllFilterParameters = {
      viewOption: 'only-active', viewHomeOption: 'all', includeOutdated: false,
      searchValue: ' Иван ', exactMatch: true, sortParameters: { active: 'affiliation', direction: 'desc' },
      filter: {
        ...createEmptyGeneralFilter(), affiliations: [1], hasCoordination: false,
        homes: [{ id: 20, name: 'Дом А' }], homeRegions: [{ id: 2, name: 'Тверская область' }],
        details: [{ value: 'comment', label: 'Комментарий' }], contactTypes: [{ type: 'email', label: 'Email' }],
        dateBeginningRange: [from, to], dateRestrictionRange: [from, to],
      },
      addressFilter: { countries: [143], regions: [], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: true, strongDetailFilter: false,
    };
    const original = structuredClone(filters);
    let length: number | undefined;
    service.getList(filters, 25, 1).subscribe(res => { length = res.data.length; });
    const request = http.expectOne(base + '/get-partners');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    expect(body).toEqual({
      page: { size: 25, number: 1 }, sort: [{ field: 'affiliation', direction: 'desc' }],
      search: { value: ' Иван ', exact: true }, view: { option: 'only-active', includeOutdated: false },
      filters: {
        general: {
          affiliations: [1], details: ['comment'], contactTypes: ['email'], hasCoordination: false, homes: [20], homeRegions: [2],
          dateBeginningRange: ['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'],
          dateRestrictionRange: ['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'],
        },
        address: { countries: [143] }, mode: { strictAddress: false, strictContact: true, strictDetail: false },
      },
    });
    expect(partnersQueryDTOSchema.safeParse(body).success).toBeTrue();
    request.flush({ data: { list: [partnerResponse()], length: 1 } });
    expect(length).toBe(1);
    expect(filters).toEqual(original);
    expect(filters.filter.dateBeginningRange[0]).toBe(from);
  });

  it('validates details without merging current coordinations and contacts into their stored history', () => {
    let received: Partner | undefined;
    service.getById(10).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-partner-by-id/10');
    expect(request.request.method).toBe('GET');
    request.flush({ data: partnerResponse() });
    expect(received?.dateOfStart).toEqual(new Date('2026-01-02T10:00:00.000Z'));
    expect(received?.position).toBeNull();
    expect(received?.coordinations).toEqual(partnerResponse().coordinations);
    expect(received?.outdatedData).toEqual(partnerResponse().outdatedData);
    expect(received?.orderedContacts).toEqual({ email: [{ id: 51, content: 'ivan@example.com' }] });
  });

  it('rejects coordination history missing the required recoverability flag', () => {
    spyOn(console, 'error');
    const response = partnerResponse();
    const { isRecoverable, ...invalidCoordination } = response.outdatedData.coordinations[0];
    let received: unknown;
    service.getById(10).subscribe({ next: () => fail('Expected history rejection'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/get-partner-by-id/10').flush({ data: {
      ...response, outdatedData: { ...response.outdatedData, coordinations: [invalidCoordination] },
    } });
    expect(received).toBeInstanceOf(ValidationError);
    if (received instanceof ValidationError) expect(received.code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('creates a Partner with explicit contact arrays, nullable address sections, and coordination IDs', () => {
    const input = draft();
    let name: string | undefined;
    service.saveOwner(input).subscribe(res => { name = res.data; });
    const request = http.expectOne(base + '/create-partner');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual(input);
    expect(partnerDraftSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: 'Иван Петров' });
    expect(name).toBe('Иван Петров');
  });

  it('omits a new Partner null ID from duplicate checks so the backend schema accepts the request', () => {
    const input = draft();
    const original = structuredClone(input);
    service.checkOwnerData({ ...input, id: 10 }).subscribe();
    const editing = http.expectOne(base + '/check-partner-data/');
    expect(editing.request.method).toBe('POST');
    expect(bodyOf(editing)).toEqual({ id: 10, firstName: 'Иван', lastName: 'Петров', contacts: original.draftContacts });
    expect(checkPartnerDataSchema.safeParse(bodyOf(editing)).success).toBeTrue();
    editing.flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    service.checkOwnerData(input).subscribe();
    const request = http.expectOne(base + '/check-partner-data/');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    request.flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    expect(body).toEqual({ firstName: 'Иван', lastName: 'Петров', contacts: original.draftContacts });
    expect(checkPartnerDataSchema.safeParse(body).success).toBeTrue();
    expect(input).toEqual(original);
  });

  it('preserves separate coordination/contact restoration, outdating, and deletion sections during updates', () => {
    const update: Parameters<PartnerService['saveUpdatedOwner']>[1] = {
      changingData: { main: { position: null }, address: null, contacts: null, coordinations: [21] },
      restoringData: { names: [62], addresses: [61], contacts: null, coordinations: [63] },
      outdatingData: { names: null, address: null, contacts: [51], coordinations: [64] },
      deletingData: { names: null, addresses: null, contacts: [52], coordinations: [65] },
    };
    const original = structuredClone(update);
    service.saveUpdatedOwner(10, update).subscribe();
    const request = http.expectOne(base + '/update-partner');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    request.flush({ data: partnerResponse() });
    expect(body).toEqual({ id: 10, ...original });
    expect(updatePartnerDataSchema.safeParse(body).success).toBeTrue();
    expect(update).toEqual(original);
  });

  it('keeps restriction flags on the full pick list and accepts the active pick-list shape separately', () => {
    let all: RelationPick[] | undefined;
    let active: RelationPick[] | undefined;
    service.getPartnersPickList().subscribe(value => { all = value; });
    const full = http.expectOne(base + '/get-list-of-partners');
    expect(full.request.method).toBe('GET');
    full.flush({ data: [{ id: 10, name: 'Иван', isRestricted: false }, { id: 11, name: 'Анна', isRestricted: true }] });
    expect(all).toEqual([{ id: 10, name: 'Иван', isRestricted: false }, { id: 11, name: 'Анна', isRestricted: true }]);
    service.getActivePartnersPickList().subscribe(value => { active = value; });
    const selected = http.expectOne(base + '/get-list-of-active-partners');
    expect(selected.request.method).toBe('GET');
    selected.flush({ data: [{ id: 10, name: 'Иван' }] });
    expect(active).toEqual([{ id: 10, name: 'Иван' }]);
  });

  it('checks deletion and blocking dependencies using their distinct endpoints', () => {
    let deleting: number | undefined;
    let blocking: number | undefined;
    service.checkPossibilityToDeleteOwner(10).subscribe(res => { deleting = res.data; });
    const deletion = http.expectOne(base + '/check-partner-before-delete/10');
    expect(deletion.request.method).toBe('GET');
    deletion.flush({ data: 3 });
    service.checkPossibilityToBlockPartner(10).subscribe(res => { blocking = res.data; });
    const restriction = http.expectOne(base + '/check-partner-before-block/10');
    expect(restriction.request.method).toBe('GET');
    restriction.flush({ data: 1 });
    expect(deleting).toBe(3);
    expect(blocking).toBe(1);
  });

  it('uses schema-valid restriction bodies and the dedicated deletion path for a Partner', () => {
    service.blockOwner(10, 'Нет согласия').subscribe();
    const block = http.expectOne(base + '/block-partner/');
    expect(block.request.method).toBe('PATCH');
    expect(bodyOf(block)).toEqual({ id: 10, causeOfRestriction: 'Нет согласия' });
    expect(partnerBlockingSchema.safeParse(bodyOf(block)).success).toBeTrue();
    block.flush({ data: null });
    service.unblockOwner(10).subscribe();
    const unblock = http.expectOne(base + '/unblock-partner/');
    expect(unblock.request.method).toBe('PATCH');
    expect(bodyOf(unblock)).toEqual({ id: 10 });
    expect(partnerIdSchema.safeParse(bodyOf(unblock)).success).toBeTrue();
    unblock.flush({ data: null });
    service.deleteOwner(10).subscribe();
    const deletion = http.expectOne(base + '/delete-partner/10');
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body).toBeNull();
    deletion.flush({ data: null });
  });

  it('propagates detail HTTP failures without returning fallback data or logging twice', () => {
    const diagnostic = spyOn(console, 'error');
    let received: unknown;
    service.getById(10).subscribe({ next: () => fail('Expected HTTP error'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/get-partner-by-id/10').flush({ code: 'ERRORS.DATA_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(404);
      expect(received.error).toEqual({ code: 'ERRORS.DATA_NOT_FOUND' });
    }
    expect(diagnostic).not.toHaveBeenCalled();
  });
});
