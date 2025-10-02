import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { ToponymFormControlsValues } from '../../interfaces/toponym';
import { BaseDetailsComponent } from '../../shared/dialogs/details-dialogs/base-details/base-details.component';
import { Toponym } from '../../interfaces/toponym';
import { DefaultAddressParams } from '../../interfaces/address-filter';

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
    ToastModule,
    AddressFilterComponent,
    //DetailsDialogComponent
  ],
  providers: [],
  templateUrl: './toponym-details.component.html',
  styleUrl: './toponym-details.component.css',
})
export class ToponymDetailsComponent extends BaseDetailsComponent<Toponym> {
  override ngOnInit(): void {
    super.ngOnInit();
    console.log('this.data()', this.data());
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

  protected override additionalValidationHooks() {
    const getByPath = function (obj: Record<string, any>, key: string): number {
      return obj[key];
    };
    /* function <T extends object>(
      obj: T,
      path: string
    ): number {
      return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
    }; */
    //checking if selectable part of address was changed
    if (
      this.data().addressFilterControls &&
      this.data().addressFilterControls!.length > 0
    )
      for (let item of this.data().addressFilterControls!) {
        const filterValues = this.addressFilter()[item.addressFilterProp];
        //  const objectValue = this.object![item.toponymProp];
        const objectValue = getByPath(
          this.data().defaultAddressParams!,
          item.toponymProp
        );

        // this.data().defaultAddressParams![item.toponymProp];

        //const objectValue = getByPath(this.object!, item.toponymProp);

        console.log('filterValues, objectValue', filterValues, objectValue);
        if (!filterValues.length) {
          return true;
        } else if (filterValues[0] != objectValue) {
          return true;
        }
      }
    return false;
  }

  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    const name = this.mainForm.controls[this.data().checkingName].value!.trim();
    const type = this.data().toponymType!;
    this.addressService
      .checkToponymName(
        type,
        name,
        this.data().object ? this.data().object!['id'] : null,
        this.addressFilter()
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
          } else {
            this.saveToponym(action);
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CreateToponymDialog',
            stage: 'checkToponymName',
            name: name,
            type: type,
          }),
      });
  }

  saveToponym(action: 'justSave' | 'saveAndExit') {
    const name = this.mainForm.controls[this.data().checkingName].value!.trim();
    const type = this.data().toponymType!;
    this.addressService
      .saveToponym(
        type,
        this.data().object ? this.data().object!['id'] : null,
        this.mainForm.value as ToponymFormControlsValues,
        this.addressFilter(),
        this.data().operation!
      )
      .subscribe({
        next: (res) => {
          if (action == 'saveAndExit') {
            this.closeDialogDataSignal.set(res.data.name);
            this.emittedCloseDialogData.emit(res.data.name);
          } else {
            this.data().object = res.data;
            this.data().defaultAddressParams = res.data.defaultAddressParams;
            console.log('this.data().object', this.data().object);
            this.changeToViewMode(this.data().defaultAddressParams!);
            this.setInitialValues('view');
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ToponymDetailsDialog',
            stage: 'saveToponym',
            name: name,
            type: type,
          }),
      });
  }
}
