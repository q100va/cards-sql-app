import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { changingAddressSchema, homeSchema, homesQueryDTOSchema, updateHomeDataSchema } from '../../../shared/schemas/home.schema';
import { environment } from '../../environments/environment';
import { HomeChangingData, HomeOutdatingData } from '../interfaces/advanced-model';
import { ApiResponse } from '../interfaces/api-response';
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

describe('HomeService update request contract', () => {
  type FrontendUpdate = Parameters<HomeService['saveUpdatedOwner']>[1];
  type BackendUpdate = z.output<typeof updateHomeDataSchema>;
  const postalAddress: z.output<typeof changingAddressSchema> = {
    countryId: 143, regionId: 20, districtId: 30, localityId: 40,
    postalCode: '123456', postalName: 'Example Home', postalAddressPart: 'Building 2',
  };
  const home = homeSchema.parse({
    id: 10, homeName: 'Example Home', officialName: 'Previous Official Home',
    noAddress: false, specialHome: false, acceptableForSchool: true,
    isRestricted: false, dateOfStart: '2026-01-15T00:00:00.000Z',
    causeOfRestriction: null, dateOfRestriction: null, comment: null, infoNote: null,
    address: {
      id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
      district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
      postalCode: '123456', postalName: 'Example Home', postalAddressPart: 'Building 1',
      fullPostalAddress: '123456 Country, Region, District, Locality, Building 1', isRecoverable: true,
    },
    orderedContacts: {}, outdatedData: { contacts: {}, addresses: [], officialNames: [], coordinations: [] },
    coordinations: [], dateOfLastUpdate: null, isClose: false, dateOfClose: null,
  });
  let service: HomeService;
  let http: HttpTestingController;

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), HomeService,
        { provide: MessageWrapperService, useValue: messages },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(HomeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function emptyUpdate(): FrontendUpdate {
    return {
      changingData: { main: null, address: null, contacts: null, coordinations: null },
      restoringData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
      outdatingData: { address: null, officialName: null, contacts: null, coordinations: null },
      deletingData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
    };
  }

  function sendUpdate(update: FrontendUpdate): unknown {
    let received: unknown;
    service.saveUpdatedOwner(10, update).subscribe(value => { received = value; });
    const request = http.expectOne(environment.apiUrl + '/api/homes/update-home');
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON Home update');
    const body: unknown = JSON.parse(serialized);
    request.flush({ data: home });
    expect(received).toEqual({ data: home, code: undefined });
    return body;
  }

  it('sends a complete postal-address-only update unchanged and accepted by the backend schema', () => {
    const update = emptyUpdate();
    update.changingData.address = postalAddress;
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.safeParse(body).success).toBeTrue();
    expect(body).not.toEqual(jasmine.objectContaining({ draftAddress: jasmine.anything(), draftContacts: jasmine.anything() }));
  });

  it('preserves an explicitly null postalAddressPart in an otherwise complete address', () => {
    const update = emptyUpdate();
    const address = { ...postalAddress, postalAddressPart: null };
    update.changingData.address = address;
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.parse(body).changingData.address).toEqual(address);
  });

  it('keeps an omitted postalAddressPart absent on the wire while the schema normalizes it to null', () => {
    const { postalAddressPart: _postalAddressPart, ...address } = postalAddress;
    const update = emptyUpdate();
    update.changingData.address = address;
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.parse(body).changingData.address).toEqual({ ...address, postalAddressPart: null });
  });

  it('sends an official-name change in main without inventing archival or address changes', () => {
    const update = emptyUpdate();
    update.changingData.main = { officialName: 'Updated Official Home' };
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.safeParse(body).success).toBeTrue();
  });

  it('preserves the backend official-name archival wrapper and all unrelated null sections', () => {
    const update: Omit<BackendUpdate, 'id'> = {
      ...emptyUpdate(),
      changingData: { main: null, address: null, contacts: null, coordinations: null },
      outdatingData: { address: null, officialName: { officialName: 'Previous Official Home' }, contacts: null, coordinations: null },
    };
    // @ts-expect-error The current frontend DTO rejects this valid backend official-name wrapper.
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.safeParse(body).success).toBeTrue();
  });

  it('preserves a valid combined address change, official-name change, and archival request', () => {
    const update: Omit<BackendUpdate, 'id'> = {
      ...emptyUpdate(),
      changingData: { main: { officialName: 'Updated Official Home' }, address: postalAddress, contacts: null, coordinations: null },
      outdatingData: { address: 50, officialName: { officialName: 'Previous Official Home' }, contacts: null, coordinations: null },
    };
    // @ts-expect-error The current frontend DTO rejects this valid backend official-name wrapper.
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.safeParse(body).success).toBeTrue();
  });

  it('preserves nullable members in all four required update sections', () => {
    const update = emptyUpdate();
    const body = sendUpdate(update);
    expect(body).toEqual({ id: 10, ...update });
    expect(updateHomeDataSchema.safeParse(body).success).toBeTrue();
  });

  it('requires the four section objects even when their members can be null', () => {
    const valid = { id: 10, ...emptyUpdate() };
    for (const section of ['changingData', 'restoringData', 'outdatingData', 'deletingData'] as const) {
      const { [section]: _omitted, ...incomplete } = valid;
      const parsed = updateHomeDataSchema.safeParse(incomplete);
      expect(parsed.success).withContext(section + ' must not be omitted').toBeFalse();
      if (!parsed.success) expect(parsed.error.issues.some(issue => issue.path[0] === section)).toBeTrue();
    }
  });

  function expectBackendRejection(update: FrontendUpdate, paths: string[]): void {
    const parsed = updateHomeDataSchema.safeParse({ id: 10, ...update });
    expect(parsed.success).toBeFalse();
    if (!parsed.success) {
      const rejectedPaths = [...new Set(parsed.error.issues.map(issue => issue.path.join('.')))];
      expect(rejectedPaths).toEqual(paths);
    }
  }

  // Current frontend DTOs accept these counterexamples; the authoritative backend contract must reject them.
  it('rejects missing postalCode despite its representability through the frontend address DTO', () => {
    const { postalCode: _postalCode, ...address } = postalAddress;
    const update = emptyUpdate();
    update.changingData.address = address;
    expectBackendRejection(update, ['changingData.address.postalCode']);
  });

  it('rejects missing postalName despite its representability through the frontend address DTO', () => {
    const { postalName: _postalName, ...address } = postalAddress;
    const update = emptyUpdate();
    update.changingData.address = address;
    expectBackendRejection(update, ['changingData.address.postalName']);
  });

  it('rejects the general-address-only shape currently permitted by the frontend Home DTO', () => {
    const address: NonNullable<HomeChangingData['address']> = { countryId: 143, regionId: 20, districtId: 30, localityId: 40 };
    const update = emptyUpdate();
    update.changingData.address = address;
    expectBackendRejection(update, ['changingData.address.postalCode', 'changingData.address.postalName']);
  });

  for (const field of ['countryId', 'regionId', 'districtId', 'localityId'] as const) {
    it(`rejects null ${field} despite its representability through the frontend Home DTO`, () => {
      const address: NonNullable<HomeChangingData['address']> = { ...postalAddress, [field]: null };
      const update = emptyUpdate();
      update.changingData.address = address;
      expectBackendRejection(update, ['changingData.address.' + field]);
    });
  }

  it('rejects the string-only official-name archival shape declared by the frontend DTO', () => {
    const outdating: HomeOutdatingData = { address: null, officialName: 'Previous Official Home', contacts: null, coordinations: null };
    const update = { ...emptyUpdate(), outdatingData: outdating };
    expectBackendRejection(update, ['outdatingData.officialName']);
  });
});
