import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { PARTNER_AFFILIATION } from '../../../../../../shared/constants/partners';
import { PartnerDetailsComponent } from '../../../../pages/partner-details/partner-details.component';
import { PartnersListComponent } from '../../../../pages/partners-list/partners-list.component';
import { AuthService } from '../../../../services/auth.service';
import { lifetimePartner } from '../../../../testing/async-lifetime.spec-fixtures';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { provideResetLookups, resetActor } from '../../../../testing/reset.spec-fixtures';

describe('AdvancedDetails current-mode validation authority', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('keeps Create validation active so valid values enable Save and missing required values block it', fakeAsync(() => {
    const fixture = TestBed.createComponent(PartnerDetailsComponent);
    const component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'create', object: null, controlsDisable: false,
      addressFilterParams: { ...config.addressFilterParams, readonly: false },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    tick();
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.mainForm.invalid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeTrue();

    component.mainForm.patchValue({ firstName: 'New', lastName: 'Partner', affiliation: PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR });
    component.getFormArray('email').at(0).setValue('new@example.com');
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    component.mainForm.controls['firstName'].setValue('');
    tick();
    expect(component.mainForm.controls['firstName'].invalid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    component.mainForm.controls['firstName'].setValue('New');
    tick();
    expect(component.mainForm.valid).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();
  }));

  it('does not let an Edit event queued before discard re-dirty the settled View', fakeAsync(() => {
    const owner = lifetimePartner();
    const fixture = TestBed.createComponent(PartnerDetailsComponent);
    const component = fixture.componentInstance;
    const config = new PartnersListComponent().partnerDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', object: owner, controlsDisable: true,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    component.onEditClick();
    component.mainForm.controls['comment'].setValue('Discard this session');
    tick();
    expect(component.changesSignal()).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    component.getFormArray('email').at(0).setValue('queued@example.com');
    component.onViewClick();
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.changesSignal()).toBeFalse();
    tick();
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    expect(component.getFormArray('email').getRawValue()).toEqual(['current@example.com']);
    expect(component.existingOwner).toEqual(owner);
  }));
});
