import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { OrderDetails } from '../../../../shared/schemas/order.schema';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { AuthServiceHarness } from '../../utils/auth-harness';
import { OrderRecipientsComponent } from '../order-card/order-recipients/order-recipients.component';
import { OrderDetailsComponent } from './order-details.component';

describe('OrderDetailsComponent route recovery and edit authority', () => {
  let fixture: ComponentFixture<OrderDetailsComponent>;
  let component: OrderDetailsComponent;
  let route: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let auth: AuthServiceHarness;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const base = `${environment.apiUrl}/api/orders`;

  function order(id = 10): OrderDetails {
    return {
      id, date: new Date('2026-06-02T09:30:00Z'), amount: 4, userName: 'Operator',
      volunteerName: `Volunteer ${id}`, instituteName: null, contact: 'contact@example.com',
      status: 'ORDER.STATUS.ACCEPTED', statusId: 2, source: 'ORDER.SOURCE.MANUAL',
      occasion: 'OCCASION.BIRTHDAY.NAME 2026', occasionStatus: 1, comment: null,
      recipients: [{
        homeId: 60, postAddress: 'Postal address', infoNote: null, noAddressNote: null,
        homeRecipients: [70, 71].map((recipientId, index) => ({
          index: index + 1, id: recipientId, fullNameSnapshot: `Recipient ${recipientId}`,
          specialComment: '', birthDay: 12, birthMonth: 5, birthYear: null,
          infoNote: null, photoLink: null, status: 'Assigned', statusId: 1,
        })),
      }],
    };
  }

  beforeEach(async () => {
    route = new BehaviorSubject(convertToParamMap({ orderId: '10', userId: '7' }));
    auth = new AuthServiceHarness();
    auth.grant('VIEW_ORDER');
    await TestBed.configureTestingModule({
      imports: [OrderDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: route } satisfies Pick<ActivatedRoute, 'paramMap'> },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).use('en');
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrderDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function load(id = 10, data = order(id)) {
    http.expectOne(`${base}/order/${id}`).flush({ data });
    fixture.detectChanges();
  }

  function child() {
    return fixture.debugElement.query(By.directive(OrderRecipientsComponent)).injector.get(OrderRecipientsComponent);
  }

  function button(label: string) {
    const host: HTMLElement = fixture.nativeElement;
    return Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent?.includes(label));
  }

  it('clears A for a replacement fetch, reports B failure, and loads C through the same route subscription', () => {
    load();
    expect(component.order()?.id).toBe(10);
    route.next(convertToParamMap({ orderId: '20', userId: '7' }));
    const requestB = http.expectOne(`${base}/order/20`);
    expect(component.order()).toBeNull();
    expect(component.isLoading()).toBeTrue();
    requestB.flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(component.order()).toBeNull();
    expect(component.isLoading()).toBeFalse();
    expect(fixture.debugElement.query(By.directive(OrderRecipientsComponent))).toBeNull();
    expect(handle).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse), {
      source: 'OrderDetailsComponent', stage: 'getOrderById', orderId: 20, userId: 7,
    });

    route.next(convertToParamMap({ orderId: '30', userId: '7' }));
    const requestC = http.expectOne(`${base}/order/30`);
    expect(requestC.request.method).toBe('GET');
    expect(component.isLoading()).toBeTrue();
    requestC.flush({ data: order(30) });
    fixture.detectChanges();
    expect(component.order()?.id).toBe(30);
    expect(child().list()).toEqual(order(30).recipients);
    expect(component.isLoading()).toBeFalse();
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('cancels the prior route fetch before acquiring loading for its pending replacement', () => {
    const requestA = http.expectOne(`${base}/order/10`);
    route.next(convertToParamMap({ orderId: '20' }));
    const requestB = http.expectOne(`${base}/order/20`);
    expect(requestA.cancelled).toBeTrue();
    expect(component.order()).toBeNull();
    expect(component.isLoading()).toBeTrue();
    requestB.flush({ data: order(20) });
    expect(component.order()?.id).toBe(20);
    expect(component.isLoading()).toBeFalse();
    expect(handle).not.toHaveBeenCalled();
  });

  it('does not offer recipient editing or send a write for a viewer without EDIT_ORDER', () => {
    load();
    expect(child().isEditAllowed()).toBeFalse();
    expect(button('ORDER.DETAILS.EDIT_BUTTON')).toBeUndefined();
    component.changeRecipientsList([70]);
    const writes = http.match(`${base}/edit-recipients`);
    expect(writes.length).toBe(0);
    for (const write of writes) write.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(component.order()?.recipients).toEqual(order().recipients);
  });

  it('lets an EDIT_ORDER user edit and save recipients through the existing PATCH and response flow', () => {
    auth.grant('EDIT_ORDER');
    load();
    expect(child().isEditAllowed()).toBeTrue();
    const edit = button('ORDER.DETAILS.EDIT_BUTTON');
    if (!edit) throw new Error('Expected the editor action');
    edit.click();
    fixture.detectChanges();
    child().deleteRecipient(70);
    fixture.detectChanges();
    const save = button('ORDER.DETAILS.SAVE_BUTTON');
    if (!save) throw new Error('Expected the save action');
    expect(save.disabled).toBeFalse();
    save.click();
    const request = http.expectOne(`${base}/edit-recipients`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ id: 10, deletingIds: [70] });
    expect(component.isLoading()).toBeTrue();
    const saved = order();
    saved.amount = 3;
    saved.recipients[0].homeRecipients = saved.recipients[0].homeRecipients.filter(item => item.id !== 70);
    request.flush({ data: saved });
    fixture.detectChanges();
    expect(component.order()).toEqual(saved);
    expect(component.isLoading()).toBeFalse();
    expect(handle).not.toHaveBeenCalled();
  });

  it('keeps existing order and occasion status restrictions for an editor', () => {
    auth.grant('EDIT_ORDER');
    load(10, { ...order(), statusId: 3 });
    expect(child().isEditAllowed()).toBeFalse();
    expect(button('ORDER.DETAILS.EDIT_BUTTON')).toBeUndefined();
    route.next(convertToParamMap({ orderId: '20' }));
    load(20, { ...order(20), statusId: 1, occasionStatus: 2 });
    expect(child().isEditAllowed()).toBeFalse();
    expect(button('ORDER.DETAILS.EDIT_BUTTON')).toBeUndefined();
  });
});
