// src/app/pages/user-details/user-details.component.ts
import { Component, inject, DestroyRef } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { UserDiffService } from '../../services/user-diff.service';

import {
  buildDuplicateInfoMessage,
} from '../../utils/user-diff';

import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advances-details/advanced-details.component';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog';

import {
  ChangingData,
  Contact,
  Contacts,
  ContactType,
  DeletingData,
  DeletingOutdatedDataType,
  OutdatedData,
  OutdatingData,
  RestoringData,
  RestoringDataType,
  User,
  OutdatedContacts,
  UserDraft,
  OutdatedAddress,
  OutdatedFullName,
  OutdatedUserName,
} from '../../interfaces/user';
import { typedKeys } from '../../interfaces/toponym';

import {
  causeOfRestrictionControlSchema,
  emailControlSchema,
  facebookControlSchema,
  instagramControlSchema,
  phoneNumberControlSchema,
  telegramIdControlSchema,
  telegramNicknameControlSchema,
  vKontakteControlSchema,
} from '@shared/schemas/user.schema';
import { zodValidator } from '../../utils/zod-validator';
import { sanitizeText } from '../../utils/sanitize-text';
import { ContactUrlPipe } from 'src/app/utils/contact-url.pipe';
import { debounceTime, finalize, of } from 'rxjs';
import { DefaultAddressParams } from '@shared/dist/toponym.schema';

import * as Validator from '../../utils/custom.validator';

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
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.css',
})
export class UserDetailsComponent extends AdvancedDetailsComponent<User> {
  // DI
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UserService);
  private readonly userDiffService = inject(UserDiffService);
  readonly dialog = inject(MatDialog);

  // View helpers
  sanitizeText = sanitizeText;

  // Data
  get existingUser(): User | null {
    return this.data().object;
  }
  roles!: { id: number; name: string }[];
  action!: 'justSave' | 'saveAndExit';

  possibleContactTypes: {
    name: Exclude<ContactType, 'telegram' | 'otherContact'>;
    availableForExtra: boolean;
  }[] = [
    { name: 'email', availableForExtra: false },
    { name: 'phoneNumber', availableForExtra: false },
    { name: 'telegramId', availableForExtra: false },
    { name: 'telegramPhoneNumber', availableForExtra: false },
    { name: 'telegramNickname', availableForExtra: false },
    { name: 'whatsApp', availableForExtra: false },
    { name: 'vKontakte', availableForExtra: false },
    { name: 'instagram', availableForExtra: false },
    { name: 'facebook', availableForExtra: false },
  ];
  availableContactTypes: Exclude<ContactType, 'telegram' | 'otherContact'>[] =
    [];

  restoringDataDraft: RestoringData = {
    addresses: null,
    names: null,
    userNames: null,
    contacts: null,
  };
  deletingDataDraft: DeletingData = {
    addresses: null,
    names: null,
    userNames: null,
    contacts: null,
  };
  outdatedDataDraft: OutdatedData = {
    contacts: {},
    addresses: [],
    names: [],
    userNames: [],
  };

  userDraft!: UserDraft;

  override ngOnInit(): void {
    super.ngOnInit();

    this.mainForm.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onChangeValidation());

    if (this.existingUser) {
      this.outdatedDataDraft = structuredClone(
        this.existingUser.outdatedData
      ) as OutdatedData;
    }

    this.mainForm.setValidators([Validator.mainContactsValidator]);

    // Load roles (with auto-unsubscribe)
    this.roleService
      .getRolesNamesList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => (this.roles = res.data),
        error: (err) => this.msgWrapper.handle(err),
      });

    const formArray = this.getFormArray('instagram');
  }

  // bridge spinner to parent
  emitShowSpinner(value: boolean) {
    this.showSpinner.set(value);
    this.emittedShowSpinner.emit(value);
  }

  // --- UI bits
  countOutdatedContactsAmount(contacts: OutdatedContacts): number {
    return Object.values(contacts).reduce(
      (sum, arr) => sum + (arr?.length ?? 0),
      0
    );
  }

  onRestrictedToggleClick() {
    if (this.mainForm.controls['isRestricted'].value) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl(null, [zodValidator(causeOfRestrictionControlSchema)])
      );
      this.controlsNames.push('causeOfRestriction');
    } else if (
      (this.isEditModeSignal() && !this.existingUser!['isRestricted']) ||
      this.data().operation === 'create'
    ) {
      this.mainForm.removeControl('causeOfRestriction');
      const idx = this.controlsNames.findIndex(
        (n) => n === 'causeOfRestriction'
      );
      if (idx !== -1) this.controlsNames.splice(idx, 1);
    }
    this.onChangeValidation();
  }

  modifyContactTypesList() {
    for (const contact of this.possibleContactTypes) {
      if (
        this.mainForm.controls[contact.name].value.findIndex(
          (v: string | null) => v == null
        ) === -1
      ) {
        contact.availableForExtra = true;
      }
    }
    this.availableContactTypes = this.possibleContactTypes
      .filter((x) => x.availableForExtra)
      .map((x) => x.name);
  }

  onTypeClick(index: number, defaultValue: string | null): void;
  onTypeClick(
    contactType: Exclude<ContactType, 'telegram' | 'otherContact'>,
    defaultValue: string | null
  ): void;
  onTypeClick(
    arg: number | Exclude<ContactType, 'telegram' | 'otherContact'>,
    defaultValue: string | null
  ): void {
    const type =
      typeof arg === 'number' ? this.availableContactTypes[arg] : arg;

    const validators: Record<
      Exclude<ContactType, 'telegram' | 'otherContact'>,
      any[]
    > = {
      email: [zodValidator(emailControlSchema)],
      phoneNumber: [zodValidator(phoneNumberControlSchema)],
      telegramId: [zodValidator(telegramIdControlSchema)],
      telegramPhoneNumber: [zodValidator(phoneNumberControlSchema)],
      telegramNickname: [zodValidator(telegramNicknameControlSchema)],
      whatsApp: [zodValidator(phoneNumberControlSchema)],
      vKontakte: [zodValidator(vKontakteControlSchema)],
      instagram: [zodValidator(instagramControlSchema)],
      facebook: [zodValidator(facebookControlSchema)],
    };

    this.getFormArray(type).push(
      new FormControl(defaultValue, validators[type] || [])
    );
  }

  deleteContactControl(index: number, controlName: string) {
    const formArray = this.getFormArray(controlName);
    if (formArray.length > 1) formArray.removeAt(index);
    this.onChangeValidation();
  }

  onChangePasswordClick() {
    this.dialog
      .open(ChangePasswordDialogComponent, {
        disableClose: true,
        minWidth: '400px',
        height: 'auto',
        autoFocus: 'dialog',
        restoreFocus: true,
        data: { userId: this.existingUser!.id },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {});
  }

  // --- Outdated data actions
  onRestoreOutdatedData(
    type: RestoringDataType,
    data: Contact | OutdatedAddress | OutdatedFullName | OutdatedUserName,
    contactType?: Exclude<ContactType, 'telegram'>
  ) {
    //восстанавливаемое значение присваиваем соответветствующему form.control,
    //если он пустой, или добавляем новый form.control с этим значением
    if (type === 'contacts' && 'content' in data) {
      this.restoringDataDraft.contacts ??= {};
      this.restoringDataDraft.contacts[contactType!] ??= [];
      this.restoringDataDraft.contacts[contactType!]!.push(data);

      if (contactType !== 'otherContact') {
        const fa = this.mainForm.get(contactType!) as FormArray;
        if (fa.length === 1 && fa.at(0).value == null) {
          fa.at(0)?.setValue(data.content);
        } else {
          this.onTypeClick(contactType!, data.content);
        }
      } else {
        this.mainForm.controls['otherContact'].setValue(data.content);
      }
    } else if (
      type === 'userNames' ||
      type === 'names' ||
      type === 'addresses'
    ) {
      //для этих типов восстановить можно только одно значение,
      //поэтому проверяем, были ли уже восстановленные значения,
      //если были, то удаляем их их restoringDataDraft и помещаем в outdatingDataDraft
      if ((this.restoringDataDraft[type] ?? []).length > 0) {
        //  if (this.existingUser!.outdatedData[type]) {
        const restoredValue = this.existingUser!.outdatedData[type]!.find(
          (item) => item.id === this.restoringDataDraft[type]![0]
        );
        if (restoredValue)
          (this.outdatedDataDraft[type] as any[]).push(restoredValue);
        this.restoringDataDraft[type] = [];
      }
      //  }
      this.restoringDataDraft[type] = [data.id];

      switch (type) {
        case 'userNames':
          if ('userName' in data)
            this.mainForm.controls['userName'].setValue(data.userName);
          break;
        case 'names':
          if ('firstName' in data) {
            this.mainForm.patchValue({
              firstName: data.firstName,
              patronymic: data.patronymic,
              lastName: data.lastName,
            });
          }
          break;
        case 'addresses':
          if ('country' in data) {
            this.addressFilterComponent.onChangeMode('edit', {
              localityId: data.locality?.id ?? null,
              districtId: data.district?.id ?? null,
              regionId: data.region?.id ?? null,
              countryId: data.country.id,
            });
          }
          break;
      }
    }
    //восстанавливаемые значения удаляем из outdatingDataDraft
    this.deleteFromOutdatedDataDraft(type, data.id);
    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }

  onDeleteOutdatedData(type: DeletingOutdatedDataType, id: number) {
    this.deletingDataDraft[type] ??= [];
    this.deletingDataDraft[type]!.push(id);
    this.deleteFromOutdatedDataDraft(type, id);
    this.deletingSignal.set(true);
    this.checkIsSaveDisabled();
  }

  deleteFromOutdatedDataDraft(type: DeletingOutdatedDataType, id: number) {
    if (type === 'contacts') {
      for (const key of typedKeys(this.outdatedDataDraft.contacts)) {
        const idx = this.outdatedDataDraft.contacts[key]!.findIndex(
          (c) => c.id === id
        );
        if (idx !== -1) {
          this.outdatedDataDraft.contacts[key]!.splice(idx, 1);
          break;
        }
      }
    } else {
      const idx = this.outdatedDataDraft[type].findIndex((c) => c.id === id);
      if (idx !== -1) this.outdatedDataDraft[type].splice(idx, 1);
    }
  }

  // --- Save flows
  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.emitShowSpinner(true);
    this.action = action;
    this.userDraft = this.userDiffService.buildDraft(
      this.mainForm,
      this.addressFilter(),
      this.contactTypes,
      this.existingUser
    );

    this.userService
      .checkUserName(this.userDraft.userName, this.userDraft.id)
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
            name: this.userDraft.userName,
          });
          return of(null);
        },
      });
  }

  checkDuplicates() {
    const contactDuplicates = {} as Record<
      Exclude<ContactType, 'telegram'>,
      string[]
    >;

    for (const key of typedKeys(this.userDraft.draftContacts)) {
      const temp = this.userDraft.draftContacts[key].sort();
      const dups = new Set<string>();
      for (let i = 0; i < temp.length - 1; i++)
        if (temp[i + 1] === temp[i]) dups.add(temp[i]);
      if (dups.size) contactDuplicates[key] = Array.from(dups);
    }

    if (Object.keys(contactDuplicates).length) {
      let list = '';
      for (const key of typedKeys(contactDuplicates)) {
        list += ` ${key} - ${contactDuplicates[key].join(' ')}`;
      }
      this.msgWrapper.warn('TOAST.DELETE_DUPLICATES', undefined, {
        duplicates: list,
      });
      this.emitShowSpinner(false);
    } else {
      this.checkUserData();
    }
  }

  checkUserData() {
    this.userService
      .checkUserData(this.userDraft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (res) => {
          const { duplicatesName = [], duplicatesContact = [] } =
            res.data ?? {};
          const hasNameDup = duplicatesName.length > 0;
          const hasContactDup = duplicatesContact.length > 0;

          if (hasNameDup || hasContactDup) {
            const info = buildDuplicateInfoMessage(
              (k, p) => this.translateService.instant(k, p),
              duplicatesName,
              duplicatesContact
            );
            this.confirmationService.confirm({
              header: this.translateService.instant(
                'PRIME_CONFIRM.WARNING_HEADER'
              ),
              message:
                this.translateService.instant(
                  'PRIME_CONFIRM.SAVE_WITH_DUPLICATES'
                ) + info,
              closable: true,
              closeOnEscape: true,
              icon: 'pi pi-exclamation-triangle',
              rejectButtonProps: {
                label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
              },
              acceptButtonProps: {
                label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
                severity: 'secondary',
                outlined: true,
              },
              accept: async () => {
                await this.savingFlow();
              },
              reject: () => this.emitShowSpinner(false),
            });
          } else {
            await this.savingFlow();
          }
        },
        error: (err) => {
          this.emitShowSpinner(false);
          this.msgWrapper.handle(err, {
            source: 'CreateUserDialog',
            stage: 'checkUserName',
            name: this.userDraft.userName,
          });
          return of(null);
        },
      });
  }

  async savingFlow() {
    if (this.data().operation === 'create') {
      this.saveUser();
    }
    await this.correctRestoringData();
    if (await this.checkOutdatedDataDuplicates()) {
      const updatingUserData = await this.checkAllChanges();
      this.saveUpdatedUser(updatingUserData);
    } else {
      this.emitShowSpinner(false);
    }
  }

  // --- Compare draft vs restoring/outdated
  //проверяем не изменил ли пользователь восстановленные данные
  //если изменил,
  // то помещаем их в outdatingDataDraft и удаляем из restoringDataDraft
  async correctRestoringData() {
    // Addresses
    if (this.restoringDataDraft.addresses?.length) {
      const addresses = await this.userDiffService.corrAddress(
        this.restoringDataDraft.addresses,
        this.outdatedDataDraft.addresses,
        this.userDraft.draftAddress,
        this.existingUser!.outdatedData.addresses
      );
      this.restoringDataDraft.addresses = structuredClone(addresses.restoring);
      this.outdatedDataDraft.addresses = structuredClone(addresses.outdating);
    }

    // Names
    if (this.restoringDataDraft.names?.length) {
      const names = await this.userDiffService.corrNames(
        this.restoringDataDraft.names,
        this.outdatedDataDraft.names,
        {
          firstName: this.userDraft.firstName,
          patronymic: this.userDraft.patronymic,
          lastName: this.userDraft.lastName,
        },
        this.existingUser!.outdatedData.names
      );
      this.restoringDataDraft.names = structuredClone(names.restoring);
      this.outdatedDataDraft.names = structuredClone(names.outdating);
    }

    // UserNames
    if (this.restoringDataDraft.userNames?.length) {
      const userNames = await this.userDiffService.corrUserNames(
        this.restoringDataDraft.userNames,
        this.outdatedDataDraft.userNames,
        this.userDraft.userName,
        this.existingUser!.outdatedData.userNames
      );
      this.restoringDataDraft.userNames = structuredClone(userNames.restoring);
      this.outdatedDataDraft.userNames = structuredClone(userNames.outdating);
    }

    // Contacts
    if (this.restoringDataDraft.contacts) {
      const contacts = await this.userDiffService.corrContacts(
        this.restoringDataDraft.contacts,
        this.outdatedDataDraft.contacts,
        this.userDraft.draftContacts
      );
      this.restoringDataDraft.contacts = structuredClone(contacts.restoring);
      this.outdatedDataDraft.contacts = structuredClone(contacts.outdating);
    }
  }

  //если введенные данные совпадают с outdatingDataDraft данными,
  //то добавляем их с согласия пользователя в restoringDataDraft
  async checkOutdatedDataDuplicates() {
    const address = await this.userDiffService.checkAddress(
      this.outdatedDataDraft.addresses,
      this.userDraft.draftAddress
    );
    if (!address.restoringId) return false;
    if (address.restoringId > 0) {
      this.restoringDataDraft.addresses ??= [];
      this.restoringDataDraft.addresses.push(address.restoringId);
    }

    const names = await this.userDiffService.checkNames(
      this.outdatedDataDraft.names,
      this.userDraft
    );
    if (!names.restoringId) return false;
    if (names.restoringId > 0) {
      this.restoringDataDraft.names ??= [];
      this.restoringDataDraft.names.push(names.restoringId);
    }

    const userName = await this.userDiffService.checkUserNames(
      this.outdatedDataDraft.userNames,
      this.userDraft.userName
    );
    if (!userName.restoringId) return false;
    if (userName.restoringId > 0) {
      this.restoringDataDraft.userNames ??= [];
      this.restoringDataDraft.userNames.push(userName.restoringId);
    }

    const contacts = await this.userDiffService.checkContacts(
      this.contactTypes,
      this.outdatedDataDraft.contacts,
      this.userDraft.draftContacts
    );
    if (!contacts.restoring) return false;
    if (Object.keys(contacts.restoring).length) {
      this.restoringDataDraft.contacts ??= {};
      for (const key of typedKeys(contacts.restoring)) {
        const vals = contacts.restoring[key] ?? [];
        (this.restoringDataDraft.contacts[key] ??= []).push(...vals);
      }
    }

    return true;
  }

  //формируем окончательные варианты измененных, восстановленных, удаляемых и неактуальных значений
  async checkAllChanges() {
    const changes: ChangingData = { main: null, contacts: null, address: null };
    const outdatingData: OutdatingData = {
      address: null,
      names: null,
      userName: null,
      contacts: null,
    };
    const deletingData: DeletingData = structuredClone(this.deletingDataDraft);
    const restoringData: RestoringData = structuredClone(
      this.restoringDataDraft
    );

    const names = await this.userDiffService.diffNames(
      this.existingUser!,
      this.userDraft
    );
    if (names.changes) changes.main = names.changes;
    if (names.outdating) outdatingData.names = names.outdating;

    const userName = await this.userDiffService.diffUserName(
      this.existingUser!,
      this.userDraft
    );
    if (userName.changes)
      changes.main = {
        ...(changes.main ?? {}),
        ...{ userName: userName.changes },
      };
    if (userName.outdating) outdatingData.userName = userName.outdating;

    const address = await this.userDiffService.diffAddress(
      this.existingUser!,
      this.userDraft,
      (restoringData.addresses ?? []).length > 0
        ? restoringData.addresses![0]
        : null
    );
    if (address.changes) changes.address = address.changes;
    if (address.outdatingId) outdatingData.address = address.outdatingId;
    if (address.deletingId)
      (deletingData.addresses ?? []).push(address.deletingId);

    const contacts = await this.userDiffService.diffContacts(
      this.existingUser!,
      this.userDraft,
      this.contactTypes,
      restoringData.contacts
    );
    if (contacts.changes) changes.contacts = contacts.changes;
    if (contacts.outdatingIds) outdatingData.contacts = contacts.outdatingIds;
    if (contacts.deletingIds)
      (deletingData.contacts ?? []).push(...contacts.deletingIds);

    type MainKeys = keyof NonNullable<ChangingData['main']>;
    const mainProps: MainKeys[] = [
      'roleId',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    for (const prop of mainProps) {
      const key = prop as keyof User & keyof UserDraft;
      if (this.existingUser![key] != this.userDraft[key]) {
        changes.main = {
          ...(changes.main || {}),
          [key]: this.userDraft[key],
        } as NonNullable<ChangingData['main']>;
      }
    }
    console.log('{ changes, restoringData, outdatingData, deletingData }', {
      changes,
      restoringData,
      outdatingData,
      deletingData,
    });
    return { changes, restoringData, outdatingData, deletingData };
  }

  saveUser() {
    this.userService
      .saveUser(this.userDraft)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.emitShowSpinner(false))
      )
      .subscribe({
        next: (res) => {
          if (this.action === 'saveAndExit') {
            this.closeDialogDataSignal.set(res.data);
            this.emittedCloseDialogData.emit(res.data);
          } else {
            // keep dialog open, could re-load user data if needed
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CreateUserDialog',
            stage: 'saveUser',
            name: this.userDraft.userName,
          }),
      });
  }
  // View-mode: set outdated data
  protected override changeToViewMode(
    addressParams: DefaultAddressParams | null
  ) {
    super.changeToViewMode(addressParams);
    this.outdatedDataDraft = structuredClone(
      this.existingUser!.outdatedData
    ) as OutdatedData;
  }

  saveUpdatedUser(upgradedUserData: {
    changes: ChangingData;
    restoringData: RestoringData;
    outdatingData: OutdatingData;
    deletingData: DeletingData;
  }) {
    this.userService
      .saveUpdatedUser(this.existingUser!.id, upgradedUserData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.emitShowSpinner(false))
      )
      .subscribe({
        next: (res) => {
          if (this.action === 'saveAndExit') {
            this.closeDialogDataSignal.set(res.data.userName);
            this.emittedCloseDialogData.emit(res.data.userName);
            return;
          }

          // inline update to view state
          if (
            !this.mainForm.controls['isRestricted'].value &&
            this.mainForm.get('causeOfRestriction')
          ) {
            this.mainForm.removeControl('causeOfRestriction');
            const idx = this.controlsNames.findIndex(
              (n) => n === 'causeOfRestriction'
            );
            if (idx !== -1) this.controlsNames.splice(idx, 1);
          }

          this.data().object = res.data;
          this.data().defaultAddressParams = {
            localityId: res.data.address.locality
              ? res.data.address.locality.id
              : null,
            districtId: res.data.address.district
              ? res.data.address.district.id
              : null,
            regionId: res.data.address.region
              ? res.data.address.region.id
              : null,
            countryId: res.data.address.country
              ? res.data.address.country.id
              : null,
          };

          this.outdatedDataDraft = structuredClone(
            this.existingUser!.outdatedData
          ) as OutdatedData;

          this.addressFilterComponent.onChangeMode(
            'view',
            this.data().defaultAddressParams!
          );
          this.restoringDataDraft = {
            addresses: null,
            names: null,
            userNames: null,
            contacts: null,
          };
          this.deletingDataDraft = {
            addresses: null,
            names: null,
            userNames: null,
            contacts: null,
          };

          this.changeToViewMode(null);
          this.setInitialValues('view');
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'EditUserDialog',
            stage: 'saveUpdatedUser',
            userId: this.existingUser!.id,
          }),
      });
  }

  // badges (for template)
  hasOutdatedUserNames(): boolean {
    return this.outdatedDataDraft.userNames.length > 0;
  }
  hasOutdatedNames(): boolean {
    return this.outdatedDataDraft.names.length > 0;
  }
  hasOutdatedContacts(): boolean {
    return Object.keys(this.outdatedDataDraft.contacts).length > 0;
  }
  hasOutdatedAddresses(): boolean {
    return this.outdatedDataDraft.addresses.length > 0;
  }
}
