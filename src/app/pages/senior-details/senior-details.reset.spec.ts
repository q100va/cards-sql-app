import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { SeniorDetailsComponent } from './senior-details.component';
import { SeniorsListComponent } from '../seniors-list/seniors-list.component';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetSenior } from '../../testing/reset.spec-fixtures';
import { updateSeniorDataSchema } from '../../../../shared/schemas/senior.schema';
import { environment } from '../../../environments/environment';

describe('SeniorDetailsComponent persisted spouse reset', () => {
  let fixture: ComponentFixture<SeniorDetailsComponent>;
  let component: SeniorDetailsComponent;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/seniors`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorDetailsComponent], providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    const owner = { ...resetSenior(), spouseId: 11, spouseFullName: 'Former Spouse' };
    fixture = TestBed.createComponent(SeniorDetailsComponent);
    component = fixture.componentInstance;
    const config = new SeniorsListComponent().seniorDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function saveComment(comment: string) {
    component.onEditClick();
    component.mainForm.controls['comment'].setValue(comment);
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    component.onSaveClick('justSave');
    http.expectOne(`${baseUrl}/check-senior-data/`).flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-senior`);
    expect(updateSeniorDataSchema.safeParse(update.request.body).success).toBeTrue();
    return update;
  }

  it('clears a persisted null spouse and does not restore the previous ID in an unrelated save', fakeAsync(() => {
    expect(component.spouseCtrl.value).toEqual({ id: 11, name: 'Former Spouse' });
    const cleared = { ...resetSenior(), comment: 'First save', spouseId: null, spouseFullName: null };
    saveComment('First save').flush({ data: cleared });
    tick();
    fixture.detectChanges();
    expect(component.existingOwner?.spouseId).toBeNull();
    expect(component.existingOwner?.spouseFullName).toBeNull();
    expect(component.spouseCtrl.value).toBeNull();

    const next = saveComment('Unrelated follow-up');
    expect(component.spouseCtrl.value).toBeNull();
    expect(component.ownerDraft.spouseId).toBeNull();
    expect(next.request.body).toEqual({
      id: cleared.id, changingData: { main: { comment: 'Unrelated follow-up' } },
      restoringData: { names: null }, outdatingData: { names: null }, deletingData: { names: null },
    });
    next.flush({ data: { ...cleared, comment: 'Unrelated follow-up' } });
    tick();
  }));
});
