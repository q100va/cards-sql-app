import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersList } from '../../../../shared/schemas/order.schema';
import { environment } from '../../../environments/environment';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { OrdersListComponent } from './orders-list.component';

describe('OrdersListComponent request ownership', () => {
  let fixture: ComponentFixture<OrdersListComponent>;
  let component: OrdersListComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const url = `${environment.apiUrl}/api/orders/get-orders`;

  function page(id: number): OrdersList {
    return {
      list: [{
        id, date: new Date('2026-05-01T12:00:00Z'), amount: 1,
        userName: 'Editor', volunteerName: `Volunteer ${id}`, instituteName: null,
        contact: 'contact@example.com', status: 'ORDER.STATUS.PENDING', statusId: 1,
        source: 'ORDER.SOURCE.MANUAL', occasion: 'OCCASION.BIRTHDAY.NAME 2026',
        occasionStatus: 1, comment: null,
      }],
      length: 1,
      options: { users: [], statuses: [], sources: [], nodes: [] },
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

  it('loads a successful page through the existing HTTP and response-validation boundary', () => {
    component.loadOrders({ first: 20, rows: 20 });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.offset).toBe(20);
    expect(component.isLoading()).toBeTrue();
    request.flush({ data: page(2) });
    expect(component.orders.map(order => order.id)).toEqual([2]);
    expect(component.totalRecords).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('keeps the latest requested page when an older page completes afterwards', () => {
    component.loadOrders({ first: 0, rows: 20 });
    const first = http.expectOne(url);
    component.loadOrders({ first: 20, rows: 20 });
    const current = http.expectOne(url);
    current.flush({ data: page(2) });
    if (!first.cancelled) first.flush({ data: page(1) });
    expect(component.orders.map(order => order.id)).toEqual([2]);
    expect(component.totalRecords).toBe(1);
  });

  it('keeps loading while the current page is pending after an older completion', () => {
    component.loadOrders({ first: 0, rows: 20 });
    const first = http.expectOne(url);
    component.loadOrders({ first: 20, rows: 20 });
    const current = http.expectOne(url);
    if (!first.cancelled) first.flush({ data: page(1) });
    expect(component.isLoading()).toBeTrue();
    current.flush({ data: page(2) });
    expect(component.isLoading()).toBeFalse();
  });

  it('releases loading, notifies once, and permits a fresh load after an HTTP failure', () => {
    component.loadOrders({ first: 0, rows: 20 });
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.isLoading()).toBeFalse();
    expect(handle).toHaveBeenCalledTimes(1);
    component.loadOrders({ first: 0, rows: 20 });
    http.expectOne(url).flush({ data: page(3) });
    expect(component.orders.map(order => order.id)).toEqual([3]);
  });
});
