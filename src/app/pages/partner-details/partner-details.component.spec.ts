import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { PartnersListComponent } from '../partners-list/partners-list.component';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { HomeService } from '../../services/home.service';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { PARTNER_AFFILIATION } from '../../../../shared/constants/partners';
import { AuthUser } from '../../../../shared/schemas/auth.schema';
import { partnerSchema, updatePartnerDataSchema } from '../../../../shared/schemas/partner.schema';
import { Partner } from '../../interfaces/advanced-model';
import { AuthService } from '../../services/auth.service';
import { DiffConfirmService } from '../../services/diff-confirm.service';
import { MessageWrapperService } from '../../services/message.service';
import { PartnerService } from '../../services/partner.service';
import { environment } from '../../../environments/environment';

import { PartnerDetailsComponent } from './partner-details.component';

describe('PartnerDetailsComponent', () => {
  let component: PartnerDetailsComponent;
  let fixture: ComponentFixture<PartnerDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getPotentialHomesPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(PartnerDetailsComponent);
    component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', { ...config, operation: 'create', controlsDisable: false } satisfies typeof config);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('PartnerDetailsComponent edit-session rollback', () => {
  let fixture: ComponentFixture<PartnerDetailsComponent>;
  let component: PartnerDetailsComponent;
  let http: HttpTestingController;
  let persisted: Partner;
  let archiveDecision: jasmine.Spy<DiffConfirmService['confirmOutdateOrDelete']>;
  type UpdatePayload = Parameters<PartnerService['saveUpdatedOwner']>[1] & { id: number };
  const baseUrl = `${environment.apiUrl}/api/partners`;
  const actor: AuthUser = {
    id: 7, userName: 'editor', firstName: 'Test', lastName: 'Editor', roleId: 1, roleName: 'Editor',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(actor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getPotentialHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((_ids, type) => of({
      data: [{ id: { countries: 143, regions: 20, districts: 30, localities: 40 }[type], name: type }],
    }));
    spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callFake(confirmation => {
      confirmation.accept?.();
      return TestBed.inject(ConfirmationService);
    });
    archiveDecision = spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();

    persisted = partnerSchema.parse({
      id: 10, firstName: 'Current', patronymic: 'Persisted Middle', lastName: 'Partner',
      affiliation: PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR, position: null,
      isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      dateOfStart: '2026-01-15T00:00:00.000Z', comment: null,
      address: {
        id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
        district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
      },
      orderedContacts: {
        email: [{ id: 61, content: 'current@example.com' }],
        phoneNumber: [{ id: 62, content: '+79991234567' }],
      },
      outdatedData: {
        names: [{ id: 81, firstName: 'Previous', patronymic: null, lastName: 'Name' }],
        contacts: { email: [{ id: 71, content: 'archived@example.com' }] },
        addresses: [], coordinations: [],
      },
      coordinations: [],
    });
    fixture = TestBed.createComponent(PartnerDetailsComponent);
    component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: persisted,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function enterEdit() {
    component.onEditClick();
    tick();
    expect(component.isEditModeSignal()).toBeTrue();
  }

  function discardEdit() {
    const confirm = TestBed.inject(ConfirmationService).confirm;
    component.onViewClick();
    tick();
    expect(confirm).toHaveBeenCalled();
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.outdatedNames).toEqual(persisted.outdatedData.names);
    expect(component.outdatedContacts).toEqual(persisted.outdatedData.contacts);
  }

  function save(): TestRequest {
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    component.onSaveClick('justSave');
    const check = http.expectOne(`${baseUrl}/check-partner-data/`);
    check.flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const request = http.expectOne(`${baseUrl}/update-partner`);
    expect(request.request.method).toBe('POST');
    expect(updatePartnerDataSchema.safeParse(request.request.body).success).toBeTrue();
    return request;
  }

  function expectedUpdate(main: UpdatePayload['changingData']['main']): UpdatePayload {
    return {
      id: persisted.id,
      changingData: { main, address: null, contacts: null, coordinations: null },
      restoringData: { names: null, addresses: null, contacts: {}, coordinations: null },
      outdatingData: { names: null, address: null, contacts: null, coordinations: null },
      deletingData: { names: null, addresses: null, contacts: null, coordinations: null },
    };
  }

  it('does not submit an archived-name deletion discarded before a later comment edit', fakeAsync(() => {
    enterEdit();
    component.onDeleteOutdatedData('names', 81);
    expect(component.outdatedNames).toEqual([]);
    discardEdit();
    enterEdit();
    component.mainForm.controls['comment'].setValue('Current session');

    const request = save();
    expect(request.request.body).toEqual(expectedUpdate({ comment: 'Current session' }));
    request.flush({ data: { ...persisted, comment: 'Current session' } });
    tick();
  }));

  it('does not submit a nested archived-contact deletion discarded before a later comment edit', fakeAsync(() => {
    enterEdit();
    component.onDeleteOutdatedData('contacts', 71);
    expect(component.outdatedContacts.email).toEqual([]);
    discardEdit();
    enterEdit();
    component.mainForm.controls['comment'].setValue('Current session');

    const request = save();
    expect(request.request.body).toEqual(expectedUpdate({ comment: 'Current session' }));
    request.flush({ data: { ...persisted, comment: 'Current session' } });
    tick();
  }));

  it('does not submit a name restoration discarded before a later comment edit', fakeAsync(() => {
    enterEdit();
    component.onRestoreOutdatedName(persisted.outdatedData.names[0]);
    tick();
    expect(component.mainForm.controls['firstName'].value).toBe('Previous');
    discardEdit();
    enterEdit();
    expect(component.mainForm.controls['firstName'].value).toBe('Current');
    component.mainForm.controls['comment'].setValue('Current session');

    const request = save();
    expect(request.request.body).toEqual(expectedUpdate({ comment: 'Current session' }));
    request.flush({ data: { ...persisted, comment: 'Current session' } });
    tick();
  }));

  it('does not submit a nested contact restoration discarded before a later comment edit', fakeAsync(() => {
    enterEdit();
    const archived = persisted.outdatedData.contacts.email?.[0];
    if (!archived) throw new Error('Fixture must contain an archived email');
    component.onRestoreOutdatedData('contacts', archived, 'email');
    tick();
    expect(component.getFormArray('email').getRawValue()).toContain('archived@example.com');
    discardEdit();
    enterEdit();
    expect(component.getFormArray('email').getRawValue()).toEqual(['current@example.com']);
    component.mainForm.controls['comment'].setValue('Current session');

    const request = save();
    expect(request.request.body).toEqual(expectedUpdate({ comment: 'Current session' }));
    request.flush({ data: { ...persisted, comment: 'Current session' } });
    tick();
  }));

  it('does not retry a planner-generated contact deletion after a failed save and discarded edit', fakeAsync(() => {
    archiveDecision.and.resolveTo(false);
    enterEdit();
    component.getFormArray('email').at(0).setValue(null);
    const failed = save();
    expect(failed.request.body).toEqual({
      ...expectedUpdate(null),
      deletingData: { names: null, addresses: null, contacts: [61], coordinations: null },
    });
    failed.flush({ code: 'ERRORS.UPDATE_FAILED' }, { status: 500, statusText: 'Server Error' });
    tick();
    expect(TestBed.inject(MessageWrapperService).handle).toHaveBeenCalled();
    expect(component.showSpinner()).toBeFalse();
    discardEdit();
    enterEdit();
    component.mainForm.controls['comment'].setValue('Current session');

    const retry = save();
    expect(retry.request.body).toEqual(expectedUpdate({ comment: 'Current session' }));
    retry.flush({ data: { ...persisted, comment: 'Current session' } });
    tick();
  }));

  it('starts a later edit from the refreshed history after a successful save-and-stay', fakeAsync(() => {
    enterEdit();
    component.onDeleteOutdatedData('names', 81);
    const first = save();
    expect(first.request.body).toEqual({
      ...expectedUpdate(null),
      deletingData: { names: [81], addresses: null, contacts: null, coordinations: null },
    });
    const refreshed = { ...persisted, outdatedData: { ...persisted.outdatedData, names: [] } };
    first.flush({ data: refreshed });
    tick();
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.outdatedNames).toEqual([]);
    enterEdit();
    component.mainForm.controls['comment'].setValue('After successful save');

    const next = save();
    expect(next.request.body).toEqual(expectedUpdate({ comment: 'After successful save' }));
    next.flush({ data: { ...refreshed, comment: 'After successful save' } });
    tick();
  }));
});
