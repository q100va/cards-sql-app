import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderRecipientsComponent } from './order-recipients.component';

describe('OrderRecipientsComponent', () => {
  let component: OrderRecipientsComponent;
  let fixture: ComponentFixture<OrderRecipientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderRecipientsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderRecipientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
