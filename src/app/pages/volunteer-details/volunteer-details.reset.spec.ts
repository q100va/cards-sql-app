import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { Volunteer } from '../../interfaces/advanced-model';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetVolunteer } from '../../testing/reset.spec-fixtures';
import { buildDraft } from '../../utils/owner-draft.builder';
import { INSTITUTE_CATEGORY } from '../../../../shared/constants/volunteers';
import { updateVolunteerDataSchema } from '../../../../shared/schemas/volunteer.schema';
import { VolunteersListComponent } from '../volunteers-list/volunteers-list.component';
import { VolunteerDetailsComponent } from './volunteer-details.component';
import { environment } from '../../../environments/environment';

describe('VolunteerDetailsComponent persisted empty-state reconciliation', () => {
  let fixture: ComponentFixture<VolunteerDetailsComponent>;
  let component: VolunteerDetailsComponent;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/volunteers`;
  const ownSubscription = { id: 71, userId: resetActor.id, userName: 'editor', userFullName: 'Test Editor' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerDetailsComponent], providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function open(owner: Volunteer) {
    fixture = TestBed.createComponent(VolunteerDetailsComponent);
    component = fixture.componentInstance;
    const config = new VolunteersListComponent().volunteerDialogConfig;
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
    http.expectOne(`${baseUrl}/check-volunteer-data/`).flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-volunteer`);
    expect(updateVolunteerDataSchema.safeParse(update.request.body).success).toBeTrue();
    return update;
  }

  function expectedUpdate(comment: string) {
    return {
      id: 10,
      changingData: { main: { comment }, address: null, contacts: null, institutes: null, subscriptions: null, cooperations: null },
      restoringData: { names: null, addresses: null, contacts: {}, institutes: null },
      outdatingData: { names: null, address: null, contacts: null, institutes: null },
      deletingData: { names: null, addresses: null, contacts: null, institutes: null, subscriptions: null },
    };
  }

  it('clears institutes when reinitializing the same persisted owner with an empty list and excludes them from the draft', () => {
    const owner = resetVolunteer();
    owner.institutes = [{ id: 81, instituteName: 'Former School', category: INSTITUTE_CATEGORY.SCHOOL, isDeletable: true }];
    open(owner);
    expect(component.institutesArray.getRawValue()).toEqual([{ instituteName: 'Former School', category: INSTITUTE_CATEGORY.SCHOOL }]);
    const cleared: Volunteer = { ...owner, institutes: [] };
    fixture.componentRef.setInput('data', { ...component.data(), object: cleared });
    component.setInitialValues('view');
    fixture.detectChanges();
    expect(component.existingOwner?.institutes).toEqual([]);
    expect(component.institutesArray.getRawValue().filter(item => item.instituteName !== null || item.category !== null)).toEqual([]);

    component.setInitialValues('edit');
    const draft = buildDraft('volunteer', component.mainForm, component.addressFilter(), component.contactTypes, cleared, resetActor.id);
    expect(draft.draftInstitutes).toEqual([]);
    http.expectNone(`${baseUrl}/update-volunteer`);
  });

  it('clears the current user subscription toggle when the response is empty and does not resubscribe on a later save', fakeAsync(() => {
    const owner = resetVolunteer();
    owner.subscriptions = [ownSubscription];
    open(owner);
    expect(component.mainForm.controls['subscription'].value).toBeTrue();
    const cleared: Volunteer = { ...owner, comment: 'First save', subscriptions: [] };
    saveComment('First save').flush({ data: cleared });
    tick();
    fixture.detectChanges();
    expect(component.subscriptions).toEqual([]);
    expect(component.mainForm.controls['subscription'].value).toBeFalse();

    const next = saveComment('Unrelated follow-up');
    expect(component.ownerDraft.draftSubscriptions).toEqual([]);
    expect(next.request.body).toEqual(expectedUpdate('Unrelated follow-up'));
    next.flush({ data: { ...cleared, comment: 'Unrelated follow-up' } });
    tick();
  }));

  it('clears the institute, subscription and cooperation history visibility flags after an empty persisted history response', fakeAsync(() => {
    const owner = resetVolunteer();
    owner.outdatedData.institutes = [{ id: 81, instituteName: 'Archived School', category: INSTITUTE_CATEGORY.SCHOOL, isDeletable: true }];
    owner.outdatedData.subscriptions = [{ ...ownSubscription, id: 82 }];
    owner.outdatedData.cooperations = [{ id: 83, userId: 8, userName: 'coordinator', userFullName: 'Old Coordinator' }];
    open(owner);
    expect([component.hasOutdatedInstitutes(), component.hasOutdatedSubs(), component.hasOutdatedCoops()]).toEqual([true, true, true]);
    const cleared: Volunteer = { ...owner, comment: 'First save', outdatedData: resetVolunteer().outdatedData };
    saveComment('First save').flush({ data: cleared });
    tick();
    fixture.detectChanges();
    expect(component.outdatedInstitutes).toEqual([]);
    expect(component.outdatedSubscriptions).toEqual([]);
    expect(component.outdatedCooperations).toEqual([]);
    expect({ institutes: component.hasOutdatedInstitutes(), subscriptions: component.hasOutdatedSubs(), cooperations: component.hasOutdatedCoops() })
      .toEqual({ institutes: false, subscriptions: false, cooperations: false });
  }));

  it('clears only the current user toggle when other persisted subscribers remain', fakeAsync(() => {
    const owner = resetVolunteer();
    owner.subscriptions = [ownSubscription];
    open(owner);
    const otherSubscription = { id: 72, userId: 8, userName: 'other', userFullName: 'Other Subscriber' };
    const refreshed: Volunteer = { ...owner, comment: 'First save', subscriptions: [otherSubscription] };
    saveComment('First save').flush({ data: refreshed });
    tick();
    fixture.detectChanges();
    expect(component.subscriptions).toEqual([otherSubscription]);
    expect(component.mainForm.controls['subscription'].value).toBeFalse();
    const next = saveComment('Unrelated follow-up');
    expect(component.ownerDraft.draftSubscriptions).toEqual([]);
    expect(next.request.body).toEqual(expectedUpdate('Unrelated follow-up'));
    next.flush({ data: { ...refreshed, comment: 'Unrelated follow-up' } });
    tick();
  }));
});
