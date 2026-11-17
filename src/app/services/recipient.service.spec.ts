import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import {
  Recipient, RecipientQuery, occasionIdSchema, recipientDestroySchema,
  recipientListDataSchema, recipientQueryDTOSchema,
} from '../../../shared/schemas/recipient.schema';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../interfaces/api-response';
import { ValidationError } from '../utils/validate-response';
import { MessageWrapperService } from './message.service';
import { RecipientService } from './recipient.service';

describe('RecipientService domain contracts', () => {
  let service: RecipientService;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/api/recipients';

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), RecipientService,
      { provide: MessageWrapperService, useValue: messages },
    ] });
    service = TestBed.inject(RecipientService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function bodyOf(request: TestRequest): unknown {
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected JSON Recipient request');
    return JSON.parse(serialized);
  }

  function snapshot(): Recipient {
    return {
      id: 31, fullName: 'Анна Петрова — сохранённое имя', birthDay: 12, birthMonth: 5, birthYear: null,
      category: 'birthday', acceptableForSchool: false, regionName: 'Регион на момент включения',
      homeName: 'Дом на момент включения', plusAmount: 2, specialComment: 'Два дополнительных письма', isAbsent: false,
    };
  }

  it('creates an occasion list with the exact occasion ID body and returns the created count', () => {
    let count: number | undefined;
    service.createList(20).subscribe(res => { count = res.data; });
    const request = http.expectOne(base + '/create-list');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual({ occasionId: 20 });
    expect(occasionIdSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: 3 });
    expect(count).toBe(3);
  });

  it('clears a list with PATCH and accepts the null response without changing its meaning', () => {
    let received: unknown = 'not emitted';
    service.clearList(20).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/clear-list/');
    expect(request.request.method).toBe('PATCH');
    expect(bodyOf(request)).toEqual({ occasionId: 20 });
    expect(occasionIdSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: null });
    expect(received).toBeNull();
  });

  it('checks a list while retaining separate added, returned, and absent recipient groups', () => {
    const groups = {
      added: [{ id: 31, fullData: 'Новый получатель, Дом А' }],
      returned: [{ id: 32, fullData: 'Вернувшийся получатель, Дом Б' }],
      absent: [{ id: 33, fullData: 'Отсутствующий получатель, Дом В' }],
    };
    let received: unknown;
    service.checkList(20).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/check-list/');
    expect(request.request.method).toBe('PATCH');
    expect(bodyOf(request)).toEqual({ occasionId: 20 });
    expect(occasionIdSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: groups });
    expect(received).toEqual(groups);
  });

  it('serializes table query metadata and returns stored snapshot names and unknown birth year unchanged', () => {
    const query: RecipientQuery = {
      occasionId: 20, offset: 25, limit: 25, sortField: ['homeName', 'fullName'], sortOrder: -1,
      searchValue: 'Петрова', filters: {
        isAbsent: [{ value: false, matchMode: 'equals', operator: 'and' }],
        plusAmount: [{ value: 2, matchMode: 'gte', operator: 'and' }],
      },
    };
    let received: Recipient[] | undefined;
    service.getRecipientsByOccasion(query).subscribe(res => { received = res.data.list; });
    const request = http.expectOne(base + '/get-recipients');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual(query);
    expect(recipientQueryDTOSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: { list: [snapshot()], length: 1 } });
    expect(received).toEqual([snapshot()]);
    expect(received?.[0].birthYear).toBeNull();
    expect(received?.[0].acceptableForSchool).toBeFalse();
  });

  it('preserves nullable sorting and fully unknown birth data in a minimal query response', () => {
    const query: RecipientQuery = { occasionId: 20, offset: 0, limit: 10, sortField: null, sortOrder: null, filters: {} };
    const unknownBirthday = { ...snapshot(), birthDay: null, birthMonth: null, birthYear: null };
    let received: unknown;
    service.getRecipientsByOccasion(query).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-recipients');
    expect(bodyOf(request)).toEqual(query);
    expect(recipientQueryDTOSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: { list: [unknownBirthday], length: 1 } });
    expect(received).toEqual({ list: [unknownBirthday], length: 1 });
  });

  it('rejects a recipient response missing its required snapshot Home name', () => {
    spyOn(console, 'error');
    const { homeName, ...missingSnapshotHome } = snapshot();
    let received: unknown;
    service.getRecipientsByOccasion({ occasionId: 20, offset: 0, limit: 10, filters: {} }).subscribe({
      next: () => fail('Expected snapshot validation error'), error: (error: unknown) => { received = error; },
    });
    http.expectOne(base + '/get-recipients').flush({ data: { list: [missingSnapshotHome], length: 1 } });
    expect(received).toBeInstanceOf(ValidationError);
    if (received instanceof ValidationError) expect(received.code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('creates selected recipients using Senior IDs rather than recipient IDs', () => {
    let count: number | undefined;
    service.createRecipients([10, 11], 20).subscribe(res => { count = res.data; });
    const request = http.expectOne(base + '/create-recipients');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual({ seniorsIds: [10, 11], occasionId: 20 });
    expect(recipientListDataSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: 2 });
    expect(count).toBe(2);
  });

  it('deletes selected recipients with the required DELETE body and occasion context', () => {
    service.deleteRecipients([31, 32], 20).subscribe();
    const request = http.expectOne(base + '/delete-recipients/');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.params.keys()).toEqual([]);
    expect(bodyOf(request)).toEqual({ recipientIds: [31, 32], occasionId: 20 });
    expect(recipientDestroySchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: null });
  });

  it('propagates list creation errors without successful fallback or duplicate console diagnostics', () => {
    const diagnostic = spyOn(console, 'error');
    let received: unknown;
    service.createList(20).subscribe({ next: () => fail('Expected HTTP error'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/create-list').flush({ code: 'ERRORS.LIST_ALREADY_EXISTS' }, { status: 409, statusText: 'Conflict' });
    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(409);
      expect(received.error).toEqual({ code: 'ERRORS.LIST_ALREADY_EXISTS' });
    }
    expect(diagnostic).not.toHaveBeenCalled();
  });
});
