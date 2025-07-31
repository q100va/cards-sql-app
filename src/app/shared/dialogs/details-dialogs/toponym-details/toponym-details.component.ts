import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

import { AddressFilterComponent } from '../../../address-filter/address-filter.component';
import { ToponymFormControlsNames } from '../../../../interfaces/toponymFormControlsNames';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { Toponym } from '../../../../interfaces/toponym';
import { AddressFilter } from '../../../../interfaces/address-filter';

@Component({
  selector: 'app-toponym-details',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatGridListModule,
    MatInputModule,
    MatCheckboxModule,
    MatTabsModule,
    MatIconModule,
    MatMenuModule,
    ConfirmDialogModule,
    Toast,
    AddressFilterComponent,
    //DetailsDialogComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './toponym-details.component.html',
  styleUrl: './toponym-details.component.css',
})
export class ToponymDetailsComponent extends BaseDetailsComponent<Toponym> {
  override ngOnInit(): void {
    super.ngOnInit();
    //console.log('this.data().controls', this.data().controls);
  }


  override checkIsSaveDisabled() {
    let condition: boolean = false;
    if (this.data().componentType == 'toponym') {
      condition =
        !this.mainForm.valid ||
        this.invalidAddressFilter ||
        (!this.changesSignal() && this.data().operation == 'view-edit');
    }
    this.IsSaveDisabledSignal.set(condition);
    this.emittedIsSaveDisabled.emit(condition);
  }

  protected  override additionalValidationHooks() {
    //checking if selectable part of address was changed
    for (let item of this.data().addressFilterControls!) {
      /*
      console.log('item', item);
      console.log(
        'this.addressFilter()[item.addressFilterProp as keyof AddressFilter]',
        this.addressFilter()[item.addressFilterProp as keyof AddressFilter]
      );
      console.log(
        'this.data().object![item.toponymProp]',
        this.data().object![item.toponymProp]
      ); */

      if (
        !this.addressFilter()[item.addressFilterProp as keyof AddressFilter]
      ) {
        return true;
      } else if (
        this.addressFilter()[
          item.addressFilterProp as keyof AddressFilter
        ]![0] != this.object![item.toponymProp as keyof typeof this.object]
      ) {
        return true;
      }
    }
     return false;
  }

  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.addressService
      .checkToponymName(
        this.data().toponymType!,
        this.mainForm.controls[this.data().checkingName].value!,
        this.data().object ? (this.data().object!['id'] as number) : null,
        this.addressFilter()
        //this.data().operation
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
        this.data().toponymType!,
        this.data().object ? (this.data().object!['id'] as number) : null,
        this.mainForm.value as ToponymFormControlsNames,
        this.addressFilter(),
        this.data().operation!
      )
      .subscribe({
        next: (res) => {
          if (action == 'saveAndExit') {
            //this.dialogRef.close({ name: res.data });
            this.closeDialogDataSignal.set(res.data.name);
            this.emittedCloseDialogData.emit(res.data.name);
          } else {
            //console.log('this.data().object', this.data().object);
            this.data().object = res.data;
            //console.log('this.data().object', this.data().object);
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
}
