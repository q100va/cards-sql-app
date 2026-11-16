import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { ContactOption } from '../../../../shared/schemas/volunteer.schema';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { resetActor, resetVolunteer } from '../../testing/reset.spec-fixtures';
import { OrderCardComponent } from './order-card.component';

describe('OrderCardComponent selection and retry controls', () => {
  let fixture: ComponentFixture<OrderCardComponent>;
  let component: OrderCardComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const volunteers = `${environment.apiUrl}/api/volunteers`;
  const orders = `${environment.apiUrl}/api/orders`;
  const contact = (id: number): ContactOption => ({
    id, volunteerId: id, type: 'email', content: `contact${id}@example.com`,
  });
  const occasion = {
    id: 20, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null,
    month: '5', year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ typeId: '1' })) } },
      ],
    }).compileComponents();
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {});
    translate.use('en');
    spyOn(TestBed.inject(AuthService), 'getCurrentUserSnapshot').and.returnValue(resetActor);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrderCardComponent);
    component = fixture.componentInstance;
    component.dialogProps = {
      ...component.dialogProps,
      addressFilterParams: { ...component.dialogProps.addressFilterParams },
    };
  });

  afterEach(() => http.verify());

  function search(query: string) {
    component.filterContact({ originalEvent: new Event('input'), query });
    return http.expectOne(`${volunteers}/search-contacts/${query}`);
  }

  function volunteer(id: number, updateContact = false) {
    component.getVolunteer(id, updateContact);
    return http.expectOne(`${volunteers}/get-volunteer-by-id/${id}`);
  }

  function prepareCreate() {
    component.volunteer = resetVolunteer();
    component.actualOccasions = [occasion];
    component.orderForm.patchValue({ source: 1, amount: 3, contact: contact(10) });
    expect(component.orderForm.valid).toBeTrue();
    expect(component.filterForm.valid).toBeTrue();
  }

  function openDialogResult() {
    const closed = new Subject<unknown>();
    const dialogRef = jasmine.createSpyObj<MatDialogRef<unknown>>('dialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(closed);
    spyOn(component.dialog, 'open').and.returnValue(dialogRef);
    return closed;
  }

  it('keeps the newest A selection across volunteer A, B, and A again, including its contact', () => {
    const firstA = volunteer(10, true);
    const requestB = volunteer(20, true);
    const currentA = volunteer(10, true);
    currentA.flush({ data: {
      ...resetVolunteer(), firstName: 'Newest', orderedContacts: { email: [{ id: 99, content: 'new@example.com' }] },
    } });
    if (!firstA.cancelled) firstA.flush({ data: resetVolunteer() });
    if (!requestB.cancelled) requestB.flush({ data: { ...resetVolunteer(), id: 20 } });
    expect(component.volunteer?.firstName).toBe('Newest');
    expect(component.orderForm.controls.contact.value).toEqual({
      id: 99, volunteerId: 10, type: 'email', content: 'new@example.com',
    });
  });

  it('keeps a repeated query as a new contact-search intent across A, B, and A again', () => {
    const firstA = search('alpha');
    const requestB = search('bravo');
    const currentA = search('alpha');
    currentA.flush({ data: [contact(30)] });
    if (!firstA.cancelled) firstA.flush({ data: [contact(10)] });
    if (!requestB.cancelled) requestB.flush({ data: [contact(20)] });
    expect(component.filteredContacts).toEqual([contact(30)]);
  });

  it('ignores obsolete lookup errors while independent current volunteer and contact results remain authoritative', () => {
    const oldVolunteer = volunteer(10);
    const currentVolunteer = volunteer(20);
    const oldContacts = search('alpha');
    const currentContacts = search('bravo');
    currentVolunteer.flush({ data: { ...resetVolunteer(), id: 20 } });
    currentContacts.flush({ data: [contact(20)] });
    if (!oldVolunteer.cancelled) oldVolunteer.flush({}, { status: 503, statusText: 'Obsolete volunteer failure' });
    if (!oldContacts.cancelled) oldContacts.flush({}, { status: 503, statusText: 'Obsolete contact failure' });
    expect(component.volunteer?.id).toBe(20);
    expect(component.filteredContacts).toEqual([contact(20)]);
    expect(handle).not.toHaveBeenCalled();
  });

  it('continues notifying current volunteer and contact errors through the existing handler', () => {
    volunteer(10).flush({}, { status: 503, statusText: 'Volunteer unavailable' });
    expect(handle).toHaveBeenCalledTimes(1);
    component.filteredContacts = [contact(10)];
    search('alpha').flush({}, { status: 502, statusText: 'Search unavailable' });
    expect(handle).toHaveBeenCalledTimes(2);
    expect(component.filteredContacts).toEqual([]);
  });

  it('does not restore a volunteer whose pending lookup was cleared through the contact control', () => {
    component.ngOnInit();
    http.expectOne(`${environment.apiUrl}/api/occasions/get-actual-occasions/1`).flush({ data: [occasion] });
    component.orderForm.controls.contact.setValue(contact(10));
    const pending = volunteer(10);
    component.orderForm.controls.contact.setValue(null);
    if (!pending.cancelled) pending.flush({ data: resetVolunteer() });
    expect(component.volunteer).toBeNull();
    expect(component.orderForm.controls.contact.value).toBeNull();
  });

  it('retries the same valid Create state after failed preflight and prevents simultaneous submissions', () => {
    prepareCreate();
    const originalValues = component.orderForm.getRawValue();
    component.onCreateOrderClick();
    const failed = http.expectOne(request => request.url === `${orders}/check-order`);
    component.onCreateOrderClick();
    http.expectNone(request => request.url === `${orders}/check-order`);
    failed.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(component.blockCreateButton).toBeFalse();
    expect(component.orderForm.getRawValue()).toEqual(originalValues);

    component.onCreateOrderClick();
    const retry = http.expectOne(request => request.url === `${orders}/check-order`);
    expect(retry.request.params.get('volunteerId')).toBe('10');
    expect(retry.request.params.get('occasionId')).toBe('20');
    retry.flush({ data: [] });
    const create = http.expectOne(`${orders}/create-order`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body.orderDraft).toEqual({
      userId: 7, volunteerId: 10, occasionId: 20, status: 1, source: 1,
      forSchoolDepartment: true, contactId: 10, amount: 3, comment: null, instituteId: null,
    });
    component.onCreateOrderClick();
    component.createOrder();
    http.expectNone(request => request.url === `${orders}/check-order` || request.url === `${orders}/create-order`);
    expect(component.blockCreateButton).toBeTrue();
    expect(component.showSpinner).toBeTrue();
    create.flush({ data: { contact: 'contact10@example.com', recipients: [] } });
    expect(component.blockCreateButton).toBeFalse();
    expect(component.showSpinner).toBeFalse();
    expect(component.contactReminder).toContain('contact10@example.com');
  });

  it('consumes a duplicate-order confirmation only once, including after the request completes', () => {
    prepareCreate();
    const confirm = spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callThrough();
    component.onCreateOrderClick();
    http.expectOne(request => request.url === `${orders}/check-order`).flush({ data: [{
      date: '2026-05-01T12:00:00Z', userName: 'Editor', amount: 1,
    }] });
    const accept = confirm.calls.mostRecent().args[0].accept;
    expect(accept).toBeDefined();
    accept?.();
    accept?.();
    const create = http.expectOne(`${orders}/create-order`);
    create.flush({ data: { contact: 'contact10@example.com', recipients: [] } });
    accept?.();
    http.expectNone(`${orders}/create-order`);
  });

  it('runs only one preflight when the institute confirmation continuation repeats', fakeAsync(() => {
    prepareCreate();
    component.orderForm.controls.amount.setValue(21);
    const confirm = spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callThrough();
    component.onCreateOrderClick();
    const accept = confirm.calls.mostRecent().args[0].accept;
    expect(accept).toBeDefined();
    accept?.();
    accept?.();
    tick(200);
    http.expectOne(request => request.url === `${orders}/check-order`).flush({ data: [] });
    http.expectOne(`${orders}/create-order`).flush({ data: {
      contact: 'contact10@example.com', recipients: [],
    } });
    accept?.();
    tick(200);
    http.expectNone(request => request.url === `${orders}/check-order` || request.url === `${orders}/create-order`);
  }));

  it('does not infer a selected volunteer ID from creation-dialog cancellation or refresh-only results', () => {
    const closed = openDialogResult();
    component.onAddVolunteerClick();
    for (const result of [undefined, null, false, { refresh: false }, { refresh: true }]) closed.next(result);
    http.expectNone(request => request.url.startsWith(`${volunteers}/get-volunteer-by-id/`));
    expect(handle).not.toHaveBeenCalled();
  });

  it('refreshes the captured existing volunteer and its contact after a valid edit-dialog result', () => {
    component.volunteer = resetVolunteer();
    const closed = openDialogResult();
    component.onOpenCardClick();
    http.expectOne(`${volunteers}/get-volunteer-by-id/10`).flush({ data: resetVolunteer() });
    closed.next({ refresh: false });
    http.expectNone(`${volunteers}/get-volunteer-by-id/10`);
    closed.next({ refresh: true });
    http.expectOne(`${volunteers}/get-volunteer-by-id/10`).flush({ data: {
      ...resetVolunteer(), firstName: 'Refreshed',
    } });
    expect(component.volunteer?.firstName).toBe('Refreshed');
    expect(component.orderForm.controls.contact.value?.id).toBe(61);
  });

  it('does not resume an older edit dialog after a newer volunteer selection becomes current', () => {
    component.volunteer = resetVolunteer();
    const closed = openDialogResult();
    component.onOpenCardClick();
    http.expectOne(`${volunteers}/get-volunteer-by-id/10`).flush({ data: resetVolunteer() });
    volunteer(20).flush({ data: { ...resetVolunteer(), id: 20 } });
    closed.next({ refresh: true });
    http.expectNone(request => request.url.startsWith(`${volunteers}/get-volunteer-by-id/`));
    expect(component.volunteer?.id).toBe(20);
  });
});
