import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { OccasionService } from '../../services/occasion.service';
import { OrderService } from '../../services/order.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderCardComponent } from './order-card.component';

describe('OrderCardComponent', () => {
  let component: OrderCardComponent;
  let fixture: ComponentFixture<OrderCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
      providers: [
        ...provideComponentTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ typeId: '1' })) } satisfies Pick<ActivatedRoute, 'paramMap'>,
        },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(OccasionService), 'getActualOccasions').and.returnValue(of({
      data: [{ id: 1, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null, month: '11', year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN' }],
    }));
    spyOn(TestBed.inject(OrderService), 'getOrderFiltersData').and.returnValue(of({ data: { regions: [], homes: [] } }));
    fixture = TestBed.createComponent(OrderCardComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(TestBed.inject(OccasionService).getActualOccasions).toHaveBeenCalledWith('1');
    expect(component.orderTypeId).toBe('1');
  });
});
