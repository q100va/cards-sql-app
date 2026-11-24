import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { usersQueryDTOSchema } from '../../../shared/schemas/user.schema';
import { environment } from '../../environments/environment';
import { AllFilterParameters, createEmptyGeneralFilter } from '../interfaces/base-list';
import { MessageWrapperService } from './message.service';
import { UserService } from './user.service';

describe('UserService list search', () => {
  let service: UserService;
  let http: HttpTestingController;
  let filters: AllFilterParameters;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), UserService,
        { provide: MessageWrapperService, useValue: {} },
        { provide: TranslateService, useValue: {} },
      ],
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
    filters = {
      viewOption: 'all', viewHomeOption: 'all', includeOutdated: false,
      searchValue: 'smith', exactMatch: false,
      sortParameters: { active: '', direction: '' },
      filter: {
        ...createEmptyGeneralFilter(),
        roles: [{ id: 7, name: 'Coordinator' }],
        contactTypes: [{ type: 'email', label: 'Email' }],
      },
      addressFilter: { countries: [143], regions: [2], districts: [], localities: [] },
      strongAddressFilter: false, strongContactFilter: false, strongDetailFilter: false,
    };
  });

  afterEach(() => http.verify());

  function expectListRequest(search: { value: string; exact?: boolean } | undefined): void {
    const request = http.expectOne(environment.apiUrl + '/api/users/get-users');
    expect(request.request.method).toBe('POST');
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected a JSON list request');
    const body: Record<string, unknown> = JSON.parse(serialized);
    request.flush({ data: { list: [], length: 0 } });

    expect(body['page']).toEqual({ size: 20, number: 0 });
    expect(body['filters']).toEqual({
      general: { roles: [7], contactTypes: ['email'] },
      address: { countries: [143], regions: [2] },
      mode: { strictAddress: false, strictContact: false },
    });
    expect(body['search']).toEqual(search);
    if (search === undefined) expect(Object.keys(body)).not.toContain('search');
    const parsed = usersQueryDTOSchema.safeParse(body);
    expect(parsed.success).withContext('Serialized request must satisfy usersQueryDTOSchema').toBeTrue();
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

  for (const hasContacts of [false, true]) {
    const expectation = hasContacts ? 'accepts a complete' : 'rejects a contactless';
    it(`${expectation} initial administrator without an address`, async () => {
      const email = { id: 1, content: 'admin@example.test' };
      const phoneNumber = { id: 2, content: '+12025550101' };
      const telegramId = { id: 3, content: '#1234567' };
      const telegramPhoneNumber = { id: 4, content: '+12025550102' };
      const administrator = {
        id: 1,
        userName: 'initial-admin',
        firstName: 'Synthetic',
        patronymic: null,
        lastName: 'Administrator',
        roleId: 1,
        roleName: 'Administrator',
        isRestricted: false,
        dateOfStart: '2026-01-15T12:00:00.000Z',
        causeOfRestriction: null,
        dateOfRestriction: null,
        address: { country: null, region: null, district: null, locality: null },
        comment: null,
        orderedContacts: hasContacts ? {
          email: [email], phoneNumber: [phoneNumber], telegramId: [telegramId],
          telegramPhoneNumber: [telegramPhoneNumber], telegram: [telegramId, telegramPhoneNumber],
        } : {},
        outdatedData: { contacts: {}, addresses: [], names: [], userNames: [] },
      };

      filters.searchValue = '';
      filters.filter = { ...createEmptyGeneralFilter(), roles: [] };
      filters.addressFilter = { countries: [], regions: [], districts: [], localities: [] };
      const result = firstValueFrom(service.getList(filters, 20, 0));

      http.expectOne(environment.apiUrl + '/api/users/get-users')
        .flush({ data: { list: [administrator], length: 1 } });

      if (!hasContacts) {
        await expectAsync(result).toBeRejectedWithError('ERRORS.INVALID_SCHEMA');
        return;
      }
      expect<unknown>(await result).toEqual({
        data: {
          list: [{ ...administrator, dateOfStart: new Date(administrator.dateOfStart) }],
          length: 1,
        },
        code: undefined,
      });
    });
  }
});
