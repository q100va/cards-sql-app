import { Component, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  FormControl,
  FormsModule,
  Validators,
  ReactiveFormsModule,
  FormGroup,
  AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AddressService } from '../../../services/address.service';
import { AddressFilterComponent } from '../../address-filter/address-filter.component';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-toponym-details-dialog',
  imports: [
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ConfirmDialogModule,
    Toast,
    ReactiveFormsModule,
    AddressFilterComponent,
    MatGridListModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './toponym-details-dialog.component.html',
  styleUrl: './toponym-details-dialog.component.css',
})
export class ToponymDetailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ToponymDetailsDialogComponent>);
  readonly data = inject<{
    type: string;
    operation: 'create' | 'view-edit';
    defaultAddressParams: {
      localityId: number | null;
      districtId: number | null;
      regionId: number | null;
      countryId: number | null;
    };
  }>(MAT_DIALOG_DATA);
  private messageService = inject(MessageService);
  private addressService = inject(AddressService);
  private confirmationService = inject(ConfirmationService);

  title =
    this.data.operation == 'create'
      ? 'Новый населенный пункт'
      : 'Населенный пункт';

  //TODO: different placeholders for different toponyms
  toponymNamePlaceholder = 'Синицыно поселок';
  toponymShortNamePlaceholder = 'п. Синицыно';
  toponymPostNamePlaceholder = 'Дарницкий район';
  toponymShortPostNamePlaceholder = 'Дарницкий р-н';

  isEditMode = false;

  params = {
    multiple: false,
    cols: '1',
    gutterSize: '16px',
    rowHeight: '76px',
    type: this.data.type,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: false,
    readonly: this.data.operation == 'create' ? false : true,
  };

  mainData = new FormGroup<Record<string, AbstractControl>>({
    toponymName: new FormControl<string>({ value: '', disabled: true }, [
      Validators.required,
    ]),
    toponymShortName: new FormControl<string>({ value: '', disabled: true }, [
      Validators.required,
    ]),
    federalCity: new FormControl<boolean>({ value: false, disabled: true }),
    capitalOfRegion: new FormControl<boolean>({ value: false, disabled: true }),
    capitalOfDistrict: new FormControl<boolean>({
      value: false,
      disabled: true,
    }),
  });

  addressFilter = signal<{
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });
  invalidAddressFilter = true;

/*   defaultAddressParams: {
    localityId: number | null;
    districtId: number | null;
    regionId: number | null;
    countryId: number | null;
  } = {
    localityId: null,
    districtId: null,
    regionId: null,
    countryId: null,
  }; */

  onChangeAddressFilter(event: {
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }) {
    this.addressFilter.set(event);
    if (
      this.data.type == 'locality' &&
      this.addressFilter().districts &&
      this.addressFilter().districts!.length > 0
    ) {
      this.mainData.controls['toponymName'].enable();
      this.mainData.controls['toponymShortName'].enable();
      //this.mainData.controls['toponymPostName'].enable();
      //this.mainData.controls['toponymShortPostName'].enable();
      this.mainData.controls['federalCity'].enable();
      this.mainData.controls['capitalOfRegion'].enable();
      this.mainData.controls['capitalOfDistrict'].enable();
      this.invalidAddressFilter = false;
    }
    if (
      this.data.type == 'locality' &&
      (!this.addressFilter().districts ||
        (this.addressFilter().districts &&
          this.addressFilter().districts!.length == 0))
    ) {
      this.mainData.controls['toponymName'].disable();
      this.mainData.controls['toponymShortName'].disable();
      this.mainData.controls['federalCity'].disable();
      this.mainData.controls['capitalOfRegion'].disable();
      this.mainData.controls['capitalOfDistrict'].disable();
      this.invalidAddressFilter = true;
    }
  }

  onSaveToponymClick() {
    this.addressService
      .checkToponymName(
        this.data.type,
        this.mainData.controls['toponymName'].value!,
        this.addressFilter()
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Ошибка',
              detail: `Топоним с названием '${this.mainData.controls[
                'toponymName'
              ]
                .value!}' уже существует! Если это не ошибка, обратитесь к администратору.`,
              sticky: true,
            });
          } else {
            this.createToponym();
          }
        },
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
  }

  createToponym() {
    this.addressService
      .createToponym(
        this.data.type,
        this.mainData.controls['toponymName'].value!,
        this.mainData.controls['toponymShortName'].value!,
        this.mainData.controls['federalCity'].value!,
        this.mainData.controls['capitalOfRegion'].value!,
        this.mainData.controls['capitalOfDistrict'].value!,
        this.addressFilter()
      )
      .subscribe({
        next: (res) => {
          this.dialogRef.close({ toponymName: res.data });
        },
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
  }

  onEditClick() {}

  onViewClick() {}

  onCancelClick(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
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
        this.dialogRef.close({ success: false });
      },
      reject: () => {},
    });
  }
}
