import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { INSTITUTE_CATEGORY } from '../../../../../../shared/constants/volunteers';
import { homeSchema, updateHomeDataSchema } from '../../../../../../shared/schemas/home.schema';
import { volunteerSchema, updateVolunteerDataSchema } from '../../../../../../shared/schemas/volunteer.schema';
import { environment } from '../../../../../environments/environment';
import type { AddressKey } from '../../../../interfaces/toponym';
import { HomeDetailsComponent } from '../../../../pages/home-details/home-details.component';
import { HomesListComponent } from '../../../../pages/homes-list/homes-list.component';
import { PartnerDetailsComponent } from '../../../../pages/partner-details/partner-details.component';
import { PartnersListComponent } from '../../../../pages/partners-list/partners-list.component';
import { VolunteerDetailsComponent } from '../../../../pages/volunteer-details/volunteer-details.component';
import { VolunteersListComponent } from '../../../../pages/volunteers-list/volunteers-list.component';
import { AddressService } from '../../../../services/address.service';
import { AuthService } from '../../../../services/auth.service';
import { lifetimePartner } from '../../../../testing/async-lifetime.spec-fixtures';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetHome, resetVolunteer } from '../../../../testing/reset.spec-fixtures';

describe('AdvancedDetails concrete-owner lifecycle contracts', () => {
  const defaults = { countryId: 143, regionId: 20, districtId: 30, localityId: 40 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent, HomeDetailsComponent, VolunteerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('restores Partner relation controls and shared pending edits when the user discards an edit session', fakeAsync(() => {
    const owner = lifetimePartner();
    owner.coordinations = [{ id: 71, homeId: 20, partnerId: owner.id, homeName: 'Current Home', regionName: 'Region', isRecoverable: true }];
    owner.outdatedData.names = [{ id: 81, firstName: 'Archived', patronymic: null, lastName: 'Partner' }];
    const fixture = TestBed.createComponent(PartnerDetailsComponent);
    const component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true }, defaultAddressParams: defaults,
    } satisfies typeof config);
    fixture.detectChanges();
    expect(component.coordinationsArray.at(0).disabled).toBeTrue();

    component.onEditClick();
    tick();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.coordinationsArray.at(0).enabled).toBeTrue();
    component.coordinationsArray.at(0).setValue({ id: 21, name: 'Discarded Home' });
    component.onDeleteOutdatedData('names', 81);
    tick();
    expect(component.changesSignal()).toBeTrue();
    expect(component.deletingSignal()).toBeTrue();

    component.onViewClick();
    tick();
    fixture.detectChanges();
    expect(component.coordinationsArray.getRawValue()).toEqual([{ id: 20, name: 'Current Home - Region', homeStatus: undefined }]);
    expect(component.coordinationsArray.at(0).disabled).toBeTrue();
    expect(component.outdatedNames).toEqual(owner.outdatedData.names);
    expect(component.restoringDataDraft).toEqual({ names: null, addresses: null, contacts: null, coordinations: null });
    expect(component.deletingDataDraft).toEqual({ names: null, addresses: null, contacts: null, coordinations: null });
    expect(component.changingData).toEqual({ main: null, address: null, contacts: null, coordinations: null });
    expect(component.outdatingData).toEqual({ names: null, address: null, contacts: null, coordinations: null });
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.changesSignal()).toBeFalse();
    expect(component.deletingSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();

    component.onEditClick();
    tick();
    expect(component.coordinationsArray.at(0).enabled).toBeTrue();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
  }));

  it('rehydrates Home geography, postal fields, relation labels and history from a successful save-and-stay response', fakeAsync(() => {
    const lookup = TestBed.inject(AddressService).getListOfToponyms;
    if (!jasmine.isSpy(lookup)) throw new Error('Expected the shared fixture lookup spy');
    const choices = {
      countries: [{ id: 143, name: 'Country' }],
      regions: [{ id: 20, name: 'Region' }, { id: 21, name: 'Updated Region' }],
      districts: [{ id: 30, name: 'District' }, { id: 31, name: 'Updated District' }],
      localities: [{ id: 40, name: 'Locality' }, { id: 41, name: 'Updated Locality' }],
    };
    lookup.and.callFake((_ids: number[], type: AddressKey) => of({ data: choices[type] }));
    const owner = resetHome();
    owner.coordinations = [{ id: 71, homeId: owner.id, partnerId: 20, partnerName: 'Previous Partner', isRecoverable: true }];
    const fixture = TestBed.createComponent(HomeDetailsComponent);
    const component = fixture.componentInstance;
    const config = new HomesListComponent().homeDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true }, defaultAddressParams: defaults,
    } satisfies typeof config);
    fixture.detectChanges();
    component.onEditClick();
    component.onChangeAddress({ countries: [143], regions: [21], districts: [31], localities: [41] });
    component.mainForm.patchValue({ homeName: 'Updated Home', postalCode: '654321', postalName: 'Updated Postal Recipient', postalAddressPart: 'Building 2' });
    component.coordinationsArray.at(0).setValue({ id: 30, name: 'Selected Partner' });
    tick();
    expect(component.coordinationsArray.at(0).enabled).toBeTrue();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    component.onSaveClick('justSave');
    flushMicrotasks();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/api/homes/update-home`);
    expect(updateHomeDataSchema.safeParse(request.request.body).success).toBeTrue();
    const refreshed = homeSchema.parse({
      ...owner, homeName: 'Updated Home',
      address: {
        ...owner.address, id: 51, region: { id: 21, shortName: 'Updated Region' }, district: { id: 31, shortName: 'Updated District' },
        locality: { id: 41, shortName: 'Updated Locality' }, postalCode: '654321', postalName: 'Updated Postal Recipient',
        postalAddressPart: 'Building 2', fullPostalAddress: '654321 Country, Updated Region, Updated District, Updated Locality, Building 2',
      },
      coordinations: [{ id: 72, homeId: owner.id, partnerId: 30, partnerName: 'Persisted Partner', isRecoverable: true }],
      outdatedData: { ...owner.outdatedData, addresses: [owner.address], coordinations: owner.coordinations },
    });
    request.flush({ data: refreshed });
    tick();
    fixture.detectChanges();

    expect(component.existingOwner).toEqual(refreshed);
    expect(component.mainForm.controls['homeName'].value).toBe(refreshed.homeName);
    expect(component.mainForm.controls['postalCode'].value).toBe(refreshed.address.postalCode);
    expect(component.mainForm.controls['postalName'].value).toBe(refreshed.address.postalName);
    expect(component.mainForm.controls['postalAddressPart'].value).toBe(refreshed.address.postalAddressPart);
    expect(component.getPostalAddress()).toBe(refreshed.address.fullPostalAddress);
    expect(component.data().defaultAddressParams).toEqual({ countryId: 143, regionId: 21, districtId: 31, localityId: 41 });
    expect(component.addressFilter()).toEqual({ countries: [143], regions: [21], districts: [31], localities: [41] });
    expect(component.addressFilterComponent.form.getRawValue()).toEqual({ country: 143, region: 21, district: 31, locality: 41 });
    expect(component.addressFilterComponent.params().readonly).toBeTrue();
    expect(component.coordinationsArray.getRawValue()).toEqual([{ id: 30, name: 'Persisted Partner' }]);
    expect(component.coordinationsArray.at(0).disabled).toBeTrue();
    expect(component.outdatedAddresses).toEqual([owner.address]);
    expect(component.outdatedCoordinations).toEqual(owner.coordinations);
    expect(component.hasOutdatedAddresses()).toBeTrue();
    expect(component.hasOutdatedCoordinations()).toBeTrue();
    expect(component.homeOpen()).toBeTrue();
    expect(component.restoringDataDraft).toEqual({ addresses: null, officialNames: null, contacts: null, coordinations: null });
    expect(component.deletingDataDraft).toEqual({ addresses: null, officialNames: null, contacts: null, coordinations: null });
    expect(component.changingData).toEqual({ main: null, address: null, contacts: null, coordinations: null });
    expect(component.outdatingData).toEqual({ address: null, officialName: null, contacts: null, coordinations: null });
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    expect(component.showSpinner()).toBeFalse();
  }));

  it('refreshes Volunteer institute controls, current-user subscription and history flags before the next edit', fakeAsync(() => {
    const owner = resetVolunteer();
    const previousInstitute = { id: 81, instituteName: 'Previous School', category: INSTITUTE_CATEGORY.SCHOOL, isDeletable: true };
    const oldSubscription = { id: 90, userId: 8, userName: 'previous', userFullName: 'Previous Subscriber' };
    const oldCooperation = { ...oldSubscription, id: 91 };
    owner.institutes = [previousInstitute];
    owner.outdatedData.subscriptions = [oldSubscription];
    owner.outdatedData.cooperations = [oldCooperation];
    const fixture = TestBed.createComponent(VolunteerDetailsComponent);
    const component = fixture.componentInstance;
    const config = new VolunteersListComponent().volunteerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true }, defaultAddressParams: defaults,
    } satisfies typeof config);
    fixture.detectChanges();
    expect(component.institutesArray.at(0).disabled).toBeTrue();
    expect(component.hasOutdatedInstitutes()).toBeFalse();
    component.onEditClick();
    component.onAddInstituteClick();
    const institutes = [
      { instituteName: 'Updated University', category: INSTITUTE_CATEGORY.UNIVERSITY },
      { instituteName: 'Additional School', category: INSTITUTE_CATEGORY.SCHOOL },
    ];
    component.institutesArray.at(0).setValue(institutes[0]);
    component.institutesArray.at(1).setValue(institutes[1]);
    component.mainForm.controls['subscription'].setValue(true);
    tick();
    expect(component.institutesArray.controls.every(group => group.enabled)).toBeTrue();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    component.onSaveClick('justSave');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${environment.apiUrl}/api/volunteers/check-volunteer-data/`).flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const request = http.expectOne(`${environment.apiUrl}/api/volunteers/update-volunteer`);
    expect(updateVolunteerDataSchema.safeParse(request.request.body).success).toBeTrue();
    const subscription = { id: 84, userId: resetActor.id, userName: resetActor.userName, userFullName: 'Test Editor' };
    const refreshed = volunteerSchema.parse({
      ...owner, institutes: institutes.map((item, index) => ({ ...item, id: 82 + index, isDeletable: true })),
      subscriptions: [subscription], outdatedData: { ...owner.outdatedData, institutes: [previousInstitute] },
    });
    request.flush({ data: refreshed });
    tick();
    fixture.detectChanges();

    expect(component.existingOwner).toEqual(refreshed);
    expect(component.institutesArray.getRawValue()).toEqual(institutes);
    expect(component.institutesArray.controls.every(group => group.disabled)).toBeTrue();
    expect(component.mainForm.controls['subscription'].value).toBeTrue();
    expect(component.subscriptions).toEqual([subscription]);
    expect(component.outdatedInstitutes).toEqual([previousInstitute]);
    expect(component.outdatedSubscriptions).toEqual([oldSubscription]);
    expect(component.outdatedCooperations).toEqual([oldCooperation]);
    expect([component.hasOutdatedInstitutes(), component.hasOutdatedSubs(), component.hasOutdatedCoops()]).toEqual([true, true, true]);
    expect(component.restoringDataDraft).toEqual({ names: null, addresses: null, contacts: null, institutes: null });
    expect(component.deletingDataDraft).toEqual({ names: null, addresses: null, contacts: null, institutes: null, subscriptions: null });
    expect(component.changingData).toEqual({ main: null, address: null, contacts: null, institutes: null, subscriptions: null, cooperations: null });
    expect(component.outdatingData).toEqual({ names: null, address: null, contacts: null, institutes: null });
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    expect(component.showSpinner()).toBeFalse();

    component.onEditClick();
    tick();
    expect(component.institutesArray.controls.every(group => group.enabled)).toBeTrue();
    expect(component.institutesArray.getRawValue()).toEqual(institutes);
    expect(component.mainForm.controls['subscription'].value).toBeTrue();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
  }));
});
