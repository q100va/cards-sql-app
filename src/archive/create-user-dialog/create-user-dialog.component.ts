import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  model,
  output,
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

import * as Validator from '../../app/shared/custom.validator';
import { AddressService } from '../../app/services/address.service';
import { User } from '../../app/interfaces/user';
import { UserService } from '../../app/services/user.service';
import { Router } from '@angular/router';
import { RoleService } from '../../app/services/role.service';
import { AddressFilterComponent } from '../../app/shared/address-filter/address-filter.component';
import { AddressFilterParams } from '../../app/interfaces/address-filter-params';
import { DefaultAddressParams } from '../../app/interfaces/default-address-params';
import { AddressFilter } from '../../app/interfaces/address-filter';

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
    AddressFilterComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUserDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  readonly data = inject<{
    type: 'user' | 'partner' | 'client';
    operation: 'create' | 'view-edit';
    defaultAddressParams: DefaultAddressParams;
    user?: User;
    creationTitle: string;
    viewTitle: string;
  }>(MAT_DIALOG_DATA);

  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  title =
    this.data.operation == 'create'
      ? this.data.creationTitle
      : this.data.viewTitle;

  isEditMode = false;
  onChangeMode = output<string>();
  changes = false;

  params: AddressFilterParams = {
    source: 'userCard',
    multiple: false,
    cols: '2',
    gutterSize: '16px',
    rowHeight: '76px',
    isShowCountry: true,
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: true,
    class: "none",
  };

  addressFilter = signal<AddressFilter>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });

  invalidAddressFilter = true;


  defaultAddressParams: DefaultAddressParams = {
    localityId: null,
    districtId: null,
    regionId: null,
    countryId: null,
  };

  roles!: { id: number; name: string }[];

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

  mainForm = new FormGroup<Record<string, AbstractControl | FormGroup>>(
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
    return this.mainForm.get('extraContacts') as FormArray;
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
  }

  addIfRestricted() {
    if (this.mainForm.controls['isRestricted'].value) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl(null, Validators.required)
      );
    } else {
      this.mainForm.removeControl('causeOfRestriction');
    }
  }

  modifyContactTypesList() {
    for (let contact of this.contactTypes) {
      if (this.mainForm.controls[contact.type].value) {
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

  deleteContactControl(index: number) {
    this.extraContacts.removeAt(index);
  }

  onSaveClick(action: 'justSave' | 'saveAndExit') {
    console.log('SAVE');
    const newUser = {} as User;
    newUser.userName = this.mainForm.controls['userName'].value?.trim();
    newUser.password = this.mainForm.controls['password'].value;
    newUser.firstName = this.mainForm.controls['firstName'].value?.trim();
    newUser.patronymic = this.mainForm.controls['patronymic'].value?.trim();
    newUser.lastName = this.mainForm.controls['lastName'].value?.trim();
    newUser.roleId = this.mainForm.controls['role'].value;
    newUser.addresses = [
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
    newUser.comment = this.mainForm.controls['comment'].value;
    newUser.isRestricted = this.mainForm.controls['isRestricted'].value;
    newUser.causeOfRestriction = this.mainForm.controls['isRestricted'].value
      ? this.mainForm.controls['causeOfRestriction'].value
      : null;
    newUser.dateOfRestriction = this.mainForm.controls['isRestricted'].value
      ? new Date()
      : null;
    newUser.orderedContacts = {
      email: [this.mainForm.controls['email'].value],
      phoneNumber: [
        this.completeContact(
          this.mainForm.controls['phoneNumber'].value,
          'phoneNumber'
        ),
      ],
      telegramId: [this.mainForm.controls['telegramId'].value],
      telegramPhoneNumber: [
        this.completeContact(
          this.mainForm.controls['telegramPhoneNumber'].value,
          'telegramPhoneNumber'
        ),
      ],
      telegramNickname: [
        this.mainForm.controls['telegramNickname'].value
          ? this.mainForm.controls['telegramNickname'].value.trim()
          : this.mainForm.controls['telegramNickname'].value,
      ],
      whatsApp: [
        this.mainForm.controls['whatsApp'].value
          ? this.completeContact(
              this.mainForm.controls['whatsApp'].value,
              'whatsApp'
            )
          : this.mainForm.controls['whatsApp'].value,
      ],
      vKontakte: [
        this.mainForm.controls['vKontakte'].value
          ? this.completeContact(
              this.mainForm.controls['vKontakte'].value,
              'vKontakte'
            )
          : this.mainForm.controls['vKontakte'].value,
      ],
      instagram: [
        this.mainForm.controls['instagram'].value
          ? this.completeContact(
              this.mainForm.controls['instagram'].value,
              'instagram'
            )
          : this.mainForm.controls['instagram'].value,
      ],
      facebook: [
        this.mainForm.controls['facebook'].value
          ? this.completeContact(
              this.mainForm.controls['facebook'].value,
              'facebook'
            )
          : this.mainForm.controls['facebook'].value,
      ],
      otherContact: [this.mainForm.controls['otherContact'].value],
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
/*     this.userService.checkUserName(newUser.userName).subscribe({
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
    }); */
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
/*     this.userService.createUser(newUser).subscribe({
      next: (res) => {
        this.dialogRef.close({ userName: res.userName });
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

  onEditClick() {
    this.isEditMode = true;
    this.changes = false;
    this.mainForm.controls['toponymName'].enable();
    this.mainForm.controls['toponymShortName'].enable();
    this.mainForm.controls['toponymPostName'].enable();
    this.mainForm.controls['toponymShortPostName'].enable();
    this.mainForm.controls['federalCity'].enable();
    this.mainForm.controls['capitalOfRegion'].enable();
    this.mainForm.controls['capitalOfDistrict'].enable();
    this.invalidAddressFilter = false;
    this.addressFilterComponent.onChangeMode('edit', null);
  }

  onViewClick() {
    console.log('this.addressFilter()', this.addressFilter());
    if (this.changes) {
      this.confirmationService.confirm({
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
/*           this.mainForm.controls['toponymName'].setValue(
            this.data.toponym!['name']
          );
          this.mainForm.controls['toponymShortName'].setValue(
            this.data.toponym!['shortName']
          );
          this.mainForm.controls['toponymPostName'].setValue(
            this.data.toponym!['postName']
          );
          this.mainForm.controls['toponymShortPostName'].setValue(
            this.data.toponym!['shortPostName']
          );
          this.mainForm.controls['federalCity'].setValue(
            this.data.toponym!['isFederalCity']
          );
          this.mainForm.controls['capitalOfRegion'].setValue(
            this.data.toponym!['isCapitalOfRegion']
          );
          this.mainForm.controls['capitalOfDistrict'].setValue(
            this.data.toponym!['isCapitalOfDistrict']
          ); */
          this.changeToViewMode(this.data.defaultAddressParams);
        },
        reject: () => {},
      });
    } else {
      this.changeToViewMode(null);
    }
  }

  changeToViewMode(addressParams: any) {
    this.isEditMode = false;
/*     this.mainForm.controls['toponymName'].disable();
    this.mainForm.controls['toponymShortName'].disable();
    this.mainForm.controls['toponymPostName'].disable();
    this.mainForm.controls['toponymShortPostName'].disable();
    this.mainForm.controls['federalCity'].disable();
    this.mainForm.controls['capitalOfRegion'].disable();
    this.mainForm.controls['capitalOfDistrict'].disable(); */
    this.invalidAddressFilter = false;
    this.addressFilterComponent.onChangeMode('view', addressParams);
  }


}
