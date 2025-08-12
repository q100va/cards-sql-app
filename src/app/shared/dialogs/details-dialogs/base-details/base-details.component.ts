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
import { AddressFilterParams } from '../../../../interfaces/address-filter-params';
import { AddressFilter } from '../../../../interfaces/address-filter';
import { Control } from '../../../../interfaces/dialog-props';
import { AddressService } from '../../../../services/address.service';
import { DialogData } from '../../../../interfaces/dialog-props';
import { ContactType, isContactType } from '../../../../interfaces/user';
import { BaseModel } from '../../../../interfaces/base-model';
import { DefaultAddressParams } from '../../../../interfaces/default-address-params';
import { hasKey } from '../../../../interfaces/types';
import { MessageWrapperService } from '../../../../services/message.service';

@Component({
  selector: 'app-base-details',
  imports: [],
  providers: [],
  templateUrl: './base-details.component.html',
  styleUrl: './base-details.component.css',
})
export class BaseDetailsComponent<T extends BaseModel> {
  get object(): T | null {
    return this.data().object;
  }
  //object: T | null = null;
  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  confirmationService = inject(ConfirmationService);
  addressService = inject(AddressService);
  msgWrapper = inject(MessageWrapperService);

  data = input.required<DialogData<T>>();
  controlsNames!: string[];
  params!: AddressFilterParams;
  addressFilter = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });
  invalidAddressFilter = true;

  readonly emittedIsEditMode = output<boolean>();
  readonly emittedChanges = output<boolean>();
  readonly emittedIsSaveDisabled = output<boolean>();
  readonly emittedCloseDialogData = output<string>();
  /*   emittedIsEditMode = output<boolean>();
  emittedChanges = output<boolean>();
  closeDialog = output<string>();
  emittedIsSaveDisabled = output<boolean>(); */
  //isEditMode = false;
  //changes = false;

  isEditModeSignal = signal(false);
  changesSignal = signal(false);
  IsSaveDisabledSignal = signal(true);
  closeDialogDataSignal = signal<string | null>(null);

  onChangeMode = output<string>();

  mainForm: FormGroup<Record<string, AbstractControl>> = new FormGroup({});

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
  // object: User | Toponym | null = null;

  ngOnInit() {
    console.log('changesSignal', this.changesSignal());
    //console.log('ngOnInit', this.data());
    this.params = this.data().addressFilterParams;
    this.createFormGroup(this.data().controls, this.data().controlsDisable!);
    ////console.log('this.mainForm', this.mainForm);

    this.controlsNames = this.data().controls.map(
      (control) => control.controlName
    );
    ////console.log('this.controlsNames', this.controlsNames);

    // this.object = this.data().object;

    if (this.object) {
      this.setInitialValues(
        // this.controlsNames,
        this.data().operation == 'view-edit' ? 'view' : 'create',
        true
      );
    } else {
      if (this.data().toponymType == 'country') {
        this.updateControlsValidity(this.controlsNames, true);
      }
    }
    console.log('changesSignal', this.changesSignal());
  }

  checkIsSaveDisabled() {}

  createFormGroup(controls: Control[], controlsDisable: boolean) {
    for (let control of controls) {
      if (control.formType == 'formControl') {
        this.mainForm.addControl(
          control.controlName,
          new FormControl(
            { value: control.value, disabled: controlsDisable },
            control.validators || []
          )
        );
      }
      if (control.formType == 'formArray') {
        this.mainForm.addControl(control.controlName, new FormArray([]));
        (this.mainForm.controls[control.controlName] as FormArray).push(
          new FormControl(
            { value: control.value, disabled: controlsDisable },
            control.validators || []
          )
        );
        //}
      }
    }
  }

  getFormArray(name: string): FormArray {
    return this.mainForm.get(name) as FormArray;
  }

  onSaveClick(action: 'justSave' | 'saveAndExit') {}

  onChangeAddress(event: AddressFilter) {
    //console.log('onChangeAddress', event);
    //console.log('this.data()', this.data());
    if (this.data().operation == 'create' || this.isEditModeSignal()) {
      this.addressFilter.set(event);
      // console.log('onChangeAddress', event);
      //console.log('this.data().toponymType', this.data().toponymType);

      let condition = true;
      if (this.data().toponymType == 'locality')
        condition = this.addressFilter().districts?.length! > 0;
      if (this.data().toponymType == 'district')
        condition = this.addressFilter().regions?.length! > 0;
      if (this.data().toponymType == 'region')
        condition = this.addressFilter().countries?.length! > 0;

      this.updateControlsValidity(this.controlsNames, condition);

      this.onChangeValidation();
    }
  }

  onEditClick() {
    console.log('changesSignal', this.changesSignal());
    this.isEditModeSignal.set(true);
    //this.isEditMode = true;
    this.emittedIsEditMode.emit(true);
    this.changesSignal.set(false);
    //this.changes = false;
    this.emittedChanges.emit(false);
    //this.checkIsSaveDisabled();
    this.setInitialValues('edit');
    this.updateControlsValidity(this.controlsNames, true);
    console.log('changesSignal1', this.changesSignal());
    this.addressFilterComponent.onChangeMode('edit', null);
    console.log('changesSignal2', this.changesSignal());
  }

  onViewClick() {
    if (this.changesSignal()) {
      this.confirmationService.confirm({
        message: 'Вы уверены, что хотите выйти без сохранения?',
        header: 'Предупреждение',
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: 'Нет',
        },
        acceptButtonProps: {
          label: 'Да',
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

  onChangeValidation() {
    if (this.data().operation == 'view-edit') {
      this.changesSignal.set(false);
      for (let controlName of this.controlsNames) {
        if (controlName != 'password' && !isContactType(controlName)) {
          // if (!this.contactTypes.includes(controlName)) {
          if (hasKey(this.object!, controlName)) {
            if (
              this.mainForm.controls[controlName].value !=
                this.object![controlName] &&
              !(
                this.mainForm.controls[controlName].value === '\u00A0' &&
                this.object![controlName] === null
              )
            ) {
              console.log(
                'this.mainForm.controls[controlName].value, this.object![controlName]',
                this.mainForm.controls[controlName].value,
                this.object![controlName]
              );
              this.changesSignal.set(true);
            }
          }
        }
      }

      if (!this.changesSignal()) {
        const newChangesValue = this.additionalValidationHooks();
        console.log('newChangesValue', newChangesValue);

        this.changesSignal.set(newChangesValue);
      }

      this.emittedChanges.emit(this.changesSignal());
    }

    this.checkIsSaveDisabled();
  }

  protected additionalValidationHooks(): boolean {
    return false; // по умолчанию — ничего не добавляет
  }

  changeToViewMode(addressParams: DefaultAddressParams | null) {
    this.isEditModeSignal.set(false);
    this.emittedIsEditMode.emit(false);
    this.updateControlsValidity(this.controlsNames, false);
    //this.invalidAddressFilter = false; ???
    this.addressFilterComponent.onChangeMode('view', addressParams);
  }

  updateControlsValidity(controlsToUpdate: string[], conditions: boolean) {
    // console.log('controlsToUpdate', controlsToUpdate, conditions);
    controlsToUpdate.forEach((control) => {
      /*       if (control != 'userName') { */
      conditions
        ? this.mainForm.controls[control].enable()
        : this.mainForm.controls[control].disable();
      /*    } */
    });
    this.invalidAddressFilter = !conditions;
    //console.log('invalidAddressFilter', this.invalidAddressFilter);
    this.checkIsSaveDisabled();
  }

  setInitialValues(
    //controlsToSetValues: string[],
    mode: 'view' | 'edit' | 'create',
    firstInitialization = false
  ) {
    /* console.log(
      'this.data().object, this.object,',
      this.data().object,
      this.object
    ); */
    for (const controlName of this.controlsNames) {
      //  console.log('controlName', controlName);
      if (isContactType(controlName)) continue;

      if (hasKey(this.object!, controlName)) {
        const controlValue = this.object![controlName];

        this.mainForm.controls[controlName].setValue(
          mode === 'view' && controlValue === null
            ? '\u00A0'
            : controlName === 'password'
            ? 'password123'
            : controlValue
        );
      }
    }
  }
}
