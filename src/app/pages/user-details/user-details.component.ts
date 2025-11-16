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
  UserDraft,
  UserChangingData,
  UserOutdatingData,
} from '../../interfaces/advanced-model';
import { UserDetailsService, UserService } from 'src/app/services/user.service';
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
  ],
  templateUrl:
    '../../shared/dialogs/details-dialogs/advanced-details/owner-details.component.html',
  styleUrl: './user-details.component.css',
})
export class UserDetailsComponent extends AdvancedDetailsComponent<'user'> {

  override userService = inject(UserService) as UserDetailsService;
  override ngOnInit(): void {
    this.existingOwner = this.data().object;
    console.log('this.existingOwner', this.existingOwner);
    if (this.existingOwner) {
      this.outdatedDataDraft = structuredClone(this.existingOwner.outdatedData);
      console.log(this.outdatedDataDraft);
    }

    /* else {
      this.outdatedDataDraft = {
        contacts: {},
        addresses: [],
        names: [],
        userNames: [],
      };
    } */
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
    /*     this.outdatedDataDraft = {
      contacts: {},
      addresses: [],
      names: [],
      userNames: [],
      // homes: [],
    }; */
    this.changingData = {
      main: null,
      contacts: null,
      address: null,
    };
    this.outdatingData = {
      address: null,
      names: null,
      userName: null,
      contacts: null,
    };

    this.mainProps = [
      'roleId',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    this.hasOutdatedUserNames.set(this.outdatedDataDraft.userNames.length > 0);

    super.ngOnInit();
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
    if ('userName' in data)
      this.mainForm.controls['userName'].setValue(data.userName);
  }

  // --- Compare draft vs restoring/outdated
  //проверяем не изменил ли пользователь восстановленные данные
  //если изменил,
  // то помещаем их в outdatingDataDraft и удаляем из restoringDataDraft

  override async correctRestoringData() {
    super.correctRestoringData();

    // UserNames
    const { restoring, outdating } = this.userDiffService.corrUserNames(
      this.restoringDataDraft.userNames ?? [],
      this.outdatedDataDraft.userNames ?? [],
      this.ownerDraft.userName,
      this.existingOwner!.outdatedData.userNames ?? []
    );

    this.restoringDataDraft.userNames = structuredClone(restoring);
    this.outdatedDataDraft.userNames = structuredClone(outdating);
  }

  //если введенные данные совпадают с outdatingDataDraft данными,
  //то добавляем их с согласия пользователя в restoringDataDraft
  override async checkOutdatedDataDuplicates() {
    const userName = await this.userDiffService.checkUserNames(
      this.outdatedDataDraft.userNames,
      this.ownerDraft.userName
    );
    if (!userName.restoringId) return false;
    if (userName.restoringId > 0) {
      this.restoringDataDraft.userNames ??= [];
      this.restoringDataDraft.userNames.push(userName.restoringId);
    }

    return await super.checkOutdatedDataDuplicates();
  }

  override async checkAllChanges() {
    const userName = await this.userDiffService.diffUserName(
      this.existingOwner! as User,
      this.ownerDraft as UserDraft
    );
    if (userName.changes)
      this.changingData.main = {
        ...(this.changingData.main ?? {}),
        ...{ userName: userName.changes },
      };
    if (userName.outdating) this.outdatingData.userName = userName.outdating;
    return await super.checkAllChanges();
  }

  /*   override hasOutdatedUserNames(): boolean {
    return this.outdatedDataDraft.userNames.length > 0;
  } */

  override getRowSpanForUserNames(): number {
    return this.outdatedDataDraft.userNames.length;
  }

  override get outdatedUserNames(): OutdatedUserName[] {
    const data: any = this.outdatedDataDraft;
    const list = data?.userNames;
    return Array.isArray(list) ? list : [];
  }

  override hasRole(): boolean {
    return true;
  }
  override setHasOutdatedUserNames() {
     this.hasOutdatedUserNames.set(this.outdatedDataDraft.userNames.length > 0);
  }
}
