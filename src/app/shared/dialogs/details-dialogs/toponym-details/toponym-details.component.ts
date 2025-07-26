import {
  Component,
} from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
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
export class ToponymDetailsComponent extends BaseDetailsComponent{

  override ngOnInit(): void {
    super.ngOnInit();
    //console.log('this.data().controls', this.data().controls);
  }

  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.addressService
      .checkToponymName(
        this.data().toponymType!,
        this.mainForm.controls[this.data().checkingName].value!,
        this.data().object ? (this.data().object!['id'] as number) : null,
        this.addressFilter(),
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
            this.closeDialog.emit(res.data.name);
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
