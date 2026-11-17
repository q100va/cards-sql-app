import { HttpTestingController } from '@angular/common/http/testing';
import { DestroyRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { DetailsDialogComponent } from './details-dialog.component';
import { PartnerDetailsComponent } from '../../../../pages/partner-details/partner-details.component';
import { PartnersListComponent } from '../../../../pages/partners-list/partners-list.component';
import { Partner } from '../../../../interfaces/advanced-model';
import { AuthService } from '../../../../services/auth.service';
import { AddressService } from '../../../../services/address.service';
import { HomeService } from '../../../../services/home.service';
import { PartnerService } from '../../../../services/partner.service';
import { RoleService } from '../../../../services/role.service';
import { MessageWrapperService } from '../../../../services/message.service';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { lifetimePartner } from '../../../../testing/async-lifetime.spec-fixtures';
import { AuthServiceHarness } from '../../../../utils/auth-harness';
import { environment } from '../../../../../environments/environment';

describe('DetailsDialogComponent child async lifetime', () => {
  let fixture: ComponentFixture<DetailsDialogComponent<Partner>>;
  let child: PartnerDetailsComponent;
  let http: HttpTestingController;
  let confirmations: Confirmation[];
  let saveUpdated: jasmine.Spy<PartnerService['saveUpdatedOwner']>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DetailsDialogComponent<Partner>>>;
  const baseUrl = `${environment.apiUrl}/api/partners`;

  beforeEach(async () => {
    const auth = new AuthServiceHarness();
    auth.setUser({ id: 7, roleId: 1, userName: 'editor', firstName: 'Test', lastName: 'Editor', roleName: 'Editor' });
    auth.grant('EDIT_PARTNER');
    const config = new PartnersListComponent().partnerDialogConfig;
    dialogRef = jasmine.createSpyObj('details', ['close']);
    await TestBed.configureTestingModule({
      imports: [DetailsDialogComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: auth },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {
          ...config, operation: 'view-edit', controlsDisable: true, object: lifetimePartner(),
          addressFilterParams: { ...config.addressFilterParams, readonly: true },
          defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
        } satisfies typeof config },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getPotentialHomesPickList').and.returnValue(of([]));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((_ids, type) => of({
      data: [{ id: { countries: 143, regions: 20, districts: 30, localities: 40 }[type], name: type }],
    }));
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    confirmations = [];
    const confirmService = TestBed.inject(ConfirmationService);
    spyOn(confirmService, 'confirm').and.callFake(confirmation => {
      confirmations.push(confirmation);
      return confirmService;
    });
    saveUpdated = spyOn(TestBed.inject(PartnerService), 'saveUpdatedOwner').and.callThrough();
    fixture = TestBed.createComponent(DetailsDialogComponent<Partner>);
    fixture.detectChanges();
    child = fixture.debugElement.query(By.directive(PartnerDetailsComponent)).componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function edit(field = 'comment', value = 'Pending edit') {
    fixture.componentInstance.onEditClick();
    child.mainForm.controls[field].setValue(value);
    tick();
    fixture.detectChanges();
    expect(child.mainForm.valid).toBeTrue();
    expect(child.IsSaveDisabledSignal()).toBeFalse();
  }

  function check(duplicates = false) {
    fixture.componentInstance.onSaveClick('justSave');
    const request = http.expectOne(`${baseUrl}/check-partner-data/`);
    request.flush({ data: {
      duplicatesName: duplicates ? ['Current Partner'] : [],
      duplicatesContact: [],
    } });
    flushMicrotasks();
  }

  function pendingConfirmation() {
    expect(confirmations.length).toBe(1);
    const confirmation = confirmations[0];
    if (!confirmation?.accept) throw new Error('Expected a pending acceptance callback');
    return confirmation;
  }

  it('destroys the real dynamically hosted details child with its host', () => {
    const destroyRef = fixture.debugElement.query(By.directive(PartnerDetailsComponent)).injector.get(DestroyRef);
    let destroyed = false;
    destroyRef.onDestroy(() => { destroyed = true; });
    expect(destroyed).toBeFalse();
    fixture.destroy();
    expect(destroyed).toBeTrue();
  });

  it('cancels a pending duplicate check before it can open a confirmation after host destruction', fakeAsync(() => {
    edit();
    fixture.componentInstance.onSaveClick('justSave');
    const pending = http.expectOne(`${baseUrl}/check-partner-data/`);
    fixture.destroy();
    expect(pending.cancelled).toBeTrue();
    expect(confirmations).toEqual([]);
    expect(saveUpdated).not.toHaveBeenCalled();
  }));

  it('continues an accepted duplicate confirmation while its owner is alive', fakeAsync(() => {
    edit();
    check(true);
    pendingConfirmation().accept?.();
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-partner`);
    expect(update.request.body.changingData.main).toEqual({ comment: 'Pending edit' });
    update.flush({ data: { ...lifetimePartner(), comment: 'Pending edit' } });
    tick();
    expect(child.showSpinner()).toBeFalse();
  }));

  it('does not resume saving from an accepted duplicate confirmation after its host is destroyed', fakeAsync(() => {
    edit();
    check(true);
    const pending = pendingConfirmation();
    const changesBeforeClose = structuredClone(child.changingData);
    fixture.destroy();
    pending.accept?.();
    flushMicrotasks();
    expect(saveUpdated).not.toHaveBeenCalled();
    expect(child.changingData).toEqual(changesBeforeClose);
    http.expectNone(`${baseUrl}/update-partner`);
  }));

  it('does not continue an archive-decision Promise after its details host is destroyed', fakeAsync(() => {
    edit('firstName', 'Changed');
    check();
    const pending = pendingConfirmation();
    const changesBeforeClose = structuredClone(child.changingData);
    const outdatingBeforeClose = structuredClone(child.outdatingData);
    fixture.destroy();
    pending.accept?.();
    flushMicrotasks();
    expect(child.changingData).toEqual(changesBeforeClose);
    expect(child.outdatingData).toEqual(outdatingBeforeClose);
    expect(saveUpdated).not.toHaveBeenCalled();
    http.expectNone(`${baseUrl}/update-partner`);
  }));

  it('does not reset a destroyed child form from an abandoned leave-edit confirmation', fakeAsync(() => {
    edit();
    fixture.componentInstance.onViewClick();
    const pending = pendingConfirmation();
    const formBeforeClose = child.mainForm.getRawValue();
    fixture.destroy();
    pending.accept?.();
    flushMicrotasks();
    expect(child.mainForm.getRawValue()).toEqual(formBeforeClose);
    expect(child.isEditModeSignal()).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
  }));

  it('cancels an already submitted update when the details host is destroyed', fakeAsync(() => {
    edit();
    check();
    const update = http.expectOne(`${baseUrl}/update-partner`);
    fixture.destroy();
    expect(update.cancelled).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(TestBed.inject(MessageWrapperService).handle).not.toHaveBeenCalled();
  }));

  it('does not replace the current save confirmation with a late earlier save check', fakeAsync(() => {
    edit();
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const save = buttons.find(button => button.nativeElement.title === 'DETAILS_DIALOG.CARD_SAVE');
    const saveAndExit = buttons.find(button => button.nativeElement.classList.contains('dialog-submit-button'));
    if (!save || !saveAndExit) throw new Error('Expected both save actions in the real dialog toolbar');
    const saveButton: HTMLButtonElement = save.nativeElement;
    const exitButton: HTMLButtonElement = saveAndExit.nativeElement;
    saveButton.click();
    const earlier = http.expectOne(`${baseUrl}/check-partner-data/`);
    fixture.detectChanges();
    expect(child.showSpinner()).toBeTrue();
    expect(exitButton.disabled).toBeFalse();
    // The overlay intercepts pointer hits but does not disable keyboard activation.
    exitButton.click();
    const current = http.expectOne(`${baseUrl}/check-partner-data/`);
    const duplicates = { data: { duplicatesName: ['Current Partner'], duplicatesContact: [] } };
    current.flush(duplicates);
    flushMicrotasks();
    expect(confirmations.length).toBe(1);
    const currentConfirmation = confirmations[0];
    if (!earlier.cancelled) earlier.flush(duplicates);
    flushMicrotasks();
    expect(confirmations).toEqual([currentConfirmation]);
    currentConfirmation.accept?.();
    flushMicrotasks();
    http.expectOne(`${baseUrl}/update-partner`).flush({ data: { ...lifetimePartner(), comment: 'Pending edit' } });
    tick();
    fixture.detectChanges();
    expect(dialogRef.close).toHaveBeenCalledOnceWith({ refresh: true });
  }));
});
