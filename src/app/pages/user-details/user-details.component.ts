// src/app/pages/user-details/user-details.component.ts
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advanced-details/advanced-details.component';

import { User } from '../../interfaces/user';
import { ContactUrlPipe } from 'src/app/utils/contact-url.pipe';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Contact,
  OutdatedAddress,
  OutdatedFullName,
} from '@shared/schemas/common.schema';
import { OutdatedUserName } from '@shared/dist/user.schema';
import {
  ContactType,
  UserRestoringData,
  UserOutdatedData,
  UserDeletingData,
} from '../../interfaces/advanced-model';
@Component({
  selector: 'app-user-details',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatGridListModule,
    MatInputModule,
    MatTabsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    AddressFilterComponent,
    OutdatedItemMenuComponent,
    TranslateModule,
    ContactUrlPipe,
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl: './user-details.component.css',
})
export class UserDetailsComponent extends AdvancedDetailsComponent<
  User,
  UserRestoringData,
  UserDeletingData,
  UserOutdatedData
> {
  override ngOnInit(): void {
    this.existingOwner = this.data().object;
    if (this.existingOwner) {
      this.outdatedDataDraft = structuredClone(this.existingOwner.outdatedData);
    }
    this.restoringDataDraft = {
      addresses: null,
      names: null,
      userNames: null,
      contacts: null,
      // homes: null,
    };
    this.deletingDataDraft = {
      addresses: null,
      names: null,
      userNames: null,
      contacts: null,
      //homes: null,
    };
    this.outdatedDataDraft = {
      contacts: {},
      addresses: [],
      names: [],
      userNames: [],
      // homes: [],
    };
    super.ngOnInit();
  }

  onChangePasswordClick() {
    this.dialog
      .open(ChangePasswordDialogComponent, {
        disableClose: true,
        minWidth: '400px',
        height: 'auto',
        autoFocus: 'dialog',
        restoreFocus: true,
        data: { userId: this.existingOwner!.id },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {});
  }

  override onRestoreOutdatedData(
    type: keyof UserRestoringData,
    data: Contact | OutdatedAddress | OutdatedFullName | OutdatedUserName,
    contactType?: Exclude<ContactType, 'telegram'>
  ) {
    if (
      type === 'userNames' &&
      'userNames' in this.existingOwner!.outdatedData &&
      'userName' in data
    ) {
      if ((this.restoringDataDraft[type] ?? []).length > 0) {
        const restoredValue = this.existingOwner!.outdatedData[type].find(
          (item: OutdatedUserName) =>
            item.id === this.restoringDataDraft[type]![0]
        );
        if (restoredValue)
          (this.outdatedDataDraft[type] as any[]).push(restoredValue);
        this.restoringDataDraft[type] = [];
      }
      this.restoringDataDraft[type] = [data.id];
      if ('userName' in data)
        this.mainForm.controls['userName'].setValue(data.userName);
    }
    super.onRestoreOutdatedData(type, data, contactType);
  }
}
