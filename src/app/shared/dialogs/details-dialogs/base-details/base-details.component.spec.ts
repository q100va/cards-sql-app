import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import {
  NO_ERRORS_SCHEMA,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { of } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { BaseDetailsComponent } from './base-details.component';
import { ConfirmationService } from 'primeng/api';
import { AddressService } from '../../../../services/address.service';
import { MessageWrapperService } from '../../../../services/message.service';
import { DialogData } from '../../../../interfaces/dialog-props';
import { Toponym } from '../../../../interfaces/toponym';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';

/* -------------------------------------------------------------------------- */
/* Test helpers / stubs                                                       */
/* -------------------------------------------------------------------------- */

// Always return empty dictionary so |translate pipes won’t crash.
class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

// Minimal stub of AddressFilter child (selector exists, but no heavy UI).
@Component({
  selector: 'app-address-filter',
  standalone: true,
  template: '<ng-content></ng-content>',
})
class AddressFilterStub {
  @Input() params: any;
  @Input() defaultAddressParams: any;
  @Output() addressFilter = new EventEmitter<any>();
  @Output() showSpinner = new EventEmitter<boolean>();
}

/* -------------------------------------------------------------------------- */
/* Common factory to build DialogData                                         */
/* -------------------------------------------------------------------------- */

function makeData(
  op: 'create' | 'view-edit',
  type: 'country' | 'region' | 'district' | 'locality',
  object: Partial<Toponym> | null
): DialogData<Toponym> {
  return {
    operation: op,
    creationTitle: 'CREATE',
    viewTitle: 'VIEW',
    componentType: 'toponym',
    toponymType: type,
    controlsDisable: op !== 'create', // view-edit ⇒ disabled on init
    object: object as any,
    defaultAddressParams: object?.['defaultAddressParams'] ?? {
      countryId: 1,
      regionId: 2,
      districtId: 3,
      localityId: 4,
    },
    addressFilterParams: {
      isShowCountry: true,
      isShowRegion: true,
      isShowDistrict: true,
      isShowLocality: false,
      source: 'toponymCard',
      multiple: false,
      cols: '1',
      gutterSize: '16px',
      rowHeight: '76px',
    },
    controls: [
      {
        controlName: 'name',
        value: object?.['name'] ?? '',
        disabled: op !== 'create',
        type: 'inputText',
        label: 'NAME',
        placeholder: 'Name',
        formType: 'formControl',
      },
      {
        controlName: 'shortName',
        value: object?.['shortName'] ?? '',
        disabled: op !== 'create',
        type: 'inputText',
        label: 'SHORT',
        placeholder: 'Short',
        formType: 'formControl',
      },
    ],
    checkingName: 'name',
  };
}

/* -------------------------------------------------------------------------- */
/* Suite                                                                      */
/* -------------------------------------------------------------------------- */

describe('BaseDetailsComponent', () => {
  let fixture: ComponentFixture<BaseDetailsComponent<Toponym>>;
  let component: BaseDetailsComponent<Toponym>;

  // Spies for services (not heavily used here but nice to have)
  const confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
  const addressSpy = jasmine.createSpyObj('AddressService', [
    'checkToponymName',
    'saveToponym',
  ]);
  const msgSpy = jasmine.createSpyObj('MessageWrapperService', ['handle']);

  beforeEach(async () => {
    // Replace heavy template with a simple one; we test logic, not DOM.
    TestBed.overrideComponent(BaseDetailsComponent, {
      set: {
        template: '<div>base-details-stub</div>',
        imports: [AddressFilterStub],
      },
    });

    await TestBed.configureTestingModule({
      imports: [
        BaseDetailsComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: AddressService, useValue: addressSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseDetailsComponent<Toponym>);
    component = fixture.componentInstance;

    // Provide required input (signal) before detectChanges
    fixture.componentRef.setInput(
      'data',
      makeData('view-edit', 'region', {
        name: null as any, // to validate NBSP behavior in view-mode
        shortName: 'AAA',
        defaultAddressParams: {
          countryId: 10,
          regionId: 20,
          districtId: null,
          localityId: null,
        },
      })
    );

    // Attach a stub for child @ViewChild(AddressFilterComponent)
    (component as any).addressFilterComponent = {
      onChangeMode: jasmine.createSpy('onChangeMode'),
    };

    fixture.detectChanges(); // triggers ngOnInit
  });

  afterEach(() => {
    confirmSpy.confirm.calls.reset();
    msgSpy.handle.calls.reset();
  });

  /* ------------------------------------------------------------------------ */
  /* Initialization builds form; view mode shows NBSP for nulls                */
  /* ------------------------------------------------------------------------ */
  it('initializes form; in view mode null fields become NBSP', () => {
    // In view-edit mode, controls are disabled on init
    expect(component.mainForm.controls['name'].disabled).toBeTrue();
    expect(component.mainForm.controls['shortName'].disabled).toBeTrue();

    // name was null in object → in view-mode should be NBSP
    expect(component.mainForm.controls['name'].value).toBe('\u00A0');
    expect(component.mainForm.controls['shortName'].value).toBe('AAA');
  });

  /* ------------------------------------------------------------------------ */
  /* onEditClick switches to edit, enables controls, clears changes flag       */
  /* ------------------------------------------------------------------------ */
  it('onEditClick: enters edit mode, enables controls, clears changes', () => {
    // stub child used inside changeToViewMode()
    (component as any).addressFilterComponent = {
      onChangeMode: jasmine.createSpy('onChangeMode'),
    } as any;

    // seed a minimal form and controls list
    component.mainForm.addControl('name', new FormControl('init'));
    component.mainForm.addControl('shortName', new FormControl('s'));
    component['controlsNames'] = ['name', 'shortName'];

    // pretend there were changes before switching
    component.changesSignal.set(true);

    // act
    component.onEditClick();

    // assert
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.controls['name'].enabled).toBeTrue();
    expect(component.mainForm.controls['shortName'].enabled).toBeTrue();
    expect(component.changesSignal()).toBeFalse();

    expect(
      (component as any).addressFilterComponent.onChangeMode as jasmine.Spy
    ).toHaveBeenCalledWith('edit', null);
  });

  /* ------------------------------------------------------------------------ */
  /* onViewClick with changes: shows confirm; on accept → switch to view       */
  /* ------------------------------------------------------------------------ */
  it('onViewClick: if there are changes → confirm; accept switches to view and syncs child', () => {
    (component as any).addressFilterComponent = {
      onChangeMode: jasmine.createSpy('onChangeMode'),
    } as any;

    component['controlsNames'] = ['name'];
    component.mainForm.addControl('name', new FormControl('init'));

    component.onEditClick();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.controls['name'].enabled).toBeTrue();

    component.changesSignal.set(true);
    confirmSpy.confirm.and.callFake((cfg: any) => cfg.accept());

    component.onViewClick();

    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.mainForm.controls['name'].disabled).toBeTrue();
    expect(
      (component as any).addressFilterComponent.onChangeMode as jasmine.Spy
    ).toHaveBeenCalledWith('view', jasmine.anything());
    expect(confirmSpy.confirm).toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* onViewClick without changes: directly switch to view                      */
  /* ------------------------------------------------------------------------ */
  it('onViewClick: without changes → switches to view without confirm', () => {
    // stub AddressFilter child used in changeToViewMode()
    (component as any).addressFilterComponent = {
      onChangeMode: jasmine.createSpy('onChangeMode'),
    } as any;

    // seed minimal form so updateControlsValidity can toggle it
    component['controlsNames'] = ['name'];
    component.mainForm.addControl('name', new FormControl('init'));

    // enter edit mode first (enables controls, clears changes)
    component.onEditClick();
    expect(component.isEditModeSignal()).toBeTrue();
    expect(component.mainForm.controls['name'].enabled).toBeTrue();

    // ensure no changes → should go to view WITHOUT confirmation
    component.changesSignal.set(false);

    component.onViewClick();

    // now in view mode, controls disabled, child synced with null addressParams
    expect(component.isEditModeSignal()).toBeFalse();
    expect(component.mainForm.controls['name'].disabled).toBeTrue();
    expect(
      (component as any).addressFilterComponent.onChangeMode as jasmine.Spy
    ).toHaveBeenCalledWith('view', null);

    // confirm dialog must not be shown
    expect(confirmSpy.confirm).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* onCancelClick: in create mode asks confirm; on accept emits close=true    */
  /* ------------------------------------------------------------------------ */
  it('onCancelClick: create mode → confirm; accept emits close=true', () => {
    // Re-provide input as create mode
    fixture.componentRef.setInput('data', makeData('create', 'locality', null));
    fixture.detectChanges();

    spyOn(component.emittedCloseDialogData, 'emit');

    confirmSpy.confirm.and.callFake((cfg: any) => cfg.accept());
    component.onCancelClick();

    expect(component.closeDialogDataSignal()).toBeTrue();
    expect(component.emittedCloseDialogData.emit).toHaveBeenCalledWith(true);
  });

  /* ------------------------------------------------------------------------ */
  /* onChangeAddress: enforces minimal depth per toponym type                  */
  /*   - region requires countries[]                                          */
  /* ------------------------------------------------------------------------ */
it('onChangeAddress: for "region" requires countries[]; updates validity and save disabled', () => {
  fixture.componentRef.setInput('data', makeData('create', 'region', {
    name: 'Alpha',
    shortName: 'AAA',
    defaultAddressParams: { countryId: null, regionId: null, districtId: null, localityId: null },
  }));
  fixture.detectChanges();

  component.onChangeAddress({ countries: [], regions: [], districts: [], localities: [] });
expect((component as any).invalidAddressFilter).toBeTrue()

component.onChangeAddress({ countries: [1], regions: [], districts: [], localities: [] });
expect((component as any).invalidAddressFilter).toBeFalse();
});

  /* ------------------------------------------------------------------------ */
  /* updateControlsValidity path via public API (onEditClick / onViewClick)   */
  /* ------------------------------------------------------------------------ */
it('switches modes and syncs child (edit → view)', () => {
  // Stub child used by changeToViewMode()
  (component as any).addressFilterComponent = {
    onChangeMode: jasmine.createSpy('onChangeMode'),
  } as any;

  // Make sure the form is created (if for some reason CD не успел)
  if (!component.mainForm.contains('name')) {
    component.ngOnInit(); // safety net
  }

  // Go to edit
  component.onEditClick();
  expect(component.isEditModeSignal()).toBeTrue();

  // Back to view (no confirm branch)
  component.changesSignal.set(false);
  component.onViewClick();

  // Mode flipped back to view
  expect(component.isEditModeSignal()).toBeFalse();

  // Child sync happened for both edit and view at least once
  const args =
    ((component as any).addressFilterComponent.onChangeMode as jasmine.Spy)
      .calls.allArgs();
  expect(args.some(a => a[0] === 'edit')).toBeTrue();
  expect(args.some(a => a[0] === 'view')).toBeTrue();
});



  /* ------------------------------------------------------------------------ */
  /* onChangeValidation (indirect): computes changes vs object (ignores NBSP)  */
  /* ------------------------------------------------------------------------ */
  it('indirectly sets changesSignal only when values differ from object; NBSP vs null is ignored', () => {
    component.mainForm = new FormGroup<Record<string, AbstractControl>>({
      name: new FormControl('') as unknown as AbstractControl,
    });
    (component as any).controlsNames = ['name'];

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
      object: { id: 1, name: null } as any,
    } as any);
    fixture.detectChanges();

    component.changesSignal.set(false);
    component.mainForm.controls['name'].setValue('\u00A0'); // NBSP

    (component as any).onChangeValidation();

    expect(component.changesSignal()).toBeFalse();
  });
});
