import { HttpTestingController } from '@angular/common/http/testing';
import type { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import type { BaseModel } from '../../../../interfaces/base-model';
import type { DialogData } from '../../../../interfaces/dialog-props';
import type { Toponym } from '../../../../interfaces/toponym';
import { HomeDetailsComponent } from '../../../../pages/home-details/home-details.component';
import { HomesListComponent } from '../../../../pages/homes-list/homes-list.component';
import { PartnerDetailsComponent } from '../../../../pages/partner-details/partner-details.component';
import { PartnersListComponent } from '../../../../pages/partners-list/partners-list.component';
import { SeniorDetailsComponent } from '../../../../pages/senior-details/senior-details.component';
import { SeniorsListComponent } from '../../../../pages/seniors-list/seniors-list.component';
import { ToponymDetailsComponent } from '../../../../pages/toponym-details/toponym-details.component';
import { CountriesListComponent } from '../../../../pages/toponyms-lists/countries-list/countries-list.component';
import { UserDetailsComponent } from '../../../../pages/user-details/user-details.component';
import { UsersListComponent } from '../../../../pages/users-list/users-list.component';
import { VolunteerDetailsComponent } from '../../../../pages/volunteer-details/volunteer-details.component';
import { VolunteersListComponent } from '../../../../pages/volunteers-list/volunteers-list.component';
import { AuthService } from '../../../../services/auth.service';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { provideResetLookups, resetActor } from '../../../../testing/reset.spec-fixtures';
import { AuthServiceHarness } from '../../../../utils/auth-harness';
import type { DetailsComponentType } from './details-component-registry';
import { DetailsDialogComponent } from './details-dialog.component';

type HostedDetails = ToponymDetailsComponent | UserDetailsComponent | PartnerDetailsComponent
  | VolunteerDetailsComponent | HomeDetailsComponent | SeniorDetailsComponent;

describe('DetailsDialogComponent real child contract', () => {
  let fixture: ComponentFixture<DetailsDialogComponent<BaseModel>>;
  let data: DialogData<BaseModel>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DetailsDialogComponent<BaseModel>>>;
  const defaults = { countryId: null, regionId: null, districtId: null, localityId: null };
  const cases: {
    kind: DetailsComponentType;
    component: Type<HostedDetails>;
    config: DialogData<BaseModel>;
    field: string;
  }[] = [
    { kind: 'toponym', component: ToponymDetailsComponent, config: new CountriesListComponent().props.dialogProps, field: 'name' },
    { kind: 'user', component: UserDetailsComponent, config: new UsersListComponent().userDialogConfig, field: 'userName' },
    { kind: 'partner', component: PartnerDetailsComponent, config: new PartnersListComponent().partnerDialogConfig, field: 'firstName' },
    { kind: 'volunteer', component: VolunteerDetailsComponent, config: new VolunteersListComponent().volunteerDialogConfig, field: 'firstName' },
    { kind: 'home', component: HomeDetailsComponent, config: new HomesListComponent().homeDialogConfig, field: 'homeName' },
    { kind: 'senior', component: SeniorDetailsComponent, config: new SeniorsListComponent().seniorDialogConfig, field: 'firstName' },
  ];

  beforeEach(async () => {
    const auth = new AuthServiceHarness();
    auth.setUser(resetActor);
    auth.grantAllCommon();
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [DetailsDialogComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: MAT_DIALOG_DATA, useFactory: () => data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).use('en');
    provideResetLookups();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function render() {
    fixture = TestBed.createComponent(DetailsDialogComponent<BaseModel>);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  for (const { kind, component, config, field } of cases) {
    it(`hosts the real ${kind} details and applies its creation data before form initialization`, () => {
      const value = `Hosted_${kind}`;
      data = {
        ...config, componentType: kind, operation: 'create', controlsDisable: false, object: null,
        defaultAddressParams: defaults, toponymType: kind === 'toponym' ? 'country' : undefined,
        controls: config.controls.map(control => control.controlName === field ? { ...control, value } : control),
      };
      render();

      const children = fixture.debugElement.queryAll(By.directive(component));
      expect(children.length).toBe(1);
      const child = children[0].injector.get(component);
      expect(child instanceof component).toBeTrue();
      expect<DialogData<BaseModel>>(child.data()).toEqual(data);
      expect(child.kind).toBe(kind);
      expect(child.object).toBeNull();
      expect(child.mainForm.get(field)?.value).toBe(value);
      expect(child.mainForm.get(field)?.enabled).toBeTrue();
      expect(children[0].injector.get(MAT_DIALOG_DATA)).toBe(data);
      expect(children[0].injector.get(MatDialogRef)).toBe(dialogRef);
    });
  }

  it('initializes a real existing Toponym from host data and keeps later host data readable by the child', () => {
    const config = new CountriesListComponent().props.dialogProps;
    const country: Toponym = { id: 143, name: 'Country A' };
    data = {
      ...config, operation: 'view-edit', controlsDisable: true, toponymType: 'country',
      defaultAddressParams: defaults, object: country,
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
    };
    render();
    const child = fixture.debugElement.query(By.directive(ToponymDetailsComponent)).injector.get(ToponymDetailsComponent);
    expect(child.object).toEqual(country);
    expect(child.mainForm.controls['name'].value).toBe('Country A');
    expect(child.mainForm.controls['name'].disabled).toBeTrue();

    const updated: DialogData<Toponym> = { ...config, ...data, object: { id: 144, name: 'Country B' } };
    fixture.componentInstance.dataSignal.set(updated);
    fixture.detectChanges();
    expect(child.data()).toEqual(updated);
    expect(child.object).toEqual(updated.object);
  });
});
