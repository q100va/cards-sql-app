import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  model,
  signal,
} from '@angular/core';
import { AbstractControl, FormArray, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  //MatDialogClose,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
//import { Ripple } from 'primeng/ripple';

import * as Validator from '../../custom.validator';
import { AddressService } from '../../../services/address.service';
import { User } from '../../../interfaces/user';
import { UserService } from '../../../services/user.service';
import { Router } from '@angular/router';
import { RoleService } from '../../../services/role.service';
import { AddressFilterComponent } from '../../address-filter/address-filter.component';

@Component({
  selector: 'app-create-user-dialog',
  imports: [
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatMenuModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    // MatDialogClose,
    MatGridListModule,
    FormsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
    Toast,
    AddressFilterComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserDialogComponent implements OnInit {
  private addressService = inject(AddressService);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  addressFilter = signal<{
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });

  defaultAddressParams: {
    localityId: number | null;
    districtId: number | null;
    regionId: number | null;
    countryId: number | null;
  } = {
    localityId: null,
    districtId: null,
    regionId: null,
    countryId: null,
  };

  roles!: { id: number; name: string;}[];
/*   countries!: { id: number; name: string }[];
  regions?: { id: number; name: string; countryId: number }[];
  districts?: { id: number; name: string; regionId: number }[];
  localities?: { id: number; name: string; districtId: number }[]; */

  contactTypes = [
    {
      type: 'email',
      label: 'Email',
      placeholder: 'agatha85@yandex.ru',
      validator: Validator.emailFormatValidator(),
      errorName: 'emailFormat',
      available: false,
      //prefix: '',
    },
    {
      type: 'phoneNumber',
      label: 'Номер телефона',
      placeholder: 'начните с "+", далее в любом формате',
      validator: Validator.phoneNumberFormatValidator(),
      errorName: 'phoneNumberFormat',
      available: false,
      //prefix: '',
    },
    {
      type: 'telegramId',
      label: 'Телеграм ID',
      placeholder: '#1234567890',
      validator: Validator.telegramIdFormatValidator(),
      errorName: 'telegramIdFormat',
      available: false,
      //prefix: '',
    },
    {
      type: 'telegramPhoneNumber',
      label: 'Телеграм номер телефона',
      placeholder: 'начните с "+", далее в любом формате',
      validator: Validator.phoneNumberFormatValidator(),
      errorName: 'phoneNumberFormat',
      available: false,
      //prefix: '',
    },
    {
      type: 'telegramNickname',
      label: 'Телеграм nickname',
      placeholder: '@daisy',
      validator: Validator.telegramNicknameFormatValidator(),
      errorName: 'telegramNicknameFormat',
      available: false,
      //prefix: '',
    },
    {
      type: 'whatsApp',
      label: 'WhatsApp',
      placeholder: 'начните с "+", далее в любом формате',
      validator: Validator.phoneNumberFormatValidator(),
      errorName: 'phoneNumberFormat',
      available: false,
      //prefix: '',
    },
    {
      type: 'vKontakte',
      label: 'Вконтакте',
      placeholder: 'id719993384 или daisy',
      validator: Validator.vKontakteFormatValidator(),
      errorName: 'vKontakteFormat',
      available: false,
      //prefix: 'https://vk.com/',
    },
    {
      type: 'instagram',
      label: 'Instagram',
      placeholder: 'daisy',
      validator: Validator.instagramFormatValidator(),
      errorName: 'instaFormat',
      available: false,
      //prefix: 'https://www.instagram.com/',
    },
    {
      type: 'facebook',
      label: 'Facebook',
      placeholder: 'daisy',
      validator: Validator.facebookFormatValidator(),
      errorName: 'facebookFormat',
      available: false,
      //prefix: 'https://www.facebook.com/',
    },
    {
      type: 'otherContact',
      label: 'Другой контакт',
      placeholder: 'все, что не подошло выше',
      available: false,
      //prefix: '',
    },
  ];
  availableContactTypes: any;

  readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  //form!: FormGroup;
  //readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  //readonly animal = model(this.data.animal);
  form = new FormGroup<Record<string, AbstractControl | FormGroup>>(
    {
      userName: new FormControl(
        null,
        Validators.compose([Validators.required])
      ),
      password: new FormControl(
        null,
        Validators.compose([
          Validators.required,
          Validators.pattern('^(?=.*\\d)(?=.*[A-Za-z]).{8,}$'),
        ])
      ),
      role: new FormControl(null, Validators.compose([Validators.required])),

      firstName: new FormControl(
        null,
        Validators.compose([Validators.required])
      ),
      patronymic: new FormControl(null),
      lastName: new FormControl(
        null,
        Validators.compose([Validators.required])
      ),

/*       country: new FormControl(null),
      region: new FormControl({ value: null, disabled: true }),
      district: new FormControl({ value: null, disabled: true }),
      locality: new FormControl({ value: null, disabled: true }),
 */
      comment: new FormControl(null),
      isRestricted: new FormControl(false),

      email: new FormControl(
        null,
        Validators.compose([
          Validators.required,
          Validator.emailFormatValidator(),
        ])
      ),
      phoneNumber: new FormControl(
        null,
        Validators.compose([
          Validators.required,
          Validator.phoneNumberFormatValidator(),
        ])
      ),
      whatsApp: new FormControl(
        null,
        Validators.compose([Validator.phoneNumberFormatValidator()])
      ),
      telegramNickname: new FormControl(
        null,
        Validators.compose([Validator.telegramNicknameFormatValidator()])
      ),
      telegramId: new FormControl(
        null,
        Validators.compose([
          Validators.required,
          Validator.telegramIdFormatValidator(),
        ])
      ),
      telegramPhoneNumber: new FormControl(
        null,
        Validators.compose([
          Validators.required,
          Validator.phoneNumberFormatValidator(),
        ])
      ),
      vKontakte: new FormControl(
        null,
        Validators.compose([Validator.vKontakteFormatValidator()])
      ),
      instagram: new FormControl(
        null,
        Validators.compose([Validator.instagramFormatValidator()])
      ),
      facebook: new FormControl(
        null,
        Validators.compose([Validator.facebookFormatValidator()])
      ),
      otherContact: new FormControl(null),
      extraContacts: new FormArray([]),
    },
    { validators: Validator.mainContactsValidator }
  );

  get extraContacts() {
    return this.form.get('extraContacts') as FormArray;
  }

  constructor() {}

  ngOnInit() {
    //  this.form.controls.contacts.setValidators(Validator.minValidator());
    this.roleService.getRolesNamesList().subscribe({
      next: (res) => {
        this.roles = res.data.roles;
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
/*     this.addressService.getListOfCountries().subscribe({
      next: (res) => {
        this.countries = res.data;
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    }); */
  }

  //

/*   onCountrySelectionChange() {
    if (this.form.controls['country'].value) {
      this.addressService
        .getListOfRegionsOfCountries([this.form.controls['country'].value.id])
        .subscribe({
          next: (res) => {
            this.regions = res.data;
            if (this.regions && this.regions.length > 0) {
              this.form.get('region')?.enable();
            } else {
              this.form.get('region')?.disable();
            }
          },
          error: (err) => {
            console.log(err);
            let errorMessage =
              typeof err.error === 'string'
                ? err.error
                : 'Ошибка: ' + err.message;
            this.messageService.add({
              severity: 'error',
              summary: 'Ошибка',
              detail: errorMessage,
              sticky: true,
            });
          },
        });
      } else {
        this.form.get('region')?.disable();
      }
      this.form.get('region')?.setValue(null);
      this.form.get('district')?.disable();
      this.form.get('district')?.setValue(null);
      this.form.get('locality')?.disable();
      this.form.get('locality')?.setValue(null);
  }

  onRegionSelectionChange() {
    if (this.form.controls['region'].value) {
      this.addressService
        .getListOfDistrictsOfRegions([this.form.controls['region'].value.id])
        .subscribe({
          next: (res) => {
            this.districts = res.data;
            if (this.districts && this.districts.length > 0) {
              this.form.get('district')?.enable();
            } else {
              this.form.get('district')?.disable();
            }
          },
          error: (err) => {
            console.log(err);
            let errorMessage =
              typeof err.error === 'string'
                ? err.error
                : 'Ошибка: ' + err.message;
            this.messageService.add({
              severity: 'error',
              summary: 'Ошибка',
              detail: errorMessage,
              sticky: true,
            });
          },
        });
      } else {
        this.form.get('district')?.disable();
      }
      this.form.get('district')?.setValue(null);
      this.form.get('locality')?.disable();
      this.form.get('locality')?.setValue(null);
  }

  onDistrictSelectionChange() {
    if (this.form.controls['district'].value) {
      this.addressService
        .getListOfLocalitiesOfDistricts([this.form.controls['district'].value.id])
        .subscribe({
          next: (res) => {
            this.localities = res.data;
            if (this.localities && this.localities.length > 0) {
              this.form.get('locality')?.enable();
            } else {
              this.form.get('locality')?.disable();
            }
          },
          error: (err) => {
            console.log(err);
            let errorMessage =
              typeof err.error === 'string'
                ? err.error
                : 'Ошибка: ' + err.message;
            this.messageService.add({
              severity: 'error',
              summary: 'Ошибка',
              detail: errorMessage,
              sticky: true,
            });
          },
        });
      } else {
        this.form.get('locality')?.disable();
      }
      this.form.get('locality')?.setValue(null);
  } */

  addIfRestricted() {
    if (this.form.controls['isRestricted'].value) {
      this.form.addControl(
        'causeOfRestriction',
        new FormControl(null, Validators.required)
      );
    } else {
      this.form.removeControl('causeOfRestriction');
    }
  }

  modifyContactTypesList() {
    for (let contact of this.contactTypes) {
      if (this.form.controls[contact.type].value) {
        contact.available = true;
      }
    }
    this.availableContactTypes = this.contactTypes.filter(
      (item) => item.available == true
    );
  }

  onTypeClick(index: number) {
    const group = new FormGroup({
      chosenIndex: new FormControl(index),
      type: new FormControl(this.availableContactTypes[index].type),
      contact: new FormControl(
        null,
        Validators.compose([
          Validators.required,
          this.availableContactTypes[index].validator,
        ])
      ),
    });
    this.extraContacts.push(group);
  }

  deleteInstituteControl(index: number) {
    this.extraContacts.removeAt(index);
  }

  onSaveClick() {
    console.log('SAVE');
    const newUser = {} as User;
    newUser.userName = this.form.controls['userName'].value?.trim();
    newUser.password = this.form.controls['password'].value;
    newUser.firstName = this.form.controls['firstName'].value?.trim();
    newUser.patronymic = this.form.controls['patronymic'].value?.trim();
    newUser.lastName = this.form.controls['lastName'].value?.trim();
    newUser.roleId = this.form.controls['role'].value;
    newUser.addresses = [
      {
        country: (this.addressFilter().countries && this.addressFilter().countries?.length) ? this.addressFilter().countries![0] : null,
        region: (this.addressFilter().regions && this.addressFilter().regions?.length) ? this.addressFilter().regions![0] : null,
        district: (this.addressFilter().districts && this.addressFilter().districts?.length) ? this.addressFilter().districts![0] : null,
        locality: (this.addressFilter().localities && this.addressFilter().localities?.length) ? this.addressFilter().localities![0] : null,
      }
/*       {
        country: this.form.controls['country'].value,
        region: this.form.controls['region'].value,
        district: this.form.controls['district'].value,
        locality: this.form.controls['locality'].value,
      }, */
    ];
    newUser.comment = this.form.controls['comment'].value;
    newUser.isRestricted = this.form.controls['isRestricted'].value;
    newUser.causeOfRestriction = this.form.controls['isRestricted'].value
      ? this.form.controls['causeOfRestriction'].value
      : null;
    newUser.dateOfRestriction = this.form.controls['isRestricted'].value
      ? new Date()
      : null;
    newUser.orderedContacts = {
      email: [this.form.controls['email'].value],
      phoneNumber: [
        this.completeContact(
          this.form.controls['phoneNumber'].value,
          'phoneNumber'
        ),
      ],
      telegramId: [this.form.controls['telegramId'].value],
      telegramPhoneNumber: [
        this.completeContact(
          this.form.controls['telegramPhoneNumber'].value,
          'telegramPhoneNumber'
        ),
      ],
      telegramNickname: [
        this.form.controls['telegramNickname'].value
          ? this.form.controls['telegramNickname'].value.trim()
          : this.form.controls['telegramNickname'].value,
      ],
      whatsApp: [
        this.form.controls['whatsApp'].value
          ? this.completeContact(
              this.form.controls['whatsApp'].value,
              'whatsApp'
            )
          : this.form.controls['whatsApp'].value,
      ],
      vKontakte: [
        this.form.controls['vKontakte'].value
          ? this.completeContact(
              this.form.controls['vKontakte'].value,
              'vKontakte'
            )
          : this.form.controls['vKontakte'].value,
      ],
      instagram: [
        this.form.controls['instagram'].value
          ? this.completeContact(
              this.form.controls['instagram'].value,
              'instagram'
            )
          : this.form.controls['instagram'].value,
      ],
      facebook: [
        this.form.controls['facebook'].value
          ? this.completeContact(
              this.form.controls['facebook'].value,
              'facebook'
            )
          : this.form.controls['facebook'].value,
      ],
      otherContact: [this.form.controls['otherContact'].value],
    };

    let extraContacts: [{ type: string; contact: string }];
    extraContacts = this.extraContacts.getRawValue() as typeof extraContacts;
    for (let extraContact of extraContacts) {
      newUser.orderedContacts[
        extraContact.type as keyof typeof newUser.orderedContacts
      ].push(this.completeContact(extraContact.contact, extraContact.type));
    }
    console.log('newUser');
    console.log(newUser);
    this.checkDuplicates(newUser);
  }

  completeContact(value: string, type: string) {
    let result = '';

    switch (type) {
      case 'vKontakte':
        result = 'https://vk.com/' + value.trim();
        break;
      case 'instagram':
        result = 'https://www.instagram.com/' + value.trim();
        break;
      case 'facebook':
        result = 'https://www.facebook.com/' + value.trim();
        break;
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
        result = value;
    }
    return result;
  }

  checkDuplicates(newUser: User) {
    let contactDuplicates: { [key: string]: string[] } = {};

    for (let key in newUser.contacts) {
      let tempArray =
        newUser.orderedContacts[
          key as keyof typeof newUser.orderedContacts
        ].sort();
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
      this.checkUserName(newUser);
    }
  }

  checkUserName(newUser: User) {
    this.userService.checkUserName(newUser.userName).subscribe({
      next: (res) => {
        if (res.data) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Username ${newUser.userName} уже занято! Выберите другое.`,
            sticky: true,
          });
        } else {
          this.checkUserData(newUser);
        }
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }
  checkUserData(newUser: User) {
    this.userService.checkUserData(newUser).subscribe({
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
              this.createUser(newUser);
            },
            reject: () => {},
          });
        } else {
          this.createUser(newUser);
        }
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  createUser(newUser: User) {
    this.userService.createUser(newUser).subscribe({
      next: (res) => {
        this.dialogRef.close({userName: res.userName });
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  onCancelClick(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Вы уверены, что хотите выйти без сохранения?',
      header: 'Предупреждение',
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
        this.dialogRef.close({ success: false });
      },
      reject: () => {},
    });
  }
}

/* It looks like you're using the disabled attribute with a reactive form directive. If you set disabled to true
when you set up this control in your component class, the disabled attribute will actually be set in the DOM for
you. We recommend using this approach to avoid 'changed after checked' errors.

Example:
// Specify the `disabled` property at control creation time:
form = new FormGroup({
  first: new FormControl({value: 'Nancy', disabled: true}, Validators.required),
  last: new FormControl('Drew', Validators.required)
});

// Controls can also be enabled/disabled after creation:
form.get('first')?.enable();
form.get('last')?.disable(); */
