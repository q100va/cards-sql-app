import { Component, DestroyRef, inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { TranslateModule } from '@ngx-translate/core';

import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { Toponym, ToponymFormControlsValues } from '../../interfaces/toponym';
import { BaseDetailsComponent } from '../../shared/dialogs/details-dialogs/base-details/base-details.component';




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
    AddressFilterComponent,
    TranslateModule,
  ],
  templateUrl: './toponym-details.component.html',
  styleUrl: './toponym-details.component.css',
})
export class ToponymDetailsComponent extends BaseDetailsComponent<Toponym> {
  private readonly destroyRef = inject(DestroyRef);

  override ngOnInit(): void {
    super.ngOnInit();

  }

  // evaluate save button disabled state
  override checkIsSaveDisabled() {
    console.log('checkIsSaveDisabled ', this.addressFilter());
    const disabled =
      !this.mainForm.valid ||
      this.invalidAddressFilter ||
      (!this.changesSignal() && this.data().operation == 'view-edit');

    this.IsSaveDisabledSignal.set(disabled);
    this.emittedIsSaveDisabled.emit(disabled);
  }

  // bridge spinner to parent
  emitShowSpinner(value: boolean) {
    this.showSpinner.set(value);
    this.emittedShowSpinner.emit(value);
  }

  // extra "dirty" rules for this card (address filter diff vs defaults)
  protected override additionalValidationHooks() {
    const getByPath = (obj: Record<string, any>, key: string): number => obj[key];

    if (this.data().addressFilterControls?.length) {
      for (const item of this.data().addressFilterControls!) {
        const filterValues = this.addressFilter()[item.addressFilterProp];
        const objectValue = getByPath(this.data().defaultAddressParams!, item.toponymProp);

        if (!filterValues.length) return true;
        if (filterValues[0] !== objectValue) return true;
      }
    }
    return false;
  }

  // pre-save: check uniqueness, then save
  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    const name = this.mainForm.controls[this.data().checkingName!].value!.trim();
    const type = this.data().toponymType!;

    this.emitShowSpinner(true);
     console.log('HttpParams ', this.addressFilter());

    this.addressService
      .checkToponymName(
        type,
        name,
        this.data().object ? this.data().object!['id'] : null,
        this.addressFilter()
      )
      .pipe(
        tap(res => {
          // if not duplicate → proceed to save
          if (!res.data) {
            this.saveToponym(action);
          } else {
            // duplicate: stop spinner; message is shown by msgWrapper in interceptor/elsewhere
            this.emitShowSpinner(false);
          }
        }),
        catchError(err => {
          this.emitShowSpinner(false);
          this.msgWrapper.handle(err, {
            source: 'CreateToponymDialog',
            stage: 'checkToponymName',
            name,
            type,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private saveToponym(action: 'justSave' | 'saveAndExit') {
    const name = this.mainForm.controls[this.data().checkingName!].value!.trim();
    const type = this.data().toponymType!;

    this.addressService
      .saveToponym(
        type,
        this.data().object ? this.data().object!['id'] : null,
        this.mainForm.value as ToponymFormControlsValues,
        this.addressFilter(),
        this.data().operation!
      )
      .pipe(
        tap(res => {
          if (action === 'saveAndExit') {
            this.closeDialogDataSignal.set(res.data.name);
            this.emittedCloseDialogData.emit(res.data.name);
          } else {
            // update local object and switch to view
            this.data().object = res.data;
            this.data().defaultAddressParams = res.data.defaultAddressParams;
            this.changeToViewMode(this.data().defaultAddressParams!);
            this.setInitialValues('view');
          }
        }),
        catchError(err => {
          this.msgWrapper.handle(err, {
            source: 'ToponymDetailsDialog',
            stage: 'saveToponym',
            name,
            type,
          });
          return of(null);
        }),
        finalize(() => this.emitShowSpinner(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
