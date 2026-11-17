import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { lifetimePartner } from '../../testing/async-lifetime.spec-fixtures';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor } from '../../testing/reset.spec-fixtures';
import { PartnersListComponent } from '../partners-list/partners-list.component';
import { PartnerDetailsComponent } from './partner-details.component';

describe('PartnerDetailsComponent contact and geographic dirty state', () => {
  let fixture: ComponentFixture<PartnerDetailsComponent>;
  let component: PartnerDetailsComponent;
  const selection = { countries: [143], regions: [20], districts: [30], localities: [40] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
    fixture = TestBed.createComponent(PartnerDetailsComponent);
    component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: lifetimePartner(),
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uses disabled contact values for dirty checking and clears dirty state when the original content returns', fakeAsync(() => {
    component.onEditClick();
    tick();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    const email = component.getFormArray('email');
    email.disable({ emitEvent: false });
    email.at(0).setValue('changed@example.com');
    tick();
    expect(email.disabled).toBeTrue();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.changesSignal()).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    email.at(0).setValue('current@example.com');
    tick();
    expect(email.disabled).toBeTrue();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
  }));

  it('enables Save for changed geography and disables it when the persisted selection is restored', fakeAsync(() => {
    component.onEditClick();
    component.onChangeAddress(selection);
    tick();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();

    component.onChangeAddress({ ...selection, localities: [41] });
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.changesSignal()).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    component.onChangeAddress(selection);
    tick();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
  }));
});
