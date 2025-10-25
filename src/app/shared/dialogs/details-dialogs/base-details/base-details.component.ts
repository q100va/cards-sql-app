import {
  Component,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  AbstractControl,
  FormArray,
} from '@angular/forms';

import { ConfirmationService } from 'primeng/api';

import { AddressFilterComponent } from '../../../address-filter/address-filter.component';
import {
  AddressFilter,
  DefaultAddressParams,
  hasKey,
  AddressFilterParams,
} from '../../../../interfaces/toponym';
import { Control, DialogData } from '../../../../interfaces/dialog-props';
import { ContactType, isContactType } from '../../../../interfaces/user';
import { BaseModel } from '../../../../interfaces/base-model';
import { MessageWrapperService } from '../../../../services/message.service';
import { AddressService } from '../../../../services/address.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-base-details',
  imports: [TranslateModule],
  templateUrl: './base-details.component.html',
  styleUrl: './base-details.component.css',
})
export class BaseDetailsComponent<T extends BaseModel> {
  get object(): T | null {
    return this.data().object;
  }

  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  protected readonly confirmationService = inject(ConfirmationService);
  protected readonly addressService = inject(AddressService);
  protected readonly msgWrapper = inject(MessageWrapperService);
  protected readonly translateService = inject(TranslateService);

  // Input data (as a signal from parent wrapper)
  data = input.required<DialogData<T>>();

  // Address filter state
  params!: AddressFilterParams;
  addressFilter = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });
  invalidAddressFilter = true;

  // Outputs as signals (parent bridges them)
  readonly emittedIsEditMode = output<boolean>();
  readonly emittedChanges = output<boolean>();
  readonly emittedIsSaveDisabled = output<boolean>();
  readonly emittedCloseDialogData = output<string | true | null>();
  readonly emittedShowSpinner = output<boolean>();

  // Local UI state signals
  isEditModeSignal = signal(false);
  changesSignal = signal(false);
  IsSaveDisabledSignal = signal(true);
  closeDialogDataSignal = signal<string | true | null>(null);
  showSpinner = signal(true);

  // Reactive form
  mainForm: FormGroup<Record<string, AbstractControl>> = new FormGroup({});
  controlsNames!: string[];

  // Supported contact fields
  contactTypes: Exclude<ContactType, 'telegram'>[] = [
    'email',
    'phoneNumber',
    'telegramId',
    'telegramPhoneNumber',
    'telegramNickname',
    'whatsApp',
    'vKontakte',
    'instagram',
    'facebook',
    'otherContact',
  ];

  ngOnInit() {
    this.params = this.data().addressFilterParams;

    // build form from config
    this.createFormGroup(this.data().controls, this.data().controlsDisable!);

    // cache control names for quick loops
    this.controlsNames = this.data().controls.map((c) => c.controlName);

    // init values by mode
    if (this.object) {
      this.setInitialValues(
        this.data().operation == 'view-edit' ? 'view' : 'create'
      );
    } else if (this.data().toponymType == 'country') {
      // country form starts enabled
      this.updateControlsValidity(this.controlsNames, true);
    }
    console.log('ngOnInit ', this.addressFilter());
  }

  // Hook for specific components to implement
  checkIsSaveDisabled() {}

  // Build reactive form from declarative controls config
  protected createFormGroup(controls: Control[], controlsDisable: boolean) {
    for (const control of controls) {
      if (control.formType == 'formControl') {
        this.mainForm.addControl(
          control.controlName,
          new FormControl(
            { value: control.value, disabled: controlsDisable },
            control.validators || []
          )
        );
      } else if (control.formType == 'formArray') {
        const fa = new FormArray([
          new FormControl(
            { value: control.value, disabled: controlsDisable },
            control.validators || []
          ),
        ]);
        this.mainForm.addControl(control.controlName, fa);
      }
    }
  }

  getFormArray(name: string): FormArray {
    return this.mainForm.get(name) as FormArray;
  }

  // To be implemented by concrete details
  onSaveClick(_action: 'justSave' | 'saveAndExit') {}

  // Address changes from child filter
  onChangeAddress(event: AddressFilter) {
    if (this.data().operation == 'create' || this.isEditModeSignal()) {
      this.addressFilter.set(event);

      // validate minimal address depth by toponym type
      let ok = true;
      if (this.data().toponymType == 'locality')
        ok = !!this.addressFilter().districts?.length;
      if (this.data().toponymType == 'district')
        ok = !!this.addressFilter().regions?.length;
      if (this.data().toponymType == 'region')
        ok = !!this.addressFilter().countries?.length;

      this.updateControlsValidity(this.controlsNames, ok);
      this.onChangeValidation();
    }
  }

  // Switch to edit mode
  onEditClick() {
    this.isEditModeSignal.set(true);
    this.emittedIsEditMode.emit(true);
    this.changesSignal.set(false);
    this.emittedChanges.emit(false);
    this.setInitialValues('edit');
    this.updateControlsValidity(this.controlsNames, true);
    this.addressFilterComponent.onChangeMode('edit', null);
    console.log('onEditClick ', this.addressFilter());
  }

  // Switch to view mode (with confirm if there are changes)
  onViewClick() {
    if (this.changesSignal()) {
      this.confirmationService.confirm({
        message: this.translateService.instant(
          'PRIME_CONFIRM.LEAVE_WITHOUT_SAVE_MESSAGE'
        ),
        header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
        },
        acceptButtonProps: {
          label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
          severity: 'secondary',
          outlined: true,
        },
        accept: () => {
          this.setInitialValues('view');
          this.changeToViewMode(this.data().defaultAddressParams!);
        },
        reject: () => {},
      });
    } else {
      this.setInitialValues('view');
      this.changeToViewMode(null);
    }
  }

  // Cancel dialog (with confirm if dirty or create mode)
  onCancelClick() {
    if (this.changesSignal() || this.data().operation === 'create') {
      this.confirmationService.confirm({
        message: this.translateService.instant(
          'PRIME_CONFIRM.LEAVE_WITHOUT_SAVE_MESSAGE'
        ),
        header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
        },
        acceptButtonProps: {
          label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
          severity: 'secondary',
          outlined: true,
        },
        accept: () => {
          this.closeDialogDataSignal.set(true);
          this.emittedCloseDialogData.emit(true);
        },
        reject: () => {},
      });
    } else {
      this.closeDialogDataSignal.set(true);
      this.emittedCloseDialogData.emit(true);
    }
  }

  // Recalculate `changes` + save-disabled
  protected onChangeValidation() {
    if (this.data().operation == 'view-edit') {
      this.changesSignal.set(false);

      for (const controlName of this.controlsNames) {
        if (
          controlName != 'password' &&
          !isContactType(controlName) &&
          hasKey(this.object!, controlName)
        ) {
          const newVal = this.mainForm.controls[controlName].value;
          const oldVal = this.object![controlName];
          const isNbspToNull = newVal === '\u00A0' && oldVal === null;
          if (newVal != oldVal && !isNbspToNull) {
            this.changesSignal.set(true);
            break;
          }
        }
      }

      if (!this.changesSignal()) {
        // let specific component add extra dirty rules (address filter, etc.)
        this.changesSignal.set(this.additionalValidationHooks());
        console.log('this.changesSignal()', this.changesSignal());
      }

      this.emittedChanges.emit(this.changesSignal());
    }

    this.checkIsSaveDisabled();
  }

  // Extension point for domain-specific dirty checks
  protected additionalValidationHooks(): boolean {
    return false;
  }

  // View-mode: disable controls and sync address-filter child
  protected changeToViewMode(addressParams: DefaultAddressParams | null) {
    this.isEditModeSignal.set(false);
    this.emittedIsEditMode.emit(false);
    this.updateControlsValidity(this.controlsNames, false);
    this.addressFilterComponent.onChangeMode('view', addressParams);
  }

  // Enable/disable a set of controls; also flip address-filter validity flag
  protected updateControlsValidity(
    controlsToUpdate: string[],
    enable: boolean
  ) {
    for (const control of controlsToUpdate) {
      enable
        ? this.mainForm.controls[control].enable()
        : this.mainForm.controls[control].disable();
    }
    this.invalidAddressFilter = !enable;
    this.checkIsSaveDisabled();
  }

  // Fill controls from current object (special casing for password/nbsp)
  protected setInitialValues(mode: 'view' | 'edit' | 'create') {
    for (const controlName of this.controlsNames) {
      if (isContactType(controlName)) continue;
      if(controlName === 'password') this.mainForm.controls[controlName].setValue('password123');
      if (hasKey(this.object!, controlName)) {
        const v = this.object![controlName];
        this.mainForm.controls[controlName].setValue(
          mode === 'view' && v === null
            ? '\u00A0'
            : v
        );
      }
    }
  }
}
