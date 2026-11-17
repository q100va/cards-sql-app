import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import {
  Occasion, OccasionDraft, occasionDataSchema, occasionDraftSchema,
  occasionEditSchema, occasionIdSchema, occasionTypeIdSchema,
} from '../../../shared/schemas/occasion.schema';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../interfaces/api-response';
import { ValidationError } from '../utils/validate-response';
import { MessageWrapperService } from './message.service';
import { OccasionService } from './occasion.service';

describe('OccasionService domain contracts', () => {
  let service: OccasionService;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/api/occasions';

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), OccasionService,
      { provide: MessageWrapperService, useValue: messages },
    ] });
    service = TestBed.inject(OccasionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function bodyOf(request: TestRequest): unknown {
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected JSON Occasion request');
    return JSON.parse(serialized);
  }

  function birthday(): Occasion {
    return {
      id: 20, type: 'День рождения', date: 'Май 2027', monthNameKey: 'MONTH.MAY',
      month: 'Май', year: 2027, amount: 12, status: 'Активный',
    };
  }

  it('checks a birthday occasion with required month and stringified year/type query parameters', () => {
    const input = { type: 1, year: 2027, month: 5 };
    let exists: boolean | undefined;
    service.checkOccasionData(input).subscribe(res => { exists = res.data; });
    const request = http.expectOne(r => r.url === base + '/check-occasion-data');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['type', 'year', 'month']);
    const params = {
      type: request.request.params.get('type'), year: request.request.params.get('year'), month: request.request.params.get('month'),
    };
    expect(params).toEqual({ type: '1', year: '2027', month: '5' });
    expect(occasionDataSchema.safeParse(params).success).toBeTrue();
    request.flush({ data: true });
    expect(exists).toBeTrue();
    expect(input).toEqual({ type: 1, year: 2027, month: 5 });
  });

  it('omits null month from non-birthday duplicate-check query parameters', () => {
    const input = { type: 2, year: 2027, month: null };
    let exists: boolean | undefined;
    service.checkOccasionData(input).subscribe(res => { exists = res.data; });
    const request = http.expectOne(r => r.url === base + '/check-occasion-data');
    expect(request.request.params.keys()).toEqual(['type', 'year']);
    const params = { type: request.request.params.get('type'), year: request.request.params.get('year') };
    expect(params).toEqual({ type: '2', year: '2027' });
    expect(request.request.params.has('month')).toBeFalse();
    expect(occasionDataSchema.safeParse(params).success).toBeTrue();
    request.flush({ data: false });
    expect(exists).toBeFalse();
    expect(input.month).toBeNull();
  });

  it('creates a birthday occasion with numeric month/year and the exact draft contract', () => {
    const input: OccasionDraft = { type: 1, year: 2027, month: 5, status: 1 };
    let name: string | undefined;
    service.createOccasion(input).subscribe(res => { name = res.data; });
    const request = http.expectOne(base + '/create-occasion');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual({ type: 1, year: 2027, month: 5, status: 1 });
    expect(occasionDraftSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: 'День рождения — Май 2027' });
    expect(name).toBe('День рождения — Май 2027');
  });

  it('creates a non-birthday occasion with explicit null month rather than a birthday month', () => {
    const input: OccasionDraft = { type: 2, year: 2027, month: null, status: 2 };
    service.createOccasion(input).subscribe();
    const request = http.expectOne(base + '/create-occasion');
    expect(bodyOf(request)).toEqual({ type: 2, year: 2027, month: null, status: 2 });
    expect(occasionDraftSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: 'Праздник 2027' });
  });

  it('loads the unfiltered occasion list and validates its domain option arrays', () => {
    const data = {
      occasions: [birthday()],
      options: { date: ['Май 2027'], month: ['Май'], year: [2027], type: ['День рождения'], status: ['Активный'] },
    };
    let received: unknown;
    service.getOccasions().subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-occasions');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ data });
    expect(received).toEqual(data);
  });

  it('accepts detail responses with nullable non-birthday month/date labels and numeric year', () => {
    const occasion: Occasion = { ...birthday(), type: 'Праздник', date: null, monthNameKey: null, month: null, amount: 0 };
    let received: Occasion | undefined;
    service.getOccasionById(20).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-occasion-by-id/20');
    expect(request.request.method).toBe('GET');
    request.flush({ data: occasion });
    expect(received).toEqual(occasion);
    expect(received?.year).toBe(2027);
    expect(received?.month).toBeNull();
  });

  it('rejects an occasion detail missing its required status instead of returning a partial entity', () => {
    spyOn(console, 'error');
    const { status, ...missingStatus } = birthday();
    let received: unknown;
    service.getOccasionById(20).subscribe({ next: () => fail('Expected validation error'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/get-occasion-by-id/20').flush({ data: missingStatus });
    expect(received).toBeInstanceOf(ValidationError);
    if (received instanceof ValidationError) expect(received.code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('changes only the occasion status using the edit endpoint and schema', () => {
    service.editOccasionStatus(20, 2).subscribe();
    const request = http.expectOne(base + '/edit-occasion/');
    expect(request.request.method).toBe('PATCH');
    expect(bodyOf(request)).toEqual({ id: 20, status: 2 });
    expect(occasionEditSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: null });
  });

  it('deletes an occasion using its path ID and no request body', () => {
    service.deleteOccasion(20).subscribe();
    const request = http.expectOne(base + '/delete-occasion/20');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    expect(occasionIdSchema.safeParse({ id: '20' }).success).toBeTrue();
    request.flush({ data: null });
  });

  it('loads actual occasions for the selected type and validates each returned occasion', () => {
    let received: Occasion[] | undefined;
    service.getActualOccasions('1').subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-actual-occasions/1');
    expect(request.request.method).toBe('GET');
    expect(occasionTypeIdSchema.safeParse({ typeId: '1' }).success).toBeTrue();
    request.flush({ data: [birthday()] });
    expect(received).toEqual([birthday()]);
  });

  it('propagates HTTP errors without a boolean fallback or service-owned diagnostics', () => {
    const diagnostic = spyOn(console, 'error');
    let received: unknown;
    service.checkOccasionData({ type: 2, year: 2027, month: null }).subscribe({
      next: () => fail('Expected HTTP error'), error: (error: unknown) => { received = error; },
    });
    http.expectOne(r => r.url === base + '/check-occasion-data').flush({ code: 'ERRORS.DATA_FETCH_FAILED' }, { status: 503, statusText: 'Unavailable' });
    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(503);
      expect(received.error).toEqual({ code: 'ERRORS.DATA_FETCH_FAILED' });
    }
    expect(diagnostic).not.toHaveBeenCalled();
  });
});
