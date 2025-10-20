// src/app/pages/toponym-details/toponym-details.component.spec.ts
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { FormControl, FormGroup } from '@angular/forms';

import { ToponymDetailsComponent } from './toponym-details.component';
import { AddressService } from '../../services/address.service';
import { MessageWrapperService } from '../../services/message.service';
import { ConfirmationService } from 'primeng/api';

class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

describe('ToponymDetailsComponent', () => {
  let fixture: ComponentFixture<ToponymDetailsComponent>;
  let component: ToponymDetailsComponent;

  // spies
  let addressSpy: jasmine.SpyObj<AddressService>;
  let msgSpy: jasmine.SpyObj<MessageWrapperService>;

  const makeData = (over: Partial<any> = {}) => ({
    operation: 'view-edit',
    toponymType: 'region',
    checkingName: 'name',
    controlsDisable: true,
    controls: [
      {
        controlName: 'name',
        value: '',
        type: 'inputText',
        formType: 'formControl',
      },
    ],
    addressFilterParams: {
      isShowCountry: true,
      isShowRegion: false,
      isShowDistrict: false,
      isShowLocality: false,
    },
    defaultAddressParams: {
      countryId: 1,
      regionId: 2,
      districtId: null,
      localityId: null,
    },
    object: null,
    ...over,
  });

  beforeEach(async () => {
    addressSpy = jasmine.createSpyObj('AddressService', [
      'checkToponymName',
      'saveToponym',
    ]);
    msgSpy = jasmine.createSpyObj('MessageWrapperService', ['handle']);
    const confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [
        ToponymDetailsComponent, // standalone
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: AddressService, useValue: addressSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
      ],
      // we override template anyway, but keep NO_ERRORS_SCHEMA for safety
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // render logic-only, no child views
    TestBed.overrideTemplate(ToponymDetailsComponent, '<div></div>');
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(ToponymDetailsComponent);
    component = fixture.componentInstance;

    // provide required signal input
    fixture.componentRef.setInput('data', makeData());
    fixture.detectChanges(); // runs ngOnInit of BaseDetails
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('builds form from controls and sets initial save-disabled state', () => {
    // form exists
    expect(component.mainForm.get('name')).toBeTruthy();

    // force the exact preconditions the component checks against
    (component as any).invalidAddressFilter = true; // initial guard
    component.changesSignal.set(false); // no edits yet

    // ensure operation is 'view-edit' (if your makeData() already sets it — можно убрать)
    const d = component.data();
    fixture.componentRef.setInput('data', {
      ...d,
      operation: 'view-edit',
    } as any);
    fixture.detectChanges();

    // compute disabled flag
    component.checkIsSaveDisabled();

    // expected: disabled = true
    expect(component.IsSaveDisabledSignal()).toBeTrue();
  });

  it('onSaveClick: duplicate name → does not call saveToponym and stops spinner', () => {
    component.mainForm.controls['name'].setValue('Alpha');
    addressSpy.checkToponymName.and.returnValue(of({ data: true })); // duplicate
    spyOn(component['emittedShowSpinner'], 'emit');

    component.onSaveClick('saveAndExit');

    expect(addressSpy.checkToponymName).toHaveBeenCalled();
    expect(addressSpy.saveToponym).not.toHaveBeenCalled();
    expect(component.showSpinner()).toBeFalse();
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(true);
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(false);
  });

  it('onSaveClick: check error → calls MessageWrapperService.handle and stops spinner', () => {
    component.mainForm.controls['name'].setValue('Alpha');
    addressSpy.checkToponymName.and.returnValue(
      throwError(() => ({ status: 500 }))
    );
    spyOn(component['emittedShowSpinner'], 'emit');

    component.onSaveClick('saveAndExit');

    expect(msgSpy.handle).toHaveBeenCalled();
    expect(component.showSpinner()).toBeFalse();
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(true);
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(false);
  });

  it('saveAndExit: successful flow emits closeDialogData and stops spinner', fakeAsync(() => {
    component.mainForm.controls['name'].setValue('Alpha');

    addressSpy.checkToponymName.and.returnValue(of({ data: false }));
    addressSpy.saveToponym.and.returnValue(
      of({
        data: {
          id: 1,
          name: 'Saved',
          defaultAddressParams: {
            countryId: 7,
            regionId: 8,
            districtId: null,
            localityId: null,
          },
        },
      })
    );

    spyOn(component['emittedCloseDialogData'], 'emit');
    spyOn(component['emittedShowSpinner'], 'emit');

    component.onSaveClick('saveAndExit');
    tick(); // flush microtasks if any

    expect(addressSpy.checkToponymName).toHaveBeenCalled();
    expect(addressSpy.saveToponym).toHaveBeenCalled();
    expect(component['emittedCloseDialogData'].emit).toHaveBeenCalledWith(
      'Saved'
    );
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(true);
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(false);
    expect(component.showSpinner()).toBeFalse();
  }));

  it('justSave: updates data().object, switches to view, stops spinner', () => {
    // Provide input with non-null object (view-edit mode)
    fixture.componentRef.setInput('data', {
      operation: 'view-edit',
      toponymType: 'region',
      controlsDisable: true,
      controls: [
        {
          controlName: 'name',
          value: '',
          type: 'inputText',
          formType: 'formControl',
        },
        {
          controlName: 'shortName',
          value: '',
          type: 'inputText',
          formType: 'formControl',
        },
      ],
      addressFilterParams: {
        isShowCountry: true,
        isShowRegion: false,
        isShowDistrict: false,
        isShowLocality: false,
      },
      defaultAddressParams: {
        countryId: 1,
        regionId: 2,
        districtId: 3,
        localityId: null,
      },
      object: {
        id: 10,
        name: 'Old Name',
        shortName: 'Old Short',
        defaultAddressParams: {
          countryId: 1,
          regionId: 2,
          districtId: 3,
          localityId: null,
        },
      } as any,
      checkingName: 'name',
    } as any);
    fixture.detectChanges();

    // Stub the child used by changeToViewMode()/onEditClick()
    (component as any).addressFilterComponent = {
      onChangeMode: jasmine.createSpy('onChangeMode'),
    } as any;

    // Mock API: not a duplicate → then save succeeds
    addressSpy.checkToponymName.and.returnValue(of({ data: false }));
    addressSpy.saveToponym.and.returnValue(
      of({
        data: {
          id: 10,
          name: 'Saved Name',
          shortName: 'Old Short',
          defaultAddressParams: {
            countryId: 1,
            regionId: 2,
            districtId: 3,
            localityId: null,
          },
        },
      })
    );

    // Enter edit mode and change a field
    component.onEditClick();
    component.mainForm.controls['name'].setValue('Saved Name');

    // Trigger justSave flow
    component.onSaveClick('justSave');

    // Assertions
    expect(addressSpy.checkToponymName).toHaveBeenCalled();
    expect(addressSpy.saveToponym).toHaveBeenCalled();
    expect(component.data().object!.name).toBe('Saved Name'); // object updated
    expect(component.isEditModeSignal()).toBeFalse(); // back to view
    expect(component.mainForm.controls['name'].disabled).toBeTrue();
    expect(component.showSpinner()).toBeFalse(); // spinner stopped

    // changeToViewMode syncs the child
    expect(
      (component as any).addressFilterComponent.onChangeMode as jasmine.Spy
    ).toHaveBeenCalledWith('view', component.data().defaultAddressParams!);
  });

  it('emitShowSpinner bridges to parent output and local signal', () => {
    spyOn(component['emittedShowSpinner'], 'emit');

    component.emitShowSpinner(true);
    expect(component.showSpinner()).toBeTrue();
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(true);

    component.emitShowSpinner(false);
    expect(component.showSpinner()).toBeFalse();
    expect(component['emittedShowSpinner'].emit).toHaveBeenCalledWith(false);
  });

  it('additionalValidationHooks: returns true when address filter differs from defaults', () => {
    // set addressFilterControls so hook is active
    const d = component.data();
    d.addressFilterControls = [
      { addressFilterProp: 'countries', toponymProp: 'countryId' },
      { addressFilterProp: 'regions', toponymProp: 'regionId' },
    ];
    // defaultAddressParams countryId=1, regionId=2 (from makeData)
    component['addressFilter'].set({
      countries: [999], // different
      regions: [2], // same
      districts: [],
      localities: [],
    });

    expect((component as any).additionalValidationHooks()).toBeTrue();
  });

  it('additionalValidationHooks: returns false when address filter matches defaults', () => {
    const d = component.data();
    d.addressFilterControls = [
      { addressFilterProp: 'countries', toponymProp: 'countryId' },
      { addressFilterProp: 'regions', toponymProp: 'regionId' },
    ];

    component['addressFilter'].set({
      countries: [1],
      regions: [2],
      districts: [],
      localities: [],
    });

    expect((component as any).additionalValidationHooks()).toBeFalse();
  });
});
