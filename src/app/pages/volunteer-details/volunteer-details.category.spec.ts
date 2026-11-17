import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { INSTITUTE_CATEGORY } from '../../../../shared/constants/volunteers';
import { updateVolunteerDataSchema } from '../../../../shared/schemas/volunteer.schema';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetVolunteer } from '../../testing/reset.spec-fixtures';
import { VolunteersListComponent } from '../volunteers-list/volunteers-list.component';
import { VolunteerDetailsComponent } from './volunteer-details.component';
import { environment } from '../../../environments/environment';

describe('VolunteerDetailsComponent institute category validation', () => {
  let fixture: ComponentFixture<VolunteerDetailsComponent>;
  let component: VolunteerDetailsComponent;
  let http: HttpTestingController;
  const savedInstitute = { id: 81, instituteName: 'Saved School', category: INSTITUTE_CATEGORY.SCHOOL, isDeletable: true };
  const baseUrl = `${environment.apiUrl}/api/volunteers`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerDetailsComponent], providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    fixture = TestBed.createComponent(VolunteerDetailsComponent);
    component = fixture.componentInstance;
    const config = new VolunteersListComponent().volunteerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true,
      object: { ...resetVolunteer(), institutes: [savedInstitute] },
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function editInstitute() {
    component.onEditClick();
    tick();
    fixture.detectChanges();
    return component.institutesArray.at(0);
  }

  it('accepts every numeric category from the shared domain constants', fakeAsync(() => {
    const category = editInstitute().controls.category;
    for (const value of Object.values(INSTITUTE_CATEGORY)) {
      category.setValue(value);
      expect(category.valid).withContext(`Category ${value} must be valid`).toBeTrue();
      expect(category.errors).toBeNull();
    }
    tick();
  }));

  it('rejects unsupported numbers without accepting them as category IDs', fakeAsync(() => {
    const category = editInstitute().controls.category;
    const unsupported = [-1, 0, 1.5, Math.max(...Object.values(INSTITUTE_CATEGORY)) + 1, Number.NaN, Number.POSITIVE_INFINITY];
    for (const value of unsupported) {
      category.setValue(value);
      expect(category.invalid).withContext(`Category ${value} must be invalid`).toBeTrue();
      expect(category.hasError('zodError')).toBeTrue();
    }
    tick();
  }));

  it('rejects numeric-looking strings and missing or wrong-type values through the registered validator', fakeAsync(() => {
    const validate = editInstitute().controls.category.validator;
    if (!validate) throw new Error('Institute category must have a validator');
    const school = INSTITUTE_CATEGORY.SCHOOL;
    const unsupported: unknown[] = [String(school), `0${school}`, `${school}.0`, ` ${school} `, '', null, undefined, true, false];
    for (const value of unsupported) {
      expect(validate(new FormControl<unknown>(value))).withContext(`Reject ${String(value)}`).not.toBeNull();
    }
    tick();
  }));

  it('allows a valid institute edit to save numeric category data while other invalid fields still block Save', fakeAsync(() => {
    const institute = editInstitute();
    institute.controls.instituteName.setValue('Updated School');
    institute.controls.category.setValue(INSTITUTE_CATEGORY.UNIVERSITY);
    tick();
    expect(institute.controls.category.valid).toBeTrue();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    component.mainForm.controls['firstName'].setValue('');
    tick();
    expect(component.mainForm.invalid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    component.mainForm.controls['firstName'].setValue(resetVolunteer().firstName);
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
    if (component.IsSaveDisabledSignal()) throw new Error('Valid institute edit must enable Save');

    component.onSaveClick('justSave');
    http.expectOne(`${baseUrl}/check-volunteer-data/`).flush({ data: { duplicatesName: [], duplicatesContact: [] } });
    flushMicrotasks();
    const update = http.expectOne(`${baseUrl}/update-volunteer`);
    const changedInstitute = { instituteName: 'Updated School', category: INSTITUTE_CATEGORY.UNIVERSITY };
    expect(updateVolunteerDataSchema.safeParse(update.request.body).success).toBeTrue();
    expect(update.request.body).toEqual({
      id: 10,
      changingData: { main: null, address: null, contacts: null, institutes: [changedInstitute], subscriptions: null, cooperations: null },
      restoringData: { names: null, addresses: null, contacts: {}, institutes: null },
      outdatingData: { names: null, address: null, contacts: null, institutes: [savedInstitute.id] },
      deletingData: { names: null, addresses: null, contacts: null, institutes: null, subscriptions: null },
    });
    const owner = resetVolunteer();
    update.flush({ data: {
      ...owner, institutes: [{ ...changedInstitute, id: 82, isDeletable: true }],
      outdatedData: { ...owner.outdatedData, institutes: [savedInstitute] },
    } });
    tick();
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.showSpinner()).toBeFalse();
    expect(component.institutesArray.getRawValue()).toEqual([changedInstitute]);
  }));
});
