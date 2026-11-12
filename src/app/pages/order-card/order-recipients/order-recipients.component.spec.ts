import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';

import { OrderRecipientsComponent } from './order-recipients.component';

describe('OrderRecipientsComponent', () => {
  let component: OrderRecipientsComponent;
  let fixture: ComponentFixture<OrderRecipientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderRecipientsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(OrderRecipientsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('list', []);
    fixture.componentRef.setInput('orderDetails', {
      volunteerName: 'Test Volunteer', occasionName: 'Test Occasion', forInstitute: false, amount: 0,
    });
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
