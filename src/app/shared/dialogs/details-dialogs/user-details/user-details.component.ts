import { Component, inject } from '@angular/core';
import {
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

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

import { AddressFilterComponent } from '../../../address-filter/address-filter.component';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import { RoleService } from '../../../../services/role.service';
import {
  ChangedData,
  CommonUserFields,
  Contact,
  Contacts,
  ContactType,
  DeletingData,
  OutdatingData,
  RestoringData,
  User,
} from '../../../../interfaces/user';
import { UserService } from '../../../../services/user.service';
import * as Validator from '../../../custom.validator';
import { UserDraft } from '../../../../interfaces/userDraft';
import { AdvancedDetailsComponent } from '../advances-details/advanced-details.component';
import { typedKeys } from '../../../../interfaces/types';

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
    Toast,
    AddressFilterComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.css',
})
export class UserDetailsComponent extends AdvancedDetailsComponent<User> {
  get existedUser(): User | null {
    return this.data().object;
  }
  // existedUser: User | null = null;

  private roleService = inject(RoleService);
  private userService = inject(UserService);

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

  override ngOnInit(): void {
    super.ngOnInit();
    // this.existedUser = this.object;
    ////console.log('ngOnInit', this.data().operation);
    this.mainForm.setValidators([Validator.mainContactsValidator]);
    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        this.roles = res.data.roles;
        //console.log('this.roles', this.roles);
      },
      error: (err) => this.errorService.handle(err),
    });
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

  onTypeClick(index: number) {
    const type: Exclude<ContactType, 'telegram' | 'otherContact'> =
      this.availableContactTypes[index];
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
    this.getFormArray(type).push(new FormControl(null, validators[type] || []));
  }

  deleteContactControl(index: number, controlName: string) {
    const formArray = this.getFormArray(controlName);
    if (formArray.length > 1) {
      formArray.removeAt(index);
    }
    this.onChangeValidation();
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
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Username ${userDraft.userName} уже занято! Выберите другое.`,
            sticky: true,
          });
        } else {
          this.checkDuplicates(action, userDraft);
        }
      },
      error: (err) => this.errorService.handle(err),
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
      let errorMessage = 'Вы указали одинаковые значения для: \n';
      for (let key of typedKeys(contactDuplicates)) {
        errorMessage = errorMessage + ` ${key} -`;
        for (let value of contactDuplicates[key]) {
          errorMessage = errorMessage + ` ${value}`;
        }
        errorMessage = errorMessage + '\n';
      }
      errorMessage = errorMessage + '\n Удалите, пожалуйста, дубли!';
      this.messageService.add({
        severity: 'warn',
        summary: 'Ошибка',
        detail: errorMessage,
        sticky: true,
      });
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
            this.checkNotActualDataDuplicates(action, user);
          } else {
            this.saveUser(action, user);
          }
        }
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  //TODO:  MAYBE move this logic to advanced-details.component.ts

  async checkNotActualDataDuplicates(
    action: 'justSave' | 'saveAndExit',
    user: UserDraft
  ) {
    let restoringData: RestoringData = {
      address: null,
      names: null,
      userName: null,
      contacts: null,
    };
    const outdatedAddresses = this.existedUser!['outdatedData'].addresses;

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
          ${address.district?.name || ''}
          ${address.locality?.name || ''}`.trim();
          const confirmed = await this.confirmDataCorrectness(
            'address',
            fullAddress
          );
          if (confirmed) {
            console.log('this.deleteFromOutdatedData("address", address.id)');
            restoringData.address = address.id;
          } else {
            // Прервать всё, если пользователь сказал "Нет"
            return;
          }
        }
      }
    }

    const outdatedAllNames = this.existedUser!['outdatedData'].names;
    // console.log('outdatedAllNames', outdatedAllNames);
    // console.log('user', user);
    const outdatedNames = outdatedAllNames.filter((item) => {
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
        restoringData.names = outdatedNames[0].id;
      } else {
        // Прервать всё, если пользователь сказал "Нет"
        return;
      }
    }

    const outdatedUserNames = outdatedAllNames.filter((item) => {
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
        restoringData.userName = outdatedUserNames[0].id;
      } else {
        // Прервать всё, если пользователь сказал "Нет"
        return;
      }
    }

    const outdatedContacts = this.existedUser!['outdatedData'].contacts;

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

  // - API - сохранить изменения

  // 🟡 2. Унификация значений null / '', форматов - DONE?
  //  - Привести отсутствующие значения к одному виду
  // - привести адреса (и не только) к одному формату
  //доработать интерфейсы

  // 🟢 3. Вынести общие функции в адванс компонент - DONE?
  //  - Проверка дубликатов
  //  - Отображение диалогов
  //  - Работа с outdatedData (добавление, удаление)

  // 👁 Отображение неактуальных данных +API - запрос этих данных в лист

  // 🔵 4. В таблице (по запросу)
  //  - Кнопка или фильтр: «Показать неактуальные» - это уже есть
  //  - Выделение неактуальных данных (цвет/иконка)

  // 🟣 5. В карточке (всегда)
  //  - Показывать список неактуальных значений

  // 🔐 Изменение пароля администратором

  // 🔴 6. Реализация
  //  - UI: модалка или секция
  //  - Поля: новый, повтор
  //  - Валидация
  //  - Запрос к API и сообщение об успехе/ошибке

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

    let deletingData: DeletingData = { address: null, contacts: null };

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

    if (!restoringData.address && isAddressChanged) {
      changes['address'] = user.draftAddress;
      // console.log('changes', changes);
      //console.log('oldAddress.country', oldAddress.country);
      if (oldAddress.country) {
        // console.log('oldAddress.country', oldAddress.country);
        const oldValue = `${oldAddress.country?.name + ' ' || ''}
        ${oldAddress.region?.shortName || ''}
        ${oldAddress.district?.name || ''}
        ${oldAddress.locality?.name || ''}`.trim();
        const confirmed = await this.confirmDataSaving(
          'address',
          oldValue
          //newValue
        );
        if (confirmed) {
          outdatingData.address = oldAddress.id;
        } else {
          deletingData['address'] = oldAddress.id;
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
//TODO: неправильно формируется массив изменений в контактах: проверить определение наличия изменений в контактах телеграм
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

      if (Array.isArray(oldContacts[type])) {
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
      if (this.existedUser![key] !== user[key]) {
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
          this.messageService.add({
            severity: 'success',
            summary: 'Подтверждение',
            detail: `Аккаунт пользователя ${res.data.userName} успешно создан!`,
          });
        }
      },
      error: (err) => this.errorService.handle(err),
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
            //this.existedUser= this.data().object;
            console.log('this.existedUser', this.existedUser);
            //TODO: test it
            this.changeToViewMode(null);
            this.setInitialValues('view');
            this.messageService.add({
              severity: 'success',
              summary: 'Подтверждение',
              detail: `Аккаунт пользователя ${res.data.userName} успешно обновлен!`,
            });
          }
        },
        error: (err) => this.errorService.handle(err),
      });
  }
}
