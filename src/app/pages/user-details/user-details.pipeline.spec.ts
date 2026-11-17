import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { updateUserDataSchema, userSchema } from '../../../../shared/schemas/user.schema';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetVolunteer } from '../../testing/reset.spec-fixtures';
import { UsersListComponent } from '../users-list/users-list.component';
import { UserDetailsComponent } from './user-details.component';

describe('UserDetailsComponent shared save preflight', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requires the username preflight before duplicate checking and allows a corrected username to proceed through saving', fakeAsync(() => {
    const person = resetVolunteer();
    const persisted = userSchema.parse({
      id: person.id, userName: 'current.user', firstName: person.firstName,
      patronymic: person.patronymic, lastName: person.lastName, roleId: 1, roleName: 'Editor',
      isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      dateOfStart: person.dateOfStart, comment: null, address: person.address,
      orderedContacts: {
        ...person.orderedContacts, phoneNumber: [{ id: 62, content: '+79991234567' }],
        telegram: [{ id: 63, content: 'https://t.me/editor' }], telegramId: [{ id: 64, content: '#1234567' }],
        telegramPhoneNumber: [{ id: 65, content: '+79991234567' }],
      },
      outdatedData: { names: [], userNames: [], contacts: {}, addresses: [] },
    });
    const fixture = TestBed.createComponent(UserDetailsComponent);
    const component = fixture.componentInstance;
    const config = new UsersListComponent().userDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: persisted,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const baseUrl = `${environment.apiUrl}/api/users`;
    component.onEditClick();
    component.mainForm.controls['userName'].setValue('taken.user');
    component.mainForm.controls['comment'].setValue('Keep my edit');
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    component.onSaveClick('justSave');
    const taken = http.expectOne(`${baseUrl}/check-user-name?userName=taken.user&id=10`);
    expect(taken.request.method).toBe('GET');
    http.expectNone(`${baseUrl}/check-user-data/`);
    http.expectNone(`${baseUrl}/update-user`);
    taken.flush({ data: true });
    flushMicrotasks();
    expect(component.showSpinner()).toBeFalse();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.controls['comment'].value).toBe('Keep my edit');
    http.expectNone(`${baseUrl}/check-user-data/`);
    http.expectNone(`${baseUrl}/update-user`);

    component.mainForm.controls['userName'].setValue('available.user');
    tick();
    component.onSaveClick('justSave');
    const available = http.expectOne(`${baseUrl}/check-user-name?userName=available.user&id=10`);
    http.expectNone(`${baseUrl}/check-user-data/`);
    available.flush({ data: false });
    const duplicates = http.expectOne(`${baseUrl}/check-user-data/`);
    http.expectNone(`${baseUrl}/update-user`);
    duplicates.flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-user`);
    expect(updateUserDataSchema.safeParse(update.request.body).success).toBeTrue();
    expect(update.request.body).toEqual({
      id: persisted.id,
      changingData: { main: { userName: 'available.user', comment: 'Keep my edit' }, address: null, contacts: null },
      restoringData: { names: null, userNames: null, addresses: null, contacts: {} },
      outdatingData: { names: null, userName: persisted.userName, address: null, contacts: null },
      deletingData: { names: null, userNames: null, addresses: null, contacts: null },
    });
    update.flush({ data: { ...persisted, userName: 'available.user', comment: 'Keep my edit' } });
    tick();
    expect(component.existingOwner?.userName).toBe('available.user');
    expect(component.mainForm.controls['userName'].value).toBe('available.user');
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.showSpinner()).toBeFalse();
  }));
});
