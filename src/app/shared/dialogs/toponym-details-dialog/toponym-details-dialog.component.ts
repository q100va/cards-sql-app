import { Component, ViewChild, inject, output, signal } from '@angular/core';
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
    toponym?: {
      [key: string]: string | number | boolean;
    };
  }>(MAT_DIALOG_DATA);
  private messageService = inject(MessageService);
  private addressService = inject(AddressService);
  private confirmationService = inject(ConfirmationService);
  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  title =
    this.data.operation == 'create' ? 'Новый насел. пункт' : 'Населенный пункт';

  //TODO: different placeholders for different toponyms
  toponymNamePlaceholder = 'Синицыно поселок';
  toponymShortNamePlaceholder = 'п. Синицыно';
  toponymPostNamePlaceholder = 'Дарницкий район';
  toponymShortPostNamePlaceholder = 'Дарницкий р-н';

  isEditMode = false;
  onChangeMode = output<string>();
  changes = false;

  params: {
    source: 'toponymCard' | 'toponymList' | 'userCard' | 'userList';
    multiple: boolean;
    cols: string;
    gutterSize: string;
    rowHeight: string;
    type?: string | undefined;
    isShowRegion: boolean;
    isShowDistrict: boolean;
    isShowLocality: boolean;
    readonly?: boolean | undefined;
    class: string;
  } = {
    source: 'toponymCard',
    multiple: false,
    cols: '1',
    gutterSize: '16px',
    rowHeight: '76px',
    type: this.data.type,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: false,
    readonly: this.data.operation == 'create' ? false : true,
    class: this.data.operation == 'create' ? 'none' : 'view-mode',
  };

  mainForm = new FormGroup<Record<string, AbstractControl>>({
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

  ngOnInit() {
    if (this.data.toponym) {
      this.mainForm.controls['toponymName'].setValue(this.data.toponym['name']);
      this.mainForm.controls['toponymShortName'].setValue(
        this.data.toponym['shortName']
      );
      this.mainForm.controls['federalCity'].setValue(
        this.data.toponym['isFederalCity']
      );
      this.mainForm.controls['capitalOfRegion'].setValue(
        this.data.toponym['isCapitalOfRegion']
      );
      this.mainForm.controls['capitalOfDistrict'].setValue(
        this.data.toponym['isCapitalOfDistrict']
      );
    }
  }

  onChangeAddressFilter(event: {
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }) {
    if (this.data.operation == 'create' || this.isEditMode) {
      this.addressFilter.set(event);
      if (
        this.data.type == 'locality' &&
        this.addressFilter().districts &&
        this.addressFilter().districts!.length > 0
      ) {
        this.mainForm.controls['toponymName'].enable();
        this.mainForm.controls['toponymShortName'].enable();
        //this.mainForm.controls['toponymPostName'].enable();
        //this.mainForm.controls['toponymShortPostName'].enable();
        this.mainForm.controls['federalCity'].enable();
        this.mainForm.controls['capitalOfRegion'].enable();
        this.mainForm.controls['capitalOfDistrict'].enable();
        this.invalidAddressFilter = false;
      }
      if (
        this.data.type == 'locality' &&
        (!this.addressFilter().districts ||
          (this.addressFilter().districts &&
            this.addressFilter().districts!.length == 0))
      ) {
        this.mainForm.controls['toponymName'].disable();
        this.mainForm.controls['toponymShortName'].disable();
        this.mainForm.controls['federalCity'].disable();
        this.mainForm.controls['capitalOfRegion'].disable();
        this.mainForm.controls['capitalOfDistrict'].disable();
        this.invalidAddressFilter = true;
      }
      this.onChangeValidation();
    }
  }

  onSaveToponymClick(action: 'justSave' | 'saveAndExit') {
    this.addressService
      .checkToponymName(
        this.data.type,
        this.mainForm.controls['toponymName'].value!,
        this.data.toponym ? (this.data.toponym['id'] as number) : null,
        this.addressFilter(),
        this.data.operation
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Ошибка',
              detail: `Топоним с названием '${this.mainForm.controls[
                'toponymName'
              ]
                .value!}' уже существует в этом кластере! Если это не ошибка, обратитесь к администратору.`,
              sticky: true,
            });
          } else {
            this.saveToponym(action);
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

  saveToponym(action: 'justSave' | 'saveAndExit') {
    this.addressService
      .saveToponym(
        this.data.type,
        this.mainForm.controls['toponymName'].value!,
        this.data.toponym ? (this.data.toponym['id'] as number) : null,
        this.mainForm.controls['toponymShortName'].value!,
        this.mainForm.controls['federalCity'].value!,
        this.mainForm.controls['capitalOfRegion'].value!,
        this.mainForm.controls['capitalOfDistrict'].value!,
        this.addressFilter(),
        this.data.operation
      )
      .subscribe({
        next: (res) => {
          if (action == 'saveAndExit') {
            this.dialogRef.close({ toponymName: res.data });
          } else {
            this.changeToViewMode(null);
            this.messageService.add({
              severity: 'success',
              summary: 'Подтверждение',
              detail: `Топоним '${res.data}' успешно обновлен!`,
            });
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

  onEditClick() {
    this.isEditMode = true;
    this.changes = false;
    this.mainForm.controls['toponymName'].enable();
    this.mainForm.controls['toponymShortName'].enable();
    //this.mainForm.controls['toponymPostName'].enable();
    //this.mainForm.controls['toponymShortPostName'].enable();
    this.mainForm.controls['federalCity'].enable();
    this.mainForm.controls['capitalOfRegion'].enable();
    this.mainForm.controls['capitalOfDistrict'].enable();
    this.invalidAddressFilter = false;
    this.addressFilterComponent.onChangeMode('edit', null);
  }

  onViewClick() {
    console.log('this.addressFilter()', this.addressFilter());
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
          this.mainForm.controls['toponymName'].setValue(
            this.data.toponym!['name']
          );
          this.mainForm.controls['toponymShortName'].setValue(
            this.data.toponym!['shortName']
          );
          //this.mainForm.controls['toponymPostName'].setValue(this.data.toponym!['postName']);
          //this.mainForm.controls['toponymShortPostName'].setValue(this.data.toponym!['postShortName']);
          this.mainForm.controls['federalCity'].setValue(
            this.data.toponym!['isFederalCity']
          );
          this.mainForm.controls['capitalOfRegion'].setValue(
            this.data.toponym!['isCapitalOfRegion']
          );
          this.mainForm.controls['capitalOfDistrict'].setValue(
            this.data.toponym!['isCapitalOfDistrict']
          );
          this.changeToViewMode(this.data.defaultAddressParams);
        },
        reject: () => {},
      });
    } else {
      this.changeToViewMode(null);
    }
  }

  onChangeValidation() {
    if (this.data.operation == 'view-edit') {
      if (
        //this.invalidAddressFilter ||
        //!this.mainForm.controls['toponymName'].value ||
        //!this.mainForm.controls['toponymShortName'].value ||
        //!this.mainForm.controls['toponymPostName'].value ||
        //!this.mainForm.controls['toponymShortPostName'].value ||
        this.addressFilter().countries![0] !=
          this.data.toponym!['district.region.country.id'] ||
        this.addressFilter().regions![0] !=
          this.data.toponym!['district.region.id'] ||
        this.addressFilter().districts![0] !=
          this.data.toponym!['district.id'] ||
        this.mainForm.controls['toponymName'].value !=
          this.data.toponym!['name'] ||
        this.mainForm.controls['toponymShortName'].value !=
          this.data.toponym!['shortName'] ||
        //this.mainForm.controls['toponymPostName'].value != this.data.toponym!['postName'] ||
        //this.mainForm.controls['toponymShortPostName'].value != this.data.toponym!['postShortName'] ||
        this.mainForm.controls['federalCity'].value !=
          this.data.toponym!['isFederalCity'] ||
        this.mainForm.controls['capitalOfRegion'].value !=
          this.data.toponym!['isCapitalOfRegion'] ||
        this.mainForm.controls['capitalOfDistrict'].value !=
          this.data.toponym!['isCapitalOfDistrict']
      ) {
        this.changes = true;
      } else {
        this.changes = false;
      }
    }
  }

  changeToViewMode(addressParams: any) {
    this.isEditMode = false;
    this.mainForm.controls['toponymName'].disable();
    this.mainForm.controls['toponymShortName'].disable();
    //this.mainForm.controls['toponymPostName'].disable();
    //this.mainForm.controls['toponymShortPostName'].disable();
    this.mainForm.controls['federalCity'].disable();
    this.mainForm.controls['capitalOfRegion'].disable();
    this.mainForm.controls['capitalOfDistrict'].disable();
    this.invalidAddressFilter = false;
    this.addressFilterComponent.onChangeMode('view', addressParams);
  }

  onCancelClick(event: Event) {
    if (
      (this.data.operation == 'view-edit' && !this.isEditMode) ||
      (this.isEditMode && !this.changes)
    ) {
      this.dialogRef.close({ success: false });
    } else {
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
}
