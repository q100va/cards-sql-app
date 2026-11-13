import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { SeniorsListComponent } from '../seniors-list/seniors-list.component';
import { RoleService } from '../../services/role.service';
import { AddressService } from '../../services/address.service';
import { HomeService } from '../../services/home.service';
import { SeniorService } from '../../services/senior.service';
import { RelationPick, Senior } from '../../interfaces/advanced-model';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorDetailsComponent } from './senior-details.component';

describe('SeniorDetailsComponent', () => {
  let component: SeniorDetailsComponent;
  let fixture: ComponentFixture<SeniorDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorDetailsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.returnValue(of({ data: [] }));
    spyOn(TestBed.inject(HomeService), 'getActiveHomesPickList').and.returnValue(of([]));
    fixture = TestBed.createComponent(SeniorDetailsComponent);
    component = fixture.componentInstance;
    const config = new SeniorsListComponent().seniorDialogConfig;
    fixture.componentRef.setInput('data', { ...config, operation: 'create', controlsDisable: false } satisfies typeof config);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows Home selection for creation but keeps the existing Home read-only during editing', () => {
    expect(component.homeCtrl.enabled).toBeTrue();
    const getSpouses = spyOn(TestBed.inject(SeniorService), 'getSeniorsPickList').and.returnValue(of([]));
    const existing: Senior = {
      id: 10, firstName: 'Анна', patronymic: null, lastName: 'Иванова', gender: 'female',
      birthDate: new Date('1940-05-12T00:00:00.000Z'), dateOfStart: new Date('2026-01-02T10:00:00.000Z'),
      confirmedFirstName: true, confirmedPatronymic: false, confirmedLastName: true, confirmedBirthDate: false,
      comment: null, isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
      infoNote: null, photoLink: null, dateOfConsent: null, personalNoAddr: false,
      kindergarten: null, teacher: null, veteran: null, childOfWar: null, profession: null,
      honoraryStatus: null, interests: null, orthodoxBeliever: null, dateOfExit: null,
      spouseId: null, spouseFullName: null, homeId: 20,
      address: {
        country: { id: 143, name: 'Россия' }, region: { id: 2, shortName: 'Тверская обл.' },
        district: { id: 3, shortName: 'Калининский р-н' }, locality: { id: 4, shortName: 'г. Тверь' },
        fullPostalAddress: 'Тверская область, Тверь',
      },
      home: {
        homeName: 'Дом А', noAddress: false, specialHome: false, acceptableForSchool: true,
        isRestricted: false, dateOfRestriction: null, isClose: false, dateOfClose: null,
      },
      outdatedData: { names: [] },
    };
    const existingFixture = TestBed.createComponent(SeniorDetailsComponent);
    const config = new SeniorsListComponent().seniorDialogConfig;
    existingFixture.componentRef.setInput('data', {
      ...config, operation: 'view-edit', controlsDisable: true, object: existing,
      defaultAddressParams: { countryId: 143, regionId: 2, districtId: 3, localityId: 4 },
      addressFilterParams: { ...config.addressFilterParams, readonly: true },
    } satisfies typeof config);
    existingFixture.detectChanges();
    const editor = existingFixture.componentInstance;
    expect(editor.homeCtrl.disabled).toBeTrue();
    expect(editor.homeCtrl.value?.id).toBe(20);
    expect(editor.homeCtrl.value?.name).toContain('Дом А');

    editor.onEditClick();
    existingFixture.detectChanges();
    expect(editor.isEditModeSignal()).toBeTrue();
    expect(editor.mainForm.get('firstName')?.enabled).toBeTrue();
    expect(editor.homeCtrl.disabled).toBeTrue();
    expect(editor.homeCtrl.value?.id).toBe(20);
    expect(editor.homeCtrl.value?.fullPostalAddress).toBe('Тверская область, Тверь');

    let spouses: RelationPick[] | undefined;
    const subscription = editor.spousePickList$.subscribe(value => { spouses = value; });
    expect(getSpouses).toHaveBeenCalledWith(20);
    expect(spouses).toEqual([]);
    subscription.unsubscribe();
  });
});
