import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { OrderCardComponent } from '../order-card.component';
import { OrderService } from '../../../services/order.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderFiltersComponent } from './order-filters.component';

describe('OrderFiltersComponent', () => {
  let component: OrderFiltersComponent;
  let fixture: ComponentFixture<OrderFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderFiltersComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(OrderService), 'getOrderFiltersData').and.returnValue(of({ data: { regions: [], homes: [] } }));
    fixture = TestBed.createComponent(OrderFiltersComponent);
    component = fixture.componentInstance;
    const host = TestBed.createComponent(OrderCardComponent).componentInstance;
    fixture.componentRef.setInput('filterForm', host.filterForm);
    fixture.componentRef.setInput('amountControl', host.orderForm.controls.amount);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
