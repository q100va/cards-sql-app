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
    //console.log('ngOnInit', this.data().operation);
    this.mainForm.setValidators([Validator.mainContactsValidator]);
    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        this.roles = res.data.roles;
        console.log('this.roles', this.roles);
      },
      error: (err) => this.errorHandling(err),
    });
  }

  addIfRestricted() {
    //TODO: change controls???
    if (this.mainForm.controls['isRestricted'].value) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl('', Validators.required)
      );
      this.controlsNames.push('causeOfRestriction');
    } else {
      this.mainForm.removeControl('causeOfRestriction');
      const index = this.controlsNames.findIndex(
        (item) => item == 'causeOfRestriction'
      );
      this.controlsNames.splice(index);
    }
  }

  modifyContactTypesList() {
    for (let contact of this.possibleContactTypes) {
      console.log(this.mainForm.controls[contact.name].value);
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
  }

  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    console.log('onSaveClick', action);
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
        console.log('There are not duplicates!');
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
              this.saveUser(action, user);
            },
            reject: () => {},
          });
        } else {
          this.saveUser(action, user);
        }
      },
      error: (err) => this.errorHandling(err),
    });
  }

  saveUser(action: 'justSave' | 'saveAndExit', user: User) {
    user.password = this.mainForm.controls['password'].value;
    user.roleId = this.mainForm.controls['roleId'].value;
    user.addresses = [
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
    user.comment = this.mainForm.controls['comment'].value;
    user.isRestricted = this.mainForm.controls['isRestricted'].value;
    user.causeOfRestriction = this.mainForm.controls['isRestricted'].value
      ? this.mainForm.controls['causeOfRestriction'].value
      : null;
    user.dateOfRestriction = this.mainForm.controls['isRestricted'].value
      ? new Date()
      : null;
    this.userService.saveUser(user, this.data().operation).subscribe({
      next: (res) => {
        //this.dialogRefCreate.close({ userName: res.userName });
        if (action == 'saveAndExit') {
          //this.dialogRef.close({ name: res.data });
          this.closeDialog.emit(res.data);
        } else {
          console.log('this.data().object', this.data().object);
          this.data().object = res.data;
          console.log('this.data().object', this.data().object);
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
