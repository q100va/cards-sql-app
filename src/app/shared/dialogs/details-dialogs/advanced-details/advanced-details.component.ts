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
  //AdvancedModel,
  //Owner,
  Contact,
  ContactType,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  OwnerRestoringData,
  OwnerDeletingData,
  //OwnerOutdatedData,
  //OwnerDraft,
  OwnerContacts,
  //OwnerChangingData,
  //OwnerOutdatingData,
  //BaseRestoringData,
  //BaseDeletingData,
  //BaseOutdatedData,
  Duplicates,
  UserRestoringData,
  NonTelegram,
  UserDraft,
  // BaseChangingData,
  //BaseOutdatingData,
  UserChangingData,
  PartnerChangingData,
  PartnerRestoringData,
  PartnerOutdatingData,
  UserOutdatingData,
  UserDeletingData,
  PartnerDeletingData,
  UserOutdatedData,
  PartnerOutdatedData,
  PartnerDraft,
  User,
  Partner,
  Kind,
  OwnerByKind,
  OwnerMainService,
  OwnerDraftByKind,
  ChangingByKind,
  RestoringByKind,
  OutdatingByKind,
  DeletingByKind,
  ListDto,
  OutdatedByKind,
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RoleService } from '../../../../services/role.service';
import { UserService } from '../../../../services/user.service';
import { PartnerService } from '../../../../services/partner.service';
import { UserDiffService } from '../../../../services/user-diff.service';
import { OwnerService } from '../../../../services/owner.service';

import { buildDuplicateInfoMessage } from '../../../../utils/user-diff';

import { OutdatedUserName } from '../../../../interfaces/user';
import { OutdatedHome } from '../../../../interfaces/partner';

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
  K extends Kind
> extends BaseDetailsComponent<OwnerByKind<K>> {
  private readonly contactUrl = inject(ContactUrlPipe);
  private readonly cdr = inject(ChangeDetectorRef);
  // DI
  readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  // private readonly userService = inject(UserService);
  //private readonly partnerService = inject(PartnerService);
  readonly userDiffService = inject(UserDiffService);
  private readonly ownerService = inject(OwnerService);
  readonly translate = inject(TranslateService);
  override kind!: K;

  protected service!: OwnerMainService<
    OwnerByKind<K>,
    OwnerDraftByKind<K>,
    ChangingByKind<K>,
    RestoringByKind<K>,
    OutdatingByKind<K>,
    DeletingByKind<K>,
    ListDto<K>
  >;

  protected readonly userService = inject(UserService) as OwnerMainService<
    User,
    UserDraft,
    UserChangingData,
    UserRestoringData,
    UserOutdatingData,
    UserDeletingData,
    { list: User[]; length: number }
  >;

  protected readonly partnerService = inject(
    PartnerService
  ) as OwnerMainService<
    Partner,
    PartnerDraft,
    PartnerChangingData,
    PartnerRestoringData,
    PartnerOutdatingData,
    PartnerDeletingData,
    { list: Partner[]; length: number }
  >;

  protected getService(): OwnerMainService<
    OwnerByKind<K>,
    OwnerDraftByKind<K>,
    ChangingByKind<K>,
    RestoringByKind<K>,
    OutdatingByKind<K>,
    DeletingByKind<K>,
    ListDto<K>
  > {
    const svc = this.kind === 'user' ? this.userService : this.partnerService;
    return svc as OwnerMainService<
      OwnerByKind<K>,
      OwnerDraftByKind<K>,
      ChangingByKind<K>,
      RestoringByKind<K>,
      OutdatingByKind<K>,
      DeletingByKind<K>,
      ListDto<K>
    >;
  }

  readonly dialog = inject(MatDialog);

  // View helpers
  sanitizeText = sanitizeText;

  // Data
  roles!: { id: number; name: string }[];
  existingOwner!: OwnerByKind<K> | null;

  restoringDataDraft!: RestoringByKind<K>;
  deletingDataDraft!: DeletingByKind<K>;
  outdatedDataDraft!: OutdatedByKind<K>;
  changingData!: ChangingByKind<K>;
  outdatingData!: OutdatingByKind<K>;
  mainProps!: (keyof NonNullable<ChangingByKind<K>['main']>)[];

  ownerDraft!: OwnerDraftByKind<K>;

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

  // getOwner() {}
  hasOutdatedNames = signal<boolean>(false);
  hasOutdatedContacts = signal<boolean>(false);
  hasOutdatedAddresses = signal<boolean>(false);
  hasOutdatedUserNames = signal<boolean>(false);
  hasOutdatedHomes = signal<boolean>(false);

  override ngOnInit(): void {
    super.ngOnInit();
    //this.existingOwner = this.getOwner();

    this.kind = this.data().componentType as K;
    this.existingOwner = this.data().object;
    console.log('this.existingOwner', this.existingOwner);
    if (this.existingOwner) {
      this.outdatedDataDraft = structuredClone(
        this.existingOwner!.outdatedData
      ) as OutdatedByKind<K>;
    } else {
      this.setEmptyOutdatedDataDraft();
    }
    this.setRestoringDataDraft();
    this.setDeletingDataDraft();
    this.setChangingData();
    this.setOutdatingData();
    this.mainForm.setValidators(this.data().mainContactsValidator!);
    this.mainForm.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onChangeValidation());

    // Load roles (with auto-unsubscribe)
    this.roleService
      .getRolesNamesList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => (this.roles = res.data),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OwnerDialog',
            stage: 'getRolesNamesList',
            kind: this.kind,
          }),
      });

    this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
    this.hasOutdatedContacts.set(
      Object.keys(this.outdatedDataDraft.contacts).length > 0
    );
    this.hasOutdatedAddresses.set(this.outdatedDataDraft.addresses.length > 0);
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
    const isQualified = this.kind === 'user' || this.kind === 'partner';
    // this.logInvalid(this.mainForm); //TODO: delete
    const disabled =
      (isQualified && !this.mainForm.valid) ||
      (!this.changesSignal() &&
        !this.deletingSignal() &&
        this.data().operation === 'view-edit');

    //  console.log('disabled', disabled);
    // console.log('FORM status:', this.mainForm.status);
    // console.log('FORM errors:', this.mainForm.errors);

    /*     const controls = this.mainForm.controls;
    for (const name of Object.keys(controls)) {
      const c = controls[name];
     console.log('CONTROL', name, 'status:', c.status, 'errors:', c.errors);
    }
 */
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
    type: keyof RestoringByKind<K>,
    data: Contact | OutdatedAddress | OutdatedFullName,
    //     | OutdatedUserName
    //    | OutdatedHome,
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
    type NameOrAddr = 'names' | 'addresses';
    const nameOrAddr = type as NameOrAddr;

    if (type === 'names' || type === 'addresses') {
      if (this.restoringDataDraft[nameOrAddr] !== null) {
        const restoredValue = this.existingOwner!.outdatedData[nameOrAddr].find(
          (item: OutdatedAddress | OutdatedFullName) =>
            item.id === this.restoringDataDraft[nameOrAddr]![0]
        );
        if (restoredValue)
          (this.outdatedDataDraft[nameOrAddr] as any[]).push(restoredValue);
        this.restoringDataDraft[nameOrAddr] = [];
      }
      //  }
      this.restoringDataDraft[nameOrAddr] = [data.id];

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
    this.deleteFromOutdatedDataDraft(type as keyof OutdatedByKind<K>, data.id);
    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }
  onDeleteOutdatedData(
    type: keyof DeletingByKind<K> | 'userNames' | 'homes',
    id: number
  ) {
    if (!(type in this.deletingDataDraft)) return;

    const current = (this.deletingDataDraft as any)[type] as number[] | null;
    const next = [...(current ?? []), id];
    (this.deletingDataDraft as any)[type] = next;

    if (type in this.outdatedDataDraft) {
      this.deleteFromOutdatedDataDraft(type as keyof OutdatedByKind<K>, id);
    }

    this.deletingSignal.set(true);
    this.checkIsSaveDisabled();
  }

  deleteFromOutdatedDataDraft(type: keyof OutdatedByKind<K>, id: number) {
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
    } else if (Array.isArray(this.outdatedDataDraft[type])) {
      const idx = this.outdatedDataDraft[type].findIndex((c) => c.id === id);
      if (idx !== -1) this.outdatedDataDraft[type].splice(idx, 1);
    }
  }

  // --- Save flows
  override onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.emitShowSpinner(true);
    this.action = action;
    this.ownerDraft = this.ownerService.buildDraft(
      this.kind,
      this.mainForm,
      this.addressFilter(),
      this.contactTypes,
      this.existingOwner
    );
    if ('userName' in this.ownerDraft) {
      this.checkUserName();
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

  /*   getService(kind: Kind): OwnerMainService<T, ChangingByKind<K>, RestoringByKind<K>, OutdatingByKind<K>, DeletingByKind<K>> {
    const svc = (
      {
        user: this.userService,
        partner: this.partnerService,
      } as const
    )[kind];
    if (!svc) throw new Error(`Unknown kind: ${kind}`);
    return svc;
  } */

  checkOwnerData() {
    const service = this.getService();
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
            source: 'CreateOwnerDialog',
            stage: 'checkOwnerData',
            kind: this.kind,
            owner: this.ownerDraft,
          });
          return of(null);
        },
      });
  }

  async savingFlow() {
    if (this.data().operation === 'create') {
      this.saveOwner();
    } else {
      await this.correctRestoringData();
      if (await this.checkOutdatedDataDuplicates()) {
        const updatingOwnerData = await this.checkAllChanges();
        this.saveUpdatedOwner(updatingOwnerData);
      } else {
        this.emitShowSpinner(false);
      }
    }
  }

  // --- Compare draft vs restoring/outdated
  //проверяем не изменил ли пользователь восстановленные данные
  //если изменил,
  // то помещаем их в outdatingDataDraft и удаляем из restoringDataDraft
  async correctRestoringData() {
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

    // Names
    if (this.restoringDataDraft.names?.length) {
      const names = await this.ownerService.corrNames(
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

    // Contacts
    if (this.restoringDataDraft.contacts) {
      const contacts = await this.ownerService.corrContacts(
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
    const address = await this.ownerService.checkAddress(
      this.outdatedDataDraft.addresses,
      this.ownerDraft.draftAddress
    );
    if (!address.restoringId) return false;
    if (address.restoringId > 0) {
      this.restoringDataDraft.addresses ??= [];
      this.restoringDataDraft.addresses.push(address.restoringId);
    }

    const names = await this.ownerService.checkNames(
      this.outdatedDataDraft.names,
      this.ownerDraft
    );
    if (!names.restoringId) return false;
    if (names.restoringId > 0) {
      this.restoringDataDraft.names ??= [];
      this.restoringDataDraft.names.push(names.restoringId);
    }

    const contacts = await this.ownerService.checkContacts(
      this.contactTypes,
      this.outdatedDataDraft.contacts,
      this.ownerDraft.draftContacts
    );
    if (!contacts.restoring) return false;
    if (Object.keys(contacts.restoring).length) {
      this.restoringDataDraft.contacts ??= {};
      for (const key of typedKeys(contacts.restoring)) {
        const vals = contacts.restoring[key] ?? [];
        (this.restoringDataDraft.contacts[key as NonTelegram] ??= []).push(
          ...vals
        );
      }
    }

    return true;
  }

  //формируем окончательные варианты измененных, восстановленных, удаляемых и неактуальных значений
  async checkAllChanges() {
    const deletingData: DeletingByKind<K> = structuredClone(
      this.deletingDataDraft
    );
    const restoringData: RestoringByKind<K> = structuredClone(
      this.restoringDataDraft
    );

    const names = await this.ownerService.diffNames(
      this.existingOwner!,
      this.ownerDraft
    );
    if (names.changes) this.changingData.main = names.changes;
    if (names.outdating) this.outdatingData.names = names.outdating;

    const address = await this.ownerService.diffAddress(
      this.existingOwner!,
      this.ownerDraft,
      restoringData.addresses == null ? null : restoringData.addresses![0]
    );
    if (address.changes) this.changingData.address = address.changes;
    if (address.outdatingId) this.outdatingData.address = address.outdatingId;
    if (address.deletingId) {
      deletingData.addresses ??= [];
      deletingData.addresses.push(address.deletingId);
    }

    const contacts = await this.ownerService.diffContacts(
      this.existingOwner!,
      this.ownerDraft,
      this.contactTypes,
      restoringData.contacts
    );
    console.log('contacts', contacts);

    if (contacts.changes) this.changingData.contacts = contacts.changes;
    if (contacts.outdatingIds)
      this.outdatingData.contacts = contacts.outdatingIds;
    console.log('deletingData.contacts', deletingData.contacts);
    if (contacts.deletingIds) {
      deletingData.contacts ??= [];
      deletingData.contacts.push(...contacts.deletingIds);
    }

    console.log('deletingData.contacts', deletingData.contacts);
    for (const key of this.mainProps) {
      const existing = this.existingOwner as Record<string, unknown>;
      const draft = this.ownerDraft as Record<string, unknown>;

      if (existing[key as string] !== draft[key as string]) {
        const currentMain =
          (this.changingData.main as NonNullable<
            ChangingByKind<K>['main']
          > | null) ?? ({} as NonNullable<ChangingByKind<K>['main']>);

        this.changingData.main = {
          ...currentMain,
          [key]: draft[key as string],
        } as NonNullable<ChangingByKind<K>['main']>;
      }
    }
    console.log('{ changes, restoringData, outdatingData, deletingData }', {
      changingData: this.changingData,
      restoringData,
      outdatingData: this.outdatingData,
      deletingData,
    });
    return {
      changingData: this.changingData,
      restoringData,
      outdatingData: this.outdatingData,
      deletingData,
    };
  }

  saveOwner() {
    const service = this.getService();
    service
      .saveOwner(this.ownerDraft)
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
            source: 'CreateOwnerDialog',
            stage: 'saveOwner',
            kind: this.kind,
            owner: this.ownerDraft,
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
    ) as OutdatedByKind<K>;
  }

  saveUpdatedOwner(upgradedOwnerData: {
    changingData: ChangingByKind<K>;
    restoringData: RestoringByKind<K>;
    outdatingData: OutdatingByKind<K>;
    deletingData: DeletingByKind<K>;
  }) {
    const service = this.getService();
    service
      .saveUpdatedOwner(this.existingOwner!.id, upgradedOwnerData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.emitShowSpinner(false))
      )
      .subscribe({
        next: (res) => {
          if (this.action === 'saveAndExit') {
            this.closeDialogDataSignal.set(res.data.lastName);
            this.emittedCloseDialogData.emit(res.data.lastName);
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
          this.existingOwner = this.data().object;
          console.log('this.existingOwner', this.existingOwner);
          if (this.existingOwner) {
            this.outdatedDataDraft = structuredClone(
              this.existingOwner!.outdatedData
            ) as OutdatedByKind<K>;
          }

          console.log('OOO - this.outdatedDataDraft', this.outdatedDataDraft);

          this.setHasOutdatedUserNames();
          this.setHasOutdatedHomes();
          this.hasOutdatedNames.set(this.outdatedDataDraft.names.length > 0);
          this.hasOutdatedContacts.set(
            Object.keys(this.outdatedDataDraft.contacts).length > 0
          );
          this.hasOutdatedAddresses.set(
            this.outdatedDataDraft.addresses.length > 0
          );

          console.log('this.hasOutdatedContacts', this.hasOutdatedContacts());

          this.addressFilterComponent.onChangeMode(
            'view',
            this.data().defaultAddressParams!
          );

          this.setRestoringDataDraft();
          this.setDeletingDataDraft();
          this.setChangingData();
          this.setOutdatingData();

          this.changeToViewMode(null);
          this.setInitialValues('view');
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'EditOwnerDialog',
            stage: 'saveUpdatedOwner',
            kind: this.kind,
            ownerId: this.existingOwner!.id,
          }),
      });
  }

  // badges (for template)
  setEmptyOutdatedDataDraft() {}
  setRestoringDataDraft() {}
  setDeletingDataDraft() {}
  setChangingData() {}
  setOutdatingData() {}
  hasRole(): boolean {
    return false;
  }
  hasAffiliation(): boolean {
    return false;
  }
  hasHomes(): boolean {
    return false;
  }
  setHasOutdatedUserNames() {}
  checkUserName() {}
  onChangePasswordClick() {}
  getRowSpanForUserNames() {
    return 0;
  }
  get outdatedUserNames(): OutdatedUserName[] {
    return [];
  }
  onRestoreOutdatedUserName(data: OutdatedUserName) {}

  setHasOutdatedHomes() {}
  getRowSpanForHomes() {
    return 0;
  }
  get coordinatedHomes(): OutdatedHome[] {
    return [];
  }
  get outdatedHomes(): OutdatedHome[] {
    return [];
  }
  onRestoreOutdatedHome(data: OutdatedHome) {}
}
