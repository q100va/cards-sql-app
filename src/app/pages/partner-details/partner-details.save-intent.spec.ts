import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { PartnerDetailsComponent } from './partner-details.component';
import { PartnersListComponent } from '../partners-list/partners-list.component';
import { AddressService } from '../../services/address.service';
import { AuthService } from '../../services/auth.service';
import { HomeService } from '../../services/home.service';
import { MessageWrapperService } from '../../services/message.service';
import { PartnerService } from '../../services/partner.service';
import { RoleService } from '../../services/role.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { lifetimePartner } from '../../testing/async-lifetime.spec-fixtures';
import { environment } from '../../../environments/environment';

describe('PartnerDetailsComponent save-intent continuations', () => {
  let fixture: ComponentFixture<PartnerDetailsComponent>;
  let component: PartnerDetailsComponent;
  let http: HttpTestingController;
  let confirmations: Confirmation[];
  let saveUpdated: jasmine.Spy<PartnerService['saveUpdatedOwner']>;
  const baseUrl = `${environment.apiUrl}/api/partners`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of({
          id: 7, roleId: 1, userName: 'editor', firstName: 'Test', lastName: 'Editor', roleName: 'Editor',
        }) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getPotentialHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((_ids, type) => of({
      data: [{ id: { countries: 143, regions: 20, districts: 30, localities: 40 }[type], name: type }],
    }));
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    const confirmService = TestBed.inject(ConfirmationService);
    confirmations = [];
    spyOn(confirmService, 'confirm').and.callFake(confirmation => {
      confirmations.push(confirmation);
      return confirmService;
    });
    saveUpdated = spyOn(TestBed.inject(PartnerService), 'saveUpdatedOwner').and.callThrough();
    fixture = TestBed.createComponent(PartnerDetailsComponent);
    component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: lifetimePartner(),
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function edit(field = 'comment', value = 'Current edit') {
    component.onEditClick();
    component.mainForm.controls[field].setValue(value);
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
  }

  function startSave() {
    component.onSaveClick('justSave');
    return http.expectOne(`${baseUrl}/check-partner-data/`);
  }

  function finishCheck(request: ReturnType<typeof startSave>, duplicates = false) {
    request.flush({ data: { duplicatesName: duplicates ? ['Current Partner'] : [], duplicatesContact: [] } });
    flushMicrotasks();
  }

  it('ignores old confirmation accept and reject callbacks after an identical new save starts', fakeAsync(() => {
    edit();
    const first = startSave();
    finishCheck(first, true);
    const obsolete = confirmations[0];
    const current = startSave();
    expect(current.request.body).toEqual(first.request.body);
    obsolete.reject?.();
    obsolete.accept?.();
    flushMicrotasks();
    expect(component.showSpinner()).toBeTrue();
    expect(saveUpdated).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);

    finishCheck(current, true);
    expect(confirmations.length).toBe(2);
    confirmations[1].accept?.();
    flushMicrotasks();
    http.expectOne(`${baseUrl}/update-partner`).flush({ data: { ...lifetimePartner(), comment: 'Current edit' } });
    tick();
    expect(saveUpdated).toHaveBeenCalledTimes(1);
    expect(component.showSpinner()).toBeFalse();
  }));

  it('does not apply an awaited archive result after a newer save becomes current', fakeAsync(() => {
    edit('firstName', 'Earlier');
    finishCheck(startSave());
    const obsolete = confirmations[0];
    component.mainForm.controls['firstName'].setValue('Current');
    component.mainForm.controls['comment'].setValue('New intent');
    tick();
    const current = startSave();
    const before = structuredClone({ changing: component.changingData, outdating: component.outdatingData });
    obsolete.accept?.();
    flushMicrotasks();
    expect({ changing: component.changingData, outdating: component.outdatingData }).toEqual(before);
    expect(saveUpdated).not.toHaveBeenCalled();
    expect(component.showSpinner()).toBeTrue();

    finishCheck(current);
    const update = http.expectOne(`${baseUrl}/update-partner`);
    expect(update.request.body.changingData.main).toEqual({ comment: 'New intent' });
    expect(update.request.body.outdatingData.names).toBeNull();
    update.flush({ data: { ...lifetimePartner(), comment: 'New intent' } });
    tick();
  }));

  it('invalidates an archive continuation when the user accepts leaving edit mode', fakeAsync(() => {
    edit('firstName', 'Abandoned');
    finishCheck(startSave());
    const obsolete = confirmations[0];
    component.onViewClick();
    confirmations[1].accept?.();
    tick();
    expect(component.isEditModeSignal()).toBeFalse();
    const before = structuredClone({ changing: component.changingData, outdating: component.outdatingData });
    obsolete.accept?.();
    flushMicrotasks();
    expect({ changing: component.changingData, outdating: component.outdatingData }).toEqual(before);
    expect(saveUpdated).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);
  }));

  it('does not open another contact confirmation when destruction occurs during the first decision', fakeAsync(() => {
    const owner = lifetimePartner();
    owner.orderedContacts.email?.push({ id: 62, content: 'second@example.com' });
    fixture.componentRef.setInput('data', { ...component.data(), object: owner });
    edit();
    component.getFormArray('email').at(0).setValue('replacement@example.com');
    component.getFormArray('email').removeAt(1);
    tick();
    finishCheck(startSave());
    expect(confirmations.length).toBe(1);
    const before = structuredClone(component.changingData);
    fixture.destroy();
    confirmations[0].accept?.();
    flushMicrotasks();
    expect(confirmations.length).toBe(1);
    expect(component.changingData).toEqual(before);
    expect(saveUpdated).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);
  }));

  it('allows retrying current edits after an HTTP save failure without discarding the session', fakeAsync(() => {
    edit();
    finishCheck(startSave());
    const failed = http.expectOne(`${baseUrl}/update-partner`);
    const firstPayload: unknown = failed.request.body;
    failed.flush({}, { status: 500, statusText: 'Server Error' });
    tick();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.controls['comment'].value).toBe('Current edit');
    expect(component.showSpinner()).toBeFalse();
    expect(TestBed.inject(MessageWrapperService).handle).toHaveBeenCalledTimes(1);

    finishCheck(startSave());
    const retry = http.expectOne(`${baseUrl}/update-partner`);
    expect(retry.request.body).toEqual(firstPayload);
    retry.flush({ data: { ...lifetimePartner(), comment: 'Current edit' } });
    tick();
    expect(saveUpdated).toHaveBeenCalledTimes(2);
    expect(component.showSpinner()).toBeFalse();
  }));
});
