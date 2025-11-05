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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
  }>();
  defaultAddressFilterValue = output<AddressFilter>();

  // UI state
  settingsBadgeValue = 0;
  filterBadgeValue = 0;
  avoidDoubleRequest = false;

  // Permissions
  permissions!: PermissionSet;

  // Filters state (signals)
  selectedViewOptionId = signal<string>('only-active');
  includeOutdated = signal<boolean>(false);
  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  inputValue = '';

  filterValue = signal<GeneralFilter>({
    roles: [],
    comment: [],
    contactTypes: [],
    dateBeginningRange: [],
    dateRestrictionRange: [],
  });

  addressFilterValue = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });

  addressStringValue = signal<string>('');
  strongAddressFilter = signal<boolean>(false);
  strongContactFilter = signal<boolean>(false);

  // Derived DTO for API
  allFilterParameters = computed(() => ({
    viewOption: this.selectedViewOptionId(),
    searchValue: this.searchValue(),
    includeOutdated: this.includeOutdated(),
    exactMatch: this.exactMatch(),
    filter: this.filterValue(),
    addressFilter: this.addressFilterValue(),
    strongAddressFilter: this.strongAddressFilter(),
    strongContactFilter: this.strongContactFilter(),
  }));

  // Human-readable summary for UI
  filterString = computed(() => {
    const ap = this.allFilterParameters();

    const pieces: string[] = [];

    // View option label
    const vo = this.params().viewOptions.find(
      (v) => v.id === ap.viewOption
    )?.name;
    if (vo) pieces.push(this.translate.instant(vo));

    if (ap.searchValue) pieces.push(ap.searchValue);

    // GeneralFilter
    const gf = ap.filter;
    for (const key of typedKeys(gf)) {
      const value = gf[key];
      if (!value || value.length === 0) continue;

      if (key === 'dateBeginningRange' || key === 'dateRestrictionRange') {
        const label =
          key === 'dateBeginningRange'
            ? this.translate.instant('BASE_LIST.START_LABEL')
            : this.translate.instant('BASE_LIST.BLOCK_LABEL');
        const [from, to] = value as Date[];
        pieces.push(
          `${label}: ${this.dateUtils.transformDate(
            from
          )}-${this.dateUtils.transformDate(to)}`
        );
        continue;
      }

      for (const item of value) {
        if (key === 'contactTypes') {
          const lab = (item as { type: string; label: string }).label;
          pieces.push(this.translate.instant(lab));
        } else if (key === 'roles') {
          pieces.push((item as { id: number; name: string }).name);
        } else {
          pieces.push(String(item));
        }
      }
    }

    // Address as a single string
    if (this.addressStringValue()) pieces.push(this.addressStringValue());

    // Emit snapshot for parent listeners
    this.allFilterParametersChange.emit(ap);

    return pieces.join(', ');
  });

  defaultAddressParams!: DefaultAddressParams;

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
  onChangeViewSelection(option: string): void {
    this.avoidDoubleRequest = true;
    this.selectedViewOptionId.set(option);
  }

  // Search
  onSearchEnter(event: Event): void {
    const raw = (event.target as HTMLInputElement).value ?? '';
    const normalized = raw.trim().toLowerCase().replaceAll('ё', 'е');
    this.avoidDoubleRequest = true;
    this.searchValue.set(normalized);
  }

  onClearSearchClick(): void {
    this.avoidDoubleRequest = true;
    this.searchValue.set('');
    this.inputValue = '';
  }

  // Filter reset
  onClearFilterClick(): void {
    this.avoidDoubleRequest = true;
    this.tableFilterComponent.clearForm();
  }
}
