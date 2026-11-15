import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { provideResetLookups, resetActor, resetHome } from '../../testing/reset.spec-fixtures';
import { HomesListComponent } from '../homes-list/homes-list.component';
import { HomeDetailsComponent } from './home-details.component';

describe('HomeDetailsComponent postal dirty policy', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeDetailsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: AuthService, useValue: { currentUser$: of(resetActor) } satisfies Pick<AuthService, 'currentUser$'> },
      ],
    }).compileComponents();
    provideResetLookups();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('keeps postal-only edits in dirty and Save state even when every geographic ID is unchanged', fakeAsync(() => {
    const fixture = TestBed.createComponent(HomeDetailsComponent);
    const component = fixture.componentInstance;
    const owner = resetHome();
    const config = new HomesListComponent().homeDialogConfig;
    fixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: owner,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
      defaultAddressParams: { countryId: 143, regionId: 20, districtId: 30, localityId: 40 },
    } satisfies typeof config);
    fixture.detectChanges();
    component.onEditClick();
    tick();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
    const geography = structuredClone(component.addressFilter());

    component.mainForm.controls['postalAddressPart'].setValue('Building 2');
    tick();
    expect(component.addressFilter()).toEqual(geography);
    expect(component.mainForm.valid).toBeTrue();
    expect(component.changesSignal()).toBeTrue();
    expect(component.IsSaveDisabledSignal()).toBeFalse();

    component.mainForm.controls['postalAddressPart'].setValue(owner.address.postalAddressPart);
    tick();
    expect(component.changesSignal()).toBeFalse();
    expect(component.IsSaveDisabledSignal()).toBeTrue();
  }));
});
