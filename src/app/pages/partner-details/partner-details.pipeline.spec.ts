import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { updatePartnerDataSchema } from '../../../../shared/schemas/partner.schema';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { DiffConfirmService } from '../../services/diff-confirm.service';
import { OwnerChangesPlannerService } from '../../services/owner-changes-planner.service';
import { lifetimePartner } from '../../testing/async-lifetime.spec-fixtures';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor } from '../../testing/reset.spec-fixtures';
import { PartnersListComponent } from '../partners-list/partners-list.component';
import { PartnerDetailsComponent } from './partner-details.component';

describe('PartnerDetailsComponent shared save pipeline', () => {
  let fixture: ComponentFixture<PartnerDetailsComponent>;
  let component: PartnerDetailsComponent;
  let http: HttpTestingController;
  let confirmations: Confirmation[];
  let planContacts: jasmine.Spy<OwnerChangesPlannerService['diffContacts']>;
  let archive: jasmine.Spy<DiffConfirmService['confirmOutdateOrDelete']>;
  const archivedEmail = { id: 71, content: 'archived@example.com' };
  const baseUrl = `${environment.apiUrl}/api/partners`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    const confirmation = TestBed.inject(ConfirmationService);
    confirmations = [];
    const confirm = confirmation.confirm;
    if (!jasmine.isSpy(confirm)) throw new Error('Expected the shared lookup fixture to install a confirmation spy');
    confirm.and.callFake((config: Confirmation) => {
      confirmations.push(config);
      return confirmation;
    });
    const archiveConfirmation = TestBed.inject(DiffConfirmService).confirmOutdateOrDelete;
    if (!jasmine.isSpy(archiveConfirmation)) throw new Error('Expected the shared lookup fixture to install an archive spy');
    archive = archiveConfirmation;
    archive.and.callThrough();
    const correctness = TestBed.inject(DiffConfirmService).confirmDataCorrectness;
    if (!jasmine.isSpy(correctness)) throw new Error('Expected the shared lookup fixture to install a confirmation spy');
    correctness.and.callThrough();
    planContacts = spyOn(TestBed.inject(OwnerChangesPlannerService), 'diffContacts').and.callThrough();
    fixture = TestBed.createComponent(PartnerDetailsComponent);
    component = fixture.componentInstance;
    const owner = lifetimePartner();
    owner.outdatedData.contacts = { email: [archivedEmail] };
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function editWithHistoryMatch() {
    component.onEditClick();
    component.mainForm.controls['firstName'].setValue('Updated');
    component.getFormArray('email').at(0).setValue(archivedEmail.content);
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
  }

  function checkDuplicates(action: 'justSave' | 'saveAndExit' = 'justSave', duplicates = true) {
    component.onSaveClick(action);
    const check = http.expectOne(`${baseUrl}/check-partner-data/`);
    expect(check.request.method).toBe('POST');
    check.flush({ data: { duplicatesName: duplicates ? ['Another Partner'] : [], duplicatesContact: [] } });
    flushMicrotasks();
  }

  function accept(index: number) {
    confirmations[index].accept?.();
    flushMicrotasks();
  }

  it('waits for duplicate and restoration approval before planning archive/delete choices into one update', fakeAsync(() => {
    editWithHistoryMatch();
    checkDuplicates();
    expect(confirmations.length).toBe(1);
    expect(planContacts).not.toHaveBeenCalled();
    expect(archive).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);

    accept(0);
    expect(confirmations.length).toBe(2);
    expect(confirmations[1].message).toBe('PRIME_CONFIRM.OUTDATED_DUPLICATES');
    expect(planContacts).not.toHaveBeenCalled();
    expect(archive).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);

    accept(1);
    expect(archive).toHaveBeenCalledOnceWith('names', 'Current Middle Partner');
    expect(planContacts).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);
    accept(2);
    expect(planContacts).toHaveBeenCalledTimes(1);
    const [owner, draft, contactTypes, restoring] = planContacts.calls.mostRecent().args;
    const existing = component.existingOwner;
    if (!existing) throw new Error('An existing Partner is required');
    expect(owner).toBe(existing);
    expect(draft).toEqual(jasmine.objectContaining({ firstName: 'Updated' }));
    expect(draft.draftContacts.email).toEqual([archivedEmail.content]);
    expect(contactTypes).toEqual(component.contactTypes);
    expect(restoring).toEqual({ email: [archivedEmail] });
    expect(archive.calls.mostRecent().args).toEqual(['contact', 'email current@example.com']);
    http.expectNone(`${baseUrl}/update-partner`);

    confirmations[3].reject?.();
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-partner`);
    expect(update.request.method).toBe('POST');
    expect(updatePartnerDataSchema.safeParse(update.request.body).success).toBeTrue();
    expect(update.request.body).toEqual({
      id: 10,
      changingData: { main: { firstName: 'Updated', patronymic: 'Middle', lastName: 'Partner' }, address: null, contacts: null, coordinations: null },
      restoringData: { names: null, addresses: null, contacts: { email: [archivedEmail] }, coordinations: null },
      outdatingData: { names: { firstName: 'Current', patronymic: 'Middle', lastName: 'Partner' }, address: null, contacts: null, coordinations: null },
      deletingData: { names: null, addresses: null, contacts: [61], coordinations: null },
    });
    update.flush({ data: { ...lifetimePartner(), firstName: 'Updated', orderedContacts: { email: [archivedEmail] } } });
    tick();
  }));

  it('keeps edits available when duplicate approval or historical-data correctness is rejected', fakeAsync(() => {
    editWithHistoryMatch();
    checkDuplicates();
    confirmations[0].reject?.();
    flushMicrotasks();
    expect(component.showSpinner()).toBeFalse();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.controls['firstName'].value).toBe('Updated');
    expect(planContacts).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);

    checkDuplicates();
    accept(1);
    expect(confirmations[2].message).toBe('PRIME_CONFIRM.OUTDATED_DUPLICATES');
    confirmations[2].reject?.();
    flushMicrotasks();
    expect(component.showSpinner()).toBeFalse();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    expect(component.getFormArray('email').getRawValue()).toEqual([archivedEmail.content]);
    expect(planContacts).not.toHaveBeenCalled();
    expect(archive).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);
  }));

  it('emits save-and-exit completion only after the pending history deletion has persisted', fakeAsync(() => {
    const close = jasmine.createSpy('close');
    component.emittedCloseDialogData.subscribe(close);
    component.onEditClick();
    component.onDeleteOutdatedData('contacts', archivedEmail.id);
    tick();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    checkDuplicates('saveAndExit', false);
    const update = http.expectOne(`${baseUrl}/update-partner`);
    expect(update.request.body.deletingData.contacts).toEqual([archivedEmail.id]);
    expect(component.showSpinner()).toBeTrue();
    expect(close).not.toHaveBeenCalled();
    expect(component.closeDialogDataSignal()).toBeNull();

    update.flush({ data: lifetimePartner() });
    tick();
    expect(close).toHaveBeenCalledOnceWith('close');
    expect(component.closeDialogDataSignal()).toBe('close');
    expect(component.showSpinner()).toBeFalse();
  }));

  it('returns an edited restoration to history and sends its replacement as new contact data', fakeAsync(() => {
    component.onEditClick();
    component.onRestoreOutdatedData('contacts', archivedEmail, 'email');
    expect(component.outdatedContacts.email).toEqual([]);
    component.getFormArray('email').at(1).setValue('replacement@example.com');
    tick();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    checkDuplicates('justSave', false);
    expect(confirmations).toEqual([]);
    expect(planContacts.calls.mostRecent().args[3]).toEqual({});
    expect(component.outdatedContacts.email).toEqual([archivedEmail]);
    const update = http.expectOne(`${baseUrl}/update-partner`);
    expect(updatePartnerDataSchema.safeParse(update.request.body).success).toBeTrue();
    expect(update.request.body).toEqual({
      id: 10,
      changingData: { main: null, address: null, contacts: { email: ['replacement@example.com'] }, coordinations: null },
      restoringData: { names: null, addresses: null, contacts: {}, coordinations: null },
      outdatingData: { names: null, address: null, contacts: null, coordinations: null },
      deletingData: { names: null, addresses: null, contacts: null, coordinations: null },
    });
    update.flush({ data: {
      ...lifetimePartner(),
      orderedContacts: { email: [{ id: 61, content: 'current@example.com' }, { id: 72, content: 'replacement@example.com' }] },
      outdatedData: { ...lifetimePartner().outdatedData, contacts: { email: [archivedEmail] } },
    } });
    tick();
  }));
});
