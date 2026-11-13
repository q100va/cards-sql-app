import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { HomesListComponent } from '../homes-list/homes-list.component';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { PartnerService } from '../../services/partner.service';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';

import { HomeDetailsComponent } from './home-details.component';
import { homeSchema, updateHomeDataSchema } from '../../../../shared/schemas/home.schema';
import { DiffConfirmService } from '../../services/diff-confirm.service';
import { buildDraft } from '../../utils/owner-draft.builder';
import { AuthUser } from '../../../../shared/schemas/auth.schema';
import { Home } from '../../interfaces/advanced-model';
import { AuthService } from '../../services/auth.service';
import { MessageWrapperService } from '../../services/message.service';
import { environment } from '../../../environments/environment';

describe('HomeDetailsComponent', () => {
  let component: HomeDetailsComponent;
  let fixture: ComponentFixture<HomeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeDetailsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(PartnerService), 'getActivePartnersPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(HomeDetailsComponent);
    component = fixture.componentInstance;
    const config = new HomesListComponent().homeDialogConfig;
    fixture.componentRef.setInput('data', { ...config, operation: 'create', controlsDisable: false } satisfies typeof config);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function prepareHomeEdit() {
    const home = homeSchema.parse({
      id: 10, homeName: 'Example Home', officialName: 'Previous Official Home',
      noAddress: false, specialHome: false, acceptableForSchool: true,
      isRestricted: false, dateOfStart: '2026-01-15T00:00:00.000Z',
      causeOfRestriction: null, dateOfRestriction: null, comment: null, infoNote: null,
      address: {
        id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
        district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
        postalCode: '123456', postalName: 'Example Home', postalAddressPart: 'Building 1',
        fullPostalAddress: '123456 Country, Region, District, Locality, Building 1', isRecoverable: true,
      },
      orderedContacts: {}, outdatedData: { contacts: {}, addresses: [], officialNames: [], coordinations: [] },
      coordinations: [], dateOfLastUpdate: null, isClose: false, dateOfClose: null,
    });
    fixture.componentRef.setInput('data', { ...component.data(), operation: 'view-edit', object: home });
    component.mainForm.patchValue({
      ...home, postalCode: home.address.postalCode, postalName: home.address.postalName,
      postalAddressPart: home.address.postalAddressPart,
    });
    component.coordinationsArray.clear();
    component.addressFilter.set({ countries: [143], regions: [20], districts: [30], localities: [40] });
    component.setChangingData();
    component.setOutdatingData();
    component.setRestoringDataDraft();
    component.setDeletingDataDraft();
    return home;
  }

  it('converts separate Home form postal fields into a complete schema-valid address update', async () => {
    const home = prepareHomeEdit();
    const confirm = spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
    component.mainForm.controls['postalAddressPart'].setValue('Building 2');
    component.ownerDraft = buildDraft('home', component.mainForm, component.addressFilter(), component.contactTypes, home, 7);

    const update = await component.checkAllChanges();
    expect(component.ownerDraft.draftAddress).toEqual({ countryId: 143, regionId: 20, districtId: 30, localityId: 40 });
    expect(component.ownerDraft.postalAddressPart).toBe('Building 2');
    expect<unknown>(update.changingData.address).toEqual({
      countryId: 143, regionId: 20, districtId: 30, localityId: 40,
      postalCode: '123456', postalName: 'Example Home', postalAddressPart: 'Building 2',
    });
    expect(update.changingData.main).toBeNull();
    expect(update.outdatingData.address).toBe(50);
    expect(update.restoringData).toEqual({ addresses: null, officialNames: null, contacts: null, coordinations: null });
    expect(update.deletingData).toEqual({ addresses: null, officialNames: null, contacts: null, coordinations: null });
    expect(updateHomeDataSchema.safeParse({ id: home.id, ...update }).success).toBeTrue();
    expect(confirm).toHaveBeenCalledWith('address', home.address.fullPostalAddress);
  });

  it('converts a renamed official name and archive decision into the backend object wrapper', async () => {
    const home = prepareHomeEdit();
    const confirm = spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
    component.mainForm.controls['officialName'].setValue('Updated Official Home');
    component.ownerDraft = buildDraft('home', component.mainForm, component.addressFilter(), component.contactTypes, home, 7);

    const update = await component.checkAllChanges();
    expect(update.changingData.main).toEqual({ officialName: 'Updated Official Home' });
    expect<unknown>(update.outdatingData.officialName).toEqual({ officialName: 'Previous Official Home' });
    expect(update.changingData.address).toBeNull();
    expect(update.outdatingData.address).toBeNull();
    expect(update.restoringData).toEqual({ addresses: null, officialNames: null, contacts: null, coordinations: null });
    expect(update.deletingData).toEqual({ addresses: null, officialNames: null, contacts: null, coordinations: null });
    expect(updateHomeDataSchema.safeParse({ id: home.id, ...update }).success).toBeTrue();
    expect(confirm).toHaveBeenCalledWith('officialName', home.officialName);
  });

  it('keeps official-name archival null when the user declines to archive the old name', async () => {
    const home = prepareHomeEdit();
    const confirm = spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(false);
    component.mainForm.controls['officialName'].setValue('Updated Official Home');
    component.ownerDraft = buildDraft('home', component.mainForm, component.addressFilter(), component.contactTypes, home, 7);

    const update = await component.checkAllChanges();
    expect(update.changingData.main).toEqual({ officialName: 'Updated Official Home' });
    expect(update.outdatingData).toEqual({ address: null, officialName: null, contacts: null, coordinations: null });
    expect(updateHomeDataSchema.safeParse({ id: home.id, ...update }).success).toBeTrue();
    expect(confirm).toHaveBeenCalledWith('officialName', home.officialName);
  });

  it('preserves blank optional postal text as null in the request while retaining the form representation', async () => {
    const home = prepareHomeEdit();
    spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
    component.mainForm.controls['postalAddressPart'].setValue('   ');
    component.ownerDraft = buildDraft('home', component.mainForm, component.addressFilter(), component.contactTypes, home, 7);

    const update = await component.checkAllChanges();
    expect(component.ownerDraft.postalAddressPart).toBe('');
    expect(update.changingData.address).toEqual({
      countryId: 143, regionId: 20, districtId: 30, localityId: 40,
      postalCode: '123456', postalName: 'Example Home', postalAddressPart: null,
    });
    expect(update.outdatingData.address).toBe(50);
    expect(updateHomeDataSchema.safeParse({ id: home.id, ...update }).success).toBeTrue();
  });
});

describe('HomeDetailsComponent failed edit-session recovery', () => {
  let fixture: ComponentFixture<HomeDetailsComponent>;
  let component: HomeDetailsComponent;
  let http: HttpTestingController;
  let persisted: Home;
  const actor: AuthUser = {
    id: 7, userName: 'editor', firstName: 'Test', lastName: 'Editor', roleId: 1, roleName: 'Editor',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(actor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(PartnerService), 'getActivePartnersPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((_ids, type) => of({
      data: [{ id: { countries: 143, regions: 20, districts: 30, localities: 40 }[type], name: type }],
    }));
    spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callFake(confirmation => {
      confirmation.accept?.();
      return TestBed.inject(ConfirmationService);
    });
    spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    persisted = homeSchema.parse({
      id: 10, homeName: 'Example Home', officialName: 'Persisted Official Home',
      noAddress: false, specialHome: false, acceptableForSchool: true,
      isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      dateOfStart: '2026-01-15T00:00:00.000Z', comment: null, infoNote: null,
      address: {
        id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
        district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
        postalCode: '123456', postalName: 'Example Home', postalAddressPart: 'Building 1',
        fullPostalAddress: 'Country, Region, District, Locality, Building 1', isRecoverable: true,
      },
      orderedContacts: { email: [{ id: 61, content: 'current@example.com' }] },
      outdatedData: { contacts: {}, addresses: [], officialNames: [], coordinations: [] },
      coordinations: [], dateOfLastUpdate: null, isClose: false, dateOfClose: null,
    });
    fixture = TestBed.createComponent(HomeDetailsComponent);
    component = fixture.componentInstance;
    const config = new HomesListComponent().homeDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: persisted,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function save(): TestRequest {
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    component.onSaveClick('justSave');
    flushMicrotasks();
    const request = http.expectOne(`${environment.apiUrl}/api/homes/update-home`);
    expect(request.request.method).toBe('POST');
    expect(updateHomeDataSchema.safeParse(request.request.body).success).toBeTrue();
    return request;
  }

  it('does not carry a failed official-name change or its archive plan into a later comment-only save', fakeAsync(() => {
    component.onEditClick();
    tick();
    component.mainForm.controls['officialName'].setValue('Discarded Official Home');
    const failed = save();
    expect(failed.request.body).toEqual({
      id: 10,
      changingData: { main: { officialName: 'Discarded Official Home' }, address: null, contacts: null, coordinations: null },
      restoringData: { addresses: null, officialNames: null, contacts: {}, coordinations: null },
      outdatingData: {
        address: null, officialName: { officialName: 'Persisted Official Home' }, contacts: null, coordinations: null,
      },
      deletingData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
    });
    failed.flush({ code: 'ERRORS.UPDATE_FAILED' }, { status: 500, statusText: 'Server Error' });
    tick();
    expect(TestBed.inject(MessageWrapperService).handle).toHaveBeenCalled();
    expect(component.showSpinner()).toBeFalse();
    component.onViewClick();
    tick();
    expect(TestBed.inject(ConfirmationService).confirm).toHaveBeenCalled();
    expect(component.isEditModeSignal()).toBeFalse();
    component.onEditClick();
    tick();
    expect(component.mainForm.controls['officialName'].value).toBe('Persisted Official Home');
    component.mainForm.controls['comment'].setValue('Current session');

    const retry = save();
    expect(retry.request.body).toEqual({
      id: 10,
      changingData: { main: { comment: 'Current session' }, address: null, contacts: null, coordinations: null },
      restoringData: { addresses: null, officialNames: null, contacts: {}, coordinations: null },
      outdatingData: { address: null, officialName: null, contacts: null, coordinations: null },
      deletingData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
    });
    retry.flush({ data: { ...persisted, comment: 'Current session' } });
    tick();
  }));
});
