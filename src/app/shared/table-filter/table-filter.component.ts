// src/app/shared/table-filter/table-filter.component.ts
import {
  Component,
  DestroyRef,
  Injector,
  ViewChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FieldsetModule } from 'primeng/fieldset';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { RoleService } from '../../services/role.service';
import { MessageWrapperService } from '../../services/message.service';

import {
  AddressFilterParams,
  DefaultAddressParams,
  AddressFilter,
  typedKeys,
} from '../../interfaces/toponym';
import {
  FilterComponentSource,
  GeneralFilter,
  TableParams,
  createEmptyGeneralFilter,
} from '../../interfaces/base-list';

import { AddressFilterComponent } from '../address-filter/address-filter.component';
import {
  affiliations,
  categories,
  ContactType,
  RelationPick,
} from '../../interfaces/advanced-model';
import { HomeService } from '../../services/home.service';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  pairwise,
  startWith,
} from 'rxjs';
import { PartnerService } from '../../services/partner.service';
import { AddressService } from '../../services/address.service';
import { UserService } from '../../services/user.service';

type FilterForm = FormGroup<{
  roles: FormControl<
    {
      id: number;
      name: string;
    }[]
  >;
  affiliations: FormControl<string[]>;
  categories: FormControl<string[]>;
  homes: FormControl<RelationPick[]>;
  homeRegions: FormControl<{ id: number; name: string }[]>;
  partners: FormControl<RelationPick[]>;
  cooperations: FormControl<RelationPick[]>;
  subscriptions: FormControl<RelationPick[]>;
  details: FormControl<{ value: string; label: string }[]>;
  gender: FormControl<string | null>;
  contactTypes: FormControl<{ type: ContactType; label: string }[]>;
  startBeginningDate: FormControl<Date | null>;
  endBeginningDate: FormControl<Date | null>;
  startRestrictionDate: FormControl<Date | null>;
  endRestrictionDate: FormControl<Date | null>;
  startExitDate: FormControl<Date | null>;
  endExitDate: FormControl<Date | null>;
  startUpdateDate: FormControl<Date | null>;
  endUpdateDate: FormControl<Date | null>;
  startLastOrderDate: FormControl<Date | null>;
  endLastOrderDate: FormControl<Date | null>;
  strongAddressFilter: FormControl<boolean>;
  strongContactFilter: FormControl<boolean>;
  strongDetailFilter: FormControl<boolean>;
  noAddress: FormControl<boolean | null>;
  specialHome: FormControl<boolean | null>;
  acceptableForSchool: FormControl<boolean | null>;
  hasCoordination: FormControl<boolean | null>;
  hasInstitute: FormControl<boolean | null>;
  hasSubscription: FormControl<boolean | null>;
  hasCooperation: FormControl<boolean | null>;
  minBirthDay: FormControl<number>;
  maxBirthDay: FormControl<number>;
  minBirthYear: FormControl<number>;
  maxBirthYear: FormControl<number>;
  minBirthMonth: FormControl<number>;
  maxBirthMonth: FormControl<number>;
  hideWithoutYear: FormControl<boolean>;
  hideWithoutBirthday: FormControl<boolean>;
}>;

@Component({
  selector: 'app-table-filter',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    BadgeModule,
    OverlayBadgeModule,
    FieldsetModule,
    AddressFilterComponent,
    MatChipsModule,
    TranslateModule,
    MatSliderModule,
  ],
  templateUrl: './table-filter.component.html',
  styleUrl: './table-filter.component.css',
})
export class TableFilterComponent implements OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly homeService = inject(HomeService);
  private readonly partnerService = inject(PartnerService);
  private readonly userService = inject(UserService);
  private readonly addressService = inject(AddressService);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly translate = inject(TranslateService);

  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  // Inputs / Outputs
  defaultAddressParams = input.required<DefaultAddressParams>();
  source = input.required<FilterComponentSource>();
  labels = input.required<TableParams['labels']>();
  includeOutdatedOption = model.required<boolean>();
  viewOption = input.required<string>();
  viewHomeOption = input.required<string>();

  filterBadgeValue = output<number>();
  filterValue = output<GeneralFilter>();
  addressStringValue = output<string>();
  addressFilterValue = output<AddressFilter>();
  strongAddressFilter = output<boolean>();
  strongContactFilter = output<boolean>();
  strongDetailFilter = output<boolean>();
  goToFirstPage = output<void>();

  // UI state
  addressString = signal<string>('');
  addressFilter = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });
  addressFilterBadgeValue = signal<number>(0);
  lessThanTwoContactTypes = signal<boolean>(true);
  lessThanTwoToponyms = signal<boolean>(true);
  lessThanTwoDetails = signal<boolean>(true);

  // Data
  rolesList: { id: number; name: string }[] = [];
  params!: AddressFilterParams;
  affiliations = affiliations;
  categories = categories;
  homesList: RelationPick[] = [];
  accessibleHomesList: RelationPick[] = [];
  partnersList: RelationPick[] = [];
  accessiblePartnersList: RelationPick[] = [];
  regionsList: { id: number; name: string }[] = [];
  usersList: RelationPick[] = [];
  accessibleUsersList: RelationPick[] = [];

  // Reactive toggles
  private strongAddressFilterControl = effect(
    () => {
      const enable =
        this.includeOutdatedOption() && !this.lessThanTwoToponyms();
      const ctl = this.form.controls.strongAddressFilter;
      if (enable) ctl.enable();
      else {
        ctl.setValue(false, { emitEvent: false });
        ctl.disable();
      }
    },
    { injector: this.injector },
  );

  private strongContactFilterControl = effect(
    () => {
      const enable = !this.lessThanTwoContactTypes();
      const ctl = this.form.controls.strongContactFilter;
      if (enable) ctl.enable();
      else {
        ctl.setValue(false, { emitEvent: false });
        ctl.disable();
      }
    },
    { injector: this.injector },
  );

  private strongDetailFilterControl = effect(
    () => {
      const enable = !this.lessThanTwoDetails();
      const ctl = this.form.controls.strongDetailFilter;
      if (enable) ctl.enable();
      else {
        ctl.setValue(false, { emitEvent: false });
        ctl.disable();
      }
    },
    { injector: this.injector },
  );

  readonly currentYear: number = +new Date().getFullYear();

  // Form
  form: FilterForm = new FormGroup({
    roles: new FormControl<
      {
        id: number;
        name: string;
      }[]
    >([], { nonNullable: true }),
    affiliations: new FormControl<string[]>([], { nonNullable: true }),
    categories: new FormControl<string[]>([], { nonNullable: true }),
    startBeginningDate: new FormControl<Date | null>(null),
    endBeginningDate: new FormControl<Date | null>(null),
    startRestrictionDate: new FormControl<Date | null>(null),
    endRestrictionDate: new FormControl<Date | null>(null),
    startExitDate: new FormControl<Date | null>(null),
    endExitDate: new FormControl<Date | null>(null),
    startUpdateDate: new FormControl<Date | null>(null),
    endUpdateDate: new FormControl<Date | null>(null),
    startLastOrderDate: new FormControl<Date | null>(null),
    endLastOrderDate: new FormControl<Date | null>(null),
    strongAddressFilter: new FormControl<boolean>(
      { value: false, disabled: true },
      { nonNullable: true },
    ),
    strongContactFilter: new FormControl<boolean>(
      { value: false, disabled: true },
      { nonNullable: true },
    ),
    strongDetailFilter: new FormControl<boolean>(
      { value: false, disabled: true },
      { nonNullable: true },
    ),
    contactTypes: new FormControl<{ type: ContactType; label: string }[]>([], {
      nonNullable: true,
    }),
    homes: new FormControl<RelationPick[]>([], { nonNullable: true }),
    homeRegions: new FormControl<{ id: number; name: string }[]>([], {
      nonNullable: true,
    }),
    partners: new FormControl<RelationPick[]>([], { nonNullable: true }),
    subscriptions: new FormControl<RelationPick[]>([], { nonNullable: true }),
    cooperations: new FormControl<RelationPick[]>([], { nonNullable: true }),
    details: new FormControl<{ value: string; label: string }[]>([], {
      nonNullable: true,
    }),
    gender: new FormControl<string | null>(null),
    noAddress: new FormControl<boolean | null>(null),
    specialHome: new FormControl<boolean | null>(null),
    acceptableForSchool: new FormControl<boolean | null>(null),
    hasCoordination: new FormControl<boolean | null>(null),
    hasInstitute: new FormControl<boolean | null>(null),
    hasSubscription: new FormControl<boolean | null>(null),
    hasCooperation: new FormControl<boolean | null>(null),

    minBirthDay: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    maxBirthDay: new FormControl<number>(31, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    minBirthYear: new FormControl<number>(1917, {
      nonNullable: true,
      validators: [Validators.min(1917), Validators.max(this.currentYear)],
    }),
    maxBirthYear: new FormControl<number>(this.currentYear, {
      nonNullable: true,
      validators: [Validators.min(1917), Validators.max(this.currentYear)],
    }),
    minBirthMonth: new FormControl<number>(1, { nonNullable: true }),
    maxBirthMonth: new FormControl<number>(12, { nonNullable: true }),
    hideWithoutYear: new FormControl<boolean>(false, { nonNullable: true }),
    hideWithoutBirthday: new FormControl<boolean>(false, { nonNullable: true }),
  });

  // Static data
  readonly contactTypesList = [
    { type: 'email', label: 'NAV.FILTER.EMAIL_OPT' },
    { type: 'phoneNumber', label: 'NAV.FILTER.PHONE_NUMBER_OPT' },
    { type: 'telegramId', label: 'NAV.FILTER.TELEGRAM_ID_OPT' },
    {
      type: 'telegramPhoneNumber',
      label: 'NAV.FILTER.TELEGRAM_PHONE_NUMBER_OPT',
    },
    { type: 'telegramNickname', label: 'NAV.FILTER.TELEGRAM_NICKNAME_OPT' },
    { type: 'whatsApp', label: 'NAV.FILTER.WHATSAPP_OPT' },
    { type: 'vKontakte', label: 'NAV.FILTER.VKONTAKTE_OPT' },
    { type: 'instagram', label: 'NAV.FILTER.INSTAGRAM_OPT' },
    { type: 'facebook', label: 'NAV.FILTER.FACEBOOK_OPT' },
    { type: 'website', label: 'NAV.FILTER.WEBSITE_OPT' },
    { type: 'otherContact', label: 'NAV.FILTER.OTHER_CONTACT_OPT' },
  ] as const;

  detailsOptions = [{ value: 'comment', label: 'NAV.FILTER.COMMENT_OPT' }];
  monthsOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `NAV.FILTER.${
      [
        'JANUARY',
        'FEBRUARY',
        'MARCH',
        'APRIL',
        'MAY',
        'JUNE',
        'JULY',
        'AUGUST',
        'SEPTEMBER',
        'OCTOBER',
        'NOVEMBER',
        'DECEMBER',
      ][i]
    }`,
  }));

  ngOnInit() {
    console.log('this.currentYear', this.currentYear);
    this.params = {
      source: this.source(),
      multiple: true,
      cols: '1',
      gutterSize: '16px',
      rowHeight: '57px',
      isShowCountry: true,
      isShowRegion: true,
      isShowDistrict: true,
      isShowLocality: true,
      class: 'none',
    };

    this.roleService
      .getRolesNamesList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => (this.rolesList = res.data),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'TableFilterComponent',
            stage: 'ngOnInit - getRolesNamesList',
            typeOfList: this.source(),
          }),
      });

    if (this.source() === 'homeList') {
      this.partnerService
        .getPartnersPickList()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.partnersList = res;
            this.upgradeActivePartnersList();
          },
          error: (err) =>
            this.msgWrapper.handle(err, {
              source: 'TableFilterComponent',
              stage: 'ngOnInit - getPartnersPickList',
              typeOfList: this.source(),
            }),
        });
    }

    if (this.source() === 'seniorList' || this.source() === 'partnerList') {
      this.homeService
        .getHomesPickList()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.homesList = res;
            this.upgradeActiveHomesList();
            /* this.accessibleHomesList = res.filter(
              (h) => h.isRestricted !== false,
            ); */
          },
          error: (err) =>
            this.msgWrapper.handle(err, {
              source: 'TableFilterComponent',
              stage: 'ngOnInit - getActiveHomesPickList',
              typeOfList: this.source(),
            }),
        });
    }

    if (this.source() === 'partnerList') {
      this.addressService
        .getListOfToponyms([143], 'regions')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => (this.regionsList = res.data),
          error: (err) =>
            this.msgWrapper.handle(err, {
              source: 'TableFilterComponent',
              stage: 'ngOnInit - getListOfToponyms',
              typeOfList: this.source(),
            }),
        });
    }

    if (this.source() === 'volunteerList') {
      this.userService
        .getUsersPickList()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.usersList = res;
            this.upgradeActiveUsersList();
          },
          error: (err) =>
            this.msgWrapper.handle(err, {
              source: 'TableFilterComponent',
              stage: 'ngOnInit - getUsersPickList',
              typeOfList: this.source(),
            }),
        });
    }

    if (this.source() === 'seniorList') {
      this.detailsOptions = [
        {
          value: 'personalNoAddr',
          label: 'NAV.FILTER.PERSONAL_NO_ADDRESS_LABEL',
        },
        { value: 'comment', label: 'NAV.FILTER.COMMENT_OPT' },
        { value: 'photoLink', label: 'NAV.FILTER.PHOTO_LINK_OPT' },
        { value: 'dateOfConsent', label: 'NAV.FILTER.CONSENT_OPT' },
        {
          value: 'kindergarten',
          label: 'NAV.FILTER.KINDERGARTEN_OPT',
        },
        { value: 'teacher', label: 'NAV.FILTER.TEACHER_OPT' },
        { value: 'honoraryStatus', label: 'NAV.FILTER.HONORARY_OPT' },
        { value: 'veteran', label: 'NAV.FILTER.VETERAN_OPT' },
        { value: 'childOfWar', label: 'NAV.FILTER.CHILD_OF_WAR_OPT' },
        {
          value: 'orthodoxBeliever',
          label: 'NAV.FILTER.BELIEVER_OPT',
        },
        { value: 'profession', label: 'NAV.FILTER.PROFESSION_OPT' },
        { value: 'interests', label: 'NAV.FILTER.INTERESTS_OPT' },
        { value: 'spouseId', label: 'NAV.FILTER.SPOUSE_OPT' },
      ];
    }

    /*     this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()), // чтобы отработало и на старте
        debounceTime(150),
        map(() => this.form.getRawValue()),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((v) => {
        // здесь значение уже “истинное”, без бага второго клика
        this.emitSelectedFilters(v);
      }); */

    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        debounceTime(150),
        map(() => this.form.getRawValue()),
        pairwise(), // ← даст [prev, curr]
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([prev, curr]) => {
        const regionsChanged =
          JSON.stringify(prev.homeRegions) !== JSON.stringify(curr.homeRegions);
        if (regionsChanged) this.upgradeActiveHomesList();

        this.emitSelectedFilters(curr);
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log("changes['viewOption']", changes['viewOption']);
    console.log('this.viewOption', this.viewOption());
    // if (changes['viewOption']) this.upgradeActiveHomesList();
    if (changes['includeOutdatedOption']) {
      this.upgradeActiveHomesList();
      this.upgradeActivePartnersList();
      this.upgradeActiveUsersList();
    }
    if (changes['viewHomeOption']) {
      this.upgradeActiveHomesList();
    }
  }

  readonly hasPeculiarities = () => {
    const isChosen = (v: unknown): v is boolean => v === true || v === false;
    const { noAddress, specialHome, acceptableForSchool } = this.form.controls;
    return [noAddress.value, specialHome.value, acceptableForSchool.value].some(
      isChosen,
    );
  };

  readonly hasDetails = () => {
    const isChosen = (v: unknown): v is boolean => v === true || v === false;
    //const hasCoordination = this.form.controls.hasCoordination.value;
    const { hasCoordination, hasInstitute, hasSubscription, hasCooperation } =
      this.form.controls;
    return (
      this.form.controls.details.value.length > 0 ||
      [
        hasCoordination.value,
        hasInstitute.value,
        hasSubscription.value,
        hasCooperation.value,
      ].some(isChosen)
    );
  };

  readonly hasBirthday = () => {
    const {
      minBirthDay,
      maxBirthDay,
      minBirthYear,
      maxBirthYear,
      minBirthMonth,
      maxBirthMonth,
      hideWithoutYear,
      hideWithoutBirthday,
    } = this.form.controls;

    return (
      minBirthDay.value !== 1 ||
      maxBirthDay.value !== 31 ||
      minBirthYear.value !== 1917 ||
      maxBirthYear.value !== this.currentYear ||
      minBirthMonth.value !== 1 ||
      maxBirthMonth.value !== 12 ||
      hideWithoutYear.value ||
      hideWithoutBirthday.value
    );
  };

  upgradeActiveHomesList() {
    if (
      this.homesList.length &&
      (this.source() === 'seniorList' || this.source() === 'partnerList')
    ) {
      const regions =
        this.source() === 'seniorList'
          ? this.addressFilter().regions
          : this.form.controls.homeRegions.value.map((r) => r.id);
      if (regions.length > 0) {
        this.accessibleHomesList = this.homesList.filter((h) =>
          regions.includes(h.regionId!),
        );
        if (regions.length == 1) {
          const chosenValues = this.form.controls.homes
            .getRawValue()
            .filter((h) => regions.includes(h.regionId!));
          this.form.controls.homes.setValue(chosenValues);
          this.form.controls.homes.enable();
        } else {
          this.form.controls.homes.setValue([]);
          this.form.controls.homes.disable();
        }
      } else {
        this.accessibleHomesList = [...this.homesList];
        this.form.controls.homes.enable();
      }
      if (!this.includeOutdatedOption() && this.source() === 'partnerList') {
        this.accessibleHomesList = this.accessibleHomesList.filter(
          (h) => h.isClose === false,
        );
        const chosenValues = this.form.controls.homes
          .getRawValue()
          .filter((h) => h.isClose === false);

        this.form.controls.homes.setValue(chosenValues);
      }

      if (this.source() === 'seniorList') {
        let condition: (h: RelationPick) => boolean = () => true;

        switch (this.viewHomeOption()) {
          case 'only-active':
            condition = (h) => h.isRestricted === false && h.isClose === false;
            break;

          case 'only-blocked':
            condition = (h) => h.isRestricted === true && h.isClose === false;
            break;

          case 'only-closed':
            condition = (h) => h.isClose === true;
            break;

          case 'exclude-closed':
            condition = (h) => h.isClose === false;
            break;

          default:
            condition = () => true;
        }

        this.accessibleHomesList = this.accessibleHomesList.filter(condition);
        const chosenValues = this.form.controls.homes
          .getRawValue()
          .filter(condition);

        this.form.controls.homes.setValue(chosenValues);
      }

      console.log('HERE - this.accessibleHomesList', this.accessibleHomesList);
    }
  }

  upgradeActivePartnersList() {
    if (this.partnersList.length && this.source() === 'homeList') {
      console.log('HERE - this.partnersList', this.partnersList);
      console.log(
        'HERE - this.accessiblePartnersList',
        this.accessiblePartnersList,
      );
      if (!this.includeOutdatedOption()) {
        this.accessiblePartnersList = this.partnersList.filter(
          (p) => p.isRestricted === false,
        );
        const chosenValues = this.form.controls.partners
          .getRawValue()
          .filter((p) => p.isRestricted === false);

        this.form.controls.partners.setValue(chosenValues);
      } else {
        this.accessiblePartnersList = [...this.partnersList];
      }
      console.log(
        'HERE - this.accessiblePartnersList',
        this.accessiblePartnersList,
      );
    }
  }

  upgradeActiveUsersList() {
    if (this.usersList.length && this.source() === 'volunteerList') {
      console.log('HERE - this.usersList', this.usersList);
      console.log('HERE - this.accessibleUsersList', this.accessibleUsersList);
      if (!this.includeOutdatedOption()) {
        this.accessibleUsersList = this.usersList.filter(
          (u) => u.isRestricted === false,
        );
        const chosenSubsValues = this.form.controls.subscriptions
          .getRawValue()
          .filter((u) => u.isRestricted === false);
        this.form.controls.subscriptions.setValue(chosenSubsValues);

        const chosenCoopsValues = this.form.controls.cooperations
          .getRawValue()
          .filter((u) => u.isRestricted === false);
        this.form.controls.cooperations.setValue(chosenCoopsValues);
      } else {
        this.accessibleUsersList = [...this.usersList];
      }
      console.log('HERE - this.accessibleUsersList', this.accessibleUsersList);
    }
  }

  // Address filter child → parent
  onAddressFilterChange(v: AddressFilter) {
    this.addressFilter.set(v);

    this.upgradeActiveHomesList();
    this.emitSelectedFilters(this.form.getRawValue());
  }
  onAddressStringChange(v: string) {
    this.addressString.set(v);
    this.emitSelectedFilters(this.form.getRawValue());
  }
  onAddressFilterBadgeValueChange(v: number) {
    this.addressFilterBadgeValue.set(v);
    this.emitSelectedFilters(this.form.getRawValue());
  }
  //TODO: блокировать возможность взаимоискл. выбора: например выбрали координатора и 'без координации'

  // Build/emit current filter state
  private getRange(
    start: Date | null, //keyof FilterForm['controls'],
    end: Date | null, //keyof FilterForm['controls'],
    fallbackStart?: Date,
    fallbackEnd?: Date,
  ): Date[] {
    //const start = this.form.controls[startKey].value;
    //const end = this.form.controls[endKey].value;
    const toDate = (d: any) =>
      typeof d?.toDate === 'function' ? d.toDate() : d;

    if (start && end) return [toDate(start), toDate(end)];
    if (start && !end) return [toDate(start), fallbackEnd ?? new Date()];
    if (!start && end)
      return [fallbackStart ?? new Date('2014-10-01'), toDate(end)];
    return [];
  }

  private recomputeEnablers(filter: GeneralFilter) {
    this.lessThanTwoContactTypes.set((filter.contactTypes ?? []).length < 2);

    this.lessThanTwoToponyms.set(true);
    for (const k of typedKeys(this.addressFilter())) {
      if (this.addressFilter()[k].length > 1) {
        this.lessThanTwoToponyms.set(false);
        break;
      }
    }
    const forSeniors = (filter.details ?? []).length < 2;

    const forPartnersAndHomes = !(
      (filter.details ?? []).length === 1 &&
      (filter.hasCoordination === true || filter.hasCoordination === false)
    );
    const arr = [
      (filter.details ?? []).length === 1,
      filter.hasInstitute === true || filter.hasInstitute === false,
      filter.hasSubscription === true || filter.hasSubscription === false,
      filter.hasCooperation === true || filter.hasCooperation === false,
    ];

    const forVolunteers = arr.filter((i) => i === true).length < 2;

    const res =
      this.source() === 'homeList' || this.source() === 'partnerList'
        ? forPartnersAndHomes
        : this.source() === 'seniorList'
          ? forSeniors
          : this.source() === 'volunteerList'
            ? forVolunteers
            : true;
    console.log('RES', res);

    this.lessThanTwoDetails.set(res);
    /*
    if (this.lessThanTwoContactTypes()) {
      this.form.controls.strongContactFilter.setValue(false, {
        emitEvent: false,
      });
    }
    if (this.lessThanTwoToponyms()) {
      this.form.controls.strongAddressFilter.setValue(false, {
        emitEvent: false,
      });
    }
       if (this.lessThanTwoDetails()) {
      this.form.controls.strongDetailFilter.setValue(false, {
        emitEvent: false,
      });
    } */
  }

  emitSelectedFilters(form: ReturnType<typeof this.form.getRawValue>) {
    let count = 0;

    const filter: GeneralFilter = {
      roles: form.roles ?? [],
      affiliations: form.affiliations ?? [],
      categories: form.categories ?? [],
      contactTypes: form.contactTypes ?? [],
      gender: form.gender,
      homes: form.homes ?? [],
      homeRegions: form.homeRegions ?? [],
      partners: form.partners ?? [],
      subscriptions: form.subscriptions ?? [],
      cooperations: form.cooperations ?? [],
      dateBeginningRange: this.getRange(
        form.startBeginningDate,
        form.endBeginningDate,
        new Date('2014-10-01'),
        new Date(),
      ),
      dateRestrictionRange: this.getRange(
        form.startRestrictionDate,
        form.endRestrictionDate,
      ),
      dateExitRange: this.getRange(form.startExitDate, form.endExitDate),
      dateUpdateRange: this.getRange(form.startUpdateDate, form.endUpdateDate),
      dateLastOrderRange: this.getRange(
        form.startLastOrderDate,
        form.endLastOrderDate,
      ),
      details: form.details ?? [],
      noAddress: form.noAddress,
      specialHome: form.specialHome,
      acceptableForSchool: form.acceptableForSchool,
      hasCoordination: form.hasCoordination,
      hasInstitute: form.hasInstitute,
      hasSubscription: form.hasSubscription,
      hasCooperation: form.hasCooperation,
      birthDate: {
        dayRange:
          form.minBirthDay !== 1 || form.maxBirthDay !== 31
            ? [form.minBirthDay, form.maxBirthDay]
            : [],
        monthRange:
          form.minBirthMonth !== 1 || form.maxBirthMonth !== 12
            ? [form.minBirthMonth, form.maxBirthMonth]
            : [],
        yearRange:
          form.minBirthYear !== 1917 || form.maxBirthYear !== this.currentYear
            ? [form.minBirthYear, form.maxBirthYear]
            : [],
      },
      hideWithoutYear: form.hideWithoutYear,
      hideWithoutBirthday: form.hideWithoutBirthday,
    };
    console.log('filter.gender', filter.gender, form.gender);

    // Count active filters
    if (filter.dateBeginningRange.length) count++;
    if (filter.dateRestrictionRange.length) count++;
    if (filter.dateExitRange.length) count++;
    if (filter.dateUpdateRange.length) count++;
    if (filter.dateLastOrderRange.length) count++;
    if (filter.roles.length) count++;
    if (filter.affiliations.length) count++;
    if (filter.categories.length) count++;
    if (filter.contactTypes.length) count++;
    if (filter.homes.length || filter.homeRegions.length) count++;
    if (filter.partners.length) count++;
    if (filter.subscriptions.length) count++;
    if (filter.cooperations.length) count++;
    if (
      /* filter.details.length ||
      filter.hasCoordination === true ||
      filter.hasCoordination === false */
      this.hasDetails()
    )
      count++;
    if (filter.gender) count++;
    if (
      [filter.noAddress, filter.specialHome, filter.acceptableForSchool].some(
        (v) => v === true || v === false,
      )
    )
      count++;
    if (
      filter.birthDate.dayRange.length ||
      filter.birthDate.monthRange.length ||
      filter.birthDate.yearRange.length ||
      filter.hideWithoutBirthday ||
      filter.hideWithoutYear
    )
      count++;
    this.recomputeEnablers(filter);
    count += this.addressFilterBadgeValue();

    // Emit everything atomically
    this.goToFirstPage.emit();
    this.filterBadgeValue.emit(count);
    this.filterValue.emit(filter);
    this.addressStringValue.emit(this.addressString());
    this.addressFilterValue.emit(this.addressFilter());
    this.strongAddressFilter.emit(this.form.controls.strongAddressFilter.value);
    this.strongContactFilter.emit(this.form.controls.strongContactFilter.value);
    this.strongDetailFilter.emit(this.form.controls.strongDetailFilter.value);
    console.log('emitSelectedFilters', filter.homes);
  }

  clearForm() {
    this.form.reset({
      roles: [],
      affiliations: [],
      categories: [],
      contactTypes: [],
      startBeginningDate: null,
      endBeginningDate: null,
      startRestrictionDate: null,
      endRestrictionDate: null,
      startExitDate: null,
      endExitDate: null,
      startUpdateDate: null,
      endUpdateDate: null,
      startLastOrderDate: null,
      endLastOrderDate: null,
      strongAddressFilter: false,
      strongContactFilter: false,
      strongDetailFilter: false,
      homes: [],
      partners: [],
      subscriptions: [],
      cooperations: [],
      homeRegions: [],
      details: [],
      gender: undefined,
      noAddress: undefined,
      specialHome: undefined,
      acceptableForSchool: undefined,
      hasCoordination: undefined,
      hasInstitute: undefined,
      hasSubscription: undefined,
      hasCooperation: undefined,
      minBirthDay: 1,
      maxBirthDay: 31,
      minBirthYear: 1917,
      maxBirthYear: this.currentYear,
      minBirthMonth: 1,
      maxBirthMonth: 12,
      hideWithoutYear: false,
      hideWithoutBirthday: false,
    } as any);

    this.form.controls.strongAddressFilter.disable();
    this.form.controls.strongContactFilter.disable();
    this.form.controls.strongDetailFilter.disable();

    this.lessThanTwoContactTypes.set(true);
    this.lessThanTwoToponyms.set(true);
    this.lessThanTwoToponyms.set(true);

    this.addressFilterComponent.clearForm();

    // Emit cleared state
    this.filterBadgeValue.emit(0);
    this.filterValue.emit(createEmptyGeneralFilter());
    this.addressStringValue.emit('');
    this.addressFilterValue.emit({
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    });
    this.strongAddressFilter.emit(this.form.controls.strongAddressFilter.value);
    this.strongContactFilter.emit(this.form.controls.strongContactFilter.value);
    this.strongDetailFilter.emit(this.form.controls.strongDetailFilter.value);
  }
}
