import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { HomeDetailsComponent } from './home-details.component';
import { HomesListComponent } from '../homes-list/homes-list.component';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetHome } from '../../testing/reset.spec-fixtures';
import { updateHomeDataSchema } from '../../../../shared/schemas/home.schema';
import { environment } from '../../../environments/environment';

describe('HomeDetailsComponent persisted coordination reset', () => {
  let fixture: ComponentFixture<HomeDetailsComponent>;
  let component: HomeDetailsComponent;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/homes`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeDetailsComponent], providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    const owner = resetHome();
    owner.coordinations = [{ id: 71, homeId: owner.id, partnerId: 20, partnerName: 'Former Partner', isRecoverable: true }];
    fixture = TestBed.createComponent(HomeDetailsComponent);
    component = fixture.componentInstance;
    const config = new HomesListComponent().homeDialogConfig;
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
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-home`);
    expect(updateHomeDataSchema.safeParse(update.request.body).success).toBeTrue();
    return update;
  }

  it('clears a removed Partner selection after save and excludes it from a later Home update', fakeAsync(() => {
    expect(component.coordinationsArray.getRawValue().map(item => item?.id)).toEqual([20]);
    const cleared = { ...resetHome(), comment: 'First save', coordinations: [] };
    saveComment('First save').flush({ data: cleared });
    tick();
    fixture.detectChanges();
    expect(component.existingOwner?.coordinations).toEqual([]);
    expect(component.coordinationsArray.getRawValue().filter(item => item !== null)).toEqual([]);

    const next = saveComment('Unrelated follow-up');
    expect(component.ownerDraft.draftCoordinations).toEqual([]);
    expect(next.request.body).toEqual({
      id: cleared.id,
      changingData: { main: { comment: 'Unrelated follow-up' }, address: null, contacts: null, coordinations: null },
      restoringData: { addresses: null, officialNames: null, contacts: {}, coordinations: null },
      outdatingData: { address: null, officialName: null, contacts: null, coordinations: null },
      deletingData: { addresses: null, officialNames: null, contacts: null, coordinations: null },
    });
    next.flush({ data: { ...cleared, comment: 'Unrelated follow-up' } });
    tick();
  }));
});
