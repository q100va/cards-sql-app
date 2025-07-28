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
import { User } from '../../../../interfaces/user';
import { UserService } from '../../../../services/user.service';
import * as Validator from '../../../custom.validator';

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
export class UserDetailsComponent extends BaseDetailsComponent {
  private roleService = inject(RoleService);
  private userService = inject(UserService);

  roles!: { id: number; name: string }[];
  possibleContactTypes: { name: string; availableForExtra: boolean }[] = [
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
  availableContactTypes: string[] = [];

  override ngOnInit(): void {
    super.ngOnInit();
    ////console.log('ngOnInit', this.data().operation);
    this.mainForm.setValidators([Validator.mainContactsValidator]);
    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        this.roles = res.data.roles;
        //console.log('this.roles', this.roles);
      },
      error: (err) => this.errorHandling(err),
    });
  }

  onRestrictedToggleClick() {
    //TODO: change controls???

    if (this.mainForm.controls['isRestricted'].value) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl('', Validators.required)
      );
      this.controlsNames.push('causeOfRestriction');
    } else if (
      (this.isEditMode && !this.data().object!['isRestricted']) ||
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
          (item: string) => item == ''
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
    const type = this.availableContactTypes[index];
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
      new FormControl('', validators[type as keyof typeof validators] || [])
    );
  }

  deleteContactControl(index: number, controlName: string) {
    const formArray = this.getFormArray(controlName);
    if (formArray.length > 1) {
      formArray.removeAt(index);
    }
    this.onChangeValidation();
  }

  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    //console.log('onSaveClick', action);
    const user = {} as User;
    user.userName = this.mainForm.controls['userName'].value!.trim();
    user.id = this.data().object ? (this.data().object!['id'] as number) : null;
    this.userService.checkUserName(user.userName, user.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Username ${user.userName} уже занято! Выберите другое.`,
            sticky: true,
          });
        } else {
          this.checkDuplicates(action, user);
        }
      },
      error: (err) => this.errorHandling(err),
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

  checkDuplicates(action: 'justSave' | 'saveAndExit', user: User) {
    user.firstName = this.mainForm.controls['firstName'].value!.trim();
    user.patronymic = this.mainForm.controls['patronymic'].value?.trim();
    user.lastName = this.mainForm.controls['lastName'].value!.trim();

    user.draftAddresses = [
      {
        country:
          this.addressFilter().countries &&
          this.addressFilter().countries?.length
            ? this.addressFilter().countries![0]
            : null,
        region:
          this.addressFilter().regions && this.addressFilter().regions?.length
            ? this.addressFilter().regions![0]
            : null,
        district:
          this.addressFilter().districts &&
          this.addressFilter().districts?.length
            ? this.addressFilter().districts![0]
            : null,
        locality:
          this.addressFilter().localities &&
          this.addressFilter().localities?.length
            ? this.addressFilter().localities![0]
            : null,
      },
    ];

    user.orderedContacts = {} as User['orderedContacts'];

    for (let contact of this.possibleContactTypes) {
      user.orderedContacts[contact.name as keyof typeof user.orderedContacts] =
        this.getFormArray(contact.name).getRawValue() as string[];

      user.orderedContacts[contact.name as keyof typeof user.orderedContacts] =
        user.orderedContacts[
          contact.name as keyof typeof user.orderedContacts
        ].map((item) => {
          if (item != '') {
            return this.completeContact(item, contact.name) as string;
          } else {
            return item;
          }
        });
    }

    let contactDuplicates: { [key: string]: string[] } = {};

    for (let key in user.orderedContacts) {
      let tempArray =
        user.orderedContacts[key as keyof typeof user.orderedContacts].sort();
      let duplicates = new Set();
      for (let i = 0; i < tempArray.length - 1; i++) {
        if (tempArray[i + 1] == tempArray[i]) {
          duplicates.add(tempArray[i]);
        }
      }

      if (duplicates.size > 0) {
        contactDuplicates[key] = Array.from(duplicates) as string[];
      } else {
        //console.log('There are not duplicates!');
      }
    }

    if (Object.keys(contactDuplicates).length != 0) {
      let errorMessage = 'Вы указали одинаковые значения для: \n';
      for (let key in contactDuplicates) {
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

  checkUserData(action: 'justSave' | 'saveAndExit', user: User) {
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
              this.checkNotActualDataDuplicates(action, user);
            },
            reject: () => {},
          });
        } else {
          this.checkNotActualDataDuplicates(action, user);
        }
      },
      error: (err) => this.errorHandling(err),
    });
  }

  //TODO: check if there are duplicates of not actual data MAYBE move this logic to base-details.component.ts

  async checkNotActualDataDuplicates(
    action: 'justSave' | 'saveAndExit',
    user: User
  ) {
    const outdatedAddresses = (
      this.data().object!['outdatedData'] as unknown as { addresses: any[] }
    ).addresses;

    if (outdatedAddresses.length > 0 && user.draftAddresses?.[0]?.country) {
      console.log(outdatedAddresses.length, user.draftAddresses?.[0]?.country);
      for (const address of outdatedAddresses) {
        const isMatch =
          address.country?.id == user.draftAddresses[0].country &&
          address.region?.id == user.draftAddresses[0].region &&
          address.district?.id == user.draftAddresses[0].district &&
          address.locality?.id == user.draftAddresses[0].locality;

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
            // TODO: this.deleteFromOutdatedData('address', address.id);
          } else {
            // Прервать всё, если пользователь сказал "Нет"
            return;
          }
        }
      }
    }

    const outdatedAllNames = (
      this.data().object!['outdatedData'] as unknown as { names: any[] }
    ).names;
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
      } else {
        // Прервать всё, если пользователь сказал "Нет"
        return;
      }
    }

    const outdatedContacts = (
      this.data().object!['outdatedData'] as unknown as {
        contacts: {
          [key: string]: { id: number; type: string; content: string }[];
        };
      }
    ).contacts;

    console.log('outdatedContacts', outdatedContacts);
    console.log('user.orderedContacts', user.orderedContacts);

    if (outdatedContacts) {
      const currentContacts = user.orderedContacts;
      const duplicates: { id: number; content: string }[] = [];

      for (const type of this.contactTypes) {
     /*    const currentValues =
          currentContacts[type as keyof typeof currentContacts] || [];
 */
        for (const value of currentContacts[type as keyof typeof currentContacts]) {
          if (!value) continue;

          for (const outdated of outdatedContacts[type]) {
            if (outdated.content === value) {
              duplicates.push({ id: outdated.id, content: value });
            }
          }
        }
        if (duplicates.length > 0) {
          console.log('duplicates', duplicates);
          const contentString = type + ' ' + duplicates.map(c => c.content).join(', ');
          const confirmed = await this.confirmDataCorrectness(
            'contacts',
            contentString
          );
          if (confirmed) {
            console.log('this.deleteFromOutdatedData("contacts", contacts.id)');
            // TODO: this.deleteFromOutdatedData(type, duplicates.map(c => c.id));
          } else {
            // Прервать всё, если пользователь сказал "Нет"
            return;
          }
        }
      }
    }
    // this.checkAllChanges(action, user);
    console.log('this.checkAllChanges(action, user)');
  }


  // TODO: 🔄 Актуализация данных

// 🟡 1. Сверка изменений
//  - Сравнение новых значений с текущими
//  - Диалог: «Сохранить старое как неактуальное?»
//  - Отправка в outdatedData или замена без сохранения + API

// 🟡 2. Унификация значений null / ''
//  - Привести отсутствующие значения к одному виду

// 🟢 3. Вынести общие функции
//  - Проверка дубликатов
//  - Отображение диалогов
//  - Работа с outdatedData (добавление, удаление)

// 👁 Отображение неактуальных данных

// 🔵 4. В таблице (по запросу)
//  - Кнопка или фильтр: «Показать неактуальные» - это уже есть
//  - Выделение неактуальных данных (цвет/иконка)

// 🟣 5. В карточке (всегда)
//  - Показывать список неактуальных значений

// 🔐 Изменение пароля

// 🔴 6. Реализация
//  - UI: модалка или секция
//  - Поля: текущий пароль, новый, повтор
//  - Валидация
//  - Запрос к API и сообщение об успехе/ошибке

  //checkOutdatedContactsDuplicates(user: User): { id: number, type: string, value: string }[] {}

  normalize = (value: string | null | undefined) => (value ?? '').trim();

  confirmDataCorrectness(
    type: string,
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
        message: `В введенных вами данных:<br><b> ${
          types[type as keyof typeof types]
        } '${value}'</b><br>есть совпадения с неактуальными.<br><br>Вы уверены, что указали актуальную информацию?`,
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
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  checkAllChanges(action: 'justSave' | 'saveAndExit', user: User) {
    this.saveUser(action, user);
    this.saveUser(action, user);
  }

  saveUser(action: 'justSave' | 'saveAndExit', user: User) {
    user.password = this.mainForm.controls['password'].value;
    user.roleId = this.mainForm.controls['roleId'].value;
    user.comment = this.mainForm.controls['comment'].value;
    user.isRestricted = this.mainForm.controls['isRestricted'].value;
    user.causeOfRestriction = this.mainForm.controls['isRestricted'].value
      ? this.mainForm.controls['causeOfRestriction'].value
      : null;
    user.dateOfRestriction = this.mainForm.controls['isRestricted'].value
      ? new Date()
      : null;
    this.userService.saveUser(user, this.data().operation!).subscribe({
      next: (res) => {
        //this.dialogRefCreate.close({ userName: res.userName });
        if (action == 'saveAndExit') {
          //this.dialogRef.close({ name: res.data });
          this.closeDialog.emit(res.data);
        } else {
          //console.log('this.data().object', this.data().object);
          this.data().object = res.data;
          //console.log('this.data().object', this.data().object);
          //TODO: test it
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

          this.changeToViewMode(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Подтверждение',
            detail: `Карточка пользователя '${res.data.userName}' успешно обновлена!`,
          });
        }
      },
      error: (err) => this.errorHandling(err),
    });
  }
}
