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
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  AbstractControl,
  Validators,
  FormArray,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

import { AddressFilterComponent } from '../../../address-filter/address-filter.component';
import { AddressFilterParams } from '../../../../interfaces/address-filter-params';
import { AddressFilter } from '../../../../interfaces/address-filter';
import { ToponymFormControlsNames } from '../../../../interfaces/toponymFormControlsNames';
import { Control } from '../../../../interfaces/toponym-props';
import { AddressService } from '../../../../services/address.service';
import { DialogData } from '../../../../interfaces/dialog-data';

@Component({
  selector: 'app-base-details',
  imports: [
    //FormsModule,
    //ReactiveFormsModule,
    // ConfirmDialogModule,
    // Toast,
    // AddressFilterComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './base-details.component.html',
  styleUrl: './base-details.component.css',
})
export class BaseDetailsComponent {
  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);
  addressService = inject(AddressService);

  data = input.required<DialogData>();
  //data = signal<DialogData>({});
  controlsNames!: string[];
  params!: AddressFilterParams;
  addressFilter = signal<AddressFilter>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });
  invalidAddressFilter = true;
  isEditMode = false;
  emittedIsEditMode = output<boolean>();
  onChangeMode = output<string>();
  changes = false;
  emittedChanges = output<boolean>();
  closeDialog = output<string>();
  emittedIsSaveDisabled = output<boolean>();
  mainForm: FormGroup<Record<string, AbstractControl>> = new FormGroup({});

  contactTypes = [
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
    console.log('ngOnInit', this.data());
    this.params = this.data().addressFilterParams;
    this.createFormGroup(this.data().controls, this.data().controlsDisable!);
    //console.log('this.mainForm', this.mainForm);
    this.controlsNames = this.data().controls.map(
      (control) => control.controlName
    );
    //console.log('this.controlsNames', this.controlsNames);
    if (this.data().object) {
      this.setInitialValues(
        this.controlsNames,
        this.data().operation == 'view-edit' ? 'view' : 'create',
        true
      );
    } else {
      if (this.data().type == 'country') {
        this.updateControlsValidity(this.controlsNames, true);
      }
    }
  }

  checkIsSaveDisabled() {
    let condition: boolean = false;
    if (this.data().componentType == 'user') {
      condition =
        !this.mainForm.valid ||
        (!this.changes && this.data().operation == 'view-edit');
    }
    if (this.data().componentType == 'toponym') {
      condition =
        !this.mainForm.valid ||
        this.invalidAddressFilter ||
        (!this.changes && this.data().operation == 'view-edit');
    }
    if (condition) {
      this.emittedIsSaveDisabled.emit(true);
    } else {
      this.emittedIsSaveDisabled.emit(false);
    }
  }

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
        if ((control.value as [] | string[]).length > 0) {
          for (let value of control.value as string[]) {
            (this.mainForm.controls[control.controlName] as FormArray).push(
              new FormControl(
                { value: value, disabled: controlsDisable },
                control.validators || []
              )
            );
          }
        } else {
          (this.mainForm.controls[control.controlName] as FormArray).push(
            new FormControl(
              { value: '', disabled: controlsDisable },
              control.validators || []
            )
          );
        }
      }
/*       console.log(
        'this.mainForm.controls[control.controlName]',
        control.controlName,
        this.mainForm.controls[control.controlName]
      ); */
    }
  }

  getFormArray(name: string): FormArray {
    return this.mainForm.get(name) as FormArray;
  }

  onChangeAddressFilter(event: AddressFilter) {
    console.log('onChangeAddressFilter', event);
    console.log('this.data()', this.data());
    if (this.data().operation == 'create' || this.isEditMode) {
      this.addressFilter.set(event);
      let condition = true;
      if (this.data().type == 'locality')
        condition = this.addressFilter().districts?.length! > 0;
      if (this.data().type == 'district')
        condition = this.addressFilter().regions?.length! > 0;
      if (this.data().type == 'region')
        condition = this.addressFilter().countries?.length! > 0;

      this.updateControlsValidity(this.controlsNames, condition);

      this.onChangeValidation();
    }
  }

  onSaveClick(action: 'justSave' | 'saveAndExit') {}

  onEditClick() {
    this.isEditMode = true;
    this.emittedIsEditMode.emit(this.isEditMode);
    this.changes = false;
    this.emittedChanges.emit(this.changes);
    //this.checkIsSaveDisabled();
    this.setInitialValues(this.controlsNames, 'edit');
    this.updateControlsValidity(this.controlsNames, true);
    this.addressFilterComponent.onChangeMode('edit', null);
  }

  onViewClick() {
    if (this.changes) {
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
    if (this.data().operation == 'view-edit') {
      this.changes = false;
      for (let controlName of this.controlsNames) {
        if (controlName != 'password') {
          if (!this.contactTypes.includes(controlName)) {
            if (
              this.mainForm.controls[controlName].value !=
                this.data().object![controlName] &&
              !(
                this.mainForm.controls[controlName].value === '\u00A0' &&
                this.data().object![controlName] === ''
              )
            ) {
              this.changes = true;
/*               console.log(
                'this.mainForm.controls[controlName].value',
                this.mainForm.controls[controlName].value,
                this.data().object![controlName],
                controlName
              ); */
            }
          }
        }
      }

      if (!this.changes && this.data().object!['orderedContacts']) {
        const orderedContacts = this.data().object!['orderedContacts'];
        for (let contact of this.contactTypes) {
          const values = orderedContacts[
            contact as keyof typeof orderedContacts
          ] as unknown as string[];
          if (!values) {
            if (
              this.mainForm.get(contact)?.value.length > 0 &&
              this.mainForm.get(contact)?.value[0] != ''
            ) {
              this.changes = true;
            }
          } else if (
            values.length != this.mainForm.get(contact)?.value.length
          ) {
            this.changes = true;
            break;
          } else {
            for (let i = 0; i < values.length; i++) {
/*               console.log(
                'onChangeValidation',
                this.mainForm.get(contact)?.value[i],
                values[i]
              ); */
              if (
                this.mainForm.get(contact)?.value[i] != values[i] /* &&
                !(
                  this.mainForm.get(contact)?.value[i] === '\u00A0' &&
                  values[i] === ''
                ) */
              ) {
                this.changes = true;
                break;
              }
            }
          }


        }
      }
//TODO: check if address were changed - ПОКА  РАБОТАЕТ с ошибками

      if (!this.changes && this.data().addressFilterControls) {
        console.log('this.data().addressFilterControls', this.data().addressFilterControls);
        for (let item of this.data().addressFilterControls!) {
          if (
            this.addressFilter()[
              item.addressFilterProp as keyof AddressFilter
            ]![0] != this.data().object![item.toponymProp]
          ) {
            this.changes = true;
            break;
          }
        }
      }
      this.emittedChanges.emit(this.changes);
    }
    this.checkIsSaveDisabled();
  }

  changeToViewMode(addressParams: any) {
    this.isEditMode = false;
    this.emittedIsEditMode.emit(this.isEditMode);
    this.updateControlsValidity(this.controlsNames, false);
    //this.invalidAddressFilter = false; ???
    this.addressFilterComponent.onChangeMode('view', addressParams);
  }

  updateControlsValidity(controlsToUpdate: string[], conditions: boolean) {
 //   console.log('controlsToUpdate', controlsToUpdate, conditions);
    controlsToUpdate.forEach((control) => {
      if (control != 'userName') {
        conditions
          ? this.mainForm.controls[control].enable()
          : this.mainForm.controls[control].disable();
      }
    });
    this.invalidAddressFilter = !conditions;
    this.checkIsSaveDisabled();
  }

  editContact(value: string, type: string) {
    let result = '';
    //TODO: move this logic to a service
    switch (type) {
      case 'vKontakte':
        result = 'https://vk.com/' + value;
        break;
      case 'instagram':
        result = 'https://www.instagram.com/' + value;
        break;
      case 'facebook':
        result = 'https://www.facebook.com/' + value;
        break;
      /*       case 'phoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'telegramPhoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'whatsApp':
        result = value.trim().replace(/[^0-9+]/g, '');
        break; */
      default:
        result = value;
    }
  //  console.log('editContact', type, value, result);
    return result;
  }

  setInitialValues(
    controlsToSetValues: string[],
    mode: 'view' | 'edit' | 'create',
    firstInitialization = false
  ) {
    controlsToSetValues.forEach((controlName) => {
    //  console.log('control', controlName);
      if (!this.contactTypes.includes(controlName)) {
        if (mode == 'view' && this.data().object![controlName] === '') {
          this.mainForm.controls[controlName].setValue('\u00A0'); // Non-breaking space for empty values in view mode
         /*  console.log(
            'this.mainForm.controls[controlName].value',
            this.mainForm.controls[controlName].value
          ); */
        } else {
          this.mainForm.controls[controlName].setValue(
            this.data().object![controlName]
          );
        }
      }
    });

    if (this.data().object!['orderedContacts']) {
      const orderedContacts = this.data().object!['orderedContacts'];
      for (let contact of this.contactTypes) {
        const formArray = this.mainForm.get(contact) as FormArray;
        //console.log('formArray', formArray);
        //console.log('this.data().object![contact]', this.data().object);

        const values = orderedContacts[
          contact as keyof typeof orderedContacts
        ] as unknown as string[];
       // console.log('contact', contact, values);
       // console.log('formArray', formArray.at(0), values);

        if (values) {
          if (firstInitialization) {
            formArray
              .at(0)
              ?.setValue(
                mode == 'view'
                  ? this.editContact(values[0], contact)
                  : values[0]
              );
            for (let i = 1; i < values.length; i++) {
              formArray.push(
                new FormControl(
                  {
                    value:
                      mode == 'view'
                        ? this.editContact(values[i], contact)
                        : values[i],
                    disabled: true,
                  },
                  this.data().controls.find(
                    (control) => control.controlName == contact
                  )?.validators || []
                )
              );
            }
          } else {
            for (let i = 0; i < values.length; i++) {
              formArray
                .at(i)
                ?.setValue(
                  mode == 'view'
                    ? this.editContact(values[i], contact)
                    : values[i]
                );
            }
          }
        } else if (mode == 'view') {
         // console.log('Non-breaking space for empty values');
          formArray.at(0)?.setValue('\u00A0'); // Non-breaking space for empty values
        } else {
          formArray.at(0)?.setValue('');
        }
      }
    }
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
