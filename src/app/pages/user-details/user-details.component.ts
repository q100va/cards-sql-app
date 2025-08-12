import {
  Component,
  ElementRef,
  inject,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AddressFilterComponent } from '../../shared/address-filter/address-filter.component';
import { OutdatedItemMenuComponent } from '../../shared/dialogs/details-dialogs/details-dialog/outdated-item-menu/outdated-item-menu.component';
import { RoleService } from '../../services/role.service';
import {
  ChangedData,
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
} from '../../interfaces/user';
import { UserService } from '../../services/user.service';
import * as Validator from '../../utils/custom.validator';
import { UserDraft } from '../../interfaces/userDraft';
import { AdvancedDetailsComponent } from '../../shared/dialogs/details-dialogs/advances-details/advanced-details.component';
import { typedKeys } from '../../interfaces/types';
import { ChangePasswordDialogComponent } from '../../shared/dialogs/change-password-dialog/change-password-dialog';
import { MatDialog } from '@angular/material/dialog';

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
    ConfirmDialogModule,
    ToastModule,
    AddressFilterComponent,
    OutdatedItemMenuComponent,
  ],
  providers: [],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.css',
})
export class UserDetailsComponent extends AdvancedDetailsComponent<User> {
  get existedUser(): User | null {
    return this.data().object;
  }
  newOutdatedData = {} as OutdatedData;

  private roleService = inject(RoleService);
  private userService = inject(UserService);
  readonly dialog = inject(MatDialog);

  roles!: { id: number; name: string }[];
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
//TODO: добавить валидацию для имени пользователя. Убрать из компонентов месседжи и конфирмейшн
  override ngOnInit(): void {
    super.ngOnInit();
    if (this.existedUser) {
      this.newOutdatedData = structuredClone(
        this.existedUser.outdatedData
      ) as OutdatedData;
    }
    this.mainForm.setValidators([Validator.mainContactsValidator]);
    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        this.roles = res.data;
      },
      error: (err) => this.msgWrapper.handle(err),
    });
  }

  countOutdatedContactsAmount(contacts: Contacts): number {
    return Object.values(contacts).reduce(
      (sum, arr) => sum + (arr?.length ?? 0),
      0
    );
  }

  onRestrictedToggleClick() {
    //TODO: change controls???

    if (this.mainForm.controls['isRestricted'].value) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl(null, Validators.required)
      );
      this.controlsNames.push('causeOfRestriction');
    } else if (
      (this.isEditModeSignal() && !this.existedUser!['isRestricted']) ||
      this.data().operation == 'create'
    ) {
      //TODO: remove control after save
      this.mainForm.removeControl('causeOfRestriction');
      const index = this.controlsNames.findIndex(
        (item) => item == 'causeOfRestriction'
      );
      this.controlsNames.splice(index);
    }
    this.onChangeValidation();
  }

  modifyContactTypesList() {
    for (let contact of this.possibleContactTypes) {
      //console.log(this.mainForm.controls[contact.name].value);
      if (
        this.mainForm.controls[contact.name].value.findIndex(
          (item: string | null) => item == null
        ) == -1
      ) {
        contact.availableForExtra = true;
      }
    }
    this.availableContactTypes = this.possibleContactTypes
      .filter((item) => item.availableForExtra == true)
      .map((item) => item.name);
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

    const validators = {
      email: [Validator.emailFormatValidator()],
      phoneNumber: [Validator.phoneNumberFormatValidator()],
      telegramId: [Validator.telegramIdFormatValidator()],
      telegramPhoneNumber: [Validator.phoneNumberFormatValidator()],
      telegramNickname: [Validator.telegramNicknameFormatValidator()],
      whatsApp: [Validator.phoneNumberFormatValidator()],
      vKontakte: [Validator.vKontakteFormatValidator()],
      instagram: [Validator.instagramFormatValidator()],
      facebook: [Validator.facebookFormatValidator()],
    };

    this.getFormArray(type).push(
      new FormControl(defaultValue, validators[type] || [])
    );
  }

  deleteContactControl(index: number, controlName: string) {
    const formArray = this.getFormArray(controlName);
    if (formArray.length > 1) {
      formArray.removeAt(index);
    }
    this.onChangeValidation();
  }

  onChangePasswordClick() {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      height: 'auto',
      autoFocus: 'dialog',
      restoreFocus: true,
      data: { userId: this.existedUser!.id },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.msgWrapper.success(`Пароль успешно изменен.`);
      }
    });
  }
  //TODO: maybe move to advanced

  onRestoreOutdatedData(
    type: RestoringDataType,
    data:
      | Contact
      | {
          country: { id: number; name: string };
          region: { id: number; shortName: string } | null;
          district: { id: number; shortName: string } | null;
          locality: { id: number; shortName: string } | null;
          id: number;
        }
      | {
          firstName: string | null;
          patronymic: string | null;
          lastName: string | null;
          id: number;
        }
      | {
          userName: string | null;
          id: number;
        },
    contactType?: Exclude<ContactType, 'telegram'>
  ) {
    if (type === 'contacts' && 'content' in data) {
      this.restoringDataDraft.contacts ??= {};
      this.restoringDataDraft.contacts[contactType!] ??= [];
      this.restoringDataDraft.contacts[contactType!]!.push(data);

      if (contactType != 'otherContact') {
        const formArray = this.mainForm.get(contactType!) as FormArray;
        if (formArray.length == 1 && formArray.at(0).value == null) {
          formArray.at(0)?.setValue(data.content);
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
      if (
        this.restoringDataDraft[type] &&
        this.restoringDataDraft[type].length > 0
      ) {
        if (this.existedUser!.outdatedData[type]) {
          const restoredValue = this.existedUser!.outdatedData[type].find(
            (item) => item.id === this.restoringDataDraft[type]![0]
          );
          if (restoredValue)
            (this.newOutdatedData[type] as any[]).push(restoredValue);
          this.restoringDataDraft[type] = [];
        }
      }
      this.restoringDataDraft[type] = [data.id];

      switch (type) {
        case 'userNames':
          if ('userName' in data) {
            this.mainForm.controls['userName'].setValue(data.userName);
          }
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
            console.log('data', data);
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

    this.deleteFromNewOutdatedData(type, data.id);
    console.log(`this.newOutdatedData[${type}]`, this.newOutdatedData[type]);
    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }

  //TODO: меняем только внешний вид, все изменения формируем только после нажатия сохранить - добавить сверку оутдейтед и его измененной копии!!!
  // TODO:надо сделать копию оутдейтед, чтобы отображать в неактуальных и повторно не спрашивать, если восстановление совершено вручную

  //TODO: пользователь может восстановить данные, потом изменить их, потом опять, как это все контролировать - меняем только внешний вид, все изменения формируем только после нажатия сохранить

  onDeleteOutdatedData(type: DeletingOutdatedDataType, id: number) {
    console.log(`this.newOutdatedData`, this.newOutdatedData);

    this.deletingDataDraft[type] ??= [];
    this.deletingDataDraft[type].push(id);
    this.deleteFromNewOutdatedData(type, id);

    console.log(`Deleting ${type} with id ${id}`);
    console.log(`this.newOutdatedData`, this.newOutdatedData);
  }

  deleteFromNewOutdatedData(type: DeletingOutdatedDataType, id: number) {
    console.log(`this.newOutdatedData1`, this.newOutdatedData);
    if (type == 'contacts') {
      //this.newOutdatedData[type];
      for (const key of typedKeys(this.newOutdatedData.contacts)) {
        const index = this.newOutdatedData.contacts[key].findIndex(
          (c) => c.id === id
        );
        if (index != -1) {
          this.newOutdatedData.contacts[key].splice(index, 1);
          break;
        }
      }
    } else {
      const index = this.newOutdatedData[type].findIndex((c) => c.id === id);
      if (index != -1) {
        console.log(`Deleting ${type} with id ${id}`);
        this.newOutdatedData[type].splice(index, 1);
      }
    }
    console.log(`this.newOutdatedData2`, this.newOutdatedData);
  }

  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    const userDraft: UserDraft = {
      userName: this.mainForm.controls['userName'].value!.trim(),
      id: this.object?.id ?? null,

      firstName: this.mainForm.controls['firstName'].value!.trim(),
      patronymic: this.mainForm.controls['patronymic'].value?.trim(),
      lastName: this.mainForm.controls['lastName'].value!.trim(),

      draftAddress: {
        countryId: this.addressFilter().countries?.[0] ?? null,
        regionId: this.addressFilter().regions?.[0] ?? null,
        districtId: this.addressFilter().districts?.[0] ?? null,
        localityId: this.addressFilter().localities?.[0] ?? null,
      },

      draftContacts: {} as Record<Exclude<ContactType, 'telegram'>, string[]>,

      password: this.mainForm.controls['password'].value,
      roleId: this.mainForm.controls['roleId'].value,
      comment: this.mainForm.controls['comment'].value,
      isRestricted: this.mainForm.controls['isRestricted'].value,
      causeOfRestriction: this.mainForm.controls['isRestricted'].value
        ? this.mainForm.controls['causeOfRestriction'].value
        : null,
      dateOfRestriction: this.mainForm.controls['isRestricted'].value
        ? this.existedUser?.isRestricted
          ? this.existedUser.dateOfRestriction ?? new Date()
          : new Date()
        : null,
    };
    for (const contact of this.contactTypes) {
      const raw = this.getFormArray(contact).getRawValue().filter(Boolean);
      userDraft.draftContacts[contact] = raw.map((item) =>
        this.completeContact(item, contact)
      );
    }

    this.userService.checkUserName(userDraft.userName, userDraft.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.msgWrapper.warn(`Username ${userDraft.userName} уже занято. Выберите другое.`);
        } else {
          this.checkDuplicates(action, userDraft);
        }
      },
      error: (err) => this.msgWrapper.handle(err),
    });
  }

  completeContact(value: string, type: string) {
    let result = '';
    switch (type) {
      /*       case 'vKontakte':
        result = 'https://vk.com/' + value.trim();
        break;
      case 'instagram':
        result = 'https://www.instagram.com/' + value.trim();
        break;
      case 'facebook':
        result = 'https://www.facebook.com/' + value.trim();
        break; */
      case 'phoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'telegramPhoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'whatsApp':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      default:
        result = value.trim();
    }
    return result;
  }

  checkDuplicates(action: 'justSave' | 'saveAndExit', user: UserDraft) {
    let contactDuplicates = {} as Record<
      Exclude<ContactType, 'telegram'>,
      string[]
    >;

    for (let key of typedKeys(user.draftContacts)) {
      let tempArray = user.draftContacts[key].sort();
      let duplicates = new Set();
      for (let i = 0; i < tempArray.length - 1; i++) {
        if (tempArray[i + 1] == tempArray[i]) {
          duplicates.add(tempArray[i]);
        }
      }

      if (duplicates.size > 0) {
        contactDuplicates[key] = Array.from(duplicates) as Exclude<
          ContactType,
          'telegram'
        >[];
      } else {
        //console.log('There are not duplicates!');
      }
    }

    if (Object.keys(contactDuplicates).length != 0) {
      let warnMessage = 'Вы указали одинаковые значения для: \n';
      for (let key of typedKeys(contactDuplicates)) {
        warnMessage = warnMessage + ` ${key} -`;
        for (let value of contactDuplicates[key]) {
          warnMessage = warnMessage + ` ${value}`;
        }
        warnMessage = warnMessage + '\n';
      }
      warnMessage = warnMessage + '\n Удалите, пожалуйста, дубли!';
      this.msgWrapper.warn(warnMessage);
    } else {
      this.checkUserData(action, user);
    }
  }

  checkUserData(action: 'justSave' | 'saveAndExit', user: UserDraft) {
    this.userService.checkUserData(user).subscribe({
      next: (res) => {
        if (
          res.data.duplicatesName.length > 0 ||
          res.data.duplicatesContact.length > 0
        ) {
          let infoMessage = '';

          if (res.data.duplicatesName.length == 1) {
            infoMessage =
              infoMessage +
              `Введенные имя и фамилия совпадают с данными пользователя ${res.data.duplicatesName[0]}.<br />`;
          }
          if (res.data.duplicatesName.length > 1) {
            infoMessage =
              infoMessage +
              `Введенные имя и фамилия совпадают с данными пользователей:<br />`;
            for (let user of res.data.duplicatesName) {
              infoMessage = infoMessage + ' - ' + user + '<br />';
            }
          }
          if (res.data.duplicatesContact.length > 0) {
            for (let contact of res.data.duplicatesContact) {
              if (contact.users.length == 1) {
                infoMessage =
                  infoMessage +
                  `Введенный ${contact.type} ${contact.content} совпадает с данными пользователя ${contact.users[0]}.<br />`;
              }
              if (contact.users.length > 1) {
                infoMessage =
                  infoMessage +
                  `Введенный ${contact.type} ${contact.content} совпадает с данными пользователей:<br />`;
                for (let user of contact.users) {
                  infoMessage = infoMessage + ' - ' + user + '<br />';
                }
              }
            }
          }
          this.confirmationService.confirm({
            message:
              infoMessage +
              'Вы уверены, что хотите сохранить введенные данные?',
            header: 'Обнаружены дубли',
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
              if (this.data().operation == 'view-edit') {
                this.checkNotActualDataDuplicates(action, user);
              } else {
                this.saveUser(action, user);
              }
            },
            reject: () => {},
          });
        } else {
          if (this.data().operation == 'view-edit') {
            this.compareRestoringData(action, user);
          } else {
            this.saveUser(action, user);
          }
        }
      },
      error: (err) => this.msgWrapper.handle(err),
    });
  }

  //TODO:  MAYBE move this logic to advanced-details.component.ts

  compareRestoringData(action: 'justSave' | 'saveAndExit', user: UserDraft) {
    // Compare addresses
    if (
      this.restoringDataDraft.addresses &&
      this.restoringDataDraft.addresses?.length > 0
    ) {
      const addressesToRemove: number[] = [];
      const currentAddress = user.draftAddress;

      // Compare each restored address with current user address
      for (const restoredAddressId of this.restoringDataDraft.addresses) {
        const restoredAddress = this.existedUser!.outdatedData.addresses.find(
          (addr) => addr.id === restoredAddressId
        );
        if (restoredAddress && currentAddress) {
          console.log('currentAddress', currentAddress);
          console.log('restoredAddress', restoredAddress);
          // Compare all address fields
          if (
            restoredAddress.country?.id != currentAddress.countryId ||
            restoredAddress.region?.id != currentAddress.regionId ||
            restoredAddress.district?.id != currentAddress.districtId ||
            restoredAddress.locality?.id != currentAddress.localityId
          ) {
            console.log('this.newOutdatedData.addresses.push');
            this.newOutdatedData.addresses.push(restoredAddress);
            addressesToRemove.push(restoredAddress.id);
            break;
          }
        }
      }

      if (addressesToRemove.length > 0) {
        this.restoringDataDraft.addresses =
          this.restoringDataDraft.addresses.filter(
            (id) => !addressesToRemove.includes(id)
          ) || null;
      }
    }

    // Compare names
    if (
      this.restoringDataDraft.names &&
      this.restoringDataDraft.names?.length > 0
    ) {
      const namesToRemove: number[] = [];
      for (const nameId of this.restoringDataDraft.names) {
        const outdatedName = this.existedUser!.outdatedData.names.find(
          (n) => n.id === nameId
        );
        if (
          outdatedName &&
          (outdatedName.firstName != user.firstName ||
            outdatedName.patronymic != user.patronymic ||
            outdatedName.lastName != user.lastName)
        ) {
          this.newOutdatedData.names.push(outdatedName);
          namesToRemove.push(nameId);
        }
      }
      if (namesToRemove.length > 0) {
        this.restoringDataDraft.names =
          this.restoringDataDraft.names.filter(
            (id) => !namesToRemove.includes(id)
          ) || null;
      }
    }

    // Compare userNames
    if (
      this.restoringDataDraft.userNames &&
      this.restoringDataDraft.userNames?.length > 0
    ) {
      const userNamesToRemove: number[] = [];
      for (const nameId of this.restoringDataDraft.userNames) {
        const outdatedUserName = this.existedUser!.outdatedData.userNames.find(
          (n) => n.id === nameId
        );
        if (outdatedUserName && outdatedUserName.userName != user.userName) {
          this.newOutdatedData.userNames.push(outdatedUserName);
          userNamesToRemove.push(nameId);
        }
      }
      if (userNamesToRemove.length > 0) {
        this.restoringDataDraft.names =
          this.restoringDataDraft.userNames.filter(
            (id) => !userNamesToRemove.includes(id)
          ) || null;
      }
    }

    // Compare contacts
    if (this.restoringDataDraft.contacts) {
      for (const [type, contacts] of Object.entries(
        this.restoringDataDraft.contacts
      )) {
        if (!contacts || contacts.length === 0) continue;
        const userContacts =
          user.draftContacts[type as keyof typeof user.draftContacts];
        if (!userContacts || userContacts.length === 0) {
          // If user has no contacts of this type, move all restored contacts to outdated
          this.newOutdatedData.contacts[type as keyof Contacts] = [
            ...(this.newOutdatedData.contacts[type as keyof Contacts] || []),
            ...contacts,
          ];
          delete this.restoringDataDraft.contacts[
            type as keyof typeof user.draftContacts
          ];
          continue;
        }
        const contactsToRemove: Contact[] = [];
        for (const contact of contacts) {
          if (!userContacts.includes(contact.content)) {
            this.newOutdatedData.contacts[type as keyof Contacts] = [
              ...(this.newOutdatedData.contacts[type as keyof Contacts] || []),
              contact,
            ];
            contactsToRemove.push(contact);
          }
        }
        if (contactsToRemove.length > 0) {
          this.restoringDataDraft.contacts[
            type as keyof typeof user.draftContacts
          ] = this.restoringDataDraft.contacts[
            type as keyof typeof user.draftContacts
          ]!.filter((c) => !contactsToRemove.find((rc) => rc.id === c.id));
        }
      }
    }
    this.checkNotActualDataDuplicates(action, user);
  }

  async checkNotActualDataDuplicates(
    action: 'justSave' | 'saveAndExit',
    user: UserDraft
  ) {
    let restoringData = this.restoringDataDraft;
    /*     let restoringData: RestoringData = {
      addresses: null,
      names: null,
      userNames: null,
      contacts: null,
    }; */
    // const outdatedAddresses = this.existedUser!['outdatedData'].addresses;

    console.log(
      'this.newOutdatedData.addresses',
      this.newOutdatedData.addresses
    );
    const outdatedAddresses = this.newOutdatedData.addresses;
    if (outdatedAddresses.length > 0 && user.draftAddress?.countryId) {
      console.log(outdatedAddresses.length, user.draftAddress?.countryId);
      for (const address of outdatedAddresses) {
        const isMatch =
          address.country?.id == user.draftAddress.countryId &&
          address.region?.id == user.draftAddress.regionId &&
          address.district?.id == user.draftAddress.districtId &&
          address.locality?.id == user.draftAddress.localityId;

        if (isMatch) {
          console.log('address', address);
          const fullAddress = `${address.country?.name + ' ' || ''}
          ${address.region?.shortName || ''}
          ${address.district?.shortName || ''}
          ${address.locality?.shortName || ''}`.trim();
          const confirmed = await this.confirmDataCorrectness(
            'address',
            fullAddress
          );
          if (confirmed) {
            console.log('this.deleteFromOutdatedData("address", address.id)');
            restoringData.addresses ??= [];
            restoringData.addresses.push(address.id);
          } else {
            // Прервать всё, если пользователь сказал "Нет"
            return;
          }
        }
      }
    }

    const outdatedNames = this.newOutdatedData.names.filter((item) => {
      return (
        this.normalize(item.firstName) === this.normalize(user.firstName) &&
        this.normalize(item.patronymic) === this.normalize(user.patronymic) &&
        this.normalize(item.lastName) === this.normalize(user.lastName)
      );
    });
    //  console.log('outdatedNames', outdatedNames);
    if (outdatedNames.length > 0) {
      const fullName = `${user.firstName} ${user.patronymic || ''} ${
        user.lastName
      }`.trim();
      const confirmed = await this.confirmDataCorrectness('names', fullName);
      if (confirmed) {
        console.log(
          'this.deleteFromOutdatedData("names", outdatedNames[0].id,)'
        );
        restoringData.names ??= [];
        restoringData.names.push(outdatedNames[0].id);
      } else {
        // Прервать всё, если пользователь сказал "Нет"
        return;
      }
    }

    const outdatedUserNames = this.newOutdatedData.userNames.filter((item) => {
      return item.userName === user.userName;
    });
    console.log('outdatedNames', outdatedNames);

    console.log('user', user);
    if (outdatedUserNames.length > 0) {
      const userName = user.userName;
      const confirmed = await this.confirmDataCorrectness('userName', userName);
      if (confirmed) {
        console.log(
          'this.deleteFromOutdatedData("userName", outdatedUserNames[0].id,)'
        );
        restoringData.userNames ??= [];
        restoringData.userNames.push(outdatedUserNames[0].id);
      } else {
        // Прервать всё, если пользователь сказал "Нет"
        return;
      }
    }

    const outdatedContacts = this.newOutdatedData.contacts;

    console.log('outdatedContacts', outdatedContacts);
    console.log('user.orderedContacts', user.draftContacts);

    if (outdatedContacts && Object.keys(outdatedContacts).length != 0) {
      const currentContacts = user.draftContacts;
      const duplicates: { id: number; content: string }[] = [];

      for (const type of this.contactTypes) {
        for (const value of currentContacts[type]) {
          if (!value) continue;
          if (Array.isArray(outdatedContacts[type])) {
            for (const outdated of outdatedContacts[type]) {
              if (outdated.content === value) {
                duplicates.push({ id: outdated.id, content: value });
              }
            }
          }
        }
        if (duplicates.length > 0) {
          console.log('duplicates', duplicates);
          const contentString =
            type + ' ' + duplicates.map((c) => c.content).join(', ');
          const confirmed = await this.confirmDataCorrectness(
            'contacts',
            contentString
          );
          if (confirmed) {
            console.log('this.deleteFromOutdatedData("contacts", contacts.id)');
            restoringData.contacts ??= {};
            restoringData.contacts[type] ??= [];
            restoringData.contacts[type] = [
              ...restoringData.contacts[type],
              ...duplicates,
            ];
          } else {
            // Прервать всё, если пользователь сказал "Нет"
            return;
          }
        }
      }
    }
    console.log('restoringData', restoringData);
    this.checkAllChanges(action, user, restoringData);
  }

  // TODO: 🔄 Актуализация данных
  //Лисик, завтра допишем API для обновления юзера, сделаем смену пароля и отображение неактуальных значений.
  //Если останется время, то пройдемся по TODO

  // 🟡 1.

  // - API - сохранить изменения- DONE

  // 🟡 2. Унификация значений null / '', форматов - DONE?
  //  - Привести отсутствующие значения к одному виду
  // - привести адреса (и не только) к одному формату
  //доработать интерфейсы

  // 🟢 3. Вынести общие функции в адванс компонент - DONE?
  //  - Проверка дубликатов
  //  - Отображение диалогов
  //  - Работа с outdatedData (добавление, удаление)

  // 👁 Отображение неактуальных данных +API - запрос этих данных в лист - DONE

  // 🔵 4. В таблице (по запросу) - DONE
  //  - Кнопка или фильтр: «Показать неактуальные» - это уже есть
  //  - Выделение неактуальных данных (цвет/иконка) - это уже есть

  // 🟣 5. В карточке (всегда)
  //  - Показывать список неактуальных значений - DONE

  // 🔴    Изменение пароля администратором - DONE

  //7. упростить код, вынести данные в отд. файлы, упорядочить интерфейсы и типы

  normalize = (value: string | null | undefined) => (value ?? '').trim();

  confirmDataCorrectness(
    type: 'address' | 'names' | 'userName' | 'contacts',
    value: string | string[]
  ): Promise<boolean> {
    const types = {
      address: 'адрес',
      names: 'ФИО',
      userName: 'имя пользователя',
      contacts: 'контакт(ы)',
    };

    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: `В введенных вами данных:<br><b> ${types[type]} '${value}'</b><br>есть совпадения с неактуальными.<br><br>Вы уверены, что указали актуальную информацию?`,
        header: 'Совпадения с неактуальными данными',
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
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  async checkAllChanges(
    action: 'justSave' | 'saveAndExit',
    user: UserDraft,
    restoringData: RestoringData
  ) {
    let changes: ChangedData = { main: null, contacts: null, address: null };

    let outdatingData: OutdatingData = {
      address: null,
      names: null,
      userName: null,
      contacts: null,
    };

    // let deletingData: DeletingData = { address: null, contacts: null };
    let deletingData = this.deletingDataDraft;
    const isNamesChanged =
      this.normalize(this.existedUser!['firstName']) !=
        this.normalize(user.firstName) ||
      this.normalize(this.existedUser!['patronymic']) !=
        this.normalize(user.patronymic) ||
      this.normalize(this.existedUser!['lastName']) !=
        this.normalize(user.lastName);

    if (/* !restoringData.names && */ isNamesChanged) {
      changes.main = {
        firstName: user.firstName,
        patronymic: user.patronymic,
        lastName: user.lastName,
      };
      const oldValue = `${this.existedUser!['firstName']} ${
        this.existedUser!['patronymic'] || ''
      } ${this.existedUser!['lastName']}`.trim();
      const confirmed = await this.confirmDataSaving(
        'names',
        oldValue
        //newValue
      );
      if (confirmed) {
        outdatingData['names'] = {
          firstName: this.existedUser!['firstName'],
          patronymic: this.existedUser!['patronymic'] || null,
          lastName: this.existedUser!['lastName'],
        };
      } else {
      }
    }
    const oldValue = this.existedUser!['userName'];
    if (/* !restoringData.userName && */ user.userName != oldValue) {
      if (changes.main) {
        changes.main['userName'] = user.userName;
      } else {
        changes.main = { userName: user.userName };
      }
      const confirmed = await this.confirmDataSaving(
        'userName',
        oldValue
        //newValue
      );
      if (confirmed) {
        outdatingData['userName'] = this.existedUser!['userName'];
      } else {
      }
    }

    //TODO: привести к единообразию форматы адресов
    const oldAddress = this.existedUser!['address'];

    const newAddress = user.draftAddress!;

    console.log('oldAddress', 'newAddress', oldAddress, newAddress);

    const isAddressChanged =
      !isFieldEqual(
        newAddress.countryId,
        oldAddress.country ? oldAddress.country.id : oldAddress.country
      ) ||
      !isFieldEqual(
        newAddress.regionId,
        oldAddress.region ? oldAddress.region.id : oldAddress.region
      ) ||
      !isFieldEqual(
        newAddress.districtId,
        oldAddress.district ? oldAddress.district.id : oldAddress.district
      ) ||
      !isFieldEqual(
        newAddress.localityId,
        oldAddress.locality ? oldAddress.locality.id : oldAddress.locality
      );
    if (isAddressChanged) {
      if (!restoringData.addresses) {
        changes['address'] = user.draftAddress;
        // console.log('changes', changes);
        //console.log('oldAddress.country', oldAddress.country);
      } else {
        for (const restoredAddressId of restoringData.addresses) {
          const restoredAddress = this.existedUser!.outdatedData.addresses.find(
            (addr) => addr.id === restoredAddressId
          );
          if (restoredAddress) {
            // Compare all address fields
            if (
              restoredAddress.country?.id != user.draftAddress.countryId ||
              restoredAddress.region?.id != user.draftAddress.regionId ||
              restoredAddress.district?.id != user.draftAddress.districtId ||
              restoredAddress.locality?.id != user.draftAddress.localityId
            ) {
              changes['address'] = user.draftAddress;
            }
          }
        }
      }

      if (oldAddress.country) {
        // console.log('oldAddress.country', oldAddress.country);
        const oldValue = `${oldAddress.country?.name + ' ' || ''}
        ${oldAddress.region?.shortName || ''}
        ${oldAddress.district?.shortName || ''}
        ${oldAddress.locality?.shortName || ''}`.trim();
        const confirmed = await this.confirmDataSaving(
          'address',
          oldValue
          //newValue
        );
        if (confirmed) {
          outdatingData.address = oldAddress.id;
        } else {
          deletingData['addresses'] ??= [];
          deletingData['addresses'].push(oldAddress.id);
        }
      }
    }

    const oldContacts = this.object!['orderedContacts'];
    /*     changes['contacts'] = {} as Record<
      Exclude<ContactType, 'telegram'>,
      string[]
    >; */
    const newContacts = user.draftContacts;

    console.log('oldContacts', 'newContacts', oldContacts, newContacts);
    for (const type of this.contactTypes) {
      //changes['contacts'][type] = [];
      for (const contact of newContacts[type]) {
        console.log('contact', contact);
        console.log('oldContacts[type]', oldContacts[type]);
        const indexInOldContactsArray = oldContacts[type]?.findIndex(
          (item) => item.content == contact
        );
        console.log('indexInOldContactsArray', indexInOldContactsArray);
        if (!oldContacts[type] || indexInOldContactsArray == -1) {
          if (restoringData.contacts && restoringData.contacts[type]) {
            const indexInRestoringContactsArray = restoringData.contacts[
              type
            ].findIndex((item) => item.content === contact);
            console.log(
              'indexInRestoringContactsArray',
              indexInRestoringContactsArray
            );
            if (indexInRestoringContactsArray == -1) {
              changes['contacts'] ??= {};
              changes['contacts'][type] ??= [];
              changes['contacts'][type].push(contact);
            }
          } else {
            changes['contacts'] ??= {};
            changes['contacts'][type] ??= [];
            changes['contacts'][type].push(contact);
          }
        }
      }

      if (oldContacts[type]) {
        for (const contact of oldContacts[type]) {
          const indexInNewContactsArray = newContacts[type].findIndex(
            (item) => item === contact.content
          );
          if (indexInNewContactsArray == -1) {
            const oldValue = type + ' ' + contact.content;

            const confirmed = await this.confirmDataSaving(
              'contacts',
              oldValue
              //newValue
            );
            if (confirmed) {
              outdatingData['contacts'] ??= [];
              outdatingData['contacts'].push(contact.id);
            } else {
              deletingData['contacts'] ??= [];
              deletingData['contacts'].push(contact.id);
            }
          }
        }
      }
    }
    type MainKeys = keyof NonNullable<ChangedData['main']>;

    const mainProps: MainKeys[] = [
      'roleId',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];

    for (const prop of mainProps) {
      const key = prop as keyof User & keyof UserDraft;
      if (this.existedUser![key] != user[key]) {
        changes.main = changes.main || {};
        changes.main = {
          ...changes.main,
          [key]: user[key],
        };
      }
    }

    console.log('outdatingData', outdatingData);
    console.log('deletingData', deletingData);
    console.log('restoringData', restoringData);
    console.log('changes', changes);

    this.saveUpdatedUser(action, {
      changes,
      restoringData,
      outdatingData,
      deletingData,
    });
    function isFieldEqual(
      newFieldId: number | null,
      oldFieldId: number | null
    ): boolean {
      if (!newFieldId && !oldFieldId) return true;
      if (newFieldId && oldFieldId) return newFieldId === oldFieldId;
      return false;
    }
  }

  confirmDataSaving(
    type: 'address' | 'names' | 'userName' | 'contacts',
    oldValue: string
    //newValue: string
  ): Promise<boolean> {
    const types = {
      address: 'адрес',
      names: 'ФИО',
      userName: 'имя пользователя',
      contacts: 'контакт(ы)',
    };

    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: `Вы изменили ${types[type]}.<br>Сохранить прежнее значение <b>"${oldValue}"</b> как неактуальное?<br>В противном случае оно будет удалено как ошибочное без возможности восстановления.`,
        header: 'Сохранить в неактуальные?',
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
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  saveUser(action: 'justSave' | 'saveAndExit', user: UserDraft) {
    this.userService.saveUser(user).subscribe({
      next: (res) => {
        //this.dialogRefCreate.close({ userName: res.userName });
        if (action == 'saveAndExit') {
          //this.dialogRef.close({ name: res.data });
          this.closeDialogDataSignal.set(res.data.userName);
          this.emittedCloseDialogData.emit(res.data.userName);
        } else {
          //console.log('this.existedUser', this.existedUser);

          //TODO: вернуть новые данные юзера и обновить значения полей, исходя из этого
          this.data().object = res.data;
          //this.existedUser= this.data().object;
          console.log('this.existedUser', this.existedUser);
          this.changeToViewMode(null);
          this.setInitialValues('view');
          this.msgWrapper.success(`Аккаунт пользователя ${res.data.userName} создан.`);
        }
      },
      error: (err) => this.msgWrapper.handle(err),
    });
  }

  saveUpdatedUser(
    action: 'justSave' | 'saveAndExit',
    upgradedUserData: {
      changes: ChangedData;
      restoringData: RestoringData;
      outdatingData: OutdatingData;
      deletingData: DeletingData;
    }
  ) {
    this.userService
      .saveUpdatedUser(this.existedUser!.id, upgradedUserData)
      .subscribe({
        next: (res) => {
          //this.dialogRefCreate.close({ userName: res.userName });
          if (action == 'saveAndExit') {
            //this.dialogRef.close({ name: res.data });
            this.closeDialogDataSignal.set(res.data.userName);
            this.emittedCloseDialogData.emit(res.data.userName);
          } else {
            //console.log('this.existedUser', this.existedUser);

            //TODO: вернуть новые данные юзера и обновить значения полей, исходя из этого
            if (
              !this.mainForm.controls['isRestricted'].value &&
              this.mainForm.get('causeOfRestriction')
            ) {
              this.mainForm.removeControl('causeOfRestriction');
              const index = this.controlsNames.findIndex(
                (item) => item == 'causeOfRestriction'
              );
              this.controlsNames.splice(index);
            }
            this.data().object = res.data;
            this.data().defaultAddressParams = res.data.defaultAddressParams;
            this.newOutdatedData = structuredClone(
              this.existedUser!.outdatedData
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
            /*         { localityId: this.existedUser!.address.locality ? this.existedUser!.address.locality.id : null,
              districtId: this.existedUser!.address.district ? this.existedUser!.address.district.id : null,
              regionId: this.existedUser!.address.region ? this.existedUser!.address.region.id : null,
              countryId: this.existedUser!.address.country ? this.existedUser!.address.country.id : null,
            });*/

            console.log('  this.newOutdatedData', this.newOutdatedData);
            //this.existedUser= this.data().object;
            console.log('this.existedUser', this.existedUser);
            //TODO: test it
            this.changeToViewMode(null);
            this.setInitialValues('view');
            this.msgWrapper.success(`Аккаунт пользователя ${res.data.userName} обновлен.`);
          }
        },
        error: (err) => this.msgWrapper.handle(err),
      });
  }

  hasOutdatedUserNames(): boolean {
    return this.newOutdatedData.userNames.length > 0;
  }
  hasOutdatedNames(): boolean {
    return this.newOutdatedData.names.length > 0;
  }

  hasOutdatedContacts(): boolean {
    return Object.keys(this.newOutdatedData.contacts).length > 0;
  }

  hasOutdatedAddresses(): boolean {
    return this.newOutdatedData.addresses.length > 0;
  }
}
