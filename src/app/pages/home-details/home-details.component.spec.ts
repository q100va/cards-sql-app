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
import {
  homeSchema, updateHomeDataSchema, outdatedAddressItemSchema, OutdatedHomeAddress, OutdatedOfficialName,
} from '../../../../shared/schemas/home.schema';
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

describe('HomeDetailsComponent archived-value restoration', () => {
  let fixture: ComponentFixture<HomeDetailsComponent>;
  let component: HomeDetailsComponent;
  let http: HttpTestingController;
  let persisted: Home;
  const actor: AuthUser = {
    id: 7, userName: 'editor', firstName: 'Test', lastName: 'Editor', roleId: 1, roleName: 'Editor',
  };
  const archivedName: OutdatedOfficialName = { id: 81, officialName: 'Archived Official Home' };
  const currentAddress: Home['address'] = {
    id: 50, country: { id: 143, name: 'Current Country' }, region: { id: 20, shortName: 'Current Region' },
    district: { id: 30, shortName: 'Current District' }, locality: { id: 40, shortName: 'Current Locality' },
    postalCode: '123456', postalName: 'Current Postal Recipient', postalAddressPart: 'Current Street 1',
    fullPostalAddress: '123456 Current Country, Current Region, Current District, Current Locality, Current Street 1',
    isRecoverable: true,
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
    const choices = {
      countries: [{ id: 143, name: 'Current Country' }, { id: 144, name: 'Archived Country' }],
      regions: [{ id: 20, name: 'Current Region' }, { id: 21, name: 'Archived Region' }],
      districts: [{ id: 30, name: 'Current District' }, { id: 31, name: 'Archived District' }],
      localities: [{ id: 40, name: 'Current Locality' }, { id: 41, name: 'Archived Locality' }],
    };
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((ids, type) => {
      const archived = ids.includes(144) || ids.includes(21) || ids.includes(31);
      return of({ data: type === 'countries' ? choices[type] : [choices[type][archived ? 1 : 0]] });
    });
    spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function openHome(address: OutdatedHomeAddress | null = null) {
    persisted = homeSchema.parse({
      id: 10, homeName: 'Example Home', officialName: 'Current Official Home',
      noAddress: false, specialHome: false, acceptableForSchool: true,
      isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      dateOfStart: '2026-01-15T00:00:00.000Z', comment: null, infoNote: null,
      address: currentAddress, orderedContacts: { email: [{ id: 61, content: 'current@example.com' }] },
      outdatedData: { contacts: {}, addresses: address ? [address] : [], officialNames: [archivedName], coordinations: [] },
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
    fixture.detectChanges();
    component.onEditClick();
    tick();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.valid).toBeTrue();
  }

  function archivedAddress(overrides: Partial<OutdatedHomeAddress> = {}): OutdatedHomeAddress {
    return outdatedAddressItemSchema.parse({
      id: 82, country: { id: 144, name: 'Archived Country' }, region: { id: 21, shortName: 'Archived Region' },
      district: { id: 31, shortName: 'Archived District' }, locality: { id: 41, shortName: 'Archived Locality' },
      postalCode: '654321', postalName: 'Archived Postal Recipient', postalAddressPart: 'Archived Street 9',
      fullPostalAddress: '654321 Archived Country, Archived Region, Archived District, Archived Locality, Archived Street 9',
      isRecoverable: true, ...overrides,
    });
  }

  function emptyUpdate() {
    return {
      id: 10,
      changingData: { main: null, address: null, contacts: null, coordinations: null },
      restoringData: { addresses: null, officialNames: null, contacts: {}, coordinations: null },
      outdatingData: { address: null, officialName: null, contacts: null, coordinations: null },
      deletingData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
    };
  }

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

  function expectAddressRestoration(address: OutdatedHomeAddress) {
    openHome(address);
    const sourceHistory = structuredClone(persisted.outdatedData);
    const sourceAddress = structuredClone(address);
    component.onRestoreOutdatedData('addresses', address);
    tick();

    expect(component.addressFilter()).toEqual({
      countries: [address.country.id], regions: [address.region.id],
      districts: [address.district.id], localities: [address.locality.id],
    });
    expect(component.mainForm.controls['postalCode'].value).toBe(address.postalCode);
    expect(component.mainForm.controls['postalName'].value).toBe(address.postalName);
    expect(component.mainForm.controls['postalAddressPart'].value).toBe(address.postalAddressPart);
    expect(component.outdatedAddresses).toEqual([]);
    expect(persisted.outdatedData).toEqual(sourceHistory);
    expect(address).toEqual(sourceAddress);

    const request = save();
    expect(component.ownerDraft.draftAddress).toEqual({
      countryId: address.country.id, regionId: address.region.id,
      districtId: address.district.id, localityId: address.locality.id,
    });
    expect(component.ownerDraft.postalCode).toBe(address.postalCode);
    expect(component.ownerDraft.postalName).toBe(address.postalName);
    expect(component.ownerDraft.postalAddressPart).toBe(address.postalAddressPart ?? '');
    const expected = emptyUpdate();
    expect(request.request.body).toEqual({
      ...expected,
      restoringData: { ...expected.restoringData, addresses: [address.id] },
      outdatingData: { ...expected.outdatingData, address: currentAddress.id },
    });
    request.flush({ data: {
      ...persisted, address,
      outdatedData: { ...persisted.outdatedData, addresses: [currentAddress] },
    } });
    tick();
  }

  it('restores an archived official name into officialName and preserves the restore/archive request boundary', fakeAsync(() => {
    openHome();
    const sourceHistory = structuredClone(persisted.outdatedData);
    component.onRestoreOutdatedOfficialName(archivedName);
    tick();
    expect(component.mainForm.controls['officialName'].value).toBe(archivedName.officialName);
    expect(component.outdatedOfficialNames).toEqual([]);
    expect(persisted.outdatedData).toEqual(sourceHistory);

    const request = save();
    expect(component.ownerDraft.officialName).toBe(archivedName.officialName);
    const expected = emptyUpdate();
    expect(request.request.body).toEqual({
      ...expected,
      changingData: { ...expected.changingData, main: { officialName: archivedName.officialName } },
      restoringData: { ...expected.restoringData, officialNames: [archivedName.id] },
      outdatingData: { ...expected.outdatingData, officialName: { officialName: persisted.officialName } },
    });
    request.flush({ data: {
      ...persisted, officialName: archivedName.officialName,
      outdatedData: { ...persisted.outdatedData, officialNames: [{ id: 90, officialName: persisted.officialName }] },
    } });
    tick();
  }));

  it('restores every geographic and postal field from an archived Home address before saving its history ID', fakeAsync(() => {
    expectAddressRestoration(archivedAddress());
  }));

  it('restores archived postal values even when the geographic hierarchy is unchanged', fakeAsync(() => {
    expectAddressRestoration(archivedAddress({
      country: currentAddress.country, region: currentAddress.region,
      district: currentAddress.district, locality: currentAddress.locality,
      fullPostalAddress: '654321 Current Country, Current Region, Current District, Current Locality, Archived Street 9',
    }));
  }));

  it('preserves an intentionally absent archived postalAddressPart through restoration and the save plan', fakeAsync(() => {
    expectAddressRestoration(archivedAddress({
      country: currentAddress.country, region: currentAddress.region,
      district: currentAddress.district, locality: currentAddress.locality,
      postalAddressPart: null,
      fullPostalAddress: '654321 Current Country, Current Region, Current District, Current Locality',
    }));
  }));
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
