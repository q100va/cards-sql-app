// src/app/shared/dialogs/details-dialogs/advances-details/advanced-details.component.ts
import {
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import {
  FormControl,
  FormArray,
  AbstractControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ContactUrlPipe } from '../../../../utils/contact-url.pipe';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import {
  AdvancedModel,
  Owner,
  Contact,
  ContactType,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  //OwnerRestoringData,
  //OwnerDeletingData,
  //OwnerOutdatedData,
  OwnerDraft,
  OwnerContacts,
  OwnerChangingData,
  OwnerOutdatingData,
  BaseRestoringData,
  BaseDeletingData,
  RestoreKeyFor,
  BaseOutdatedData,
  DeleteKeyFor,
  OutdatedKeyFor,
  DeleteKeyIn,
  OutdatedKeyIn,
  OutdatedItemFor,
  Kind,
} from '../../../../interfaces/advanced-model';
import { AddressKey, typedKeys } from '../../../../interfaces/toponym';

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

import { RoleService } from '../../../../services/role.service';
import { UserService } from '../../../../services/user.service';
import { PartnerService } from '../../../../services/partner.service';
import { UserDiffService } from '../../../../services/user-diff.service';
import { OwnerService } from '../../../../services/owner.service';

import { buildDuplicateInfoMessage } from '../../../../utils/user-diff';

import { OutdatedUserName, UserDuplicates } from '../../../../interfaces/user';
import {
  OutdatedHome,
  PartnerDuplicates,
} from '../../../../interfaces/partner';

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
import { zodValidator } from '../../../../utils/zod-validator';
import { sanitizeText } from '../../../../utils/sanitize-text';
import { debounceTime, finalize, Observable, of } from 'rxjs';
import { DefaultAddressParams } from '@shared/dist/toponym.schema';

import * as Validator from '../../../../utils/custom.validator';

type NumArrayFor<T, K extends keyof T> = Extract<NonNullable<T[K]>, number[]>;

type ApiResponse<T> = { data: T };
interface OwnerDetailsService<T> {
  checkOwnerData(
    ownerDraft: OwnerDraft
  ): Observable<ApiResponse<UserDuplicates | PartnerDuplicates>>;
  getById(id: number): Observable<ApiResponse<T>>;
}

@Component({
  selector: 'app-advanced-details',
  standalone: true,
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
    TranslateModule,
  ],
  providers: [],
  templateUrl: './advanced-details.component.html',
  styleUrl: './advanced-details.component.css',
})
export class AdvancedDetailsComponent<
  T extends AdvancedModel,
  RD extends BaseRestoringData = BaseRestoringData,
  DD extends BaseDeletingData = BaseDeletingData,
  OD extends BaseOutdatedData = BaseOutdatedData
> extends BaseDetailsComponent<T> {
  private readonly contactUrl = inject(ContactUrlPipe);
  private readonly cdr = inject(ChangeDetectorRef);
  // DI
  readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UserService);
  private readonly partnerService = inject(PartnerService);
  private readonly userDiffService = inject(UserDiffService);
  private readonly ownerService = inject(OwnerService);
  readonly dialog = inject(MatDialog);

  // View helpers
  sanitizeText = sanitizeText;

  // Data
  roles!: { id: number; name: string }[];
  existingOwner!: Owner | null;

  restoringDataDraft!: RD /* = {
    addresses: null,
    names: null,
    userNames: null,
    contacts: null,
    homes: null,
  } */;
  deletingDataDraft!: DD /* = {
    addresses: null,
    names: null,
    userNames: null,
    contacts: null,
    homes: null,
  } */;
  outdatedDataDraft!: OD /*  = {
    contacts: {},
    addresses: [],
    names: [],
    userNames: [],
    homes: [],
  } */;

  ownerDraft!: OwnerDraft;

  affiliations = [
    'PARTNER.AFF.VOLUNTEER_COORDINATOR',
    'PARTNER.AFF.HOME_REPRESENTATIVE',
    'PARTNER.AFF.FOUNDATION_STAFF',
  ];
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

  getOwner() {}

  override ngOnInit(): void {
    super.ngOnInit();
    //this.existingOwner = this.getOwner();

    this.mainForm.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onChangeValidation());

    this.mainForm.setValidators([Validator.mainContactsValidator]);

    // Load roles (with auto-unsubscribe)
    this.roleService
      .getRolesNamesList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => (this.roles = res.data),
        error: (err) => this.msgWrapper.handle(err),
      });
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
      (this.isEditModeSignal() && !this.existingOwner!['isRestricted']) ||
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

  //TODO: delete ////////////////////////////////
  /*   logInvalid(ctrl: AbstractControl, path: string = ''): void {
    const here = path || '(root)';
    if (
      ctrl.invalid &&
      (ctrl.touched || ctrl.dirty || ctrl.updateOn === 'submit')
    ) {
      console.groupCollapsed('❌ Invalid:', here, '=>', ctrl.errors || {});
      console.log('errors:', ctrl.errors);
      console.log('value:', ctrl.value);

    }
    if ((ctrl as any).controls) {
      const controls =
        (ctrl as FormGroup).controls ?? (ctrl as FormArray).controls;
      for (const key of Object.keys(controls)) {
        const child = (controls as any)[key];
        const nextPath = Array.isArray(controls)
          ? `${here}[${key}]`
          : here === '(root)'
          ? key
          : `${here}.${key}`;
        this.logInvalid(child, nextPath);
      }
    }
  } */ /*     console.groupEnd();
    console.log('form.errors =', this.mainForm.errors);
    console.log('form.status =', this.mainForm.status);        // INVALID | PENDING | VALID
console.log('form.pending =', this.mainForm.pending);      // true/false*/
  /////////////////////////////////////////////////

  // Enable/disable Save button
  override checkIsSaveDisabled(): void {
    const isUser = this.data().componentType === 'user';
    // this.logInvalid(this.mainForm); //TODO: delete
    const disabled =
      (isUser && !this.mainForm.valid) ||
      (!this.changesSignal() &&
        !this.deletingSignal() &&
        this.data().operation === 'view-edit');
    //  console.log('disabled', disabled);

    this.IsSaveDisabledSignal.set(disabled);
    this.emittedIsSaveDisabled.emit(disabled);
  }

  // Optional extra validation gates (true => changes detected)
  protected override additionalValidationHooks(): boolean {
    /*     console.log(
      'this.contactsChangeValidation()',
      this.contactsChangeValidation()
    );
    console.log(
      'this.addressChangeValidation()',
      this.addressChangeValidation()
    ); */

    return this.contactsChangeValidation() || this.addressChangeValidation();
  }

  // Compare contacts between form and original orderedContacts
  private contactsChangeValidation(): boolean {
    const ordered: OwnerContacts = this.object!['orderedContacts'];

    for (const type of this.contactTypes) {
      const original = ordered?.[type] ?? [];
      const current: string[] = this.getFormArray(type)
        .getRawValue()
        .filter(Boolean);

      // console.log('original', original);
      //  console.log('current', current);

      // lengths differ -> changed
      if (original.length !== current.length) return true;

      // content differs -> changed
      const originalSet = new Set(original.map((c) => c.content));
      const currentSet = new Set(current);

      if (originalSet.size !== currentSet.size) return true;

      for (const v of currentSet) {
        if (!originalSet.has(v)) return true;
      }
    }
    return false;
  }

  // Compare address selection against original address (country/region/district/locality)
  private addressChangeValidation(): boolean {
    const address = this.object!['address'];
    const filter = this.addressFilter();

    const keyMap: Record<
      'country' | 'region' | 'district' | 'locality',
      AddressKey
    > = {
      country: 'countries',
      region: 'regions',
      district: 'districts',
      locality: 'localities',
    };

    for (const key of typedKeys(keyMap)) {
      const originalId = address[key]?.id ?? null;
      const selectedIds = filter[keyMap[key]];
      const selectedId = Array.isArray(selectedIds)
        ? selectedIds[0] ?? null
        : null;

      if (originalId !== selectedId) return true;
    }
    return false;
  }

  // Seed form with initial values; transform contacts for view-mode
  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);
    console.log('setInitialValues');

    const ordered = this.object!['orderedContacts'];
    const toView = (val: string, type: string) =>
      mode === 'view' ? this.contactUrl.transform(val, type) : val;

    for (const type of this.contactTypes) {
      const formArray = this.getFormArray(type);
      const values = ordered?.[type] ?? [];
      const validators =
        this.data().controls.find((c) => c.controlName === type)?.validators ||
        [];

      let diff = values.length - formArray.length;
      /*       console.log('values.length', type, values.length);
      console.log('formArray.length', type, formArray.length);
      console.log('diff', type, diff); */

      while (diff > 0) {
        formArray.push(
          new FormControl(
            {
              value: null,
              disabled: mode === 'view',
            },
            validators
          )
        );
        diff--;
      }

      while (diff < 0 && formArray.length > 1) {
        formArray.removeAt(formArray.length - 1);
        diff++;
      }

      if (values.length) {
        for (let i = 0; i < values.length; i++) {
          formArray.at(i)?.setValue(toView(values[i].content, type));
        }
      } else {
        // show non-breaking space in view mode, null in edit/create
        formArray.at(0)?.setValue(mode === 'view' ? '\u00A0' : null);
        /*         formArray.push(
          new FormControl(
            {
              value: mode === 'view' ? '\u00A0' : null,
              disabled: mode === 'view',
            },
            validators
          )
        ); */
      }
    }
  }

  // --- Outdated data actions
  onRestoreOutdatedData(
    type: RestoreKeyFor<RD>,
    data:
      | Contact
      | OutdatedAddress
      | OutdatedFullName
      | OutdatedUserName
      | OutdatedHome,
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
    }

    //для этих типов восстановить можно только одно значение,
    //поэтому проверяем, были ли уже восстановленные значения,
    //если были, то удаляем их их restoringDataDraft и помещаем в outdatingDataDraft

    if (type === 'names' || type === 'addresses') {
      if ((this.restoringDataDraft[type] ?? []).length > 0) {
        const restoredValue = this.existingOwner!.outdatedData[type].find(
          (item: OutdatedAddress | OutdatedFullName) =>
            item.id === this.restoringDataDraft[type]![0]
        );
        if (restoredValue)
          (this.outdatedDataDraft[type] as any[]).push(restoredValue);
        this.restoringDataDraft[type] = [];
      }
      //  }
      this.restoringDataDraft[type] = [data.id];

      switch (type) {
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
    if ('homes' in this.existingOwner! && type === 'homes') {
    }
    //восстанавливаемые значения удаляем из outdatingDataDraft
    this.deleteFromOutdatedDataDraft(type as OutdatedKeyIn<OD>, data.id);
    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }
  onDeleteOutdatedData<K extends DeleteKeyIn<DD>>(type: K, id: number) {
    // гарантируем инициализацию массива под ключом
    this.deletingDataDraft[type] ??= [] as unknown as NumArrayFor<DD, K>;
    // теперь можно пушить
    (this.deletingDataDraft[type] as unknown as number[]).push(id);

    // удаляем из outdated-драфта по id (ключи согласованы)
    this.deleteFromOutdatedDataDraft(type as OutdatedKeyIn<OD>, id);

    this.deletingSignal.set(true);
    this.checkIsSaveDisabled();
  }
  /*    onDeleteOutdatedData<K extends DeleteKeyIn<DD>>(type: K, id: number) {
    this.deletingDataDraft[type] ??= [];
    this.deletingDataDraft[type]!.push(id);
    this.deleteFromOutdatedDataDraft(type as keyof OD, id);
    this.deletingSignal.set(true);
    this.checkIsSaveDisabled();
  } */

  /*   onDeleteOutdatedData<K extends DeleteKeyFor<DD>>(type: K, id: number) {
    this.deletingDataDraft[type] ??= [] as unknown as NumArrayFor<DD, K>;
    (this.deletingDataDraft[type] as unknown as number[]).push(id);

    this.deleteFromOutdatedDataDraft(type as OutdatedKeyFor<OD>, id);
    this.deletingSignal.set(true);
    this.checkIsSaveDisabled();
  } */
  /*
  deleteFromOutdatedDataDraft<K extends OutdatedKeyFor<OD>>(type: K, id: number) {
  const arr = this.outdatedDataDraft[type] as unknown as OutdatedItemFor<OD, K>[];
  const next = (arr ?? []).filter((x) => (x as any).id !== id);
  (this.outdatedDataDraft[type] as unknown as OutdatedItemFor<OD, K>[]) = next;
} */

  deleteFromOutdatedDataDraft<K extends OutdatedKeyIn<OD>>(
    type: K,
    id: number
  ) {
    const arr = (this.outdatedDataDraft[type] ??
      []) as unknown as OutdatedItemFor<OD, K>[];
    const next = arr.filter((x) => (x as any).id !== id);
    (this.outdatedDataDraft[type] as unknown as OutdatedItemFor<OD, K>[]) =
      next;
  }

  /*   deleteFromOutdatedDataDraft(type: keyof OD, id: number) {
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
  } */

  // --- Save flows
  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.emitShowSpinner(true);
    this.action = action;
    this.ownerDraft = this.ownerService.buildDraft(
      this.kind as Kind,
      this.mainForm,
      this.addressFilter(),
      this.contactTypes,
      this.existingOwner
    );
    if ('userName' in this.ownerDraft) {
      this.userService
        .checkUserName(this.ownerDraft.userName ?? '', this.ownerDraft.id)
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
    } else {
      this.checkDuplicates();
    }
  }

  checkDuplicates() {
    const contactDuplicates = {} as Record<
      Exclude<ContactType, 'telegram'>,
      string[]
    >;

    for (const key of typedKeys(this.ownerDraft.draftContacts)) {
      const temp = this.ownerDraft.draftContacts[key].sort();
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
      this.checkOwnerData();
    }
  }

  getService(kind: Kind): OwnerDetailsService<Owner> {
    const svc = (
      {
        user: this.userService,
        partner: this.partnerService,
      } as const
    )[kind];
    if (!svc) throw new Error(`Unknown kind: ${kind}`);
    return svc as OwnerDetailsService<Owner>;
  }

  checkOwnerData() {
    const service = this.getService(this.kind as Kind);
    service
      .checkOwnerData(this.ownerDraft)
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
            kind: this.kind,
            object: this.ownerDraft,
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
        this.ownerDraft.draftAddress,
        this.existingOwner!.outdatedData.addresses
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
          firstName: this.ownerDraft.firstName,
          patronymic: this.ownerDraft.patronymic,
          lastName: this.ownerDraft.lastName,
        },
        this.existingOwner!.outdatedData.names
      );
      this.restoringDataDraft.names = structuredClone(names.restoring);
      this.outdatedDataDraft.names = structuredClone(names.outdating);
    }

    // UserNames
    if (this.restoringDataDraft.userNames?.length) {
      const userNames = await this.userDiffService.corrUserNames(
        this.restoringDataDraft.userNames,
        this.outdatedDataDraft.userNames,
        this.ownerDraft.userName,
        this.existingOwner!.outdatedData.userNames
      );
      this.restoringDataDraft.userNames = structuredClone(userNames.restoring);
      this.outdatedDataDraft.userNames = structuredClone(userNames.outdating);
    }

    // Contacts
    if (this.restoringDataDraft.contacts) {
      const contacts = await this.userDiffService.corrContacts(
        this.restoringDataDraft.contacts,
        this.outdatedDataDraft.contacts,
        this.ownerDraft.draftContacts
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
      this.ownerDraft.draftAddress
    );
    if (!address.restoringId) return false;
    if (address.restoringId > 0) {
      this.restoringDataDraft.addresses ??= [];
      this.restoringDataDraft.addresses.push(address.restoringId);
    }

    const names = await this.userDiffService.checkNames(
      this.outdatedDataDraft.names,
      this.ownerDraft
    );
    if (!names.restoringId) return false;
    if (names.restoringId > 0) {
      this.restoringDataDraft.names ??= [];
      this.restoringDataDraft.names.push(names.restoringId);
    }

    const userName = await this.userDiffService.checkUserNames(
      this.outdatedDataDraft.userNames,
      this.ownerDraft.userName
    );
    if (!userName.restoringId) return false;
    if (userName.restoringId > 0) {
      this.restoringDataDraft.userNames ??= [];
      this.restoringDataDraft.userNames.push(userName.restoringId);
    }

    const contacts = await this.userDiffService.checkContacts(
      this.contactTypes,
      this.outdatedDataDraft.contacts,
      this.ownerDraft.draftContacts
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
    const changes: OwnerChangingData = {
      main: null,
      contacts: null,
      address: null,
    };
    const outdatingData: OwnerOutdatingData = {
      address: null,
      names: null,
      userName: null,
      contacts: null,
    };
    const deletingData: OwnerDeletingData = structuredClone(
      this.deletingDataDraft
    );
    const restoringData: OwnerRestoringData = structuredClone(
      this.restoringDataDraft
    );

    const names = await this.userDiffService.diffNames(
      this.existingOwner!,
      this.ownerDraft
    );
    if (names.changes) changes.main = names.changes;
    if (names.outdating) outdatingData.names = names.outdating;

    const userName = await this.userDiffService.diffUserName(
      this.existingOwner!,
      this.ownerDraft
    );
    if (userName.changes)
      changes.main = {
        ...(changes.main ?? {}),
        ...{ userName: userName.changes },
      };
    if (userName.outdating) outdatingData.userName = userName.outdating;

    const address = await this.userDiffService.diffAddress(
      this.existingOwner!,
      this.ownerDraft,
      (restoringData.addresses ?? []).length > 0
        ? restoringData.addresses![0]
        : null
    );
    if (address.changes) changes.address = address.changes;
    if (address.outdatingId) outdatingData.address = address.outdatingId;
    if (address.deletingId)
      (deletingData.addresses ?? []).push(address.deletingId);

    const contacts = await this.userDiffService.diffContacts(
      this.existingOwner!,
      this.ownerDraft,
      this.contactTypes,
      restoringData.contacts
    );
    if (contacts.changes) changes.contacts = contacts.changes;
    if (contacts.outdatingIds) outdatingData.contacts = contacts.outdatingIds;
    if (contacts.deletingIds)
      (deletingData.contacts ?? []).push(...contacts.deletingIds);

    type MainKeys = keyof NonNullable<OwnerChangingData['main']>;
    const mainProps: MainKeys[] = [
      'roleId',
      'comment',
      'isRestricted',
      'causeOfRestriction',
      'dateOfRestriction',
    ];
    for (const prop of mainProps) {
      const key = prop as keyof Owner & keyof ownerDraft;
      if (this.existingOwner![key] != this.ownerDraft[key]) {
        changes.main = {
          ...(changes.main || {}),
          [key]: this.ownerDraft[key],
        } as NonNullable<OwnerChangingData['main']>;
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
      .saveUser(this.ownerDraft)
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
            name: this.ownerDraft.userName,
          }),
      });
  }
  // View-mode: set outdated data
  protected override changeToViewMode(
    addressParams: DefaultAddressParams | null
  ) {
    super.changeToViewMode(addressParams);
    this.outdatedDataDraft = structuredClone(
      this.existingOwner!.outdatedData
    ) as OwnerOutdatedData;
  }

  saveUpdatedUser(upgradedUserData: {
    changes: OwnerChangingData;
    restoringData: OwnerRestoringData;
    outdatingData: OwnerOutdatingData;
    deletingData: OwnerDeletingData;
  }) {
    this.userService
      .saveUpdatedUser(this.existingOwner!.id, upgradedUserData)
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
            this.existingOwner!.outdatedData
          ) as OwnerOutdatedData;

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
            userId: this.existingOwner!.id,
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
