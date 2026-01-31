// src/app/pages/user-details/user-details.component.ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advanced-details/advanced-details.component';
import { AutocompleteRowComponent } from '../../shared/dialogs/autocomplete-row/autocomplete-row.component';

import { OutdatedFullName,OutdatedUserName} from '../../interfaces/advanced-model';
import { ContactUrlPipe } from '../../utils/contact-url.pipe';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/* import {
  ContactType,
  UserRestoringData,
  UserOutdatedData,
  UserDeletingData,
  UserDraft,
  UserChangingData,
  UserOutdatingData,
} from '../../interfaces/advanced-model'; */
import { UserMainService, UserService } from '../../services/user.service';
import { of } from 'rxjs';
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
    MatAutocompleteModule,
    AutocompleteRowComponent,
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.css',
})
export class UserDetailsComponent extends AdvancedDetailsComponent<'user'> {
  override userService = inject(UserService) as UserMainService;
  override ngOnInit(): void {
    super.ngOnInit();
    this.mainProps = [
      'firstName',
      'patronymic',
      'lastName',
      'userName',
      'roleId',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
    this.hasOutdatedUserNames.set(this.outdatedDataDraft.userNames.length > 0);
  }

  override setEmptyOutdatedDataDraft() {
    this.outdatedDataDraft = {
      addresses: [],
      names: [],
      userNames: [],
      contacts: {},
    };
  }
  override setRestoringDataDraft() {
    this.restoringDataDraft = {
      addresses: null,
      names: null,
      userNames: null,
      contacts: null,
    };
  }
  override setDeletingDataDraft() {
    this.deletingDataDraft = {
      addresses: null,
      names: null,
      userNames: null,
      contacts: null,
    };
  }
  override setChangingData() {
    this.changingData = {
      main: null,
      contacts: null,
      address: null,
    };
  }
  override setOutdatingData() {
    this.outdatingData = {
      address: null,
      names: null,
      userName: null,
      contacts: null,
    };
  }
  override onChangePasswordClick() {
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

  override checkUserName() {
    const userDraft = this.ownerDraft;
    this.userService
      .checkUserName(userDraft.userName ?? '', this.ownerDraft.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (!res.data) this.checkDuplicates();
          else this.emitShowSpinner(false);
        },
        error: (err) => {
          this.emitShowSpinner(false);
          this.msgWrapper.handle(err, {
            source: 'CreateUserDialog',
            stage: 'checkUserName',
            kind: 'user',
            object: this.ownerDraft,
          });
          return of(null);
        },
      });
  }

  override onRestoreOutdatedUserName(data: OutdatedUserName) {
    if ((this.restoringDataDraft['userNames'] ?? []).length > 0) {
      const restoredValue = this.existingOwner!.outdatedData['userNames'].find(
        (item: OutdatedUserName) =>
          item.id === this.restoringDataDraft['userNames']![0]
      );
      if (restoredValue)
        this.outdatedDataDraft['userNames'].push(restoredValue);
      this.restoringDataDraft['userNames'] = [];
    }
    this.restoringDataDraft['userNames'] = [data.id];
    this.mainForm.controls['userName'].setValue(data.userName);
  }

  // --- Compare draft vs restoring/outdated
  //проверяем не изменил ли пользователь восстановленные данные
  //если изменил,
  // то помещаем их в outdatingDataDraft и удаляем из restoringDataDraft

/*   override async correctRestoringData() {
    super.correctRestoringData();
    // Addresses
    if (this.restoringDataDraft.addresses?.length) {
      const addresses = await this.ownerService.corrAddress(
        this.restoringDataDraft.addresses,
        this.outdatedDataDraft.addresses,
        this.ownerDraft.draftAddress,
        this.existingOwner!.outdatedData.addresses
      );
      this.restoringDataDraft.addresses = structuredClone(addresses.restoring);
      this.outdatedDataDraft.addresses = structuredClone(addresses.outdating);
    }

    // UserNames
    const { restoring, outdating } = this.ownerDiffService.corrUserNames(
      this.restoringDataDraft.userNames ?? [],
      this.outdatedDataDraft.userNames ?? [],
      this.ownerDraft.userName,
      this.existingOwner!.outdatedData.userNames ?? []
    );

    this.restoringDataDraft.userNames = structuredClone(restoring);
    this.outdatedDataDraft.userNames = structuredClone(outdating);
  } */

  //если введенные данные совпадают с outdatingDataDraft данными,
  //то добавляем их с согласия пользователя в restoringDataDraft
/*   override async checkOutdatedDataDuplicates() {
    const address = await this.ownerService.checkAddress(
      this.outdatedDataDraft.addresses,
      this.ownerDraft.draftAddress
    );
    if (!address.restoringId) return false;
    if (address.restoringId > -1) {
      this.restoringDataDraft.addresses ??= [];
      this.restoringDataDraft.addresses.push(address.restoringId);
    }
    const userName = await this.ownerDiffService.checkUserNames(
      this.outdatedDataDraft.userNames,
      this.ownerDraft.userName
    );
    if (!userName.restoringId) return false;
    if (userName.restoringId > -1) {
      this.restoringDataDraft.userNames ??= [];
      this.restoringDataDraft.userNames.push(userName.restoringId);
    }

    return await super.checkOutdatedDataDuplicates();
  }
 */
/*   override async checkAllChanges() {
    const address = await this.ownerService.diffAddress(
      this.existingOwner!,
      this.ownerDraft,
      this.restoringDataDraft.addresses == null
        ? null
        : this.restoringDataDraft.addresses![0]
    );
    if (address.changes) this.changingData.address = address.changes;
    if (address.outdatingId) this.outdatingData.address = address.outdatingId;
    if (address.deletingId) {
      this.deletingDataDraft.addresses ??= [];
      this.deletingDataDraft.addresses.push(address.deletingId);
    }

    const userName = await this.ownerDiffService.diffUserName(
      this.existingOwner!,
      this.ownerDraft
    );
    if (userName.changes)
      this.changingData.main = {
        ...(this.changingData.main ?? {}),
        ...{ userName: userName.changes },
      };
    if (userName.outdating) this.outdatingData.userName = userName.outdating;

    const names = await this.ownerService.diffNames(
      this.existingOwner!,
      this.ownerDraft
    );
    if (names.changes) this.changingData.main = names.changes;
    if (names.outdating) this.outdatingData.names = names.outdating;

    return await super.checkAllChanges();
  } */

  /*   override hasOutdatedUserNames(): boolean {
    return this.outdatedDataDraft.userNames.length > 0;
  } */

  override getRowSpanForUserNames(): number {
    return this.outdatedDataDraft.userNames.length;
  }

  override get outdatedNames(): OutdatedFullName[] {
    const data = this.outdatedDataDraft;
    const list = data?.names;
    return Array.isArray(list) ? list : [];
  }

  override get outdatedUserNames(): OutdatedUserName[] {
    const data = this.outdatedDataDraft;
    const list = data?.userNames;
    return Array.isArray(list) ? list : [];
  }

  override hasRole(): boolean {
    return true;
  }
  override setHasOutdatedUserNames() {
    this.hasOutdatedUserNames.set(this.outdatedDataDraft.userNames.length > 0);
  }
  override setHasOutdatedNames() {
    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
  }
}
