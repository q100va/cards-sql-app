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

import { ConfirmationService, MessageService } from 'primeng/api';

import { AddressFilterComponent } from '../../../address-filter/address-filter.component';
import { AddressFilterParams } from '../../../../interfaces/address-filter-params';
import { AddressFilter } from '../../../../interfaces/address-filter';
import { Control } from '../../../../interfaces/dialog-props';
import { AddressService } from '../../../../services/address.service';
import { DialogData } from '../../../../interfaces/dialog-props';
import {
  Contacts,
  ContactType,
  isContactType,
  User,
} from '../../../../interfaces/user';
import { Toponym } from '../../../../interfaces/toponym';
import { BaseModel } from '../../../../interfaces/base-model';

@Component({
  selector: 'app-base-details',
  imports: [],
  providers: [ConfirmationService, MessageService],
  templateUrl: './base-details.component.html',
  styleUrl: './base-details.component.css',
})
export class BaseDetailsComponent<T extends BaseModel> {
  object: T | null = null;
  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);
  addressService = inject(AddressService);

  data = input.required<DialogData<T>>();
  controlsNames!: string[];
  params!: AddressFilterParams;
  addressFilter = signal<AddressFilter>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
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
    //console.log('ngOnInit', this.data());
    this.params = this.data().addressFilterParams;
    this.createFormGroup(this.data().controls, this.data().controlsDisable!);
    ////console.log('this.mainForm', this.mainForm);
    this.controlsNames = this.data().controls.map(
      (control) => control.controlName
    );
    ////console.log('this.controlsNames', this.controlsNames);

    this.object = this.data().object;
    if (this.object) {
      this.setInitialValues(
        this.controlsNames,
        this.data().operation == 'view-edit' ? 'view' : 'create',
        true
      );
    } else {
      if (this.data().toponymType == 'country') {
        this.updateControlsValidity(this.controlsNames, true);
      }
    }
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
        /*         if ((control.value as [] | string[]).length > 0) {
          for (let value of control.value as string[]) {
            (this.mainForm.controls[control.controlName] as FormArray).push(
              new FormControl(
                { value: value, disabled: controlsDisable },
                control.validators || []
              )
            );
          }
        } else { */
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
    this.isEditModeSignal.set(true);
    //this.isEditMode = true;
    this.emittedIsEditMode.emit(true);
    this.changesSignal.set(false);
    //this.changes = false;
    this.emittedChanges.emit(false);
    //this.checkIsSaveDisabled();
    this.setInitialValues(this.controlsNames, 'edit');
    this.updateControlsValidity(this.controlsNames, true);
    this.addressFilterComponent.onChangeMode('edit', null);
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
          this.setInitialValues(this.controlsNames, 'view');
          this.changeToViewMode(this.data().defaultAddressParams);
        },
        reject: () => {},
      });
    } else {
      this.setInitialValues(this.controlsNames, 'view');
      this.changeToViewMode(null);
    }
  }

  onChangeValidation() {
    //Общая часть
    if (this.data().operation == 'view-edit') {
      this.changesSignal.set(false);
      for (let controlName of this.controlsNames) {
        if (controlName != 'password') {
          // if (!this.contactTypes.includes(controlName)) {
          if (!isContactType(controlName)) {
            if (
              this.mainForm.controls[controlName].value !=
                this.object![controlName as keyof typeof this.object] &&
              !(
                this.mainForm.controls[controlName].value === '\u00A0' &&
                this.object![controlName as keyof typeof this.object] === ''
              )
            ) {
              this.changesSignal.set(true);
             // this.changes = true;
              /*           console.log(
                'this.mainForm.controls[controlName].value',
                this.mainForm.controls[controlName].value,
                this.object![controlName],
                controlName
              ); */
            }
          }
        }
      }

      if (!this.changesSignal()) {
        this.changesSignal.set(this.additionalValidationHooks());
      }

      //Общая часть

      this.emittedChanges.emit(this.changesSignal());
    }

    this.checkIsSaveDisabled();
  }

  protected additionalValidationHooks(): boolean {
    return false; // по умолчанию — ничего не добавляет
  }

  changeToViewMode(addressParams: any) {
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
    controlsToSetValues: string[],
    mode: 'view' | 'edit' | 'create',
    firstInitialization = false
  ) {
    controlsToSetValues.forEach((controlName) => {
      //  //console.log('control', controlName);
      if (
        !this.contactTypes.includes(controlName as keyof typeof this.object)
      ) {
        if (
          mode == 'view' &&
          this.object![controlName as keyof typeof this.object] === ''
        ) {
          this.mainForm.controls[controlName].setValue('\u00A0'); // Non-breaking space for empty values in view mode
          /*  //console.log(
            'this.mainForm.controls[controlName].value',
            this.mainForm.controls[controlName].value
          ); */
        } else if (controlName == 'password') {
          this.mainForm.controls[controlName].setValue('password123'); // Placeholder for password field to prevent error in edit mode.
        } else {
          this.mainForm.controls[controlName].setValue(
            this.object![controlName as keyof typeof this.object]
          );
        }
      }
    });
  }

  errorHandling(err: any) {
    console.log(err);
    let errorMessage =
      typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
    this.messageService.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: errorMessage,
      sticky: true,
    });
  }
}
