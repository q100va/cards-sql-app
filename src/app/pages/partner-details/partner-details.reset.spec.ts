import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { Partner } from '../../interfaces/advanced-model';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { lifetimePartner } from '../../testing/async-lifetime.spec-fixtures';
import { provideResetLookups, resetActor } from '../../testing/reset.spec-fixtures';
import { updatePartnerDataSchema } from '../../../../shared/schemas/partner.schema';
import { PartnersListComponent } from '../partners-list/partners-list.component';
import { PartnerDetailsComponent } from './partner-details.component';
import { environment } from '../../../environments/environment';

describe('PartnerDetailsComponent persisted empty-state reconciliation', () => {
  let fixture: ComponentFixture<PartnerDetailsComponent>;
  let component: PartnerDetailsComponent;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/partners`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent], providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function open(owner: Partner) {
    fixture = TestBed.createComponent(PartnerDetailsComponent);
    component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
  }

  function saveComment(comment: string) {
    component.onEditClick();
    component.mainForm.controls['comment'].setValue(comment);
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    component.onSaveClick('justSave');
    http.expectOne(`${baseUrl}/check-partner-data/`).flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-partner`);
    expect(updatePartnerDataSchema.safeParse(update.request.body).success).toBeTrue();
    return update;
  }

  it('clears a coordination removed by the persisted response and does not re-add it in the next comment save', fakeAsync(() => {
    const owner = lifetimePartner();
    owner.coordinations = [{ id: 71, homeId: 20, partnerId: owner.id, homeName: 'Former Home', regionName: 'Region', isRecoverable: true }];
    open(owner);
    expect(component.coordinationsArray.getRawValue().map(item => item?.id)).toEqual([20]);
    const cleared: Partner = { ...owner, comment: 'First save', coordinations: [] };
    saveComment('First save').flush({ data: cleared });
    tick();
    fixture.detectChanges();
    expect(component.existingOwner?.coordinations).toEqual([]);
    expect(component.coordinationsArray.getRawValue().filter(item => item !== null)).toEqual([]);

    const next = saveComment('Unrelated follow-up');
    expect(component.ownerDraft.draftCoordinations).toEqual([]);
    expect(next.request.body).toEqual({
      id: owner.id,
      changingData: { main: { comment: 'Unrelated follow-up' }, address: null, contacts: null, coordinations: null },
      restoringData: { names: null, addresses: null, contacts: {}, coordinations: null },
      outdatingData: { names: null, address: null, contacts: null, coordinations: null },
      deletingData: { names: null, addresses: null, contacts: null, coordinations: null },
    });
    next.flush({ data: { ...cleared, comment: 'Unrelated follow-up' } });
    tick();
  }));

  it('clears contacts and common history indicators when the successful response contains empty sets', fakeAsync(() => {
    const owner = lifetimePartner();
    owner.outdatedData.names = [{ id: 81, firstName: 'Archived', patronymic: null, lastName: 'Name' }];
    owner.outdatedData.contacts = { email: [{ id: 82, content: 'archived@example.com' }] };
    owner.outdatedData.addresses = [{
      id: 83, country: { id: 144, name: 'Previous Country' }, region: null, district: null, locality: null, isRecoverable: true,
    }];
    owner.outdatedData.coordinations = [{ id: 84, homeId: 21, partnerId: owner.id, homeName: 'Archived Home', regionName: 'Region', isRecoverable: true }];
    open(owner);
    expect([component.hasOutdatedNames(), component.hasOutdatedContacts(), component.hasOutdatedAddresses(), component.hasOutdatedCoordinations()])
      .toEqual([true, true, true, true]);
    const cleared: Partner = {
      ...owner, comment: 'First save', orderedContacts: {}, outdatedData: { names: [], contacts: {}, addresses: [], coordinations: [] },
    };
    saveComment('First save').flush({ data: cleared });
    tick();
    fixture.detectChanges();
    expect(component.getFormArray('email').getRawValue()).toEqual(['\u00A0']);
    expect([component.hasOutdatedNames(), component.hasOutdatedContacts(), component.hasOutdatedAddresses(), component.hasOutdatedCoordinations()])
      .toEqual([false, false, false, false]);
    expect(component.outdatedNames).toEqual([]);
    expect(component.outdatedContacts).toEqual({});
    expect(component.outdatedAddresses).toEqual([]);
    expect(component.outdatedCoordinations).toEqual([]);
  }));
});
