import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { OrdersList } from '../../../../shared/schemas/order.schema';
import { environment } from '../../../environments/environment';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { OrdersListComponent } from './orders-list.component';

describe('OrdersListComponent current request controls', () => {
  let fixture: ComponentFixture<OrdersListComponent>;
  let component: OrdersListComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/orders/get-orders`;

  function page(id: number, length = 1): OrdersList {
    return {
      list: [{
        id, date: new Date('2026-05-01T12:00:00Z'), amount: 1,
        userName: 'Editor', volunteerName: `Volunteer ${id}`, instituteName: null,
        contact: 'contact@example.com', status: 'ORDER.STATUS.PENDING', statusId: 1,
        source: 'ORDER.SOURCE.MANUAL', occasion: 'OCCASION.BIRTHDAY.NAME 2026',
        occasionStatus: 1, comment: null,
      }],
      length,
      options: { users: [{ id, userName: `Editor ${id}` }], statuses: [], sources: [], nodes: [] },
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersListComponent], providers: provideComponentTesting(),
    }).compileComponents();
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrdersListComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  afterEach(() => http.verify());

  it('keeps the newest page A across A, B, and A again without changing pagination, sorting, or filters', async () => {
    component.userId = 42;
    component.searchValue = 'current search';
    const load = (first: number) => {
      component.loadOrders({
        first, rows: 25, sortField: 'date', sortOrder: -1,
        filters: { status: [{ value: 1, matchMode: 'equals', operator: 'and' }] },
      });
      return http.expectOne(url);
    };
    const firstA = load(0);
    const requestB = load(25);
    const currentA = load(0);
    expect(currentA.request.body).toEqual({
      offset: 0, limit: 25, sortField: 'date', sortOrder: -1, searchValue: 'current search',
      filters: {
        status: [{ value: 1, matchMode: 'equals', operator: 'and' }],
        userId: [{ value: 42, matchMode: 'equals', operator: 'and' }],
      },
    });
    currentA.flush({ data: page(33, 61) });
    if (!requestB.cancelled) requestB.flush({ data: page(22, 40) });
    if (!firstA.cancelled) firstA.flush({ data: page(11, 20) });
    expect(component.orders.map(order => order.id)).toEqual([33]);
    expect(component.totalRecords).toBe(61);
    expect(await firstValueFrom(component.userOptions$)).toEqual([{ label: 'Editor 33', value: 33 }]);
    expect(component.isLoading()).toBeFalse();
  });

  it('ignores an older page error without releasing current loading and still reports the current error', () => {
    component.loadOrders({ first: 0, rows: 20 });
    const older = http.expectOne(url);
    component.loadOrders({ first: 20, rows: 20 });
    const current = http.expectOne(url);
    if (!older.cancelled) older.flush({}, { status: 503, statusText: 'Obsolete page failure' });
    expect(component.isLoading()).toBeTrue();
    expect(handle).not.toHaveBeenCalled();
    current.flush({}, { status: 502, statusText: 'Current page failure' });
    expect(component.isLoading()).toBeFalse();
    expect(handle).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse), jasmine.objectContaining({
      source: 'OrdersList', stage: 'getOrdersByOccasion',
      query: jasmine.objectContaining({ offset: 20, limit: 20 }),
    }));
  });
});
