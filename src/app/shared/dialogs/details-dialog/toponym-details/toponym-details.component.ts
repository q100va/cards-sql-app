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
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
  selector: 'app-toponym-details',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatGridListModule,
    MatInputModule,
    MatCheckboxModule,
    ConfirmDialogModule,
    Toast,
    AddressFilterComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './toponym-details.component.html',
  styleUrl: './toponym-details.component.css',
})
export class ToponymDetailsComponent {
  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private addressService = inject(AddressService);

  data = input.required<DialogData>();
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

  ngOnInit() {
    this.params = {
      source: 'toponymCard',
      multiple: false,
      cols: '1',
      gutterSize: '16px',
      rowHeight: '76px',
      type: this.data().type,
      isShowCountry:
        this.data().specialField != 'isShowCountry'
          ? this.data().isShowCountry
          : false,
      isShowRegion:
        this.data().specialField != 'isShowRegion'
          ? this.data().isShowRegion
          : false,
      isShowDistrict:
        this.data().specialField != 'isShowDistrict'
          ? this.data().isShowDistrict
          : false,
      isShowLocality:
        this.data().specialField != 'isShowLocality'
          ? this.data().isShowLocality
          : false,
      readonly: this.data().operation == 'create' ? false : true,
      class: this.data().operation == 'create' ? 'none' : 'view-mode',
    };

    this.createFormGroup(this.data().controls);
    this.controlsNames = this.data().controls.map(
      (control) => control.controlName
    );
    if (this.data().toponym) {
      this.setInitialValues(this.controlsNames);
    } else if (this.data().type == 'country') {
  /*     this.invalidAddressFilter = false;
      this.mainForm.controls['name'].enable(); */
      this.updateControlsValidity( this.controlsNames, true);
    }
  }

  checkIsSaveDisabled() {
    console.log(
      "!this.mainForm.valid ||      this.invalidAddressFilter ||      (!this.changes && this.data().operation == 'view-edit')"
    );
    console.log(
      !this.mainForm.valid,
      this.invalidAddressFilter,
      !this.changes,
      this.data().operation == 'view-edit'
    );
    if (
      !this.mainForm.valid ||
      this.invalidAddressFilter || // && this.data().type != 'country'
      (!this.changes && this.data().operation == 'view-edit')
    ) {
      this.emittedIsSaveDisabled.emit(true);
    } else {
      this.emittedIsSaveDisabled.emit(false);
    }
  }

  createFormGroup(controls: Control[]) {
    controls.forEach((control) => {
      this.mainForm.addControl(
        control.controlName,
        new FormControl(
          { value: control.value, disabled: control.disabled },
          control.validators || []
        )
      );
    });
  }

  onChangeAddressFilter(event: AddressFilter) {
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

  onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.addressService
      .checkToponymName(
        this.data().type,
        this.mainForm.controls[this.data().checkingName].value!,
        this.data().toponym ? (this.data().toponym!['id'] as number) : null,
        this.addressFilter(),
        this.data().operation
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Ошибка',
              detail: `Топоним с названием '${this.mainForm.controls[
                this.data().checkingName
              ]
                .value!}' уже существует в этом кластере! Если это не ошибка, обратитесь к администратору.`,
              sticky: true,
            });
          } else {
            this.saveToponym(action);
          }
        },
        error: (err) => this.errorHandling(err),
      });
  }

  saveToponym(action: 'justSave' | 'saveAndExit') {
    this.addressService
      .saveToponym(
        this.data().type,
        this.data().toponym ? (this.data().toponym!['id'] as number) : null,
        this.mainForm.value as ToponymFormControlsNames,
        this.addressFilter(),
        this.data().operation
      )
      .subscribe({
        next: (res) => {
          if (action == 'saveAndExit') {
            //this.dialogRef.close({ name: res.data });
            this.closeDialog.emit(res.data.name);
          } else {

            console.log('this.data().toponym', this.data().toponym);
            this.data().toponym = res.data;
            console.log('this.data().toponym', this.data().toponym);
            this.changeToViewMode(null);
            this.messageService.add({
              severity: 'success',
              summary: 'Подтверждение',
              detail: `Топоним '${res.data.name}' успешно обновлен!`,
            });
          }
        },
        error: (err) => this.errorHandling(err),
      });
  }

  onEditClick() {
    this.isEditMode = true;
    this.emittedIsEditMode.emit(this.isEditMode);
    this.changes = false;
    this.emittedChanges.emit(this.changes);
    //this.checkIsSaveDisabled();
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
          this.setInitialValues(this.controlsNames);
          this.changeToViewMode(this.data().defaultAddressParams);
        },
        reject: () => {},
      });
    } else {
      this.changeToViewMode(null);
    }
  }

  onChangeValidation() {
    if (this.data().operation == 'view-edit') {
      this.changes = false;
      this.emittedChanges.emit(this.changes);
      this.checkIsSaveDisabled();
      for (let controlName of this.controlsNames) {
        if (
          this.mainForm.controls[controlName].value !=
          this.data().toponym![controlName]
        ) {
          this.changes = true;
          this.emittedChanges.emit(this.changes);
          this.checkIsSaveDisabled();
          break;
        }
      }
      if (!this.changes && this.data().addressFilterControls) {
        for (let item of this.data().addressFilterControls!) {
          if (
            this.addressFilter()[
              item.addressFilterProp as keyof AddressFilter
            ]![0] != this.data().toponym![item.toponymProp]
          ) {
            this.changes = true;
            this.emittedChanges.emit(this.changes);
            this.checkIsSaveDisabled();
            break;
          }
        }
      }
    } else {
      this.checkIsSaveDisabled();
    }
  }

  changeToViewMode(addressParams: any) {
    this.isEditMode = false;
    this.emittedIsEditMode.emit(this.isEditMode);
    this.updateControlsValidity(this.controlsNames, false);
    //this.invalidAddressFilter = false; ???
    this.addressFilterComponent.onChangeMode('view', addressParams);
  }

  updateControlsValidity(controlsToUpdate: string[], conditions: boolean) {
    console.log('controlsToUpdate', controlsToUpdate, conditions);
    controlsToUpdate.forEach((control) =>
      conditions
        ? this.mainForm.controls[control].enable()
        : this.mainForm.controls[control].disable()
    );
    this.invalidAddressFilter = !conditions;
    this.checkIsSaveDisabled();
  }

  setInitialValues(controlsToSetValues: string[]) {
    controlsToSetValues.forEach((control) =>
      this.mainForm.controls[control].setValue(this.data().toponym![control])
    );
  }

  private errorHandling(err: any) {
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
