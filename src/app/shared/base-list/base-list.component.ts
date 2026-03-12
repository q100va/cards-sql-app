// src/app/shared/base-list/base-list.component.ts
import {
  Component,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';

import { ProgressSpinner } from 'primeng/progressspinner';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateUtilsService } from '../../services/date-utils.service';

import { TableSettingsComponent } from '../table-settings/table-settings.component';
import { TableFilterComponent } from '../table-filter/table-filter.component';

import {
  DefaultAddressParams,
  AddressFilter,
  typedKeys,
} from '../../interfaces/toponym';
import {
  ColumnDefinition,
  createEmptyGeneralFilter,
  FilterComponentSource,
  GeneralFilter,
  TableParams,
  ViewOption,
} from '../../interfaces/base-list';
import { BlurOnClickDirective } from '../../directives/blur-on-click.directive';
import { HasOpDirective } from '../../directives/has-op.directive';

import {
  PERMISSIONS_COMPONENT_REGISTRY,
  PermissionSet,
} from './base-list-component-registry';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactType, RelationPick } from '../../interfaces/advanced-model';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-base-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatIconModule,
    MatSidenavModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    ProgressSpinner,
    TableSettingsComponent,
    TableFilterComponent,
    BlurOnClickDirective,
    HasOpDirective,
    TranslateModule,
  ],
  templateUrl: './base-list.component.html',
  styleUrl: './base-list.component.css',
})
export class BaseListComponent {
  // DI
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly dateUtils = inject(DateUtilsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly dialog = inject(MatDialog);

  @ViewChild(TableFilterComponent) tableFilterComponent!: TableFilterComponent;

  // Inputs
  params = input.required<{
    columns: ColumnDefinition[];
    viewOptions: ViewOption[];
    componentType: FilterComponentSource;
    tableParams: TableParams;
  }>();
  showSpinner = input(true);

  // Outputs
  selectedColumns = output<string[]>();
  addWasClicked = output<void>();
  allFilterParametersChange = output<{
    viewOption: string;
    searchValue: string;
    includeOutdated: boolean;
    exactMatch: boolean;
    filter: GeneralFilter;
    addressFilter: AddressFilter;
    strongAddressFilter: boolean;
    strongContactFilter: boolean;
    strongDetailFilter: boolean;
  }>();
  defaultAddressFilterValue = output<AddressFilter>();

  // UI state
  settingsBadgeValue = 0;
  filterBadgeValue = 0;

  // Permissions
  permissions!: PermissionSet;

  // Filters state (signals)
  selectedViewOptionId = signal<string>('only-active');
  selectedHomeViewOptionId = signal<string>('only-active');
  includeOutdated = signal<boolean>(false);
  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  inputValue = '';

  filterValue = signal<GeneralFilter>(createEmptyGeneralFilter());

  addressFilterValue = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });

  addressStringValue = signal<string>('');
  strongAddressFilter = signal<boolean>(false);
  strongContactFilter = signal<boolean>(false);
  strongDetailFilter = signal<boolean>(false);

  // Derived DTO for API
  allFilterParameters = computed(() => ({
    viewOption: this.selectedViewOptionId(),
    viewHomeOption: this.selectedHomeViewOptionId(),
    searchValue: this.searchValue(),
    includeOutdated: this.includeOutdated(),
    exactMatch: this.exactMatch(),
    filter: this.filterValue(),
    addressFilter: this.addressFilterValue(),
    strongAddressFilter: this.strongAddressFilter(),
    strongContactFilter: this.strongContactFilter(),
    strongDetailFilter: this.strongDetailFilter(),
  }));

  // Human-readable summary for UI
  filterString = computed(() => {
    const ap = this.allFilterParameters();

    const pieces: string[] = [];

    // View option label

    console.log('ap.viewOption', ap.viewOption);
    console.log('this.params().viewOptions', this.params().viewOptions);

    const vo = this.params().viewOptions.find(
      (v) => v.id === ap.viewOption,
    )?.name;
    if (vo) pieces.push(this.translate.instant(vo));

    const vho = this.homeViewOptions.find(
      (v) => v.id === ap.viewHomeOption,
    )?.name;
    if (vho && this.params().componentType === 'seniorList')
      pieces.push(
        /* this.translate.instant('BASE_LIST.FROM_LABEL') + */
        this.translate.instant(vho) +
          (vho !== 'HOME.VIEW_OPTIONS.ALL'
            ? this.translate.instant('BASE_LIST.HOMES_LABEL')
            : ''),
      );

    /*     const vo = ap.viewOption.map((v) =>
      this.translate.instant(
        this.params().viewOptions.find((i) => i.id === v)!.name,
      ),
    ); */

    if (ap.searchValue) pieces.push(ap.searchValue);

    // GeneralFilter
    const gf: GeneralFilter = ap.filter;

    console.log('GeneralFilter', gf);

    if (gf.birthDate.dayRange.length) {
      pieces.push(
        this.translate.instant('BASE_LIST.DAY_LABEL') +
          gf.birthDate.dayRange.join('-'),
      );
    }
    if (gf.birthDate.monthRange.length) {
      pieces.push(
        this.translate.instant('BASE_LIST.MONTH_LABEL') +
          gf.birthDate.monthRange.join('-'),
      );
    }
    if (gf.birthDate.yearRange.length) {
      pieces.push(
        this.translate.instant('BASE_LIST.YEAR_LABEL') +
          gf.birthDate.yearRange.join('-'),
      );
    }
    if (gf.dateUpdateRange.length) {
      const label = this.translate.instant('BASE_LIST.UPDATE_LABEL');
      const [from, to] = gf.dateUpdateRange;
      pieces.push(
        `${label}: ${this.dateUtils.transformDate(
          from,
        )}-${this.dateUtils.transformDate(to)}`,
      );
    }
    if (gf.dateBeginningRange.length) {
      const label = this.translate.instant('BASE_LIST.START_LABEL');
      const [from, to] = gf.dateBeginningRange;
      pieces.push(
        `${label}: ${this.dateUtils.transformDate(
          from,
        )}-${this.dateUtils.transformDate(to)}`,
      );
    }
    if (gf.dateRestrictionRange.length) {
      const label = this.translate.instant('BASE_LIST.BLOCK_LABEL');
      const [from, to] = gf.dateRestrictionRange;
      pieces.push(
        `${label}: ${this.dateUtils.transformDate(
          from,
        )}-${this.dateUtils.transformDate(to)}`,
      );
    }
    if (gf.dateExitRange.length) {
      const label =
        this.params().componentType === 'seniorList'
          ? this.translate.instant('BASE_LIST.EXIT_LABEL')
          : this.translate.instant('BASE_LIST.CLOSE_LABEL');
      const [from, to] = gf.dateExitRange;
      pieces.push(
        `${label}: ${this.dateUtils.transformDate(
          from,
        )}-${this.dateUtils.transformDate(to)}`,
      );
    }
    if (gf.dateLastOrderRange.length) {
      const label = this.translate.instant('BASE_LIST.LAST_ORDER_LABEL');
      const [from, to] = gf.dateLastOrderRange;
      pieces.push(
        `${label}: ${this.dateUtils.transformDate(
          from,
        )}-${this.dateUtils.transformDate(to)}`,
      );
    }
    if (gf.contactTypes.length) {
      const labs = gf.contactTypes.map((i) => this.translate.instant(i.label));
      pieces.push(...labs);
    }
    if (gf.details.length) {
      const labs = gf.details.map((i) => this.translate.instant(i.label));
      pieces.push(...labs);
    }
    if (gf.hasCoordination !== null && gf.hasCoordination !== undefined) {
      const text =
        gf.hasCoordination === true
          ? 'NAV.FILTER.ONLY_WITH_COORDINATION'
          : 'NAV.FILTER.ONLY_WITHOUT_COORDINATION';
      pieces.push(this.translate.instant(text));
    }

    if (gf.hasInstitute !== null && gf.hasInstitute !== undefined) {
      const text =
        gf.hasInstitute === true
          ? 'NAV.FILTER.ONLY_WITH_INSTITUTE'
          : 'NAV.FILTER.ONLY_WITHOUT_INSTITUTE';
      pieces.push(this.translate.instant(text));
    }
    if (gf.hasSubscription !== null && gf.hasSubscription !== undefined) {
      const text =
        gf.hasSubscription === true
          ? 'NAV.FILTER.ONLY_WITH_SUBSCRIPTION'
          : 'NAV.FILTER.ONLY_WITHOUT_SUBSCRIPTION';
      pieces.push(this.translate.instant(text));
    }
    if (gf.hasCooperation !== null && gf.hasCooperation !== undefined) {
      const text =
        gf.hasCooperation === true
          ? 'NAV.FILTER.ONLY_WITH_COOPERATION'
          : 'NAV.FILTER.ONLY_WITHOUT_COOPERATION';
      pieces.push(this.translate.instant(text));
    }

    if (gf.roles.length) {
      const names = gf.roles.map((i) => i.name);
      pieces.push(...names);
    }

    if (gf.affiliations.length) {
      const affs = gf.affiliations.map((i) => this.translate.instant(i));
      pieces.push(...affs);
    }

    if (gf.categories.length) {
      const categories = gf.categories.map((i) => this.translate.instant(i));
      pieces.push(...categories);
    }
    if (gf.homes.length) {
      const names = gf.homes.map((i) => i.name);
      pieces.push(...names);
    }
    if (gf.homeRegions.length) {
      const names = gf.homeRegions.map((i) => i.name);
      pieces.push(...names);
    }
    if (gf.partners.length) {
      const names = gf.partners.map((i) => i.name);
      pieces.push(...names);
    }
    if (gf.subscriptions.length) {
      const names = gf.subscriptions.map((i) => i.name);
      pieces.push(...names);
    }
    if (gf.cooperations.length) {
      const names = gf.cooperations.map((i) => i.name);
      pieces.push(...names);
    }

    if (gf.gender !== null && gf.gender !== undefined) {
      const gender =
        gf.gender === 'male'
          ? 'NAV.FILTER.ONLY_MALE'
          : 'NAV.FILTER.ONLY_FEMALE';
      pieces.push(this.translate.instant(gender));
    }
    if (gf.noAddress !== null && gf.noAddress !== undefined) {
      const text =
        gf.noAddress === true
          ? 'NAV.FILTER.ONLY_NO_ADDRESS'
          : 'NAV.FILTER.WITHOUT_NO_ADDRESS';
      pieces.push(this.translate.instant(text));
    }
    if (gf.specialHome !== null && gf.specialHome !== undefined) {
      const text =
        gf.specialHome === true
          ? 'NAV.FILTER.ONLY_SPECIAL'
          : 'NAV.FILTER.WITHOUT_SPECIAL';
      pieces.push(this.translate.instant(text));
    }
    if (
      gf.acceptableForSchool !== null &&
      gf.acceptableForSchool !== undefined
    ) {
      const text =
        gf.acceptableForSchool === true
          ? 'NAV.FILTER.ONLY_ACC_FOR_SCHOOL'
          : 'NAV.FILTER.WITHOUT_ACC_FOR_SCHOOL';
      pieces.push(this.translate.instant(text));
    }
    if (gf.hideWithoutYear === true) {
      const text = 'NAV.FILTER.WITHOUT_YEAR';
      pieces.push(this.translate.instant(text));
    }
    if (gf.hideWithoutBirthday === true) {
      const text = 'NAV.FILTER.WITHOUT_BIRTHDAY';
      pieces.push(this.translate.instant(text));
    }

    // Address as a single string
    if (this.addressStringValue()) pieces.push(this.addressStringValue());

    // Emit snapshot for parent listeners
    this.allFilterParametersChange.emit(ap);

    return pieces.join(', ');
  });

  defaultAddressParams!: DefaultAddressParams;
  viewCtrl = new FormControl<string>('only-active', { nonNullable: true });
  homeViewCtrl = new FormControl<string>('only-active', { nonNullable: true });
  homeViewOptions: ViewOption[] = [
    {
      id: 'all',
      name: 'HOME.VIEW_OPTIONS.ALL',
      initiallySelected: false,
    },
    {
      id: 'only-active',
      name: 'HOME.VIEW_OPTIONS.ONLY_ACTIVE',
      initiallySelected: true,
    },
    {
      id: 'only-blocked',
      name: 'HOME.VIEW_OPTIONS.ONLY_BLOCKED',
      initiallySelected: false,
    },
    {
      id: 'only-closed',
      name: 'HOME.VIEW_OPTIONS.ONLY_CLOSED',
      initiallySelected: false,
    },
    {
      id: 'exclude-closed',
      name: 'HOME.VIEW_OPTIONS.EXCLUDE_CLOSED',
      initiallySelected: false,
    },
  ];

  //prevViewOptionsValue: string[] = ['active'];

  constructor() {
    // Init address defaults from query params
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qp) => {
        this.defaultAddressParams = {
          localityId: qp['localityId'] ? +qp['localityId'] : null,
          districtId: qp['districtId'] ? +qp['districtId'] : null,
          regionId: qp['regionId'] ? +qp['regionId'] : null,
          countryId: qp['countryId'] ? +qp['countryId'] : null,
        };
        this.filterBadgeValue = qp['countryId'] ? 1 : 0;
        // this.showSpinner = (qp['countryId'] ? true : false);
        this.addressFilterValue.set({
          countries: this.defaultAddressParams.countryId
            ? [this.defaultAddressParams.countryId]
            : [],
          regions: this.defaultAddressParams.regionId
            ? [this.defaultAddressParams.regionId]
            : [],
          districts: this.defaultAddressParams.districtId
            ? [this.defaultAddressParams.districtId]
            : [],
          localities: this.defaultAddressParams.localityId
            ? [this.defaultAddressParams.localityId]
            : [],
        });
        this.addressStringValue.set(qp['addressFilterString'] || '');
      });
  }

  ngOnInit(): void {
    // Pick permission set for the component type
    this.defaultAddressFilterValue.emit(this.addressFilterValue());
    const type = this.params().componentType;
    const found = PERMISSIONS_COMPONENT_REGISTRY[type];
    if (found) this.permissions = found;

    this.homeViewCtrl.valueChanges
      .pipe(
        //debounceTime(250), // ← задержка (подбери 200–300мс)
        //distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        if (!value) return;
        this.selectedHomeViewOptionId.set(value);
        if (value === 'only-closed') {
          this.viewCtrl.disable({ emitEvent: false });
          this.viewCtrl.setValue('only-discharged');
        } else {
          this.viewCtrl.enable({ emitEvent: false });
        }
      });

    this.viewCtrl.valueChanges
      .pipe(
        //debounceTime(250), // ← задержка (подбери 200–300мс)
        //distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        if (!value) return;
        this.selectedViewOptionId.set(value);
      });
  }

  // Columns selection passthrough
  changeColumnsView(selected: string[]): void {
    this.selectedColumns.emit([...selected]);
  }

  onAddItemClick(): void {
    this.addWasClicked.emit();
  }

  // Badges
  changeSettingsBadge(v: number): void {
    this.settingsBadgeValue = v;
  }
  changeFilterBadge(v: number): void {
    this.filterBadgeValue = v;
  }

  // View option
  /*
  onChangeViewSelection(option: string): void {
    this.selectedViewOptionId.set(option);
  } */

  // Search
  onSearchEnter(event: Event): void {
    const raw = (event.target as HTMLInputElement).value ?? '';
    const normalized = raw.trim().toLowerCase().replaceAll('ё', 'е');

    this.searchValue.set(normalized);
  }

  onClearSearchClick(): void {
    this.searchValue.set('');
    this.inputValue = '';
  }

  // Filter reset
  onClearFilterClick(): void {
    this.tableFilterComponent.clearForm();
  }
}
