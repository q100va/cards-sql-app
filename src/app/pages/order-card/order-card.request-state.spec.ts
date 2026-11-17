import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ContactOption } from '../../../../shared/schemas/volunteer.schema';
import { environment } from '../../../environments/environment';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { resetVolunteer } from '../../testing/reset.spec-fixtures';
import { OrderCardComponent } from './order-card.component';

describe('OrderCardComponent contact and preflight state', () => {
  let fixture: ComponentFixture<OrderCardComponent>;
  let component: OrderCardComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
  const volunteers = `${environment.apiUrl}/api/volunteers`;
  const contact = (id: number): ContactOption => ({
    id, volunteerId: id, type: 'email', content: `contact${id}@example.com`,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent], providers: provideComponentTesting(),
    }).compileComponents();
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrderCardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  it('keeps the latest selected volunteer when an older lookup finishes afterwards', () => {
    component.getVolunteer(10);
    const first = http.expectOne(`${volunteers}/get-volunteer-by-id/10`);
    component.getVolunteer(20);
    const current = http.expectOne(`${volunteers}/get-volunteer-by-id/20`);
    current.flush({ data: { ...resetVolunteer(), id: 20 } });
    if (!first.cancelled) first.flush({ data: resetVolunteer() });
    expect(component.volunteer?.id).toBe(20);
  });

  it('keeps contact suggestions cleared after the search becomes too short', () => {
    component.filterContact({ originalEvent: new Event('input'), query: 'alpha' });
    const first = http.expectOne(`${volunteers}/search-contacts/alpha`);
    component.filterContact({ originalEvent: new Event('input'), query: 'a' });
    if (!first.cancelled) first.flush({ data: [contact(10)] });
    expect(component.filteredContacts).toEqual([]);
  });

  it('keeps the latest search suggestions when an older search completes late', () => {
    component.filterContact({ originalEvent: new Event('input'), query: 'alpha' });
    const first = http.expectOne(`${volunteers}/search-contacts/alpha`);
    component.filterContact({ originalEvent: new Event('input'), query: 'bravo' });
    const current = http.expectOne(`${volunteers}/search-contacts/bravo`);
    current.flush({ data: [contact(20)] });
    if (!first.cancelled) first.flush({ data: [contact(10)] });
    expect(component.filteredContacts).toEqual([contact(20)]);
  });

  it('releases the Create latch after duplicate preflight fails so the user can retry', () => {
    component.volunteer = resetVolunteer();
    component.actualOccasions = [{
      id: 20, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null,
      month: '5', year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN',
    }];
    component.onCreateOrderClick();
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/api/orders/check-order`);
    expect(request.request.params.get('volunteerId')).toBe('10');
    expect(request.request.params.get('occasionId')).toBe('20');
    expect(component.blockCreateButton).toBeTrue();
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(component.blockCreateButton).toBeFalse();
    http.expectNone(`${environment.apiUrl}/api/orders/create-order`);
  });

  it('does not request an undefined volunteer when the creation dialog closes without a result', () => {
    component.dialogProps = {
      ...component.dialogProps,
      addressFilterParams: { ...component.dialogProps.addressFilterParams },
    };
    const dialogRef = jasmine.createSpyObj<MatDialogRef<unknown>>('dialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of({ refresh: false }));
    spyOn(component.dialog, 'open').and.returnValue(dialogRef);
    component.onAddVolunteerClick();
    const lookups = http.match(request => request.url.startsWith(`${volunteers}/get-volunteer-by-id/`));
    expect(lookups.length).toBe(0);
    for (const lookup of lookups) lookup.flush({}, { status: 400, statusText: 'Invalid volunteer ID' });
  });
});
