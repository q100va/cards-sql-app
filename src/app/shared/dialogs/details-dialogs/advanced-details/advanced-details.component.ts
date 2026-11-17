import {
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
} from '../../../../interfaces/advanced-model';
import {
  INSTITUTE_CATEGORIES,
  INSTITUTE_CATEGORY_OPTIONS,
  InstituteCategoryId,
} from '../../../../../../shared/constants/volunteers';
import {
  PARTNER_AFFILIATIONS,
  PARTNER_AFFILIATION_OPTIONS,
  PartnerAffiliationId,
} from '../../../../../../shared/constants/partners';
import { typedKeys } from '../../../../interfaces/toponym';

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
import { DateUtilsService } from '../../../../services/date-utils.service';

import {
  buildDuplicateInfoMessage,
  hasAddressSelectionChanges,
  hasContactChanges,
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
import {
  debounceTime,
  finalize,
  Observable,
  of,
} from 'rxjs';
import { DefaultAddressParams } from '../../../../../../shared/schemas/toponym.schema';
import { AuthUser } from '../../../../../../shared/schemas/auth.schema';
import { AuthService } from '../../../../services/auth.service';
import { HomeService } from '../../../../services/home.service';
import { coordinationNameControlSchema } from '../../../../../../shared/schemas/common.schema';
import { SeniorService } from '../../../../services/senior.service';
import { buildDraft } from '../../../../utils/owner-draft.builder';
import { reconcileOwnerRestoration } from '../../../../utils/owner-restoration-reconcile.util';
import { OwnerRestorationGuardService } from '../../../../services/owner-restoration-guard.service';
import { OwnerChangesPlannerService } from '../../../../services/owner-changes-planner.service';

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
  // DI
  readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);

  readonly ownerRestorationGuardService = inject(OwnerRestorationGuardService);
  readonly ownerChangesPlannerService = inject(OwnerChangesPlannerService);
  readonly translate = inject(TranslateService);
  readonly auth = inject(AuthService);
  readonly dateUtils = inject(DateUtilsService);

  // Текущий пользователь
  readonly user = toSignal<AuthUser | null>(this.auth.currentUser$, {
    initialValue: null,
  });
  declare kind: K;
  ownerDraft!: OwnerDraftByKind<K>;

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

  restoringDataDraft!: RestoringByKind<K>;
  deletingDataDraft!: DeletingByKind<K>;
  outdatedDataDraft!: OutdatedByKind<K>;
  changingData!: ChangingByKind<K>;
  outdatingData!: OutdatingByKind<K>;
  mainProps!: (keyof NonNullable<ChangingByKind<K>['main']>)[];

  affiliations = PARTNER_AFFILIATION_OPTIONS;
  readonly partnerAffiliations: Record<
    number,
    (typeof PARTNER_AFFILIATIONS)[PartnerAffiliationId]
  > = PARTNER_AFFILIATIONS;
  categories = INSTITUTE_CATEGORY_OPTIONS;
  readonly instituteCategories: Record<
    number,
    (typeof INSTITUTE_CATEGORIES)[InstituteCategoryId]
  > = INSTITUTE_CATEGORIES;

  genders = ['male', 'female'];

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

  hasOutdatedNames = signal<boolean>(false);
  hasOutdatedContacts = signal<boolean>(false);
  hasOutdatedAddresses = signal<boolean>(false);
  hasOutdatedUserNames = signal<boolean>(false);
  hasOutdatedOfficialNames = signal<boolean>(false);
  hasOutdatedInstitutes = signal<boolean>(false);
  hasOutdatedCoordinations = signal<boolean>(false);
  hasOutdatedSubs = signal<boolean>(false);
  hasOutdatedCoops = signal<boolean>(false);
  hasPostalAddress = signal<boolean>(false);
  hasStatus = signal<boolean>(false);
  homeOpen = signal<boolean>(true);
  partnerActive = signal<boolean>(true);
  homeOrPartner = signal<'home' | 'partner' | 'other'>('other');
  relationPickList$: Observable<RelationPick[]> = of([]);
  spousePickList$: Observable<RelationPick[]> = of([]);
  showRestrictedToggle = true;

  override ngOnInit(): void {
    super.ngOnInit();
    this.kind = this.data().componentType as K;
    if (this.existingOwner) {
      this.outdatedDataDraft = structuredClone(
        this.existingOwner!.outdatedData,
      ) as OutdatedByKind<K>;
    } else {
      this.setEmptyOutdatedDataDraft();
    }
    this.resetPendingEditState();
    this.mainForm.setValidators(this.data().mainContactsValidator!);
    this.mainForm.valueChanges
      .pipe(debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Debounced form events can outlive Edit; settled View must stay clean.
        if (this.data().operation === 'create' || this.isEditModeSignal()) {
          this.onChangeValidation();
        } else {
          this.checkIsSaveDisabled();
        }
      });

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
    if (!this.isCurrentSaveIntent(this.saveIntent)) return;
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
  deleteCoordinationControl(index: number) {
    const formArray = this.getFormArray('coordinations');
    formArray.removeAt(index);
    this.onChangeValidation();
  }

  // Enable/disable Save button
  override checkIsSaveDisabled(): void {
    const disabled =
      !this.mainForm.valid ||
      (!this.changesSignal() &&
        !this.deletingSignal() &&
        this.data().operation === 'view-edit');



    this.IsSaveDisabledSignal.set(disabled);
    this.emittedIsSaveDisabled.emit(disabled);
  }
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
        const current: (string | null | undefined)[] = this.getFormArray(type).getRawValue();
        if (hasContactChanges(ordered?.[type] ?? [], current)) return true;
      }
      return false;
    }
    return false;
  }

  // Compare address selection against original address (country/region/district/locality)
  addressChangeValidation(): boolean {
    return hasAddressSelectionChanges(this.existingOwner!.address, this.addressFilter()) ||
      this.homeAddressChangeValidation();
  }

  homeAddressChangeValidation() {
    return false;
  }

  // Seed form with initial values; transform contacts for view-mode
  override setInitialValues(mode: 'view' | 'edit' | 'create'): void {
    super.setInitialValues(mode);
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
          (item: OutdatedFullName) => item.id === nameId,
        );
        if ('names' in this.outdatedDataDraft && restoredValue) {
          this.outdatedDataDraft.names.push(restoredValue);

        }
      }

      this.restoringDataDraft.names = [data.id];

      this.mainForm.patchValue({
        firstName: data.firstName,
        patronymic: data.patronymic,
        lastName: data.lastName,
      });
      this.deleteFromOutdatedDataDraft(
        'names' as unknown as keyof OutdatedByKind<K>,
        data.id,
      );

      this.onChangeValidation();
    }
  }

  protected setHomePostalAddress(
    address: Pick<Home['address'], 'postalCode' | 'postalName' | 'postalAddressPart'>,
  ) {
    this.mainForm.patchValue({
      postalCode: address.postalCode,
      postalName: address.postalName,
      postalAddressPart: address.postalAddressPart,
    });
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
    data: Contact | OutdatedAddress | OutdatedHomeAddress,
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

    // Only one address can be selected for restoration.
    // Return the previous selection to working history before replacing it.
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
      }
      this.restoringDataDraft.addresses = [data.id];

      if ('country' in data) {
        if (this.kind === 'home' && 'postalCode' in data) {
          this.setHomePostalAddress(data);
        }
        this.addressFilterComponent.onChangeMode('edit', {
          localityId: data.locality?.id ?? null,
          districtId: data.district?.id ?? null,
          regionId: data.region?.id ?? null,
          countryId: data.country.id,
        });
      }
    }

    this.deleteFromOutdatedDataDraft(
      type as unknown as keyof OutdatedByKind<K>,
      data.id,
    );

    this.updateControlsValidity(this.controlsNames, true);
    this.onChangeValidation();
  }
  onDeleteOutdatedData(
    type:
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
    if (!this.isCurrentSaveIntent(this.saveIntent)) return;
    const intent = ++this.saveIntent;
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
      this.checkUserName(intent);
    } else {
      this.checkDuplicates(intent);
    }
  }

  checkDuplicates(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return;
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
      this.checkOwnerData(intent);
    }
  }

  checkOwnerData(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return;
    const service = this.getService();
    service
      .checkOwnerData(this.ownerDraft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (res) => {
          if (!this.isCurrentSaveIntent(intent)) return;
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
                if (!this.isCurrentSaveIntent(intent)) return;
                await this.savingFlow(intent);
              },
              reject: () => {
                if (this.isCurrentSaveIntent(intent)) this.emitShowSpinner(false);
              },
            });
          } else {
            await this.savingFlow(intent);
          }
        },
        error: (err) => {
          if (!this.isCurrentSaveIntent(intent)) return;
          this.emitShowSpinner(false);
          this.msgWrapper.handle(err, {
            source: 'CreateOwnerDialog',
            stage: 'checkOwnerData',
            kind: this.kind,
          });
        },
      });
  }

  async savingFlow(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return;
    if (this.data().operation === 'create') {
      this.saveOwner(intent);
    } else {
      await this.correctRestoringData(intent);
      if (!this.isCurrentSaveIntent(intent)) return;
      const canSave = await this.checkOutdatedDataDuplicates(intent);
      if (!this.isCurrentSaveIntent(intent)) return;
      if (canSave) {
        const updatingOwnerData = await this.checkAllChanges(intent);
        if (!this.isCurrentSaveIntent(intent)) return;
        this.saveUpdatedOwner(updatingOwnerData, intent);
      } else {
        this.emitShowSpinner(false);
      }
    }
  }

  async correctRestoringData(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return;
    const { restoring, history } = reconcileOwnerRestoration({
      kind: this.kind,
      draft: this.ownerDraft,
      restoring: this.restoringDataDraft,
      history: this.outdatedDataDraft,
      persistedHistory: this.existingOwner!.outdatedData,
    });
    this.restoringDataDraft = restoring;
    this.outdatedDataDraft = history;
  }

  // Matching working-history values require confirmation before restoration.
  async checkOutdatedDataDuplicates(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return false;
    // Addresses
    if (this.isCommonAddressOwnerContext()) {
      const res = await this.ownerRestorationGuardService.checkAddress(
        this.outdatedDataDraft.addresses,
        this.ownerDraft.draftAddress,
      );
      if (!this.isCurrentSaveIntent(intent)) return false;

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
      if (!this.isCurrentSaveIntent(intent)) return false;

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
      if (!this.isCurrentSaveIntent(intent)) return false;

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
      if (!this.isCurrentSaveIntent(intent)) return false;

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
      if (!this.isCurrentSaveIntent(intent)) return false;

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
      if (!this.isCurrentSaveIntent(intent)) return false;

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
      if (!this.isCurrentSaveIntent(intent)) return false;

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
        () => this.isCurrentSaveIntent(intent),
      );
      if (!this.isCurrentSaveIntent(intent)) return false;

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
  async checkAllChanges(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();

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
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
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
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
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
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
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
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
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
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
      if (changes)
        this.changingData.main = {
          ...(this.changingData.main ?? {}),
          ...changes,
        };
      // The planner keeps a form string; archival requests use the schema's object wrapper.
      this.outdatingData.officialName = outdating === null ? null : { officialName: outdating };
    }

    // Contacts

    if (this.isContactsOwnerContext()) {
      const { changes, outdatingIds, deletingIds } =
        await this.ownerChangesPlannerService.diffContacts(
          this.existingOwner!,
          this.ownerDraft,
          this.contactTypes,
          this.restoringDataDraft.contacts,
          () => this.isCurrentSaveIntent(intent),
        );
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
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
          () => this.isCurrentSaveIntent(intent),
        );
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();

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
          () => this.isCurrentSaveIntent(intent),
        );
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
      this.changingData.institutes = changes;
      this.outdatingData.institutes = outdating;
      if (deleting) {
        this.deletingDataDraft.institutes ??= [];
        this.deletingDataDraft.institutes.push(...deleting);
      }
    }
    if (this.isVolunteerContext()) {
      const { changes, deleting } =
        await this.ownerChangesPlannerService.diffSubs(
          this.existingOwner!.subscriptions ?? [],
          this.ownerDraft.draftSubscriptions ?? [],
          this.user()!.id,
        );
      if (!this.isCurrentSaveIntent(intent)) return this.pendingUpdateData();
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
    return this.pendingUpdateData();
  }

  private pendingUpdateData() {
    return {
      changingData: this.changingData,
      restoringData: this.restoringDataDraft,
      outdatingData: this.outdatingData,
      deletingData: this.deletingDataDraft,
    };
  }

  saveOwner(intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return;
    const service = this.getService();
    service
      .saveOwner(this.ownerDraft)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.isCurrentSaveIntent(intent)) this.emitShowSpinner(false);
        }),
      )
      .subscribe({
        next: (res) => {
          if (!this.isCurrentSaveIntent(intent)) return;
          if (this.action === 'saveAndExit') {
            this.emitShowSpinner(false);
            this.invalidateSaveIntent();
            this.closeDialogDataSignal.set(res.data);
            this.emittedCloseDialogData.emit(res.data);
          }
        },
        error: (err) => {
          if (!this.isCurrentSaveIntent(intent)) return;
          this.msgWrapper.handle(err, {
            source: 'CreateOwnerDialog',
            stage: 'saveOwner',
            kind: this.kind,
          });
        },
      });
  }
  private resetPendingEditState() {
    this.setRestoringDataDraft();
    this.setDeletingDataDraft();
    this.setChangingData();
    this.setOutdatingData();
  }

  protected override changeToViewMode(
    addressParams: DefaultAddressParams | null,
  ) {
    // Pending mutations must not survive the edit session that produced them.
    this.resetPendingEditState();
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
  }, intent = this.saveIntent) {
    if (!this.isCurrentSaveIntent(intent)) return;
    const service = this.getService();
    service
      .saveUpdatedOwner(this.existingOwner!.id, upgradedOwnerData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.isCurrentSaveIntent(intent)) this.emitShowSpinner(false);
        }),
      )
      .subscribe({
        next: (res) => {
          if (!this.isCurrentSaveIntent(intent)) return;
          if (this.action === 'saveAndExit') {
            this.emitShowSpinner(false);
            this.invalidateSaveIntent();
            this.closeDialogDataSignal.set('close');
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
          if (this.existingOwner) {
            this.outdatedDataDraft = structuredClone(
              this.existingOwner!.outdatedData,
            ) as OutdatedByKind<K>;
          }

          this.setHasOutdatedUserNames();
          this.setHasOutdatedNames();
          this.setHasOutdatedOfficialNames();
          this.setHasOutdatedCoordinations();
          this.setHomeOpen();
          this.setPartnerActive();

          this.hasOutdatedContacts.set(
            'contacts' in this.outdatedDataDraft &&
              Object.keys(this.outdatedDataDraft.contacts).length > 0,
          );
          this.hasOutdatedAddresses.set(
            'addresses' in this.outdatedDataDraft &&
              this.outdatedDataDraft.addresses.length > 0,
          );

          this.addressFilterComponent.onChangeMode(
            'view',
            this.data().defaultAddressParams!,
          );

          this.emitShowSpinner(false);
          this.changeToViewMode(null);
          this.setInitialValues('view');
        },
        error: (err) => {
          if (!this.isCurrentSaveIntent(intent)) return;
          this.msgWrapper.handle(err, {
            source: 'EditOwnerDialog',
            stage: 'saveUpdatedOwner',
            kind: this.kind,
            ownerId: this.existingOwner!.id,
          });
        },
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

  // Owner-specific hooks and template helpers
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

  hasSubscriptions(): boolean {
    return false;
  }
  hasCooperations(): boolean {
    return false;
  }
  hasInstitutes(): boolean {
    return false;
  }

  checkUserName(_intent = this.saveIntent) {}
  onChangePasswordClick() {}
  onAddInstituteClick() {}
  getRowSpanForUserNames() {
    return 0;
  }
  setHasOutdatedUserNames() {}
  setHasOutdatedInstitutes() {}
  setHasOutdatedSubs() {}
  setHasOutdatedCoops() {}
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
  setPartnerActive() {}

  getRowSpanForInstitutes() {
    return 0;
  }
  getRowSpanForCoops() {
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
    return this.mainForm.get('nursingHome') as FormControl<RelationPick | null>;
  }

  get spouseCtrl(): FormControl<RelationPick | null> {
    return this.mainForm.get('spouse') as FormControl<RelationPick | null>;
  }

  clearHomeControl() {
    this.mainForm.get('nursingHome')?.setValue(null);
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

  get lastDateOfUpdate(): Date | null {
    return null;
  }
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
  get outdatedSubscriptions(): Subscription[] {
    return [];
  }
  get outdatedCooperations(): Cooperation[] {
    return [];
  }

  onRestoreOutdatedUserName(data: OutdatedUserName) {}
  onRestoreOutdatedInstitute(data: OutdatedInstitute) {}
  onRestoreOutdatedOfficialName(data: OutdatedOfficialName) {}
  onRestoreOutdatedCoordination(data: OutdatedCoordination) {}
}
