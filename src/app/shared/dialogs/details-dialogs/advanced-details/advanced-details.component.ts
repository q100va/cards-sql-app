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
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ContactUrlPipe } from '../../../../utils/contact-url.pipe';
import { BaseDetailsComponent } from '../base-details/base-details.component';
import {
  Contact,
  ContactType,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  OwnerContacts,
  NonTelegram,
  Kind,
  User,
  UserDraft,
  UserChangingData,
  UserOutdatingData,
  UserDeletingData,
  UserRestoringData,
  Partner,
  PartnerDraft,
  PartnerChangingData,
  PartnerRestoringData,
  PartnerOutdatingData,
  PartnerDeletingData,
  Volunteer,
  VolunteerDraft,
  VolunteerChangingData,
  VolunteerRestoringData,
  VolunteerOutdatingData,
  VolunteerDeletingData,
  OwnerByKind,
  OwnerMainService,
  OwnerDraftByKind,
  ChangingByKind,
  RestoringByKind,
  OutdatingByKind,
  DeletingByKind,
  ListDto,
  OutdatedByKind,
  Home,
  HomeDraft,
  HomeChangingData,
  HomeRestoringData,
  HomeOutdatingData,
  HomeDeletingData,
  OutdatedOfficialName,
  OutdatedCoordination,
  RelationPick,
  OutdatedHomeAddress,
  OutdatedUserName,
  OutdatedInstitute,
  Subscription,
  Cooperation,
  InstituteFormGroup,
  Senior,
  SeniorDraft,
  SeniorChangingData,
  SeniorRestoringData,
  SeniorOutdatingData,
  SeniorDeletingData,
  OptionalContacts,
  UserContacts,
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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { RoleService } from '../../../../services/role.service';
import { UserService } from '../../../../services/user.service';
import { PartnerService } from '../../../../services/partner.service';
import { VolunteerService } from '../../../../services/volunteer.service';

import {
  buildDuplicateInfoMessage,
  normalize,
} from '../../../../utils/owner-ctrls';

import {
  causeOfRestrictionControlSchema,
  emailControlSchema,
  facebookControlSchema,
  instagramControlSchema,
  phoneNumberControlSchema,
  telegramIdControlSchema,
  telegramNicknameControlSchema,
  vKontakteControlSchema,
  websiteControlSchema,
} from '../../../../../../shared/schemas/user.schema';
import { zodValidator } from '../../../../utils/zod-validator';
import { sanitizeText } from '../../../../utils/sanitize-text';
import { BehaviorSubject, debounceTime, finalize, Observable, of, shareReplay } from 'rxjs';
import { DefaultAddressParams } from '../../../../../../shared/schemas/toponym.schema';
import { AuthUser } from '../../../../../../shared/schemas/auth.schema';
import { AuthService } from '../../../../services/auth.service';
import { HomeService } from '../../../../services/home.service';
import { coordinationNameControlSchema } from '../../../../../../shared/schemas/common.schema';
import { SeniorService } from '../../../../services/senior.service';
import { buildDraft } from '../../../../utils/owner-draft.builder';
import {
  reconcileRestoredAddress,
  reconcileRestoredContacts,
  reconcileRestoredCoordinations,
  reconcileRestoredHomeAddress,
  reconcileRestoredInstitutes,
  reconcileRestoredNames,
  reconcileRestoredOfficialNames,
  reconcileRestoredUserNames,
} from '../../../../utils/owner-restoration-reconcile.util';
import { OwnerRestorationGuardService } from '../../../../services/owner-restoration-guard.service';
import { OwnerChangesPlannerService } from '../../../../services/owner-changes-planner.service';

/* type PersonKind = Exclude<Kind, 'home'>;
type ContactsOwner = Exclude<Kind, 'senior'>;
type CoordinationsOwner = Extract<Kind, 'partner' | 'home'>; */
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
    MatCheckboxModule,
    MatAutocompleteModule,
  ],
  providers: [],
  templateUrl: './advanced-details.component.html',
  styleUrl: './advanced-details.component.css',
})
export class AdvancedDetailsComponent<
  K extends Kind,
> extends BaseDetailsComponent<OwnerByKind<K>> {
  get existingOwner(): OwnerByKind<K> | null {
    return this.data().object;
  }

  private readonly contactUrl = inject(ContactUrlPipe);
  private readonly cdr = inject(ChangeDetectorRef);
  // DI
  readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);

  readonly ownerRestorationGuardService = inject(OwnerRestorationGuardService);
  readonly ownerChangesPlannerService = inject(OwnerChangesPlannerService);
  readonly translate = inject(TranslateService);
  readonly auth = inject(AuthService);

  // Текущий пользователь
  readonly user = toSignal<AuthUser | null>(this.auth.currentUser$, {
    initialValue: null,
  });
  declare kind: K;
  ownerDraft!: OwnerDraftByKind<K>;
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
    PartnerService,
  ) as OwnerMainService<
    Partner,
    PartnerDraft,
    PartnerChangingData,
    PartnerRestoringData,
    PartnerOutdatingData,
    PartnerDeletingData,
    { list: Partner[]; length: number }
  >;

  protected readonly volunteerService = inject(
    VolunteerService,
  ) as OwnerMainService<
    Volunteer,
    VolunteerDraft,
    VolunteerChangingData,
    VolunteerRestoringData,
    VolunteerOutdatingData,
    VolunteerDeletingData,
    { list: Volunteer[]; length: number }
  >;

  protected readonly homeService = inject(HomeService) as OwnerMainService<
    Home,
    HomeDraft,
    HomeChangingData,
    HomeRestoringData,
    HomeOutdatingData,
    HomeDeletingData,
    { list: Home[]; length: number }
  >;

  protected readonly seniorService = inject(SeniorService) as OwnerMainService<
    Senior,
    SeniorDraft,
    SeniorChangingData,
    SeniorRestoringData,
    SeniorOutdatingData,
    SeniorDeletingData,
    { list: Senior[]; length: number }
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
    const svc =
      this.kind === 'user'
        ? this.userService
        : this.kind === 'partner'
          ? this.partnerService
          : this.kind === 'volunteer'
            ? this.volunteerService
            : this.kind === 'home'
              ? this.homeService
              : this.seniorService;
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
  // existingOwner!: OwnerByKind<K> | null;

  restoringDataDraft!: RestoringByKind<K>;
  deletingDataDraft!: DeletingByKind<K>;
  //deletingData!: DeletingByKind<K>;
  outdatedDataDraft!: OutdatedByKind<K>;
  changingData!: ChangingByKind<K>;
  outdatingData!: OutdatingByKind<K>;
  mainProps!: (keyof NonNullable<ChangingByKind<K>['main']>)[];

  affiliations = [
    'PARTNER.AFF.VOLUNTEER_COORDINATOR',
    'PARTNER.AFF.HOME_REPRESENTATIVE',
    'PARTNER.AFF.FOUNDATION_STAFF',
  ];

  categories = [
    'VOLUNTEER.CATEGORIES.SCHOOL',
    'VOLUNTEER.CATEGORIES.KINDERGARTEN',
    'VOLUNTEER.CATEGORIES.COLLEGE',
    'VOLUNTEER.CATEGORIES.UNIVERSITY',
    'VOLUNTEER.CATEGORIES.GOVERNMENT',
    'VOLUNTEER.CATEGORIES.BUSINESS',
    'VOLUNTEER.CATEGORIES.CHURCH',
    'VOLUNTEER.CATEGORIES.CHARITY',
    'VOLUNTEER.CATEGORIES.CHILDREN',
    'VOLUNTEER.CATEGORIES.YOUTH',
    'VOLUNTEER.CATEGORIES.ADULTS',
    'VOLUNTEER.CATEGORIES.OTHER',
  ];

  genders = ['male', 'female'];

  //  genders = ['TABLE.NOTES.MALE', 'TABLE.NOTES.FEMALE'];

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
    { name: 'website', availableForExtra: false },
  ];
  availableContactTypes: Exclude<ContactType, 'telegram' | 'otherContact'>[] =
    [];

  // getOwner() {}
  hasOutdatedNames = signal<boolean>(false);
  hasOutdatedContacts = signal<boolean>(false);
  hasOutdatedAddresses = signal<boolean>(false);
  hasOutdatedUserNames = signal<boolean>(false);
  hasOutdatedOfficialNames = signal<boolean>(false);
  //hasOutdatedHomes = signal<boolean>(false);
  hasOutdatedInstitutes = signal<boolean>(false);
  hasOutdatedCoordinations = signal<boolean>(false);
  hasPostalAddress = signal<boolean>(false);
  hasStatus = signal<boolean>(false);
  homeOpen = signal<boolean>(true);
  homeOrPartner = signal<'home' | 'partner' | 'other'>('other');
  relationPickList$: Observable<RelationPick[]> = of([]);
  spousePickList$: Observable<RelationPick[]> = of([]);
/*   spousePickListSubject = new BehaviorSubject<RelationPick[]>([]);
  spousePickList$ = this.spousePickListSubject.asObservable(); */
  showRestrictedToggle = true;

  override ngOnInit(): void {
    super.ngOnInit();
    this.kind = this.data().componentType as K;
    console.log(' this.object', structuredClone(this.object));
    console.log('this.existingOwner', structuredClone(this.existingOwner));
    if (this.existingOwner) {
      this.outdatedDataDraft = structuredClone(
        this.existingOwner!.outdatedData,
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

    this.hasOutdatedContacts.set(
      'contacts' in this.outdatedDataDraft &&
        Object.keys(this.outdatedDataDraft.contacts).length > 0,
    );
    this.hasOutdatedAddresses.set(
      'addresses' in this.outdatedDataDraft &&
        this.outdatedDataDraft.addresses.length > 0,
    );
  }

  private isPersonContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Exclude<Kind, 'home'>>> {
    return this.kind !== 'home';
  }
  isContactsOwnerContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Exclude<Kind, 'senior'>>> {
    return this.kind !== 'senior';
  }
  isCommonAddressOwnerContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<
    Extract<K, Exclude<Kind, 'senior' | 'home'>>
  > {
    return this.kind !== 'senior' && this.kind !== 'home';
  }
  isCoordinationsOwnerContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<
    Extract<K, Extract<Kind, 'partner' | 'home'>>
  > {
    return this.kind === 'partner' || this.kind === 'home';
  }
  private isUserContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Extract<Kind, 'user'>>> {
    return this.kind === 'user';
  }
  private isPartnerContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Extract<Kind, 'partner'>>> {
    return this.kind === 'partner';
  }
  isHomeContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Extract<Kind, 'home'>>> {
    return this.kind === 'home';
  }
  private isVolunteerContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Extract<Kind, 'volunteer'>>> {
    return this.kind === 'volunteer';
  }
  isSeniorContext(
    this: AdvancedDetailsComponent<K>,
  ): this is AdvancedDetailsComponent<Extract<K, Extract<Kind, 'senior'>>> {
    return this.kind === 'senior';
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
      0,
    );
  }

  onRestrictedToggleClick() {
    if (this.mainForm.controls['isRestricted'].value) {
      this.mainForm.addControl(
        'causeOfRestriction',
        new FormControl(null, [zodValidator(causeOfRestrictionControlSchema)]),
      );
      this.controlsNames.push('causeOfRestriction');
    } else if (
      (this.isEditModeSignal() && !this.existingOwner!['isRestricted']) ||
      this.data().operation === 'create'
    ) {
      this.mainForm.removeControl('causeOfRestriction');
      const idx = this.controlsNames.findIndex(
        (n) => n === 'causeOfRestriction',
      );
      if (idx !== -1) this.controlsNames.splice(idx, 1);
    }
    this.onChangeValidation();
  }

  onCloseToggleClick() {
    this.showRestrictedToggle = !this.mainForm.controls['isClose'].value;
    this.onChangeValidation();
  }

  onChangeDateOfExit() {
    console.log('onChangeDateOfExit');
    this.showRestrictedToggle = !!!this.mainForm.controls['dateOfExit'].value;
    this.onChangeValidation();
  }

  modifyContactTypesList() {
    for (const contact of this.possibleContactTypes) {
      if (
        this.mainForm.controls[contact.name].value.findIndex(
          (v: string | null) => v == null,
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
    defaultValue: string | null,
  ): void;
  onTypeClick(
    arg: number | Exclude<ContactType, 'telegram' | 'otherContact'>,
    defaultValue: string | null,
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
      website: [zodValidator(websiteControlSchema)],
    };

    this.getFormArray(type).push(
      new FormControl(defaultValue, validators[type] || []),
    );
  }

  deleteContactControl(index: number, controlName: string) {
    const formArray = this.getFormArray(controlName);
    if (formArray.length > 1) formArray.removeAt(index);
    this.onChangeValidation();
  }

  deleteInstituteControl(index: number) {
    const formArray = this.getFormArray('institutes');
    formArray.removeAt(index);
    this.onChangeValidation();
  }
  //TODO:
  deleteCoordinationControl(index: number) {
    const formArray = this.getFormArray('coordinations');
    formArray.removeAt(index);
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
    const isQualified =
      this.kind === 'user' ||
      this.kind === 'partner' ||
      this.kind === 'volunteer' ||
      this.kind === 'home';
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
  //TODO: вынести хелперы в отдельный файл по адресам и контактам
  // Optional extra validation gates (true => changes detected)
  protected override additionalValidationHooks(): boolean {
    return this.contactsChangeValidation() || this.addressChangeValidation();
  }

  // Compare contacts between form and original orderedContacts
  contactsChangeValidation(): boolean {
    if ('orderedContacts' in this.existingOwner!) {
      const ordered: OwnerContacts = this.existingOwner![
        'orderedContacts'
      ] as OwnerContacts;

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
    return false;
  }

  // Compare address selection against original address (country/region/district/locality)
  addressChangeValidation(): boolean {
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
        ? (selectedIds[0] ?? null)
        : null;

      if (originalId !== selectedId) return true;
    }
    return this.homeAddressChangeValidation();
  }

  homeAddressChangeValidation() {
    return false;
  }

  // Seed form with initial values; transform contacts for view-mode
  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);
    console.log('setInitialValues');
    if ('orderedContacts' in this.existingOwner!) {
      const ordered: OwnerContacts = this.existingOwner![
        'orderedContacts'
      ] as OwnerContacts;
      const toView = (val: string, type: string) =>
        mode === 'view' ? this.contactUrl.transform(val, type) : val;

      for (const type of this.contactTypes) {
        const formArray = this.getFormArray(type);
        const values = ordered?.[type] ?? [];
        const validators =
          this.data().controls.find((c) => c.controlName === type)
            ?.validators || [];

        let diff = values.length - formArray.length;

        while (diff > 0) {
          formArray.push(
            new FormControl(
              {
                value: null,
                disabled: mode === 'view',
              },
              validators,
            ),
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
        }
      }
    }
  }

  // --- Outdated data actions

  onRestoreOutdatedName(data: OutdatedFullName) {
    if (
      'names' in this.restoringDataDraft &&
      'names' in this.existingOwner!.outdatedData
    ) {
      if (this.restoringDataDraft.names !== null) {
        const nameId = this.restoringDataDraft.names![0];
        const restoredValue = this.existingOwner!.outdatedData.names.find(
          (item: OutdatedAddress | OutdatedFullName | OutdatedHomeAddress) =>
            item.id === nameId,
        );
        if ('names' in this.outdatedDataDraft && restoredValue)
          (this.outdatedDataDraft.names as any[]).push(restoredValue);
        this.restoringDataDraft.names = [];
      }
      //  }
      this.restoringDataDraft.names = [data.id];
      if ('firstName' in data) {
        this.mainForm.patchValue({
          firstName: data.firstName,
          patronymic: data.patronymic,
          lastName: data.lastName,
        });
      }
    }
  }

  onRestoreOutdatedData(
    type:
      | 'names'
      | 'userNames'
      | 'officialNames'
      | 'coordinations'
      | 'institutes'
      | 'addresses'
      | 'contacts',
    //keyof RestoringByKind<K>,
    data: Contact | OutdatedAddress | OutdatedHomeAddress,
    //  | OutdatedHome,
    contactType?: Exclude<ContactType, 'telegram'>,
  ) {
    //восстанавливаемое значение присваиваем соответветствующему form.control,
    //если он пустой, или добавляем новый form.control с этим значением
    if (
      type === 'contacts' &&
      'contacts' in this.restoringDataDraft &&
      'content' in data
    ) {
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
    if (
      type === 'addresses' &&
      'addresses' in this.restoringDataDraft &&
      'addresses' in this.existingOwner!.outdatedData &&
      'addresses' in this.outdatedDataDraft
    ) {
      if (this.restoringDataDraft.addresses !== null) {
        const id = this.restoringDataDraft.addresses![0];
        const restoredValue = this.existingOwner!.outdatedData.addresses.find(
          (item: OutdatedAddress | OutdatedFullName | OutdatedHomeAddress) =>
            item.id === id,
        );
        if (restoredValue)
          (this.outdatedDataDraft.addresses as any[]).push(restoredValue);
        this.restoringDataDraft.addresses = [];
      }
      //  }
      this.restoringDataDraft.addresses = [data.id];

      if ('country' in data) {
        this.addressFilterComponent.onChangeMode('edit', {
          localityId: data.locality?.id ?? null,
          districtId: data.district?.id ?? null,
          regionId: data.region?.id ?? null,
          countryId: data.country.id,
        });
      }
    }

    //восстанавливаемые значения удаляем из outdatingDataDraft
    this.deleteFromOutdatedDataDraft(
      type as unknown as keyof OutdatedByKind<K>,
      data.id,
    );

    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }
  onDeleteOutdatedData(
    type: // | keyof DeletingByKind<K>
      | 'names'
      | 'userNames'
      | 'officialNames'
      | 'coordinations'
      | 'institutes'
      | 'addresses'
      | 'contacts',
    id: number,
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
    if (type === 'contacts' && 'contacts' in this.outdatedDataDraft) {
      for (const key of typedKeys(this.outdatedDataDraft.contacts)) {
        const idx = this.outdatedDataDraft.contacts[key]!.findIndex(
          (c) => c.id === id,
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
    this.ownerDraft = buildDraft(
      this.kind,
      this.mainForm,
      this.addressFilter(),
      this.contactTypes,
      this.existingOwner,
      this.user()!.id,
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
    //TODO: institutes, coordinations

    if ('draftContacts' in this.ownerDraft) {
      for (const key of typedKeys(this.ownerDraft.draftContacts)) {
        const temp = this.ownerDraft.draftContacts[key].sort();
        const dups = new Set<string>();
        for (let i = 0; i < temp.length - 1; i++)
          if (temp[i + 1] === temp[i]) dups.add(temp[i]);
        if (dups.size) contactDuplicates[key] = Array.from(dups);
      }
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
              duplicatesContact,
            );
            this.confirmationService.confirm({
              header: this.translateService.instant(
                'PRIME_CONFIRM.WARNING_HEADER',
              ),
              message:
                this.translateService.instant(
                  'PRIME_CONFIRM.SAVE_WITH_DUPLICATES',
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
    if (this.isCommonAddressOwnerContext()) {
      const { restoring, outdating } = reconcileRestoredAddress(
        this.restoringDataDraft.addresses ?? [],
        this.outdatedDataDraft.addresses,
        this.ownerDraft.draftAddress,
        this.existingOwner!.outdatedData.addresses,
      );
      this.restoringDataDraft.addresses = structuredClone(restoring);
      this.outdatedDataDraft.addresses = structuredClone(outdating);
    }

    if (this.isHomeContext()) {
      const { restoring, outdating } = reconcileRestoredHomeAddress(
        this.restoringDataDraft.addresses ?? [],
        this.outdatedDataDraft.addresses,
        this.ownerDraft,
        this.existingOwner!.outdatedData.addresses,
      );
      this.restoringDataDraft.addresses = structuredClone(restoring);
      this.outdatedDataDraft.addresses = structuredClone(outdating);
    }

    // Names
    if (this.isPersonContext()) {
      const { restoring, outdating } = reconcileRestoredNames(
        this.restoringDataDraft.names ?? [],
        this.outdatedDataDraft.names,
        {
          firstName: this.ownerDraft.firstName,
          patronymic: this.ownerDraft.patronymic,
          lastName: this.ownerDraft.lastName,
        },
        this.existingOwner!.outdatedData.names,
      );
      this.restoringDataDraft.names = structuredClone(restoring);
      this.outdatedDataDraft.names = structuredClone(outdating);
    }

    if (this.isUserContext()) {
      const { restoring, outdating } = reconcileRestoredUserNames(
        this.restoringDataDraft.userNames ?? [],
        this.outdatedDataDraft.userNames,
        this.ownerDraft.userName,
        this.existingOwner!.outdatedData.userNames,
      );
      this.restoringDataDraft.userNames = structuredClone(restoring);
      this.outdatedDataDraft.userNames = structuredClone(outdating);
    }

    if (this.isHomeContext()) {
      const { restoring, outdating } = reconcileRestoredOfficialNames(
        this.restoringDataDraft.officialNames ?? [],
        this.outdatedDataDraft.officialNames,
        this.ownerDraft.officialName,
        this.existingOwner!.outdatedData.officialNames,
      );
      this.restoringDataDraft.officialNames = structuredClone(restoring);
      this.outdatedDataDraft.officialNames = structuredClone(outdating);
    }

    // Contacts
    if (this.isContactsOwnerContext()) {
      const { restoring, outdating } = reconcileRestoredContacts(
        this.restoringDataDraft.contacts ?? {},
        this.outdatedDataDraft.contacts,
        this.ownerDraft.draftContacts,
      );
      this.restoringDataDraft.contacts = structuredClone(restoring);
      this.outdatedDataDraft.contacts = structuredClone(outdating);
    }

    //Coordinations
    if (this.isCoordinationsOwnerContext()) {
      const { restoring, outdating } = reconcileRestoredCoordinations(
        this.kind,
        this.restoringDataDraft.coordinations ?? [],
        this.outdatedDataDraft.coordinations,
        this.ownerDraft.draftCoordinations,
        this.existingOwner!.outdatedData.coordinations,
      );
      this.restoringDataDraft.coordinations = structuredClone(restoring);
      this.outdatedDataDraft.coordinations = structuredClone(outdating);
    }

    //Institutes
    if (this.isVolunteerContext()) {
      const { restoring, outdating } = reconcileRestoredInstitutes(
        this.restoringDataDraft.institutes ?? [],
        this.outdatedDataDraft.institutes,
        this.ownerDraft.draftInstitutes,
        this.existingOwner!.outdatedData.institutes,
      );
      this.restoringDataDraft.institutes = structuredClone(restoring);
      this.outdatedDataDraft.institutes = structuredClone(outdating);
    }
  }

  //если введенные данные совпадают с outdatingDataDraft данными,
  //то добавляем их с согласия пользователя в restoringDataDraft
  async checkOutdatedDataDuplicates() {
    // Addresses
    if (this.isCommonAddressOwnerContext()) {
      const res = await this.ownerRestorationGuardService.checkAddress(
        this.outdatedDataDraft.addresses,
        this.ownerDraft.draftAddress,
      );

      if (!res.ok) return false;

      if (res.restoring) {
        this.restoringDataDraft.addresses ??= [];
        this.restoringDataDraft.addresses.push(res.restoring);
      }
    }

    if (this.isHomeContext()) {
      const res = await this.ownerRestorationGuardService.checkHomeAddress(
        this.outdatedDataDraft.addresses,
        this.ownerDraft,
      );

      if (!res.ok) return false;

      if (res.restoring) {
        this.restoringDataDraft.addresses ??= [];
        this.restoringDataDraft.addresses.push(res.restoring);
      }
    }

    // Names
    if (this.isPersonContext()) {
      const res = await this.ownerRestorationGuardService.checkNames(
        this.outdatedDataDraft.names,
        this.ownerDraft,
      );

      if (!res.ok) return false;

      if (res.restoring) {
        this.restoringDataDraft.names ??= [];
        this.restoringDataDraft.names.push(res.restoring);
      }
    }

    if (this.isUserContext()) {
      const res = await this.ownerRestorationGuardService.checkUserNames(
        this.outdatedDataDraft.userNames,
        this.ownerDraft.userName,
      );

      if (!res.ok) return false;

      if (res.restoring) {
        this.restoringDataDraft.userNames ??= [];
        this.restoringDataDraft.userNames.push(res.restoring);
      }
    }

    if (this.isHomeContext()) {
      const res = await this.ownerRestorationGuardService.checkOfficialNames(
        this.outdatedDataDraft.officialNames,
        this.ownerDraft.officialName,
      );

      if (!res.ok) return false;

      if (res.restoring) {
        this.restoringDataDraft.officialNames ??= [];
        this.restoringDataDraft.officialNames.push(res.restoring);
      }
    }

    //Institutes
    if (this.isVolunteerContext()) {
      const res = await this.ownerRestorationGuardService.checkInstitutes(
        this.outdatedDataDraft.institutes,
        this.ownerDraft.draftInstitutes,
      );

      if (!res.ok) return false;

      if (res.restoring.length) {
        this.restoringDataDraft.institutes = [
          ...(this.restoringDataDraft.institutes ?? []),
          ...res.restoring,
        ];
      }
    }

    //Coordinations

    if (this.isCoordinationsOwnerContext()) {
      const res = await this.ownerRestorationGuardService.checkCoordinations(
        this.kind,
        this.outdatedDataDraft.coordinations,
        this.ownerDraft.draftCoordinations,
      );

      if (!res.ok) return false;

      if (res.restoring.length) {
        this.restoringDataDraft.coordinations = [
          ...(this.restoringDataDraft.coordinations ?? []),
          ...res.restoring,
        ];
      }
    }

    //Contacts

    if (this.isContactsOwnerContext()) {
      const res = await this.ownerRestorationGuardService.checkContacts(
        this.contactTypes,
        this.outdatedDataDraft.contacts,
        this.ownerDraft.draftContacts,
      );

      if (!res.ok) return false;

      if (Object.keys(res.restoring).length) {
        this.restoringDataDraft.contacts ??= {};
        for (const k of typedKeys(res.restoring)) {
          (this.restoringDataDraft.contacts[k] ??= []).push(
            ...(res.restoring[k] ?? []),
          );
        }
      }
    }

    return true;
  }

  //формируем окончательные варианты измененных, восстановленных, удаляемых и неактуальных значений
  async checkAllChanges() {
    /*  this.deletingData = structuredClone(this.deletingDataDraft); //clone deleting data in case saving cancellation
        const restoringData: RestoringByKind<K> = structuredClone(
      this.restoringDataDraft,
    ); */

    // Addresses

    if (this.isCommonAddressOwnerContext()) {
      const { changes, outdatingId, deletingId } =
        await this.ownerChangesPlannerService.diffAddress(
          this.existingOwner!,
          this.ownerDraft,
          this.restoringDataDraft.addresses == null
            ? null
            : this.restoringDataDraft.addresses![0],
        );
      this.changingData.address = changes;
      this.outdatingData.address = outdatingId;
      if (deletingId) {
        this.deletingDataDraft.addresses ??= [];
        this.deletingDataDraft.addresses.push(deletingId);
      }
    }

    if (this.isHomeContext()) {
      const { changes, outdatingId, deletingId } =
        await this.ownerChangesPlannerService.diffHomeAddress(
          this.existingOwner!,
          this.ownerDraft,
          this.restoringDataDraft.addresses == null
            ? null
            : this.restoringDataDraft.addresses![0],
        );
      this.changingData.address = changes;
      this.outdatingData.address = outdatingId;
      if (deletingId) {
        this.deletingDataDraft.addresses ??= [];
        this.deletingDataDraft.addresses.push(deletingId);
      }
    }

    // Names
    if (this.isPersonContext()) {
      const { changes, outdating } =
        await this.ownerChangesPlannerService.diffNames(
          this.existingOwner!,
          this.ownerDraft,
        );
      if (changes)
        this.changingData.main = {
          ...(this.changingData.main ?? {}),
          ...changes,
        };
      this.outdatingData.names = outdating;
    }

    if (this.isUserContext()) {
      const { changes, outdating } =
        await this.ownerChangesPlannerService.diffUserName(
          this.existingOwner!,
          this.ownerDraft,
        );
      if (changes)
        this.changingData.main = {
          ...(this.changingData.main ?? {}),
          ...changes,
        };
      this.outdatingData.userName = outdating;
    }

    if (this.isHomeContext()) {
      const { changes, outdating } =
        await this.ownerChangesPlannerService.diffOfficialName(
          this.existingOwner!,
          this.ownerDraft,
        );
      if (changes)
        this.changingData.main = {
          ...(this.changingData.main ?? {}),
          ...changes,
        };
      this.outdatingData.officialName = outdating;
    }

    // Contacts

    if (this.isContactsOwnerContext()) {
      const { changes, outdatingIds, deletingIds } =
        await this.ownerChangesPlannerService.diffContacts(
          this.existingOwner!,
          this.ownerDraft,
          this.contactTypes,
          this.restoringDataDraft.contacts,
        );
      this.changingData.contacts = changes;
      this.outdatingData.contacts = outdatingIds;
      if (deletingIds) {
        this.deletingDataDraft.contacts ??= [];
        this.deletingDataDraft.contacts.push(...deletingIds);
      }
    }

    // Coordinations

    if (this.isCoordinationsOwnerContext()) {
      const { changes, outdating, deleting } =
        await this.ownerChangesPlannerService.diffCoordinations(
          this.kind,
          this.existingOwner!.coordinations,
          this.ownerDraft.draftCoordinations ?? [],
          this.restoringDataDraft.coordinations ?? [],
          this.existingOwner!.outdatedData.coordinations ?? [],
        );

      this.changingData.coordinations = changes;
      this.outdatingData.coordinations = outdating;
      if (deleting) {
        this.deletingDataDraft.coordinations ??= [];
        this.deletingDataDraft.coordinations.push(...deleting);
      }
    }

    // Institutes
    if (this.isVolunteerContext()) {
      const { changes, outdating, deleting } =
        await this.ownerChangesPlannerService.diffInstitutes(
          this.existingOwner!.institutes ?? [],
          this.ownerDraft.draftInstitutes ?? [],
          this.restoringDataDraft.institutes ?? [],
          this.existingOwner!.outdatedData.institutes ?? [],
        );
      this.changingData.institutes = changes;
      this.outdatingData.institutes = outdating;
      if (deleting) {
        this.deletingDataDraft.institutes ??= [];
        this.deletingDataDraft.institutes.push(...deleting);
      }
    }
    if (this.isVolunteerContext()) {
      const { changes, outdating, deleting } =
        await this.ownerChangesPlannerService.diffSubs(
          this.existingOwner!.subscriptions ?? [],
          this.ownerDraft.draftSubscriptions ?? [],
          this.user()!.id,
        );
      this.changingData.subscriptions = changes;
      if (deleting) {
        this.deletingDataDraft.subscriptions ??= [];
        this.deletingDataDraft.subscriptions.push(...deleting);
      }
    }

    //Main props

    for (const key of this.mainProps) {
      const existing = this.existingOwner as Record<string, unknown>;
      const draft = this.ownerDraft as Record<string, unknown>;
      //console.log(key, existing[key as string]);
     // console.log(key, draft[key as string]);
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
      restoringData: this.restoringDataDraft,
      outdatingData: this.outdatingData,
      deletingData: this.deletingDataDraft,
    });
    return {
      changingData: this.changingData,
      restoringData: this.restoringDataDraft,
      outdatingData: this.outdatingData,
      deletingData: this.deletingDataDraft,
    };
  }

  saveOwner() {
    const service = this.getService();
    console.log('this.ownerDraft', this.ownerDraft);
    service
      .saveOwner(this.ownerDraft)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.emitShowSpinner(false)),
      )
      .subscribe({
        next: (res) => {
          if (this.action === 'saveAndExit') {
            this.closeDialogDataSignal.set(res.data);
            this.emittedCloseDialogData.emit(res.data);
          } else {
            // keep dialog open, could re-load owner data if needed
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
    addressParams: DefaultAddressParams | null,
  ) {
    super.changeToViewMode(addressParams);
    this.outdatedDataDraft = structuredClone(
      this.existingOwner!.outdatedData,
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
        finalize(() => this.emitShowSpinner(false)),
      )
      .subscribe({
        next: (res) => {
          if (this.action === 'saveAndExit') {
            this.closeDialogDataSignal.set('close'); //TODO: change?
            this.emittedCloseDialogData.emit('close');
            return;
          }

          // inline update to view state
          this.correctRestrictedController();

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
          // this.existingOwner = this.data().object;
          console.log(
            'this.existingOwner',
            structuredClone(this.existingOwner),
          );
          if (this.existingOwner) {
            this.outdatedDataDraft = structuredClone(
              this.existingOwner!.outdatedData,
            ) as OutdatedByKind<K>;
          }

          console.log('OOO - this.outdatedDataDraft', this.outdatedDataDraft);

          this.setHasOutdatedUserNames();
          //this.setHasOutdatedHomes();
          this.setHasOutdatedNames();
          this.setHasOutdatedOfficialNames();
          this.setHasOutdatedCoordinations();
          this.setHomeOpen();

          this.hasOutdatedContacts.set(
            'contacts' in this.outdatedDataDraft &&
              Object.keys(this.outdatedDataDraft.contacts).length > 0,
          );
          this.hasOutdatedAddresses.set(
            'addresses' in this.outdatedDataDraft &&
              this.outdatedDataDraft.addresses.length > 0,
          );

          console.log('this.hasOutdatedContacts', this.hasOutdatedContacts());

          this.addressFilterComponent.onChangeMode(
            'view',
            this.data().defaultAddressParams!,
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

  correctRestrictedController() {
    if (
      !this.mainForm.controls['isRestricted'].value &&
      this.mainForm.get('causeOfRestriction')
    ) {
      this.mainForm.removeControl('causeOfRestriction');
      const idx = this.controlsNames.findIndex(
        (n) => n === 'causeOfRestriction',
      );
      if (idx !== -1) this.controlsNames.splice(idx, 1);
    }
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
  hasCoordinations(): boolean {
    if (this.kind == 'home' || this.kind == 'partner') return true;
    else return false;
  }

  hasSubscriptions(): boolean {
    return false;
  }
  hasCooperations(): boolean {
    return false;
  }
  hasInstitutes(): boolean {
    return false;
  }

  checkUserName() {}
  onChangePasswordClick() {}
  onAddInstituteClick() {}
  getRowSpanForUserNames() {
    return 0;
  }

  setHasOutdatedUserNames() {}
  setHasOutdatedInstitutes() {}
  setHasOutdatedNames() {}
  setHasOutdatedOfficialNames() {}
  setHasOutdatedCoordinations() {
    if ('coordinations' in this.outdatedDataDraft)
      this.hasOutdatedCoordinations.set(
        this.outdatedDataDraft.coordinations.length > 0,
      );
    else this.hasOutdatedCoordinations.set(false);
  }
  setHomeOpen() {}

  getRowSpanForHomes() {
    return 0;
  }
  getRowSpanForPartners() {
    return 0;
  }
  getRowSpanForInstitutes() {
    return 0;
  }

  getPostalAddress(): string {
    return '';
  }
  get institutesArray(): FormArray<InstituteFormGroup> {
    return new FormArray<InstituteFormGroup>([]);
  }

  get coordinationsArray(): FormArray<FormControl<RelationPick | null>> {
    let fa = this.mainForm.get('coordinations') as FormArray<
      FormControl<RelationPick | null>
    >;

    if (!fa) {
      fa = new FormArray<FormControl<RelationPick | null>>([]);
      this.mainForm.addControl('coordinations', fa);
    }
    return fa;
  }

  get homeCtrl(): FormControl<RelationPick | null> {
    //  console.log("this.mainForm.get('homeId')", this.mainForm.get('homeId'));
    return this.mainForm.get('nursingHome') as FormControl<RelationPick | null>;
  }

  get spouseCtrl(): FormControl<RelationPick | null> {
    //  console.log("this.mainForm.get('homeId')", this.mainForm.get('homeId'));
    return this.mainForm.get('spouse') as FormControl<RelationPick | null>;
  }

  clearHomeControl() {
    this.mainForm.get('home')?.setValue(null);
    this.addressFilterComponent.onChangeMode('view', {
      countryId: null,
      regionId: null,
      districtId: null,
      localityId: null,
    });
    this.mainForm.get('spouse')?.setValue(null);
    this.mainForm.get('spouse')?.disable();
  }

  clearSpouseControl() {
    this.mainForm.get('spouse')?.setValue(null);
  }

  updateAddressFilter(home: RelationPick | null) {}

  onAddCoordinationClick() {
    this.coordinationsArray.push(
      new FormControl<RelationPick | null>(
        { value: null, disabled: false },
        {
          nonNullable: true,
          validators: [zodValidator(coordinationNameControlSchema)],
        },
      ),
    );
  }

  /*  get coordinationsArray(): FormArray<FormControl<RelationPick | string>> {
    return new FormArray<FormControl<RelationPick | string>>([]);
  } */
  get subscriptions(): Subscription[] {
    return [];
  }
  get cooperations(): Cooperation[] {
    return [];
  }
  get outdatedNames(): OutdatedFullName[] {
    return [];
  }
  get outdatedUserNames(): OutdatedUserName[] {
    return [];
  }
  get outdatedOfficialNames(): OutdatedOfficialName[] {
    return [];
  }

  get outdatedAddresses(): OutdatedAddress[] | OutdatedHomeAddress[] {
    if (this.isCommonAddressOwnerContext() || this.isHomeContext()) {
      const list = this.outdatedDataDraft.addresses;
      return Array.isArray(list) ? list : [];
    }
    return [];
  }
  get outdatedContacts(): OutdatedContacts {
    if (this.isContactsOwnerContext()) {
      const list = this.outdatedDataDraft.contacts;
      return list ? list : {};
    }
    return {};
  }

  get outdatedCoordinations(): OutdatedCoordination[] {
    if (this.isCoordinationsOwnerContext()) {
      const list = this.outdatedDataDraft.coordinations;
      return Array.isArray(list) ? list : [];
    }
    return [];
  }
  get outdatedInstitutes(): OutdatedInstitute[] {
    return [];
  }

  onRestoreOutdatedUserName(data: OutdatedUserName) {}
  onRestoreOutdateOfficialName(data: OutdatedOfficialName) {}
  onRestoreOutdatedInstitute(data: OutdatedInstitute) {}
  onRestoreOutdatedOfficialName(data: OutdatedOfficialName) {}
  onRestoreOutdatedCoordination(data: OutdatedCoordination) {}
}
