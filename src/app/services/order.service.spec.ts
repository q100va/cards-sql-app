import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ADDRESS_CATEGORY, GENDER_FILTER, ORDER_SOURCE, ORDER_STATUS } from '../../../shared/constants/orders';
import {
  OrderDetails, OrderDraft, OrderFilter, OrderQuery, orderCreateSchema, orderDataSchema,
  orderEditRecipientsSchema, orderQueryDTOSchema, orderStatusUpdateSchema,
} from '../../../shared/schemas/order.schema';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../interfaces/api-response';
import { ValidationError } from '../utils/validate-response';
import { MessageWrapperService } from './message.service';
import { OrderService } from './order.service';

describe('OrderService domain contracts', () => {
  let service: OrderService;
  let http: HttpTestingController;
  const base = environment.apiUrl + '/api/orders';

  beforeEach(() => {
    const messages: Pick<MessageWrapperService, 'messageTap'> = {
      messageTap: <T>() => (source: Observable<ApiResponse<T>>) => source,
    };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), OrderService,
      { provide: MessageWrapperService, useValue: messages },
    ] });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function bodyOf(request: TestRequest): unknown {
    const serialized = request.request.serializeBody();
    if (typeof serialized !== 'string') throw new Error('Expected JSON Order request');
    return JSON.parse(serialized);
  }

  function draft(): OrderDraft {
    return {
      occasionId: 20, volunteerId: 30, userId: 40, instituteId: null, status: ORDER_STATUS.ACCEPTED,
      source: ORDER_SOURCE.WEBSITE, forSchoolDepartment: false, contactId: 50, amount: 4, comment: null,
    };
  }

  function filters(): OrderFilter {
    return {
      addressCategory: ADDRESS_CATEGORY.ANY, gender: GENDER_FILTER.ANY, maleAmount: null, femaleAmount: null,
      onlyWithPicture: false, onlyAnniversaries: false, onlyAnniversariesAndOldest: false, onlyWithConcents: false,
      year1: null, year2: null, date1: null, date2: null, regions: [], homes: [],
      minFromOneHouse: null, maxFromOneHouse: null, maxNoAddress: null,
    };
  }

  function recipients() {
    return [{
      homeId: 60, postAddress: 'Исторический почтовый адрес', infoNote: null, noAddressNote: null,
      homeRecipients: [{
        index: 1, id: 70, fullNameSnapshot: 'Анна Петрова — имя в заказе', specialComment: 'Писать крупно',
        birthDay: 12, birthMonth: 5, birthYear: null, infoNote: null, photoLink: null, status: 'Назначен', statusId: 1,
      }],
    }];
  }

  function detail() {
    return {
      id: 10, date: '2026-06-02T09:30:00.000Z', amount: 4, userName: 'operator', volunteerName: 'Иван',
      instituteName: null, contact: 'john@example.com', status: 'Принята', statusId: ORDER_STATUS.ACCEPTED,
      source: 'Сайт', occasion: 'День рождения 2027', occasionStatus: 1, comment: null, recipients: recipients(),
    };
  }

  it('validates filter metadata while preserving the Home-to-Region relationship', () => {
    const metadata = { regions: [{ id: 2, name: 'Тверская область' }], homes: [{ id: 60, name: 'Дом А', regionId: 2 }] };
    let received: unknown;
    service.getOrderFiltersData().subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/get-filters-data');
    expect(request.request.method).toBe('GET');
    request.flush({ data: metadata });
    expect(received).toEqual(metadata);
  });

  it('serializes duplicate-check IDs as query parameters and coerces returned dates', () => {
    let dates: Date[] = [];
    service.checkOrder(30, 20).subscribe(res => { dates = res.data.map(item => item.date); });
    const request = http.expectOne(r => r.url === base + '/check-order');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['volunteerId', 'occasionId']);
    expect(request.request.params.get('volunteerId')).toBe('30');
    expect(request.request.params.get('occasionId')).toBe('20');
    expect(orderDataSchema.safeParse({ volunteerId: '30', occasionId: '20' }).success).toBeTrue();
    request.flush({ data: [{ date: '2026-06-02T09:30:00.000Z', userName: 'operator', amount: 4 }] });
    expect(dates).toEqual([new Date('2026-06-02T09:30:00.000Z')]);
  });

  it('omits ANY sentinels, false-only filters, nulls, and empty selections without mutating the drafts', () => {
    const input = draft();
    const selection = filters();
    const originalInput = structuredClone(input);
    const originalFilters = structuredClone(selection);
    let received: unknown;
    service.createOrder(input, selection).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/create-order');
    expect(request.request.method).toBe('POST');
    const body = bodyOf(request);
    expect(body).toEqual({ orderDraft: originalInput, filters: {} });
    expect(orderCreateSchema.safeParse(body).success).toBeTrue();
    const response = { contact: 'john@example.com', recipients: recipients() };
    request.flush({ data: response });
    expect(received).toEqual(response);
    expect(input).toEqual(originalInput);
    expect(selection).toEqual(originalFilters);
  });

  it('preserves concrete allocation filters, true flags, birth ranges, and selected IDs in a valid create request', () => {
    const selection: OrderFilter = {
      ...filters(), addressCategory: ADDRESS_CATEGORY.FOR_SCHOOLS, gender: GENDER_FILTER.FEMALE,
      onlyWithPicture: true, onlyWithConcents: true, year1: 1940, year2: 1950, date1: 1, date2: 30,
      regions: [2], homes: [60], minFromOneHouse: 2, maxFromOneHouse: 4, maxNoAddress: 1,
    };
    const original = structuredClone(selection);
    service.createOrder(draft(), selection).subscribe();
    const request = http.expectOne(base + '/create-order');
    const body = bodyOf(request);
    expect(body).toEqual({ orderDraft: draft(), filters: {
      addressCategory: ADDRESS_CATEGORY.FOR_SCHOOLS, gender: GENDER_FILTER.FEMALE,
      onlyWithPicture: true, onlyWithConcents: true, year1: 1940, year2: 1950, date1: 1, date2: 30,
      regions: [2], homes: [60], minFromOneHouse: 2, maxFromOneHouse: 4, maxNoAddress: 1,
    } });
    expect(orderCreateSchema.safeParse(body).success).toBeTrue();
    request.flush({ data: { contact: 'john@example.com', recipients: [] } });
    expect(selection).toEqual(original);
  });

  it('retains gender-proportion amounts instead of treating them as ANY filters', () => {
    const selection: OrderFilter = { ...filters(), gender: GENDER_FILTER.PROPORTION, maleAmount: 1, femaleAmount: 3 };
    service.createOrder(draft(), selection).subscribe();
    const request = http.expectOne(base + '/create-order');
    const body = bodyOf(request);
    expect(body).toEqual({ orderDraft: draft(), filters: { gender: GENDER_FILTER.PROPORTION, maleAmount: 1, femaleAmount: 3 } });
    expect(orderCreateSchema.safeParse(body).success).toBeTrue();
    request.flush({ data: { contact: 'john@example.com', recipients: [] } });
  });

  it('passes table pagination, sorting, search, status and date filters without applying create-filter normalization', () => {
    const query: OrderQuery = {
      offset: 20, limit: 10, sortField: ['date'], sortOrder: -1, searchValue: 'Иван',
      filters: {
        status: [{ value: ORDER_STATUS.ACCEPTED, matchMode: 'equals', operator: 'and' }],
        date: [{ value: '2026-06-01T00:00:00.000Z', matchMode: 'dateAfter', operator: 'and' }],
      },
    };
    const original = structuredClone(query);
    let length: number | undefined;
    service.getOrders(query).subscribe(res => { length = res.data.length; });
    const request = http.expectOne(base + '/get-orders');
    expect(request.request.method).toBe('POST');
    expect(bodyOf(request)).toEqual(original);
    expect(orderQueryDTOSchema.safeParse(bodyOf(request)).success).toBeTrue();
    const { recipients: snapshotRecipients, ...row } = detail();
    request.flush({ data: {
      list: [row], length: 1,
      options: {
        users: [{ id: 40, userName: 'operator' }], statuses: [{ value: ORDER_STATUS.ACCEPTED, label: 'Принята' }],
        sources: [{ value: ORDER_SOURCE.WEBSITE, label: 'Сайт' }],
        nodes: [{ key: 'birthday-2027-5', label: 'Май 2027', data: { type: 1, month: 5, year: 2027 }, children: [] }],
      },
    } });
    expect(length).toBe(1);
    expect(query).toEqual(original);
  });

  it('returns validated order details with stored recipient names, postal snapshots, and unknown birth year', () => {
    let received: OrderDetails | undefined;
    service.getOrderById(10).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/order/10');
    expect(request.request.method).toBe('GET');
    request.flush({ data: detail() });
    expect(received?.date).toEqual(new Date('2026-06-02T09:30:00.000Z'));
    expect(received?.recipients).toEqual(recipients());
    expect(received?.recipients[0].homeRecipients[0].birthYear).toBeNull();
    expect(received?.instituteName).toBeNull();
  });

  it('rejects an order response with an invalid nested recipient-name snapshot', () => {
    spyOn(console, 'error');
    const invalid = detail();
    let received: unknown;
    service.getOrderById(10).subscribe({ next: () => fail('Expected snapshot rejection'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/order/10').flush({ data: {
      ...invalid, recipients: [{ ...invalid.recipients[0], homeRecipients: [{ ...invalid.recipients[0].homeRecipients[0], fullNameSnapshot: null }] }],
    } });
    expect(received).toBeInstanceOf(ValidationError);
    if (received instanceof ValidationError) expect(received.code).toBe('ERRORS.INVALID_SCHEMA');
  });

  it('edits assignments with deletingIds and validates the returned order details', () => {
    const deletingIds = [70, 71];
    let received: OrderDetails | undefined;
    service.editOrderRecipientsList(10, deletingIds).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/edit-recipients');
    expect(request.request.method).toBe('PATCH');
    expect(bodyOf(request)).toEqual({ id: 10, deletingIds: [70, 71] });
    expect(orderEditRecipientsSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: { ...detail(), recipients: [] } });
    expect(received?.recipients).toEqual([]);
  });

  it('updates status using the Order status contract and accepts the null response', () => {
    let received: unknown = 'not emitted';
    service.updateOrderStatus(10, ORDER_STATUS.RETURNED).subscribe(res => { received = res.data; });
    const request = http.expectOne(base + '/update-status');
    expect(request.request.method).toBe('PATCH');
    expect(bodyOf(request)).toEqual({ id: 10, status: ORDER_STATUS.RETURNED });
    expect(orderStatusUpdateSchema.safeParse(bodyOf(request)).success).toBeTrue();
    request.flush({ data: null });
    expect(received).toBeNull();
  });

  it('deletes an Order by its path ID without inventing a DELETE body', () => {
    service.deleteOrder(10).subscribe();
    const request = http.expectOne(base + '/delete-order/10');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    request.flush({ data: null });
  });

  it('preserves HTTP error status and payload without fallback or duplicate diagnostics', () => {
    const diagnostic = spyOn(console, 'error');
    let received: unknown;
    service.createOrder(draft(), filters()).subscribe({ next: () => fail('Expected HTTP error'), error: (error: unknown) => { received = error; } });
    http.expectOne(base + '/create-order').flush({ code: 'ERRORS.NOT_ENOUGH_RECIPIENTS' }, { status: 409, statusText: 'Conflict' });
    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(409);
      expect(received.error).toEqual({ code: 'ERRORS.NOT_ENOUGH_RECIPIENTS' });
    }
    expect(diagnostic).not.toHaveBeenCalled();
  });
});
