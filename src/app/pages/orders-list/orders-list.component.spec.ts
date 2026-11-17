import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { OrderService } from '../../services/order.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrdersListComponent } from './orders-list.component';

describe('OrdersListComponent', () => {
  let component: OrdersListComponent;
  let fixture: ComponentFixture<OrdersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersListComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(OrderService), 'getOrders').and.returnValue(of({
      data: { list: [], length: 0, options: { users: [], statuses: [], sources: [], nodes: [] } },
    }));
    fixture = TestBed.createComponent(OrdersListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
